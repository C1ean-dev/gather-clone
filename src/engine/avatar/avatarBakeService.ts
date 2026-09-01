import {
  Direction,
  AvatarConfig,
  HairStyleType,
  TopType,
  JacketType,
  BottomType,
  ShoesType,
  HatType,
  GlassesType,
  OtherType,
  FacialHairType,
  EyeType,
  SkinDetailType,
} from '../../types/game'
import { HairRenderer } from './hairRenderer'
import { ClothingRenderer } from './clothingRenderer'
import { FaceRenderer } from './faceRenderer'
import { AccessoryRenderer } from './accessoryRenderer'
import { AvatarAtlasManager } from './AvatarAtlasManager'

/**
 * Bake on Demand: Isolates and rasterizes a preset to an offscreen 32x32 transparent PNG dataUrl
 */
export function bakeAvatarPreset(
  category: string,
  presetId: string,
  avatarConfig?: Partial<AvatarConfig>,
  direction: Direction = 'down'
): string {
  if (!presetId || presetId === 'none') {
    return ''
  }

  // Check if running in browser / DOM
  if (typeof document === 'undefined') {
    // Return a valid mock transparent 32x32 PNG data URL for test environments
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAA'
  }

  const canvas = document.createElement('canvas')
  canvas.width = 32
  canvas.height = 32
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''

  ctx.imageSmoothingEnabled = false
  ctx.clearRect(0, 0, 32, 32)

  // Standard center and base positions for a 32x32 character tile
  const centerX = 16
  const baseY = 25

  // 1. Check if subtexture exists in AvatarAtlasManager
  let searchDir = direction
  let flipX = false
  if (direction === 'left') {
    searchDir = 'right'
    flipX = true
  }

  const candidateNames = [
    `${category}_${presetId}_${searchDir}_0`,
    `${category}_${presetId}_${searchDir}`,
    `${category}_${presetId}_0`,
    `${category}_${presetId}`,
  ]

  let sub = undefined
  for (const name of candidateNames) {
    sub = AvatarAtlasManager.getSubTexture(category, name)
    if (sub) break
  }

  if (sub) {
    const img = AvatarAtlasManager.getImage(category)
    if (img && (!('complete' in img) || img.complete)) {
      ctx.save()
      if (flipX) {
        ctx.translate(16, 0)
        ctx.scale(-1, 1)
        ctx.translate(-16, 0)
      }
      ctx.drawImage(img, sub.x, sub.y, sub.width, sub.height, 0, 0, 32, 32)
      ctx.restore()
      return canvas.toDataURL('image/png')
    }
  }

  // 2. Fallback to procedural renderer
  ctx.save()
  switch (category) {
    case 'hair':
      HairRenderer.drawHair(
        ctx,
        centerX,
        baseY,
        direction,
        presetId as HairStyleType,
        avatarConfig?.hairColor || '#212529'
      )
      break

    case 'top':
      ClothingRenderer.drawTorsoAndTop(
        ctx,
        centerX,
        baseY,
        direction,
        presetId as TopType,
        avatarConfig?.topColor || '#212529',
        'rgba(0,0,0,0)'
      )
      break

    case 'jacket':
      ClothingRenderer.drawJacket(
        ctx,
        centerX,
        baseY,
        direction,
        presetId as JacketType,
        avatarConfig?.jacketColor || '#4c6ef5'
      )
      break

    case 'bottom':
      ClothingRenderer.drawLegsAndShoes(
        ctx,
        centerX,
        baseY,
        direction,
        presetId as BottomType,
        avatarConfig?.bottomColor || '#212529',
        'none',
        '#000',
        0,
        false,
        'rgba(0,0,0,0)'
      )
      break

    case 'shoes':
      ClothingRenderer.drawLegsAndShoes(
        ctx,
        centerX,
        baseY,
        direction,
        'none',
        '#000',
        presetId as ShoesType,
        avatarConfig?.shoesColor || '#e03131',
        0,
        false,
        'rgba(0,0,0,0)'
      )
      break

    case 'hat':
      AccessoryRenderer.drawHat(
        ctx,
        centerX,
        baseY,
        direction,
        presetId as HatType,
        avatarConfig?.hatColor || '#fa5252'
      )
      break

    case 'glasses':
      AccessoryRenderer.drawGlasses(
        ctx,
        centerX,
        baseY,
        direction,
        presetId as GlassesType,
        avatarConfig?.glassesColor || '#343a40'
      )
      break

    case 'other':
      AccessoryRenderer.drawOther(
        ctx,
        centerX,
        baseY,
        direction,
        presetId as OtherType,
        avatarConfig?.otherColor || '#20c997'
      )
      break

    case 'facialHair':
      FaceRenderer.drawFacialHair(
        ctx,
        centerX,
        baseY,
        direction,
        presetId as FacialHairType,
        avatarConfig?.facialHairColor || '#212529'
      )
      break

    case 'eyes':
      FaceRenderer.drawHeadAndFace(
        ctx,
        centerX,
        baseY,
        direction,
        'rgba(0,0,0,0)',
        'smooth',
        presetId as EyeType,
        avatarConfig?.eyeColor || '#111'
      )
      break

    case 'skin':
      FaceRenderer.drawHeadAndFace(
        ctx,
        centerX,
        baseY,
        direction,
        avatarConfig?.skinTone || '#ffd1a4',
        presetId as SkinDetailType,
        'normal',
        '#111'
      )
      break
  }
  ctx.restore()

  return canvas.toDataURL('image/png')
}
