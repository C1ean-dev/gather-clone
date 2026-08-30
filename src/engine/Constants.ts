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

export const ZONE_COLOR_PALETTE = [
  '#4c6ef5', // Indigo
  '#20c997', // Teal / Mint
  '#fab005', // Gold / Amber
  '#ff6b6b', // Coral / Red
  '#be4bdb', // Purple / Orchid
  '#339af0', // Sky Blue
  '#ff922b', // Orange
  '#51cf66', // Emerald
  '#f06595', // Rose / Pink
  '#845ef7', // Violet
  '#22b8cf', // Cyan
  '#94d82d', // Lime
  '#e8590c', // Rust
  '#cc5de8', // Magenta
  '#12b886', // Aquamarine
  '#e64980', // Ruby
  '#7048e8', // Deep Violet
  '#15aabf', // Ocean
]

function hslToHex(h: number, s: number, l: number): string {
  l /= 100
  const a = (s * Math.min(l, 1 - l)) / 100
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

/**
 * Generate a distinct room identification color that is NOT in use by any existing room.
 */
export function getNextAvailableZoneColor(existingZones: { color?: string }[] = []): string {
  const usedColors = new Set(
    existingZones
      .map((z) => (z.color || '').toLowerCase().trim())
      .filter(Boolean)
  )

  // 1. Pick the first preset color not yet taken
  for (const c of ZONE_COLOR_PALETTE) {
    if (!usedColors.has(c.toLowerCase())) {
      return c
    }
  }

  // 2. If all presets are in use, generate a distinct golden-angle HSL hue not in use
  const count = existingZones.length
  for (let i = 0; i < 360; i += 20) {
    const hue = Math.floor((count * 137.508 + i) % 360)
    const generatedHex = hslToHex(hue, 75, 55)
    if (!usedColors.has(generatedHex.toLowerCase())) {
      return generatedHex
    }
  }

  return ZONE_COLOR_PALETTE[count % ZONE_COLOR_PALETTE.length]
}


