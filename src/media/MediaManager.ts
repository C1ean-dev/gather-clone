import { NoiseSuppressor } from './NoiseSuppressor'
import { SoftDspProcessor } from './SoftDspProcessor'
import { RnnoiseProcessor } from './RnnoiseProcessor'
import { MicCalibrator } from './MicCalibrator'
import { useMediaStore } from '../store/useMediaStore'
import { useGameStore } from '../store/useGameStore'
import { PeerManager } from '../p2p/PeerManager'
import { SensitivityMode, AudioProcessorMode } from '../types/audio'

export interface ScreenShareConfig {
  sourceId?: string
  includeAudio?: boolean
  resolution?: '480p' | '720p' | '1080p'
  fps?: 30 | 60
}

/**
  * Common interface implemented by every audio cleanup engine so
  * MediaManager can swap between them without knowing the internals.
  */
interface AudioEngine {
  processStream(
    inputStream: MediaStream,
    enableSuppression: boolean,
    initialInputVolume: number,
    sensitivityMode: SensitivityMode,
    manualThresholdPercent: number,
    onAudioLevel?: (level: number, gateOpen: boolean, rawRms: number) => void
  ): MediaStream | Promise<MediaStream>
  setInputVolume(percentage: number): void
  setSensitivity(mode: SensitivityMode, manualThresholdPercent: number): void
  setSuppressionEnabled(enabled: boolean): void
  setTestLoopback(enabled: boolean): void
  dispose(): void
}

export class MediaManager {
  private static instance: MediaManager
  private classicEngine: NoiseSuppressor
  private softEngine: SoftDspProcessor
  private rnnoiseEngine: RnnoiseProcessor
  private activeEngine: AudioEngine | null = null
  private rawUserStream: MediaStream | null = null
  private screenAudioContext: AudioContext | null = null
  private screenGainNode: GainNode | null = null
  private screenDuckInterval: number | null = null
  private currentProcessorMode: AudioProcessorMode = 'classic'

  private constructor() {
    this.classicEngine = new NoiseSuppressor()
    this.softEngine = new SoftDspProcessor()
    this.rnnoiseEngine = new RnnoiseProcessor()
  }

  public static getInstance(): MediaManager {
    if (!MediaManager.instance) {
      MediaManager.instance = new MediaManager()
    }
    return MediaManager.instance
  }

  /**
    * Map the user's processor-mode setting to the concrete engine instance.
    *
    * Two overrides are consulted:
    *   1. If `hasUserChosenProcessorMode` is true, the user's manual choice
    *      always wins.
    *   2. Otherwise we look for a stored calibration for the current input
    *      device and use its recommendedMode.
    *   3. If neither exists we fall back to 'classic' (the original default).
    */
  private selectEngine(): AudioEngine {
    const state = useMediaStore.getState()
    const manual = state.hasUserChosenProcessorMode
    const cal = state.micCalibrations[state.selectedAudioInput]
    const mode: AudioProcessorMode = manual
      ? state.audioProcessorMode
      : cal?.recommendedMode ?? state.audioProcessorMode ?? 'classic'
    this.currentProcessorMode = mode
    if (mode === 'rnnoise') return this.rnnoiseEngine
    if (mode === 'soft') return this.softEngine
    return this.classicEngine
  }

  /**
    * Manually run a 5-second mic calibration against the user's raw input
    * stream and store the result. The recommendation is **not** applied
    * automatically — it is surfaced to the UI so the user can accept it
    * with a single click. The previous behaviour of auto-applying the
    * mode change made the "Aplicar" button a no-op and confused users
    * ("nothing changed when I clicked").
    *
    * Sensitivity *is* still applied automatically because it is per-device
    * and never visible to the user otherwise.
    */
    public async calibrateMicrophone(
      inputStream: MediaStream,
      durationMs: number = 5000,
      onProgress?: (elapsedMs: number, totalMs: number, currentDb: number) => void
    ): Promise<{
      noiseFloorDb: number
      peakRmsDb: number
      snrDb: number
      recommendedMode: AudioProcessorMode
      recommendedSensitivity: number
    }> {
      const state = useMediaStore.getState()
      const deviceId = state.selectedAudioInput
      state.setIsCalibrating(true)
      try {
        const calibrator = new MicCalibrator()
        const result = await calibrator.calibrate(inputStream, durationMs, (p) => {
          onProgress?.(p.elapsedMs, p.totalMs, p.currentRmsDb)
        })
        const cal = {
          noiseFloorDb: result.noiseFloorDb,
          peakRmsDb: result.peakRmsDb,
          snrDb: result.snrDb,
          recommendedMode: result.recommendedMode,
          recommendedSensitivity: result.recommendedSensitivity,
          calibratedAt: Date.now(),
        }
        state.setMicCalibration(deviceId, cal)
        // Sensitivity is per-device and applied unconditionally — it has no
        // visible UI control aside from this calibration wizard.
        state.setManualSensitivityThreshold(result.recommendedSensitivity)

        return {
          noiseFloorDb: cal.noiseFloorDb,
          peakRmsDb: cal.peakRmsDb,
          snrDb: cal.snrDb,
          recommendedMode: cal.recommendedMode,
          recommendedSensitivity: cal.recommendedSensitivity,
        }
      } finally {
        useMediaStore.getState().setIsCalibrating(false)
      }
    }

  /**
    * Pipe an input MediaStream through the active engine and return the
    * processed stream. Handles both sync (classic/soft) and async
    * (RNNoise) engines, and falls back to the soft DSP if the user
    * picked RNNoise but the WASM module failed to load.
    */
  private async runEngine(
    inputStream: MediaStream,
    levelCallback: (level: number, isGateOpen: boolean) => void
  ): Promise<MediaStream> {
    const state = useMediaStore.getState()
    const nextEngine = this.selectEngine()

    // Tear down whatever engine was previously in use. Without this the
    // RNNoise worklet (or DSP analyser) keeps running in parallel and the
    // user hears the OLD engine after a mode swap.
    if (this.activeEngine && this.activeEngine !== nextEngine) {
      try {
        this.activeEngine.dispose()
      } catch (err) {
        console.warn('[MediaManager] failed to dispose previous engine:', err)
      }
    }
    this.activeEngine = nextEngine

    const result = nextEngine.processStream(
      inputStream,
      state.isNoiseSuppressionEnabled,
      state.inputVolume,
      state.sensitivityMode,
      state.manualSensitivityThreshold,
      (level, gateOpen) => levelCallback(level, gateOpen)
    )

    const processed = result instanceof Promise ? await result : result

    if (processed === inputStream && this.currentProcessorMode === 'rnnoise') {
      console.warn(
        '[MediaManager] RNNoise failed to initialise, falling back to soft DSP'
      )
      try {
        this.activeEngine.dispose()
      } catch {}
      this.activeEngine = this.softEngine
      return this.softEngine.processStream(
        inputStream,
        state.isNoiseSuppressionEnabled,
        state.inputVolume,
        state.sensitivityMode,
        state.manualSensitivityThreshold,
        (level, gateOpen) => levelCallback(level, gateOpen)
      )
    }

    return processed
  }

  /**
    * Start User Webcam & Microphone with selected constraints and device IDs
    */
  public async startMedia(video: boolean = true, audio: boolean = true): Promise<MediaStream | null> {
    try {
      const state = useMediaStore.getState()

    const audioConstraints: any = audio
      ? {
        deviceId:
          state.selectedAudioInput && state.selectedAudioInput !== 'default'
            ? { exact: state.selectedAudioInput }
            : undefined,
        echoCancellation: state.echoCancellation,
        autoGainControl: state.autoGainControl,
        noiseSuppression: false, // We use our own dynamic DSP / RNNoise
        }
      : false

    const constraints: MediaStreamConstraints = {
      video: video ? { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30 } } : false,
      audio: audioConstraints,
    }

    this.rawUserStream = await navigator.mediaDevices.getUserMedia(constraints)

    const processedStream = await this.runEngine(
      this.rawUserStream,
      (level, isGateOpen) => {
        useMediaStore.getState().setLocalAudioLevel(level, isGateOpen)
      }
    )

    // Apply initial mute and camera off state
    const isMuted = useMediaStore.getState().isMuted
    const isCameraOff = useMediaStore.getState().isCameraOff
    processedStream.getAudioTracks().forEach((track) => {
      track.enabled = !isMuted
    })
    processedStream.getVideoTracks().forEach((track) => {
      track.enabled = !isCameraOff
    })

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
        const processedStream = await this.runEngine(
          this.rawUserStream,
          (level, isGateOpen) => {
            useMediaStore.getState().setLocalAudioLevel(level, isGateOpen)
          }
        )

        const isMuted = useMediaStore.getState().isMuted
        const isCameraOff = useMediaStore.getState().isCameraOff
        processedStream.getAudioTracks().forEach((track) => {
          track.enabled = !isMuted
        })
        processedStream.getVideoTracks().forEach((track) => {
          track.enabled = !isCameraOff
        })

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

      if (this.rawUserStream) {
        this.rawUserStream.getAudioTracks().forEach((t) => t.stop())
        this.rawUserStream.removeTrack(this.rawUserStream.getAudioTracks()[0])
        this.rawUserStream.addTrack(newAudioTrack)
      } else {
        this.rawUserStream = newAudioStream
      }

      const processedStream = await this.runEngine(
        this.rawUserStream,
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
          if (this.screenDuckInterval) clearInterval(this.screenDuckInterval)
          this.screenDuckInterval = window.setInterval(() => {
            if (!this.screenGainNode || !this.screenAudioContext || this.screenAudioContext.state === 'closed') {
              return
            }

            const st = useMediaStore.getState()
            if (!st.duckingEnabled) {
              const targetVol = st.screenShareAudioVolume / 100
              this.screenGainNode.gain.setValueAtTime(targetVol, this.screenAudioContext.currentTime)
              return
            }

            const isSpeaking = st.localAudioLevel > 0.08 || st.isGateOpen
            const baseVol = st.screenShareAudioVolume / 100
            const now = this.screenAudioContext.currentTime

            if (isSpeaking) {
              const duckedVol = baseVol * 0.25
              this.screenGainNode.gain.cancelScheduledValues(now)
              this.screenGainNode.gain.setTargetAtTime(duckedVol, now, 0.06)
            } else {
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

  public stopAllMedia() {
    this.stopScreenShare()
    if (this.rawUserStream) {
      try {
        this.rawUserStream.getTracks().forEach((t) => t.stop())
      } catch (e) {}
      this.rawUserStream = null
    }
    try {
      this.classicEngine.dispose()
      this.softEngine.dispose()
      this.rnnoiseEngine.dispose()
      this.activeEngine = null
    } catch (e) {}
  }

  public updateInputVolume(vol: number) {
    this.classicEngine.setInputVolume(vol)
    this.softEngine.setInputVolume(vol)
    this.rnnoiseEngine.setInputVolume(vol)
  }

  public updateSensitivity(mode: SensitivityMode, thresholdPercent: number) {
    this.classicEngine.setSensitivity(mode, thresholdPercent)
    this.softEngine.setSensitivity(mode, thresholdPercent)
    this.rnnoiseEngine.setSensitivity(mode, thresholdPercent)
  }

  public updateNoiseSuppression(enabled: boolean) {
    this.classicEngine.setSuppressionEnabled(enabled)
    this.softEngine.setSuppressionEnabled(enabled)
    this.rnnoiseEngine.setSuppressionEnabled(enabled)
  }

  public updateAudioProcessorMode(_mode: AudioProcessorMode) {
    // The actual swap happens on the next processStream() call, which
    // selects the engine based on the current store value. Nothing to do
    // here — kept so callers can force a state flush if they want.
    }

    /**
      * Re-run the active engine over the cached raw user stream and swap the
      * processed audio track into every connected peer. Used when the user
      * changes the processor mode without leaving the call — without this
      * the new engine only takes effect on the next startMedia() / mic swap.
      *
      * No-op if no raw stream is cached (caller must request mic permission
      * first).
      */
    public async reprocessStream(): Promise<boolean> {
      if (!this.rawUserStream) return false
      try {
        const processed = await this.runEngine(
          this.rawUserStream,
          (level, isGateOpen) => {
            useMediaStore.getState().setLocalAudioLevel(level, isGateOpen)
          }
        )
        // Preserve current mute/cameraOff state on the new track.
        const isMuted = useMediaStore.getState().isMuted
        processed.getAudioTracks().forEach((track) => {
          track.enabled = !isMuted
        })
        const existingVideo = useMediaStore.getState().localStream?.getVideoTracks() ?? []
        existingVideo.forEach((v) => processed.addTrack(v))

        useMediaStore.getState().setLocalStream(processed)
        const newAudioTrack = processed.getAudioTracks()[0]
        if (newAudioTrack) {
          PeerManager.getInstance().replaceAudioTrack(newAudioTrack)
        }
        return true
      } catch (err) {
        console.warn('[MediaManager] reprocessStream failed:', err)
        return false
      }
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
    this.classicEngine.setTestLoopback(enabled)
    this.softEngine.setTestLoopback(enabled)
    this.rnnoiseEngine.setTestLoopback(enabled)
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
      osc1.frequency.setValueAtTime(587.33, now)
      osc1.frequency.setValueAtTime(880, now + 0.12)

      osc2.type = 'sine'
      osc2.frequency.setValueAtTime(440, now)
      osc2.frequency.setValueAtTime(659.25, now + 0.12)

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
    this.classicEngine.dispose()
    this.softEngine.dispose()
    this.rnnoiseEngine.dispose()
  }
}