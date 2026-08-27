import { create } from 'zustand'
import { Channel, ChatMessage } from '../types/chat'

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

  addMessage: (message) =>
    set((state) => {
      const isCurrent = state.activeChannelId === message.channelId && state.isChatOpen
      const updatedChannels = state.channels.map((c) => {
        if (c.id === message.channelId && !isCurrent) {
          return { ...c, unreadCount: c.unreadCount + 1 }
        }
        return c
      })
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
