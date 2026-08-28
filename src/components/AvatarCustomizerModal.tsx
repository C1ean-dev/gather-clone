import React, { useState, useEffect, useRef } from 'react'
import {
  X,
  Smile,
  Sparkles,
  User,
  Shirt,
  Layers,
  Footprints,
  Crown,
  Glasses,
  Sparkle,
  Download,
  Dices,
  Check,
  Palette,
} from 'lucide-react'
import { useGameStore } from '../store/useGameStore'
import {
  AvatarConfig,
  SkinDetailType,
  HairStyleType,
  FacialHairType,
  TopType,
  JacketType,
  BottomType,
  ShoesType,
  HatType,
  GlassesType,
  OtherType,
} from '../types/game'
import { AvatarRenderer } from '../engine/AvatarRenderer'
import { PeerManager } from '../p2p/PeerManager'

interface Props {
  isOpen: boolean
  onClose: () => void
}

type CategoryKey =
  | 'skin'
  | 'hair'
  | 'facialHair'
  | 'top'
  | 'jacket'
  | 'bottom'
  | 'shoes'
  | 'hat'
  | 'glasses'
  | 'other'

export const AvatarCustomizerModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { localPlayer, setLocalPlayer } = useGameStore()

  const [activeCategory, setActiveCategory] = useState<CategoryKey>('skin')
  const [avatar, setAvatar] = useState<AvatarConfig>({
    skinTone: localPlayer.avatar?.skinTone || localPlayer.avatar?.skinColor || '#ffd1a4',
    skinDetail: localPlayer.avatar?.skinDetail || 'vitiligo1',
    hairStyle: localPlayer.avatar?.hairStyle || 'messy',
    hairColor: localPlayer.avatar?.hairColor || '#212529',
    facialHair: localPlayer.avatar?.facialHair || 'none',
    facialHairColor: localPlayer.avatar?.facialHairColor || '#212529',
    topType: localPlayer.avatar?.topType || localPlayer.avatar?.shirtType || 'kimono',
    topColor: localPlayer.avatar?.topColor || localPlayer.avatar?.shirtColor || '#212529',
    jacketType: localPlayer.avatar?.jacketType || 'none',
    jacketColor: localPlayer.avatar?.jacketColor || '#4c6ef5',
    bottomType: localPlayer.avatar?.bottomType || 'kimono_skirt',
    bottomColor: localPlayer.avatar?.bottomColor || localPlayer.avatar?.pantsColor || '#212529',
    shoesType: localPlayer.avatar?.shoesType || 'sandals',
    shoesColor: localPlayer.avatar?.shoesColor || '#51cf66',
    hatType: localPlayer.avatar?.hatType || 'none',
    hatColor: localPlayer.avatar?.hatColor || '#fa5252',
    glassesType: localPlayer.avatar?.glassesType || 'none',
    glassesColor: localPlayer.avatar?.glassesColor || '#343a40',
    otherType: localPlayer.avatar?.otherType || 'none',
    otherColor: localPlayer.avatar?.otherColor || '#20c997',
  })

  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null)

  // Color Palettes
  const skinTones = ['#ffd1a4', '#f5b080', '#e09865', '#ba6c48', '#8c4826', '#5c2d15', '#fdebd0']
  const hairColors = [
    '#212529',
    '#495057',
    '#5c3a21',
    '#8b5a2b',
    '#d4a373',
    '#f4d06f',
    '#e03131',
    '#9c36b5',
    '#3b5bdb',
    '#099268',
    '#f06595',
    '#e9ecef',
  ]
  const fabricColors = [
    '#212529',
    '#495057',
    '#ced4da',
    '#f8f9fa',
    '#3b82f6',
    '#10b981',
    '#ef4444',
    '#f59e0b',
    '#8b5cf6',
    '#ec4899',
    '#06b6d4',
    '#84cc16',
    '#e11d48',
    '#78350f',
  ]
  const shoeColors = ['#212529', '#f8f9fa', '#ef4444', '#10b981', '#3b82f6', '#f59e0b', '#78350f', '#8b5cf6']

  // Live Canvas Preview Animation with Room Background
  useEffect(() => {
    if (!isOpen || !previewCanvasRef.current) return
    const canvas = previewCanvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.imageSmoothingEnabled = false
    let frameId: number

    const render = (tick: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // 1. Draw Aesthetic Gather Pastel Room Background (Floor, Wall, Baseboard)
      const w = canvas.width
      const h = canvas.height

      // Top Wall
      ctx.fillStyle = '#e9ecef'
      ctx.fillRect(0, 0, w, h * 0.45)

      // Window / Wall trim
      ctx.fillStyle = '#dee2e6'
      ctx.fillRect(w * 0.65, 12, w * 0.3, h * 0.35)
      ctx.strokeStyle = '#ced4da'
      ctx.lineWidth = 3
      ctx.strokeRect(w * 0.65, 12, w * 0.3, h * 0.35)
      ctx.strokeRect(w * 0.1, 12, w * 0.45, h * 0.35)

      // Baseboard Trim
      ctx.fillStyle = '#adb5bd'
      ctx.fillRect(0, h * 0.45 - 3, w, 3)

      // Bottom Floor (Pastel Greenish Mint Floor like Image 2)
      ctx.fillStyle = '#d3f9d8'
      ctx.fillRect(0, h * 0.45, w, h * 0.55)

      // Subtle Floor Grid Lines
      ctx.strokeStyle = 'rgba(178, 242, 187, 0.6)'
      ctx.lineWidth = 1
      for (let y = h * 0.45; y < h; y += 24) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(w, y)
        ctx.stroke()
      }
      for (let x = 0; x < w; x += 24) {
        ctx.beginPath()
        ctx.moveTo(x, h * 0.45)
        ctx.lineTo(x, h)
        ctx.stroke()
      }

      // 2. Render Gather Avatar in Center Stage with 3x scale
      ctx.save()
      ctx.scale(3.5, 3.5)

      const tempPlayer = {
        ...localPlayer,
        avatar,
        direction: 'down' as const,
        isMoving: true,
        x: w / (2 * 3.5 * 32) - 0.5,
        y: (h * 0.65) / (3.5 * 32) - 0.65,
      }

      AvatarRenderer.drawPlayer(ctx, tempPlayer, true, tick, 32, true)
      ctx.restore()

      frameId = requestAnimationFrame(render)
    }

    frameId = requestAnimationFrame(render)
    return () => cancelAnimationFrame(frameId)
  }, [isOpen, avatar, localPlayer])

  if (!isOpen) return null

  const handleSave = () => {
    setLocalPlayer({ avatar })
    PeerManager.getInstance().sendPlayerUpdate({
      avatar,
    })
    onClose()
  }

  // Randomize Avatar (Dice 🎲 feature)
  const handleRandomize = () => {
    const r = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)]

    const newAvatar: AvatarConfig = {
      skinTone: r(skinTones),
      skinDetail: r(['smooth', 'vitiligo1', 'vitiligo2', 'freckles', 'blush']),
      hairStyle: r(['messy', 'anime', 'long_bangs', 'short_wavy', 'curly_afro', 'twin_tails', 'ponytail', 'bob']),
      hairColor: r(hairColors),
      facialHair: r(['none', 'none', 'full_beard', 'mustache', 'goatee', 'stubble']),
      facialHairColor: r(hairColors),
      topType: r(['kimono', 'yukata', 'tshirt', 'sweater', 'dress_shirt', 'hoodie']),
      topColor: r(fabricColors),
      jacketType: r(['none', 'none', 'hoodie_open', 'cardigan', 'blazer', 'denim']),
      jacketColor: r(fabricColors),
      bottomType: r(['kimono_skirt', 'jeans', 'sweatpants', 'skirt', 'shorts']),
      bottomColor: r(fabricColors),
      shoesType: r(['sneakers', 'boots', 'sandals', 'loafers']),
      shoesColor: r(shoeColors),
      hatType: r(['none', 'none', 'ribbon_bow', 'cap_forward', 'cap_backward', 'beanie', 'headband']),
      hatColor: r(fabricColors),
      glassesType: r(['none', 'none', 'round', 'square', 'sunglasses', 'wireframe']),
      glassesColor: r(fabricColors),
      otherType: r(['none', 'none', 'headphones', 'mask']),
      otherColor: r(fabricColors),
    }

    setAvatar(newAvatar)
  }

  // Export / Download PNG of Avatar
  const handleDownloadPNG = () => {
    if (!previewCanvasRef.current) return
    const canvas = document.createElement('canvas')
    canvas.width = 128
    canvas.height = 128
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.imageSmoothingEnabled = false
    ctx.scale(4, 4)

    const tempPlayer = {
      ...localPlayer,
      avatar,
      direction: 'down' as const,
      isMoving: false,
      x: 0.5,
      y: 0.5,
    }

    AvatarRenderer.drawPlayer(ctx, tempPlayer, true, 0, 32, false)

    const link = document.createElement('a')
    link.download = `${localPlayer.name || 'avatar'}-gather-pixel.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  const categories = [
    { id: 'skin', label: 'Tom da pele', icon: Smile },
    { id: 'hair', label: 'Cabelo', icon: Sparkles },
    { id: 'facialHair', label: 'Pelos faciais', icon: User },
    { id: 'top', label: 'Parte de cima', icon: Shirt },
    { id: 'jacket', label: 'Jaqueta', icon: Layers },
    { id: 'bottom', label: 'Parte de baixo', icon: Footprints },
    { id: 'shoes', label: 'Sapatos', icon: Footprints },
    { id: 'hat', label: 'Chapéu', icon: Crown },
    { id: 'glasses', label: 'Óculos', icon: Glasses },
    { id: 'other', label: 'Outro', icon: Sparkle },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200 select-none">
      <div className="bg-[#1e1f22] border border-[#2b2d31] rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col h-[600px] max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-[#2b2d31] bg-[#18191c]">
          <h2 className="text-base font-extrabold text-slate-100 tracking-tight">Editar Avatar</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-[#2b2d31] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3-Column Main Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* ========================================== */}
          {/* 1. LEFT SIDEBAR: CATEGORIES LIST           */}
          {/* ========================================== */}
          <div className="w-48 bg-[#18191c] border-r border-[#2b2d31] p-3 flex flex-col gap-1 overflow-y-auto shrink-0">
            {categories.map((cat) => {
              const Icon = cat.icon
              const isActive = activeCategory === cat.id
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id as CategoryKey)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all text-left ${
                    isActive
                      ? 'bg-[#3b82f6] text-white shadow-lg shadow-blue-500/30'
                      : 'text-slate-300 hover:bg-[#2b2d31] hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{cat.label}</span>
                </button>
              )
            })}
          </div>

          {/* ========================================== */}
          {/* 2. MIDDLE COLUMN: OPTIONS GRID & PALETTE   */}
          {/* ========================================== */}
          <div className="flex-1 bg-[#2b2d31] flex flex-col justify-between p-5 overflow-hidden">
            {/* Options Cards Grid */}
            <div className="flex-1 overflow-y-auto pr-1">
              {/* CATEGORY: TOM DA PELE */}
              {activeCategory === 'skin' && (
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'vitiligo1', label: 'Vitiligo 1' },
                    { id: 'vitiligo2', label: 'Vitiligo 2' },
                    { id: 'smooth', label: 'Lisa / Suave' },
                    { id: 'freckles', label: 'Sardas' },
                    { id: 'blush', label: 'Blush Rosado' },
                  ].map((item) => {
                    const isSelected = avatar.skinDetail === item.id
                    return (
                      <button
                        key={item.id}
                        onClick={() => setAvatar({ ...avatar, skinDetail: item.id as SkinDetailType })}
                        className={`group relative flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all aspect-square ${
                          isSelected
                            ? 'border-[#3b82f6] bg-[#3b82f6]/20 shadow-md ring-2 ring-[#3b82f6]/30'
                            : 'border-[#383a40] bg-[#1e1f22] hover:border-slate-500'
                        }`}
                      >
                        {/* Mini Face Graphic */}
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center relative mb-1.5 shadow-sm"
                          style={{ backgroundColor: avatar.skinTone }}
                        >
                          {item.id === 'vitiligo1' && (
                            <div className="absolute top-2 left-2 w-4 h-3 bg-white/50 rounded-sm" />
                          )}
                          {item.id === 'vitiligo2' && (
                            <div className="absolute top-2 right-2 w-4 h-3 bg-white/50 rounded-sm" />
                          )}
                          {item.id === 'freckles' && (
                            <div className="flex gap-1">
                              <span className="w-1 h-1 bg-amber-900/60 rounded-full" />
                              <span className="w-1 h-1 bg-amber-900/60 rounded-full" />
                            </div>
                          )}
                          {item.id === 'blush' && (
                            <div className="flex justify-between w-full px-1">
                              <span className="w-2.5 h-1.5 bg-rose-400/60 rounded-full" />
                              <span className="w-2.5 h-1.5 bg-rose-400/60 rounded-full" />
                            </div>
                          )}
                          {/* Eyes */}
                          <div className="flex gap-3 mt-1">
                            <span className="w-2 h-2 bg-black rounded-xs" />
                            <span className="w-2 h-2 bg-black rounded-xs" />
                          </div>
                        </div>
                        <span className="text-[11px] font-semibold text-slate-200 truncate max-w-[80px]">
                          {item.label}
                        </span>
                        {isSelected && (
                          <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-[#3b82f6] text-white rounded-full flex items-center justify-center">
                            <Check className="w-2.5 h-2.5" />
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* CATEGORY: CABELO */}
              {activeCategory === 'hair' && (
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'messy', label: 'Messy Anime' },
                    { id: 'long_bangs', label: 'Longo c/ Franja' },
                    { id: 'twin_tails', label: 'Maria Chiquinha' },
                    { id: 'curly_afro', label: 'Afro / Cachos' },
                    { id: 'anime', label: 'Espetado Anime' },
                    { id: 'short_wavy', label: 'Curto Ondulado' },
                    { id: 'ponytail', label: 'Rabo de Cavalo' },
                    { id: 'bob', label: 'Chanel / Bob' },
                    { id: 'buzz', label: 'Raspado' },
                    { id: 'bald', label: 'Careca' },
                  ].map((item) => {
                    const isSelected = avatar.hairStyle === item.id
                    return (
                      <button
                        key={item.id}
                        onClick={() => setAvatar({ ...avatar, hairStyle: item.id as HairStyleType })}
                        className={`group relative flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all aspect-square ${
                          isSelected
                            ? 'border-[#3b82f6] bg-[#3b82f6]/20 shadow-md ring-2 ring-[#3b82f6]/30'
                            : 'border-[#383a40] bg-[#1e1f22] hover:border-slate-500'
                        }`}
                      >
                        <div
                          className="w-10 h-10 rounded-2xl mb-1.5 flex items-center justify-center text-xs font-bold text-white shadow-md"
                          style={{ backgroundColor: avatar.hairColor }}
                        >
                          💇
                        </div>
                        <span className="text-[11px] font-semibold text-slate-200 truncate max-w-[80px]">
                          {item.label}
                        </span>
                        {isSelected && (
                          <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-[#3b82f6] text-white rounded-full flex items-center justify-center">
                            <Check className="w-2.5 h-2.5" />
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* CATEGORY: PELOS FACIAIS */}
              {activeCategory === 'facialHair' && (
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'none', label: 'Nenhum' },
                    { id: 'full_beard', label: 'Barba Cheia' },
                    { id: 'mustache', label: 'Bigode' },
                    { id: 'goatee', label: 'Cavanhaque' },
                    { id: 'stubble', label: 'Sombra / Por Fazer' },
                  ].map((item) => {
                    const isSelected = avatar.facialHair === item.id
                    return (
                      <button
                        key={item.id}
                        onClick={() => setAvatar({ ...avatar, facialHair: item.id as FacialHairType })}
                        className={`group relative flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all aspect-square ${
                          isSelected
                            ? 'border-[#3b82f6] bg-[#3b82f6]/20 shadow-md ring-2 ring-[#3b82f6]/30'
                            : 'border-[#383a40] bg-[#1e1f22] hover:border-slate-500'
                        }`}
                      >
                        <div className="w-10 h-10 rounded-2xl mb-1.5 flex items-center justify-center text-sm font-bold bg-[#18191c] text-slate-200">
                          {item.id === 'none' ? '🚫' : '🧔'}
                        </div>
                        <span className="text-[11px] font-semibold text-slate-200 truncate max-w-[80px]">
                          {item.label}
                        </span>
                        {isSelected && (
                          <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-[#3b82f6] text-white rounded-full flex items-center justify-center">
                            <Check className="w-2.5 h-2.5" />
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* CATEGORY: PARTE DE CIMA (TOPS) */}
              {activeCategory === 'top' && (
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'kimono', label: 'Quimono / Yukata' },
                    { id: 'tshirt', label: 'Camiseta Básica' },
                    { id: 'sweater', label: 'Suéter de Lã' },
                    { id: 'dress_shirt', label: 'Camisa Social' },
                    { id: 'hoodie', label: 'Moletom Canguru' },
                    { id: 'tank', label: 'Regata' },
                  ].map((item) => {
                    const isSelected = avatar.topType === item.id
                    return (
                      <button
                        key={item.id}
                        onClick={() => setAvatar({ ...avatar, topType: item.id as TopType })}
                        className={`group relative flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all aspect-square ${
                          isSelected
                            ? 'border-[#3b82f6] bg-[#3b82f6]/20 shadow-md ring-2 ring-[#3b82f6]/30'
                            : 'border-[#383a40] bg-[#1e1f22] hover:border-slate-500'
                        }`}
                      >
                        <div
                          className="w-10 h-10 rounded-2xl mb-1.5 flex items-center justify-center text-xs font-bold text-white shadow"
                          style={{ backgroundColor: avatar.topColor }}
                        >
                          👘
                        </div>
                        <span className="text-[11px] font-semibold text-slate-200 truncate max-w-[80px]">
                          {item.label}
                        </span>
                        {isSelected && (
                          <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-[#3b82f6] text-white rounded-full flex items-center justify-center">
                            <Check className="w-2.5 h-2.5" />
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* CATEGORY: JAQUETA */}
              {activeCategory === 'jacket' && (
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'none', label: 'Nenhuma' },
                    { id: 'hoodie_open', label: 'Moletom Aberto' },
                    { id: 'cardigan', label: 'Cardigan' },
                    { id: 'blazer', label: 'Blazer Social' },
                    { id: 'denim', label: 'Jaqueta Jeans' },
                  ].map((item) => {
                    const isSelected = avatar.jacketType === item.id
                    return (
                      <button
                        key={item.id}
                        onClick={() => setAvatar({ ...avatar, jacketType: item.id as JacketType })}
                        className={`group relative flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all aspect-square ${
                          isSelected
                            ? 'border-[#3b82f6] bg-[#3b82f6]/20 shadow-md ring-2 ring-[#3b82f6]/30'
                            : 'border-[#383a40] bg-[#1e1f22] hover:border-slate-500'
                        }`}
                      >
                        <div
                          className="w-10 h-10 rounded-2xl mb-1.5 flex items-center justify-center text-xs font-bold text-white shadow"
                          style={{ backgroundColor: item.id === 'none' ? '#18191c' : avatar.jacketColor }}
                        >
                          {item.id === 'none' ? '🚫' : '🧥'}
                        </div>
                        <span className="text-[11px] font-semibold text-slate-200 truncate max-w-[80px]">
                          {item.label}
                        </span>
                        {isSelected && (
                          <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-[#3b82f6] text-white rounded-full flex items-center justify-center">
                            <Check className="w-2.5 h-2.5" />
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* CATEGORY: PARTE DE BAIXO */}
              {activeCategory === 'bottom' && (
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'kimono_skirt', label: 'Saia Quimono Hakama' },
                    { id: 'jeans', label: 'Calça Jeans' },
                    { id: 'sweatpants', label: 'Moletom Jogger' },
                    { id: 'skirt', label: 'Saia Plissada' },
                    { id: 'shorts', label: 'Bermuda / Shorts' },
                  ].map((item) => {
                    const isSelected = avatar.bottomType === item.id
                    return (
                      <button
                        key={item.id}
                        onClick={() => setAvatar({ ...avatar, bottomType: item.id as BottomType })}
                        className={`group relative flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all aspect-square ${
                          isSelected
                            ? 'border-[#3b82f6] bg-[#3b82f6]/20 shadow-md ring-2 ring-[#3b82f6]/30'
                            : 'border-[#383a40] bg-[#1e1f22] hover:border-slate-500'
                        }`}
                      >
                        <div
                          className="w-10 h-10 rounded-2xl mb-1.5 flex items-center justify-center text-xs font-bold text-white shadow"
                          style={{ backgroundColor: avatar.bottomColor }}
                        >
                          👖
                        </div>
                        <span className="text-[11px] font-semibold text-slate-200 truncate max-w-[80px]">
                          {item.label}
                        </span>
                        {isSelected && (
                          <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-[#3b82f6] text-white rounded-full flex items-center justify-center">
                            <Check className="w-2.5 h-2.5" />
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* CATEGORY: SAPATOS */}
              {activeCategory === 'shoes' && (
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'sandals', label: 'Sandálias Geta' },
                    { id: 'sneakers', label: 'Tênis Sneaker' },
                    { id: 'boots', label: 'Botas' },
                    { id: 'loafers', label: 'Sapato Social' },
                  ].map((item) => {
                    const isSelected = avatar.shoesType === item.id
                    return (
                      <button
                        key={item.id}
                        onClick={() => setAvatar({ ...avatar, shoesType: item.id as ShoesType })}
                        className={`group relative flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all aspect-square ${
                          isSelected
                            ? 'border-[#3b82f6] bg-[#3b82f6]/20 shadow-md ring-2 ring-[#3b82f6]/30'
                            : 'border-[#383a40] bg-[#1e1f22] hover:border-slate-500'
                        }`}
                      >
                        <div
                          className="w-10 h-10 rounded-2xl mb-1.5 flex items-center justify-center text-xs font-bold text-white shadow"
                          style={{ backgroundColor: avatar.shoesColor }}
                        >
                          👟
                        </div>
                        <span className="text-[11px] font-semibold text-slate-200 truncate max-w-[80px]">
                          {item.label}
                        </span>
                        {isSelected && (
                          <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-[#3b82f6] text-white rounded-full flex items-center justify-center">
                            <Check className="w-2.5 h-2.5" />
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* CATEGORY: CHAPÉU & LAÇOS */}
              {activeCategory === 'hat' && (
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'none', label: 'Nenhum' },
                    { id: 'ribbon_bow', label: 'Laço / Fita' },
                    { id: 'cap_forward', label: 'Boné Frontal' },
                    { id: 'cap_backward', label: 'Boné Virado' },
                    { id: 'beanie', label: 'Gorro de Lã' },
                    { id: 'headband', label: 'Faixa de Cabeça' },
                  ].map((item) => {
                    const isSelected = avatar.hatType === item.id
                    return (
                      <button
                        key={item.id}
                        onClick={() => setAvatar({ ...avatar, hatType: item.id as HatType })}
                        className={`group relative flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all aspect-square ${
                          isSelected
                            ? 'border-[#3b82f6] bg-[#3b82f6]/20 shadow-md ring-2 ring-[#3b82f6]/30'
                            : 'border-[#383a40] bg-[#1e1f22] hover:border-slate-500'
                        }`}
                      >
                        <div
                          className="w-10 h-10 rounded-2xl mb-1.5 flex items-center justify-center text-xs font-bold text-white shadow"
                          style={{ backgroundColor: item.id === 'none' ? '#18191c' : avatar.hatColor }}
                        >
                          {item.id === 'none' ? '🚫' : '🎀'}
                        </div>
                        <span className="text-[11px] font-semibold text-slate-200 truncate max-w-[80px]">
                          {item.label}
                        </span>
                        {isSelected && (
                          <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-[#3b82f6] text-white rounded-full flex items-center justify-center">
                            <Check className="w-2.5 h-2.5" />
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* CATEGORY: ÓCULOS */}
              {activeCategory === 'glasses' && (
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'none', label: 'Nenhum' },
                    { id: 'round', label: 'Redondos' },
                    { id: 'square', label: 'Quadrados' },
                    { id: 'sunglasses', label: 'Escuros' },
                    { id: 'wireframe', label: 'Armação de Metal' },
                  ].map((item) => {
                    const isSelected = avatar.glassesType === item.id
                    return (
                      <button
                        key={item.id}
                        onClick={() => setAvatar({ ...avatar, glassesType: item.id as GlassesType })}
                        className={`group relative flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all aspect-square ${
                          isSelected
                            ? 'border-[#3b82f6] bg-[#3b82f6]/20 shadow-md ring-2 ring-[#3b82f6]/30'
                            : 'border-[#383a40] bg-[#1e1f22] hover:border-slate-500'
                        }`}
                      >
                        <div
                          className="w-10 h-10 rounded-2xl mb-1.5 flex items-center justify-center text-xs font-bold text-white shadow"
                          style={{ backgroundColor: item.id === 'none' ? '#18191c' : avatar.glassesColor }}
                        >
                          {item.id === 'none' ? '🚫' : '👓'}
                        </div>
                        <span className="text-[11px] font-semibold text-slate-200 truncate max-w-[80px]">
                          {item.label}
                        </span>
                        {isSelected && (
                          <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-[#3b82f6] text-white rounded-full flex items-center justify-center">
                            <Check className="w-2.5 h-2.5" />
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* CATEGORY: OUTRO / EXTRAS */}
              {activeCategory === 'other' && (
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'none', label: 'Nenhum' },
                    { id: 'headphones', label: 'Fones Gamer DJ' },
                    { id: 'mask', label: 'Máscara Facial' },
                  ].map((item) => {
                    const isSelected = avatar.otherType === item.id
                    return (
                      <button
                        key={item.id}
                        onClick={() => setAvatar({ ...avatar, otherType: item.id as OtherType })}
                        className={`group relative flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all aspect-square ${
                          isSelected
                            ? 'border-[#3b82f6] bg-[#3b82f6]/20 shadow-md ring-2 ring-[#3b82f6]/30'
                            : 'border-[#383a40] bg-[#1e1f22] hover:border-slate-500'
                        }`}
                      >
                        <div
                          className="w-10 h-10 rounded-2xl mb-1.5 flex items-center justify-center text-xs font-bold text-white shadow"
                          style={{ backgroundColor: item.id === 'none' ? '#18191c' : avatar.otherColor }}
                        >
                          {item.id === 'none' ? '🚫' : '🎧'}
                        </div>
                        <span className="text-[11px] font-semibold text-slate-200 truncate max-w-[80px]">
                          {item.label}
                        </span>
                        {isSelected && (
                          <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-[#3b82f6] text-white rounded-full flex items-center justify-center">
                            <Check className="w-2.5 h-2.5" />
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Bottom Color Palette Swatches */}
            <div className="pt-3 border-t border-[#383a40] flex items-center gap-2 overflow-x-auto pb-1">
              {activeCategory === 'skin' &&
                skinTones.map((color) => (
                  <button
                    key={color}
                    onClick={() => setAvatar({ ...avatar, skinTone: color })}
                    className={`w-7 h-7 rounded-full border-2 transition-all shrink-0 ${
                      avatar.skinTone === color ? 'border-white scale-110 shadow-lg' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}

              {(activeCategory === 'hair' || activeCategory === 'facialHair') &&
                hairColors.map((color) => (
                  <button
                    key={color}
                    onClick={() => {
                      if (activeCategory === 'hair') setAvatar({ ...avatar, hairColor: color })
                      else setAvatar({ ...avatar, facialHairColor: color })
                    }}
                    className={`w-7 h-7 rounded-full border-2 transition-all shrink-0 ${
                      (activeCategory === 'hair' ? avatar.hairColor : avatar.facialHairColor) === color
                        ? 'border-white scale-110 shadow-lg'
                        : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}

              {(activeCategory === 'top' ||
                activeCategory === 'jacket' ||
                activeCategory === 'bottom' ||
                activeCategory === 'hat' ||
                activeCategory === 'glasses' ||
                activeCategory === 'other') &&
                fabricColors.map((color) => (
                  <button
                    key={color}
                    onClick={() => {
                      if (activeCategory === 'top') setAvatar({ ...avatar, topColor: color })
                      else if (activeCategory === 'jacket') setAvatar({ ...avatar, jacketColor: color })
                      else if (activeCategory === 'bottom') setAvatar({ ...avatar, bottomColor: color })
                      else if (activeCategory === 'hat') setAvatar({ ...avatar, hatColor: color })
                      else if (activeCategory === 'glasses') setAvatar({ ...avatar, glassesColor: color })
                      else if (activeCategory === 'other') setAvatar({ ...avatar, otherColor: color })
                    }}
                    className={`w-7 h-7 rounded-full border-2 transition-all shrink-0 ${
                      (activeCategory === 'top'
                        ? avatar.topColor
                        : activeCategory === 'jacket'
                        ? avatar.jacketColor
                        : activeCategory === 'bottom'
                        ? avatar.bottomColor
                        : activeCategory === 'hat'
                        ? avatar.hatColor
                        : activeCategory === 'glasses'
                        ? avatar.glassesColor
                        : avatar.otherColor) === color
                        ? 'border-white scale-110 shadow-lg'
                        : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}

              {activeCategory === 'shoes' &&
                shoeColors.map((color) => (
                  <button
                    key={color}
                    onClick={() => setAvatar({ ...avatar, shoesColor: color })}
                    className={`w-7 h-7 rounded-full border-2 transition-all shrink-0 ${
                      avatar.shoesColor === color ? 'border-white scale-110 shadow-lg' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
            </div>
          </div>

          {/* ========================================== */}
          {/* 3. RIGHT COLUMN: 2D ROOM LIVE PREVIEW      */}
          {/* ========================================== */}
          <div className="w-80 bg-[#1e1f22] border-l border-[#2b2d31] relative flex items-center justify-center p-4 shrink-0 overflow-hidden">
            {/* Live 2D Canvas Stage */}
            <div className="w-full h-full rounded-2xl overflow-hidden shadow-2xl relative border border-[#2b2d31]">
              <canvas ref={previewCanvasRef} width={280} height={460} className="w-full h-full pixelated" />

              {/* Floating Top-Right Download Button */}
              <button
                onClick={handleDownloadPNG}
                className="absolute top-3 right-3 p-2.5 rounded-xl bg-[#18191c]/80 hover:bg-[#18191c] text-slate-300 hover:text-white border border-[#2b2d31] backdrop-blur-md shadow-lg transition-all active:scale-95"
                title="Baixar Avatar em PNG"
              >
                <Download className="w-4 h-4" />
              </button>

              {/* Floating Bottom-Right Randomize (Dice) Button */}
              <button
                onClick={handleRandomize}
                className="absolute bottom-3 right-3 p-3 rounded-2xl bg-[#18191c]/90 hover:bg-[#3b82f6] text-slate-300 hover:text-white border border-[#2b2d31] backdrop-blur-md shadow-xl transition-all hover:rotate-12 active:scale-95"
                title="Gerar Combinação Aleatória (Dados)"
              >
                <Dices className="w-5 h-5 text-indigo-400 group-hover:text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#2b2d31] bg-[#18191c] flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 hover:bg-[#2b2d31] transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-7 py-2.5 rounded-xl text-xs font-extrabold bg-[#3b82f6] hover:bg-blue-500 text-white shadow-lg shadow-blue-500/30 transition-all active:scale-95 flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Feito</span>
          </button>
        </div>
      </div>
    </div>
  )
}
