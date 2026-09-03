import { create } from 'zustand'
import { SensitivityMode, AudioProcessorMode } from '../types/audio'

export interface MicCalibration {
  noiseFloorDb: number
  peakRmsDb: number
  snrDb: number
  recommendedMode: AudioProcessorMode
  recommendedSensitivity: number
  calibratedAt: number // timestamp ms
}

interface MediaStore {
  // Local Streams
  localStream: MediaStream | null
  localScreenStream: MediaStream | null
  setLocalStream: (stream: MediaStream | null) => void
  setLocalScreenStream: (stream: MediaStream | null) => void

  // Toggles
  isMuted: boolean
  isCameraOff: boolean
  isScreenSharing: boolean
  isNoiseSuppressionEnabled: boolean
  isGridCallOpen: boolean
  isSettingsModalOpen: boolean

  toggleMute: () => void
  toggleCamera: () => void
  setMuted: (muted: boolean) => void
  setCameraOff: (cameraOff: boolean) => void
  setScreenSharing: (sharing: boolean) => void
  toggleNoiseSuppression: () => void
  toggleGridCall: () => void
  setGridCallOpen: (open: boolean) => void
  setSettingsModalOpen: (open: boolean) => void

  // Audio Device & Control Settings
  selectedAudioInput: string
  selectedAudioOutput: string
  inputVolume: number // 0 to 200 (percentage, 100 is unity)
  outputVolume: number // 0 to 100 (percentage)
  sensitivityMode: SensitivityMode
  manualSensitivityThreshold: number // 0 to 100
  echoCancellation: boolean
  autoGainControl: boolean
  audioProcessorMode: AudioProcessorMode
  /**
   * When true, audioProcessorMode reflects the user's *manual* choice and
   * must not be auto-overridden by a stored calibration. When false, the
   * MediaManager is allowed to apply the calibrated recommendation as
   * the default engine on startup.
   */
  hasUserChosenProcessorMode: boolean
  screenShareAudioVolume: number // 0 to 100 (percentage, default 50)
  duckingEnabled: boolean // Auto-reduce screen sound when user talks

  setSelectedAudioInput: (deviceId: string) => void
  setSelectedAudioOutput: (deviceId: string) => void
  setInputVolume: (vol: number) => void
  setOutputVolume: (vol: number) => void
  setSensitivityMode: (mode: SensitivityMode) => void
  setManualSensitivityThreshold: (val: number) => void
  setEchoCancellation: (enabled: boolean) => void
  setAutoGainControl: (enabled: boolean) => void
  setAudioProcessorMode: (mode: AudioProcessorMode) => void
  setScreenShareAudioVolume: (vol: number) => void
  setDuckingEnabled: (enabled: boolean) => void

  // RNNoise engine lifecycle (surfaced so the UI can show ground truth —
  // previously a failed init was silent and the user got raw mic audio).
  rnnoiseStatus: 'idle' | 'loading' | 'ready' | 'fallback' | 'error'
  rnnoiseError: string | null
  setRnnoiseStatus: (status: 'idle' | 'loading' | 'ready' | 'fallback' | 'error', error?: string | null) => void
  // Last init stage reached (blob → addModule → node → waiting ready).
  // Narrows the next failure to an exact step.
  rnnoiseStage: string
  setRnnoiseStage: (stage: string) => void

  // Mic calibration per deviceId
  micCalibrations: Record<string, MicCalibration>
  isCalibrating: boolean
  setMicCalibration: (deviceId: string, cal: MicCalibration) => void
  clearMicCalibration: (deviceId: string) => void
  setIsCalibrating: (calibrating: boolean) => void

  // Audio Level meter & Gate state (for visual speaker aura & settings VU meter)
  localAudioLevel: number
  isGateOpen: boolean
  isTestingMic: boolean
  setLocalAudioLevel: (level: number, gateOpen?: boolean) => void
  setIsTestingMic: (testing: boolean) => void

  // Remote Streams map: peerId -> MediaStream
  peerStreams: Record<string, MediaStream>
  peerScreenStreams: Record<string, MediaStream>
  participantVolumes: Record<string, number> // peerId or streamId -> 0 to 100
  setParticipantVolume: (id: string, volume: number) => void
  getEffectiveParticipantVolume: (id: string) => number
  liveStreamVolume: number // shared persisted volume for live / screen share
  setLiveStreamVolume: (volume: number) => void
  liveBufferMode: 'dynamic' | 'manual'
  liveBufferDelay: number // in ms, default 3000 (range: 200 to 5000, max 5s)
  dynamicBufferMetrics: {
    calculatedMs: number
    jitterMs: number
    frameDropRate: number
    statusText: string
  }
  setLiveBufferMode: (mode: 'dynamic' | 'manual') => void
  setLiveBufferDelay: (ms: number) => void
  setDynamicBufferMetrics: (
    metrics: Partial<{ calculatedMs: number; jitterMs: number; frameDropRate: number; statusText: string }>
  ) => void
  setPeerStream: (peerId: string, stream: MediaStream) => void
  removePeerStream: (peerId: string) => void
  setPeerScreenStream: (peerId: string, stream: MediaStream) => void
  removePeerScreenStream: (peerId: string) => void
  clearAllPeerStreams: () => void
  stopAllMedia: () => void
}

const STORAGE_KEY = 'gather_v2_audio_settings'

const loadSavedAudioSettings = () => {
  try {
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw) {
        return JSON.parse(raw)
      }
    }
  } catch (e) {
    // Ignore in non-browser env
  }
  return null
}

const saved = loadSavedAudioSettings() || {}

const saveAudioSettings = (settings: Record<string, any>) => {
  try {
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      const current = loadSavedAudioSettings() || {}
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...settings }))
    }
  } catch (e) {
    // Ignore in non-browser env
  }
}

// Trailing-debounce for localStorage persistence. Volume sliders fire
// setState per pixel while dragging — a synchronous read+parse+stringify+write
// per tick janks the drag. State updates stay immediate; only the disk write
// is debounced.
let persistTimer: ReturnType<typeof setTimeout> | null = null
let pendingPersist: Record<string, any> = {}
const saveAudioSettingsDebounced = (settings: Record<string, any>, delayMs: number = 300) => {
  pendingPersist = { ...pendingPersist, ...settings }
  if (persistTimer) return
  persistTimer = setTimeout(() => {
    persistTimer = null
    const batch = pendingPersist
    pendingPersist = {}
    saveAudioSettings(batch)
  }, delayMs)
}

const isValidMode = (m: any): m is AudioProcessorMode =>
  m === 'classic' || m === 'soft' || m === 'rnnoise'

export const useMediaStore = create<MediaStore>((set, get) => ({
  localStream: null,
  localScreenStream: null,
  setLocalStream: (localStream) => set({ localStream }),
  setLocalScreenStream: (localScreenStream) => set({ localScreenStream }),

  isMuted: true,
  isCameraOff: true,
  isScreenSharing: false,
  isNoiseSuppressionEnabled: saved.isNoiseSuppressionEnabled !== undefined ? saved.isNoiseSuppressionEnabled : true,
  isGridCallOpen: false,
  isSettingsModalOpen: false,

  // Device & Volume Config
  selectedAudioInput: saved.selectedAudioInput || 'default',
  selectedAudioOutput: saved.selectedAudioOutput || 'default',
  inputVolume: saved.inputVolume !== undefined ? saved.inputVolume : 100,
  outputVolume: saved.outputVolume !== undefined ? saved.outputVolume : 100,
  sensitivityMode: saved.sensitivityMode || 'auto',
  manualSensitivityThreshold: saved.manualSensitivityThreshold !== undefined ? saved.manualSensitivityThreshold : 20,
  echoCancellation: saved.echoCancellation !== undefined ? saved.echoCancellation : true,
  autoGainControl: saved.autoGainControl !== undefined ? saved.autoGainControl : true,
  audioProcessorMode: isValidMode(saved.audioProcessorMode) ? saved.audioProcessorMode : 'classic',
  // Default false: on first launch MediaManager is allowed to apply the
  // calibrated recommendation (if any) to pick the initial engine.
  hasUserChosenProcessorMode: saved.hasUserChosenProcessorMode === true,
  screenShareAudioVolume: saved.screenShareAudioVolume !== undefined ? saved.screenShareAudioVolume : 50,
  duckingEnabled: saved.duckingEnabled !== undefined ? saved.duckingEnabled : true,

  // Per-device calibrations, persisted as a flat map.
  micCalibrations: (saved.micCalibrations as Record<string, MicCalibration>) || {},
  isCalibrating: false,

  rnnoiseStatus: 'idle',
  rnnoiseError: null,
  setRnnoiseStatus: (rnnoiseStatus, rnnoiseError = null) => {
    const prev = get()
    if (prev.rnnoiseStatus === rnnoiseStatus && prev.rnnoiseError === rnnoiseError) return
    set({ rnnoiseStatus, rnnoiseError })
  },
  rnnoiseStage: '',
  setRnnoiseStage: (rnnoiseStage) => {
    if (get().rnnoiseStage === rnnoiseStage) return
    set({ rnnoiseStage })
  },

  setSelectedAudioInput: (selectedAudioInput) => {
    saveAudioSettings({ selectedAudioInput })
    set({ selectedAudioInput })
  },
  setSelectedAudioOutput: (selectedAudioOutput) => {
    saveAudioSettings({ selectedAudioOutput })
    set({ selectedAudioOutput })
  },
  setInputVolume: (inputVolume) => {
    saveAudioSettingsDebounced({ inputVolume })
    set({ inputVolume })
  },
  setOutputVolume: (outputVolume) => {
    saveAudioSettingsDebounced({ outputVolume })
    set({ outputVolume })
  },
  setSensitivityMode: (sensitivityMode) => {
    saveAudioSettings({ sensitivityMode })
    set({ sensitivityMode })
  },
  setManualSensitivityThreshold: (manualSensitivityThreshold) => {
    saveAudioSettings({ manualSensitivityThreshold })
    set({ manualSensitivityThreshold })
  },
  setEchoCancellation: (echoCancellation) => {
    saveAudioSettings({ echoCancellation })
    set({ echoCancellation })
  },
  setAutoGainControl: (autoGainControl) => {
    saveAudioSettings({ autoGainControl })
    set({ autoGainControl })
  },
  setAudioProcessorMode: (audioProcessorMode) => {
    saveAudioSettings({
      audioProcessorMode,
      hasUserChosenProcessorMode: true, // any user click is a manual override
    })
    set({ audioProcessorMode, hasUserChosenProcessorMode: true })
  },
  setScreenShareAudioVolume: (screenShareAudioVolume) => {
    saveAudioSettingsDebounced({ screenShareAudioVolume })
    set({ screenShareAudioVolume })
  },
  setDuckingEnabled: (duckingEnabled) => {
    saveAudioSettings({ duckingEnabled })
    set({ duckingEnabled })
  },

  setMicCalibration: (deviceId, cal) => {
    const next = { ...get().micCalibrations, [deviceId]: cal }
    saveAudioSettings({ micCalibrations: next })
    set({ micCalibrations: next })
  },
  clearMicCalibration: (deviceId) => {
    const next = { ...get().micCalibrations }
    delete next[deviceId]
    saveAudioSettings({ micCalibrations: next })
    set({ micCalibrations: next })
  },
  setIsCalibrating: (isCalibrating) => set({ isCalibrating }),

  toggleMute: () => {
    const { localStream, isMuted } = get()
    const nextMute = !isMuted
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !nextMute
      })
    }
    set({ isMuted: nextMute })
  },

  setMuted: (isMuted) => {
    const { localStream } = get()
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !isMuted
      })
    }
    set({ isMuted })
  },

  toggleCamera: () => {
    const { localStream, isCameraOff } = get()
    const nextCam = !isCameraOff
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = !nextCam
      })
    }
    set({ isCameraOff: nextCam })
  },

  setCameraOff: (isCameraOff) => {
    const { localStream } = get()
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = !isCameraOff
      })
    }
    set({ isCameraOff })
  },

  setScreenSharing: (sharing) => set({ isScreenSharing: sharing }),

  toggleNoiseSuppression: () => {
    const nextState = !get().isNoiseSuppressionEnabled
    saveAudioSettings({ isNoiseSuppressionEnabled: nextState })
    set({ isNoiseSuppressionEnabled: nextState })
  },

  toggleGridCall: () => set((state) => ({ isGridCallOpen: !state.isGridCallOpen })),
  setGridCallOpen: (open) => set({ isGridCallOpen: open }),
  setSettingsModalOpen: (isSettingsModalOpen) => set({ isSettingsModalOpen }),

  peerStreams: {},
  peerScreenStreams: {},
  participantVolumes: saved.participantVolumes || {},
  liveStreamVolume: typeof saved.liveStreamVolume === 'number' ? saved.liveStreamVolume : 100,

  setParticipantVolume: (id, volume) => {
    const clamped = Math.max(0, Math.min(100, Math.round(volume)))
    const current = get().participantVolumes || {}
    if (current[id] === clamped) return
    const next = { ...current, [id]: clamped }
    saveAudioSettingsDebounced({ participantVolumes: next })
    set({ participantVolumes: next })
  },

  setLiveStreamVolume: (volume) => {
    const clamped = Math.max(0, Math.min(100, Math.round(volume)))
    const current = get().participantVolumes || {}
    const nextVolumes = { ...current, live: clamped }
    saveAudioSettingsDebounced({ liveStreamVolume: clamped, participantVolumes: nextVolumes })
    set({ liveStreamVolume: clamped, participantVolumes: nextVolumes })
  },

  getEffectiveParticipantVolume: (id) => {
    const vols = get().participantVolumes || {}
    const pVol = vols[id] !== undefined ? vols[id] : 100
    const master = (get().outputVolume !== undefined ? get().outputVolume : 100) / 100
    return Math.max(0, Math.min(1, master * (pVol / 100)))
  },

  liveBufferMode: (saved.liveBufferMode as any) || 'dynamic',
  liveBufferDelay: typeof saved.liveBufferDelay === 'number' ? saved.liveBufferDelay : 3000,
  dynamicBufferMetrics: {
    calculatedMs: typeof saved.liveBufferDelay === 'number' ? saved.liveBufferDelay : 3000,
    jitterMs: 0,
    frameDropRate: 0,
    statusText: 'Buffer Dinâmico Ativo',
  },

  setLiveBufferMode: (mode) => {
    saveAudioSettings({ liveBufferMode: mode })
    set({ liveBufferMode: mode })
  },

  setLiveBufferDelay: (ms) => {
    const clamped = Math.max(200, Math.min(5000, Math.round(ms)))
    saveAudioSettings({ liveBufferDelay: clamped })
    set({ liveBufferDelay: clamped })
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gather:live-buffer-changed', { detail: clamped }))
    }
  },

  setDynamicBufferMetrics: (metrics) =>
    set((state) => {
      // Guard: DynamicBufferManager evaluates every 2s during calls. Skip the
      // notify when nothing changed so subscribers don't re-render on a timer.
      const prev = state.dynamicBufferMetrics
      if (
        (metrics.calculatedMs === undefined || metrics.calculatedMs === prev.calculatedMs) &&
        (metrics.jitterMs === undefined || metrics.jitterMs === prev.jitterMs) &&
        (metrics.frameDropRate === undefined || metrics.frameDropRate === prev.frameDropRate) &&
        (metrics.statusText === undefined || metrics.statusText === prev.statusText)
      ) {
        return state
      }
      return {
        dynamicBufferMetrics: { ...prev, ...metrics },
      }
    }),

  setPeerStream: (peerId, stream) =>
    set((state) => ({
      peerStreams: { ...state.peerStreams, [peerId]: stream },
    })),

  removePeerStream: (peerId) =>
    set((state) => {
      const copy = { ...state.peerStreams }
      delete copy[peerId]
      return { peerStreams: copy }
    }),

  setPeerScreenStream: (peerId, stream) =>
    set((state) => ({
      peerScreenStreams: { ...state.peerScreenStreams, [peerId]: stream },
    })),

  removePeerScreenStream: (peerId) =>
    set((state) => {
      const copy = { ...state.peerScreenStreams }
      delete copy[peerId]
      return { peerScreenStreams: copy }
    }),

  clearAllPeerStreams: () => set({ peerStreams: {}, peerScreenStreams: {} }),

  stopAllMedia: () => {
    const { localStream, localScreenStream } = get()
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop())
    }
    if (localScreenStream) {
      localScreenStream.getTracks().forEach((t) => t.stop())
    }
    set({
      localStream: null,
      localScreenStream: null,
      isScreenSharing: false,
      peerStreams: {},
      peerScreenStreams: {},
    })
  },

  localAudioLevel: 0,
  isGateOpen: false,
  isTestingMic: false,
  setLocalAudioLevel: (localAudioLevel, isGateOpen = false) => {
    const prev = get()
    // Guard: DSP engines report the level at ~60Hz (rAF). Skip the zustand
    // notify when nothing perceptible changed — every set() re-renders all
    // media-store subscribers (grid, tiles, overlays).
    const gate = isGateOpen ?? prev.isGateOpen
    if (gate === prev.isGateOpen && Math.abs(localAudioLevel - prev.localAudioLevel) < 0.005) {
      return
    }
    set({ localAudioLevel, isGateOpen: gate })
  },
  setIsTestingMic: (isTestingMic) => set({ isTestingMic }),
}))