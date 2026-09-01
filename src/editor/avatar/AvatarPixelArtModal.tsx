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
  Ghost,
  X,
  Check,
  RotateCcw,
  Sparkles,
  Move,
  Maximize2,
} from 'lucide-react'
import { AvatarRenderer } from '../../engine/AvatarRenderer'
import { DEFAULT_AVATAR } from '../../engine/Constants'
import { AvatarConfig, AvatarComponentSlot, Player } from '../../types/game'

export type DrawTool = 'pencil' | 'eraser' | 'bucket' | 'picker'

interface Props {
  isOpen: boolean
  onClose: () => void
  category: AvatarComponentSlot
  presetName: string
  initialDataUrl?: string
  avatar: AvatarConfig
  onSave: (savedDataUrl: string, name: string) => void
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
  other: 'Acessório Extra',
}

export const AvatarPixelArtModal: React.FC<Props> = ({
  isOpen,
  onClose,
  category,
  presetName,
  initialDataUrl,
  avatar,
  onSave,
}) => {
  if (!isOpen) return null

  const canvasWidth = 32
  const canvasHeight = 32

  // Tools & Styling
  const [tool, setTool] = useState<DrawTool>('pencil')
  const [color, setColor] = useState<string>('#4c6ef5')
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
  const [showGhost, setShowGhost] = useState<boolean>(true)
  const [ghostOpacity, setGhostOpacity] = useState<number>(0.35)
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
  const [previewDataUrl, setPreviewDataUrl] = useState<string>(initialDataUrl || '')

  // Canvas Refs
  const drawCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const ghostCanvasRef = useRef<HTMLCanvasElement | null>(null)

  // Undo / Redo History
  const historyRef = useRef<ImageData[]>([])
  const historyStepRef = useRef<number>(-1)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  // Save current canvas state to history
  const pushHistoryState = useCallback(() => {
    const canvas = drawCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    const dataUrl = canvas.toDataURL('image/png')
    setPreviewDataUrl(dataUrl)

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
  }, [])

  // Render Ghost Guide Underlay (translucent neutral avatar body)
  const renderGhostGuide = useCallback(() => {
    const gCanvas = ghostCanvasRef.current
    if (!gCanvas) return
    const gCtx = gCanvas.getContext('2d')
    if (!gCtx) return

    gCtx.imageSmoothingEnabled = false
    gCtx.clearRect(0, 0, 32, 32)

    const ghostPlayer: Player = {
      id: 'ghost_guide_player',
      name: '',
      x: 0,
      y: 0,
      direction: 'down',
      isMoving: false,
      status: 'available',
      lastUpdated: 0,
      avatar: {
        ...DEFAULT_AVATAR,
        skinTone: avatar.skinTone || '#ffd1a4',
        skinDetail: 'smooth',
        eyeType: avatar.eyeType || 'normal',
        eyeColor: avatar.eyeColor || '#111111',
      },
    }

    AvatarRenderer.drawPlayer(gCtx, ghostPlayer, false, 0, 32, false)
  }, [avatar])

  // Re-draw ghost guide whenever avatar or showGhost changes
  useEffect(() => {
    renderGhostGuide()
  }, [renderGhostGuide, showGhost])

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

  // Load initial artwork onto drawing canvas
  useEffect(() => {
    const canvas = drawCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, 32, 32)

    if (initialDataUrl) {
      const img = new Image()
      img.src = initialDataUrl
      img.onload = () => {
        ctx.clearRect(0, 0, 32, 32)
        ctx.drawImage(img, 0, 0, 32, 32)
        historyRef.current = []
        historyStepRef.current = -1
        pushHistoryState()
      }
    } else {
      historyRef.current = []
      historyStepRef.current = -1
      pushHistoryState()
    }
  }, [initialDataUrl, pushHistoryState])

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
    if (pixel[3] === 0) return // transparent

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
    // Right Click (button === 2) -> Pan Viewport
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

    // Left Click (button === 0) -> Paint
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
    setPreviewDataUrl(canvas.toDataURL('image/png'))
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
    setPreviewDataUrl(canvas.toDataURL('image/png'))
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
    if (!canvas) return
    const dataUrl = canvas.toDataURL('image/png')
    onSave(dataUrl, customName.trim() || `Preset ${CATEGORY_LABELS[category]}`)
    onClose()
  }

  const pixelScale = zoom

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl h-[90vh] max-h-[820px] bg-[#1e1f22] border border-[#383a40] rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2b2d31] bg-[#18191c]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-[#3b82f6]/20 border border-[#3b82f6]/40 flex items-center justify-center text-[#3b82f6]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Estúdio Pixel Art: <span className="text-[#3b82f6]">{CATEGORY_LABELS[category]}</span>
              </h2>
              <p className="text-xs text-slate-400">
                Grade 32x32 com suporte a guia anatômica fantasma e atalhos de desenho.
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
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#3b82f6] hover:bg-[#2563eb] text-white text-xs font-bold shadow-lg shadow-[#3b82f6]/25 transition-all"
            >
              <Check className="w-4 h-4" /> Salvar Preset
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-[#2b2d31] text-slate-400 hover:text-white transition-colors"
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
                className={`p-2.5 rounded-xl transition-all ${
                  tool === 'pencil' ? 'bg-[#3b82f6] text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => setTool('eraser')}
                title="Borracha"
                className={`p-2.5 rounded-xl transition-all ${
                  tool === 'eraser' ? 'bg-[#3b82f6] text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Eraser className="w-4 h-4" />
              </button>
              <button
                onClick={() => setTool('bucket')}
                title="Preencher (Balde)"
                className={`p-2.5 rounded-xl transition-all ${
                  tool === 'bucket' ? 'bg-[#3b82f6] text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                <PaintBucket className="w-4 h-4" />
              </button>
              <button
                onClick={() => setTool('picker')}
                title="Conta-gotas (Pipeta)"
                className={`p-2.5 rounded-xl transition-all ${
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
                className={`p-2.5 rounded-xl transition-all ${
                  canUndo ? 'text-slate-300 hover:bg-[#2b2d31]' : 'text-slate-600 opacity-40 cursor-not-allowed'
                }`}
              >
                <Undo2 className="w-4 h-4" />
              </button>
              <button
                onClick={handleRedo}
                disabled={!canRedo}
                title="Refazer (Ctrl+Y)"
                className={`p-2.5 rounded-xl transition-all ${
                  canRedo ? 'text-slate-300 hover:bg-[#2b2d31]' : 'text-slate-600 opacity-40 cursor-not-allowed'
                }`}
              >
                <Redo2 className="w-4 h-4" />
              </button>
              <button
                onClick={handleClear}
                title="Limpar Grade"
                className="p-2.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-[#2b2d31] transition-all"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            <div className="w-10 h-px bg-[#2b2d31]" />

            {/* Active Color Preview & Picker */}
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
            {/* Stage Controls Float Bar */}
            <div className="absolute top-4 left-6 z-10 flex items-center gap-2 bg-[#18191c]/90 border border-[#383a40] backdrop-blur-md px-3 py-1.5 rounded-2xl shadow-lg">
              <button
                onClick={() => setZoom((z) => Math.max(4, z - 2))}
                className="p-1.5 rounded-lg hover:bg-[#2b2d31] text-slate-400 hover:text-white transition-colors"
                title="Diminuir Zoom (Ctrl + Scroll para baixo)"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono font-bold text-slate-300 min-w-[36px] text-center">{zoom}x</span>
              <button
                onClick={() => setZoom((z) => Math.min(32, z + 2))}
                className="p-1.5 rounded-lg hover:bg-[#2b2d31] text-slate-400 hover:text-white transition-colors"
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
                  className="px-2 py-1 rounded-lg bg-[#2b2d31] hover:bg-[#383a40] text-slate-300 text-[11px] font-semibold transition-all"
                  title="Centralizar e redefinir zoom original"
                >
                  Centralizar
                </button>
              )}

              <button
                onClick={() => setShowGrid(!showGrid)}
                className={`p-1.5 rounded-lg transition-all ${
                  showGrid ? 'bg-[#3b82f6]/20 text-[#3b82f6]' : 'text-slate-400 hover:text-white'
                }`}
                title="Alternar Grade de Pixels"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowGhost(!showGhost)}
                className={`p-1.5 rounded-lg transition-all ${
                  showGhost ? 'bg-[#3b82f6]/20 text-[#3b82f6]' : 'text-slate-400 hover:text-white'
                }`}
                title="Alternar Guia Fantasma do Manequim"
              >
                <Ghost className="w-4 h-4" />
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
              {/* Ghost Guide Canvas (Underlay) - Always in DOM so pixels remain cached */}
              <canvas
                ref={ghostCanvasRef}
                width={32}
                height={32}
                className="absolute inset-0 pointer-events-none"
                style={{
                  width: 32 * pixelScale,
                  height: 32 * pixelScale,
                  imageRendering: 'pixelated',
                  opacity: showGhost ? ghostOpacity : 0,
                  visibility: showGhost ? 'visible' : 'hidden',
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

            {/* Bottom Status Bar with Controls Tip */}
            <div className="absolute bottom-4 z-10 flex items-center gap-4 bg-[#18191c]/90 border border-[#383a40] backdrop-blur-md px-4 py-2 rounded-2xl text-xs text-slate-400 shadow-lg">
              <span>
                Pixel: <strong className="text-white">{hoverPixel ? `${hoverPixel.x}, ${hoverPixel.y}` : '-'}</strong>
              </span>
              <div className="w-px h-3 bg-[#383a40]" />
              <div className="flex items-center gap-2">
                <span>Opacidade Guia:</span>
                <input
                  type="range"
                  min={0.1}
                  max={0.8}
                  step={0.05}
                  value={ghostOpacity}
                  onChange={(e) => setGhostOpacity(parseFloat(e.target.value))}
                  className="w-16 accent-[#3b82f6] cursor-pointer"
                />
                <span className="font-mono text-slate-300">{Math.round(ghostOpacity * 100)}%</span>
              </div>
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

          {/* Right Panel: Palette & Preview */}
          <div className="w-72 border-l border-[#2b2d31] bg-[#18191c]/80 flex flex-col p-4 gap-4 overflow-y-auto">
            {/* Live Size Previews */}
            <div className="bg-[#2b2d31] border border-[#383a40] rounded-2xl p-3 flex flex-col gap-2.5">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Pré-visualização</span>
              <div className="flex items-center justify-around bg-[#1e1f22] p-3 rounded-xl border border-[#383a40]/60">
                <div className="flex flex-col items-center gap-1">
                  <div className="w-8 h-8 border border-slate-700 rounded bg-[#18191c] flex items-center justify-center overflow-hidden">
                    {previewDataUrl && (
                      <img src={previewDataUrl} alt="1x" className="w-8 h-8 [image-rendering:pixelated]" />
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400">1x (32px)</span>
                </div>

                <div className="flex flex-col items-center gap-1">
                  <div className="w-16 h-16 border border-slate-700 rounded-lg bg-[#18191c] flex items-center justify-center overflow-hidden">
                    {previewDataUrl && (
                      <img src={previewDataUrl} alt="2x" className="w-16 h-16 [image-rendering:pixelated]" />
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400">2x (64px)</span>
                </div>
              </div>
            </div>

            {/* Curated Color Swatches */}
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Paleta Pixel Art</span>
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
                    className={`w-7 h-7 rounded-lg transition-transform hover:scale-110 aspect-square ${
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
                    className={`w-6 h-6 rounded-md transition-transform hover:scale-110 ${
                      color.toLowerCase() === rc.toLowerCase() ? 'ring-2 ring-white' : 'border border-black/30'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Help / Shortcuts Tip */}
            <div className="mt-auto bg-[#2b2d31]/50 border border-[#383a40]/50 p-3 rounded-xl text-[11px] text-slate-400 flex flex-col gap-1 leading-relaxed">
              <strong className="text-slate-300">💡 Dicas do Estúdio:</strong>
              <span>• A guia fantasma não é salva na arte final.</span>
              <span>• Use o conta-gotas para capturar tons exatos.</span>
              <span>• A imagem salva é aplicada à camada com 100% de precisão.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
