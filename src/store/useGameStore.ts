import { create } from 'zustand'
import { Player, PresenceStatus, ReactionItem } from '../types/game'
import { DEFAULT_AVATAR } from '../engine/Constants'

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
    id: 'local-' + Math.random().toString(36).substring(2, 8),
    name: 'Player',
    x: 18,
    y: 11,
    direction: 'down',
    isMoving: false,
    avatar: { ...DEFAULT_AVATAR },
    status: 'available',
    statusText: 'Disponível',
    statusEmoji: '💻',
    currentZoneId: null,
    lastUpdated: Date.now(),
    isHost: false,
    isMuted: false,
    isCameraOff: false,
    isScreenSharing: false,
  },

  setLocalPlayer: (data) =>
    set((state) => ({
      localPlayer: { ...state.localPlayer, ...data, lastUpdated: Date.now() },
    })),

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

  setLocalStatus: (status, statusText, statusEmoji) =>
    set((state) => ({
      localPlayer: {
        ...state.localPlayer,
        status,
        statusText: statusText ?? state.localPlayer.statusText,
        statusEmoji: statusEmoji ?? state.localPlayer.statusEmoji,
        lastUpdated: Date.now(),
      },
    })),

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
      const copy = { ...state.remotePlayers }
      delete copy[id]
      return { remotePlayers: copy }
    }),

  clearRemotePlayers: () => set({ remotePlayers: {} }),

  roomId: null,
  isHost: false,
  isConnected: false,

  setRoomSession: (roomId, isHost) =>
    set((state) => ({
      roomId,
      isHost,
      localPlayer: { ...state.localPlayer, isHost },
    })),

  setConnected: (connected) => set({ isConnected: connected }),

  reactions: [],

  addReaction: (reaction) => {
    set((state) => ({
      reactions: [...state.reactions.filter((r) => Date.now() - r.createdAt < 4000), reaction],
    }))
  },

  removeReaction: (id) =>
    set((state) => ({
      reactions: state.reactions.filter((r) => r.id !== id),
    })),
}))
