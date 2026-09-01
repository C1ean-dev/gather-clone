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
  Eye,
} from 'lucide-react'
import { AvatarComponentSlot, Direction } from '../../types/game'
import { CustomAsset } from '../../types/customAsset'
import { useCustomAssetsStore } from '../../store/useCustomAssetsStore'
import { generateSparrowXml, downloadFile, PackedSubTexture } from '../../engine/avatar/avatarAtlasExporter'
import { cropContentDataUrl } from '../../engine/avatar/avatarBakeService'

export interface SlicedFrameSlot {
  x: number
  y: number
  dataUrl: string
}

export interface SlicedPreset {
  id: string
  name: string
  directions: Partial<Record<Direction, SlicedFrameSlot>>
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
  other: 'Acessório Extra',
}

const DIRECTIONS: { id: Direction; label: string; icon: string }[] = [
  { id: 'down', label: 'Frente', icon: '⬇️' },
  { id: 'up', label: 'Costas', icon: '⬆️' },
  { id: 'left', label: 'Esquerda', icon: '⬅️' },
  { id: 'right', label: 'Direita', icon: '➡️' },
]

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

  // Selection Box (in image space, snapped to 32x32)
  const [selectedCoord, setSelectedCoord] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [selectedTileDataUrl, setSelectedTileDataUrl] = useState<string>('')

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

  // Presets List
  const [presets, setPresets] = useState<SlicedPreset[]>([
    {
      id: `preset_${Date.now()}`,
      name: `${CATEGORY_LABELS[category]} 1`,
      directions: {},
    },
  ])
  const [activePresetIndex, setActivePresetIndex] = useState<number>(0)
  const [showXmlModal, setShowXmlModal] = useState<boolean>(false)
  const [savedSuccessCount, setSavedSuccessCount] = useState<number | null>(null)

  // Load Source Image
  useEffect(() => {
    if (!imageSrc) return
    const img = new Image()
    img.src = imageSrc
    img.onload = () => {
      setSourceImg(img)
      // Extract first 32x32 tile
      sliceTile(img, 0, 0)
    }
  }, [imageSrc])

  // Extract a 32x32 tile from source image
  const sliceTile = useCallback((img: HTMLImageElement, x: number, y: number): string => {
    if (typeof document === 'undefined') return ''
    const canvas = document.createElement('canvas')
    canvas.width = 32
    canvas.height = 32
    const ctx = canvas.getContext('2d')
    if (!ctx) return ''
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(img, x, y, 32, 32, 0, 0, 32, 32)
    const dataUrl = canvas.toDataURL('image/png')
    setSelectedTileDataUrl(dataUrl)
    return dataUrl
  }, [])

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

    // Draw 32x32 Grid
    if (showGrid) {
      ctx.lineWidth = 1
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)'

      for (let x = 0; x <= canvas.width; x += 32) {
        ctx.beginPath()
        ctx.moveTo(x + 0.5, 0)
        ctx.lineTo(x + 0.5, canvas.height)
        ctx.stroke()
      }

      for (let y = 0; y <= canvas.height; y += 32) {
        ctx.beginPath()
        ctx.moveTo(0, y + 0.5)
        ctx.lineTo(canvas.width, y + 0.5)
        ctx.stroke()
      }
    }

    // Draw highlighted selection box
    ctx.lineWidth = 2
    ctx.strokeStyle = '#3b82f6'
    ctx.fillStyle = 'rgba(59, 130, 246, 0.25)'
    ctx.fillRect(selectedCoord.x, selectedCoord.y, 32, 32)
    ctx.strokeRect(selectedCoord.x + 0.5, selectedCoord.y + 0.5, 31, 31)

    // Draw assigned markers for active preset
    const activePreset = presets[activePresetIndex]
    if (activePreset) {
      Object.entries(activePreset.directions).forEach(([dir, frame]) => {
        if (!frame) return
        ctx.fillStyle = 'rgba(16, 185, 129, 0.35)'
        ctx.fillRect(frame.x, frame.y, 32, 32)
        ctx.strokeStyle = '#10b981'
        ctx.lineWidth = 2
        ctx.strokeRect(frame.x + 0.5, frame.y + 0.5, 31, 31)

        // Direction badge label
        ctx.fillStyle = '#10b981'
        ctx.fillRect(frame.x, frame.y, 14, 10)
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 8px sans-serif'
        ctx.fillText(dir[0].toUpperCase(), frame.x + 3, frame.y + 8)
      })
    }
  }, [sourceImg, showGrid, selectedCoord, presets, activePresetIndex])

  // Handle Canvas Click to Select 32x32 Tile
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning || !sourceImg) return
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    const clientX = (e.clientX - rect.left) * scaleX
    const clientY = (e.clientY - rect.top) * scaleY

    const tileX = Math.max(0, Math.min(canvas.width - 32, Math.floor(clientX / 32) * 32))
    const tileY = Math.max(0, Math.min(canvas.height - 32, Math.floor(clientY / 32) * 32))

    setSelectedCoord({ x: tileX, y: tileY })
    sliceTile(sourceImg, tileX, tileY)
  }

  // Panning with Right Mouse Button
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 2 || e.button === 1) {
      e.preventDefault()
      setIsPanning(true)
      panStartRef.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        startX: panOffset.x,
        startY: panOffset.y,
      }
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return
    const dx = e.clientX - panStartRef.current.mouseX
    const dy = e.clientY - panStartRef.current.mouseY
    setPanOffset({
      x: panStartRef.current.startX + dx,
      y: panStartRef.current.startY + dy,
    })
  }

  const handleMouseUp = () => {
    setIsPanning(false)
  }

  // Assign current 32x32 selection to a direction of active preset
  const handleAssignDirection = (dir: Direction) => {
    if (!sourceImg) return
    const dataUrl = sliceTile(sourceImg, selectedCoord.x, selectedCoord.y)

    setPresets((prev) => {
      const updated = [...prev]
      const current = { ...updated[activePresetIndex] }
      current.directions = {
        ...current.directions,
        [dir]: {
          x: selectedCoord.x,
          y: selectedCoord.y,
          dataUrl,
        },
      }
      updated[activePresetIndex] = current
      return updated
    })
  }

  // Mirror lateral direction
  const handleMirrorLateral = (fromDir: 'left' | 'right', toDir: 'left' | 'right') => {
    const currentPreset = presets[activePresetIndex]
    const sourceFrame = currentPreset?.directions[fromDir]
    if (!sourceFrame) return

    const canvas = document.createElement('canvas')
    canvas.width = 32
    canvas.height = 32
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = new Image()
    img.src = sourceFrame.dataUrl
    img.onload = () => {
      ctx.imageSmoothingEnabled = false
      ctx.translate(32, 0)
      ctx.scale(-1, 1)
      ctx.drawImage(img, 0, 0)
      const mirroredDataUrl = canvas.toDataURL('image/png')

      setPresets((prev) => {
        const updated = [...prev]
        const current = { ...updated[activePresetIndex] }
        current.directions = {
          ...current.directions,
          [toDir]: {
            x: sourceFrame.x,
            y: sourceFrame.y,
            dataUrl: mirroredDataUrl,
          },
        }
        updated[activePresetIndex] = current
        return updated
      })
    }
  }

  // Add new preset to slice
  const handleAddNewPreset = () => {
    const newIdx = presets.length + 1
    const newPreset: SlicedPreset = {
      id: `preset_${Date.now()}_${newIdx}`,
      name: `${CATEGORY_LABELS[category]} ${newIdx}`,
      directions: {},
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
      ;(['down', 'up', 'left', 'right'] as Direction[]).forEach((dir) => {
        const frame = preset.directions[dir]
        if (frame) {
          subTextures.push({
            name: `${category}_${cleanName}_${dir}_0`,
            x: frame.x,
            y: frame.y,
            width: 32,
            height: 32,
          })
        }
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
      // Must have at least one direction assigned
      const downFrame = p.directions.down?.dataUrl || Object.values(p.directions)[0]?.dataUrl
      if (!downFrame) continue

      const directionalFrames: Record<Direction, string> = {
        down: p.directions.down?.dataUrl || '',
        up: p.directions.up?.dataUrl || '',
        left: p.directions.left?.dataUrl || '',
        right: p.directions.right?.dataUrl || '',
      }

      // Auto-mirror lateral frames if one was assigned and other is empty
      if (directionalFrames.left && !directionalFrames.right) {
        // mirror left to right
      } else if (directionalFrames.right && !directionalFrames.left) {
        // mirror right to left
      }

      const thumbnail = await cropContentDataUrl(downFrame)

      const asset: CustomAsset = {
        id: `avatar_${category}_sliced_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: p.name.trim() || `Preset ${CATEGORY_LABELS[category]}`,
        type: 'avatar',
        category: 'Avatares',
        avatarSlot: category,
        thumbnail,
        width: 1,
        height: 1,
        isObstacle: false,
        frames: [
          directionalFrames.down,
          directionalFrames.up,
          directionalFrames.left,
          directionalFrames.right,
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

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 select-none animate-in fade-in duration-200"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="bg-[#1e1f22] border border-[#383a40] w-full max-w-6xl h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="px-6 py-3.5 border-b border-[#2b2d31] flex items-center justify-between bg-[#18191c]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#3b82f6]/20 border border-[#3b82f6]/40 flex items-center justify-center text-[#3b82f6]">
              <Scissors className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Fatiador Interativo de Spritesheet
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#2b2d31] text-blue-400 border border-[#383a40]">
                  {CATEGORY_LABELS[category]}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Clique nas células de 32×32 da imagem para associar aos 4 quadros direcionais e gerar o .xml.
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
            onMouseDown={handleMouseDown}
            className="flex-1 relative bg-[#121316] flex items-center justify-center overflow-hidden cursor-crosshair"
          >
            {/* Stage Controls Overlay */}
            <div className="absolute top-4 left-4 z-10 flex items-center gap-1 bg-[#18191c]/90 border border-[#383a40] backdrop-blur-md p-1.5 rounded-2xl shadow-xl">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(1, z - 0.5))}
                className="w-8 h-8 rounded-xl hover:bg-[#2b2d31] text-slate-300 hover:text-white flex items-center justify-center transition-colors"
                title="Diminuir Zoom"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono font-bold text-slate-300 px-2">{zoom}x</span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(6, z + 0.5))}
                className="w-8 h-8 rounded-xl hover:bg-[#2b2d31] text-slate-300 hover:text-white flex items-center justify-center transition-colors"
                title="Aumentar Zoom"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <div className="w-px h-4 bg-[#383a40] mx-1" />
              <button
                type="button"
                onClick={() => setShowGrid(!showGrid)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold transition-colors ${
                  showGrid ? 'bg-[#3b82f6] text-white' : 'hover:bg-[#2b2d31] text-slate-400 hover:text-slate-200'
                }`}
                title="Alternar Grade 32×32"
              >
                <Grid className="w-3.5 h-3.5" />
                <span>Grade 32px</span>
              </button>
            </div>

            {/* Bottom Status Tips */}
            <div className="absolute bottom-4 z-10 flex items-center gap-4 bg-[#18191c]/90 border border-[#383a40] backdrop-blur-md px-4 py-2 rounded-2xl text-xs text-slate-400 shadow-lg">
              <span>
                Célula Selecionada:{' '}
                <strong className="text-white">
                  x: {selectedCoord.x}, y: {selectedCoord.y} (32×32)
                </strong>
              </span>
              <div className="w-px h-3 bg-[#383a40]" />
              <span>🖱️ Clique para selecionar tile</span>
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
                onClick={handleCanvasClick}
                className="block [image-rendering:pixelated]"
              />
            </div>
          </div>

          {/* Right Inspector & Assignment Panel */}
          <div className="w-84 border-l border-[#2b2d31] bg-[#18191c]/90 flex flex-col p-4 gap-4 overflow-y-auto">
            {/* Preset Selector / Management */}
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

            {/* Currently Selected Tile & Quick Capture Buttons */}
            <div className="bg-[#2b2d31]/70 border border-[#383a40] p-3 rounded-2xl flex flex-col gap-3">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                Capturar Célula 32×32
              </span>

              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-xl bg-[#141517] border border-[#383a40] flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                  {selectedTileDataUrl ? (
                    <img
                      src={selectedTileDataUrl}
                      alt="Tile"
                      className="w-12 h-12 [image-rendering:pixelated]"
                    />
                  ) : (
                    <span className="text-[10px] text-slate-600">32×32</span>
                  )}
                </div>

                <div className="flex flex-col text-xs text-slate-400">
                  <span>
                    Posição X: <strong className="text-slate-200">{selectedCoord.x}px</strong>
                  </span>
                  <span>
                    Posição Y: <strong className="text-slate-200">{selectedCoord.y}px</strong>
                  </span>
                  <span className="text-[10px] text-blue-400 mt-1">
                    Atribua aos botões abaixo:
                  </span>
                </div>
              </div>

              {/* 4 Direction Capture Buttons */}
              <div className="grid grid-cols-2 gap-2">
                {DIRECTIONS.map((dirItem) => {
                  const isAssigned = !!activePreset?.directions[dirItem.id]
                  return (
                    <button
                      key={dirItem.id}
                      onClick={() => handleAssignDirection(dirItem.id)}
                      className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        isAssigned
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25'
                          : 'bg-[#1e1f22] border-[#383a40] text-slate-300 hover:text-white hover:border-slate-500'
                      }`}
                    >
                      <span>{dirItem.icon}</span>
                      <span>{dirItem.label}</span>
                      {isAssigned && <Check className="w-3 h-3 text-emerald-400" />}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Assigned Directional Frames Grid */}
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                Quadros Atribuídos
              </span>

              <div className="grid grid-cols-4 gap-2 bg-[#1e1f22] p-2.5 rounded-2xl border border-[#383a40]">
                {DIRECTIONS.map((dirItem) => {
                  const frame = activePreset?.directions[dirItem.id]
                  return (
                    <div
                      key={dirItem.id}
                      className="flex flex-col items-center gap-1 p-1 rounded-xl bg-[#141517] border border-slate-700/60"
                    >
                      <div className="w-10 h-10 rounded-lg bg-[#18191c] flex items-center justify-center overflow-hidden">
                        {frame ? (
                          <img
                            src={frame.dataUrl}
                            alt={dirItem.label}
                            className="w-8 h-8 [image-rendering:pixelated]"
                          />
                        ) : (
                          <span className="text-[11px] opacity-30">{dirItem.icon}</span>
                        )}
                      </div>
                      <span className="text-[9px] font-bold text-slate-400">{dirItem.label}</span>
                      {frame && (
                        <span className="text-[8px] font-mono text-slate-500">
                          {frame.x},{frame.y}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Mirror Helper */}
              <div className="flex items-center justify-between gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => handleMirrorLateral('left', 'right')}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl bg-[#2b2d31] hover:bg-[#383a40] border border-[#383a40] text-slate-300 hover:text-white text-[10px] font-semibold transition-colors cursor-pointer"
                  title="Copiar e espelhar quadro da Esquerda para a Direita"
                >
                  <FlipHorizontal className="w-3 h-3 text-indigo-400" />
                  <span>Esq ➔ Dir</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleMirrorLateral('right', 'left')}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl bg-[#2b2d31] hover:bg-[#383a40] border border-[#383a40] text-slate-300 hover:text-white text-[10px] font-semibold transition-colors cursor-pointer"
                  title="Copiar e espelhar quadro da Direita para a Esquerda"
                >
                  <FlipHorizontal className="w-3 h-3 text-indigo-400" />
                  <span>Dir ➔ Esq</span>
                </button>
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
            <div className="mt-auto pt-3 flex flex-col gap-2">
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
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#3b82f6] text-white hover:bg-blue-500"
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
