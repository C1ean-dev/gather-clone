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

/**
 * Scans an image canvas and crops tightly to the bounding box of non-transparent pixels,
 * eliminating all empty margins so the item is brought close-up and centered.
 */
export function cropContentBoundingBox(
  sourceCanvas: HTMLCanvasElement,
  padding: number = 1
): string {
  const w = sourceCanvas.width
  const h = sourceCanvas.height
  const ctx = sourceCanvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return sourceCanvas.toDataURL()

  const imgData = ctx.getImageData(0, 0, w, h)
  const data = imgData.data

  let minX = w
  let minY = h
  let maxX = -1
  let maxY = -1

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const alpha = data[(y * w + x) * 4 + 3]
      if (alpha > 10) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }

  // If entirely empty (all transparent)
  if (maxX < minX || maxY < minY) {
    return sourceCanvas.toDataURL()
  }

  const cropW = maxX - minX + 1
  const cropH = maxY - minY + 1

  const cropCanvas = document.createElement('canvas')
  cropCanvas.width = cropW
  cropCanvas.height = cropH
  const cropCtx = cropCanvas.getContext('2d')
  if (!cropCtx) return sourceCanvas.toDataURL()

  cropCtx.imageSmoothingEnabled = false
  cropCtx.drawImage(
    sourceCanvas,
    minX,
    minY,
    cropW,
    cropH,
    0,
    0,
    cropW,
    cropH
  )

  return cropCanvas.toDataURL('image/png')
}

/**
 * Loads a data URL and returns an auto-cropped version with empty space removed
 */
export function cropContentDataUrl(
  dataUrl: string,
  padding: number = 1
): Promise<string> {
  return new Promise((resolve) => {
    if (typeof document === 'undefined' || !dataUrl) {
      return resolve(dataUrl)
    }
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) return resolve(dataUrl)
      ctx.drawImage(img, 0, 0)
      resolve(cropContentBoundingBox(canvas, padding))
    }
    img.onerror = () => resolve(dataUrl)
    img.src = dataUrl
  })
}

