/**
 * Utility for resizing canvas graphics with aspect-ratio preservation,
 * alignment options (floor/bottom alignment for furniture vs center),
 * and pixel-art crispness.
 */

export interface ResizeImageOptions {
  targetWidth: number
  targetHeight: number
  fitMode?: 'fit' | 'stretch'
  align?: 'bottom' | 'center'
  smooth?: boolean
}

export interface FitDimensions {
  drawW: number
  drawH: number
  offX: number
  offY: number
}

/**
 * Calculates the bounding box and offsets for rendering an image of size (srcW, srcH)
 * into a target container (targetW, targetH).
 */
export function calculateFitDimensions(
  srcW: number,
  srcH: number,
  targetW: number,
  targetH: number,
  fitMode: 'fit' | 'stretch' = 'fit',
  align: 'bottom' | 'center' = 'bottom'
): FitDimensions {
  if (srcW <= 0 || srcH <= 0 || targetW <= 0 || targetH <= 0) {
    return { drawW: Math.max(0, targetW), drawH: Math.max(0, targetH), offX: 0, offY: 0 }
  }

  if (fitMode === 'stretch') {
    return { drawW: targetW, drawH: targetH, offX: 0, offY: 0 }
  }

  const scale = Math.min(targetW / srcW, targetH / srcH)
  const drawW = Math.max(1, Math.round(srcW * scale))
  const drawH = Math.max(1, Math.round(srcH * scale))
  const offX = Math.round((targetW - drawW) / 2)
  const offY = align === 'bottom' ? targetH - drawH : Math.round((targetH - drawH) / 2)

  return { drawW, drawH, offX, offY }
}

/**
 * Resizes an HTMLCanvasElement to a target width and height.
 * In 'fit' mode, preserves the source aspect ratio and fits within target dimensions,
 * placing the image bottom-aligned (ideal for furniture on grid floor) or centered.
 * In 'stretch' mode, fills the entire target dimensions.
 */
export function resizeImageToTarget(
  sourceCanvas: HTMLCanvasElement,
  targetWidth: number,
  targetHeight: number,
  options: Omit<ResizeImageOptions, 'targetWidth' | 'targetHeight'> = {}
): HTMLCanvasElement {
  if (typeof document === 'undefined') {
    return sourceCanvas
  }

  const { fitMode = 'fit', align = 'bottom', smooth = false } = options

  const destCanvas = document.createElement('canvas')
  destCanvas.width = targetWidth
  destCanvas.height = targetHeight
  const ctx = destCanvas.getContext('2d')
  if (!ctx) return sourceCanvas

  ctx.imageSmoothingEnabled = smooth
  if (smooth) {
    ctx.imageSmoothingQuality = 'high'
  }
  ctx.clearRect(0, 0, targetWidth, targetHeight)

  if (!sourceCanvas || sourceCanvas.width <= 0 || sourceCanvas.height <= 0 || targetWidth <= 0 || targetHeight <= 0) {
    return destCanvas
  }

  const { drawW, drawH, offX, offY } = calculateFitDimensions(
    sourceCanvas.width,
    sourceCanvas.height,
    targetWidth,
    targetHeight,
    fitMode,
    align
  )

  ctx.drawImage(sourceCanvas, offX, offY, drawW, drawH)

  return destCanvas
}

export interface LayerBounds {
  x: number
  y: number
  width: number
  height: number
  origWidth?: number
  origHeight?: number
}

/**
 * Rescales a layer's bounds when the board dimensions change or when fitting to board,
 * ensuring the layer expands and shrinks cleanly without clipping or losing original proportions.
 */
export function fitLayerToBounds<T extends LayerBounds>(
  layer: T,
  boardWidth: number,
  boardHeight: number,
  mode: 'fit' | 'stretch' = 'fit'
): T {
  if (boardWidth <= 0 || boardHeight <= 0) return layer

  const baseW = layer.origWidth || layer.width
  const baseH = layer.origHeight || layer.height

  const { drawW, drawH, offX, offY } = calculateFitDimensions(
    baseW,
    baseH,
    boardWidth,
    boardHeight,
    mode,
    'bottom'
  )

  return {
    ...layer,
    origWidth: baseW,
    origHeight: baseH,
    x: Math.max(0, offX),
    y: Math.max(0, offY),
    width: Math.max(1, drawW),
    height: Math.max(1, drawH),
  }
}

/**
 * Scales all layers proportionally when the board changes to new dimensions (newBoardW, newBoardH).
 * If oldBoardW/oldBoardH are provided, preserves relative positioning while scaling layer dimensions.
 */
export function rescaleLayersForNewBoard<T extends LayerBounds>(
  layers: T[],
  newBoardW: number,
  newBoardH: number,
  oldBoardW?: number,
  oldBoardH?: number
): T[] {
  if (newBoardW <= 0 || newBoardH <= 0) return layers

  return layers.map((layer) => {
    const baseW = layer.origWidth || layer.width
    const baseH = layer.origHeight || layer.height

    const { drawW, drawH, offX, offY } = calculateFitDimensions(
      baseW,
      baseH,
      newBoardW,
      newBoardH,
      'fit',
      'bottom'
    )

    const wasCenteredX =
      !oldBoardW ||
      oldBoardW <= 2 ||
      Math.abs(layer.x - Math.round((oldBoardW - layer.width) / 2)) <= 1
    const wasBottomAligned =
      !oldBoardH ||
      oldBoardH <= 2 ||
      Math.abs(layer.y - (oldBoardH - layer.height)) <= 1

    const newX = wasCenteredX
      ? offX
      : Math.max(0, Math.min(newBoardW - drawW, Math.round((layer.x / (oldBoardW || 1)) * newBoardW)))
    const newY = wasBottomAligned
      ? offY
      : Math.max(0, Math.min(newBoardH - drawH, Math.round((layer.y / (oldBoardH || 1)) * newBoardH)))

    return {
      ...layer,
      origWidth: baseW,
      origHeight: baseH,
      x: newX,
      y: newY,
      width: Math.max(1, drawW),
      height: Math.max(1, drawH),
    }
  })
}

/**
 * Snap a floating-point coordinate to a specific grid increment (e.g. 0.25 for 8px sub-grid, 1/32 for 1px).
 */
export function snapCoordinateToGrid(val: number, snapStep: number): number {
  if (snapStep <= 0) return val
  return Math.round(val / snapStep) * snapStep
}

export interface BakeScaleResult {
  scale: number
  bakeWidth: number
  bakeHeight: number
  useSmoothing: boolean
}

/**
 * Calculates high-fidelity bake resolution for a composition or crop,
 * ensuring micro-items (e.g. 8x8, 16x16, 32x32) don't decimate high-res artwork (e.g. 352x352),
 * while preserving 1:1 crispness for genuine pixel art.
 */
export function calculateHighFidelityBakeScale(
  boardWidth: number,
  boardHeight: number,
  layers: { origWidth?: number; origHeight?: number; width: number; height: number }[],
  maxBakeDimension: number = 512
): BakeScaleResult {
  const bW = Math.max(1, boardWidth)
  const bH = Math.max(1, boardHeight)
  const boardMax = Math.max(bW, bH)

  let maxOrigDim = boardMax
  layers.forEach((l) => {
    const oW = l.origWidth || l.width
    const oH = l.origHeight || l.height
    if (oW > maxOrigDim) maxOrigDim = oW
    if (oH > maxOrigDim) maxOrigDim = oH
  })

  // If layers originated from higher resolution, upscale the raster grid proportionally
  // so the saved PNG frame retains high graphical fidelity instead of becoming a crude 8x8 or 16x16 blob.
  const targetMax = Math.min(maxBakeDimension, Math.max(boardMax, maxOrigDim))
  const rawScale = targetMax / boardMax
  const scale = Math.max(1, Math.min(16, Math.ceil(rawScale)))

  const bakeWidth = Math.round(bW * scale)
  const bakeHeight = Math.round(bH * scale)
  const useSmoothing = scale > 1 || maxOrigDim > boardMax * 1.25

  return { scale, bakeWidth, bakeHeight, useSmoothing }
}

export interface LayerBakeInput {
  id?: string
  dataUrl: string
  x: number
  y: number
  width: number
  height: number
  origWidth?: number
  origHeight?: number
  flipH?: boolean
  opacity?: number
}

/**
 * Synchronously bakes layers onto a canvas if images are already cached/loaded.
 * Returns null if document is undefined or if any image is not ready yet.
 */
export function bakeLayersToDataUrlSync(
  boardWidth: number,
  boardHeight: number,
  layers: LayerBakeInput[],
  imageCache?: Record<string, HTMLImageElement>
): string | null {
  if (typeof document === 'undefined' || !layers || layers.length === 0) {
    return null
  }

  const imgs: (HTMLImageElement | null)[] = []
  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i]
    const cached = imageCache && layer.id ? imageCache[layer.id] : null
    if (!cached || !cached.complete || cached.naturalWidth === 0) {
      return null
    }
    imgs[i] = cached
  }

  const { scale, bakeWidth, bakeHeight, useSmoothing } = calculateHighFidelityBakeScale(
    boardWidth,
    boardHeight,
    layers
  )

  const offscreen = document.createElement('canvas')
  offscreen.width = bakeWidth
  offscreen.height = bakeHeight
  const ctx = offscreen.getContext('2d')
  if (!ctx) return null

  ctx.imageSmoothingEnabled = useSmoothing
  if (useSmoothing) {
    ctx.imageSmoothingQuality = 'high'
  }
  ctx.clearRect(0, 0, offscreen.width, offscreen.height)

  layers.forEach((layer, idx) => {
    const img = imgs[idx]
    if (!img) return

    ctx.save()
    ctx.globalAlpha = layer.opacity ?? 1

    const drawX = layer.x * scale
    const drawY = layer.y * scale
    const drawW = layer.width * scale
    const drawH = layer.height * scale

    if (layer.flipH) {
      ctx.translate(drawX + drawW, drawY)
      ctx.scale(-1, 1)
      ctx.drawImage(img, 0, 0, drawW, drawH)
    } else {
      ctx.drawImage(img, drawX, drawY, drawW, drawH)
    }
    ctx.restore()
  })

  return offscreen.toDataURL('image/png')
}

/**
 * Asynchronously bakes layers onto a canvas, loading any unloaded images from dataUrl first.
 */
export async function bakeLayersToDataUrl(
  boardWidth: number,
  boardHeight: number,
  layers: LayerBakeInput[],
  imageCache?: Record<string, HTMLImageElement>
): Promise<string> {
  if (typeof document === 'undefined' || !layers || layers.length === 0) {
    return ''
  }

  const imgs: (HTMLImageElement | null)[] = []
  const promises: Promise<void>[] = []

  layers.forEach((layer, idx) => {
    const cached = imageCache && layer.id ? imageCache[layer.id] : null
    if (cached && cached.complete && cached.naturalWidth > 0) {
      imgs[idx] = cached
    } else {
      const img = new Image()
      promises.push(
        new Promise<void>((resolve) => {
          img.onload = () => {
            imgs[idx] = img
            resolve()
          }
          img.onerror = () => {
            imgs[idx] = null
            resolve()
          }
          img.src = layer.dataUrl
        })
      )
    }
  })

  if (promises.length > 0) {
    await Promise.all(promises)
  }

  const { scale, bakeWidth, bakeHeight, useSmoothing } = calculateHighFidelityBakeScale(
    boardWidth,
    boardHeight,
    layers
  )

  const offscreen = document.createElement('canvas')
  offscreen.width = bakeWidth
  offscreen.height = bakeHeight
  const ctx = offscreen.getContext('2d')
  if (!ctx) return ''

  ctx.imageSmoothingEnabled = useSmoothing
  if (useSmoothing) {
    ctx.imageSmoothingQuality = 'high'
  }
  ctx.clearRect(0, 0, offscreen.width, offscreen.height)

  layers.forEach((layer, idx) => {
    const img = imgs[idx]
    if (!img || !img.complete || img.naturalWidth === 0) return

    ctx.save()
    ctx.globalAlpha = layer.opacity ?? 1

    const drawX = layer.x * scale
    const drawY = layer.y * scale
    const drawW = layer.width * scale
    const drawH = layer.height * scale

    if (layer.flipH) {
      ctx.translate(drawX + drawW, drawY)
      ctx.scale(-1, 1)
      ctx.drawImage(img, 0, 0, drawW, drawH)
    } else {
      ctx.drawImage(img, drawX, drawY, drawW, drawH)
    }
    ctx.restore()
  })

  return offscreen.toDataURL('image/png')
}

