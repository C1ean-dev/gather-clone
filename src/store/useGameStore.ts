import { create } from 'zustand'
import { Player, PresenceStatus, ReactionItem, AvatarConfig, UserRole, PlayerPermissions } from '../types/game'
import { DEFAULT_AVATAR } from '../engine/Constants'
import { PublicRoomsService } from '../services/publicRoomsService'

const PROFILE_STORAGE_KEY = 'gather_v2_user_profile'
const AVAILABLE_ROOMS_KEY = 'gather_v2_available_rooms'

interface SavedProfile {
  id?: string
  name?: string
  avatar?: AvatarConfig
  status?: PresenceStatus
  statusText?: string
  statusEmoji?: string
}

const getStorage = () => {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage
  }
  if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
    return (globalThis as any).localStorage
  }
  return null
}

const loadSavedProfile = (): SavedProfile | null => {
  try {
    const storage = getStorage()
    if (storage) {
      const raw = storage.getItem(PROFILE_STORAGE_KEY)
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
    const storage = getStorage()
    if (storage) {
      const current = loadSavedProfile() || {}
      storage.setItem(PROFILE_STORAGE_KEY, JSON.stringify({ ...current, ...data }))
    }
  } catch (e) {
    // Ignore in non-browser env
  }
}

const syncPublicRoomRegistration = (roomId: string | null, isPublic: boolean, roomName?: string) => {
  if (!roomId) return
  try {
    const storage = getStorage()
    if (!storage) return

    const raw = storage.getItem(AVAILABLE_ROOMS_KEY)
    let rooms: any[] = raw ? JSON.parse(raw) : []
    if (!Array.isArray(rooms)) rooms = []

    if (isPublic) {
      const existingIdx = rooms.findIndex((r) => r.code === roomId)
      const roomEntry = {
        id: 'avail-' + roomId,
        name: roomName || `Espaço Público (${roomId})`,
        code: roomId,
        color: '#3b82f6',
        description: 'Sala pública aberta para todos',
      }
      if (existingIdx >= 0) {
        rooms[existingIdx] = roomEntry
      } else {
        rooms.unshift(roomEntry)
      }
    } else {
      rooms = rooms.filter((r) => r.code !== roomId)
    }
    storage.setItem(AVAILABLE_ROOMS_KEY, JSON.stringify(rooms))
  } catch (e) {
    // Ignore
  }
}

const saved = loadSavedProfile() || {}

interface RoomSessionOptions {
  roomName?: string
  roomDescription?: string
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
  isOwner: boolean
  isHost: boolean
  connectionHostId: string | null
  isConnected: boolean
  isRoomPublic: boolean
  roomName: string
  roomDescription: string
  maxPlayers: number
  roomColor: string
  setRoomSession: (roomId: string, isOwner: boolean, options?: RoomSessionOptions) => void
  setConnected: (connected: boolean) => void
  setIsRoomPublic: (isPublic: boolean) => void
  toggleRoomPrivacy: () => void
  updatePublicRoomDetails: (details: Partial<RoomSessionOptions>) => void
  setConnectionHostId: (id: string | null) => void

  // Floating Reactions
  reactions: ReactionItem[]
  addReaction: (reaction: ReactionItem) => void
  removeReaction: (id: string) => void

  // Online Users & Permissions Drawer
  isOnlineUsersOpen: boolean
  setOnlineUsersOpen: (open: boolean) => void
  toggleOnlineUsers: () => void
  friends: string[]
  toggleFriend: (playerId: string) => void
  updateRemotePlayer: (id: string, partial: Partial<Player>) => void
  updatePlayerPing: (id: string, ping: number) => void
  updatePlayerRole: (id: string, role: UserRole, permissions?: PlayerPermissions) => void
  teleportToPlayer: (targetId: string) => void
  kickPlayer: (targetId: string) => void

  // View Mode (Immersive vs Simplified)
  mapViewMode: 'immersive' | 'simplified'
  isManualSimplified: boolean
  setMapViewMode: (mode: 'immersive' | 'simplified', isManual?: boolean) => void
}

const FRIENDS_STORAGE_KEY = 'gather_v2_friends_list'
const MAP_VIEW_STORAGE_KEY = 'gather_v2_map_view_mode'

const loadSavedMapViewMode = (): 'immersive' | 'simplified' => {
  try {
    const storage = getStorage()
    if (storage) {
      const raw = storage.getItem(MAP_VIEW_STORAGE_KEY)
      if (raw === 'simplified' || raw === 'immersive') return raw
    }
  } catch (e) {}
  return 'immersive'
}

const loadSavedFriends = (): string[] => {
  try {
    const storage = getStorage()
    if (storage) {
      const raw = storage.getItem(FRIENDS_STORAGE_KEY)
      if (raw) return JSON.parse(raw)
    }
  } catch (e) {}
  return []
}

export const useGameStore = create<GameStore>((set, get) => ({
  mapViewMode: loadSavedMapViewMode(),
  isManualSimplified: false,
  setMapViewMode: (mapViewMode, isManual = false) => {
    try {
      const storage = getStorage()
      if (storage) storage.setItem(MAP_VIEW_STORAGE_KEY, mapViewMode)
    } catch (e) {}
    set({
      mapViewMode,
      isManualSimplified: mapViewMode === 'simplified' ? (isManual ?? false) : false,
    })
  },
  isOnlineUsersOpen: false,
  setOnlineUsersOpen: (isOnlineUsersOpen) => set({ isOnlineUsersOpen }),
  toggleOnlineUsers: () => set((state) => ({ isOnlineUsersOpen: !state.isOnlineUsersOpen })),
  friends: loadSavedFriends(),
  toggleFriend: (playerId) =>
    set((state) => {
      const exists = state.friends.includes(playerId)
      const next = exists ? state.friends.filter((id) => id !== playerId) : [...state.friends, playerId]
      try {
        const storage = getStorage()
        if (storage) storage.setItem(FRIENDS_STORAGE_KEY, JSON.stringify(next))
      } catch (e) {}
      return { friends: next }
    }),
  updateRemotePlayer: (id, partial) =>
    set((state) => {
      const existing = state.remotePlayers[id]
      if (!existing) return state
      return {
        remotePlayers: {
          ...state.remotePlayers,
          [id]: { ...existing, ...partial },
        },
      }
    }),
  updatePlayerPing: (id, ping) =>
    set((state) => {
      if (id === state.localPlayer.id) {
        return { localPlayer: { ...state.localPlayer, ping } }
      }
      const existing = state.remotePlayers[id]
      if (!existing) return state
      return {
        remotePlayers: {
          ...state.remotePlayers,
          [id]: { ...existing, ping },
        },
      }
    }),
  setConnectionHostId: (connectionHostId) =>
    set((state) => ({
      connectionHostId,
      isHost: state.localPlayer.id === connectionHostId,
      localPlayer: {
        ...state.localPlayer,
        isHost: state.localPlayer.id === connectionHostId,
      },
    })),
  updatePlayerRole: (id, role, permissions) => {
    const state = get()
    if (id === state.localPlayer.id) {
      set({
        localPlayer: {
          ...state.localPlayer,
          role,
          permissions: permissions || state.localPlayer.permissions,
        },
      })
    } else {
      const target = state.remotePlayers[id]
      if (target) {
        set({
          remotePlayers: {
            ...state.remotePlayers,
            [id]: {
              ...target,
              role,
              permissions: permissions || target.permissions,
            },
          },
        })
      }
    }
  },
  teleportToPlayer: (targetId) => {
    const state = get()
    const target = state.remotePlayers[targetId]
    if (target) {
      state.setLocalPlayer({
        x: target.x + (target.direction === 'left' ? 1 : target.direction === 'right' ? -1 : 0),
        y: target.y + (target.direction === 'up' ? 1 : target.direction === 'down' ? -1 : 0),
      })
    }
  },
  kickPlayer: (targetId) => {
    const { removeRemotePlayer } = get()
    removeRemotePlayer(targetId)
  },
  localPlayer: {
    id: saved.id || 'local-' + Math.random().toString(36).substring(2, 8),
    name: saved.name || 'Player',
    x: 18,
    y: 11,
    direction: 'down',
    isMoving: false,
    role: 'member' as UserRole,
    isOwner: false,
    isHost: false,
    ping: 15,
    permissions: {
      canEditMap: false,
      canManageRoles: false,
      canMuteOthers: false,
      canKick: false,
    },
    avatar: saved.avatar ? { ...DEFAULT_AVATAR, ...saved.avatar } : { ...DEFAULT_AVATAR },
    status: saved.status || 'available',
    statusText: saved.statusText || 'Disponível',
    statusEmoji: saved.statusEmoji || '💻',
    currentZoneId: null,
    lastUpdated: Date.now(),
    isMuted: false,
    isCameraOff: false,
    isScreenSharing: false,
  },

  setLocalPlayer: (data) => {
    if (data.name !== undefined || data.avatar !== undefined) {
      saveProfile({
        name: data.name,
        avatar: data.avatar,
      })
    }
    set((state) => ({
      localPlayer: { ...state.localPlayer, ...data, lastUpdated: Date.now() },
    }))
  },

  setLocalPosition: (x, y, direction, isMoving) =>
    set((state) => {
      const p = state.localPlayer
      // Guard: CanvasEngine calls this every frame while moving. Skip the
      // zustand notify (which re-renders every subscribed React component)
      // when nothing actually changed.
      if (
        p.x === x &&
        p.y === y &&
        p.direction === direction &&
        p.isMoving === isMoving
      ) {
        return state
      }
      return {
        localPlayer: {
          ...state.localPlayer,
          x,
          y,
          direction,
          isMoving,
          lastUpdated: Date.now(),
        },
      }
    }),

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
      if (
        existing.x === x &&
        existing.y === y &&
        existing.direction === direction &&
        existing.isMoving === isMoving
      ) {
        return state
      }
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
  isOwner: false,
  isHost: false,
  connectionHostId: null,
  isConnected: false,
  isRoomPublic: false,
  roomName: 'Espaço Principal',
  roomDescription: 'Sala aberta e compartilhada',
  maxPlayers: 20,
  roomColor: '#3b82f6',

  setRoomSession: (roomId, isOwner, options) => {
    const isPublic = options?.isPublic ?? false
    const name = options?.roomName || `Espaço de ${get().localPlayer.name}`
    const description = options?.roomDescription || 'Espaço virtual Gather V2'
    const maxPlayers = options?.maxPlayers || 20
    const color = options?.color || '#3b82f6'

    set((state) => ({
      roomId,
      isOwner,
      isHost: isOwner,
      connectionHostId: isOwner ? state.localPlayer.id : null,
      isRoomPublic: isPublic,
      roomName: name,
      roomDescription: description,
      maxPlayers,
      roomColor: color,
      localPlayer: {
        ...state.localPlayer,
        isOwner,
        isHost: isOwner,
        role: isOwner ? ('owner' as UserRole) : ('member' as UserRole),
        permissions: isOwner
          ? { canEditMap: true, canManageRoles: true, canMuteOthers: true, canKick: true }
          : { canEditMap: false, canManageRoles: false, canMuteOthers: false, canKick: false },
      },
    }))

    syncPublicRoomRegistration(roomId, isPublic, name)

    if (isOwner && isPublic) {
      PublicRoomsService.getInstance().startHosting({
        id: 'room-' + roomId,
        code: roomId,
        name,
        description,
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
    syncPublicRoomRegistration(state.roomId, isRoomPublic, state.roomName)

    if (isRoomPublic) {
      PublicRoomsService.getInstance().startHosting({
        id: 'room-' + state.roomId,
        code: state.roomId,
        name: state.roomName,
        description: state.roomDescription,
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
      maxPlayers: details.maxPlayers ?? state.maxPlayers,
      roomColor: details.color ?? state.roomColor,
    }))

    const state = get()
    if (state.isHost && state.isRoomPublic) {
      PublicRoomsService.getInstance().updateHosting({
        name: state.roomName,
        description: state.roomDescription,
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
