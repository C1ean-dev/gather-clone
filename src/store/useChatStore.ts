import { create } from 'zustand'
import { Channel, ChatMessage } from '../types/chat'
import { useGameStore } from './useGameStore'

export const getDmChannelId = (userId1: string, userId2: string): string => {
  const sorted = [userId1, userId2].sort()
  return `dm-${sorted[0]}-${sorted[1]}`
}

interface ChatStore {
  channels: Channel[]
  activeChannelId: string
  messages: ChatMessage[]
  isChatOpen: boolean

  setActiveChannel: (channelId: string) => void
  toggleChat: () => void
  setChatOpen: (open: boolean) => void
  addMessage: (message: ChatMessage) => void
  addReactionToMessage: (messageId: string, emoji: string, userId: string) => void
  markChannelAsRead: (channelId: string) => void
  updateZoneChannel: (zoneName: string | null) => void
  openDirectMessage: (targetUser: { id: string; name: string }) => void
}

const DEFAULT_CHANNELS: Channel[] = [
  {
    id: 'general',
    name: 'general',
    type: 'general',
    description: 'Canal de avisos e conversas gerais de todo o espaço',
    unreadCount: 0,
  },
  {
    id: 'social',
    name: 'social',
    type: 'social',
    description: 'Bate-papo descontraído, memes e café',
    unreadCount: 0,
  },
  {
    id: 'current-zone',
    name: 'zona-atual',
    type: 'zone',
    description: 'Mensagens exclusivas para quem está na mesma sala/mesa que você',
    unreadCount: 0,
  },
]

export const useChatStore = create<ChatStore>((set, get) => ({
  channels: DEFAULT_CHANNELS,
  activeChannelId: 'general',
  messages: [
    {
      id: 'welcome-msg',
      senderId: 'system',
      senderName: 'Gather Bot',
      channelId: 'general',
      content: '👋 Bem-vindo ao seu espaço virtual Gather V2! Use WASD ou clique com o mouse para andar pelo escritório.',
      timestamp: Date.now(),
    },
  ],
  isChatOpen: false,

  setActiveChannel: (channelId) => {
    set((state) => ({
      activeChannelId: channelId,
      channels: state.channels.map((c) => (c.id === channelId ? { ...c, unreadCount: 0 } : c)),
    }))
  },

  toggleChat: () => set((state) => ({ isChatOpen: !state.isChatOpen })),
  setChatOpen: (open) => set({ isChatOpen: open }),

  openDirectMessage: (targetUser) => {
    const localId = useGameStore.getState().localPlayer?.id || 'local'
    const channelId = getDmChannelId(localId, targetUser.id)

    set((state) => {
      const existing = state.channels.find((c) => c.id === channelId)
      let channels = state.channels
      if (!existing) {
        const newDmChannel: Channel = {
          id: channelId,
          name: targetUser.name,
          type: 'dm',
          description: `Conversa direta com ${targetUser.name}`,
          unreadCount: 0,
          recipientId: targetUser.id,
        }
        channels = [...channels, newDmChannel]
      } else {
        channels = channels.map((c) =>
          c.id === channelId ? { ...c, name: targetUser.name, unreadCount: 0 } : c
        )
      }

      return {
        channels,
        activeChannelId: channelId,
        isChatOpen: true,
      }
    })
  },

  addMessage: (message) =>
    set((state) => {
      const isCurrent = state.activeChannelId === message.channelId && state.isChatOpen
      let updatedChannels = state.channels
      const channelIndex = state.channels.findIndex((c) => c.id === message.channelId)

      if (channelIndex === -1) {
        // Automatically create channel if it is a direct message or new channel
        const isDm = message.channelId.startsWith('dm-') || !!message.recipientId
        const localId = useGameStore.getState().localPlayer?.id
        const isFromMe = message.senderId === localId
        const otherName = isFromMe ? 'Amigo' : message.senderName
        const otherId = isFromMe ? (message.recipientId || '') : message.senderId

        const newChannel: Channel = {
          id: message.channelId,
          name: otherName,
          type: isDm ? 'dm' : 'general',
          description: isDm ? `Conversa direta com ${otherName}` : undefined,
          unreadCount: isCurrent ? 0 : 1,
          recipientId: otherId,
        }
        updatedChannels = [...updatedChannels, newChannel]
      } else {
        updatedChannels = state.channels.map((c, idx) => {
          if (idx === channelIndex && !isCurrent) {
            return { ...c, unreadCount: c.unreadCount + 1 }
          }
          return c
        })
      }

      return {
        messages: [...state.messages, message],
        channels: updatedChannels,
      }
    }),

  addReactionToMessage: (messageId, emoji, userId) =>
    set((state) => ({
      messages: state.messages.map((m) => {
        if (m.id !== messageId) return m
        const currentReactions = { ...(m.reactions || {}) }
        const users = currentReactions[emoji] || []
        if (users.includes(userId)) {
          currentReactions[emoji] = users.filter((u) => u !== userId)
          if (currentReactions[emoji].length === 0) {
            delete currentReactions[emoji]
          }
        } else {
          currentReactions[emoji] = [...users, userId]
        }
        return { ...m, reactions: currentReactions }
      }),
    })),

  markChannelAsRead: (channelId) =>
    set((state) => ({
      channels: state.channels.map((c) => (c.id === channelId ? { ...c, unreadCount: 0 } : c)),
    })),

  updateZoneChannel: (zoneName) =>
    set((state) => ({
      channels: state.channels.map((c) => {
        if (c.type === 'zone') {
          return {
            ...c,
            name: zoneName ? zoneName.toLowerCase().replace(/\s+/g, '-') : 'sem-zona',
            description: zoneName
              ? `Mensagens exclusivas da sala "${zoneName}"`
              : 'Entre em uma sala demarcada para conversar com o time local',
          }
        }
        return c
      }),
    })),
}))
