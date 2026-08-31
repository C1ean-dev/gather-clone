import React, { useState, useRef, useEffect } from 'react'
import {
  X,
  Sparkles,
  Scissors,
  Pencil,
  Check,
  RotateCcw,
} from 'lucide-react'
import { useCustomAssetsStore } from '../store/useCustomAssetsStore'
import { useMapStore } from '../store/useMapStore'
import { CustomAsset, CustomAssetType } from '../types/customAsset'
import {
  cropImage,
  applyBackgroundRemoval,
  RGBColor,
  PRESET_BG_COLORS,
} from '../utils/imageTransparency'
import { CropStudio, CroppedClip } from './custom-element/CropStudio'
import { DrawStudio } from './custom-element/DrawStudio'
import { CompositionStudio, CompositeLayer } from './custom-element/CompositionStudio'
import { CroppedClipsList } from './custom-element/CroppedClipsList'
import { LayerManager } from './custom-element/LayerManager'
import { AnimationTimeline } from './custom-element/AnimationTimeline'
import { TransparencyControls } from './custom-element/TransparencyControls'
import { AssetPropertiesForm } from './custom-element/AssetPropertiesForm'

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

  // Studio Mode: 'crop' (Recorte de Sprites) vs 'draw' (Desenhar à Mão) vs 'compose' (Mesa de Montagem)
  const [studioMode, setStudioMode] = useState<'crop' | 'draw' | 'compose'>('crop')

  // Source Image State
  const [sourceImage, setSourceImage] = useState<HTMLImageElement | null>(null)
  const [sourceImageSrc, setSourceImageSrc] = useState<string>('')
  const [zoom, setZoom] = useState<number>(1)
  const [snapToGrid, setSnapToGrid] = useState<boolean>(true)
  const [isEyedropperActive, setIsEyedropperActive] = useState<boolean>(false)

  // Selection Box
  const [selection, setSelection] = useState<{ x: number; y: number; w: number; h: number }>({
    x: 0,
    y: 0,
    w: 64,
    h: 128,
  })
  const [isDraggingSelection, setIsDraggingSelection] = useState<boolean>(false)
  const [dragSelectionStart, setDragSelectionStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 })

  // Transparency / Background Removal
  const [enableBgRemoval, setEnableBgRemoval] = useState<boolean>(true)
  const [targetColor, setTargetColor] = useState<RGBColor>(PRESET_BG_COLORS.LPC_DARK)
  const [tolerance, setTolerance] = useState<number>(25)
  const [removeWhiteFringe, setRemoveWhiteFringe] = useState<boolean>(true)

  // Saved Cropped Pieces Library
  const [croppedClips, setCroppedClips] = useState<CroppedClip[]>([])

  // Composition Board State
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

  // Composition Tools
  const [composeTool, setComposeTool] = useState<'move' | 'collision'>('move')
  const [composeZoom, setComposeZoom] = useState<number>(2)
  const [showCollisionOverlay, setShowCollisionOverlay] = useState<boolean>(true)
  const [isPaintingCollision, setIsPaintingCollision] = useState<boolean>(false)
  const [collisionPaintValue, setCollisionPaintValue] = useState<boolean>(true)

  // Collision Grid Matrix
  const [collisionGrid, setCollisionGrid] = useState<boolean[][]>(() => {
    const grid: boolean[][] = []
    for (let r = 0; r < 6; r++) {
      const row: boolean[] = []
      for (let c = 0; c < 4; c++) {
        row.push(r >= 3)
      }
      grid.push(row)
    }
    return grid
  })

  // Animation Frames State
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
  const mainCanvasRef = useRef<HTMLCanvasElement>(null!)
  const composeCanvasRef = useRef<HTMLCanvasElement>(null!)
  const singlePreviewCanvasRef = useRef<HTMLCanvasElement>(null!)
  const animCanvasRef = useRef<HTMLCanvasElement>(null!)
  const fileInputRef = useRef<HTMLInputElement>(null!)

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

  const handleSelectElementType = (newType: CustomAssetType) => {
    setElementType(newType)
    if (newType === 'floor') {
      if (category === 'Forja Antiga' || category === 'Geral') {
        setCategory('Pisos Personalizados')
      }
    } else if (newType === 'wall') {
      if (category === 'Forja Antiga' || category === 'Geral') {
        setCategory('Paredes das Zonas')
      }
    } else {
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

        if (asset.frameLayers && asset.frameLayers.length > 0) {
          setFrameLayerStates(asset.frameLayers)
          const firstFrameLayers = asset.frameLayers[0] || []
          setCompositeLayers(JSON.parse(JSON.stringify(firstFrameLayers)))
          if (firstFrameLayers.length > 0) {
            setSelectedLayerId(firstFrameLayers[0].id)
          }

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
        setStudioMode('compose')
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

  // Draw main source canvas with selection box
  useEffect(() => {
    const canvas = mainCanvasRef.current
    if (!canvas || !sourceImage) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = sourceImage.naturalWidth * zoom
    canvas.height = sourceImage.naturalHeight * zoom

    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(sourceImage, 0, 0, canvas.width, canvas.height)

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

    const sx = selection.x * zoom
    const sy = selection.y * zoom
    const sw = selection.w * zoom
    const sh = selection.h * zoom

    ctx.fillStyle = 'rgba(59, 130, 246, 0.25)'
    ctx.fillRect(sx, sy, sw, sh)

    ctx.strokeStyle = '#3b82f6'
    ctx.lineWidth = 2
    ctx.strokeRect(sx + 0.5, sy + 0.5, sw - 1, sh - 1)

    ctx.fillStyle = '#ffffff'
    const handleSize = 6
    ctx.fillRect(sx - handleSize / 2, sy - handleSize / 2, handleSize, handleSize)
    ctx.fillRect(sx + sw - handleSize / 2, sy - handleSize / 2, handleSize, handleSize)
    ctx.fillRect(sx - handleSize / 2, sy + sh - handleSize / 2, handleSize, handleSize)
    ctx.fillRect(sx + sw - handleSize / 2, sy + sh - handleSize / 2, handleSize, handleSize)
  }, [sourceImage, zoom, selection, snapToGrid, studioMode, isCustomModalOpen])

  const getProcessedSelectionCanvas = (): HTMLCanvasElement | null => {
    if (!sourceImage || selection.w <= 0 || selection.h <= 0) return null
    const rawCrop = cropImage(sourceImage, selection.x, selection.y, selection.w, selection.h)
    if (enableBgRemoval) {
      return applyBackgroundRemoval(rawCrop, targetColor, tolerance, removeWhiteFringe)
    }
    return rawCrop
  }

  // Preload layer images cache
  const [cachedLayerImages, setCachedLayerImages] = useState<{ [id: string]: HTMLImageElement }>({})

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

  // Draw Composition Canvas
  useEffect(() => {
    const canvas = composeCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const renderZoom = composeZoom
    canvas.width = compositeBoardWidth * renderZoom
    canvas.height = compositeBoardHeight * renderZoom

    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const tileSize = 16
    for (let y = 0; y < canvas.height; y += tileSize) {
      for (let x = 0; x < canvas.width; x += tileSize) {
        ctx.fillStyle = (x / tileSize + y / tileSize) % 2 === 0 ? '#181a20' : '#22252e'
        ctx.fillRect(x, y, tileSize, tileSize)
      }
    }

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

      if (composeTool === 'move' && layer.id === selectedLayerId) {
        ctx.strokeStyle = '#38bdf8'
        ctx.lineWidth = 2
        ctx.setLineDash([4, 4])
        ctx.strokeRect(drawX + 0.5, drawY + 0.5, drawW - 1, drawH - 1)
        ctx.setLineDash([])
      }

      ctx.restore()
    })

    if (showCollisionOverlay && collisionGrid && collisionGrid.length > 0) {
      const tilePx = 32 * renderZoom
      for (let r = 0; r < tileHeight; r++) {
        for (let c = 0; c < tileWidth; c++) {
          if (collisionGrid[r]?.[c]) {
            const bx = c * tilePx
            const by = r * tilePx
            ctx.fillStyle = 'rgba(239, 68, 68, 0.25)'
            ctx.fillRect(bx, by, tilePx, tilePx)
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
    composeZoom,
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    processFile(file)
    // Allow the same file to be re-selected later
    e.target.value = ''
  }

  // Shared file-loading pipeline used by both the <input type="file"> change
  // handler and native HTML5 drag-and-drop events from the CropStudio.
  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      console.warn('[CustomElementModal] dropped file is not an image:', file.type)
      return
    }

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

  // Handle Drag Selection on Source Canvas / Eyedropper
  // Refs to keep the latest mouse handlers reachable from window listeners
  // without re-binding them on every state change.
  const dragStateRef = useRef<{
    isDragging: boolean
    startX: number
    startY: number
    clientX: number
    clientY: number
  }>({ isDragging: false, startX: 0, startY: 0, clientX: 0, clientY: 0 })

  // Helper: convert a viewport-space point to canvas-space (image coords),
  // clamped to the source image bounds. Returns null if the point is outside
  // the canvas.
  const viewportToImageCoords = (clientX: number, clientY: number): { x: number; y: number } | null => {
    const canvas = mainCanvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
      return null
    }
    return {
      x: (clientX - rect.left) / zoom,
      y: (clientY - rect.top) / zoom,
    }
  }

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!mainCanvasRef.current || !sourceImage) return
    const rect = mainCanvasRef.current.getBoundingClientRect()
    const scaleX = mainCanvasRef.current.width / rect.width
    const scaleY = mainCanvasRef.current.height / rect.height
    const canvasPxX = Math.floor((e.clientX - rect.left) * scaleX)
    const canvasPxY = Math.floor((e.clientY - rect.top) * scaleY)

    if (isEyedropperActive) {
      const sampleCanvas = document.createElement('canvas')
      sampleCanvas.width = sourceImage.naturalWidth
      sampleCanvas.height = sourceImage.naturalHeight
      const sampleCtx = sampleCanvas.getContext('2d', { willReadFrequently: true })
      if (sampleCtx) {
        sampleCtx.drawImage(sourceImage, 0, 0)
        const imgX = Math.max(0, Math.min(sourceImage.naturalWidth - 1, Math.floor(canvasPxX / zoom)))
        const imgY = Math.max(0, Math.min(sourceImage.naturalHeight - 1, Math.floor(canvasPxY / zoom)))
        const pixel = sampleCtx.getImageData(imgX, imgY, 1, 1).data
        setTargetColor({
          r: pixel[0],
          g: pixel[1],
          b: pixel[2],
        })
        setEnableBgRemoval(true)
      }
      setIsEyedropperActive(false)
      return
    }

    let rawX = (e.clientX - rect.left) / zoom
    let rawY = (e.clientY - rect.top) / zoom

    if (snapToGrid) {
      rawX = Math.floor(rawX / 32) * 32
      rawY = Math.floor(rawY / 32) * 32
    }

    setIsDraggingSelection(true)
    setDragSelectionStart({ x: rawX, y: rawY })
    setSelection({ x: rawX, y: rawY, w: 32, h: 32 })

    // Persist drag origin for the global window listeners.
    dragStateRef.current = {
      isDragging: true,
      startX: rawX,
      startY: rawY,
      clientX: e.clientX,
      clientY: e.clientY,
    }
  }

  // Global mouse move — keeps updating the selection rectangle even when the
  // cursor leaves the canvas (e.g. user drags past the image edge). Without
  // this the selection freezes as soon as the pointer exits the canvas.
  useEffect(() => {
    if (!isDraggingSelection) return

    const handleWindowMouseMove = (e: MouseEvent) => {
      const canvas = mainCanvasRef.current
      if (!canvas || !dragStateRef.current.isDragging) return
      const rect = canvas.getBoundingClientRect()
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
      dragStateRef.current.clientX = e.clientX
      dragStateRef.current.clientY = e.clientY
    }

    const handleWindowMouseUp = () => {
      dragStateRef.current.isDragging = false
      setIsDraggingSelection(false)
    }

    window.addEventListener('mousemove', handleWindowMouseMove)
    window.addEventListener('mouseup', handleWindowMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove)
      window.removeEventListener('mouseup', handleWindowMouseUp)
    }
  }, [isDraggingSelection, dragSelectionStart, snapToGrid, zoom])

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // The actual drag update happens via the window-level listener above so
    // the rectangle continues to track when the pointer leaves the canvas.
    // Keep this handler only as a no-op so the canvas keeps receiving focus
    // events while a drag is in progress.
    if (!isDraggingSelection) return
    const coords = viewportToImageCoords(e.clientX, e.clientY)
    if (coords === null) return
    let currentX = coords.x
    let currentY = coords.y
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
    dragStateRef.current.isDragging = false
  }

  // Composition Mouse Handlers
  const handleComposeCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!composeCanvasRef.current) return
    const rect = composeCanvasRef.current.getBoundingClientRect()
    const clickX = Math.floor((e.clientX - rect.left) / composeZoom)
    const clickY = Math.floor((e.clientY - rect.top) / composeZoom)

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
    const currentX = Math.floor((e.clientX - rect.left) / composeZoom)
    const currentY = Math.floor((e.clientY - rect.top) / composeZoom)

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

  // Crop & Add Actions
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

  // Handlers for Hand-Drawn Pixel Art Pieces
  const handleAddDrawingToComposition = (clip: CroppedClip) => {
    setCroppedClips((prev) => {
      const exists = prev.some((c) => c.id === clip.id)
      return exists ? prev : [...prev, clip]
    })
    handleAddClipToCompositionBoard(clip)
    setStudioMode('compose')
  }

  const handleSaveDrawingAsClip = (clip: CroppedClip) => {
    setCroppedClips((prev) => {
      const exists = prev.some((c) => c.id === clip.id)
      return exists ? prev : [...prev, clip]
    })
  }

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

  const handleFlipLayer = (id: string) => {
    setCompositeLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, flipH: !l.flipH } : l))
    )
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

  const handleMoveLayerOrder = (idx: number, direction: 'up' | 'down') => {
    setCompositeLayers((prev) => {
      const clone = [...prev]
      const targetIdx = direction === 'up' ? idx + 1 : idx - 1
      if (targetIdx < 0 || targetIdx >= clone.length) return prev
      const temp = clone[idx]
      clone[idx] = clone[targetIdx]
      clone[targetIdx] = temp
      return clone
    })
  }

  const handleChangeLayerOpacity = (id: string, opacity: number) => {
    setCompositeLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, opacity } : l))
    )
  }

  const handleDeleteFrame = (idx: number) => {
    setFrames((prev) => prev.filter((_, i) => i !== idx))
    setFrameLayerStates((prev) => prev.filter((_, i) => i !== idx))
    if (selectedFrameIdx === idx) {
      setSelectedFrameIdx(null)
    } else if (selectedFrameIdx !== null && selectedFrameIdx > idx) {
      setSelectedFrameIdx(selectedFrameIdx - 1)
    }
  }

  // Full studio reset: clears the loaded source image, clips, the composition
  // board and the baked frames/timeline, returning every tab to blank state.
  // Previously it only cleared compositeLayers/frames, so an image loaded in
  // the "Recortar Imagem" tab stayed on screen and nothing seemed to happen.
  const handleClearBoard = () => {
    setSourceImage(null)
    setSourceImageSrc('')
    setSelection({ x: 0, y: 0, w: 64, h: 128 })
    setZoom(1)
    setCroppedClips([])
    setCompositeLayers([])
    setSelectedLayerId(null)
    setFrames([])
    setFrameLayerStates([])
    setSelectedFrameIdx(null)
    setCurrentPreviewFrameIdx(0)
    setStudioMode('crop')
  }

  // Save the custom asset into the store
  const handleSaveAsset = () => {
    let finalFrames = [...frames]
    let finalFrameLayers = [...frameLayerStates]

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
    const finalIsObstacle = isFloor
      ? false
      : isWall
      ? true
      : collisionGrid.some((row) => row.some((col) => col === true))
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

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200 select-none">
      <div className="bg-[#1e1f22] border border-[#2b2d31] rounded-3xl w-full max-w-6xl overflow-hidden shadow-2xl flex flex-col h-[90vh] max-h-[850px]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-[#2b2d31] bg-[#18191c]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center text-white font-black text-sm shadow">
              ✦
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-100">
                {editingAssetId ? 'Editar Elemento Personalizado' : 'Estúdio de Criação de Elementos'}
              </h2>
              <p className="text-[11px] text-slate-400">
                Recorte sprites, componha camadas e pinte colisões físicas para seu espaço virtual
              </p>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex bg-[#12151d] p-1 rounded-2xl border border-[#2b2d31]">
            <button
              type="button"
              onClick={() => setStudioMode('crop')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                studioMode === 'crop'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Scissors className="w-3.5 h-3.5" />
              <span>1. Recortar Imagem</span>
            </button>

            <button
              type="button"
              onClick={() => setStudioMode('draw')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                studioMode === 'draw'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Pencil className="w-3.5 h-3.5 text-amber-300" />
              <span>2. Desenhar à Mão</span>
            </button>

            <button
              type="button"
              onClick={() => setStudioMode('compose')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                studioMode === 'compose'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
              <span>3. Montagem & Colisão</span>
            </button>
          </div>

          <button
            onClick={() => setCustomModalOpen(false)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-[#2b2d31] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2-Column Main Workspace */}
        <div className="flex flex-1 overflow-hidden">
          {/* LEFT COLUMN: Main Active Canvas */}
          <div className="flex-1 p-4 flex flex-col gap-3 overflow-hidden">
            {studioMode === 'crop' ? (
              <CropStudio
                sourceImage={sourceImage}
                sourceImageSrc={sourceImageSrc}
                zoom={zoom}
                setZoom={setZoom}
                snapToGrid={snapToGrid}
                setSnapToGrid={setSnapToGrid}
                selection={selection}
                setSelection={setSelection}
                isEyedropperActive={isEyedropperActive}
                mainCanvasRef={mainCanvasRef}
                fileInputRef={fileInputRef}
                onUploadImage={handleFileUpload}
                onDropFile={processFile}
                onCanvasMouseDown={handleCanvasMouseDown}
                onCanvasMouseMove={handleCanvasMouseMove}
                onCanvasMouseUp={handleCanvasMouseUp}
                onCropAndSaveClip={handleSaveCurrentCropToLibrary}
              />
            ) : studioMode === 'draw' ? (
              <DrawStudio
                tileWidth={tileWidth}
                tileHeight={tileHeight}
                setBoardSizeInTiles={setBoardSizeInTiles}
                onAddDrawingToComposition={handleAddDrawingToComposition}
                onSaveDrawingAsClip={handleSaveDrawingAsClip}
              />
            ) : (
              <CompositionStudio
                elementType={elementType}
                tileWidth={tileWidth}
                tileHeight={tileHeight}
                setBoardSizeInTiles={setBoardSizeInTiles}
                composeCanvasRef={composeCanvasRef}
                composeTool={composeTool}
                setComposeTool={setComposeTool}
                composeZoom={composeZoom}
                setComposeZoom={setComposeZoom}
                showCollisionOverlay={showCollisionOverlay}
                setShowCollisionOverlay={setShowCollisionOverlay}
                collisionGrid={collisionGrid}
                onSetAllCollision={handleSetAllCollision}
                onSetBottomHalfCollision={handleSetBottomHalfCollision}
                onComposeMouseDown={handleComposeCanvasMouseDown}
                onComposeMouseMove={handleComposeCanvasMouseMove}
                onComposeMouseUp={handleComposeCanvasMouseUp}
              />
            )}
          </div>

          {/* RIGHT COLUMN: Toolbars, Clips Library, Layers, Properties */}
          <div className="w-96 bg-[#18191c] border-l border-[#2b2d31] p-4 flex flex-col gap-4 overflow-y-auto shrink-0">
            {/* Asset Properties Form */}
            <AssetPropertiesForm
              elementName={elementName}
              setElementName={setElementName}
              elementType={elementType}
              onSelectElementType={handleSelectElementType}
              category={category}
              setCategory={setCategory}
              allCategories={getAllCategories()}
              isCreatingNewCategory={isCreatingNewCategory}
              setIsCreatingNewCategory={setIsCreatingNewCategory}
              newCategoryName={newCategoryName}
              setNewCategoryName={setNewCategoryName}
              onAddNewCategory={() => {
                if (newCategoryName.trim()) {
                  addCategory(newCategoryName.trim())
                  setCategory(newCategoryName.trim())
                  setIsCreatingNewCategory(false)
                  setNewCategoryName('')
                }
              }}
            />

            {/* Transparency Controls */}
            <TransparencyControls
              enableBgRemoval={enableBgRemoval}
              setEnableBgRemoval={setEnableBgRemoval}
              targetColor={targetColor}
              setTargetColor={setTargetColor}
              tolerance={tolerance}
              setTolerance={setTolerance}
              removeWhiteFringe={removeWhiteFringe}
              setRemoveWhiteFringe={setRemoveWhiteFringe}
              isEyedropperActive={isEyedropperActive}
              setIsEyedropperActive={setIsEyedropperActive}
            />

            {/* Cropped Clips Gallery */}
            <CroppedClipsList
              croppedClips={croppedClips}
              onAddClipToComposition={handleAddClipToCompositionBoard}
              onDeleteClip={handleDeleteClip}
            />

            {/* Composite Layers Manager (in Compose Mode) */}
            {studioMode === 'compose' && (
              <LayerManager
                compositeLayers={compositeLayers}
                selectedLayerId={selectedLayerId}
                setSelectedLayerId={setSelectedLayerId}
                onFlipLayer={handleFlipLayer}
                onDuplicateLayer={handleDuplicateLayer}
                onDeleteLayer={handleDeleteLayer}
                onMoveLayerOrder={handleMoveLayerOrder}
                onChangeLayerOpacity={handleChangeLayerOpacity}
              />
            )}

            {/* Animation Timeline */}
            <AnimationTimeline
              frames={frames}
              selectedFrameIdx={selectedFrameIdx}
              setSelectedFrameIdx={setSelectedFrameIdx}
              onCaptureFrame={handleBakeCompositionToFrame}
              onDeleteFrame={handleDeleteFrame}
              isPlayingAnim={isPlayingAnim}
              setIsPlayingAnim={setIsPlayingAnim}
              frameRateMs={frameRateMs}
              setFrameRateMs={setFrameRateMs}
              animCanvasRef={animCanvasRef}
            />
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 border-t border-[#2b2d31] bg-[#18191c] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClearBoard}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Limpar Mesa</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setCustomModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveAsset}
              className="px-6 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white shadow-lg shadow-indigo-600/30 transition-all active:scale-95 flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Salvar Elemento no Catálogo</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
