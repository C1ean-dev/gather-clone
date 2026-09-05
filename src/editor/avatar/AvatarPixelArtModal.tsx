import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  Pencil,
  Eraser,
  PaintBucket,
  Pipette,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Grid,
  X,
  Check,
  RotateCcw,
  Sparkles,
  FlipHorizontal,
  Play,
  Pause,
  Plus,
  Copy,
  Layers,
} from 'lucide-react'
import { AvatarConfig, AvatarComponentSlot, Direction } from '../../types/game'
import { ColorWheelPicker } from '../../components/common/ColorWheelPicker'

export type DrawTool = 'pencil' | 'eraser' | 'bucket' | 'picker'

interface Props {
  isOpen: boolean
  onClose: () => void
  category: AvatarComponentSlot
  presetName: string
  initialDataUrl?: string
  initialDirectionalFrames?: Partial<Record<Direction, string | string[]>>
  avatar: AvatarConfig
  onSave: (directionalFrames: Record<Direction, string | string[]>, name: string) => void
}

const PRESET_PALETTE = [
  '#000000', '#1e1f22', '#475569', '#94a3b8', '#cbd5e1', '#ffffff',
  '#451a03', '#78350f', '#92400e', '#ffd1a4', '#d4a373', '#b07d62',
  '#e03131', '#ff6b6b', '#ff922b', '#fab005', '#fcc419', '#82c91e',
  '#20c997', '#2f9e44', '#15aabf', '#339af0', '#4c6ef5', '#be4bdb',
]

const CATEGORY_LABELS: Record<AvatarComponentSlot, string> = {
  hair: 'Cabelo',
  top: 'Parte de Cima (Roupa)',
  jacket: 'Jaqueta',
  bottom: 'Parte de Baixo',
  shoes: 'Sapatos',
  hat: 'Chapéu / Laço',
  glasses: 'Óculos',
  facialHair: 'Pelos Faciais',
  eyes: 'Olhos',
  skin: 'Maquiagem',
  other: 'Personagem',
  pet: 'Pet / Mascote',
}

const DIRECTIONS: { id: Direction; label: string; icon: string }[] = [
  { id: 'down', label: 'Frente', icon: '⬇️' },
  { id: 'up', label: 'Costas', icon: '⬆️' },
  { id: 'left', label: 'Esquerda', icon: '⬅️' },
  { id: 'right', label: 'Direita', icon: '➡️' },
]

export const AvatarPixelArtModal: React.FC<Props> = ({
  isOpen,
  onClose,
  category,
  presetName,
  initialDataUrl,
  initialDirectionalFrames,
  avatar,
  onSave,
}) => {
  if (!isOpen) return null

  // Directional Multi-Frames State
  const [activeDirection, setActiveDirection] = useState<Direction>('down')
  const [activeFrameIndex, setActiveFrameIndex] = useState<number>(0)

  const [directionalFrames, setDirectionalFrames] = useState<Record<Direction, string[]>>(() => {
    const parseFrames = (raw?: string | string[]): string[] => {
      if (!raw) return ['']
      if (Array.isArray(raw)) {
        const valid = raw.filter((f) => typeof f === 'string')
        return valid.length > 0 ? valid : ['']
      }
      return [raw]
    }

    return {
      down: parseFrames(initialDirectionalFrames?.down || initialDataUrl),
      up: parseFrames(initialDirectionalFrames?.up),
      left: parseFrames(initialDirectionalFrames?.left),
      right: parseFrames(initialDirectionalFrames?.right),
    }
  })

  // Onion Skinning (Papel Vegetal)
  const [showOnionSkin, setShowOnionSkin] = useState<boolean>(false)
  const [onionOpacity, setOnionOpacity] = useState<number>(0.35)
  const onionCanvasRef = useRef<HTMLCanvasElement | null>(null)

  // Tools & Styling
  const [tool, setTool] = useState<DrawTool>('pencil')
  const [color, setColor] = useState<string>('#4c6ef5')
  const [showColorWheel, setShowColorWheel] = useState<boolean>(false)
  const [recentColors, setRecentColors] = useState<string[]>([
    '#4c6ef5',
    '#ffffff',
    '#1e1f22',
    '#e03131',
    '#fab005',
    '#ffd1a4',
  ])

  // View state & Panning
  const [zoom, setZoom] = useState<number>(14)
  const [showGrid, setShowGrid] = useState<boolean>(true)
  const [customName, setCustomName] = useState<string>(
    presetName ? `${presetName} (Custom)` : `Novo ${CATEGORY_LABELS[category]}`
  )

  // Canvas Panning (Right Click Drag)
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState<boolean>(false)
  const panStartRef = useRef<{ mouseX: number; mouseY: number; startX: number; startY: number }>({
    mouseX: 0,
    mouseY: 0,
    startX: 0,
    startY: 0,
  })
  const stageRef = useRef<HTMLDivElement | null>(null)

  // Drawing state
  const [isDrawing, setIsDrawing] = useState<boolean>(false)
  const [hoverPixel, setHoverPixel] = useState<{ x: number; y: number } | null>(null)
  const [previewDataUrl, setPreviewDataUrl] = useState<string>('')

  // Right Panel Animation Player Loop
  const [isPlaying, setIsPlaying] = useState<boolean>(true)
  const [animSpeedMs, setAnimSpeedMs] = useState<number>(160)
  const [animFrameIndex, setAnimFrameIndex] = useState<number>(0)

  // Canvas Refs
  const drawCanvasRef = useRef<HTMLCanvasElement | null>(null)

  // Undo / Redo History per active frame
  const historyRef = useRef<ImageData[]>([])
  const historyStepRef = useRef<number>(-1)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  // Save current canvas state to history and sync with directionalFrames
  const pushHistoryState = useCallback(() => {
    const canvas = drawCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    const dataUrl = canvas.toDataURL('image/png')
    setPreviewDataUrl(dataUrl)

    setDirectionalFrames((prev) => {
      const list = [...(prev[activeDirection] || [''])]
      if (list[activeFrameIndex] === dataUrl) return prev
      list[activeFrameIndex] = dataUrl
      return {
        ...prev,
        [activeDirection]: list,
      }
    })

    const currentState = ctx.getImageData(0, 0, 32, 32)
    const nextStep = historyStepRef.current + 1
    historyRef.current = historyRef.current.slice(0, nextStep)
    historyRef.current.push(currentState)

    if (historyRef.current.length > 40) {
      historyRef.current.shift()
    } else {
      historyStepRef.current = nextStep
    }

    setCanUndo(historyStepRef.current > 0)
    setCanRedo(historyStepRef.current < historyRef.current.length - 1)
  }, [activeDirection, activeFrameIndex])

  // Onion Skinning Canvas Rendering
  useEffect(() => {
    const oCanvas = onionCanvasRef.current
    if (!oCanvas) return
    const oCtx = oCanvas.getContext('2d')
    if (!oCtx) return

    oCtx.imageSmoothingEnabled = false
    oCtx.clearRect(0, 0, 32, 32)

    if (!showOnionSkin) return

    const currentFrames = directionalFrames[activeDirection] || []
    if (currentFrames.length <= 1) return

    // Previous frame to display as onion skin reference
    const refIndex = activeFrameIndex > 0 ? activeFrameIndex - 1 : currentFrames.length - 1
    const refUrl = currentFrames[refIndex]
    if (refUrl) {
      const img = new Image()
      img.src = refUrl
      img.onload = () => {
        oCtx.clearRect(0, 0, 32, 32)
        oCtx.drawImage(img, 0, 0, 32, 32)
      }
    }
  }, [showOnionSkin, activeDirection, activeFrameIndex, directionalFrames])

  // Animation Loop for Right Panel Preview
  useEffect(() => {
    if (!isPlaying) return
    const activeFrames = directionalFrames[activeDirection] || []
    if (activeFrames.length <= 1) return

    const timer = setInterval(() => {
      setAnimFrameIndex((prev) => (prev + 1) % activeFrames.length)
    }, animSpeedMs)

    return () => clearInterval(timer)
  }, [isPlaying, animSpeedMs, activeDirection, directionalFrames])

  // Ctrl + Mouse Wheel Zoom
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        e.stopPropagation()
        if (e.deltaY < 0) {
          setZoom((z) => Math.min(32, z + 2))
        } else if (e.deltaY > 0) {
          setZoom((z) => Math.max(4, z - 2))
        }
      }
    }

    stage.addEventListener('wheel', handleWheel, { passive: false })
    return () => {
      stage.removeEventListener('wheel', handleWheel)
    }
  }, [])

  // Global mouse tracking while panning with right click
  useEffect(() => {
    if (!isPanning) return

    const onGlobalMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - panStartRef.current.mouseX
      const dy = e.clientY - panStartRef.current.mouseY
      setPanOffset({
        x: panStartRef.current.startX + dx,
        y: panStartRef.current.startY + dy,
      })
    }

    const onGlobalMouseUp = (e: MouseEvent) => {
      if (e.button === 2 || e.buttons === 0) {
        setIsPanning(false)
      }
    }

    window.addEventListener('mousemove', onGlobalMouseMove)
    window.addEventListener('mouseup', onGlobalMouseUp)
    return () => {
      window.removeEventListener('mousemove', onGlobalMouseMove)
      window.removeEventListener('mouseup', onGlobalMouseUp)
    }
  }, [isPanning])

  // Load artwork for activeDirection and activeFrameIndex onto drawing canvas
  useEffect(() => {
    const canvas = drawCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, 32, 32)

    const currentFrames = directionalFrames[activeDirection] || ['']
    const safeIndex = Math.min(activeFrameIndex, Math.max(0, currentFrames.length - 1))
    const currentImgUrl = currentFrames[safeIndex] || ''

    if (currentImgUrl) {
      const img = new Image()
      img.src = currentImgUrl
      img.onload = () => {
        ctx.clearRect(0, 0, 32, 32)
        ctx.drawImage(img, 0, 0, 32, 32)
        setPreviewDataUrl(currentImgUrl)
        historyRef.current = [ctx.getImageData(0, 0, 32, 32)]
        historyStepRef.current = 0
        setCanUndo(false)
        setCanRedo(false)
      }
      img.onerror = () => {
        ctx.clearRect(0, 0, 32, 32)
        setPreviewDataUrl('')
        historyRef.current = [ctx.getImageData(0, 0, 32, 32)]
        historyStepRef.current = 0
        setCanUndo(false)
        setCanRedo(false)
      }
    } else {
      ctx.clearRect(0, 0, 32, 32)
      setPreviewDataUrl('')
      historyRef.current = [ctx.getImageData(0, 0, 32, 32)]
      historyStepRef.current = 0
      setCanUndo(false)
      setCanRedo(false)
    }
  }, [activeDirection, activeFrameIndex])

  // Helper to commit current drawing canvas to state
  const commitCurrentCanvas = () => {
    const canvas = drawCanvasRef.current
    if (!canvas) return
    const currentData = canvas.toDataURL('image/png')
    setDirectionalFrames((prev) => {
      const list = [...(prev[activeDirection] || [''])]
      list[activeFrameIndex] = currentData
      return { ...prev, [activeDirection]: list }
    })
  }

  // Direction Switcher
  const switchDirection = (newDir: Direction) => {
    if (newDir === activeDirection) return
    commitCurrentCanvas()
    setActiveDirection(newDir)
    const targetFrames = directionalFrames[newDir] || ['']
    setActiveFrameIndex((prevIdx) => Math.min(prevIdx, Math.max(0, targetFrames.length - 1)))
  }

  // Frame Navigation
  const switchFrame = (newIndex: number) => {
    if (newIndex === activeFrameIndex) return
    commitCurrentCanvas()
    setActiveFrameIndex(newIndex)
  }

  // Add a new blank frame
  const handleAddFrame = () => {
    commitCurrentCanvas()
    const currentList = directionalFrames[activeDirection] || ['']
    const newIndex = currentList.length

    setDirectionalFrames((prev) => {
      const list = [...(prev[activeDirection] || [''])]
      return {
        ...prev,
        [activeDirection]: [...list, ''],
      }
    })
    setActiveFrameIndex(newIndex)
  }

  // Duplicate current active frame (crucial for walk cycles!)
  const handleDuplicateFrame = () => {
    const canvas = drawCanvasRef.current
    const currentData = canvas ? canvas.toDataURL('image/png') : ''
    const currentList = directionalFrames[activeDirection] || ['']
    const duplicateData = currentData || currentList[activeFrameIndex] || ''
    const newIndex = activeFrameIndex + 1

    setDirectionalFrames((prev) => {
      const list = [...(prev[activeDirection] || [''])]
      list[activeFrameIndex] = currentData
      const newList = [
        ...list.slice(0, newIndex),
        duplicateData,
        ...list.slice(newIndex),
      ]
      return {
        ...prev,
        [activeDirection]: newList,
      }
    })
    setActiveFrameIndex(newIndex)
  }

  // Delete a frame
  const handleDeleteFrame = (e: React.MouseEvent, indexToDelete: number) => {
    e.stopPropagation()
    const currentList = directionalFrames[activeDirection] || ['']
    if (currentList.length <= 1) {
      handleClear()
      return
    }

    const newList = currentList.filter((_, i) => i !== indexToDelete)
    setDirectionalFrames((prev) => ({
      ...prev,
      [activeDirection]: newList,
    }))

    if (activeFrameIndex === indexToDelete) {
      const nextIndex = Math.min(indexToDelete, newList.length - 1)
      setActiveFrameIndex(nextIndex)
    } else if (activeFrameIndex > indexToDelete) {
      setActiveFrameIndex(activeFrameIndex - 1)
    }
  }

  // Mirror Left/Right Side (mirrors all frames of current direction to opposite side)
  const handleMirrorOppositeSide = () => {
    const canvas = drawCanvasRef.current
    const currentData = canvas ? canvas.toDataURL('image/png') : ''
    const sourceFrames = [...(directionalFrames[activeDirection] || [''])]
    sourceFrames[activeFrameIndex] = currentData

    const targetDir: Direction = activeDirection === 'left' ? 'right' : 'left'

    const flipCanvas = document.createElement('canvas')
    flipCanvas.width = 32
    flipCanvas.height = 32
    const flipCtx = flipCanvas.getContext('2d')
    if (!flipCtx) return

    const mirrored: string[] = new Array(sourceFrames.length).fill('')
    let loaded = 0

    sourceFrames.forEach((frameUrl, idx) => {
      if (!frameUrl) {
        mirrored[idx] = ''
        loaded++
        if (loaded === sourceFrames.length) {
          setDirectionalFrames((prev) => ({
            ...prev,
            [activeDirection]: sourceFrames,
            [targetDir]: mirrored,
          }))
        }
        return
      }

      const img = new Image()
      img.src = frameUrl
      img.onload = () => {
        flipCtx.clearRect(0, 0, 32, 32)
        flipCtx.imageSmoothingEnabled = false
        flipCtx.save()
        flipCtx.translate(32, 0)
        flipCtx.scale(-1, 1)
        flipCtx.drawImage(img, 0, 0, 32, 32)
        flipCtx.restore()
        mirrored[idx] = flipCanvas.toDataURL('image/png')
        loaded++
        if (loaded === sourceFrames.length) {
          setDirectionalFrames((prev) => ({
            ...prev,
            [activeDirection]: sourceFrames,
            [targetDir]: mirrored,
          }))
        }
      }
      img.onerror = () => {
        mirrored[idx] = ''
        loaded++
        if (loaded === sourceFrames.length) {
          setDirectionalFrames((prev) => ({
            ...prev,
            [activeDirection]: sourceFrames,
            [targetDir]: mirrored,
          }))
        }
      }
    })
  }

  // Pixel Coordinates calculation
  const getCanvasPixelCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = drawCanvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const clientX = e.clientX - rect.left
    const clientY = e.clientY - rect.top
    const px = Math.floor(clientX * scaleX)
    const py = Math.floor(clientY * scaleY)

    if (px < 0 || px >= 32 || py < 0 || py >= 32) return null
    return { x: px, y: py }
  }

  // Draw Pixel onto Context
  const applyPixel = useCallback(
    (x: number, y: number, currentTool: DrawTool, paintColor: string) => {
      const canvas = drawCanvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) return

      if (currentTool === 'pencil') {
        ctx.fillStyle = paintColor
        ctx.fillRect(x, y, 1, 1)
      } else if (currentTool === 'eraser') {
        ctx.clearRect(x, y, 1, 1)
      }
    },
    []
  )

  // Flood Fill (Bucket)
  const floodFill = (startX: number, startY: number, fillColor: string) => {
    const canvas = drawCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    const imgData = ctx.getImageData(0, 0, 32, 32)
    const data = imgData.data

    const startIndex = (startY * 32 + startX) * 4
    const targetR = data[startIndex]
    const targetG = data[startIndex + 1]
    const targetB = data[startIndex + 2]
    const targetA = data[startIndex + 3]

    // Convert fillColor hex to RGBA
    const hex = fillColor.replace('#', '')
    const fillR = parseInt(hex.substring(0, 2), 16) || 0
    const fillG = parseInt(hex.substring(2, 4), 16) || 0
    const fillB = parseInt(hex.substring(4, 6), 16) || 0
    const fillA = 255

    if (
      targetR === fillR &&
      targetG === fillG &&
      targetB === fillB &&
      targetA === fillA
    ) {
      return
    }

    const queue: [number, number][] = [[startX, startY]]
    const visited = new Uint8Array(32 * 32)

    while (queue.length > 0) {
      const [cx, cy] = queue.pop()!
      const idx = (cy * 32 + cx) * 4
      const pIdx = cy * 32 + cx

      if (visited[pIdx]) continue
      visited[pIdx] = 1

      if (
        data[idx] === targetR &&
        data[idx + 1] === targetG &&
        data[idx + 2] === targetB &&
        data[idx + 3] === targetA
      ) {
        data[idx] = fillR
        data[idx + 1] = fillG
        data[idx + 2] = fillB
        data[idx + 3] = fillA

        if (cx > 0) queue.push([cx - 1, cy])
        if (cx < 31) queue.push([cx + 1, cy])
        if (cy > 0) queue.push([cx, cy - 1])
        if (cy < 31) queue.push([cx, cy + 1])
      }
    }

    ctx.putImageData(imgData, 0, 0)
    pushHistoryState()
  }

  // Pipette (Eyedropper)
  const pickColor = (x: number, y: number) => {
    const canvas = drawCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    const pixel = ctx.getImageData(x, y, 1, 1).data
    if (pixel[3] === 0) return

    const hex = `#${((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2])
      .toString(16)
      .slice(1)}`

    setColor(hex)
    if (!recentColors.includes(hex)) {
      setRecentColors([hex, ...recentColors.slice(0, 7)])
    }
    setTool('pencil')
  }

  // Mouse Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 2) {
      e.preventDefault()
      setIsPanning(true)
      panStartRef.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        startX: panOffset.x,
        startY: panOffset.y,
      }
      return
    }

    if (e.button === 0) {
      const pt = getCanvasPixelCoords(e)
      if (!pt) return

      if (tool === 'picker') {
        pickColor(pt.x, pt.y)
        return
      }

      if (tool === 'bucket') {
        floodFill(pt.x, pt.y, color)
        return
      }

      setIsDrawing(true)
      applyPixel(pt.x, pt.y, tool, color)
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) return

    const pt = getCanvasPixelCoords(e)
    setHoverPixel(pt)

    if (!isDrawing || !pt) return
    applyPixel(pt.x, pt.y, tool, color)
  }

  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false)
    }
    if (isDrawing) {
      setIsDrawing(false)
      pushHistoryState()
    }
  }

  // Undo & Redo
  const handleUndo = () => {
    if (historyStepRef.current <= 0) return
    const canvas = drawCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    const nextStep = historyStepRef.current - 1
    const imgData = historyRef.current[nextStep]
    ctx.putImageData(imgData, 0, 0)
    historyStepRef.current = nextStep

    setCanUndo(nextStep > 0)
    setCanRedo(nextStep < historyRef.current.length - 1)
    const dataUrl = canvas.toDataURL('image/png')
    setPreviewDataUrl(dataUrl)
    setDirectionalFrames((prev) => {
      const list = [...(prev[activeDirection] || [''])]
      list[activeFrameIndex] = dataUrl
      return { ...prev, [activeDirection]: list }
    })
  }

  const handleRedo = () => {
    if (historyStepRef.current >= historyRef.current.length - 1) return
    const canvas = drawCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    const nextStep = historyStepRef.current + 1
    const imgData = historyRef.current[nextStep]
    ctx.putImageData(imgData, 0, 0)
    historyStepRef.current = nextStep

    setCanUndo(nextStep > 0)
    setCanRedo(nextStep < historyRef.current.length - 1)
    const dataUrl = canvas.toDataURL('image/png')
    setPreviewDataUrl(dataUrl)
    setDirectionalFrames((prev) => {
      const list = [...(prev[activeDirection] || [''])]
      list[activeFrameIndex] = dataUrl
      return { ...prev, [activeDirection]: list }
    })
  }

  // Clear Canvas
  const handleClear = () => {
    const canvas = drawCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    ctx.clearRect(0, 0, 32, 32)
    pushHistoryState()
  }

  // Final Save Handler
  const handleFinalSave = () => {
    const canvas = drawCanvasRef.current
    const currentData = canvas ? canvas.toDataURL('image/png') : ''
    const currentDirFrames = [...(directionalFrames[activeDirection] || [''])]
    currentDirFrames[activeFrameIndex] = currentData

    const finalFrames: Record<Direction, string[]> = {
      ...directionalFrames,
      [activeDirection]: currentDirFrames,
    }

    // Auto-mirror: If left was drawn but right is completely empty, mirror left into right
    const hasLeft = finalFrames.left.some((f) => !!f)
    const hasRight = finalFrames.right.some((f) => !!f)

    if (hasLeft && !hasRight) {
      const flipCanvas = document.createElement('canvas')
      flipCanvas.width = 32
      flipCanvas.height = 32
      const flipCtx = flipCanvas.getContext('2d')
      if (flipCtx) {
        flipCtx.imageSmoothingEnabled = false
        const mirrored: string[] = new Array(finalFrames.left.length).fill('')
        let loaded = 0
        const leftFrames = finalFrames.left

        const completeSave = () => {
          finalFrames.right = mirrored
          onSave(finalFrames, customName.trim() || `Preset ${CATEGORY_LABELS[category]}`)
          onClose()
        }

        leftFrames.forEach((frameUrl, idx) => {
          if (!frameUrl) {
            mirrored[idx] = ''
            loaded++
            if (loaded === leftFrames.length) completeSave()
            return
          }
          const img = new Image()
          img.src = frameUrl
          img.onload = () => {
            flipCtx.clearRect(0, 0, 32, 32)
            flipCtx.save()
            flipCtx.translate(32, 0)
            flipCtx.scale(-1, 1)
            flipCtx.drawImage(img, 0, 0, 32, 32)
            flipCtx.restore()
            mirrored[idx] = flipCanvas.toDataURL('image/png')
            loaded++
            if (loaded === leftFrames.length) completeSave()
          }
          img.onerror = () => {
            mirrored[idx] = ''
            loaded++
            if (loaded === leftFrames.length) completeSave()
          }
        })
        return
      }
    }

    // Auto-mirror: If right was drawn but left is completely empty, mirror right into left
    if (hasRight && !hasLeft) {
      const flipCanvas = document.createElement('canvas')
      flipCanvas.width = 32
      flipCanvas.height = 32
      const flipCtx = flipCanvas.getContext('2d')
      if (flipCtx) {
        flipCtx.imageSmoothingEnabled = false
        const mirrored: string[] = new Array(finalFrames.right.length).fill('')
        let loaded = 0
        const rightFrames = finalFrames.right

        const completeSave = () => {
          finalFrames.left = mirrored
          onSave(finalFrames, customName.trim() || `Preset ${CATEGORY_LABELS[category]}`)
          onClose()
        }

        rightFrames.forEach((frameUrl, idx) => {
          if (!frameUrl) {
            mirrored[idx] = ''
            loaded++
            if (loaded === rightFrames.length) completeSave()
            return
          }
          const img = new Image()
          img.src = frameUrl
          img.onload = () => {
            flipCtx.clearRect(0, 0, 32, 32)
            flipCtx.save()
            flipCtx.translate(32, 0)
            flipCtx.scale(-1, 1)
            flipCtx.drawImage(img, 0, 0, 32, 32)
            flipCtx.restore()
            mirrored[idx] = flipCanvas.toDataURL('image/png')
            loaded++
            if (loaded === rightFrames.length) completeSave()
          }
          img.onerror = () => {
            mirrored[idx] = ''
            loaded++
            if (loaded === rightFrames.length) completeSave()
          }
        })
        return
      }
    }

    onSave(finalFrames, customName.trim() || `Preset ${CATEGORY_LABELS[category]}`)
    onClose()
  }

  const pixelScale = zoom
  const currentDirectionFrames = directionalFrames[activeDirection] || ['']
  const isMultiFrame = currentDirectionFrames.length > 1
  const displayPreviewUrl =
    isMultiFrame && isPlaying
      ? currentDirectionFrames[animFrameIndex] || previewDataUrl
      : previewDataUrl

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl h-[92vh] max-h-[860px] bg-[#1e1f22] border border-[#383a40] rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-[#2b2d31] bg-[#18191c]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-[#3b82f6]/20 border border-[#3b82f6]/40 flex items-center justify-center text-[#3b82f6]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Estúdio Pixel Art: <span className="text-[#3b82f6]">{CATEGORY_LABELS[category]}</span>
              </h2>
              <p className="text-xs text-slate-400">
                Animação com múltiplos quadros por direção, papel vegetal e pré-visualização ao vivo.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Nome do Preset..."
              className="bg-[#2b2d31] border border-[#3f4147] rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#3b82f6] w-64"
            />
            <button
              onClick={handleFinalSave}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#3b82f6] hover:bg-[#2563eb] text-white text-xs font-bold shadow-lg shadow-[#3b82f6]/25 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" /> Salvar Preset
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-[#2b2d31] text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Work Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Toolbar */}
          <div className="w-20 border-r border-[#2b2d31] bg-[#18191c]/80 flex flex-col items-center py-4 gap-3">
            {/* Draw Tools */}
            <div className="flex flex-col gap-1.5 bg-[#2b2d31] p-1.5 rounded-2xl border border-[#383a40]">
              <button
                onClick={() => setTool('pencil')}
                title="Lápis (Pincel)"
                className={`p-2.5 rounded-xl transition-all cursor-pointer ${
                  tool === 'pencil' ? 'bg-[#3b82f6] text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => setTool('eraser')}
                title="Borracha"
                className={`p-2.5 rounded-xl transition-all cursor-pointer ${
                  tool === 'eraser' ? 'bg-[#3b82f6] text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Eraser className="w-4 h-4" />
              </button>
              <button
                onClick={() => setTool('bucket')}
                title="Preencher (Balde)"
                className={`p-2.5 rounded-xl transition-all cursor-pointer ${
                  tool === 'bucket' ? 'bg-[#3b82f6] text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                <PaintBucket className="w-4 h-4" />
              </button>
              <button
                onClick={() => setTool('picker')}
                title="Conta-gotas (Pipeta)"
                className={`p-2.5 rounded-xl transition-all cursor-pointer ${
                  tool === 'picker' ? 'bg-[#3b82f6] text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Pipette className="w-4 h-4" />
              </button>
            </div>

            <div className="w-10 h-px bg-[#2b2d31]" />

            {/* History Actions */}
            <div className="flex flex-col gap-1.5">
              <button
                onClick={handleUndo}
                disabled={!canUndo}
                title="Desfazer (Ctrl+Z)"
                className={`p-2.5 rounded-xl transition-all cursor-pointer ${
                  canUndo ? 'text-slate-300 hover:bg-[#2b2d31]' : 'text-slate-600 opacity-40 cursor-not-allowed'
                }`}
              >
                <Undo2 className="w-4 h-4" />
              </button>
              <button
                onClick={handleRedo}
                disabled={!canRedo}
                title="Refazer (Ctrl+Y)"
                className={`p-2.5 rounded-xl transition-all cursor-pointer ${
                  canRedo ? 'text-slate-300 hover:bg-[#2b2d31]' : 'text-slate-600 opacity-40 cursor-not-allowed'
                }`}
              >
                <Redo2 className="w-4 h-4" />
              </button>
              <button
                onClick={handleClear}
                title="Limpar Grade"
                className="p-2.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-[#2b2d31] transition-all cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            <div className="w-10 h-px bg-[#2b2d31]" />

            {/* Active Color Preview & Free Color Picker */}
            <div className="flex flex-col items-center gap-1.5">
              <input
                type="color"
                value={color}
                onChange={(e) => {
                  setColor(e.target.value)
                  if (!recentColors.includes(e.target.value)) {
                    setRecentColors([e.target.value, ...recentColors.slice(0, 7)])
                  }
                }}
                className="w-9 h-9 rounded-xl cursor-pointer border border-[#4e5058] bg-transparent"
                title="Escolher Cor Livre"
              />
              <span className="text-[10px] font-mono text-slate-400 uppercase">{color.slice(1, 7)}</span>
            </div>
          </div>

          {/* Center Canvas Stage */}
          <div
            ref={stageRef}
            onContextMenu={(e) => e.preventDefault()}
            onMouseDown={(e) => {
              if (e.button === 2) {
                e.preventDefault()
                setIsPanning(true)
                panStartRef.current = {
                  mouseX: e.clientX,
                  mouseY: e.clientY,
                  startX: panOffset.x,
                  startY: panOffset.y,
                }
              }
            }}
            className={`flex-1 flex flex-col items-center justify-center p-4 overflow-hidden relative select-none ${
              isPanning ? 'cursor-grabbing' : ''
            }`}
          >
            {/* Stage Controls Float Bar (Top Left) */}
            <div className="absolute top-4 left-6 z-10 flex items-center gap-2 bg-[#18191c]/90 border border-[#383a40] backdrop-blur-md px-3 py-1.5 rounded-2xl shadow-lg">
              <button
                onClick={() => setZoom((z) => Math.max(4, z - 2))}
                className="p-1.5 rounded-lg hover:bg-[#2b2d31] text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Diminuir Zoom (Ctrl + Scroll para baixo)"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono font-bold text-slate-300 min-w-[36px] text-center">{zoom}x</span>
              <button
                onClick={() => setZoom((z) => Math.min(32, z + 2))}
                className="p-1.5 rounded-lg hover:bg-[#2b2d31] text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Aumentar Zoom (Ctrl + Scroll para cima)"
              >
                <ZoomIn className="w-4 h-4" />
              </button>

              <div className="w-px h-4 bg-[#383a40] mx-1" />

              {(panOffset.x !== 0 || panOffset.y !== 0 || zoom !== 14) && (
                <button
                  onClick={() => {
                    setPanOffset({ x: 0, y: 0 })
                    setZoom(14)
                  }}
                  className="px-2 py-1 rounded-lg bg-[#2b2d31] hover:bg-[#383a40] text-slate-300 text-[11px] font-semibold transition-all cursor-pointer"
                  title="Centralizar e redefinir zoom original"
                >
                  Centralizar
                </button>
              )}

              <button
                onClick={() => setShowGrid(!showGrid)}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  showGrid ? 'bg-[#3b82f6]/20 text-[#3b82f6]' : 'text-slate-400 hover:text-white'
                }`}
                title="Alternar Grade de Pixels"
              >
                <Grid className="w-4 h-4" />
              </button>

              <div className="w-px h-4 bg-[#383a40] mx-1" />

              {/* Onion Skin Button in Top Toolbar */}
              <button
                onClick={() => setShowOnionSkin(!showOnionSkin)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  showOnionSkin
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-[#2b2d31]'
                }`}
                title="Papel Vegetal (Onion Skin): Projeta o quadro anterior de forma semitransparente para guiar sua animação"
              >
                <Layers className="w-4 h-4" />
                <span>Papel Vegetal</span>
                {showOnionSkin && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />}
              </button>
            </div>

            {/* Viewport Canvas Wrapper */}
            <div
              className="relative rounded-2xl shadow-2xl overflow-hidden border-2 border-[#383a40]"
              style={{
                width: 32 * pixelScale,
                height: 32 * pixelScale,
                transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
                backgroundImage: `
                  linear-gradient(45deg, #18191c 25%, transparent 25%),
                  linear-gradient(-45deg, #18191c 25%, transparent 25%),
                  linear-gradient(45deg, transparent 75%, #18191c 75%),
                  linear-gradient(-45deg, transparent 75%, #18191c 75%)
                `,
                backgroundSize: `${pixelScale * 2}px ${pixelScale * 2}px`,
                backgroundColor: '#232428',
              }}
            >
              {/* Onion Skin (Papel Vegetal) Canvas Underlay */}
              <canvas
                ref={onionCanvasRef}
                width={32}
                height={32}
                className="absolute inset-0 pointer-events-none"
                style={{
                  width: 32 * pixelScale,
                  height: 32 * pixelScale,
                  imageRendering: 'pixelated',
                  opacity: showOnionSkin ? onionOpacity : 0,
                  visibility: showOnionSkin ? 'visible' : 'hidden',
                  transition: 'opacity 0.15s ease',
                }}
              />

              {/* Interactive Drawing Canvas */}
              <canvas
                ref={drawCanvasRef}
                width={32}
                height={32}
                onContextMenu={(e) => e.preventDefault()}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                className={`absolute inset-0 ${isPanning ? 'cursor-grabbing' : 'cursor-crosshair'}`}
                style={{
                  width: 32 * pixelScale,
                  height: 32 * pixelScale,
                  imageRendering: 'pixelated',
                }}
              />

              {/* Pixel Grid Lines Overlay */}
              {showGrid && (
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    backgroundImage: `
                      linear-gradient(to right, rgba(255, 255, 255, 0.07) 1px, transparent 1px),
                      linear-gradient(to bottom, rgba(255, 255, 255, 0.07) 1px, transparent 1px)
                    `,
                    backgroundSize: `${pixelScale}px ${pixelScale}px`,
                  }}
                />
              )}

              {/* Pixel Hover Cursor */}
              {hoverPixel && !isPanning && (
                <div
                  className="absolute pointer-events-none border border-white/80 shadow-xs"
                  style={{
                    left: hoverPixel.x * pixelScale,
                    top: hoverPixel.y * pixelScale,
                    width: pixelScale,
                    height: pixelScale,
                    backgroundColor: tool === 'eraser' ? 'rgba(255,0,0,0.25)' : `${color}88`,
                  }}
                />
              )}
            </div>

            {/* Bottom Dock: Multi-Frame Timeline & Direction Controls */}
            <div className="absolute bottom-3 z-10 flex flex-col items-center gap-2 max-w-[95%]">
              {/* Row 1: Animation Timeline Strip for Active Direction */}
              <div className="flex items-center gap-2 bg-[#18191c]/95 border border-[#383a40] backdrop-blur-md px-3.5 py-1.5 rounded-2xl shadow-2xl">
                <div className="flex items-center gap-1.5 mr-1 shrink-0">
                  <span className="text-[11px] font-extrabold text-blue-400 uppercase tracking-wider flex items-center gap-1">
                    <span>🎞️</span>
                    <span>Quadros ({DIRECTIONS.find((d) => d.id === activeDirection)?.label}):</span>
                  </span>
                </div>

                {/* Frame List */}
                <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 max-w-md">
                  {currentDirectionFrames.map((frameData, idx) => {
                    const isFrameActive = idx === activeFrameIndex
                    return (
                      <div
                        key={idx}
                        onClick={() => switchFrame(idx)}
                        className={`group relative flex flex-col items-center p-1 rounded-xl border cursor-pointer transition-all ${
                          isFrameActive
                            ? 'bg-[#3b82f6]/25 border-[#3b82f6] shadow-md shadow-blue-500/25 scale-105'
                            : 'bg-[#2b2d31] border-[#383a40] hover:border-slate-500 hover:bg-[#32353b]'
                        }`}
                      >
                        <div className="w-9 h-9 rounded-lg bg-[#141517] border border-slate-700/60 flex items-center justify-center overflow-hidden">
                          {frameData ? (
                            <img
                              src={isFrameActive ? previewDataUrl || frameData : frameData}
                              alt={`Q${idx + 1}`}
                              className="w-8 h-8 [image-rendering:pixelated]"
                            />
                          ) : (
                            <span className="text-[9px] text-slate-500 italic">Vazio</span>
                          )}
                        </div>
                        <span
                          className={`text-[9px] font-bold mt-0.5 ${
                            isFrameActive ? 'text-blue-300' : 'text-slate-400'
                          }`}
                        >
                          Q{idx + 1}
                        </span>

                        {/* Delete Frame Button */}
                        {currentDirectionFrames.length > 1 && (
                          <button
                            onClick={(e) => handleDeleteFrame(e, idx)}
                            title="Excluir este quadro"
                            className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity shadow cursor-pointer"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Timeline Action Buttons */}
                <div className="flex items-center gap-1.5 ml-1.5 shrink-0">
                  <button
                    onClick={handleAddFrame}
                    title="Adicionar Novo Quadro em Branco"
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#2b2d31] hover:bg-[#383a40] border border-[#383a40] text-blue-400 hover:text-white text-xs font-bold transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Novo</span>
                  </button>

                  <button
                    onClick={handleDuplicateFrame}
                    title="Duplicar Quadro Atual (Perfeito para ajustar passos de caminhada!)"
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#2b2d31] hover:bg-[#383a40] border border-[#383a40] text-indigo-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Duplicar</span>
                  </button>
                </div>
              </div>

              {/* Row 2: Direction Switcher & Mirror */}
              <div className="flex items-center gap-2 bg-[#18191c]/95 border border-[#383a40] backdrop-blur-md px-3 py-1.5 rounded-2xl shadow-xl">
                <span className="text-[11px] font-bold text-slate-300 ml-1 mr-0.5">Direção:</span>
                {DIRECTIONS.map((dirItem) => {
                  const isCurrent = activeDirection === dirItem.id
                  const framesCount = (directionalFrames[dirItem.id] || []).length
                  const hasFrames = framesCount > 0 && directionalFrames[dirItem.id].some((f) => !!f)
                  return (
                    <button
                      key={dirItem.id}
                      onClick={() => switchDirection(dirItem.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        isCurrent
                          ? 'bg-[#3b82f6] text-white border-[#60a5fa] shadow-md shadow-blue-500/25 scale-105'
                          : 'bg-[#2b2d31] text-slate-300 hover:text-white border-[#383a40] hover:border-slate-500'
                      }`}
                    >
                      <span>{dirItem.icon}</span>
                      <span>{dirItem.label}</span>
                      {hasFrames && (
                        <span className="text-[10px] font-mono bg-black/40 px-1 rounded text-slate-300">
                          {framesCount}
                        </span>
                      )}
                    </button>
                  )
                })}

                {(activeDirection === 'left' || activeDirection === 'right') && (
                  <>
                    <div className="w-px h-5 bg-[#383a40] mx-1" />
                    <button
                      onClick={handleMirrorOppositeSide}
                      title={
                        activeDirection === 'left'
                          ? 'Espelhar todos os quadros da Esquerda para a Direita'
                          : 'Espelhar todos os quadros da Direita para a Esquerda'
                      }
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#2b2d31] hover:bg-[#383a40] border border-[#383a40] text-indigo-300 hover:text-white text-[11px] font-semibold transition-all cursor-pointer"
                    >
                      <FlipHorizontal className="w-3.5 h-3.5" />
                      <span>Espelhar {activeDirection === 'left' ? 'p/ Direita ➡️' : 'p/ Esquerda ⬅️'}</span>
                    </button>
                  </>
                )}
              </div>

              {/* Row 3: Status & Controls Bar */}
              <div className="flex items-center gap-4 bg-[#18191c]/90 border border-[#383a40] backdrop-blur-md px-4 py-1.5 rounded-2xl text-xs text-slate-400 shadow-lg">
                <span>
                  Pixel: <strong className="text-white">{hoverPixel ? `${hoverPixel.x}, ${hoverPixel.y}` : '-'}</strong>
                </span>

                {showOnionSkin && (
                  <>
                    <div className="w-px h-3 bg-[#383a40]" />
                    <div className="flex items-center gap-2">
                      <span className="text-amber-300">Papel Vegetal:</span>
                      <input
                        type="range"
                        min={0.1}
                        max={0.8}
                        step={0.05}
                        value={onionOpacity}
                        onChange={(e) => setOnionOpacity(parseFloat(e.target.value))}
                        className="w-14 accent-amber-400 cursor-pointer"
                      />
                      <span className="font-mono text-amber-300">{Math.round(onionOpacity * 100)}%</span>
                    </div>
                  </>
                )}

                <div className="w-px h-3 bg-[#383a40]" />
                <div className="text-[11px] text-slate-400 flex items-center gap-2">
                  <span>🖱️ <strong className="text-slate-300">Esq:</strong> Pintar</span>
                  <span>•</span>
                  <span>🖱️ <strong className="text-slate-300">Dir:</strong> Mover Tela</span>
                  <span>•</span>
                  <span>🔍 <strong className="text-slate-300">Ctrl+Scroll:</strong> Zoom</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel: Palette & Live Animation Preview */}
          <div className="w-72 border-l border-[#2b2d31] bg-[#18191c]/80 flex flex-col p-4 gap-4 overflow-y-auto">
            {/* Live Animation Player & Size Previews */}
            <div className="bg-[#2b2d31] border border-[#383a40] rounded-2xl p-3 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                  Pré-visualização {isMultiFrame ? 'Animada' : ''}
                </span>
                {isMultiFrame && (
                  <span className="text-[10px] font-mono font-bold text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded-md border border-blue-500/30">
                    Q{animFrameIndex + 1}/{currentDirectionFrames.length}
                  </span>
                )}
              </div>

              {/* Display 1x and 2x */}
              <div className="flex items-center justify-around bg-[#1e1f22] p-3 rounded-xl border border-[#383a40]/60">
                <div className="flex flex-col items-center gap-1">
                  <div className="w-8 h-8 border border-slate-700 rounded bg-[#18191c] flex items-center justify-center overflow-hidden">
                    {displayPreviewUrl && (
                      <img src={displayPreviewUrl} alt="1x" className="w-8 h-8 [image-rendering:pixelated]" />
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400">1x (32px)</span>
                </div>

                <div className="flex flex-col items-center gap-1">
                  <div className="w-16 h-16 border border-slate-700 rounded-lg bg-[#18191c] flex items-center justify-center overflow-hidden">
                    {displayPreviewUrl && (
                      <img src={displayPreviewUrl} alt="2x" className="w-16 h-16 [image-rendering:pixelated]" />
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400">2x (64px)</span>
                </div>
              </div>

              {/* Animation Play/Pause & Speed Selector */}
              {isMultiFrame && (
                <div className="flex items-center justify-between bg-[#1e1f22] px-2.5 py-1.5 rounded-xl border border-[#383a40]/60 text-xs">
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="flex items-center gap-1 text-slate-200 hover:text-white font-semibold cursor-pointer"
                    title={isPlaying ? 'Pausar Animação' : 'Reproduzir Animação'}
                  >
                    {isPlaying ? (
                      <Pause className="w-3.5 h-3.5 text-amber-400" />
                    ) : (
                      <Play className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                    <span>{isPlaying ? 'Pausar' : 'Play'}</span>
                  </button>

                  <div className="flex items-center gap-1">
                    {[
                      { label: '100ms', val: 100 },
                      { label: '160ms', val: 160 },
                      { label: '250ms', val: 250 },
                    ].map((spd) => (
                      <button
                        key={spd.val}
                        onClick={() => setAnimSpeedMs(spd.val)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                          animSpeedMs === spd.val
                            ? 'bg-blue-500 text-white'
                            : 'text-slate-400 hover:text-white bg-[#2b2d31]'
                        }`}
                        title={`Velocidade de reprodução: ${spd.label}`}
                      >
                        {spd.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 4 Directions Mini Previews */}
              <div className="flex flex-col gap-1.5 mt-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Quadros das 4 Direções
                </span>
                <div className="grid grid-cols-4 gap-1.5 bg-[#1e1f22] p-2 rounded-xl border border-[#383a40]/60">
                  {DIRECTIONS.map((dirItem) => {
                    const frames = directionalFrames[dirItem.id] || []
                    const frameCount = frames.length
                    const thumbUrl =
                      dirItem.id === activeDirection
                        ? previewDataUrl || frames[activeFrameIndex] || frames[0]
                        : frames[0]
                    return (
                      <div
                        key={dirItem.id}
                        onClick={() => switchDirection(dirItem.id)}
                        className={`flex flex-col items-center gap-1 p-1 rounded-lg cursor-pointer border transition-all ${
                          activeDirection === dirItem.id
                            ? 'border-[#3b82f6] bg-[#3b82f6]/10 scale-105'
                            : 'border-transparent hover:bg-[#2b2d31]'
                        }`}
                      >
                        <div className="w-8 h-8 rounded bg-[#18191c] border border-slate-700/60 flex items-center justify-center overflow-hidden relative">
                          {thumbUrl ? (
                            <img
                              src={thumbUrl}
                              alt={dirItem.label}
                              className="w-7 h-7 [image-rendering:pixelated]"
                            />
                          ) : (
                            <span className="text-[11px] opacity-40">{dirItem.icon}</span>
                          )}
                          {frameCount > 1 && (
                            <span className="absolute bottom-0 right-0 bg-blue-600/90 text-[8px] font-bold text-white px-1 rounded-tl">
                              {frameCount}
                            </span>
                          )}
                        </div>
                        <span className="text-[9px] font-semibold text-slate-400">{dirItem.label}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Curated Color Swatches & Color Wheel */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                  Paleta Pixel Art
                </span>
                <button
                  onClick={() => setShowColorWheel(!showColorWheel)}
                  className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                    showColorWheel
                      ? 'bg-[#3b82f6] text-white border-blue-400 shadow-md'
                      : 'bg-[#2b2d31] hover:bg-[#383a40] text-slate-300 border-[#383a40]'
                  }`}
                  title="Abrir Roda de Cores Livre"
                >
                  <span
                    className="w-3 h-3 rounded-full shrink-0 shadow-xs"
                    style={{ background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)' }}
                  />
                  <span>Roda de Cores</span>
                </button>
              </div>

              {showColorWheel && (
                <div className="flex justify-center animate-in fade-in zoom-in-95 duration-150 my-1">
                  <ColorWheelPicker
                    color={color}
                    onChange={(newCol) => {
                      setColor(newCol)
                      if (!recentColors.includes(newCol)) {
                        setRecentColors([newCol, ...recentColors.slice(0, 7)])
                      }
                    }}
                    onClose={() => setShowColorWheel(false)}
                    className="w-full"
                  />
                </div>
              )}

              <div className="grid grid-cols-6 gap-1.5 bg-[#2b2d31] p-2.5 rounded-2xl border border-[#383a40]">
                {PRESET_PALETTE.map((swatch) => (
                  <button
                    key={swatch}
                    onClick={() => {
                      setColor(swatch)
                      if (!recentColors.includes(swatch)) {
                        setRecentColors([swatch, ...recentColors.slice(0, 7)])
                      }
                    }}
                    style={{ backgroundColor: swatch }}
                    className={`w-7 h-7 rounded-lg transition-transform hover:scale-110 aspect-square cursor-pointer ${
                      color.toLowerCase() === swatch.toLowerCase()
                        ? 'ring-2 ring-white scale-105 shadow-md'
                        : 'border border-black/20'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Recent Colors */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Cores Recentes</span>
              <div className="flex gap-1.5 flex-wrap">
                {recentColors.map((rc, idx) => (
                  <button
                    key={`${rc}_${idx}`}
                    onClick={() => setColor(rc)}
                    style={{ backgroundColor: rc }}
                    className={`w-6 h-6 rounded-md transition-transform hover:scale-110 cursor-pointer ${
                      color.toLowerCase() === rc.toLowerCase() ? 'ring-2 ring-white' : 'border border-black/30'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Help / Shortcuts Tip */}
            <div className="mt-auto bg-[#2b2d31]/50 border border-[#383a40]/50 p-3 rounded-xl text-[11px] text-slate-400 flex flex-col gap-1 leading-relaxed">
              <strong className="text-slate-300">💡 Dicas de Animação:</strong>
              <span>• Use <strong>Duplicar</strong> para criar passos de caminhada facilmente.</span>
              <span>• Ative o <strong>Papel Vegetal</strong> para alinhar posições entre quadros.</span>
              <span>• A velocidade padrão do jogo é <strong>160ms</strong> por quadro.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
