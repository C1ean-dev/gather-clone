export type Direction = 'up' | 'down' | 'left' | 'right'

export type PresenceStatus = 'available' | 'busy' | 'focusing' | 'away'

export type SkinDetailType = 'smooth' | 'vitiligo1' | 'vitiligo2' | 'freckles' | 'blush'
export type EyeType = 'normal' | 'anime' | 'focused' | 'happy' | 'wink' | 'closed'
export type HairStyleType = 'none' | 'bald' | 'messy' | 'anime' | 'long_bangs' | 'short_wavy' | 'curly_afro' | 'twin_tails' | 'ponytail' | 'bob' | 'buzz' | 'short' | 'spiky' | 'long' | 'curly'
export type FacialHairType = 'none' | 'full_beard' | 'mustache' | 'goatee' | 'stubble'
export type TopType = 'none' | 'kimono' | 'yukata' | 'tshirt' | 'sweater' | 'dress_shirt' | 'hoodie' | 'suit' | 'tank'
export type JacketType = 'none' | 'hoodie_open' | 'cardigan' | 'blazer' | 'denim'
export type BottomType = 'none' | 'kimono_skirt' | 'jeans' | 'sweatpants' | 'skirt' | 'shorts'
export type ShoesType = 'none' | 'sneakers' | 'boots' | 'loafers' | 'sandals'
export type HatType = 'none' | 'ribbon_bow' | 'cap_forward' | 'cap_backward' | 'beanie' | 'headband'
export type GlassesType = 'none' | 'round' | 'square' | 'sunglasses' | 'wireframe' | 'glasses'
export type OtherType = 'none' | 'headphones' | 'mask' | 'badge'

export interface AvatarConfig {
  // Custom Hand-Drawn Avatar Skin / Component
  customSkinUrl?: string
  customAvatarId?: string

  // 1. Skin & Face Details
  skinTone: string
  skinColor?: string // backward compatibility
  skinDetail: SkinDetailType
  eyeType?: EyeType
  eyeColor?: string

  // 2. Hair
  hairStyle: HairStyleType
  hairColor: string

  // 3. Facial Hair
  facialHair: FacialHairType
  facialHairColor: string

  // 4. Tops
  topType: TopType
  shirtType?: string // backward compatibility
  topColor: string
  shirtColor?: string // backward compatibility

  // 5. Jackets
  jacketType: JacketType
  jacketColor: string

  // 6. Bottoms
  bottomType: BottomType
  bottomColor: string
  pantsColor?: string // backward compatibility

  // 7. Shoes
  shoesType: ShoesType
  shoesColor: string

  // 8. Hats & Head Accessories
  hatType: HatType
  hatColor: string

  // 9. Glasses
  glassesType: GlassesType
  glassesColor: string
  accessory?: string // backward compatibility
  accessoryColor?: string // backward compatibility

  // 10. Other / Extras
  otherType: OtherType
  otherColor: string
}

export type UserRole = 'owner' | 'host' | 'admin' | 'member' | 'guest'

export interface PlayerPermissions {
  canEditMap?: boolean
  canManageRoles?: boolean
  canMuteOthers?: boolean
  canKick?: boolean
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
  isOwner?: boolean
  isHost?: boolean
  ping?: number
  role?: UserRole
  permissions?: PlayerPermissions
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

export interface PublicSpaceInfo {
  id: string
  name: string
  description: string
  onlineCount: number
  code: string
  color: string
  tags: string[]
  isOfficial?: boolean
}

export interface PublicRoomInfo {
  id: string
  code: string
  name: string
  description?: string
  hostId: string
  hostName: string
  hostAvatar?: AvatarConfig
  hostColor?: string
  playerCount: number
  maxPlayers: number
  color: string
  createdAt: number
  lastHeartbeat: number
  zonesCount?: number
  isOfficial?: boolean
}

