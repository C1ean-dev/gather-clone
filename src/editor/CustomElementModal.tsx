import React, { useState, useRef, useEffect } from 'react'
import {
  X,
  Upload,
  Sparkles,
  Layers,
  Eye,
  Trash2,
  Play,
  Pause,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Grid,
  Pipette,
  Check,
  Flame,
  Shield,
  Plus,
  RotateCcw,
  Move,
  FlipHorizontal,
  ArrowUp,
  ArrowDown,
  Copy,
  Sliders,
  Scissors,
  Wand2,
  Package,
  Brush,
  Square,
  CheckSquare,
  Pencil,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
} from 'lucide-react'
import { useCustomAssetsStore } from '../store/useCustomAssetsStore'
import { useMapStore } from '../store/useMapStore'
import { CustomAsset, CustomAssetType } from '../types/customAsset'
import {
  cropImage,
  applyBackgroundRemoval,
  trimTransparentBorders,
  RGBColor,
  PRESET_BG_COLORS,
} from '../utils/imageTransparency'

export interface CroppedClip {
  id: string
  name: string
  dataUrl: string
  width: number
  height: number
}

export interface CompositeLayer {
  id: string
  clipId: string
  name: string
  dataUrl: string
  x: number
  y: number
  width: number
  height: number
  flipH: boolean
  opacity: number
}

export const CustomElementModal: React.FC = () => {
  const {
    isCustomModalOpen,
    setCustomModalOpen,
    editingAssetId,
    updateCustomAsset,
    getAssetById,
    addCustomAsset,
    addCategory,
    getAllCategories,
  } = useCustomAssetsStore()
  const { setSelectedFurnitureDefId, setSelectedFloor, setSelectedWall, setActiveTool } = useMapStore()

  // Studio Mode: 'crop' (Recorte de Sprites da Imagem Original) vs 'compose' (Compor Quadros com as Peças Recortadas)
  const [studioMode, setStudioMode] = useState<'crop' | 'compose'>('crop')

  // Source Image State (ALWAYS preserved in Crop mode)
  const [sourceImage, setSourceImage] = useState<HTMLImageElement | null>(null)
  const [sourceImageSrc, setSourceImageSrc] = useState<string>('')
  const [zoom, setZoom] = useState<number>(1)
  const [snapToGrid, setSnapToGrid] = useState<boolean>(true)
  const [isEyedropperActive, setIsEyedropperActive] = useState<boolean>(false)

  // Selection Box (in source image pixel coordinates)
  const [selection, setSelection] = useState<{ x: number; y: number; w: number; h: number }>({
    x: 0,
    y: 0,
    w: 64,
    h: 128,
  })
  const [isDraggingSelection, setIsDraggingSelection] = useState<boolean>(false)
  const [dragSelectionStart, setDragSelectionStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 })

  // Transparency / Background Removal State
  const [enableBgRemoval, setEnableBgRemoval] = useState<boolean>(true)
  const [targetColor, setTargetColor] = useState<RGBColor>(PRESET_BG_COLORS.LPC_DARK)
  const [tolerance, setTolerance] = useState<number>(25)
  const [removeWhiteFringe, setRemoveWhiteFringe] = useState<boolean>(true)

  // --- Saved Cropped Pieces (Biblioteca de Peças Recortadas) ---
  const [croppedClips, setCroppedClips] = useState<CroppedClip[]>([])

  // --- Composition Board State ---
  const [tileWidth, setTileWidth] = useState<number>(4)
  const [tileHeight, setTileHeight] = useState<number>(6)
  const [compositeBoardWidth, setCompositeBoardWidth] = useState<number>(128)
  const [compositeBoardHeight, setCompositeBoardHeight] = useState<number>(192)
  const [compositeLayers, setCompositeLayers] = useState<CompositeLayer[]>([])
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null)
  const [isDraggingLayer, setIsDraggingLayer] = useState<boolean>(false)
  const [dragLayerStart, setDragLayerStart] = useState<{ mouseX: number; mouseY: number; layerX: number; layerY: number }>({
    mouseX: 0,
    mouseY: 0,
    layerX: 0,
    layerY: 0,
  })

  // --- Composition Interactive Tools: 'move' (Move Layers) vs 'collision' (Paint Red Collision on Canvas) ---
  const [composeTool, setComposeTool] = useState<'move' | 'collision'>('move')
  const [showCollisionOverlay, setShowCollisionOverlay] = useState<boolean>(true)
  const [isPaintingCollision, setIsPaintingCollision] = useState<boolean>(false)
  const [collisionPaintValue, setCollisionPaintValue] = useState<boolean>(true)

  // --- Editable Collision Grid Matrix [tileHeight][tileWidth] ---
  const [collisionGrid, setCollisionGrid] = useState<boolean[][]>(() => {
    const grid: boolean[][] = []
    for (let r = 0; r < 6; r++) {
      const row: boolean[] = []
      for (let c = 0; c < 4; c++) {
        row.push(r >= 3) // Default: bottom half solid
      }
      grid.push(row)
    }
    return grid
  })

  // Animation Frames State (Resulting sequence of frames)
  const [frames, setFrames] = useState<string[]>([])
  const [frameLayerStates, setFrameLayerStates] = useState<CompositeLayer[][]>([])
  const [selectedFrameIdx, setSelectedFrameIdx] = useState<number | null>(0)
  const [frameRateMs, setFrameRateMs] = useState<number>(160)
  const [isPlayingAnim, setIsPlayingAnim] = useState<boolean>(true)
  const [currentPreviewFrameIdx, setCurrentPreviewFrameIdx] = useState<number>(0)

  // Element Properties Form
  const [elementName, setElementName] = useState<string>('Meu Elemento Composto')
  const [elementType, setElementType] = useState<CustomAssetType>('furniture')
  const [category, setCategory] = useState<string>('Forja Antiga')
  const [isCreatingNewCategory, setIsCreatingNewCategory] = useState<boolean>(false)
  const [newCategoryName, setNewCategoryName] = useState<string>('')

  // Canvas Refs
  const mainCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const composeCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const singlePreviewCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const animCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const floorTilingCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const wallMockupCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Helper to set composition board & element size in tiles
  const setBoardSizeInTiles = (wTiles: number, hTiles: number) => {
    const w = Math.max(1, Math.min(10, wTiles))
    const h = Math.max(1, Math.min(10, hTiles))
    setTileWidth(w)
    setTileHeight(h)
    setCompositeBoardWidth(w * 32)
    setCompositeBoardHeight(h * 32)
  }

  // Synchronize collisionGrid matrix when tile dimensions change
  useEffect(() => {
    setCollisionGrid((prev) => {
      const newGrid: boolean[][] = []
      for (let r = 0; r < tileHeight; r++) {
        const row: boolean[] = []
        for (let c = 0; c < tileWidth; c++) {
          if (prev[r] && prev[r][c] !== undefined) {
            row.push(prev[r][c])
          } else {
            // Default: bottom half solid
            row.push(r >= Math.floor(tileHeight / 2))
          }
        }
        newGrid.push(row)
      }
      return newGrid
    })
  }, [tileWidth, tileHeight])

  const handleSetAllCollision = (solid: boolean) => {
    setCollisionGrid((prev) => prev.map((row) => row.map(() => solid)))
  }

  const handleSetBottomHalfCollision = () => {
    setCollisionGrid((prev) =>
      prev.map((row, r) => row.map(() => r >= Math.floor(tileHeight / 2)))
    )
  }

  // Dynamic handling when switching element types (Mobília vs Piso vs Parede)
  const handleSelectElementType = (newType: CustomAssetType) => {
    setElementType(newType)
    if (newType === 'floor') {
      // Floors: Default 1x1 (32x32) tile, 0 collision
      setBoardSizeInTiles(1, 1)
      setCropWidth(32)
      setCropHeight(32)
      setComposeTool('move')
      setShowCollisionOverlay(false)
      handleSetAllCollision(false)
      if (category === 'Forja Antiga' || category === 'Geral' || category === 'Mobilias') {
        setCategory('Pisos Personalizados')
      }
    } else if (newType === 'wall') {
      // Walls: Default 1x1 (32x32) tile texture, collision handled by zones
      setBoardSizeInTiles(1, 1)
      setCropWidth(32)
      setCropHeight(32)
      setComposeTool('move')
      setShowCollisionOverlay(false)
      handleSetAllCollision(false)
      if (category === 'Forja Antiga' || category === 'Geral' || category === 'Mobilias') {
        setCategory('Paredes das Zonas')
      }
    } else {
      // Furniture: Default multi-tile, enable collision painting
      setShowCollisionOverlay(true)
      if (tileWidth === 1 && tileHeight === 1) {
        setBoardSizeInTiles(2, 2)
      }
      handleSetBottomHalfCollision()
      if (category === 'Pisos Personalizados' || category === 'Paredes das Zonas') {
        setCategory('Forja Antiga')
      }
    }
  }

  // Load asset data when editing an existing asset
  useEffect(() => {
    if (!isCustomModalOpen) return

    if (editingAssetId) {
      const asset = getAssetById(editingAssetId)
      if (asset) {
        setElementName(asset.name)
        setElementType(asset.type)
        setCategory(asset.category || 'Geral')
        setTileWidth(asset.width)
        setTileHeight(asset.height)
        setCompositeBoardWidth(asset.width * 32)
        setCompositeBoardHeight(asset.height * 32)
        setFrames(asset.frames || [])
        setFrameRateMs(asset.frameRateMs || 160)
        if (asset.collisionGrid && asset.collisionGrid.length > 0) {
          setCollisionGrid(asset.collisionGrid)
        }

        // Restore distinct separate layers for each frame if available
        if (asset.frameLayers && asset.frameLayers.length > 0) {
          setFrameLayerStates(asset.frameLayers)
          const firstFrameLayers = asset.frameLayers[0] || []
          setCompositeLayers(JSON.parse(JSON.stringify(firstFrameLayers)))
          if (firstFrameLayers.length > 0) {
            setSelectedLayerId(firstFrameLayers[0].id)
          }

          // Populate cropped pieces library with all unique layer clips
          const existingClipsMap = new Map<string, CroppedClip>()
          asset.frameLayers.flat().forEach((layer) => {
            const clipKey = layer.clipId || layer.id
            if (!existingClipsMap.has(clipKey)) {
              existingClipsMap.set(clipKey, {
                id: clipKey,
                name: layer.name,
                dataUrl: layer.dataUrl,
                width: layer.width,
                height: layer.height,
              })
            }
          })
          setCroppedClips(Array.from(existingClipsMap.values()))
        } else if (asset.frames && asset.frames.length > 0) {
          // Fallback for legacy elements
          const legacyLayers: CompositeLayer[][] = asset.frames.map((f, idx) => [
            {
              id: `layer_edit_${idx}_0`,
              clipId: `clip_edit_${idx}`,
              name: `Camada Base (${idx + 1})`,
              dataUrl: f,
              x: 0,
              y: 0,
              width: asset.width * 32,
              height: asset.height * 32,
              flipH: false,
              opacity: 1,
            },
          ])
          setFrameLayerStates(legacyLayers)
          setCompositeLayers(JSON.parse(JSON.stringify(legacyLayers[0])))
          setSelectedLayerId(legacyLayers[0][0].id)

          const clips: CroppedClip[] = asset.frames.map((f, idx) => ({
            id: `clip_edit_${idx}`,
            name: `Quadro ${idx + 1}`,
            dataUrl: f,
            width: asset.width * 32,
            height: asset.height * 32,
          }))
          setCroppedClips(clips)
        }

        setSelectedFrameIdx(0)
        setStudioMode('compose') // Open directly in composition view when editing!
      }
    }
  }, [isCustomModalOpen, editingAssetId])



  // Animation player ticker
  useEffect(() => {
    if (!isPlayingAnim || frames.length <= 1) return
    const interval = setInterval(() => {
      setCurrentPreviewFrameIdx((prev) => (prev + 1) % frames.length)
    }, frameRateMs)
    return () => clearInterval(interval)
  }, [isPlayingAnim, frames.length, frameRateMs])

  // Draw main source canvas with selection box (Original image always intact)
  useEffect(() => {
    const canvas = mainCanvasRef.current
    if (!canvas || !sourceImage) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = sourceImage.naturalWidth * zoom
    canvas.height = sourceImage.naturalHeight * zoom

    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw Source Image scaled
    ctx.drawImage(sourceImage, 0, 0, canvas.width, canvas.height)

    // Draw 32px Grid Lines
    if (snapToGrid) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'
      ctx.lineWidth = 1
      const gridPx = 32 * zoom
      for (let x = 0; x <= canvas.width; x += gridPx) {
        ctx.beginPath()
        ctx.moveTo(x + 0.5, 0)
        ctx.lineTo(x + 0.5, canvas.height)
        ctx.stroke()
      }
      for (let y = 0; y <= canvas.height; y += gridPx) {
        ctx.beginPath()
        ctx.moveTo(0, y + 0.5)
        ctx.lineTo(canvas.width, y + 0.5)
        ctx.stroke()
      }
    }

    // Draw Selection Box
    const sx = selection.x * zoom
    const sy = selection.y * zoom
    const sw = selection.w * zoom
    const sh = selection.h * zoom

    // Highlight area
    ctx.fillStyle = 'rgba(59, 130, 246, 0.25)'
    ctx.fillRect(sx, sy, sw, sh)

    // Selection border
    ctx.strokeStyle = '#3b82f6'
    ctx.lineWidth = 2
    ctx.strokeRect(sx + 0.5, sy + 0.5, sw - 1, sh - 1)

    // Corner grab handles
    ctx.fillStyle = '#ffffff'
    const handleSize = 6
    ctx.fillRect(sx - handleSize / 2, sy - handleSize / 2, handleSize, handleSize)
    ctx.fillRect(sx + sw - handleSize / 2, sy - handleSize / 2, handleSize, handleSize)
    ctx.fillRect(sx - handleSize / 2, sy + sh - handleSize / 2, handleSize, handleSize)
    ctx.fillRect(sx + sw - handleSize / 2, sy + sh - handleSize / 2, handleSize, handleSize)
  }, [sourceImage, zoom, selection, snapToGrid, studioMode, isCustomModalOpen])

  // Render single cropped preview canvas (with background removal)
  const getProcessedSelectionCanvas = (): HTMLCanvasElement | null => {
    if (!sourceImage || selection.w <= 0 || selection.h <= 0) return null

    const rawCrop = cropImage(sourceImage, selection.x, selection.y, selection.w, selection.h)
    if (enableBgRemoval) {
      return applyBackgroundRemoval(rawCrop, targetColor, tolerance, removeWhiteFringe)
    }
    return rawCrop
  }

  // Update Single Frame Preview Canvas
  useEffect(() => {
    const previewCanvas = singlePreviewCanvasRef.current
    if (!previewCanvas) return
    const ctx = previewCanvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height)

    const processed = getProcessedSelectionCanvas()
    if (!processed) return

    previewCanvas.width = 128
    previewCanvas.height = 128
    ctx.imageSmoothingEnabled = false

    // Draw checkerboard background
    const tileSize = 8
    for (let y = 0; y < previewCanvas.height; y += tileSize) {
      for (let x = 0; x < previewCanvas.width; x += tileSize) {
        ctx.fillStyle = (x / tileSize + y / tileSize) % 2 === 0 ? '#1e2029' : '#2b2d38'
        ctx.fillRect(x, y, tileSize, tileSize)
      }
    }

    // Scale and center the processed crop
    const maxDim = Math.max(processed.width, processed.height)
    const scale = (previewCanvas.width - 16) / maxDim
    const drawW = processed.width * scale
    const drawH = processed.height * scale
    const offX = (previewCanvas.width - drawW) / 2
    const offY = (previewCanvas.height - drawH) / 2

    ctx.drawImage(processed, offX, offY, drawW, drawH)
  }, [sourceImage, selection, enableBgRemoval, targetColor, tolerance, removeWhiteFringe])

  // --- COMPOSITION BOARD RENDERING ---
  const [cachedLayerImages, setCachedLayerImages] = useState<{ [id: string]: HTMLImageElement }>({})

  // Preload layer images whenever compositeLayers changes
  useEffect(() => {
    const newCache: { [id: string]: HTMLImageElement } = {}
    let loadedCount = 0
    const total = compositeLayers.length

    if (total === 0) {
      setCachedLayerImages({})
      return
    }

    compositeLayers.forEach((layer) => {
      const img = new Image()
      img.src = layer.dataUrl
      img.onload = () => {
        loadedCount++
        if (loadedCount === total) {
          setCachedLayerImages(newCache)
        }
      }
      newCache[layer.id] = img
    })
  }, [compositeLayers])

  // Draw Composition Canvas (with optional Red Collision Overlay)
  useEffect(() => {
    const canvas = composeCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const renderZoom = 2
    canvas.width = compositeBoardWidth * renderZoom
    canvas.height = compositeBoardHeight * renderZoom

    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // 1. Checkerboard Background
    const tileSize = 16
    for (let y = 0; y < canvas.height; y += tileSize) {
      for (let x = 0; x < canvas.width; x += tileSize) {
        ctx.fillStyle = (x / tileSize + y / tileSize) % 2 === 0 ? '#181a20' : '#22252e'
        ctx.fillRect(x, y, tileSize, tileSize)
      }
    }

    // 2. 32px Grid Lines
    if (snapToGrid) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'
      ctx.lineWidth = 1
      const gridPx = 32 * renderZoom
      for (let x = 0; x <= canvas.width; x += gridPx) {
        ctx.beginPath()
        ctx.moveTo(x + 0.5, 0)
        ctx.lineTo(x + 0.5, canvas.height)
        ctx.stroke()
      }
      for (let y = 0; y <= canvas.height; y += gridPx) {
        ctx.beginPath()
        ctx.moveTo(0, y + 0.5)
        ctx.lineTo(canvas.width, y + 0.5)
        ctx.stroke()
      }
    }

    // 3. Draw all composite layers in bottom-to-top order
    compositeLayers.forEach((layer) => {
      const img = cachedLayerImages[layer.id]
      if (!img || !img.complete) return

      ctx.save()
      ctx.globalAlpha = layer.opacity ?? 1

      const drawX = layer.x * renderZoom
      const drawY = layer.y * renderZoom
      const drawW = layer.width * renderZoom
      const drawH = layer.height * renderZoom

      if (layer.flipH) {
        ctx.translate(drawX + drawW, drawY)
        ctx.scale(-1, 1)
        ctx.drawImage(img, 0, 0, drawW, drawH)
      } else {
        ctx.drawImage(img, drawX, drawY, drawW, drawH)
      }

      // Draw Selected Layer Outline (when moving)
      if (composeTool === 'move' && layer.id === selectedLayerId) {
        ctx.strokeStyle = '#38bdf8'
        ctx.lineWidth = 2
        ctx.setLineDash([4, 4])
        ctx.strokeRect(drawX + 0.5, drawY + 0.5, drawW - 1, drawH - 1)
        ctx.setLineDash([])
      }

      ctx.restore()
    })

    // 4. Draw Red Collision Blocks Overlay directly ON canvas!
    if (showCollisionOverlay && collisionGrid && collisionGrid.length > 0) {
      const tilePx = 32 * renderZoom
      for (let r = 0; r < tileHeight; r++) {
        for (let c = 0; c < tileWidth; c++) {
          if (collisionGrid[r]?.[c]) {
            const bx = c * tilePx
            const by = r * tilePx

            // Subtle red semi-transparent fill
            ctx.fillStyle = 'rgba(239, 68, 68, 0.25)'
            ctx.fillRect(bx, by, tilePx, tilePx)

            // Crisp red solid border
            ctx.strokeStyle = '#ef4444'
            ctx.lineWidth = 2
            ctx.strokeRect(bx + 1, by + 1, tilePx - 2, tilePx - 2)
          }
        }
      }
    }
  }, [
    compositeLayers,
    selectedLayerId,
    compositeBoardWidth,
    compositeBoardHeight,
    snapToGrid,
    cachedLayerImages,
    studioMode,
    isCustomModalOpen,
    showCollisionOverlay,
    collisionGrid,
    composeTool,
    tileWidth,
    tileHeight,
  ])

  // Update Animation Preview Canvas
  useEffect(() => {
    const animCanvas = animCanvasRef.current
    if (!animCanvas) return
    const ctx = animCanvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, animCanvas.width, animCanvas.height)

    // Draw checkerboard
    const tileSize = 8
    for (let y = 0; y < animCanvas.height; y += tileSize) {
      for (let x = 0; x < animCanvas.width; x += tileSize) {
        ctx.fillStyle = (x / tileSize + y / tileSize) % 2 === 0 ? '#1e2029' : '#2b2d38'
        ctx.fillRect(x, y, tileSize, tileSize)
      }
    }

    const currentFrameData = frames[currentPreviewFrameIdx] || frames[0]
    if (!currentFrameData) return

    const img = new Image()
    img.src = currentFrameData
    img.onload = () => {
      ctx.imageSmoothingEnabled = false
      const maxDim = Math.max(img.width, img.height)
      const scale = (animCanvas.width - 16) / maxDim
      const drawW = img.width * scale
      const drawH = img.height * scale
      const offX = (animCanvas.width - drawW) / 2
      const offY = (animCanvas.height - drawH) / 2
      ctx.drawImage(img, offX, offY, drawW, drawH)
    }
  }, [frames, currentPreviewFrameIdx])

  // Floor 3x3 Tiling Seamless Preview
  useEffect(() => {
    if (elementType !== 'floor') return
    const canvas = floorTilingCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const currentFrameData = frames[currentPreviewFrameIdx] || frames[0] || compositeLayers[0]?.dataUrl
    if (!currentFrameData) {
      ctx.fillStyle = '#1e2029'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      return
    }

    const img = new Image()
    img.src = currentFrameData
    img.onload = () => {
      ctx.imageSmoothingEnabled = false
      const tileSize = 32
      const cols = Math.ceil(canvas.width / tileSize)
      const rows = Math.ceil(canvas.height / tileSize)

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          ctx.drawImage(img, c * tileSize, r * tileSize, tileSize, tileSize)
        }
      }

      // Subtle grid lines to demonstrate seamless connection
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'
      ctx.lineWidth = 1
      for (let x = 0; x <= canvas.width; x += tileSize) {
        ctx.beginPath()
        ctx.moveTo(x + 0.5, 0)
        ctx.lineTo(x + 0.5, canvas.height)
        ctx.stroke()
      }
      for (let y = 0; y <= canvas.height; y += tileSize) {
        ctx.beginPath()
        ctx.moveTo(0, y + 0.5)
        ctx.lineTo(canvas.width, y + 0.5)
        ctx.stroke()
      }
    }
  }, [elementType, frames, currentPreviewFrameIdx, compositeLayers])

  // Wall Room Mockup Live Preview
  useEffect(() => {
    if (elementType !== 'wall') return
    const canvas = wallMockupCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const currentFrameData = frames[currentPreviewFrameIdx] || frames[0] || compositeLayers[0]?.dataUrl

    // Background room floor
    ctx.fillStyle = '#1e293b'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    if (!currentFrameData) return

    const img = new Image()
    img.src = currentFrameData
    img.onload = () => {
      ctx.imageSmoothingEnabled = false
      const w = canvas.width
      const h = canvas.height
      const backWallH = 40
      const frontWallH = 28
      const frontWallY = h - frontWallH
      const doorW = 40
      const doorStartX = (w - doorW) / 2
      const doorEndX = doorStartX + doorW

      // 1. Back Wall Pattern
      const ptrn = ctx.createPattern(img, 'repeat')
      if (ptrn) {
        ctx.fillStyle = ptrn
        ctx.fillRect(8, 8, w - 16, backWallH)
      } else {
        ctx.drawImage(img, 8, 8, w - 16, backWallH)
      }

      // Back wall top trim & baseboard
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(8, 8, w - 16, 2)
      ctx.fillRect(8, 8, 2, backWallH)
      ctx.fillRect(w - 10, 8, 2, backWallH)
      ctx.fillStyle = '#deb887'
      ctx.fillRect(10, 8 + backWallH - 3, w - 20, 3)

      // 2. Side Partitions
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(8, 8 + backWallH, 2, frontWallY - (8 + backWallH))
      ctx.fillRect(w - 10, 8 + backWallH, 2, frontWallY - (8 + backWallH))

      // 3. Front Wall Blocks
      const leftW = doorStartX - 8
      if (leftW > 0) {
        if (ptrn) {
          ctx.fillStyle = ptrn
          ctx.fillRect(8, frontWallY, leftW, frontWallH)
        } else {
          ctx.drawImage(img, 8, frontWallY, leftW, frontWallH)
        }
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(8, frontWallY, leftW, 3)
        ctx.fillRect(8, frontWallY, 2, frontWallH)
        ctx.fillRect(doorStartX - 2, frontWallY, 2, frontWallH)
      }
      const rightW = w - 8 - doorEndX
      if (rightW > 0) {
        if (ptrn) {
          ctx.fillStyle = ptrn
          ctx.fillRect(doorEndX, frontWallY, rightW, frontWallH)
        } else {
          ctx.drawImage(img, doorEndX, frontWallY, rightW, frontWallH)
        }
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(doorEndX, frontWallY, rightW, 3)
        ctx.fillRect(doorEndX, frontWallY, 2, frontWallH)
        ctx.fillRect(w - 10, frontWallY, 2, frontWallH)
      }
    }
  }, [elementType, frames, currentPreviewFrameIdx, compositeLayers])

  const loadPresetImage = (url: string) => {
    const img = new Image()
    img.src = url
    img.onload = () => {
      setSourceImage(img)
      setSourceImageSrc(url)
      setSelection({ x: 384, y: 0, w: 128, h: 192 }) // default to conical forge
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string
      const img = new Image()
      img.src = dataUrl
      img.onload = () => {
        setSourceImage(img)
        setSourceImageSrc(dataUrl)
        setSelection({ x: 0, y: 0, w: Math.min(64, img.naturalWidth), h: Math.min(64, img.naturalHeight) })
      }
    }
    reader.readAsDataURL(file)
  }

  // Handle Eyedropper click on Source Canvas
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isEyedropperActive || !sourceImage || !mainCanvasRef.current) return
    const rect = mainCanvasRef.current.getBoundingClientRect()
    const clickX = Math.floor((e.clientX - rect.left) / zoom)
    const clickY = Math.floor((e.clientY - rect.top) / zoom)

    // Read pixel from source image
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = 1
    tempCanvas.height = 1
    const ctx = tempCanvas.getContext('2d')
    if (ctx) {
      ctx.drawImage(sourceImage, clickX, clickY, 1, 1, 0, 0, 1, 1)
      const pixel = ctx.getImageData(0, 0, 1, 1).data
      setTargetColor({ r: pixel[0], g: pixel[1], b: pixel[2] })
      setIsEyedropperActive(false)
    }
  }

  // Handle Drag Selection on Source Canvas
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isEyedropperActive || !mainCanvasRef.current) return
    const rect = mainCanvasRef.current.getBoundingClientRect()
    let rawX = (e.clientX - rect.left) / zoom
    let rawY = (e.clientY - rect.top) / zoom

    if (snapToGrid) {
      rawX = Math.floor(rawX / 32) * 32
      rawY = Math.floor(rawY / 32) * 32
    }

    setIsDraggingSelection(true)
    setDragSelectionStart({ x: rawX, y: rawY })
    setSelection({ x: rawX, y: rawY, w: 32, h: 32 })
  }

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingSelection || !mainCanvasRef.current) return
    const rect = mainCanvasRef.current.getBoundingClientRect()
    let currentX = (e.clientX - rect.left) / zoom
    let currentY = (e.clientY - rect.top) / zoom

    if (snapToGrid) {
      currentX = Math.round(currentX / 32) * 32
      currentY = Math.round(currentY / 32) * 32
    }

    const minX = Math.min(dragSelectionStart.x, currentX)
    const minY = Math.min(dragSelectionStart.y, currentY)
    const width = Math.max(32, Math.abs(currentX - dragSelectionStart.x))
    const height = Math.max(32, Math.abs(currentY - dragSelectionStart.y))

    setSelection({ x: minX, y: minY, w: width, h: height })
  }

  const handleCanvasMouseUp = () => {
    setIsDraggingSelection(false)
  }

  // --- COMPOSITION BOARD MOUSE HANDLERS (Layer Dragging or Direct Collision Painting) ---
  const handleComposeCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!composeCanvasRef.current) return
    const rect = composeCanvasRef.current.getBoundingClientRect()
    const clickX = Math.floor((e.clientX - rect.left) / 2) // renderZoom = 2
    const clickY = Math.floor((e.clientY - rect.top) / 2)

    // DIRECT COLLISION PAINTING ON CANVAS
    if (composeTool === 'collision') {
      const tileCol = Math.floor(clickX / 32)
      const tileRow = Math.floor(clickY / 32)

      if (tileRow >= 0 && tileRow < tileHeight && tileCol >= 0 && tileCol < tileWidth) {
        const currentValue = collisionGrid[tileRow]?.[tileCol] ?? false
        const nextValue = !currentValue
        setCollisionPaintValue(nextValue)
        setIsPaintingCollision(true)
        setCollisionGrid((prev) =>
          prev.map((row, r) =>
            row.map((val, c) => (r === tileRow && c === tileCol ? nextValue : val))
          )
        )
      }
      return
    }

    // 'MOVE' TOOL: Check hit on layers from top to bottom
    for (let i = compositeLayers.length - 1; i >= 0; i--) {
      const layer = compositeLayers[i]
      if (
        clickX >= layer.x &&
        clickX <= layer.x + layer.width &&
        clickY >= layer.y &&
        clickY <= layer.y + layer.height
      ) {
        setSelectedLayerId(layer.id)
        setIsDraggingLayer(true)
        setDragLayerStart({
          mouseX: clickX,
          mouseY: clickY,
          layerX: layer.x,
          layerY: layer.y,
        })
        return
      }
    }

    setSelectedLayerId(null)
  }

  const handleComposeCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!composeCanvasRef.current) return
    const rect = composeCanvasRef.current.getBoundingClientRect()
    const currentX = Math.floor((e.clientX - rect.left) / 2)
    const currentY = Math.floor((e.clientY - rect.top) / 2)

    // DIRECT COLLISION DRAG PAINTING
    if (composeTool === 'collision') {
      if (!isPaintingCollision) return
      const tileCol = Math.floor(currentX / 32)
      const tileRow = Math.floor(currentY / 32)

      if (tileRow >= 0 && tileRow < tileHeight && tileCol >= 0 && tileCol < tileWidth) {
        setCollisionGrid((prev) =>
          prev.map((row, r) =>
            row.map((val, c) => (r === tileRow && c === tileCol ? collisionPaintValue : val))
          )
        )
      }
      return
    }

    if (!isDraggingLayer || !selectedLayerId) return

    const deltaX = currentX - dragLayerStart.mouseX
    const deltaY = currentY - dragLayerStart.mouseY

    let newX = dragLayerStart.layerX + deltaX
    let newY = dragLayerStart.layerY + deltaY

    if (snapToGrid) {
      newX = Math.round(newX / 8) * 8
      newY = Math.round(newY / 8) * 8
    }

    setCompositeLayers((prev) =>
      prev.map((l) => (l.id === selectedLayerId ? { ...l, x: newX, y: newY } : l))
    )
  }

  const handleComposeCanvasMouseUp = () => {
    setIsDraggingLayer(false)
    setIsPaintingCollision(false)
  }

  // --- ACTIONS: CROPPING & PERSISTING PIECES ---

  // Crop current selection and save into croppedClips library
  const handleSaveCurrentCropToLibrary = () => {
    const processed = getProcessedSelectionCanvas()
    if (!processed) return null

    const dataUrl = processed.toDataURL('image/png')
    const clipId = `clip_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
    const clipName = `Peça ${croppedClips.length + 1} (${processed.width}x${processed.height}px)`

    const newClip: CroppedClip = {
      id: clipId,
      name: clipName,
      dataUrl,
      width: processed.width,
      height: processed.height,
    }

    setCroppedClips((prev) => [...prev, newClip])
    return newClip
  }

  // Place a cropped clip onto the composition board as a new layer
  const handleAddClipToCompositionBoard = (clip: CroppedClip) => {
    const newLayerId = `layer_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`

    const newLayer: CompositeLayer = {
      id: newLayerId,
      clipId: clip.id,
      name: clip.name,
      dataUrl: clip.dataUrl,
      x: Math.max(0, Math.floor((compositeBoardWidth - clip.width) / 2)),
      y: Math.max(0, Math.floor((compositeBoardHeight - clip.height) / 2)),
      width: clip.width,
      height: clip.height,
      flipH: false,
      opacity: 1,
    }

    setCompositeLayers((prev) => [...prev, newLayer])
    setSelectedLayerId(newLayerId)
  }

  // Send current cropped selection to the Composition Board (saves in library & adds to board)
  const handleSendSelectionToCompositeBoard = () => {
    const clip = handleSaveCurrentCropToLibrary()
    if (!clip) return
    handleAddClipToCompositionBoard(clip)
    setStudioMode('compose') // Switch to composite board view
  }

  // Add current selection as a single frame directly
  // Add current selection as a single frame directly
  const handleAddDirectCropFrame = () => {
    const processed = getProcessedSelectionCanvas()
    if (!processed) return
    const dataUrl = processed.toDataURL('image/png')
    const clipId = `clip_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
    const singleLayer: CompositeLayer = {
      id: `layer_${Date.now()}`,
      clipId,
      name: `Recorte Direto (${processed.width}x${processed.height}px)`,
      dataUrl,
      x: Math.max(0, Math.floor((compositeBoardWidth - processed.width) / 2)),
      y: Math.max(0, Math.floor((compositeBoardHeight - processed.height) / 2)),
      width: processed.width,
      height: processed.height,
      flipH: false,
      opacity: 1,
    }
    setFrames((prev) => [...prev, dataUrl])
    setFrameLayerStates((prev) => [...prev, [singleLayer]])
    setSelectedFrameIdx(frames.length)
  }

  // Bake all layers on the composition board into a single PNG frame (while preserving individual layers!)
  const handleBakeCompositionToFrame = () => {
    if (compositeLayers.length === 0) {
      alert('Adicione pelo menos uma camada na mesa de composição antes de mesclar.')
      return
    }

    const offscreen = document.createElement('canvas')
    offscreen.width = compositeBoardWidth
    offscreen.height = compositeBoardHeight
    const ctx = offscreen.getContext('2d')
    if (!ctx) return

    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, offscreen.width, offscreen.height)

    // Render layers in order (clean artwork, without collision red overlay)
    compositeLayers.forEach((layer) => {
      const img = cachedLayerImages[layer.id]
      if (!img) return

      ctx.save()
      ctx.globalAlpha = layer.opacity ?? 1

      if (layer.flipH) {
        ctx.translate(layer.x + layer.width, layer.y)
        ctx.scale(-1, 1)
        ctx.drawImage(img, 0, 0, layer.width, layer.height)
      } else {
        ctx.drawImage(img, layer.x, layer.y, layer.width, layer.height)
      }

      ctx.restore()
    })

    const dataUrl = offscreen.toDataURL('image/png')
    const layersClone = JSON.parse(JSON.stringify(compositeLayers))

    setFrames((prev) => [...prev, dataUrl])
    setFrameLayerStates((prev) => [...prev, layersClone])
    setSelectedFrameIdx(frames.length)
  }

  // Load clicked frame directly into the composition board for editing with ALL ITS SEPARATE LAYERS!
  const handleSelectAndEditFrame = (idx: number) => {
    setSelectedFrameIdx(idx)
    setCurrentPreviewFrameIdx(idx)

    const savedLayers = frameLayerStates[idx]
    if (savedLayers && savedLayers.length > 0) {
      // Restore ALL separate layers!
      setCompositeLayers(JSON.parse(JSON.stringify(savedLayers)))
      setSelectedLayerId(savedLayers[0]?.id || null)
    } else {
      // Fallback if legacy frame
      const frameData = frames[idx]
      if (frameData) {
        const editLayer: CompositeLayer = {
          id: `frame_layer_${idx}_${Date.now()}`,
          clipId: `clip_frame_${idx}`,
          name: `Base do Quadro ${idx + 1}`,
          dataUrl: frameData,
          x: 0,
          y: 0,
          width: compositeBoardWidth,
          height: compositeBoardHeight,
          flipH: false,
          opacity: 1,
        }
        setCompositeLayers([editLayer])
        setSelectedLayerId(editLayer.id)
      }
    }
    setStudioMode('compose')
  }

  // Overwrite the currently selected frame with the merged composition AND update its separate layers
  const handleUpdateCurrentFrame = () => {
    if (compositeLayers.length === 0) {
      alert('Adicione ou posicione camadas na mesa de composição antes de atualizar o quadro.')
      return
    }
    if (selectedFrameIdx === null || selectedFrameIdx >= frames.length) {
      handleBakeCompositionToFrame()
      return
    }

    const offscreen = document.createElement('canvas')
    offscreen.width = compositeBoardWidth
    offscreen.height = compositeBoardHeight
    const ctx = offscreen.getContext('2d')
    if (!ctx) return

    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, offscreen.width, offscreen.height)

    compositeLayers.forEach((layer) => {
      const img = cachedLayerImages[layer.id]
      if (!img) return

      ctx.save()
      ctx.globalAlpha = layer.opacity ?? 1

      if (layer.flipH) {
        ctx.translate(layer.x + layer.width, layer.y)
        ctx.scale(-1, 1)
        ctx.drawImage(img, 0, 0, layer.width, layer.height)
      } else {
        ctx.drawImage(img, layer.x, layer.y, layer.width, layer.height)
      }

      ctx.restore()
    })

    const dataUrl = offscreen.toDataURL('image/png')
    const layersClone = JSON.parse(JSON.stringify(compositeLayers))

    setFrames((prev) => prev.map((f, i) => (i === selectedFrameIdx ? dataUrl : f)))
    setFrameLayerStates((prev) => {
      const next = [...prev]
      next[selectedFrameIdx] = layersClone
      return next
    })
  }

  // Duplicate a frame in the list
  const handleDuplicateFrame = (idx: number) => {
    const target = frames[idx]
    if (!target) return
    setFrames((prev) => {
      const clone = [...prev]
      clone.splice(idx + 1, 0, target)
      return clone
    })
    setFrameLayerStates((prev) => {
      const clone = [...prev]
      clone.splice(idx + 1, 0, JSON.parse(JSON.stringify(prev[idx] || [])))
      return clone
    })
    setSelectedFrameIdx(idx + 1)
  }

  // Reorder frames
  const handleMoveFrameLeft = (idx: number) => {
    if (idx <= 0) return
    setFrames((prev) => {
      const clone = [...prev]
      const temp = clone[idx]
      clone[idx] = clone[idx - 1]
      clone[idx - 1] = temp
      return clone
    })
    setFrameLayerStates((prev) => {
      const clone = [...prev]
      const temp = clone[idx]
      clone[idx] = clone[idx - 1]
      clone[idx - 1] = temp
      return clone
    })
    setSelectedFrameIdx(idx - 1)
  }

  const handleMoveFrameRight = (idx: number) => {
    if (idx >= frames.length - 1) return
    setFrames((prev) => {
      const clone = [...prev]
      const temp = clone[idx]
      clone[idx] = clone[idx + 1]
      clone[idx + 1] = temp
      return clone
    })
    setFrameLayerStates((prev) => {
      const clone = [...prev]
      const temp = clone[idx]
      clone[idx] = clone[idx + 1]
      clone[idx + 1] = temp
      return clone
    })
    setSelectedFrameIdx(idx + 1)
  }

  // Layer manipulation helpers
  const handleMoveLayerUp = (id: string) => {
    setCompositeLayers((prev) => {
      const idx = prev.findIndex((l) => l.id === id)
      if (idx >= prev.length - 1) return prev
      const clone = [...prev]
      const temp = clone[idx]
      clone[idx] = clone[idx + 1]
      clone[idx + 1] = temp
      return clone
    })
  }

  const handleMoveLayerDown = (id: string) => {
    setCompositeLayers((prev) => {
      const idx = prev.findIndex((l) => l.id === id)
      if (idx <= 0) return prev
      const clone = [...prev]
      const temp = clone[idx]
      clone[idx] = clone[idx - 1]
      clone[idx - 1] = temp
      return clone
    })
  }

  const handleDuplicateLayer = (id: string) => {
    const target = compositeLayers.find((l) => l.id === id)
    if (!target) return
    const clone: CompositeLayer = {
      ...target,
      id: `layer_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: `${target.name} (Cópia)`,
      x: target.x + 8,
      y: target.y + 8,
    }
    setCompositeLayers((prev) => [...prev, clone])
    setSelectedLayerId(clone.id)
  }

  const handleDeleteLayer = (id: string) => {
    setCompositeLayers((prev) => prev.filter((l) => l.id !== id))
    if (selectedLayerId === id) setSelectedLayerId(null)
  }

  const handleDeleteClip = (id: string) => {
    setCroppedClips((prev) => prev.filter((c) => c.id !== id))
  }

  const handleClearCompositionBoard = () => {
    if (window.confirm('Deseja limpar todas as camadas da mesa de montagem?')) {
      setCompositeLayers([])
      setSelectedLayerId(null)
    }
  }

  const handleRemoveFrame = (idx: number) => {
    setFrames((prev) => prev.filter((_, i) => i !== idx))
    setFrameLayerStates((prev) => prev.filter((_, i) => i !== idx))
    if (selectedFrameIdx === idx) {
      setSelectedFrameIdx(null)
    } else if (selectedFrameIdx !== null && selectedFrameIdx > idx) {
      setSelectedFrameIdx(selectedFrameIdx - 1)
    }
  }

  const handleClearFrames = () => {
    setFrames([])
    setFrameLayerStates([])
    setSelectedFrameIdx(null)
  }

  // Save the custom asset into the store
  const handleSaveAsset = () => {
    let finalFrames = [...frames]
    let finalFrameLayers = [...frameLayerStates]

    // If user didn't explicitly add frames to list, bake current view
    if (finalFrames.length === 0) {
      if (compositeLayers.length > 0) {
        const offscreen = document.createElement('canvas')
        offscreen.width = compositeBoardWidth
        offscreen.height = compositeBoardHeight
        const ctx = offscreen.getContext('2d')
        if (ctx) {
          ctx.imageSmoothingEnabled = false
          compositeLayers.forEach((layer) => {
            const img = cachedLayerImages[layer.id]
            if (!img) return
            ctx.save()
            ctx.globalAlpha = layer.opacity ?? 1
            if (layer.flipH) {
              ctx.translate(layer.x + layer.width, layer.y)
              ctx.scale(-1, 1)
              ctx.drawImage(img, 0, 0, layer.width, layer.height)
            } else {
              ctx.drawImage(img, layer.x, layer.y, layer.width, layer.height)
            }
            ctx.restore()
          })
          const baked = offscreen.toDataURL('image/png')
          finalFrames = [baked]
          finalFrameLayers = [JSON.parse(JSON.stringify(compositeLayers))]
        }
      } else {
        const processed = getProcessedSelectionCanvas()
        if (!processed) {
          alert('Selecione uma área válida da imagem ou adicione camadas na mesa antes de salvar.')
          return
        }
        finalFrames = [processed.toDataURL('image/png')]
        finalFrameLayers = [
          [
            {
              id: `layer_${Date.now()}`,
              clipId: `clip_${Date.now()}`,
              name: elementName.trim() || 'Camada Base',
              dataUrl: finalFrames[0],
              x: 0,
              y: 0,
              width: tileWidth * 32,
              height: tileHeight * 32,
              flipH: false,
              opacity: 1,
            },
          ],
        ]
      }
    }

    if (finalFrameLayers.length === 0 && compositeLayers.length > 0) {
      finalFrameLayers = [JSON.parse(JSON.stringify(compositeLayers))]
    }

    let finalCategory = category.trim() || 'Geral'
    if (isCreatingNewCategory && newCategoryName.trim()) {
      finalCategory = newCategoryName.trim()
      addCategory(finalCategory)
    }

    const isFloor = elementType === 'floor'
    const isWall = elementType === 'wall'
    const finalIsObstacle = isFloor ? false : isWall ? true : collisionGrid.some((row) => row.some((col) => col === true))
    const finalCollisionGrid = isFloor ? [] : collisionGrid

    if (editingAssetId) {
      updateCustomAsset(editingAssetId, {
        name: elementName.trim() || 'Elemento Customizado',
        type: elementType,
        category: finalCategory,
        width: tileWidth,
        height: tileHeight,
        isObstacle: finalIsObstacle,
        collisionGrid: finalCollisionGrid,
        frames: finalFrames,
        frameLayers: finalFrameLayers,
        frameRateMs,
      })

      if (elementType === 'furniture') {
        setSelectedFurnitureDefId(editingAssetId)
        setActiveTool('place_furniture')
      } else if (elementType === 'floor') {
        setSelectedFloor(editingAssetId as any)
        setActiveTool('paint_floor')
      } else if (elementType === 'wall') {
        setSelectedWall(editingAssetId as any)
        setActiveTool('paint_wall')
      }

      setCustomModalOpen(false)
      return
    }

    const id = `custom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`

    const newAsset: CustomAsset = {
      id,
      name: elementName.trim() || 'Elemento Customizado',
      type: elementType,
      category: finalCategory,
      width: tileWidth,
      height: tileHeight,
      isObstacle: finalIsObstacle,
      collisionGrid: finalCollisionGrid,
      frames: finalFrames,
      frameLayers: finalFrameLayers,
      frameRateMs,
      iconColor: isFloor ? '#20c997' : isWall ? '#f59f00' : '#e03131',
      createdAt: Date.now(),
    }

    addCustomAsset(newAsset)

    // Select the newly created element in the editor
    if (elementType === 'furniture') {
      setSelectedFurnitureDefId(id)
      setActiveTool('place_furniture')
    } else if (elementType === 'floor') {
      setSelectedFloor(id as any)
      setActiveTool('paint_floor')
    } else if (elementType === 'wall') {
      setSelectedWall(id as any)
      setActiveTool('paint_wall')
    }

    setCustomModalOpen(false)
  }

  if (!isCustomModalOpen) return null

  const selectedLayer = compositeLayers.find((l) => l.id === selectedLayerId)
  const solidBlocksCount = collisionGrid.flat().filter(Boolean).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 sm:p-6 overflow-hidden">
      <div className="relative w-full max-w-6xl h-[92vh] bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-800 bg-slate-950/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 via-rose-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-rose-900/30">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">
                  {editingAssetId ? `✏️ Editar: ${elementName}` : 'Estúdio de Sprites & Composição'}
                </h2>
                <div className="flex items-center bg-slate-800/80 p-0.5 rounded-lg border border-slate-700">
                  <button
                    onClick={() => setStudioMode('crop')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all ${
                      studioMode === 'crop'
                        ? 'bg-blue-600 text-white shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Scissors className="w-3.5 h-3.5" />
                    1. Recorte de Sprites (Imagem Original)
                  </button>
                  <button
                    onClick={() => setStudioMode('compose')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all ${
                      studioMode === 'compose'
                        ? 'bg-gradient-to-r from-amber-600 to-rose-600 text-white shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    2. Compor Quadros ({compositeLayers.length} Camadas)
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-400">
                {studioMode === 'crop'
                  ? 'Recorte elementos na imagem original com transparência e salve-os para compor quadros'
                  : 'Combine as peças recortadas e marque os blocos de colisão vermelhos direto na tela'}
              </p>
            </div>
          </div>

          <button
            onClick={() => setCustomModalOpen(false)}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Studio Body: Split View */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden">
          {/* Left / Center Area (col-span-8) */}
          <div className="lg:col-span-8 flex flex-col border-r border-slate-800 bg-slate-950/40 overflow-hidden">
            {/* Toolbar for Mode A: Crop Mode (Original Image) */}
            {studioMode === 'crop' && (
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 text-xs gap-2 shrink-0 flex-wrap">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium shadow transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Carregar Imagem
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>

                {/* Zoom & Grid Controls */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSnapToGrid(!snapToGrid)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                      snapToGrid
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    <Grid className="w-3.5 h-3.5" />
                    Grade 32px
                  </button>

                  <div className="flex items-center bg-slate-800 rounded-lg border border-slate-700 p-0.5">
                    <button
                      onClick={() => setZoom((z) => Math.max(0.5, z <= 1 ? z - 0.25 : z - 1))}
                      className="p-1 text-slate-400 hover:text-white rounded"
                      title="Diminuir Zoom"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-2 text-xs font-mono font-bold text-slate-300">{zoom}x</span>
                    <button
                      onClick={() => setZoom((z) => Math.min(4, z < 1 ? z + 0.25 : z + 1))}
                      className="p-1 text-slate-400 hover:text-white rounded"
                      title="Aumentar Zoom"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    {[0.5, 1, 2].map((z) => (
                      <button
                        key={z}
                        onClick={() => setZoom(z)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border transition-colors ${
                          zoom === z
                            ? 'bg-blue-600 text-white border-blue-500'
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                        }`}
                      >
                        {z}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Toolbar for Mode B: Composition Board Mode */}
            {studioMode === 'compose' && (
              <div className="flex items-center justify-between px-4 py-2 bg-slate-900/90 border-b border-slate-800 text-xs gap-2 shrink-0 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* --- 1. MOBÍLIA CONTROLS (Full collision & multi-tile) --- */}
                  {elementType === 'furniture' && (
                    <>
                      {/* Interactive Mouse Tool Selector for Canvas */}
                      <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-700">
                        <button
                          type="button"
                          onClick={() => setComposeTool('move')}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold transition-all ${
                            composeTool === 'move'
                              ? 'bg-blue-600 text-white shadow'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                          title="Mover e posicionar peças com o mouse"
                        >
                          <Move className="w-3.5 h-3.5" />
                          Mover Peças
                        </button>
                        <button
                          type="button"
                          onClick={() => setComposeTool('collision')}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold transition-all ${
                            composeTool === 'collision'
                              ? 'bg-rose-600 text-white shadow ring-2 ring-rose-500/40'
                              : 'text-rose-400 hover:bg-rose-500/10'
                          }`}
                          title="Clique na tela para marcar/desmarcar blocos de colisão em vermelho"
                        >
                          <Shield className="w-3.5 h-3.5 text-rose-300" />
                          Pintar Colisão (Vermelho)
                        </button>
                      </div>

                      {/* Toggle Collision Visibility */}
                      <button
                        type="button"
                        onClick={() => setShowCollisionOverlay(!showCollisionOverlay)}
                        className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-medium transition-colors ${
                          showCollisionOverlay
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            : 'bg-slate-800 text-slate-500 border-slate-700'
                        }`}
                        title="Exibir ou ocultar a marcação vermelha de colisão sobre a imagem"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        {showCollisionOverlay ? 'Colisão Visível' : 'Colisão Oculta'}
                      </button>

                      {/* Custom Tile Size Steppers */}
                      <span className="text-slate-500">|</span>
                      <div className="flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-700">
                        <span className="text-[11px] text-slate-400 font-medium mr-1">Tiles:</span>

                        {/* Width in Tiles */}
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-400 font-mono">L:</span>
                          <button
                            type="button"
                            onClick={() => setBoardSizeInTiles(tileWidth - 1, tileHeight)}
                            className="w-4 h-4 flex items-center justify-center rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold"
                          >
                            -
                          </button>
                          <span className="text-xs font-bold text-amber-300 px-1">{tileWidth}</span>
                          <button
                            type="button"
                            onClick={() => setBoardSizeInTiles(tileWidth + 1, tileHeight)}
                            className="w-4 h-4 flex items-center justify-center rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold"
                          >
                            +
                          </button>
                        </div>

                        <span className="text-slate-600 text-xs mx-0.5">×</span>

                        {/* Height in Tiles */}
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-400 font-mono">A:</span>
                          <button
                            type="button"
                            onClick={() => setBoardSizeInTiles(tileWidth, tileHeight - 1)}
                            className="w-4 h-4 flex items-center justify-center rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold"
                          >
                            -
                          </button>
                          <span className="text-xs font-bold text-amber-300 px-1">{tileHeight}</span>
                          <button
                            type="button"
                            onClick={() => setBoardSizeInTiles(tileWidth, tileHeight + 1)}
                            className="w-4 h-4 flex items-center justify-center rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold"
                          >
                            +
                          </button>
                        </div>

                        <span className="text-[10px] text-slate-400 font-mono pl-1">
                          ({tileWidth * 32}x{tileHeight * 32}px)
                        </span>
                      </div>

                      {/* Collision Presets */}
                      <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-700">
                        <button
                          type="button"
                          onClick={() => handleSetAllCollision(true)}
                          className="px-1.5 py-0.5 rounded text-[10px] text-rose-300 hover:bg-rose-500/20 font-medium"
                          title="Bloquear toda a área"
                        >
                          Bloquear Tudo
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetAllCollision(false)}
                          className="px-1.5 py-0.5 rounded text-[10px] text-emerald-300 hover:bg-emerald-500/20 font-medium"
                          title="Liberar toda a área"
                        >
                          Liberar Tudo
                        </button>
                        <button
                          type="button"
                          onClick={handleSetBottomHalfCollision}
                          className="px-1.5 py-0.5 rounded text-[10px] text-amber-300 hover:bg-amber-500/20 font-medium"
                          title="Bloquear apenas a base inferior"
                        >
                          Apenas Base
                        </button>
                      </div>
                    </>
                  )}

                  {/* --- 2. PISO CONTROLS (Seamless walkable floor texture) --- */}
                  {elementType === 'floor' && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5">
                        <LayoutGrid className="w-3.5 h-3.5" />
                        Textura de Piso (100% Transitável)
                      </span>

                      <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-700 gap-1">
                        <span className="text-[10px] text-slate-400 px-1 font-semibold">Tamanho:</span>
                        <button
                          type="button"
                          onClick={() => setBoardSizeInTiles(1, 1)}
                          className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
                            tileWidth === 1 && tileHeight === 1
                              ? 'bg-emerald-600 text-white shadow'
                              : 'text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          1x1 Tile (32x32px)
                        </button>
                        <button
                          type="button"
                          onClick={() => setBoardSizeInTiles(2, 2)}
                          className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
                            tileWidth === 2 && tileHeight === 2
                              ? 'bg-emerald-600 text-white shadow'
                              : 'text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          2x2 Tiles (64x64px)
                        </button>
                        <button
                          type="button"
                          onClick={() => setBoardSizeInTiles(3, 3)}
                          className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
                            tileWidth === 3 && tileHeight === 3
                              ? 'bg-emerald-600 text-white shadow'
                              : 'text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          3x3 Tiles (96x96px)
                        </button>
                      </div>
                    </div>
                  )}

                  {/* --- 3. PAREDE CONTROLS (Wall texture for zones) --- */}
                  {elementType === 'wall' && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5">
                        <Square className="w-3.5 h-3.5" />
                        Textura de Parede para Salas & Zonas
                      </span>

                      <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-700 gap-1">
                        <span className="text-[10px] text-slate-400 px-1 font-semibold">Tamanho:</span>
                        <button
                          type="button"
                          onClick={() => setBoardSizeInTiles(1, 1)}
                          className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
                            tileWidth === 1 && tileHeight === 1
                              ? 'bg-amber-600 text-white shadow'
                              : 'text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          1x1 Textura (32x32px)
                        </button>
                        <button
                          type="button"
                          onClick={() => setBoardSizeInTiles(2, 2)}
                          className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
                            tileWidth === 2 && tileHeight === 2
                              ? 'bg-amber-600 text-white shadow'
                              : 'text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          2x2 Padrão (64x64px)
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setStudioMode('crop')}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 border border-blue-500/40 text-xs font-bold transition-colors"
                  >
                    <Scissors className="w-3.5 h-3.5" />
                    + Recortar na Original
                  </button>

                  <button
                    onClick={handleClearCompositionBoard}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-300 border border-slate-700 text-xs transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Limpar Mesa
                  </button>
                </div>
              </div>
            )}

            {/* Main Canvas Scrollable Workspace */}
            <div className="flex-1 overflow-auto p-6 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] relative select-none">
              {/* Workspace 1: Original Spritesheet Image (Always mounted & intact) */}
              <div className={`w-full h-full ${studioMode === 'crop' ? 'block' : 'hidden'}`}>
                {sourceImage ? (
                  <div className="min-w-max min-h-max flex items-start justify-start p-4">
                    <div className="relative border-2 border-slate-700/80 shadow-2xl rounded-lg overflow-hidden bg-slate-900">
                      <canvas
                        ref={mainCanvasRef}
                        onMouseDown={handleCanvasMouseDown}
                        onMouseMove={handleCanvasMouseMove}
                        onMouseUp={handleCanvasMouseUp}
                        onClick={handleCanvasClick}
                        className={`block ${isEyedropperActive ? 'cursor-crosshair' : 'cursor-pointer'}`}
                        style={{ imageRendering: 'pixelated' }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-center text-slate-500 flex-col gap-3">
                    <Upload className="w-12 h-12 text-slate-600 animate-pulse" />
                    <p>Carregue uma imagem ou selecione o preset LPC Blacksmith para começar a recortar</p>
                  </div>
                )}
              </div>

              {/* Workspace 2: Composition Board (Always mounted & intact with direct collision painting) */}
              <div className={`w-full h-full flex-col items-center justify-center p-4 ${studioMode === 'compose' ? 'flex' : 'hidden'}`}>
                <div className="relative border-2 border-amber-500/50 shadow-2xl rounded-xl overflow-hidden bg-slate-950 p-1">
                  <canvas
                    ref={composeCanvasRef}
                    onMouseDown={handleComposeCanvasMouseDown}
                    onMouseMove={handleComposeCanvasMouseMove}
                    onMouseUp={handleComposeCanvasMouseUp}
                    className={`block ${composeTool === 'collision' ? 'cursor-crosshair' : 'cursor-move'}`}
                    style={{ imageRendering: 'pixelated' }}
                  />
                </div>
                <div className="mt-2.5 text-[11px] text-slate-300 flex items-center gap-2 bg-slate-900/90 px-3 py-1.5 rounded-full border border-slate-800 shadow">
                  {composeTool === 'collision' ? (
                    <>
                      <Shield className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                      <span>
                        <strong>Modo Pintar Colisão Ativo:</strong> Clique ou arraste sobre os blocos da imagem para marcar em vermelho (sólido).
                      </span>
                    </>
                  ) : (
                    <>
                      <Move className="w-3.5 h-3.5 text-amber-400" />
                      <span>
                        <strong>Modo Mover Peças:</strong> Clique e arraste qualquer peça para compor a imagem.
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Footer Coordinates & Quick Actions */}
            <div className="px-4 py-2 bg-slate-900/90 border-t border-slate-800 text-xs flex items-center justify-between text-slate-400 font-mono shrink-0">
              {studioMode === 'crop' ? (
                <>
                  <div>
                    Recorte Atual: X={selection.x}px, Y={selection.y}px | Dimensões: {selection.w}x{selection.h}px
                  </div>
                  <div className="text-amber-400 font-bold">
                    {croppedClips.length} Peça(s) Salva(s) para Composição
                  </div>
                </>
              ) : (
                <>
                  <div>
                    Mesa: {tileWidth}x{tileHeight} Tiles ({compositeBoardWidth}x{compositeBoardHeight}px)
                  </div>
                  <div className="text-rose-400 font-bold flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" />
                    {solidBlocksCount} Bloco(s) de Colisão Vermelho(s)
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right Sidebar: Controls, Library, Layers & Frames (col-span-4) */}
          <div className="lg:col-span-4 flex flex-col bg-slate-900/70 overflow-y-auto divide-y divide-slate-800 text-xs">
            {/* Mode A: Crop Mode Sidebar */}
            {studioMode === 'crop' ? (
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-200 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    Remoção de Fundo (Transparência)
                  </label>
                  <input
                    type="checkbox"
                    checked={enableBgRemoval}
                    onChange={(e) => setEnableBgRemoval(e.target.checked)}
                    className="w-4 h-4 accent-blue-500 rounded"
                  />
                </div>

                {enableBgRemoval && (
                  <div className="space-y-3 pt-1">
                    {/* Preset Colors */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] text-slate-400">Presets:</span>
                      <button
                        onClick={() => setTargetColor(PRESET_BG_COLORS.LPC_DARK)}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] border border-slate-700 text-slate-300"
                      >
                        ⚡ LPC Escuro
                      </button>
                      <button
                        onClick={() => setTargetColor(PRESET_BG_COLORS.PURE_BLACK)}
                        className="px-2 py-1 rounded bg-black text-white hover:bg-slate-950 text-[11px] border border-slate-700"
                      >
                        Preto
                      </button>
                      <button
                        onClick={() => setTargetColor(PRESET_BG_COLORS.PURE_WHITE)}
                        className="px-2 py-1 rounded bg-white text-slate-900 hover:bg-slate-100 text-[11px] font-bold"
                      >
                        Branco
                      </button>
                      <button
                        onClick={() => setIsEyedropperActive(!isEyedropperActive)}
                        className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] border font-medium ${
                          isEyedropperActive
                            ? 'bg-amber-500 text-slate-950 border-amber-400 animate-pulse'
                            : 'bg-slate-800 text-amber-300 border-slate-700 hover:bg-slate-700'
                        }`}
                      >
                        <Pipette className="w-3 h-3" />
                        Conta-Gotas
                      </button>
                    </div>

                    {/* Tolerance Slider */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-slate-400">
                        <span>Tolerância de Cor:</span>
                        <span className="font-mono text-amber-400 font-bold">{tolerance}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={tolerance}
                        onChange={(e) => setTolerance(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      />
                    </div>

                    {/* Clean white fringe checkbox */}
                    <label className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={removeWhiteFringe}
                        onChange={(e) => setRemoveWhiteFringe(e.target.checked)}
                        className="w-3.5 h-3.5 accent-blue-500 rounded"
                      />
                      Limpar bordas brancas e ruído de recorte
                    </label>
                  </div>
                )}

                {/* Single Frame Live Preview & Action Buttons */}
                <div className="flex items-center gap-3 pt-2">
                  <div className="w-20 h-20 rounded-xl border border-slate-700 bg-slate-950/80 p-1 flex items-center justify-center shadow-inner shrink-0">
                    <canvas ref={singlePreviewCanvasRef} width={128} height={128} className="w-full h-full rounded" />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <button
                      onClick={handleSendSelectionToCompositeBoard}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white font-bold shadow-md shadow-rose-950/40 transition-all text-xs"
                    >
                      <Layers className="w-4 h-4" />
                      Enviar para Compor Quadro
                    </button>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={handleSaveCurrentCropToLibrary}
                        className="flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-medium"
                        title="Salva esta peça na sua biblioteca de recortes sem sair da tela de recorte"
                      >
                        <Package className="w-3.5 h-3.5 text-amber-400" />
                        Salvar Peça
                      </button>
                      <button
                        onClick={handleAddDirectCropFrame}
                        className="flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-medium"
                        title="Adiciona a seleção atual diretamente como um quadro"
                      >
                        <Plus className="w-3.5 h-3.5 text-emerald-400" />
                        Quadro Direto
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Mode B: Composite Mode Sidebar (Library of Cropped Clips + Placed Layers Stack) */
              <div className="p-4 space-y-3">
                {/* 1. Cropped Pieces Library */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-200 flex items-center gap-1.5">
                      <Package className="w-4 h-4 text-amber-400" />
                      Peças Recortadas da Imagem ({croppedClips.length})
                    </label>
                    <button
                      onClick={() => setStudioMode('crop')}
                      className="text-[11px] text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
                    >
                      <Scissors className="w-3 h-3" />
                      + Recortar Mais
                    </button>
                  </div>

                  {croppedClips.length > 0 ? (
                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                      {croppedClips.map((clip) => (
                        <div
                          key={clip.id}
                          onClick={() => handleAddClipToCompositionBoard(clip)}
                          className="relative w-14 h-14 rounded-xl border border-slate-700 hover:border-amber-400 bg-slate-950 p-1 shrink-0 flex flex-col items-center justify-center cursor-pointer group shadow-sm transition-all"
                          title="Clique para adicionar esta peça na mesa de montagem"
                        >
                          <img src={clip.dataUrl} alt={clip.name} className="max-w-full max-h-8 object-contain" />
                          <span className="text-[8px] text-slate-400 truncate w-full text-center mt-0.5">
                            {clip.width}x{clip.height}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteClip(clip.id)
                            }}
                            className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-rose-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[10px]"
                            title="Remover peça da biblioteca"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-2.5 text-center text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800 text-[11px]">
                      Nenhuma peça guardada. Volte em <strong>Recorte</strong> para recortar partes da imagem original.
                    </div>
                  )}
                </div>

                {/* 2. Placed Layers on Board */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between gap-1.5 flex-wrap">
                    <label className="font-bold text-slate-200 flex items-center gap-1.5 text-[11px]">
                      <Layers className="w-4 h-4 text-emerald-400" />
                      Camadas ({compositeLayers.length})
                    </label>

                    <div className="flex items-center gap-1">
                      {selectedFrameIdx !== null && selectedFrameIdx < frames.length ? (
                        <>
                          <button
                            onClick={handleUpdateCurrentFrame}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white font-bold text-xs shadow-md transition-all"
                            title={`Sobrescreve o Quadro ${selectedFrameIdx + 1} com a imagem atual da mesa`}
                          >
                            <RefreshCw className="w-3 h-3" />
                            Atualizar Quadro {selectedFrameIdx + 1}
                          </button>

                          <button
                            onClick={handleBakeCompositionToFrame}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 text-[11px] font-medium"
                            title="Adiciona a mesa atual como um NOVO quadro na animação"
                          >
                            <Plus className="w-3 h-3" />
                            + Novo
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={handleBakeCompositionToFrame}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs shadow-md transition-all"
                        >
                          <Wand2 className="w-3.5 h-3.5" />
                          Mesclar e Criar Quadro
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Layer List */}
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {compositeLayers.length > 0 ? (
                      compositeLayers
                        .slice()
                        .reverse()
                        .map((layer) => {
                          const isSelected = selectedLayerId === layer.id
                          return (
                            <div
                              key={layer.id}
                              onClick={() => setSelectedLayerId(layer.id)}
                              className={`p-1.5 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-all ${
                                isSelected
                                  ? 'bg-amber-600/20 border-amber-500 ring-1 ring-amber-500/30'
                                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <img src={layer.dataUrl} alt="" className="w-7 h-7 rounded border border-slate-700 bg-slate-900 object-contain shrink-0" />
                                <div className="min-w-0">
                                  <div className="font-bold text-slate-200 truncate text-[10px]">{layer.name}</div>
                                  <div className="text-[9px] text-slate-400">
                                    Pos: ({layer.x}, {layer.y})
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => handleMoveLayerUp(layer.id)}
                                  className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
                                  title="Trazer para frente"
                                >
                                  <ArrowUp className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => handleMoveLayerDown(layer.id)}
                                  className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
                                  title="Enviar para trás"
                                >
                                  <ArrowDown className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => handleDuplicateLayer(layer.id)}
                                  className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
                                  title="Duplicar camada"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => handleDeleteLayer(layer.id)}
                                  className="p-1 rounded text-rose-400 hover:text-rose-300 hover:bg-rose-500/20"
                                  title="Excluir camada"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          )
                        })
                    ) : (
                      <div className="p-2.5 text-center text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800 text-[10px]">
                        Nenhuma peça na mesa. Clique em uma das peças recortadas acima para adicionar.
                      </div>
                    )}
                  </div>

                  {/* Selected Layer Controls (Flip, Opacity) */}
                  {selectedLayer && (
                    <div className="p-2 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] font-bold text-amber-400">
                        <span>Ajustes: {selectedLayer.name}</span>
                        <button
                          onClick={() =>
                            setCompositeLayers((prev) =>
                              prev.map((l) => (l.id === selectedLayer.id ? { ...l, flipH: !l.flipH } : l))
                            )
                          }
                          className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-bold ${
                            selectedLayer.flipH
                              ? 'bg-amber-600 text-white border-amber-500'
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                        >
                          <FlipHorizontal className="w-3 h-3" />
                          Espelhar ↔️
                        </button>
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex justify-between text-[9px] text-slate-400">
                          <span>Opacidade:</span>
                          <span className="font-mono text-amber-400 font-bold">
                            {Math.round((selectedLayer.opacity ?? 1) * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0.1}
                          max={1}
                          step={0.05}
                          value={selectedLayer.opacity ?? 1}
                          onChange={(e) =>
                            setCompositeLayers((prev) =>
                              prev.map((l) => (l.id === selectedLayer.id ? { ...l, opacity: Number(e.target.value) } : l))
                            )
                          }
                          className="w-full h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-amber-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Section 2: Animation Frames Manager */}
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="font-bold text-slate-200 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-blue-400" />
                    Quadros da Animação ({frames.length})
                  </label>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Clique em qualquer quadro para editá-lo na mesa de composição
                  </p>
                </div>

                {frames.length > 0 && (
                  <button
                    onClick={handleClearFrames}
                    className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Limpar
                  </button>
                )}
              </div>

              {/* Editing Banner indicator */}
              {selectedFrameIdx !== null && selectedFrameIdx < frames.length && (
                <div className="flex items-center justify-between bg-amber-500/15 border border-amber-500/40 rounded-xl px-2.5 py-1.5 text-[11px] text-amber-300">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Pencil className="w-3.5 h-3.5 text-amber-400" />
                    Editando <strong>Quadro {selectedFrameIdx + 1}</strong>
                  </span>
                  <button
                    onClick={() => setSelectedFrameIdx(null)}
                    className="text-[10px] text-slate-400 hover:text-white underline"
                  >
                    Desmarcar
                  </button>
                </div>
              )}

              {frames.length > 0 ? (
                <div className="space-y-2.5">
                  {/* Thumbnails list with click to edit */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5">
                    {frames.map((frameData, idx) => {
                      const isSelected = selectedFrameIdx === idx
                      return (
                        <div
                          key={idx}
                          onClick={() => handleSelectAndEditFrame(idx)}
                          className={`relative w-14 h-14 rounded-xl border p-1 shrink-0 bg-slate-950 flex flex-col items-center justify-center cursor-pointer group transition-all ${
                            isSelected
                              ? 'border-amber-400 ring-2 ring-amber-400/40 bg-amber-500/10 shadow-lg'
                              : 'border-slate-700 hover:border-slate-500 hover:bg-slate-900'
                          }`}
                          title={`Clique para carregar e editar o Quadro ${idx + 1}`}
                        >
                          <img src={frameData} alt={`Frame ${idx}`} className="max-w-full max-h-8 object-contain" />
                          <span
                            className={`text-[9px] font-bold mt-0.5 ${
                              isSelected ? 'text-amber-300' : 'text-slate-400'
                            }`}
                          >
                            Q{idx + 1} {isSelected ? '✏️' : ''}
                          </span>

                          {/* Action Overlay buttons on hover */}
                          <div
                            className="absolute -top-1.5 -right-1.5 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => handleDuplicateFrame(idx)}
                              className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[9px] shadow hover:bg-blue-500"
                              title="Duplicar este quadro"
                            >
                              +
                            </button>
                            <button
                              onClick={() => handleRemoveFrame(idx)}
                              className="w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center text-[9px] shadow hover:bg-rose-600"
                              title="Excluir este quadro"
                            >
                              ×
                            </button>
                          </div>

                          {/* Reorder arrows on bottom hover */}
                          <div
                            className="absolute -bottom-1 inset-x-0 flex items-center justify-between px-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {idx > 0 && (
                              <button
                                onClick={() => handleMoveFrameLeft(idx)}
                                className="w-3.5 h-3.5 rounded bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center shadow"
                                title="Mover para a esquerda"
                              >
                                <ChevronLeft className="w-2.5 h-2.5" />
                              </button>
                            )}
                            {idx < frames.length - 1 && (
                              <button
                                onClick={() => handleMoveFrameRight(idx)}
                                className="w-3.5 h-3.5 rounded bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center shadow ml-auto"
                                title="Mover para a direita"
                              >
                                <ChevronRight className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Animated Player Preview */}
                  <div className="flex items-center gap-3 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                    <div className="w-16 h-16 rounded-lg border border-slate-700 bg-slate-900 p-1 shrink-0 flex items-center justify-center">
                      <canvas ref={animCanvasRef} width={128} height={128} className="w-full h-full rounded" />
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => setIsPlayingAnim(!isPlayingAnim)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-medium"
                        >
                          {isPlayingAnim ? <Pause className="w-3 h-3 text-amber-400" /> : <Play className="w-3 h-3 text-emerald-400" />}
                          {isPlayingAnim ? 'Pausar' : 'Reproduzir'}
                        </button>
                        <span className="font-mono text-[11px] text-amber-400 font-bold">{frameRateMs}ms</span>
                      </div>
                      <input
                        type="range"
                        min={50}
                        max={500}
                        step={10}
                        value={frameRateMs}
                        onChange={(e) => setFrameRateMs(Number(e.target.value))}
                        className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 text-center text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800 text-[11px]">
                  Nenhum quadro adicionado. Mescle as peças na mesa de montagem ou adicione quadros diretamente.
                </div>
              )}

              {/* Dynamic Live Preview Cards for Piso and Parede */}
              {elementType === 'floor' && (
                <div className="p-3 bg-slate-950/80 rounded-2xl border border-emerald-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                      <LayoutGrid className="w-3.5 h-3.5" />
                      Prévia Contínua no Chão (3x3 Tiles)
                    </span>
                    <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
                      100% Transitável
                    </span>
                  </div>
                  <div className="flex justify-center bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                    <canvas
                      ref={floorTilingCanvasRef}
                      width={96}
                      height={96}
                      className="rounded border border-emerald-500/40 shadow-inner"
                      style={{ imageRendering: 'pixelated' }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 text-center">
                    Visualização contínua de como o piso se repete pelas salas do mapa.
                  </p>
                </div>
              )}

              {elementType === 'wall' && (
                <div className="p-3 bg-slate-950/80 rounded-2xl border border-amber-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <Square className="w-3.5 h-3.5" />
                      Prévia da Parede na Sala
                    </span>
                    <span className="text-[10px] text-amber-400 font-bold bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30">
                      Textura de Zonas
                    </span>
                  </div>
                  <div className="flex justify-center bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                    <canvas
                      ref={wallMockupCanvasRef}
                      width={160}
                      height={100}
                      className="rounded border border-amber-500/40 shadow-inner"
                      style={{ imageRendering: 'pixelated' }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 text-center">
                    Visualização 3D da parede traseira, lateral e blocos frontais da zona.
                  </p>
                </div>
              )}
            </div>

            {/* Section 3: Element Configuration Form */}
            <div className="p-4 space-y-3 flex-1">
              <label className="font-bold text-slate-200 block">Propriedades do Elemento</label>

              {/* Name */}
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400">Nome do Objeto</label>
                <input
                  type="text"
                  value={elementName}
                  onChange={(e) => setElementName(e.target.value)}
                  placeholder="Ex: Fornalha Medieval, Mesa de Madeira..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-blue-500 text-xs"
                />
              </div>

              {/* Type: Furniture, Floor, Wall */}
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400">Tipo de Elemento</label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    onClick={() => handleSelectElementType('furniture')}
                    className={`py-2 px-2 rounded-xl border text-center font-medium transition-all ${
                      elementType === 'furniture'
                        ? 'bg-blue-600/30 border-blue-500 text-blue-200 shadow-sm ring-1 ring-blue-500/40'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    🛋️ Mobília
                  </button>
                  <button
                    onClick={() => handleSelectElementType('floor')}
                    className={`py-2 px-2 rounded-xl border text-center font-medium transition-all ${
                      elementType === 'floor'
                        ? 'bg-emerald-600/30 border-emerald-500 text-emerald-200 shadow-sm ring-1 ring-emerald-500/40'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    🟩 Piso
                  </button>
                  <button
                    onClick={() => handleSelectElementType('wall')}
                    className={`py-2 px-2 rounded-xl border text-center font-medium transition-all ${
                      elementType === 'wall'
                        ? 'bg-amber-600/30 border-amber-500 text-amber-200 shadow-sm ring-1 ring-amber-500/40'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    🧱 Parede
                  </button>
                </div>
              </div>

              {/* Collision Summary in Sidebar (Only for Mobília) */}
              {elementType === 'furniture' && (
                <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-slate-200 font-bold text-[11px]">
                      <Shield className="w-3.5 h-3.5 text-rose-400" />
                      <span>Colisão na Imagem:</span>
                    </div>
                    <span className="font-mono text-rose-400 font-bold text-[10px]">
                      {solidBlocksCount} / {tileWidth * tileHeight} blocos
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Use a ferramenta <strong>"Pintar Colisão"</strong> na barra superior para marcar/desmarcar blocos vermelhos direto na tela.
                  </p>
                </div>
              )}

              {/* Category */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] text-slate-400">Categoria do Catálogo</label>
                  <button
                    type="button"
                    onClick={() => setIsCreatingNewCategory(!isCreatingNewCategory)}
                    className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium"
                  >
                    <Plus className="w-3 h-3" />
                    {isCreatingNewCategory ? 'Selecionar Existente' : 'Nova Categoria'}
                  </button>
                </div>

                {isCreatingNewCategory ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Nome da nova categoria..."
                      className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-blue-500 text-slate-200 text-xs focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const trimmed = newCategoryName.trim()
                        if (trimmed) {
                          addCategory(trimmed)
                          setCategory(trimmed)
                          setIsCreatingNewCategory(false)
                          setNewCategoryName('')
                        }
                      }}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow"
                    >
                      Criar
                    </button>
                  </div>
                ) : (
                  <select
                    value={category}
                    onChange={(e) => {
                      if (e.target.value === '__NEW__') {
                        setIsCreatingNewCategory(true)
                      } else {
                        setCategory(e.target.value)
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs"
                  >
                    {getAllCategories().map((cat) => (
                      <option key={cat} value={cat}>
                        📁 {cat}
                      </option>
                    ))}
                    <option value="__NEW__">➕ Criar Nova Categoria...</option>
                  </select>
                )}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex items-center gap-2 shrink-0">
              <button
                onClick={() => setCustomModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveAsset}
                className="flex-2 w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold shadow-lg shadow-blue-900/40 transition-all flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                Salvar e Usar no Mapa
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
