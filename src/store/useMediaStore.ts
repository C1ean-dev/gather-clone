import { create } from 'zustand'

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

  toggleMute: () => void
  toggleCamera: () => void
  setScreenSharing: (sharing: boolean) => void
  toggleNoiseSuppression: () => void
  toggleGridCall: () => void
  setGridCallOpen: (open: boolean) => void

  // Remote Streams map: peerId -> MediaStream
  peerStreams: Record<string, MediaStream>
  peerScreenStreams: Record<string, MediaStream>
  setPeerStream: (peerId: string, stream: MediaStream) => void
  removePeerStream: (peerId: string) => void
  setPeerScreenStream: (peerId: string, stream: MediaStream) => void
  removePeerScreenStream: (peerId: string) => void
  clearAllPeerStreams: () => void

  // Audio Level meter (for visual speaker aura)
  localAudioLevel: number
  setLocalAudioLevel: (level: number) => void
}

export const useMediaStore = create<MediaStore>((set, get) => ({
  localStream: null,
  localScreenStream: null,
  setLocalStream: (localStream) => set({ localStream }),
  setLocalScreenStream: (localScreenStream) => set({ localScreenStream }),

  isMuted: false,
  isCameraOff: false,
  isScreenSharing: false,
  isNoiseSuppressionEnabled: true,
  isGridCallOpen: false,

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

  setScreenSharing: (sharing) => set({ isScreenSharing: sharing }),

  toggleNoiseSuppression: () =>
    set((state) => ({ isNoiseSuppressionEnabled: !state.isNoiseSuppressionEnabled })),

  toggleGridCall: () => set((state) => ({ isGridCallOpen: !state.isGridCallOpen })),
  setGridCallOpen: (open) => set({ isGridCallOpen: open }),

  peerStreams: {},
  peerScreenStreams: {},

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

  localAudioLevel: 0,
  setLocalAudioLevel: (localAudioLevel) => set({ localAudioLevel }),
}))
