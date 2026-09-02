import { CustomAsset } from '../types/customAsset'
import { Direction } from '../types/game'
import { SlicedPreset, SlicedFrameSlot } from '../components/avatar-customizer/AvatarSpritesheetSlicerModal'

const KNOWN_IMAGE_MAP: Record<string, string> = {
  gladion: '/assets/avatar/alola_gladion_overworld_sprite__gen_iv_style__by_lime029_dezuvty.png',
  professora: '/assets/avatar/commission___veteran_by_purplezaffre_db8xl9c.png',
  idoso: '/assets/avatar/island_kahuna_nanu_by_purplezaffre_de10eu7.png',
  retro: '/assets/avatar/7d595a64c99a634d94759de8096cca14.png',
  office: '/assets/avatar/SpriteSheet.png',
  unova_rich: '/assets/avatar/unova_rich_boy_overworld_sprite__gen_iv_style__by_lime029_dex0yno.png',
  unova_psychic: '/assets/avatar/unova_psychic_overworld_sprite__gen_iv_style__by_lime029_dex0yg8.png',
  cool_trainer: '/assets/avatar/cool_trainer_female_by_aveontrainer_ddnnno2.png',
  maylene: '/assets/avatar/maylene__gen_3__by_purplezaffre_dcu0f7w (1).png',
  morrison: '/assets/avatar/morrison_by_aveontrainer_dd67lb4.png',
  maxie: '/assets/avatar/team_magma_boss_maxie_by_purplezaffre_dec9k7r.png',
}

/**
 * Detects whether an avatar asset was created through the image slicer,
 * imported from a Sparrow atlas, or drawn in the pixel art studio.
 */
export function detectAssetCreationSource(asset: CustomAsset): 'slicer' | 'atlas' | 'studio' {
  if (asset.creationSource) {
    return asset.creationSource
  }

  // Check ID patterns
  if (asset.id.includes('_sliced_')) {
    return 'slicer'
  }
  if (asset.id.includes('_imported_')) {
    return 'atlas'
  }

  // Check if it has multi-frame walk animations or matched known spritesheets
  const clean = asset.name.toLowerCase().replace(/[^a-z0-9]/g, '_')
  for (const key of Object.keys(KNOWN_IMAGE_MAP)) {
    if (clean.includes(key) || key.includes(clean)) {
      return 'slicer'
    }
  }

  if (asset.directionalFrames) {
    const hasMultipleFrames = Object.values(asset.directionalFrames).some(
      (val) => Array.isArray(val) && val.length > 1
    )
    if (hasMultipleFrames) {
      return 'slicer'
    }
  }

  // Default: custom drawn in Pixel Art Studio
  return 'studio'
}

/**
 * Resolves the original spritesheet or image for an asset so it can be edited
 * in the image slicer.
 */
export function resolveAssetSourceImage(asset: CustomAsset): string {
  if (asset.sourceImageSrc) {
    return asset.sourceImageSrc
  }

  if (asset.sourceFileName) {
    return `/assets/avatar/${asset.sourceFileName}`
  }

  const clean = asset.name.toLowerCase().replace(/[^a-z0-9]/g, '_')
  for (const [key, path] of Object.entries(KNOWN_IMAGE_MAP)) {
    if (clean.includes(key) || key.includes(clean)) {
      return path
    }
  }

  // Fallback: build a stitched spritesheet from the directional frames
  return generateSpritesheetFromAsset(asset)
}

/**
 * Converts a CustomAsset into the SlicedPreset structure expected by AvatarSpritesheetSlicerModal.
 */
export function convertAssetToSlicedPresets(asset: CustomAsset): SlicedPreset[] {
  if (asset.slicerPresets && asset.slicerPresets.length > 0) {
    return asset.slicerPresets
  }

  const fw = (asset.width || 1) * 32
  const fh = (asset.height || 1) * 32

  const toSlot = (url: string, index: number, dir: Direction): SlicedFrameSlot => {
    const rowIdx = dir === 'down' ? 0 : dir === 'up' ? 1 : dir === 'left' ? 2 : 3
    return {
      x: index * fw,
      y: rowIdx * fh,
      w: fw,
      h: fh,
      dataUrl: url,
    }
  }

  const getSlots = (dir: Direction): SlicedFrameSlot[] => {
    const val = asset.directionalFrames?.[dir]
    if (Array.isArray(val)) {
      return val.filter(Boolean).map((u, i) => toSlot(u, i, dir))
    }
    if (typeof val === 'string' && val) {
      return [toSlot(val, 0, dir)]
    }
    const idx = dir === 'down' ? 0 : dir === 'up' ? 1 : dir === 'left' ? 2 : 3
    return asset.frames[idx] ? [toSlot(asset.frames[idx], 0, dir)] : []
  }

  return [
    {
      id: asset.id,
      name: asset.name,
      directions: {
        down: getSlots('down'),
        up: getSlots('up'),
        left: getSlots('left'),
        right: getSlots('right'),
      },
    },
  ]
}

/**
 * Creates a canvas dataUrl spritesheet stitching all 4 directions of an asset.
 */
function generateSpritesheetFromAsset(asset: CustomAsset): string {
  if (typeof document === 'undefined') return ''
  const dirs: Direction[] = ['down', 'up', 'left', 'right']

  const getFrames = (d: Direction): string[] => {
    const val = asset.directionalFrames?.[d]
    if (Array.isArray(val)) return val.filter(Boolean)
    if (typeof val === 'string' && val) return [val]
    const idx = d === 'down' ? 0 : d === 'up' ? 1 : d === 'left' ? 2 : 3
    return asset.frames[idx] ? [asset.frames[idx]] : []
  }

  const allRows = dirs.map(getFrames)
  const maxCols = Math.max(1, ...allRows.map((r) => r.length))
  const fw = (asset.width || 1) * 32
  const fh = (asset.height || 1) * 32

  const canvas = document.createElement('canvas')
  canvas.width = maxCols * fw
  canvas.height = dirs.length * fh
  const ctx = canvas.getContext('2d')
  if (!ctx) return asset.thumbnail || asset.frames[0] || ''

  allRows.forEach((frames, rowIdx) => {
    frames.forEach((frameUrl, colIdx) => {
      const img = new Image()
      img.src = frameUrl
      ctx.drawImage(img, colIdx * fw, rowIdx * fh, fw, fh)
    })
  })

  return canvas.toDataURL('image/png')
}
