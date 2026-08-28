import { create } from 'zustand'
import { Player, PresenceStatus, ReactionItem, AvatarConfig } from '../types/game'
import { DEFAULT_AVATAR } from '../engine/Constants'

const PROFILE_STORAGE_KEY = 'gather_v2_user_profile'

interface SavedProfile {
  id?: string
  name?: string
  avatar?: AvatarConfig
  status?: PresenceStatus
  statusText?: string
  statusEmoji?: string
}

const loadSavedProfile = (): SavedProfile | null => {
  try {
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY)
      if (raw) {
        return JSON.parse(raw)
      }
    }
  } catch (e) {
    // Ignore in non-browser env
  }
  return null
}

const saveProfile = (data: Partial<SavedProfile>) => {
  try {
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      const current = loadSavedProfile() || {}
      window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify({ ...current, ...data }))
    }
  } catch (e) {
    // Ignore in non-browser env
  }
}

const saved = loadSavedProfile() || {}

interface GameStore {
  // Local Player
  localPlayer: Player
  setLocalPlayer: (player: Partial<Player>) => void
  setLocalPosition: (x: number, y: number, direction: 'up' | 'down' | 'left' | 'right', isMoving: boolean) => void
  setLocalStatus: (status: PresenceStatus, statusText?: string, statusEmoji?: string) => void
  setCurrentZoneId: (zoneId: string | null) => void

  // Remote Players
  remotePlayers: Record<string, Player>
  setRemotePlayer: (player: Player) => void
  updateRemotePlayerPosition: (id: string, x: number, y: number, direction: 'up' | 'down' | 'left' | 'right', isMoving: boolean) => void
  removeRemotePlayer: (id: string) => void
  clearRemotePlayers: () => void

  // Session / Room State
  roomId: string | null
  isHost: boolean
  isConnected: boolean
  setRoomSession: (roomId: string, isHost: boolean) => void
  setConnected: (connected: boolean) => void

  // Floating Reactions
  reactions: ReactionItem[]
  addReaction: (reaction: ReactionItem) => void
  removeReaction: (id: string) => void
}

export const useGameStore = create<GameStore>((set, get) => ({
  localPlayer: {
    id: saved.id || 'local-' + Math.random().toString(36).substring(2, 8),
    name: saved.name || 'Player',
    x: 18,
    y: 11,
    direction: 'down',
    isMoving: false,
    avatar: saved.avatar ? { ...DEFAULT_AVATAR, ...saved.avatar } : { ...DEFAULT_AVATAR },
    status: saved.status || 'available',
    statusText: saved.statusText || 'Disponível',
    statusEmoji: saved.statusEmoji || '💻',
    currentZoneId: null,
    lastUpdated: Date.now(),
    isHost: false,
    isMuted: false,
    isCameraOff: false,
    isScreenSharing: false,
  },

  setLocalPlayer: (data) => {
    saveProfile({
      name: data.name,
      avatar: data.avatar,
    })
    set((state) => ({
      localPlayer: { ...state.localPlayer, ...data, lastUpdated: Date.now() },
    }))
  },

  setLocalPosition: (x, y, direction, isMoving) =>
    set((state) => ({
      localPlayer: {
        ...state.localPlayer,
        x,
        y,
        direction,
        isMoving,
        lastUpdated: Date.now(),
      },
    })),

  setLocalStatus: (status, statusText, statusEmoji) => {
    saveProfile({
      status,
      statusText,
      statusEmoji,
    })
    set((state) => ({
      localPlayer: {
        ...state.localPlayer,
        status,
        statusText: statusText ?? state.localPlayer.statusText,
        statusEmoji: statusEmoji ?? state.localPlayer.statusEmoji,
        lastUpdated: Date.now(),
      },
    }))
  },

  setCurrentZoneId: (zoneId) =>
    set((state) => {
      if (state.localPlayer.currentZoneId === zoneId) return state
      return {
        localPlayer: {
          ...state.localPlayer,
          currentZoneId: zoneId,
          lastUpdated: Date.now(),
        },
      }
    }),

  remotePlayers: {},

  setRemotePlayer: (player) =>
    set((state) => ({
      remotePlayers: { ...state.remotePlayers, [player.id]: player },
    })),

  updateRemotePlayerPosition: (id, x, y, direction, isMoving) =>
    set((state) => {
      const existing = state.remotePlayers[id]
      if (!existing) return state
      return {
        remotePlayers: {
          ...state.remotePlayers,
          [id]: {
            ...existing,
            x,
            y,
            direction,
            isMoving,
            lastUpdated: Date.now(),
          },
        },
      }
    }),

  removeRemotePlayer: (id) =>
    set((state) => {
      const next = { ...state.remotePlayers }
      delete next[id]
      return { remotePlayers: next }
    }),

  clearRemotePlayers: () => set({ remotePlayers: {} }),

  roomId: null,
  isHost: false,
  isConnected: false,

  setRoomSession: (roomId, isHost) => set({ roomId, isHost }),
  setConnected: (isConnected) => set({ isConnected }),

  reactions: [],

  addReaction: (reaction) =>
    set((state) => ({
      reactions: [...state.reactions.filter((r) => Date.now() - r.createdAt < 3000), reaction],
    })),

  removeReaction: (id) =>
    set((state) => ({
      reactions: state.reactions.filter((r) => r.id !== id),
    })),
}))
