import { NoiseSuppressor } from './NoiseSuppressor'
import { SoftDspProcessor } from './SoftDspProcessor'
import { RnnoiseProcessor } from './RnnoiseProcessor'
import { MicCalibrator } from './MicCalibrator'
import { CallAudioIsolator } from './CallAudioIsolator'
import { useMediaStore } from '../store/useMediaStore'
import { useGameStore } from '../store/useGameStore'
import { PeerManager } from '../p2p/PeerManager'
import { SensitivityMode, AudioProcessorMode } from '../types/audio'

export interface ScreenShareConfig {
  sourceId?: string
  sourceName?: string
  includeAudio?: boolean
  resolution?: '480p' | '720p' | '1080p'
  fps?: 30 | 60
  /**
   * When true (default), the microphone is mixed together with the screen
   * audio and sent as a single track (with voice ducking).
   * When false, ONLY the captured screen/window audio is sent — the mic
   * never enters the call. Ideal for sharing a browser video/page: remotes
   * hear exactly what that screen plays, nothing else.
   */
  mixMicrophone?: boolean
  /**
   * When true (default), incoming call voices are filtered out of the screen share
   * audio so remote peers never hear their own voices echoing in the live stream.
   */
  isolateCallAudio?: boolean
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
  private callAudioIsolator: CallAudioIsolator | null = null
  private currentProcessorMode: AudioProcessorMode = 'classic'

  // Throttle state for VU-meter forwarding. DSP engines invoke the level
  // callback every rAF (~60Hz); pushing every sample into zustand re-renders
  // all media subscribers 60×/s. Forward at ~10Hz, immediately on gate
  // open/close transitions (speaker aura stays responsive).
  private levelForwardLastSent: number = 0
  private levelForwardLastGate: boolean = false
  private static readonly LEVEL_FORWARD_INTERVAL_MS = 100

  /**
   * Shared level forwarder for all engines (startMedia / changeAudioInput /
   * reprocessStream). Throttled — see field comment above.
   */
  private handleEngineLevel = (level: number, isGateOpen: boolean) => {
    const now = performance.now()
    const gateChanged = isGateOpen !== this.levelForwardLastGate
    if (
      !gateChanged &&
      now - this.levelForwardLastSent < MediaManager.LEVEL_FORWARD_INTERVAL_MS
    ) {
      return
    }
    this.levelForwardLastSent = now
    this.levelForwardLastGate = isGateOpen
    useMediaStore.getState().setLocalAudioLevel(level, isGateOpen)
  }

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
  /**
   * Serializes engine (re)starts. Without this, two rapid swaps (e.g. double
   * retry clicks) run concurrently: both dispose/create contexts and the
   * loser overwrites the winner's status with a stale failure.
   */
  private runQueue: Promise<void> = Promise.resolve()

  private async runEngine(
    inputStream: MediaStream,
    levelCallback: (level: number, isGateOpen: boolean) => void
  ): Promise<MediaStream> {
    const prev = this.runQueue
    let release!: () => void
    this.runQueue = new Promise<void>((r) => (release = r))
    await prev
    try {
      return await this.doRunEngine(inputStream, levelCallback)
    } finally {
      release()
    }
  }

  private async doRunEngine(
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
    // Force the next level sample through immediately (fresh engine / mic).
    this.levelForwardLastSent = 0
    // Keep the RNNoise status badge truthful when another engine is active.
    if (nextEngine !== this.rnnoiseEngine) {
      useMediaStore.getState().setRnnoiseStatus('idle')
    }

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
      // Preserve the underlying cause set by the processor (don't clobber
      // 'error' detail — it's the only pointer to the real failure).
      const st = useMediaStore.getState()
      const cause =
        st.rnnoiseStatus === 'error' && st.rnnoiseError
          ? st.rnnoiseError
          : 'init failed — using Soft DSP'
      st.setRnnoiseStatus('fallback', cause)
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
   * Generates a minimal 16x16 black canvas video track when no webcam is available or camera is disabled.
   * This ensures WebRTC always negotiates a video transceiver so screen sharing can immediately swap tracks.
   */
  public createDummyVideoTrack(): MediaStreamTrack {
    try {
      const canvas = document.createElement('canvas')
      canvas.width = 16
      canvas.height = 16
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.fillStyle = '#0c0e14'
        ctx.fillRect(0, 0, 16, 16)
      }
      const stream = canvas.captureStream(5)
      const track = stream.getVideoTracks()[0]
      if (track) {
        track.enabled = false
        ;(track as any).__isDummy = true
        return track
      }
    } catch (e) {
      console.warn('[MediaManager] Failed to create canvas video track:', e)
    }
    return null as any
  }

  /**
   * Start User Webcam & Microphone with selected constraints and device IDs
   * Always guarantees that localStream has both audio and video tracks (using dummy canvas if no camera)
   */
  public async startMedia(video: boolean = true, audio: boolean = true): Promise<MediaStream | null> {
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

    let stream: MediaStream | null = null

    // 1. Try with Camera + Mic
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: video ? { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30 } } : false,
        audio: audioConstraints,
      })
    } catch (err) {
      console.warn('Could not access camera/mic with selected constraints, trying separated fallbacks:', err)
      // 2. Fallback: try mic alone (constraints first, then generic)
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: false,
          audio: audioConstraints,
        })
      } catch (micErr) {
        console.warn('Could not access mic with constraints, trying generic audio:', micErr)
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: false,
            audio: audio,
          })
        } catch (totalErr) {
          console.error('Failed to access physical microphone:', totalErr)
        }
      }

      // 3. Fallback: try camera alone if requested so mic constraints don't kill the webcam
      if (!stream) {
        stream = new MediaStream()
      }

      if (video && stream.getVideoTracks().length === 0) {
        try {
          const camOnlyStream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30 } },
          })
          const camTrack = camOnlyStream.getVideoTracks()[0]
          if (camTrack) {
            ;(camTrack as any).__isDummy = false
            stream.addTrack(camTrack)
          }
        } catch (camErr) {
          console.warn('Could not access camera individually:', camErr)
        }
      }
    }

    if (!stream) {
      stream = new MediaStream()
    }

    // 4. Ensure there is ALWAYS a video track in the stream (using canvas dummy if no camera)
    // This is CRITICAL for WebRTC P2P mesh so the video transceiver is created from the start
    if (stream.getVideoTracks().length === 0) {
      const dummyVideo = this.createDummyVideoTrack()
      if (dummyVideo) {
        stream.addTrack(dummyVideo)
      }
    }

    this.rawUserStream = stream

    const processedStream = await this.runEngine(
      this.rawUserStream,
      this.handleEngineLevel
    )

    // Ensure video track is preserved in processedStream
    if (processedStream.getVideoTracks().length === 0 && this.rawUserStream.getVideoTracks().length > 0) {
      processedStream.addTrack(this.rawUserStream.getVideoTracks()[0])
    }

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

    // The room-join path runs startMedia IN PARALLEL with the P2P handshake
    // (see LobbyModal) so mic-permission latency (or the 5s RNNoise WASM
    // init) doesn't block entering the room. PLAYER_JOIN messages that
    // arrived before this stream existed skipped their zone calls —
    // re-evaluate now that we can actually dial.
    try {
      PeerManager.getInstance().recheckZoneCalls()
    } catch (e) {}

    return processedStream
  }

  /**
   * Toggle camera on/off. When turning on, if no physical camera track exists yet
   * (e.g. initial startMedia used dummy canvas), dynamically acquires physical webcam via getUserMedia,
   * updates localStream and peer senders, and broadcasts presence update to all peers.
   */
  public async toggleCamera(): Promise<boolean> {
    const nextCameraOff = !useMediaStore.getState().isCameraOff
    await this.syncCameraState(nextCameraOff)
    return !nextCameraOff
  }

  public async syncCameraState(isCameraOff: boolean): Promise<void> {
    if (useMediaStore.getState().isCameraOff !== isCameraOff) {
      useMediaStore.getState().setCameraOff(isCameraOff)
    }

    if (!isCameraOff) {
      // Turning camera ON
      let activeCamTrack = this.rawUserStream?.getVideoTracks().find((t) => t.readyState === 'live' && !(t as any).__isDummy) || null

      if (!activeCamTrack) {
        try {
          const camStream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30 } },
          })
          activeCamTrack = camStream.getVideoTracks()[0] || null
          if (activeCamTrack) {
            ;(activeCamTrack as any).__isDummy = false

            // Replace in rawUserStream
            if (this.rawUserStream) {
              this.rawUserStream.getVideoTracks().forEach((t) => {
                t.stop()
                this.rawUserStream?.removeTrack(t)
              })
              this.rawUserStream.addTrack(activeCamTrack)
            }

            // Replace in localStream
            const localStream = useMediaStore.getState().localStream
            if (localStream) {
              localStream.getVideoTracks().forEach((t) => {
                if (t !== activeCamTrack) {
                  t.stop()
                  localStream.removeTrack(t)
                }
              })
              localStream.addTrack(activeCamTrack)
            }
          }
        } catch (camErr) {
          console.warn('[MediaManager] Failed to start physical camera:', camErr)
        }
      }

      if (activeCamTrack) {
        activeCamTrack.enabled = true
        if (!useMediaStore.getState().isScreenSharing) {
          try {
            PeerManager.getInstance().replaceVideoTrack(activeCamTrack, false)
          } catch {}
        }
      } else {
        const localStream = useMediaStore.getState().localStream
        localStream?.getVideoTracks().forEach((t) => (t.enabled = true))
      }
    } else {
      // Turning camera OFF
      const localStream = useMediaStore.getState().localStream
      if (localStream) {
        localStream.getVideoTracks().forEach((t) => {
          t.enabled = false
        })
      }
    }

    try {
      useGameStore.getState().setLocalPlayer({ isCameraOff })
    } catch {}
    try {
      PeerManager.getInstance().sendPlayerUpdate({ isCameraOff })
    } catch {}
  }

  /**
   * Toggle mute on/off. Updates track enabled state, local player state, and broadcasts to peers.
   */
  public toggleMute(): boolean {
    const nextMute = !useMediaStore.getState().isMuted
    this.syncMuteState(nextMute)
    return nextMute
  }

  public syncMuteState(isMuted: boolean): void {
    if (useMediaStore.getState().isMuted !== isMuted) {
      useMediaStore.getState().setMuted(isMuted)
    }
    const localStream = useMediaStore.getState().localStream
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !isMuted
      })
    }
    try {
      useGameStore.getState().setLocalPlayer({ isMuted })
    } catch {}
    try {
      PeerManager.getInstance().sendPlayerUpdate({ isMuted })
    } catch {}
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
        this.handleEngineLevel
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
   * Audio modes:
   *   - mixMicrophone=true (default): mic + screen audio mixed with ducking.
   *   - mixMicrophone=false: ONLY the screen/window audio is sent, untouched
   *     (no second AudioContext, no ducking — also ~20-40ms less latency).
   */
  public async startScreenShare(config: ScreenShareConfig = {}): Promise<MediaStream | null> {
    try {
      const {
        sourceId,
        sourceName,
        includeAudio = true,
        resolution = '1080p',
        fps = 30,
        mixMicrophone = true,
        isolateCallAudio = useMediaStore.getState().screenShareIsolateCallAudio,
      } = config

      if (sourceName) {
        useMediaStore.getState().setScreenShareTargetTitle(sourceName)
      }

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

      const electronAPI = (window as any).electronAPI
      const displayAudioConstraint = includeAudio
        ? {
            echoCancellation: true,
            noiseSuppression: false,
            autoGainControl: false,
          }
        : false

      if (sourceId && electronAPI?.setScreenSource) {
        try {
          await electronAPI.setScreenSource(sourceId, includeAudio)
        } catch (ipcErr) {
          console.warn('[MediaManager] set-screen-source IPC failed, capturing primary screen:', ipcErr)
        }
        try {
          screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: {
              width: { ideal: width, max: width },
              height: { ideal: height, max: height },
              frameRate: { ideal: fps, max: fps },
            },
            audio: displayAudioConstraint,
          })
        } catch {
          screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: {
              width: { ideal: width, max: width },
              height: { ideal: height, max: height },
              frameRate: { ideal: fps, max: fps },
            },
            audio: includeAudio,
          })
        }
      } else {
        try {
          screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: {
              width: { ideal: width, max: width },
              height: { ideal: height, max: height },
              frameRate: { ideal: fps, max: fps },
            },
            audio: displayAudioConstraint,
          })
        } catch {
          screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: {
              width: { ideal: width, max: width },
              height: { ideal: height, max: height },
              frameRate: { ideal: fps, max: fps },
            },
            audio: includeAudio,
          })
        }
      }

      // Screen audio routing with CallAudioIsolator:
      // Eliminates incoming call audio leakage from the outbound screen share.
      // In "Apenas a Aplicação" mode (mixMicrophone = false), local mic and call voices
      // are completely isolated, broadcasting 100% pure application sound (Chrome, etc.).
      // In "Aplicação + Minha Voz" mode (mixMicrophone = true), user's voice is mixed
      // with ducking while call voices remain blocked.
      const screenAudioTrack = screenStream.getAudioTracks()[0]
      const localStream = useMediaStore.getState().localStream

      // Tear down any previous isolator before (re)building.
      if (this.callAudioIsolator) {
        this.callAudioIsolator.dispose()
        this.callAudioIsolator = null
      }

      if (screenAudioTrack) {
        screenAudioTrack.enabled = true
        try {
          const initialScreenVol = useMediaStore.getState().screenShareAudioVolume / 100
          this.callAudioIsolator = new CallAudioIsolator()

          const cleanAudioTrack = this.callAudioIsolator.init(
            screenAudioTrack,
            localStream,
            {
              mixMicrophone,
              isolateCallAudio,
              initialVolume: initialScreenVol,
              targetTitle: sourceName,
            }
          )

          if (cleanAudioTrack) {
            cleanAudioTrack.enabled = true
            PeerManager.getInstance().replaceAudioTrack(cleanAudioTrack)
          }
        } catch (mixErr) {
          console.warn('Audio isolation fallback to raw screen track:', mixErr)
          screenAudioTrack.enabled = true
          PeerManager.getInstance().replaceAudioTrack(screenAudioTrack)
        }
      }

      useMediaStore.getState().setLocalScreenStream(screenStream)
      useMediaStore.getState().setScreenSharing(true)
      useGameStore.getState().setLocalPlayer({ isScreenSharing: true })

      const screenVideoTrack = screenStream.getVideoTracks()[0]
      if (screenVideoTrack) {
        screenVideoTrack.enabled = true
        // 'motion' prioritizes steady frame rate over heavy intra-frame compression
        if ('contentHint' in screenVideoTrack) {
          screenVideoTrack.contentHint = 'motion'
        }

        let targetBitrate = 3_000_000
        if (resolution === '720p') {
          targetBitrate = fps === 60 ? 2_500_000 : 1_800_000
        } else if (resolution === '1080p') {
          targetBitrate = fps === 60 ? 3_500_000 : 2_500_000
        } else if (resolution === '480p') {
          targetBitrate = fps === 60 ? 1_500_000 : 1_000_000
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
    if (this.callAudioIsolator) {
      this.callAudioIsolator.dispose()
      this.callAudioIsolator = null
    }
    useMediaStore.getState().setScreenShareTargetTitle(null)

    const currentScreen = useMediaStore.getState().localScreenStream
    if (currentScreen) {
      currentScreen.getTracks().forEach((t) => t.stop())
    }
    useMediaStore.getState().setLocalScreenStream(null)
    useMediaStore.getState().setScreenSharing(false)
    useGameStore.getState().setLocalPlayer({ isScreenSharing: false })

    const localStream = useMediaStore.getState().localStream
    let camTrack = localStream?.getVideoTracks()[0] || null
    const micTrack = localStream?.getAudioTracks()[0] || null

    if (!camTrack) {
      camTrack = this.createDummyVideoTrack()
      if (localStream && camTrack) {
        localStream.addTrack(camTrack)
      }
    }

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

  public updateScreenShareAudioVolume(percent: number) {
    if (this.callAudioIsolator) {
      this.callAudioIsolator.updateVolume(percent)
    }
    if (this.screenGainNode && this.screenAudioContext) {
      const now = this.screenAudioContext.currentTime
      this.screenGainNode.gain.cancelScheduledValues(now)
      this.screenGainNode.gain.setTargetAtTime(percent / 100, now, 0.05)
    }
  }

  public setScreenShareIsolateCallAudio(enabled: boolean) {
    useMediaStore.getState().setScreenShareIsolateCallAudio(enabled)
    if (this.callAudioIsolator) {
      this.callAudioIsolator.setIsolateCallAudio(enabled)
    }
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
        this.handleEngineLevel
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