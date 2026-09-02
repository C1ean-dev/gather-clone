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

  setSelectedAudioInput: (selectedAudioInput) => {
    saveAudioSettings({ selectedAudioInput })
    set({ selectedAudioInput })
  },
  setSelectedAudioOutput: (selectedAudioOutput) => {
    saveAudioSettings({ selectedAudioOutput })
    set({ selectedAudioOutput })
  },
  setInputVolume: (inputVolume) => {
    saveAudioSettings({ inputVolume })
    set({ inputVolume })
  },
  setOutputVolume: (outputVolume) => {
    saveAudioSettings({ outputVolume })
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
    saveAudioSettings({ screenShareAudioVolume })
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

  setParticipantVolume: (id, volume) => {
    const clamped = Math.max(0, Math.min(100, Math.round(volume)))
    const next = { ...get().participantVolumes, [id]: clamped }
    saveAudioSettings({ participantVolumes: next })
    set({ participantVolumes: next })
  },

  getEffectiveParticipantVolume: (id) => {
    const pVol = get().participantVolumes[id] !== undefined ? get().participantVolumes[id] : 100
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
    set((state) => ({
      dynamicBufferMetrics: { ...state.dynamicBufferMetrics, ...metrics },
    })),

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
  setLocalAudioLevel: (localAudioLevel, isGateOpen = false) =>
    set({ localAudioLevel, isGateOpen: isGateOpen ?? get().isGateOpen }),
  setIsTestingMic: (isTestingMic) => set({ isTestingMic }),
}))