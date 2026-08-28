/**
 * Utility functions for cropping and removing background colors (transparency) from images
 */

export interface RGBColor {
  r: number
  g: number
  b: number
}

export const PRESET_BG_COLORS = {
  LPC_DARK: { r: 33, g: 35, b: 42 }, // Standard dark purple/blue background in LPC blacksmith
  PURE_BLACK: { r: 0, g: 0, b: 0 },
  PURE_WHITE: { r: 255, g: 255, b: 255 },
  DARK_GRAY: { r: 32, g: 32, b: 32 },
}

/**
 * Crops a specific region from an image or canvas
 */
export function cropImage(
  source: HTMLImageElement | HTMLCanvasElement,
  sx: number,
  sy: number,
  sw: number,
  sh: number
): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.floor(sw))
  canvas.height = Math.max(1, Math.floor(sh))

  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas

  ctx.imageSmoothingEnabled = false
  ctx.drawImage(source, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)
  return canvas
}

/**
 * Removes a specific background color from a canvas using chroma-key distance and tolerance
 */
export function applyBackgroundRemoval(
  sourceCanvas: HTMLCanvasElement,
  targetColor: RGBColor,
  tolerance: number, // 0 to 100
  removeWhiteFringe: boolean = true
): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = sourceCanvas.width
  canvas.height = sourceCanvas.height

  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas

  ctx.drawImage(sourceCanvas, 0, 0)
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = imgData.data

  // Calculate distance threshold based on tolerance (0 to 100)
  // Max Manhattan distance in RGB is 255 * 3 = 765
  const maxDistance = (tolerance / 100) * 180

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const a = data[i + 3]

    if (a === 0) continue

    // Manhattan color distance
    const dist = Math.abs(r - targetColor.r) + Math.abs(g - targetColor.g) + Math.abs(b - targetColor.b)

    if (dist <= maxDistance) {
      data[i + 3] = 0 // Transparent
    } else if (removeWhiteFringe && r > 215 && g > 215 && b > 215 && tolerance > 15) {
      // Clean high-contrast white edge artifacts
      data[i + 3] = 0
    }
  }

  ctx.putImageData(imgData, 0, 0)
  return canvas
}

/**
 * Automatically trims empty transparent borders from a canvas
 */
export function trimTransparentBorders(sourceCanvas: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = sourceCanvas.getContext('2d')
  if (!ctx) return sourceCanvas

  const w = sourceCanvas.width
  const h = sourceCanvas.height
  const imgData = ctx.getImageData(0, 0, w, h)
  const data = imgData.data

  let minX = w, minY = h, maxX = 0, maxY = 0
  let hasPixels = false

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4
      const a = data[idx + 3]
      if (a > 10) {
        hasPixels = true
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }

  if (!hasPixels) return sourceCanvas

  const trimW = maxX - minX + 1
  const trimH = maxY - minY + 1

  return cropImage(sourceCanvas, minX, minY, trimW, trimH)
}
