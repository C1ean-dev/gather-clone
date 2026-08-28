import { FurnitureDefinition } from '../types/map'

export const TILE_SIZE = 32

export const DEFAULT_AVATAR = {
  skinTone: '#ffd1a4',
  skinColor: '#ffd1a4',
  skinDetail: 'vitiligo1' as const,
  hairStyle: 'messy' as const,
  hairColor: '#2b2b2b',
  facialHair: 'none' as const,
  facialHairColor: '#2b2b2b',
  topType: 'kimono' as const,
  shirtType: 'kimono' as const,
  topColor: '#212529',
  shirtColor: '#212529',
  jacketType: 'none' as const,
  jacketColor: '#4c6ef5',
  bottomType: 'kimono_skirt' as const,
  bottomColor: '#212529',
  pantsColor: '#212529',
  shoesType: 'sandals' as const,
  shoesColor: '#51cf66',
  hatType: 'none' as const,
  hatColor: '#fa5252',
  glassesType: 'none' as const,
  glassesColor: '#343a40',
  accessory: 'none' as const,
  accessoryColor: '#20c997',
  otherType: 'none' as const,
  otherColor: '#20c997',
}

export const FURNITURE_CATALOG: FurnitureDefinition[] = []

