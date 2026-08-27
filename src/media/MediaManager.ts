import { NoiseSuppressor } from './NoiseSuppressor'
import { useMediaStore } from '../store/useMediaStore'
import { useGameStore } from '../store/useGameStore'
import { PeerManager } from '../p2p/PeerManager'

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
   * Start User Webcam & Microphone
   */
  public async startMedia(video: boolean = true, audio: boolean = true): Promise<MediaStream | null> {
    try {
      const constraints: MediaStreamConstraints = {
        video: video ? { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30 } } : false,
        audio: audio
          ? {
              echoCancellation: true,
              noiseSuppression: false, // Custom DSP Noise Suppressor
              autoGainControl: true,
            }
          : false,
      }

      this.rawUserStream = await navigator.mediaDevices.getUserMedia(constraints)

      const isSuppressionEnabled = useMediaStore.getState().isNoiseSuppressionEnabled
      const processedStream = this.noiseSuppressor.processStream(
        this.rawUserStream,
        isSuppressionEnabled,
        (level) => {
          useMediaStore.getState().setLocalAudioLevel(level)
        }
      )

      useMediaStore.getState().setLocalStream(processedStream)
      return processedStream
    } catch (err) {
      console.warn('Could not access camera/mic:', err)
      return null
    }
  }

  /**
   * Start Screen Sharing with Customizable Source, Audio, Resolution (480p, 720p, 1080p) and FPS (30, 60)
   */
  public async startScreenShare(config: ScreenShareConfig = {}): Promise<MediaStream | null> {
    try {
      const {
        sourceId,
        includeAudio = true,
        resolution = '1080p',
        fps = 30,
      } = config

      // Calculate width & height from resolution preset
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

      // Electron Desktop Capturer mode (when sourceId is provided)
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

        const audioConstraints: any = includeAudio
          ? {
              mandatory: {
                chromeMediaSource: 'desktop',
              },
            }
          : false

        screenStream = await (navigator.mediaDevices as any).getUserMedia({
          video: videoConstraints,
          audio: audioConstraints,
        })
      } else {
        // Standard Web / System Native Picker getDisplayMedia
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

      // If screen audio was captured, mix it with mic audio so both are heard
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
          const dest = this.screenAudioContext.createMediaStreamDestination()

          micSource.connect(dest)
          screenSource.connect(dest)

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

      // Replace video track in ongoing WebRTC calls with the screen video track
      const screenVideoTrack = screenStream.getVideoTracks()[0]
      if (screenVideoTrack) {
        // Force WebRTC encoder to preserve text and fine details without downsampling
        if ('contentHint' in screenVideoTrack) {
          screenVideoTrack.contentHint = 'detail'
        }

        // Calculate maxBitrate based on Resolution & FPS:
        // 720p @ 30 fps: 5.000 kbps, 720p @ 60 fps: 6.000 kbps
        // 1080p @ 30 fps: 7.000 kbps, 1080p @ 60 fps: 8.000 kbps
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

        // Auto stop when user ends share via browser/OS bar
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

  public updateNoiseSuppression(enabled: boolean) {
    this.noiseSuppressor.setSuppressionEnabled(enabled)
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
