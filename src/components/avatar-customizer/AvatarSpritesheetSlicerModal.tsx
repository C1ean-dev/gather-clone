import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  X,
  Scissors,
  Download,
  Check,
  Plus,
  Trash2,
  ZoomIn,
  ZoomOut,
  Grid,
  FlipHorizontal,
  FileCode,
  CheckCircle,
  Play,
  Pause,
  Layers,
  Sparkles,
  Maximize2,
} from 'lucide-react'
import { AvatarComponentSlot, Direction } from '../../types/game'
import { CustomAsset } from '../../types/customAsset'
import { useCustomAssetsStore } from '../../store/useCustomAssetsStore'
import { generateSparrowXml, downloadFile, PackedSubTexture } from '../../engine/avatar/avatarAtlasExporter'
import { cropContentDataUrl } from '../../engine/avatar/avatarBakeService'
import { applyBackgroundRemoval, RGBColor } from '../../utils/imageTransparency'

export interface SlicedFrameSlot {
  x: number
  y: number
  w?: number
  h?: number
  dataUrl: string
}

export interface SlicedPreset {
  id: string
  name: string
  directions: Record<Direction, SlicedFrameSlot[]>
}

interface Props {
  isOpen: boolean
  onClose: () => void
  imageSrc: string
  imageFileName?: string
  category: AvatarComponentSlot
  onSaveComplete?: (createdAssets: CustomAsset[], xmlContent: string) => void
}

const CATEGORY_LABELS: Record<AvatarComponentSlot, string> = {
  hair: 'Cabelo',
  top: 'Parte de Cima',
  jacket: 'Jaqueta',
  bottom: 'Parte de Baixo',
  shoes: 'Sapatos',
  hat: 'Chapéu / Laço',
  glasses: 'Óculos',
  facialHair: 'Pelos Faciais',
  eyes: 'Olhos',
  skin: 'Maquiagem',
  other: 'Personagem',
}

const DIRECTIONS: { id: Direction; label: string; icon: string }[] = [
  { id: 'down', label: 'Frente', icon: '⬇️' },
  { id: 'up', label: 'Costas', icon: '⬆️' },
  { id: 'left', label: 'Esquerda', icon: '⬅️' },
  { id: 'right', label: 'Direita', icon: '➡️' },
]

const BG_COLOR_PRESETS = [
  { label: 'Escuro', hex: '#21232a' },
  { label: 'Verde', hex: '#00ff00' },
  { label: 'Magenta', hex: '#ff00ff' },
  { label: 'Branco', hex: '#ffffff' },
  { label: 'Preto', hex: '#000000' },
  { label: 'Azul Claro', hex: '#00ffff' },
]

function hexToRgb(hex: string): RGBColor {
  const clean = hex.replace('#', '')
  const bigint = parseInt(clean, 16)
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  }
}

export const AvatarSpritesheetSlicerModal: React.FC<Props> = ({
  isOpen,
  onClose,
  imageSrc,
  imageFileName = 'spritesheet.png',
  category,
  onSaveComplete,
}) => {
  const [sourceImg, setSourceImg] = useState<HTMLImageElement | null>(null)
  const [zoom, setZoom] = useState<number>(2)
  const [showGrid, setShowGrid] = useState<boolean>(true)
  const [gridSnapSize, setGridSnapSize] = useState<number>(16) // Supports 8, 16, 24, 32 or custom sizes

  // Background Removal State
  const [enableBgRemoval, setEnableBgRemoval] = useState<boolean>(true)
  const [targetColorHex, setTargetColorHex] = useState<string>('#21232a')
  const [tolerance, setTolerance] = useState<number>(25)

  // Selection Box (supports any pixel size, smaller than 32x32)
  const [selection, setSelection] = useState<{ x: number; y: number; w: number; h: number }>({
    x: 0,
    y: 0,
    w: 16,
    h: 16,
  })
  const [selectedRegionDataUrl, setSelectedRegionDataUrl] = useState<string>('')

  // Drag-Selection State
  const isSelectingRef = useRef<boolean>(false)
  const selectionStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })

  // Panning State
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState<boolean>(false)
  const panStartRef = useRef<{ mouseX: number; mouseY: number; startX: number; startY: number }>({
    mouseX: 0,
    mouseY: 0,
    startX: 0,
    startY: 0,
  })
  const stageRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  // Presets List with Multi-Frame Support per Direction
  const [presets, setPresets] = useState<SlicedPreset[]>([
    {
      id: `preset_${Date.now()}`,
      name: `${CATEGORY_LABELS[category]} 1`,
      directions: {
        down: [],
        up: [],
        left: [],
        right: [],
      },
    },
  ])
  const [activePresetIndex, setActivePresetIndex] = useState<number>(0)
  const [activeDirectionTab, setActiveDirectionTab] = useState<Direction>('down')
  const [showXmlModal, setShowXmlModal] = useState<boolean>(false)
  const [savedSuccessCount, setSavedSuccessCount] = useState<number | null>(null)

  // Walk Cycle Animation Preview State
  const [isPlayingWalk, setIsPlayingWalk] = useState<boolean>(true)
  const [walkTick, setWalkTick] = useState<number>(0)

  // Extract and process any rectangular region from source image
  const sliceRegion = useCallback(
    (img: HTMLImageElement, x: number, y: number, w: number, h: number): string => {
      if (typeof document === 'undefined') return ''
      const safeW = Math.max(1, Math.floor(w))
      const safeH = Math.max(1, Math.floor(h))
      const canvas = document.createElement('canvas')
      canvas.width = safeW
      canvas.height = safeH
      const ctx = canvas.getContext('2d')
      if (!ctx) return ''
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(img, x, y, safeW, safeH, 0, 0, safeW, safeH)

      let resultCanvas: HTMLCanvasElement = canvas
      if (enableBgRemoval) {
        const rgb = hexToRgb(targetColorHex)
        resultCanvas = applyBackgroundRemoval(canvas, rgb, tolerance, true)
      }

      const dataUrl = resultCanvas.toDataURL('image/png')
      setSelectedRegionDataUrl(dataUrl)
      return dataUrl
    },
    [enableBgRemoval, targetColorHex, tolerance]
  )

  // Load Source Image
  useEffect(() => {
    if (!imageSrc) return
    const img = new Image()
    img.src = imageSrc
    img.onload = () => {
      setSourceImg(img)
      sliceRegion(img, 0, 0, 16, 16)
    }
  }, [imageSrc, sliceRegion])

  // Re-slice when background removal params change
  useEffect(() => {
    if (sourceImg) {
      sliceRegion(sourceImg, selection.x, selection.y, selection.w, selection.h)
    }
  }, [enableBgRemoval, targetColorHex, tolerance, sourceImg, selection, sliceRegion])

  // Walk Cycle Loop Timer
  useEffect(() => {
    if (!isPlayingWalk) {
      setWalkTick(0)
      return
    }
    const interval = setInterval(() => {
      setWalkTick((t) => (t + 1) % 1000)
    }, 180)
    return () => clearInterval(interval)
  }, [isPlayingWalk])

  // Render Spritesheet on Canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !sourceImg) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = sourceImg.naturalWidth || sourceImg.width
    canvas.height = sourceImg.naturalHeight || sourceImg.height

    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(sourceImg, 0, 0)

    // Draw Grid with configurable snap size (8, 16, 24, 32, etc.)
    if (showGrid && gridSnapSize > 0) {
      ctx.lineWidth = 1
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)'

      for (let x = 0; x <= canvas.width; x += gridSnapSize) {
        ctx.beginPath()
        ctx.moveTo(x + 0.5, 0)
        ctx.lineTo(x + 0.5, canvas.height)
        ctx.stroke()
      }

      for (let y = 0; y <= canvas.height; y += gridSnapSize) {
        ctx.beginPath()
        ctx.moveTo(0, y + 0.5)
        ctx.lineTo(canvas.width, y + 0.5)
        ctx.stroke()
      }
    }

    // Draw assigned markers for active preset
    const activePreset = presets[activePresetIndex]
    if (activePreset) {
      DIRECTIONS.forEach(({ id: dir }) => {
        const frames = activePreset.directions[dir] || []
        frames.forEach((frame, idx) => {
          const fw = frame.w || 16
          const fh = frame.h || 16
          ctx.fillStyle = dir === activeDirectionTab ? 'rgba(59, 130, 246, 0.35)' : 'rgba(16, 185, 129, 0.3)'
          ctx.fillRect(frame.x, frame.y, fw, fh)
          ctx.strokeStyle = dir === activeDirectionTab ? '#60a5fa' : '#10b981'
          ctx.lineWidth = 2
          ctx.strokeRect(frame.x + 0.5, frame.y + 0.5, fw - 1, fh - 1)

          // Direction and frame index badge
          ctx.fillStyle = dir === activeDirectionTab ? '#3b82f6' : '#10b981'
          ctx.fillRect(frame.x, frame.y, 24, 11)
          ctx.fillStyle = '#ffffff'
          ctx.font = 'bold 8px sans-serif'
          ctx.fillText(`${dir[0].toUpperCase()}${idx}`, frame.x + 2, frame.y + 9)
        })
      })
    }

    // Draw highlighted selection box
    ctx.lineWidth = 2
    ctx.strokeStyle = '#f59e0b'
    ctx.fillStyle = 'rgba(245, 158, 11, 0.22)'
    ctx.fillRect(selection.x, selection.y, selection.w, selection.h)
    ctx.strokeRect(selection.x + 0.5, selection.y + 0.5, selection.w - 1, selection.h - 1)

    // Selection dimension tag overlay
    const tagText = `${selection.w}×${selection.h}px`
    ctx.fillStyle = '#f59e0b'
    const tagW = tagText.length * 6.2 + 8
    const tagY = Math.max(0, selection.y - 14)
    ctx.fillRect(selection.x, tagY, tagW, 13)
    ctx.fillStyle = '#000000'
    ctx.font = 'bold 8px sans-serif'
    ctx.fillText(tagText, selection.x + 4, tagY + 9)
  }, [sourceImg, showGrid, gridSnapSize, selection, presets, activePresetIndex, activeDirectionTab])

  // Handle Canvas Mouse Down (Left click = Drag Select, Right click = Pan)
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!sourceImg) return
    const canvas = canvasRef.current
    if (!canvas) return

    if (e.button === 2 || e.button === 1) {
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
      const rect = canvas.getBoundingClientRect()
      const scaleX = canvas.width / rect.width
      const scaleY = canvas.height / rect.height

      const clientX = (e.clientX - rect.left) * scaleX
      const clientY = (e.clientY - rect.top) * scaleY

      const snap = Math.max(1, gridSnapSize)
      const tileX = Math.max(0, Math.min(canvas.width - snap, Math.floor(clientX / snap) * snap))
      const tileY = Math.max(0, Math.min(canvas.height - snap, Math.floor(clientY / snap) * snap))

      isSelectingRef.current = true
      selectionStartRef.current = { x: tileX, y: tileY }

      const currentW = Math.max(4, Math.min(selection.w || snap, canvas.width - tileX))
      const currentH = Math.max(4, Math.min(selection.h || snap, canvas.height - tileY))

      setSelection({ x: tileX, y: tileY, w: currentW, h: currentH })
      sliceRegion(sourceImg, tileX, tileY, currentW, currentH)
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      const dx = e.clientX - panStartRef.current.mouseX
      const dy = e.clientY - panStartRef.current.mouseY
      setPanOffset({
        x: panStartRef.current.startX + dx,
        y: panStartRef.current.startY + dy,
      })
      return
    }

    if (isSelectingRef.current && sourceImg) {
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const scaleX = canvas.width / rect.width
      const scaleY = canvas.height / rect.height

      const clientX = (e.clientX - rect.left) * scaleX
      const clientY = (e.clientY - rect.top) * scaleY

      const snap = Math.max(1, gridSnapSize)
      const curTileX = Math.max(0, Math.min(canvas.width - snap, Math.floor(clientX / snap) * snap))
      const curTileY = Math.max(0, Math.min(canvas.height - snap, Math.floor(clientY / snap) * snap))

      const minX = Math.min(selectionStartRef.current.x, curTileX)
      const minY = Math.min(selectionStartRef.current.y, curTileY)
      const maxX = Math.max(selectionStartRef.current.x, curTileX) + snap
      const maxY = Math.max(selectionStartRef.current.y, curTileY) + snap

      const newW = maxX - minX
      const newH = maxY - minY

      setSelection({ x: minX, y: minY, w: newW, h: newH })
    }
  }

  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false)
    }
    if (isSelectingRef.current && sourceImg) {
      isSelectingRef.current = false
      sliceRegion(sourceImg, selection.x, selection.y, selection.w, selection.h)
    }
  }

  // Adjust selection dimensions to exact pixel sizes (smaller than 32x32 supported!)
  const setExactDimensions = (w: number, h: number) => {
    if (!sourceImg) return
    const maxW = sourceImg.naturalWidth - selection.x
    const maxH = sourceImg.naturalHeight - selection.y
    const targetW = Math.max(4, Math.min(w, maxW))
    const targetH = Math.max(4, Math.min(h, maxH))

    const updated = {
      ...selection,
      w: targetW,
      h: targetH,
    }
    setSelection(updated)
    sliceRegion(sourceImg, updated.x, updated.y, updated.w, updated.h)
  }

  // Add individual blocks sequentially (Walk Cycle)
  const handleAddSequentialFrames = (dir: Direction) => {
    if (!sourceImg) return
    const step = Math.max(4, gridSnapSize)
    const cols = Math.max(1, Math.round(selection.w / step))
    const rows = Math.max(1, Math.round(selection.h / step))

    const newFrames: SlicedFrameSlot[] = []

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const bx = selection.x + c * step
        const by = selection.y + r * step
        const dataUrl = sliceRegion(sourceImg, bx, by, step, step)
        newFrames.push({
          x: bx,
          y: by,
          w: step,
          h: step,
          dataUrl,
        })
      }
    }

    setPresets((prev) => {
      const updated = [...prev]
      const current = { ...updated[activePresetIndex] }
      const existing = current.directions[dir] || []
      current.directions = {
        ...current.directions,
        [dir]: [...existing, ...newFrames],
      }
      updated[activePresetIndex] = current
      return updated
    })
  }

  // Add entire selection as 1 composite frame
  const handleAddCompositeFrame = (dir: Direction) => {
    if (!sourceImg) return
    const dataUrl = sliceRegion(sourceImg, selection.x, selection.y, selection.w, selection.h)

    setPresets((prev) => {
      const updated = [...prev]
      const current = { ...updated[activePresetIndex] }
      const existing = current.directions[dir] || []
      current.directions = {
        ...current.directions,
        [dir]: [
          ...existing,
          {
            x: selection.x,
            y: selection.y,
            w: selection.w,
            h: selection.h,
            dataUrl,
          },
        ],
      }
      updated[activePresetIndex] = current
      return updated
    })
  }

  // Remove a frame from a direction
  const handleRemoveDirectionFrame = (dir: Direction, frameIndex: number) => {
    setPresets((prev) => {
      const updated = [...prev]
      const current = { ...updated[activePresetIndex] }
      const existing = current.directions[dir] || []
      current.directions = {
        ...current.directions,
        [dir]: existing.filter((_, idx) => idx !== frameIndex),
      }
      updated[activePresetIndex] = current
      return updated
    })
  }

  // Mirror lateral direction (Left <-> Right)
  const handleMirrorLateral = (fromDir: 'left' | 'right', toDir: 'left' | 'right') => {
    const currentPreset = presets[activePresetIndex]
    const sourceFrames = currentPreset?.directions[fromDir] || []
    if (sourceFrames.length === 0) return

    const mirroredFrames: SlicedFrameSlot[] = sourceFrames.map((f) => {
      const canvas = document.createElement('canvas')
      const fw = f.w || 16
      const fh = f.h || 16
      canvas.width = fw
      canvas.height = fh
      const ctx = canvas.getContext('2d')
      if (!ctx) return f

      const img = new Image()
      img.src = f.dataUrl
      ctx.imageSmoothingEnabled = false
      ctx.translate(fw, 0)
      ctx.scale(-1, 1)
      ctx.drawImage(img, 0, 0)

      return {
        x: f.x,
        y: f.y,
        w: fw,
        h: fh,
        dataUrl: canvas.toDataURL('image/png'),
      }
    })

    setPresets((prev) => {
      const updated = [...prev]
      const current = { ...updated[activePresetIndex] }
      current.directions = {
        ...current.directions,
        [toDir]: mirroredFrames,
      }
      updated[activePresetIndex] = current
      return updated
    })
  }

  // Add new preset
  const handleAddNewPreset = () => {
    const newIdx = presets.length + 1
    const newPreset: SlicedPreset = {
      id: `preset_${Date.now()}_${newIdx}`,
      name: `${CATEGORY_LABELS[category]} ${newIdx}`,
      directions: {
        down: [],
        up: [],
        left: [],
        right: [],
      },
    }
    setPresets([...presets, newPreset])
    setActivePresetIndex(presets.length)
  }

  // Remove preset
  const handleRemovePreset = (idx: number) => {
    if (presets.length <= 1) return
    const next = presets.filter((_, i) => i !== idx)
    setPresets(next)
    setActivePresetIndex(Math.max(0, idx - 1))
  }

  // Generate Sparrow XML
  const generateXmlString = (): string => {
    const subTextures: PackedSubTexture[] = []
    const imagePath = imageFileName.endsWith('.png') ? imageFileName : `${category}.png`

    presets.forEach((preset) => {
      const cleanName = (preset.name || 'custom').toLowerCase().replace(/[^a-z0-9]/g, '_')
      DIRECTIONS.forEach(({ id: dir }) => {
        const frames = preset.directions[dir] || []
        frames.forEach((frame, idx) => {
          subTextures.push({
            name: `${category}_${cleanName}_${dir}_${idx}`,
            x: frame.x,
            y: frame.y,
            width: frame.w || 16,
            height: frame.h || 16,
          })
        })
      })
    })

    return generateSparrowXml(imagePath, subTextures)
  }

  // Download Generated XML
  const handleDownloadXml = () => {
    const xml = generateXmlString()
    const xmlFileName = imageFileName.replace(/\.[^/.]+$/, '') + '.xml'
    downloadFile(xmlFileName, xml, 'application/xml')
  }

  // Save Presets into Store
  const handleSaveAndEquip = async () => {
    const createdAssets: CustomAsset[] = []
    const store = useCustomAssetsStore.getState()

    for (const p of presets) {
      const directionalFrames: Record<Direction, string | string[]> = {
        down: '',
        up: '',
        left: '',
        right: '',
      }

      const allFramesList: string[] = []

      DIRECTIONS.forEach(({ id: dir }) => {
        const fList = p.directions[dir] || []
        if (fList.length === 1) {
          directionalFrames[dir] = fList[0].dataUrl
          allFramesList.push(fList[0].dataUrl)
        } else if (fList.length > 1) {
          directionalFrames[dir] = fList.map((f) => f.dataUrl)
          allFramesList.push(...fList.map((f) => f.dataUrl))
        }
      })

      if (allFramesList.length === 0) continue

      const firstDown = Array.isArray(directionalFrames.down)
        ? directionalFrames.down[0]
        : directionalFrames.down || allFramesList[0]

      const thumbnail = await cropContentDataUrl(firstDown)

      const asset: CustomAsset = {
        id: `avatar_${category}_sliced_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: p.name.trim() || `Preset ${CATEGORY_LABELS[category]}`,
        type: 'avatar',
        category: 'Avatares',
        avatarSlot: category,
        thumbnail,
        width: Math.max(1, Math.ceil(selection.w / 32)),
        height: Math.max(1, Math.ceil(selection.h / 32)),
        isObstacle: false,
        frames: [
          Array.isArray(directionalFrames.down) ? directionalFrames.down[0] : (directionalFrames.down || ''),
          Array.isArray(directionalFrames.up) ? directionalFrames.up[0] : (directionalFrames.up || ''),
          Array.isArray(directionalFrames.left) ? directionalFrames.left[0] : (directionalFrames.left || ''),
          Array.isArray(directionalFrames.right) ? directionalFrames.right[0] : (directionalFrames.right || ''),
        ],
        directionalFrames,
        frameRateMs: 160,
        createdAt: Date.now(),
      }

      store.addCustomAsset(asset)
      createdAssets.push(asset)
    }

    setSavedSuccessCount(createdAssets.length)
    if (onSaveComplete) {
      onSaveComplete(createdAssets, generateXmlString())
    }

    setTimeout(() => {
      onClose()
    }, 1200)
  }

  if (!isOpen) return null

  const activePreset = presets[activePresetIndex]
  const activeDirectionFrames = activePreset?.directions[activeDirectionTab] || []

  // Current active frame in animated preview
  const currentPreviewFrame =
    activeDirectionFrames.length > 0
      ? isPlayingWalk
        ? activeDirectionFrames[walkTick % activeDirectionFrames.length]?.dataUrl
        : activeDirectionFrames[0]?.dataUrl
      : selectedRegionDataUrl

  // Selection step calculations
  const snapStep = Math.max(4, gridSnapSize)
  const isMultiBlock = selection.w > snapStep || selection.h > snapStep
  const totalBlocks = Math.max(1, Math.round(selection.w / snapStep) * Math.round(selection.h / snapStep))

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 select-none animate-in fade-in duration-200"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="bg-[#1e1f22] border border-[#383a40] w-full max-w-7xl h-[92vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="px-6 py-3 border-b border-[#2b2d31] flex items-center justify-between bg-[#18191c]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#3b82f6]/20 border border-[#3b82f6]/40 flex items-center justify-center text-[#3b82f6]">
              <Scissors className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Fatiador com Seletor Livre (Qualquer Tamanho)
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#2b2d31] text-blue-400 border border-[#383a40]">
                  {CATEGORY_LABELS[category]}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Selecione regiões menores que 32×32 (ex: 16×16, 8×8, 24×24) ou qualquer dimensão livre para recortar sprites.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowXmlModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#2b2d31] hover:bg-[#383a40] text-slate-300 hover:text-white text-xs font-semibold border border-[#383a40] transition-colors cursor-pointer"
            >
              <FileCode className="w-4 h-4 text-blue-400" />
              <span>Ver XML Gerado</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadXml}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#2b2d31] hover:bg-[#383a40] text-slate-300 hover:text-white text-xs font-semibold border border-[#383a40] transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Baixar .xml</span>
            </button>

            <div className="w-px h-6 bg-[#383a40] mx-1" />

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-[#2b2d31] hover:bg-[#383a40] text-slate-400 hover:text-white flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Center Stage: Interactive Spritesheet Canvas */}
          <div
            ref={stageRef}
            className="flex-1 relative bg-[#121316] flex items-center justify-center overflow-hidden cursor-crosshair"
          >
            {/* Stage Controls Overlay */}
            <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 bg-[#18191c]/90 border border-[#383a40] backdrop-blur-md p-1.5 rounded-2xl shadow-xl">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(1, z - 0.5))}
                className="w-8 h-8 rounded-xl hover:bg-[#2b2d31] text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Diminuir Zoom"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono font-bold text-slate-300 px-2">{zoom}x</span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(8, z + 0.5))}
                className="w-8 h-8 rounded-xl hover:bg-[#2b2d31] text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Aumentar Zoom"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <div className="w-px h-4 bg-[#383a40] mx-1" />
              <button
                type="button"
                onClick={() => setShowGrid(!showGrid)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  showGrid ? 'bg-[#3b82f6] text-white' : 'hover:bg-[#2b2d31] text-slate-400 hover:text-slate-200'
                }`}
                title="Alternar Grade"
              >
                <Grid className="w-3.5 h-3.5" />
                <span>Grade {gridSnapSize}px</span>
              </button>
            </div>

            {/* Bottom Status Tips */}
            <div className="absolute bottom-4 z-10 flex items-center gap-4 bg-[#18191c]/90 border border-[#383a40] backdrop-blur-md px-4 py-2 rounded-2xl text-xs text-slate-400 shadow-lg">
              <span>
                Seleção:{' '}
                <strong className="text-white">
                  x: {selection.x}, y: {selection.y} ({selection.w}×{selection.h}px)
                </strong>
              </span>
              <div className="w-px h-3 bg-[#383a40]" />
              <span>🖱️ Clique e arraste para recortar</span>
              <span>•</span>
              <span>🖱️ Botão Direito: Mover tela</span>
            </div>

            {/* Canvas Container with Pan & Zoom */}
            <div
              style={{
                transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
                transformOrigin: 'center center',
                transition: isPanning ? 'none' : 'transform 0.05s ease-out',
              }}
              className="relative shadow-2xl border border-slate-700/60 rounded overflow-hidden"
            >
              <canvas
                ref={canvasRef}
                onMouseDown={handleCanvasMouseDown}
                className="block [image-rendering:pixelated]"
              />
            </div>
          </div>

          {/* Right Inspector & Assignment Panel */}
          <div className="w-96 border-l border-[#2b2d31] bg-[#18191c]/90 flex flex-col p-4 gap-3.5 overflow-y-auto">
            {/* 1. Background Removal Controls */}
            <div className="flex flex-col gap-2.5 bg-[#2b2d31]/70 border border-[#383a40] p-3 rounded-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                    Remoção de Fundo
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableBgRemoval}
                    onChange={(e) => setEnableBgRemoval(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#3b82f6]"></div>
                </label>
              </div>

              {enableBgRemoval && (
                <div className="flex flex-col gap-2 pt-1 border-t border-[#383a40]/60">
                  <div className="flex items-center gap-1.5">
                    {BG_COLOR_PRESETS.map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => setTargetColorHex(c.hex)}
                        title={c.label}
                        style={{ backgroundColor: c.hex }}
                        className={`w-6 h-6 rounded-lg transition-transform hover:scale-110 ${
                          targetColorHex.toLowerCase() === c.hex.toLowerCase()
                            ? 'ring-2 ring-blue-400 scale-105 shadow'
                            : 'border border-black/30'
                        }`}
                      />
                    ))}
                    <input
                      type="color"
                      value={targetColorHex}
                      onChange={(e) => setTargetColorHex(e.target.value)}
                      className="w-6 h-6 rounded-lg bg-transparent border-none cursor-pointer"
                      title="Cor Personalizada"
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Tolerância:</span>
                    <input
                      type="range"
                      min={0}
                      max={80}
                      value={tolerance}
                      onChange={(e) => setTolerance(parseInt(e.target.value))}
                      className="w-32 accent-[#3b82f6] cursor-pointer"
                    />
                    <span className="font-mono text-slate-200">{tolerance}%</span>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Preset Selector / Management */}
            <div className="flex flex-col gap-2 bg-[#2b2d31]/70 border border-[#383a40] p-3 rounded-2xl">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                  Presets ({presets.length})
                </span>
                <button
                  type="button"
                  onClick={handleAddNewPreset}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#3b82f6]/20 hover:bg-[#3b82f6] text-[#60a5fa] hover:text-white text-[11px] font-bold transition-all cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Novo Preset</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={activePreset?.name || ''}
                  onChange={(e) => {
                    const val = e.target.value
                    setPresets((prev) => {
                      const updated = [...prev]
                      updated[activePresetIndex].name = val
                      return updated
                    })
                  }}
                  placeholder="Nome do Preset"
                  className="flex-1 bg-[#1e1f22] border border-[#383a40] focus:border-[#3b82f6] text-white text-xs px-3 py-1.5 rounded-xl outline-none"
                />

                {presets.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemovePreset(activePresetIndex)}
                    className="w-8 h-8 rounded-xl bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                    title="Excluir este preset"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {presets.length > 1 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 mt-1">
                  {presets.map((p, idx) => (
                    <button
                      key={p.id}
                      onClick={() => setActivePresetIndex(idx)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                        activePresetIndex === idx
                          ? 'bg-[#3b82f6] text-white'
                          : 'bg-[#1e1f22] text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {p.name || `Preset ${idx + 1}`}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 3. Seletor de Tamanho Livre & Grade (suporte a menores que 32x32) */}
            <div className="bg-[#2b2d31]/70 border border-[#383a40] p-3 rounded-2xl flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                  Tamanho da Seleção
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#1e1f22] text-amber-400 border border-[#383a40]">
                  {selection.w}×{selection.h}px
                </span>
              </div>

              {/* Snap da Grade */}
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="text-[11px] font-semibold">Snap / Grade:</span>
                <div className="flex items-center gap-1">
                  {[8, 16, 24, 32].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setGridSnapSize(s)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                        gridSnapSize === s
                          ? 'bg-blue-600 border-blue-400 text-white shadow'
                          : 'bg-[#1e1f22] border-[#383a40] text-slate-400 hover:text-white'
                      }`}
                    >
                      {s}px
                    </button>
                  ))}
                </div>
              </div>

              {/* Presets Rápidos de Tamanho (incluindo menores que 32x32) */}
              <div className="flex flex-wrap gap-1">
                {[
                  { label: '8×8', w: 8, h: 8 },
                  { label: '16×16', w: 16, h: 16 },
                  { label: '16×32', w: 16, h: 32 },
                  { label: '24×24', w: 24, h: 24 },
                  { label: '32×32', w: 32, h: 32 },
                  { label: '32×64', w: 32, h: 64 },
                  { label: '48×48', w: 48, h: 48 },
                  { label: '64×64', w: 64, h: 64 },
                ].map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => setExactDimensions(s.w, s.h)}
                    className={`flex-1 min-w-[40px] py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                      selection.w === s.w && selection.h === s.h
                        ? 'bg-amber-500/20 border-amber-500/60 text-amber-300'
                        : 'bg-[#1e1f22] border-[#383a40] text-slate-400 hover:text-white'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {/* Ajuste Numérico Direto em Pixels */}
              <div className="grid grid-cols-2 gap-2 bg-[#1e1f22] p-2 rounded-xl border border-[#383a40]/60">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="text-[10px] font-semibold">Largura:</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={4}
                      max={512}
                      step={gridSnapSize > 0 ? gridSnapSize : 4}
                      value={selection.w}
                      onChange={(e) => setExactDimensions(parseInt(e.target.value) || 16, selection.h)}
                      className="w-14 bg-[#141517] border border-[#383a40] text-amber-300 font-mono text-center text-xs px-1 py-0.5 rounded-lg outline-none"
                    />
                    <span className="text-[10px] text-slate-500">px</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="text-[10px] font-semibold">Altura:</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={4}
                      max={512}
                      step={gridSnapSize > 0 ? gridSnapSize : 4}
                      value={selection.h}
                      onChange={(e) => setExactDimensions(selection.w, parseInt(e.target.value) || 16)}
                      className="w-14 bg-[#141517] border border-[#383a40] text-amber-300 font-mono text-center text-xs px-1 py-0.5 rounded-lg outline-none"
                    />
                    <span className="text-[10px] text-slate-500">px</span>
                  </div>
                </div>
              </div>

              {/* Preview & Botões de Captura */}
              <div className="flex items-center gap-3 bg-[#1e1f22] p-2.5 rounded-xl border border-[#383a40]/60">
                <div className="w-16 h-16 rounded-lg bg-[#141517] border border-[#383a40] flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                  {selectedRegionDataUrl ? (
                    <img
                      src={selectedRegionDataUrl}
                      alt="Selection Preview"
                      style={{
                        maxWidth: '56px',
                        maxHeight: '56px',
                      }}
                      className="object-contain [image-rendering:pixelated]"
                    />
                  ) : (
                    <span className="text-[9px] text-slate-600">Vazio</span>
                  )}
                </div>

                <div className="flex-1 flex flex-col gap-1.5">
                  {isMultiBlock ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleAddSequentialFrames(activeDirectionTab)}
                        className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-extrabold shadow-md shadow-emerald-600/30 transition-all cursor-pointer"
                        title={`Fatia em blocos de ${gridSnapSize}px sequenciais`}
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>+ {totalBlocks} Frames Sequenciais</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAddCompositeFrame(activeDirectionTab)}
                        className="flex items-center justify-center gap-1 py-1 px-2 rounded-lg bg-[#2b2d31] hover:bg-[#383a40] border border-[#383a40] text-slate-300 hover:text-white text-[10px] font-semibold transition-all cursor-pointer"
                        title="Adiciona o recorte exato como 1 frame"
                      >
                        <Maximize2 className="w-3 h-3" />
                        <span>+ 1 Frame ({selection.w}×{selection.h}px)</span>
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleAddCompositeFrame(activeDirectionTab)}
                      className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold shadow-md shadow-emerald-600/30 transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>
                        + Adicionar Frame ({selection.w}×{selection.h}px) à {DIRECTIONS.find((d) => d.id === activeDirectionTab)?.label}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 4. Direction Tabs & Captured Frames List */}
            <div className="bg-[#2b2d31]/70 border border-[#383a40] p-3 rounded-2xl flex flex-col gap-3">
              {/* Direction Tabs */}
              <div className="grid grid-cols-4 gap-1.5">
                {DIRECTIONS.map((d) => {
                  const frameCount = activePreset?.directions[d.id]?.length || 0
                  const isSelectedTab = activeDirectionTab === d.id
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setActiveDirectionTab(d.id)}
                      className={`flex flex-col items-center py-2 px-1 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        isSelectedTab
                          ? 'bg-[#3b82f6] border-[#60a5fa] text-white shadow-md'
                          : 'bg-[#1e1f22] border-[#383a40] text-slate-400 hover:text-white'
                      }`}
                    >
                      <span className="text-sm">{d.icon}</span>
                      <span className="text-[10px] mt-0.5">{d.label}</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded-full mt-1 ${
                          frameCount > 0
                            ? isSelectedTab
                              ? 'bg-white text-blue-600 font-extrabold'
                              : 'bg-emerald-500/20 text-emerald-400'
                            : 'opacity-40'
                        }`}
                      >
                        {frameCount} {frameCount === 1 ? 'frame' : 'frames'}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* Frames List for Active Direction */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-300 font-bold uppercase tracking-wider">
                  <span>Frames de {DIRECTIONS.find((d) => d.id === activeDirectionTab)?.label}:</span>
                  {activeDirectionFrames.length > 1 && (
                    <span className="text-emerald-400 lowercase font-semibold text-[10px]">
                      loop de caminhada ativo ({activeDirectionFrames.length} passos)
                    </span>
                  )}
                </div>

                {activeDirectionFrames.length === 0 ? (
                  <div className="py-4 text-center text-xs text-slate-500 border border-dashed border-[#383a40] rounded-xl">
                    Nenhum frame atribuído ainda. Selecione na imagem para adicionar.
                  </div>
                ) : (
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {activeDirectionFrames.map((frame, idx) => (
                      <div
                        key={`${frame.x}_${frame.y}_${idx}`}
                        className="group relative flex flex-col items-center p-1.5 rounded-xl bg-[#141517] border border-slate-700 shrink-0"
                      >
                        <div className="w-12 h-12 rounded-lg bg-[#18191c] flex items-center justify-center overflow-hidden">
                          <img
                            src={frame.dataUrl}
                            alt={`Frame ${idx}`}
                            className="w-10 h-10 object-contain [image-rendering:pixelated]"
                          />
                        </div>
                        <span className="text-[9px] font-bold text-slate-300 mt-1">
                          {idx === 0 ? '0 (Parado)' : `Passo ${idx}`}
                        </span>
                        <span className="text-[8px] text-slate-500 font-mono">
                          {frame.w || 16}×{frame.h || 16}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleRemoveDirectionFrame(activeDirectionTab, idx)}
                          className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow cursor-pointer"
                          title="Remover este frame"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Mirror Helper */}
              {(activeDirectionTab === 'left' || activeDirectionTab === 'right') && (
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#383a40]/60">
                  <button
                    type="button"
                    onClick={() => handleMirrorLateral('left', 'right')}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl bg-[#1e1f22] hover:bg-[#383a40] border border-[#383a40] text-slate-300 hover:text-white text-[11px] font-semibold transition-colors cursor-pointer"
                  >
                    <FlipHorizontal className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Espelhar Esq ➔ Dir</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleMirrorLateral('right', 'left')}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl bg-[#1e1f22] hover:bg-[#383a40] border border-[#383a40] text-slate-300 hover:text-white text-[11px] font-semibold transition-colors cursor-pointer"
                  >
                    <FlipHorizontal className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Espelhar Dir ➔ Esq</span>
                  </button>
                </div>
              )}
            </div>

            {/* 5. Live Walk Animation Preview */}
            <div className="bg-[#2b2d31]/70 border border-[#383a40] p-3 rounded-2xl flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                  Pré-visualização do Loop
                </span>
                <button
                  type="button"
                  onClick={() => setIsPlayingWalk(!isPlayingWalk)}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    isPlayingWalk
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'bg-[#1e1f22] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {isPlayingWalk ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  <span>{isPlayingWalk ? 'Andando (Loop)' : 'Parado (Frame 0)'}</span>
                </button>
              </div>

              <div className="flex items-center justify-center bg-[#141517] p-3 rounded-xl border border-[#383a40]/60">
                <div className="w-16 h-16 rounded-xl bg-[#1e1f22] flex items-center justify-center overflow-hidden border border-slate-700/60 shadow-inner">
                  {currentPreviewFrame ? (
                    <img
                      src={currentPreviewFrame}
                      alt="Preview"
                      className="w-12 h-12 object-contain [image-rendering:pixelated]"
                    />
                  ) : (
                    <span className="text-xs text-slate-600">-</span>
                  )}
                </div>
              </div>
            </div>

            {/* Success Feedback */}
            {savedSuccessCount !== null && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs animate-in fade-in">
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>
                  <strong>{savedSuccessCount}</strong> presets salvos e prontos para uso!
                </span>
              </div>
            )}

            {/* Bottom Final Action Button */}
            <div className="mt-auto pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleSaveAndEquip}
                className="w-full py-3 rounded-2xl text-xs font-extrabold bg-[#3b82f6] hover:bg-blue-500 text-white shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Salvar Presets no Avatar</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Generated XML Preview Modal */}
      {showXmlModal && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-[#1e1f22] border border-[#383a40] w-full max-w-xl rounded-3xl shadow-2xl flex flex-col overflow-hidden max-h-[80vh]">
            <div className="px-6 py-4 border-b border-[#2b2d31] flex items-center justify-between bg-[#18191c]">
              <div className="flex items-center gap-2">
                <FileCode className="w-5 h-5 text-blue-400" />
                <h3 className="text-sm font-bold text-white">Sparrow TextureAtlas XML Gerado</h3>
              </div>
              <button
                onClick={() => setShowXmlModal(false)}
                className="w-7 h-7 rounded-lg bg-[#2b2d31] text-slate-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto">
              <pre className="text-[11px] font-mono bg-[#141517] p-4 rounded-xl border border-[#383a40] text-emerald-300 overflow-x-auto select-text">
                {generateXmlString()}
              </pre>
            </div>

            <div className="px-6 py-3 border-t border-[#2b2d31] bg-[#18191c] flex items-center justify-end gap-2">
              <button
                onClick={() => setShowXmlModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Fechar
              </button>
              <button
                onClick={handleDownloadXml}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#3b82f6] text-white hover:bg-blue-500 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Baixar Arquivo .xml</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
