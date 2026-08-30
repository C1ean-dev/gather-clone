import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  Pencil,
  Eraser,
  PaintBucket,
  Pipette,
  Undo2,
  Redo2,
  Trash2,
  ZoomIn,
  ZoomOut,
  Grid,
  Sparkles,
  ArrowRight,
  Plus,
} from 'lucide-react'
import { CroppedClip } from './CropStudio'

export type DrawTool = 'pencil' | 'eraser' | 'bucket' | 'picker'

interface Props {
  tileWidth: number
  tileHeight: number
  setBoardSizeInTiles: (w: number, h: number) => void
  onAddDrawingToComposition: (clip: CroppedClip) => void
  onSaveDrawingAsClip: (clip: CroppedClip) => void
}

const PRESET_PALETTE = [
  '#000000', '#1e1f22', '#475569', '#94a3b8', '#e2e8f0', '#ffffff',
  '#451a03', '#78350f', '#92400e', '#ffd1a4', '#d4a373', '#b07d62',
  '#e03131', '#ff6b6b', '#ff922b', '#fab005', '#fcc419', '#82c91e',
  '#20c997', '#2f9e44', '#15aabf', '#339af0', '#4c6ef5', '#be4bdb',
]

export const DrawStudio: React.FC<Props> = ({
  tileWidth,
  tileHeight,
  setBoardSizeInTiles,
  onAddDrawingToComposition,
  onSaveDrawingAsClip,
}) => {
  const pixelWidth = tileWidth * 32
  const pixelHeight = tileHeight * 32

  // Active tools
  const [tool, setTool] = useState<DrawTool>('pencil')
  const [color, setColor] = useState<string>('#4c6ef5')
  const [brushSize, setBrushSize] = useState<number>(1)

  // Calculate initial optimal zoom so canvas fits within ~480px (range: 1x to 20x)
  const [zoom, setZoom] = useState<number>(() => {
    const maxDim = Math.max(tileWidth * 32, tileHeight * 32)
    return Math.max(1, Math.min(20, Math.floor(480 / maxDim)))
  })
  const [showGrid, setShowGrid] = useState<boolean>(true)
  const [recentColors, setRecentColors] = useState<string[]>([
    '#4c6ef5',
    '#ffffff',
    '#1e1f22',
    '#e03131',
    '#fab005',
  ])

  // Drawing state
  const [isDrawing, setIsDrawing] = useState<boolean>(false)
  const [lastPixelPos, setLastPixelPos] = useState<{ x: number; y: number } | null>(null)
  const [hoverPixel, setHoverPixel] = useState<{ x: number; y: number } | null>(null)

  // Canvas Refs & Stored Artwork Buffer
  const drawCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const stageContainerRef = useRef<HTMLDivElement | null>(null)
  const savedDataUrlRef = useRef<string | null>(null)
  const prevDimensionsRef = useRef<{ w: number; h: number }>({ w: tileWidth, h: tileHeight })

  // Undo / Redo History
  const historyRef = useRef<ImageData[]>([])
  const historyStepRef = useRef<number>(-1)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  // Auto-fit zoom when tile dimensions change so the artwork is immediately visible (range: 1x to 20x)
  useEffect(() => {
    if (prevDimensionsRef.current.w !== tileWidth || prevDimensionsRef.current.h !== tileHeight) {
      prevDimensionsRef.current = { w: tileWidth, h: tileHeight }
      const maxDim = Math.max(pixelWidth, pixelHeight)
      const calculatedZoom = Math.max(1, Math.min(20, Math.floor(480 / maxDim)))
      setZoom(calculatedZoom)
    }
  }, [tileWidth, tileHeight, pixelWidth, pixelHeight])

  // Ctrl + Wheel to Zoom in / out smoothly from 1x to 20x
  useEffect(() => {
    const el = stageContainerRef.current
    if (!el) return

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        e.stopPropagation()
        if (e.deltaY < 0) {
          setZoom((z) => Math.min(20, z + 1))
        } else if (e.deltaY > 0) {
          setZoom((z) => Math.max(1, z - 1))
        }
      }
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      el.removeEventListener('wheel', onWheel)
    }
  }, [])

  const saveHistoryState = useCallback(() => {
    const canvas = drawCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    savedDataUrlRef.current = canvas.toDataURL('image/png')
    const currentState = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const nextStep = historyStepRef.current + 1

    historyRef.current = historyRef.current.slice(0, nextStep)
    historyRef.current.push(currentState)

    if (historyRef.current.length > 30) {
      historyRef.current.shift()
    } else {
      historyStepRef.current = nextStep
    }

    setCanUndo(historyStepRef.current > 0)
    setCanRedo(historyStepRef.current < historyRef.current.length - 1)
  }, [])

  // Handle canvas sizing and preserve existing content
  useEffect(() => {
    const canvas = drawCanvasRef.current
    if (!canvas) return

    if (canvas.width === pixelWidth && canvas.height === pixelHeight) {
      return
    }

    const previousDataUrl = savedDataUrlRef.current

    canvas.width = pixelWidth
    canvas.height = pixelHeight
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return
    ctx.imageSmoothingEnabled = false

    if (previousDataUrl) {
      const img = new Image()
      img.src = previousDataUrl
      img.onload = () => {
        ctx.imageSmoothingEnabled = false
        ctx.drawImage(img, 0, 0)
        saveHistoryState()
      }
    } else {
      ctx.clearRect(0, 0, pixelWidth, pixelHeight)
      saveHistoryState()
    }
  }, [pixelWidth, pixelHeight, saveHistoryState])

  const handleUndo = () => {
    if (historyStepRef.current <= 0) return
    historyStepRef.current -= 1
    const prevState = historyRef.current[historyStepRef.current]
    const canvas = drawCanvasRef.current
    if (!canvas || !prevState) return
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return
    ctx.putImageData(prevState, 0, 0)
    savedDataUrlRef.current = canvas.toDataURL('image/png')
    setCanUndo(historyStepRef.current > 0)
    setCanRedo(historyStepRef.current < historyRef.current.length - 1)
  }

  const handleRedo = () => {
    if (historyStepRef.current >= historyRef.current.length - 1) return
    historyStepRef.current += 1
    const nextState = historyRef.current[historyStepRef.current]
    const canvas = drawCanvasRef.current
    if (!canvas || !nextState) return
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return
    ctx.putImageData(nextState, 0, 0)
    savedDataUrlRef.current = canvas.toDataURL('image/png')
    setCanUndo(historyStepRef.current > 0)
    setCanRedo(historyStepRef.current < historyRef.current.length - 1)
  }

  const handleClear = () => {
    const canvas = drawCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    savedDataUrlRef.current = null
    saveHistoryState()
  }

  const addRecentColor = (c: string) => {
    setRecentColors((prev) => {
      const filtered = prev.filter((item) => item.toLowerCase() !== c.toLowerCase())
      return [c, ...filtered].slice(0, 10)
    })
  }

  // Get pixel coordinate from mouse event with exact canvas scale
  const getCanvasPixelPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = drawCanvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const px = Math.floor((e.clientX - rect.left) * scaleX)
    const py = Math.floor((e.clientY - rect.top) * scaleY)
    return {
      x: Math.max(0, Math.min(pixelWidth - 1, px)),
      y: Math.max(0, Math.min(pixelHeight - 1, py)),
    }
  }

  // Pixel flood fill algorithm
  const floodFill = (startX: number, startY: number, fillColor: string) => {
    const canvas = drawCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imgData.data
    const width = canvas.width
    const height = canvas.height

    const startIndex = (startY * width + startX) * 4
    const startR = data[startIndex]
    const startG = data[startIndex + 1]
    const startB = data[startIndex + 2]
    const startA = data[startIndex + 3]

    // Convert fillColor to RGBA
    const tempEl = document.createElement('div')
    tempEl.style.color = fillColor
    document.body.appendChild(tempEl)
    const computed = window.getComputedStyle(tempEl).color
    document.body.removeChild(tempEl)
    const rgbMatch = computed.match(/\d+/g)
    if (!rgbMatch) return
    const fillR = parseInt(rgbMatch[0], 10)
    const fillG = parseInt(rgbMatch[1], 10)
    const fillB = parseInt(rgbMatch[2], 10)
    const fillA = 255

    if (startR === fillR && startG === fillG && startB === fillB && startA === fillA) return

    const queue: [number, number][] = [[startX, startY]]
    const visited = new Uint8Array(width * height)

    while (queue.length > 0) {
      const [cx, cy] = queue.pop()!
      const idx = (cy * width + cx) * 4
      const pIdx = cy * width + cx

      if (visited[pIdx]) continue
      visited[pIdx] = 1

      if (
        data[idx] === startR &&
        data[idx + 1] === startG &&
        data[idx + 2] === startB &&
        data[idx + 3] === startA
      ) {
        data[idx] = fillR
        data[idx + 1] = fillG
        data[idx + 2] = fillB
        data[idx + 3] = fillA

        if (cx > 0) queue.push([cx - 1, cy])
        if (cx < width - 1) queue.push([cx + 1, cy])
        if (cy > 0) queue.push([cx, cy - 1])
        if (cy < height - 1) queue.push([cx, cy + 1])
      }
    }

    ctx.putImageData(imgData, 0, 0)
    saveHistoryState()
  }

  // Draw a pixel brush stamp
  const drawBrush = (ctx: CanvasRenderingContext2D, px: number, py: number, erase: boolean = false) => {
    const half = Math.floor(brushSize / 2)
    const startX = px - half
    const startY = py - half
    if (erase) {
      ctx.clearRect(startX, startY, brushSize, brushSize)
    } else {
      ctx.fillStyle = color
      ctx.fillRect(startX, startY, brushSize, brushSize)
    }
  }

  // Bresenham's line algorithm for continuous smooth brush strokes
  const drawLine = (
    ctx: CanvasRenderingContext2D,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    erase: boolean = false
  ) => {
    const dx = Math.abs(x1 - x0)
    const dy = Math.abs(y1 - y0)
    const sx = x0 < x1 ? 1 : -1
    const sy = y0 < y1 ? 1 : -1
    let err = dx - dy

    let currX = x0
    let currY = y0

    while (true) {
      drawBrush(ctx, currX, currY, erase)
      if (currX === x1 && currY === y1) break
      const e2 = 2 * err
      if (e2 > -dy) {
        err -= dy
        currX += sx
      }
      if (e2 < dx) {
        err += dx
        currY += sy
      }
    }
  }

  // Mouse Handlers on Drawing Canvas
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasPixelPos(e)
    const canvas = drawCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    if (tool === 'picker') {
      const pixel = ctx.getImageData(x, y, 1, 1).data
      if (pixel[3] > 0) {
        const hex = `#${((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2])
          .toString(16)
          .slice(1)}`
        setColor(hex)
        addRecentColor(hex)
        setTool('pencil')
      }
      return
    }

    if (tool === 'bucket') {
      floodFill(x, y, color)
      addRecentColor(color)
      return
    }

    setIsDrawing(true)
    setLastPixelPos({ x, y })

    if (tool === 'pencil') {
      drawBrush(ctx, x, y, false)
      addRecentColor(color)
    } else if (tool === 'eraser') {
      drawBrush(ctx, x, y, true)
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasPixelPos(e)
    setHoverPixel({ x, y })

    if (!isDrawing || !drawCanvasRef.current) return
    const ctx = drawCanvasRef.current.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    const lastX = lastPixelPos ? lastPixelPos.x : x
    const lastY = lastPixelPos ? lastPixelPos.y : y

    if (tool === 'pencil') {
      drawLine(ctx, lastX, lastY, x, y, false)
    } else if (tool === 'eraser') {
      drawLine(ctx, lastX, lastY, x, y, true)
    }

    setLastPixelPos({ x, y })
  }

  const handleMouseUp = () => {
    if (!isDrawing) return
    setIsDrawing(false)
    setLastPixelPos(null)
    saveHistoryState()
  }

  // Export artwork as a CroppedClip
  const createClipFromDrawing = (): CroppedClip | null => {
    const canvas = drawCanvasRef.current
    if (!canvas) return null
    const dataUrl = canvas.toDataURL('image/png')
    const id = `draw_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
    return {
      id,
      name: `Desenho (${tileWidth}x${tileHeight} tiles)`,
      dataUrl,
      width: pixelWidth,
      height: pixelHeight,
    }
  }

  const handleSendToComposition = () => {
    const clip = createClipFromDrawing()
    if (clip) {
      onAddDrawingToComposition(clip)
    }
  }

  const handleSaveToClips = () => {
    const clip = createClipFromDrawing()
    if (clip) {
      onSaveDrawingAsClip(clip)
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#12151d] rounded-2xl border border-[#2b2d31] overflow-hidden select-none">
      {/* Top Toolbar: Tile Dimensions & Drawing Tools */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#2b2d31] bg-[#18191c]/80 shrink-0 gap-3 flex-wrap">
        {/* Typeable Tile Dimensions */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-300">Tamanho no Mapa:</span>
          <div className="flex items-center gap-2 bg-[#12151d] px-2.5 py-1 rounded-xl border border-[#2b2d31]">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-400 font-semibold">Largura:</span>
              <input
                type="number"
                min={1}
                max={10}
                value={tileWidth}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10)
                  if (!isNaN(val)) {
                    setBoardSizeInTiles(val, tileHeight)
                  }
                }}
                className="w-12 bg-[#18191c] border border-[#2b2d31] rounded-lg px-1.5 py-0.5 text-xs font-bold text-center text-white focus:outline-none focus:border-indigo-500"
              />
              <span className="text-[10px] text-slate-400 font-mono">({tileWidth * 32}px)</span>
            </div>

            <span className="text-slate-600 font-bold">×</span>

            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-400 font-semibold">Altura:</span>
              <input
                type="number"
                min={1}
                max={10}
                value={tileHeight}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10)
                  if (!isNaN(val)) {
                    setBoardSizeInTiles(tileWidth, val)
                  }
                }}
                className="w-12 bg-[#18191c] border border-[#2b2d31] rounded-lg px-1.5 py-0.5 text-xs font-bold text-center text-white focus:outline-none focus:border-indigo-500"
              />
              <span className="text-[10px] text-slate-400 font-mono">({tileHeight * 32}px)</span>
            </div>
          </div>
        </div>

        {/* Drawing Tools */}
        <div className="flex items-center gap-1.5">
          <div className="flex bg-[#12151d] p-1 rounded-xl border border-[#2b2d31]">
            <button
              type="button"
              onClick={() => setTool('pencil')}
              className={`px-3 py-1 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all ${
                tool === 'pencil'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Pincel de Pixels"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Pincel</span>
            </button>

            <button
              type="button"
              onClick={() => setTool('eraser')}
              className={`px-3 py-1 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all ${
                tool === 'eraser'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Borracha de Pixels"
            >
              <Eraser className="w-3.5 h-3.5" />
              <span>Borracha</span>
            </button>

            <button
              type="button"
              onClick={() => setTool('bucket')}
              className={`px-3 py-1 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all ${
                tool === 'bucket'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Balde de Preenchimento"
            >
              <PaintBucket className="w-3.5 h-3.5" />
              <span>Balde</span>
            </button>

            <button
              type="button"
              onClick={() => setTool('picker')}
              className={`px-3 py-1 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all ${
                tool === 'picker'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Conta-Gotas"
            >
              <Pipette className="w-3.5 h-3.5" />
              <span>Gotas</span>
            </button>
          </div>

          {/* Brush Size */}
          <div className="flex items-center gap-1 bg-[#12151d] p-1 rounded-xl border border-[#2b2d31]">
            {[1, 2, 3].map((sz) => (
              <button
                key={sz}
                type="button"
                onClick={() => setBrushSize(sz)}
                className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold transition-colors ${
                  brushSize === sz
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {sz}px
              </button>
            ))}
          </div>

          {/* History / Clear */}
          <div className="flex items-center gap-1 bg-[#12151d] p-1 rounded-xl border border-[#2b2d31]">
            <button
              type="button"
              onClick={handleUndo}
              disabled={!canUndo}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-100 disabled:opacity-30 transition-colors"
              title="Desfazer"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handleRedo}
              disabled={!canRedo}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-100 disabled:opacity-30 transition-colors"
              title="Refazer"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-lg text-rose-400 hover:text-rose-200 transition-colors"
              title="Limpar Tela"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Zoom & Grid */}
          <div className="flex items-center gap-1 bg-[#12151d] p-1 rounded-xl border border-[#2b2d31]">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(1, z - 1))}
              className="p-1 rounded text-slate-400 hover:text-white"
              title="Diminuir Zoom"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>

            <span
              className="text-[11px] font-mono font-bold text-slate-300 px-1 cursor-help"
              title="Ctrl + Roda do Mouse para controlar o zoom (1x a 20x)"
            >
              {zoom}x
            </span>

            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(20, z + 1))}
              className="p-1 rounded text-slate-400 hover:text-white"
              title="Aumentar Zoom"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setShowGrid((g) => !g)}
              className={`p-1 rounded text-xs font-bold transition-colors ${
                showGrid ? 'bg-indigo-600/40 text-indigo-300' : 'text-slate-400 hover:text-white'
              }`}
              title="Grade"
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Drawing Area & Palette */}
      <div className="flex flex-1 gap-3 overflow-hidden p-3">
        {/* Canvas Stage with Ctrl+Wheel Zoom Support */}
        <div
          ref={stageContainerRef}
          className="flex-1 bg-[#090b10] rounded-2xl border border-[#26282e] flex items-center justify-center overflow-auto p-4 relative shadow-inner"
        >
          <div
            className="relative shadow-2xl rounded overflow-hidden"
            style={{
              width: `${pixelWidth * zoom}px`,
              height: `${pixelHeight * zoom}px`,
              boxShadow: '0 0 0 2px rgba(99, 102, 241, 0.4), 0 20px 25px -5px rgba(0, 0, 0, 0.5)',
              backgroundImage:
                'repeating-conic-gradient(#181d28 0% 25%, #12151d 0% 50%) 50% / 16px 16px',
            }}
          >
            {/* Active Drawing Canvas */}
            <canvas
              ref={drawCanvasRef}
              width={pixelWidth}
              height={pixelHeight}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className="cursor-crosshair block"
              style={{
                width: `${pixelWidth * zoom}px`,
                height: `${pixelHeight * zoom}px`,
                imageRendering: 'pixelated',
              }}
            />

            {/* Pixel Grid Lines Overlay */}
            {showGrid && zoom >= 6 && (
              <div
                className="absolute inset-0 pointer-events-none opacity-25"
                style={{
                  backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.4) 1px, transparent 1px)`,
                  backgroundSize: `${zoom}px ${zoom}px`,
                }}
              />
            )}

            {/* Tile 32px Border Overlay */}
            {showGrid && (
              <div
                className="absolute inset-0 pointer-events-none opacity-70"
                style={{
                  backgroundImage: `linear-gradient(to right, rgba(76,110,245,0.8) 1.5px, transparent 1.5px), linear-gradient(to bottom, rgba(76,110,245,0.8) 1.5px, transparent 1.5px)`,
                  backgroundSize: `${32 * zoom}px ${32 * zoom}px`,
                }}
              />
            )}

            {/* Hover Cursor Pixel Marker */}
            {hoverPixel && (
              <div
                className="absolute pointer-events-none border border-amber-300 ring-1 ring-black/80"
                style={{
                  left: `${(hoverPixel.x - Math.floor(brushSize / 2)) * zoom}px`,
                  top: `${(hoverPixel.y - Math.floor(brushSize / 2)) * zoom}px`,
                  width: `${brushSize * zoom}px`,
                  height: `${brushSize * zoom}px`,
                  backgroundColor: tool === 'eraser' ? 'rgba(239, 68, 68, 0.4)' : `${color}88`,
                }}
              />
            )}
          </div>
        </div>

        {/* Right Palette Sidebar */}
        <div className="w-56 bg-[#18191c] rounded-2xl border border-[#2b2d31] p-3 flex flex-col gap-3 shrink-0 overflow-y-auto">
          {/* Active Color Preview & HTML5 Color Picker */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-300">Cor Ativa</label>
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-xl border-2 border-white/40 shadow-md shrink-0"
                style={{ backgroundColor: color }}
              />
              <input
                type="color"
                value={color}
                onChange={(e) => {
                  setColor(e.target.value)
                  addRecentColor(e.target.value)
                }}
                className="w-full h-8 bg-[#12151d] rounded-lg border border-[#2b2d31] cursor-pointer p-0.5"
              />
            </div>
          </div>

          {/* Preset Pixel Art Palette */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-400">Paleta Clássica</label>
            <div className="grid grid-cols-6 gap-1.5">
              {PRESET_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setColor(c)
                    addRecentColor(c)
                  }}
                  className={`w-6 h-6 rounded-md border transition-transform ${
                    color.toLowerCase() === c.toLowerCase()
                      ? 'scale-115 border-white ring-2 ring-indigo-500 shadow-md'
                      : 'border-white/15 hover:scale-110'
                  }`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          </div>

          {/* Recent Colors */}
          {recentColors.length > 0 && (
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400">Cores Recentes</label>
              <div className="flex flex-wrap gap-1.5">
                {recentColors.map((c, i) => (
                  <button
                    key={`${c}-${i}`}
                    type="button"
                    onClick={() => setColor(c)}
                    className="w-5 h-5 rounded border border-white/20 hover:scale-110 transition-transform"
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Bottom Actions */}
          <div className="mt-auto pt-3 border-t border-[#2b2d31] space-y-2">
            <button
              type="button"
              onClick={handleSendToComposition}
              className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Enviar para Montagem</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handleSaveToClips}
              className="w-full py-1.5 px-3 rounded-xl bg-[#26282e] hover:bg-[#32353b] text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Salvar na Biblioteca</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
