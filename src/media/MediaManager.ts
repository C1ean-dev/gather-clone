import { NoiseSuppressor } from './NoiseSuppressor'
import { useMediaStore } from '../store/useMediaStore'
import { useGameStore } from '../store/useGameStore'
import { PeerManager } from '../p2p/PeerManager'
import { SensitivityMode } from '../types/audio'

export interface ScreenShareConfig {
  sourceId?: string
  includeAudio?: boolean
  resolution?: '480p' | '720p' | '1080p'
  fps?: 30 | 60
}

export class MediaManager {
  private static instance: MediaManager
  private noiseSuppressor: NoiseSuppressor
  private rawUserStream: MediaStream | null = null
  private screenAudioContext: AudioContext | null = null
  private screenGainNode: GainNode | null = null
  private screenDuckInterval: number | null = null

  private constructor() {
    this.noiseSuppressor = new NoiseSuppressor()
  }

  public static getInstance(): MediaManager {
    if (!MediaManager.instance) {
      MediaManager.instance = new MediaManager()
    }
    return MediaManager.instance
  }

  /**
   * Start User Webcam & Microphone with selected constraints and device IDs
   */
  public async startMedia(video: boolean = true, audio: boolean = true): Promise<MediaStream | null> {
    try {
      const state = useMediaStore.getState()

      const audioConstraints: any = audio
        ? {
            deviceId: state.selectedAudioInput && state.selectedAudioInput !== 'default'
              ? { exact: state.selectedAudioInput }
              : undefined,
            echoCancellation: state.echoCancellation,
            autoGainControl: state.autoGainControl,
            noiseSuppression: false, // We use our superior dynamic DSP Noise Suppressor
          }
        : false

      const constraints: MediaStreamConstraints = {
        video: video ? { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30 } } : false,
        audio: audioConstraints,
      }

      this.rawUserStream = await navigator.mediaDevices.getUserMedia(constraints)

      const isSuppressionEnabled = state.isNoiseSuppressionEnabled
      const processedStream = this.noiseSuppressor.processStream(
        this.rawUserStream,
        isSuppressionEnabled,
        state.inputVolume,
        state.sensitivityMode,
        state.manualSensitivityThreshold,
        (level, isGateOpen) => {
          useMediaStore.getState().setLocalAudioLevel(level, isGateOpen)
        }
      )

      useMediaStore.getState().setLocalStream(processedStream)
      return processedStream
    } catch (err) {
      console.warn('Could not access camera/mic with selected constraints, trying fallback:', err)
      try {
        // Fallback without deviceId constraint
        this.rawUserStream = await navigator.mediaDevices.getUserMedia({
          video: video,
          audio: audio,
        })
        const isSuppressionEnabled = useMediaStore.getState().isNoiseSuppressionEnabled
        const processedStream = this.noiseSuppressor.processStream(
          this.rawUserStream,
          isSuppressionEnabled,
          100,
          'auto',
          20,
          (level, isGateOpen) => {
            useMediaStore.getState().setLocalAudioLevel(level, isGateOpen)
          }
        )
        useMediaStore.getState().setLocalStream(processedStream)
        return processedStream
      } catch (fallbackErr) {
        console.error('Failed to access camera/mic entirely:', fallbackErr)
        return null
      }
    }
  }

  /**
   * Switch Audio Input Microphone on the fly
   */
  public async changeAudioInput(deviceId: string): Promise<boolean> {
    try {
      useMediaStore.getState().setSelectedAudioInput(deviceId)
      const currentLocalStream = useMediaStore.getState().localStream
      const state = useMediaStore.getState()

      const newAudioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: deviceId && deviceId !== 'default' ? { exact: deviceId } : undefined,
          echoCancellation: state.echoCancellation,
          autoGainControl: state.autoGainControl,
          noiseSuppression: false,
        },
      })

      const newAudioTrack = newAudioStream.getAudioTracks()[0]
      if (!newAudioTrack) return false

      // Replace audio track in rawUserStream
      if (this.rawUserStream) {
        this.rawUserStream.getAudioTracks().forEach((t) => t.stop())
        this.rawUserStream.removeTrack(this.rawUserStream.getAudioTracks()[0])
        this.rawUserStream.addTrack(newAudioTrack)
      } else {
        this.rawUserStream = newAudioStream
      }

      // Reprocess through NoiseSuppressor
      const processedStream = this.noiseSuppressor.processStream(
        this.rawUserStream,
        state.isNoiseSuppressionEnabled,
        state.inputVolume,
        state.sensitivityMode,
        state.manualSensitivityThreshold,
        (level, isGateOpen) => {
          useMediaStore.getState().setLocalAudioLevel(level, isGateOpen)
        }
      )

      useMediaStore.getState().setLocalStream(processedStream)

      const processedAudioTrack = processedStream.getAudioTracks()[0]
      if (processedAudioTrack) {
        PeerManager.getInstance().replaceAudioTrack(processedAudioTrack)
      }

      return true
    } catch (err) {
      console.warn('Error changing audio input:', err)
      return false
    }
  }

  /**
   * Switch Audio Output Device for all audio elements
   */
  public async changeAudioOutput(deviceId: string): Promise<boolean> {
    try {
      useMediaStore.getState().setSelectedAudioOutput(deviceId)
      const audioElements = document.querySelectorAll('video, audio')
      audioElements.forEach(async (el: any) => {
        if (typeof el.setSinkId === 'function') {
          try {
            await el.setSinkId(deviceId === 'default' ? '' : deviceId)
          } catch (e) {
            console.warn('Failed to set sinkId on element:', e)
          }
        }
      })
      return true
    } catch (err) {
      console.warn('Error changing audio output:', err)
      return false
    }
  }

  /**
   * Start Screen Sharing with Customizable Source, Audio, Resolution (480p, 720p, 1080p) and FPS (30, 60)
   * Includes Anti-Reverberation Audio Ducking and Highpass Filter
   */
  public async startScreenShare(config: ScreenShareConfig = {}): Promise<MediaStream | null> {
    try {
      const {
        sourceId,
        includeAudio = true,
        resolution = '1080p',
        fps = 30,
      } = config

      let width = 1920
      let height = 1080
      if (resolution === '480p') {
        width = 854
        height = 480
      } else if (resolution === '720p') {
        width = 1280
        height = 720
      } else if (resolution === '1080p') {
        width = 1920
        height = 1080
      }

      let screenStream: MediaStream

      if (sourceId && (window as any).electronAPI) {
        const videoConstraints: any = {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: sourceId,
            minWidth: width,
            maxWidth: width,
            minHeight: height,
            maxHeight: height,
            maxFrameRate: fps,
          },
        }

        try {
          if (includeAudio) {
            screenStream = await (navigator.mediaDevices as any).getUserMedia({
              video: videoConstraints,
              audio: {
                mandatory: {
                  chromeMediaSource: 'desktop',
                },
              },
            })
          } else {
            screenStream = await (navigator.mediaDevices as any).getUserMedia({
              video: videoConstraints,
              audio: false,
            })
          }
        } catch (audioErr) {
          console.warn('Desktop capture with audio failed, retrying video only:', audioErr)
          screenStream = await (navigator.mediaDevices as any).getUserMedia({
            video: videoConstraints,
            audio: false,
          })
        }
      } else {
        screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            width: { ideal: width, max: width },
            height: { ideal: height, max: height },
            frameRate: { ideal: fps, max: fps },
            displaySurface: 'monitor',
          },
          audio: includeAudio,
        })
      }

      // Screen audio mixing with Gain Limiter and Voice Ducking (prevents echo/reverberation loop)
      const screenAudioTrack = screenStream.getAudioTracks()[0]
      const localStream = useMediaStore.getState().localStream

      if (screenAudioTrack && localStream) {
        try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
          this.screenAudioContext = new AudioContextClass({ sampleRate: 48000 })

          const micSource = this.screenAudioContext.createMediaStreamSource(localStream)
          const screenSource = this.screenAudioContext.createMediaStreamSource(
            new MediaStream([screenAudioTrack])
          )

          // 1. Screen Audio Gain Node (Controlled by user settings, default 50%)
          const initialScreenVol = useMediaStore.getState().screenShareAudioVolume / 100
          this.screenGainNode = this.screenAudioContext.createGain()
          this.screenGainNode.gain.setValueAtTime(initialScreenVol, this.screenAudioContext.currentTime)

          // 2. Highpass filter on screen audio to cut out low-end bass build-up
          const screenFilter = this.screenAudioContext.createBiquadFilter()
          screenFilter.type = 'highpass'
          screenFilter.frequency.setValueAtTime(80, this.screenAudioContext.currentTime)

          // 3. Destination mixer
          const dest = this.screenAudioContext.createMediaStreamDestination()

          micSource.connect(dest)
          screenSource.connect(screenFilter)
          screenFilter.connect(this.screenGainNode)
          this.screenGainNode.connect(dest)

          // 4. Intelligent Voice Ducking loop:
          // When the user speaks, reduce screen audio so voice cuts through and feedback is suppressed
          if (this.screenDuckInterval) clearInterval(this.screenDuckInterval)
          this.screenDuckInterval = window.setInterval(() => {
            if (!this.screenGainNode || !this.screenAudioContext || this.screenAudioContext.state === 'closed') {
              return
            }

            const state = useMediaStore.getState()
            if (!state.duckingEnabled) {
              const targetVol = state.screenShareAudioVolume / 100
              this.screenGainNode.gain.setValueAtTime(targetVol, this.screenAudioContext.currentTime)
              return
            }

            const isSpeaking = state.localAudioLevel > 0.08 || state.isGateOpen
            const baseVol = state.screenShareAudioVolume / 100
            const now = this.screenAudioContext.currentTime

            if (isSpeaking) {
              // Duck screen audio to 25% of its volume while speaking
              const duckedVol = baseVol * 0.25
              this.screenGainNode.gain.cancelScheduledValues(now)
              this.screenGainNode.gain.setTargetAtTime(duckedVol, now, 0.06)
            } else {
              // Smoothly restore full screen volume when quiet
              this.screenGainNode.gain.cancelScheduledValues(now)
              this.screenGainNode.gain.setTargetAtTime(baseVol, now, 0.2)
            }
          }, 80)

          const combinedAudioTrack = dest.stream.getAudioTracks()[0]
          if (combinedAudioTrack) {
            PeerManager.getInstance().replaceAudioTrack(combinedAudioTrack)
          }
        } catch (mixErr) {
          console.warn('Audio mixing fallback:', mixErr)
        }
      }

      useMediaStore.getState().setLocalScreenStream(screenStream)
      useMediaStore.getState().setScreenSharing(true)
      useGameStore.getState().setLocalPlayer({ isScreenSharing: true })

      const screenVideoTrack = screenStream.getVideoTracks()[0]
      if (screenVideoTrack) {
        if ('contentHint' in screenVideoTrack) {
          screenVideoTrack.contentHint = 'detail'
        }

        let targetBitrate = 8_000_000
        if (resolution === '720p') {
          targetBitrate = fps === 60 ? 6_000_000 : 5_000_000
        } else if (resolution === '1080p') {
          targetBitrate = fps === 60 ? 8_000_000 : 7_000_000
        } else if (resolution === '480p') {
          targetBitrate = fps === 60 ? 3_500_000 : 2_500_000
        }

        PeerManager.getInstance().replaceVideoTrack(screenVideoTrack, true, targetBitrate, fps)
        PeerManager.getInstance().sendPlayerUpdate({ isScreenSharing: true })

        screenVideoTrack.onended = () => {
          this.stopScreenShare()
        }
      }

      return screenStream
    } catch (err) {
      console.warn('Screen share cancelled or failed:', err)
      return null
    }
  }

  public stopScreenShare() {
    if (this.screenDuckInterval) {
      clearInterval(this.screenDuckInterval)
      this.screenDuckInterval = null
    }

    const currentScreen = useMediaStore.getState().localScreenStream
    if (currentScreen) {
      currentScreen.getTracks().forEach((t) => t.stop())
    }
    useMediaStore.getState().setLocalScreenStream(null)
    useMediaStore.getState().setScreenSharing(false)
    useGameStore.getState().setLocalPlayer({ isScreenSharing: false })

    if (this.screenAudioContext && this.screenAudioContext.state !== 'closed') {
      this.screenAudioContext.close().catch(() => {})
      this.screenAudioContext = null
      this.screenGainNode = null
    }

    // Restore original mic track and camera video track
    const localStream = useMediaStore.getState().localStream
    const camTrack = localStream?.getVideoTracks()[0] || null
    const micTrack = localStream?.getAudioTracks()[0] || null

    if (camTrack && 'contentHint' in camTrack) {
      camTrack.contentHint = ''
    }

    PeerManager.getInstance().replaceVideoTrack(camTrack, false)
    if (micTrack) {
      PeerManager.getInstance().replaceAudioTrack(micTrack)
    }
    PeerManager.getInstance().sendPlayerUpdate({ isScreenSharing: false })
  }

  public updateInputVolume(vol: number) {
    this.noiseSuppressor.setInputVolume(vol)
  }

  public updateSensitivity(mode: SensitivityMode, thresholdPercent: number) {
    this.noiseSuppressor.setSensitivity(mode, thresholdPercent)
  }

  public updateNoiseSuppression(enabled: boolean) {
    this.noiseSuppressor.setSuppressionEnabled(enabled)
  }

  public updateScreenShareAudioVolume(vol: number) {
    if (this.screenGainNode && this.screenAudioContext) {
      const now = this.screenAudioContext.currentTime
      this.screenGainNode.gain.cancelScheduledValues(now)
      this.screenGainNode.gain.setTargetAtTime(vol / 100, now, 0.05)
    }
  }

  public setTestMic(enabled: boolean) {
    useMediaStore.getState().setIsTestingMic(enabled)
    this.noiseSuppressor.setTestLoopback(enabled)
  }

  /**
   * Play a pleasant chime tone to test the selected speakers/headphones
   */
  public playAudioTestBeep() {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      const testCtx = new AudioContextClass()

      const now = testCtx.currentTime
      const osc1 = testCtx.createOscillator()
      const osc2 = testCtx.createOscillator()
      const gain = testCtx.createGain()

      osc1.type = 'sine'
      osc1.frequency.setValueAtTime(587.33, now) // D5
      osc1.frequency.setValueAtTime(880, now + 0.12) // A5

      osc2.type = 'sine'
      osc2.frequency.setValueAtTime(440, now) // A4
      osc2.frequency.setValueAtTime(659.25, now + 0.12) // E5

      gain.gain.setValueAtTime(0.01, now)
      gain.gain.exponentialRampToValueAtTime(0.3, now + 0.04)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45)

      osc1.connect(gain)
      osc2.connect(gain)
      gain.connect(testCtx.destination)

      osc1.start(now)
      osc2.start(now)
      osc1.stop(now + 0.5)
      osc2.stop(now + 0.5)

      setTimeout(() => {
        testCtx.close().catch(() => {})
      }, 700)
    } catch (e) {
      console.warn('Could not play test audio chime:', e)
    }
  }

  public stopAll() {
    this.stopScreenShare()
    if (this.rawUserStream) {
      this.rawUserStream.getTracks().forEach((t) => t.stop())
      this.rawUserStream = null
    }
    useMediaStore.getState().setLocalStream(null)
    this.noiseSuppressor.dispose()
  }
}
