export type Direction = 'up' | 'down' | 'left' | 'right'

export type PresenceStatus = 'available' | 'busy' | 'focusing' | 'away'

export interface AvatarConfig {
  skinColor: string        // e.g. '#ffd1a4', '#f5b080', '#ba6c48', '#733e24'
  hairStyle: 'short' | 'long' | 'spiky' | 'curly' | 'bald' | 'ponytail' | 'buzz'
  hairColor: string        // e.g. '#2b2b2b', '#8b5a2b', '#f4d06f', '#c0392b', '#9b59b6', '#3498db'
  shirtType: 'tshirt' | 'hoodie' | 'suit' | 'sweater' | 'tank'
  shirtColor: string       // e.g. '#3498db', '#e74c3c', '#2ecc71', '#9b59b6', '#34495e', '#ffffff'
  pantsColor: string       // e.g. '#2c3e50', '#34495e', '#7f8c8d', '#2980b9'
  accessory: 'none' | 'glasses' | 'sunglasses' | 'headphones' | 'cap' | 'beanie'
  accessoryColor: string
}

export interface Player {
  id: string
  name: string
  x: number // grid or pixel coords
  y: number
  targetX?: number
  targetY?: number
  direction: Direction
  isMoving: boolean
  avatar: AvatarConfig
  status: PresenceStatus
  statusText?: string
  statusEmoji?: string
  currentZoneId?: string | null
  lastUpdated: number
  isHost?: boolean
  isMuted?: boolean
  isCameraOff?: boolean
  isScreenSharing?: boolean
}

export interface ReactionItem {
  id: string
  playerId: string
  emoji: string
  x: number
  y: number
  createdAt: number
}
