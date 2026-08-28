import { create } from 'zustand'
import { Player, PresenceStatus, ReactionItem, AvatarConfig, PublicRoomCategory } from '../types/game'
import { DEFAULT_AVATAR } from '../engine/Constants'
import { PublicRoomsService } from '../services/publicRoomsService'

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

interface RoomSessionOptions {
  roomName?: string
  roomDescription?: string
  roomCategory?: 'work' | 'coffee' | 'games' | 'study' | 'general'
  isPublic?: boolean
  maxPlayers?: number
  color?: string
}

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
  isRoomPublic: boolean
  roomName: string
  roomDescription: string
  roomCategory: 'work' | 'coffee' | 'games' | 'study' | 'general'
  maxPlayers: number
  roomColor: string
  setRoomSession: (roomId: string, isHost: boolean, options?: RoomSessionOptions) => void
  setConnected: (connected: boolean) => void
  setIsRoomPublic: (isPublic: boolean) => void
  toggleRoomPrivacy: () => void
  updatePublicRoomDetails: (details: Partial<RoomSessionOptions>) => void

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
      if (state.isHost && state.isRoomPublic) {
        PublicRoomsService.getInstance().updateHosting({
          playerCount: Object.keys(next).length + 1,
        })
      }
      return { remotePlayers: next }
    }),

  clearRemotePlayers: () => {
    const { isHost, isRoomPublic } = get()
    if (isHost && isRoomPublic) {
      PublicRoomsService.getInstance().updateHosting({
        playerCount: 1,
      })
    }
    set({ remotePlayers: {} })
  },

  roomId: null,
  isHost: false,
  isConnected: false,
  isRoomPublic: false,
  roomName: 'Espaço Principal',
  roomDescription: 'Sala aberta e compartilhada',
  roomCategory: 'general',
  maxPlayers: 20,
  roomColor: '#3b82f6',

  setRoomSession: (roomId, isHost, options) => {
    const isPublic = options?.isPublic ?? false
    const name = options?.roomName || `Espaço de ${get().localPlayer.name}`
    const description = options?.roomDescription || 'Espaço virtual Gather V2'
    const category = options?.roomCategory || 'general'
    const maxPlayers = options?.maxPlayers || 20
    const color = options?.color || '#3b82f6'

    set({
      roomId,
      isHost,
      isRoomPublic: isPublic,
      roomName: name,
      roomDescription: description,
      roomCategory: category,
      maxPlayers,
      roomColor: color,
    })

    if (isHost && isPublic) {
      PublicRoomsService.getInstance().startHosting({
        id: 'room-' + roomId,
        code: roomId,
        name,
        description,
        category,
        hostId: get().localPlayer.id,
        hostName: get().localPlayer.name,
        hostAvatar: get().localPlayer.avatar,
        hostColor: get().localPlayer.avatar?.shirtColor || '#4c6ef5',
        playerCount: 1,
        maxPlayers,
        color,
      })
    } else {
      PublicRoomsService.getInstance().stopHosting()
    }
  },

  setConnected: (isConnected) => {
    set({ isConnected })
    if (!isConnected) {
      PublicRoomsService.getInstance().stopHosting()
    }
  },

  setIsRoomPublic: (isRoomPublic) => {
    const state = get()
    if (!state.roomId || !state.isHost) return

    set({ isRoomPublic })

    if (isRoomPublic) {
      PublicRoomsService.getInstance().startHosting({
        id: 'room-' + state.roomId,
        code: state.roomId,
        name: state.roomName,
        description: state.roomDescription,
        category: state.roomCategory,
        hostId: state.localPlayer.id,
        hostName: state.localPlayer.name,
        hostAvatar: state.localPlayer.avatar,
        hostColor: state.localPlayer.avatar?.shirtColor || '#4c6ef5',
        playerCount: Object.keys(state.remotePlayers).length + 1,
        maxPlayers: state.maxPlayers,
        color: state.roomColor,
      })
    } else {
      PublicRoomsService.getInstance().stopHosting()
    }
  },

  toggleRoomPrivacy: () => {
    const { isRoomPublic, setIsRoomPublic } = get()
    setIsRoomPublic(!isRoomPublic)
  },

  updatePublicRoomDetails: (details) => {
    set((state) => ({
      roomName: details.roomName ?? state.roomName,
      roomDescription: details.roomDescription ?? state.roomDescription,
      roomCategory: details.roomCategory ?? state.roomCategory,
      maxPlayers: details.maxPlayers ?? state.maxPlayers,
      roomColor: details.color ?? state.roomColor,
    }))

    const state = get()
    if (state.isHost && state.isRoomPublic) {
      PublicRoomsService.getInstance().updateHosting({
        name: state.roomName,
        description: state.roomDescription,
        category: state.roomCategory,
        maxPlayers: state.maxPlayers,
        color: state.roomColor,
      })
    }
  },

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
