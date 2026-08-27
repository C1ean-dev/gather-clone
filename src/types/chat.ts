export type ChannelType = 'general' | 'social' | 'zone' | 'dm'

export interface Channel {
  id: string
  name: string
  type: ChannelType
  description?: string
  unreadCount: number
  recipientId?: string // for DMs
  zoneId?: string      // for zone chat
}

export interface ChatMessage {
  id: string
  senderId: string
  senderName: string
  channelId: string
  content: string
  timestamp: number
  avatarConfig?: any
  reactions?: Record<string, string[]> // emoji -> array of userIds
}
