import React, { useState, useEffect } from 'react'
import { X, Check } from 'lucide-react'
import { useGameStore } from '../store/useGameStore'
import { AvatarConfig, AvatarComponentSlot } from '../types/game'
import { PeerManager } from '../p2p/PeerManager'
import { CategoryKey, CategoryTabs } from './avatar-customizer/CategoryTabs'
import {
  ColorPalettePicker,
  SKIN_TONES,
  EYE_COLORS,
  HAIR_COLORS,
  FABRIC_COLORS,
  SHOE_COLORS,
} from './avatar-customizer/ColorPalettePicker'
import { OptionSelectorGrid } from './avatar-customizer/OptionSelectorGrid'
import { AvatarPreviewCanvas } from './avatar-customizer/AvatarPreviewCanvas'
import { AvatarPixelArtModal } from '../editor/avatar/AvatarPixelArtModal'
import { bakeAvatarPreset, cropContentDataUrl } from '../engine/avatar/avatarBakeService'
import { useCustomAssetsStore } from '../store/useCustomAssetsStore'

interface Props {
  isOpen: boolean
  onClose: () => void
}

export const AvatarCustomizerModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { localPlayer, setLocalPlayer } = useGameStore()

  const [activeCategory, setActiveCategory] = useState<CategoryKey>('skin')
  const [name, setName] = useState(localPlayer.name || 'Player')
  const [avatar, setAvatar] = useState<AvatarConfig>({
    skinTone: localPlayer.avatar?.skinTone || localPlayer.avatar?.skinColor || '#ffd1a4',
    skinDetail: localPlayer.avatar?.skinDetail || 'smooth',
    eyeType: localPlayer.avatar?.eyeType || 'normal',
    eyeColor: localPlayer.avatar?.eyeColor || '#111111',
    hairStyle: localPlayer.avatar?.hairStyle || 'none',
    hairColor: localPlayer.avatar?.hairColor || '#212529',
    facialHair: localPlayer.avatar?.facialHair || 'none',
    facialHairColor: localPlayer.avatar?.facialHairColor || '#212529',
    topType: localPlayer.avatar?.topType || localPlayer.avatar?.shirtType || 'none',
    topColor: localPlayer.avatar?.topColor || localPlayer.avatar?.shirtColor || '#212529',
    jacketType: localPlayer.avatar?.jacketType || 'none',
    jacketColor: localPlayer.avatar?.jacketColor || '#4c6ef5',
    bottomType: localPlayer.avatar?.bottomType || 'none',
    bottomColor: localPlayer.avatar?.bottomColor || localPlayer.avatar?.pantsColor || '#212529',
    shoesType: localPlayer.avatar?.shoesType || 'none',
    shoesColor: localPlayer.avatar?.shoesColor || '#51cf66',
    hatType: localPlayer.avatar?.hatType || 'none',
    hatColor: localPlayer.avatar?.hatColor || '#fa5252',
    glassesType: localPlayer.avatar?.glassesType || 'none',
    glassesColor: localPlayer.avatar?.glassesColor || '#343a40',
    otherType: localPlayer.avatar?.otherType || 'none',
    otherColor: localPlayer.avatar?.otherColor || '#20c997',
  })

  const [editingPreset, setEditingPreset] = useState<{
    isOpen: boolean
    category: AvatarComponentSlot
    presetId: string
    presetName: string
    dataUrl?: string
  } | null>(null)

  // Sync state when opened
  useEffect(() => {
    if (isOpen) {
      setName(localPlayer.name || 'Player')
      setAvatar({
        customSkinUrl: localPlayer.avatar?.customSkinUrl,
        customAvatarId: localPlayer.avatar?.customAvatarId,
        customComponents: localPlayer.avatar?.customComponents,
        skinTone: localPlayer.avatar?.skinTone || localPlayer.avatar?.skinColor || '#ffd1a4',
        skinDetail: localPlayer.avatar?.skinDetail || 'smooth',
        eyeType: localPlayer.avatar?.eyeType || 'normal',
        eyeColor: localPlayer.avatar?.eyeColor || '#111111',
        hairStyle: localPlayer.avatar?.hairStyle || 'none',
        hairColor: localPlayer.avatar?.hairColor || '#212529',
        facialHair: localPlayer.avatar?.facialHair || 'none',
        facialHairColor: localPlayer.avatar?.facialHairColor || '#212529',
        topType: localPlayer.avatar?.topType || localPlayer.avatar?.shirtType || 'none',
        topColor: localPlayer.avatar?.topColor || localPlayer.avatar?.shirtColor || '#212529',
        jacketType: localPlayer.avatar?.jacketType || 'none',
        jacketColor: localPlayer.avatar?.jacketColor || '#4c6ef5',
        bottomType: localPlayer.avatar?.bottomType || 'none',
        bottomColor: localPlayer.avatar?.bottomColor || localPlayer.avatar?.pantsColor || '#212529',
        shoesType: localPlayer.avatar?.shoesType || 'none',
        shoesColor: localPlayer.avatar?.shoesColor || '#51cf66',
        hatType: localPlayer.avatar?.hatType || 'none',
        hatColor: localPlayer.avatar?.hatColor || '#fa5252',
        glassesType: localPlayer.avatar?.glassesType || 'none',
        glassesColor: localPlayer.avatar?.glassesColor || '#343a40',
        otherType: localPlayer.avatar?.otherType || 'none',
        otherColor: localPlayer.avatar?.otherColor || '#20c997',
      })
    }
  }, [isOpen, localPlayer])

  if (!isOpen) return null

  const handleOpenEditPreset = (category: AvatarComponentSlot, presetId: string, label: string) => {
    const baked = bakeAvatarPreset(category, presetId, avatar)
    setEditingPreset({
      isOpen: true,
      category,
      presetId,
      presetName: label,
      dataUrl: baked,
    })
  }

  const handleOpenCreatePreset = (category: AvatarComponentSlot) => {
    setEditingPreset({
      isOpen: true,
      category,
      presetId: '',
      presetName: '',
      dataUrl: undefined,
    })
  }

  const handleSavePresetFromStudio = async (savedDataUrl: string, name: string) => {
    if (!editingPreset) return
    const category = editingPreset.category

    // 1. Create and persist CustomAsset permanently into nativeAssets & mesh
    const customName = name || `Preset ${category}`
    const thumbnail = await cropContentDataUrl(savedDataUrl)

    const newAsset = {
      id: `avatar_${category}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: customName,
      type: 'avatar' as const,
      category: 'Avatares',
      avatarSlot: category,
      thumbnail,
      width: 1,
      height: 1,
      isObstacle: false,
      frames: [savedDataUrl],
      frameRateMs: 160,
      createdAt: Date.now(),
    }
    useCustomAssetsStore.getState().addCustomAsset(newAsset)

    // 2. Equip immediately onto player avatar
    const updatedAvatar: AvatarConfig = {
      ...avatar,
      customComponents: {
        ...avatar.customComponents,
        [category]: savedDataUrl,
      },
    }
    setAvatar(updatedAvatar)
    setEditingPreset(null)
  }

  const handleSave = () => {
    const finalName = name.trim() || localPlayer.name
    setLocalPlayer({ name: finalName, avatar })
    PeerManager.getInstance().sendPlayerUpdate({
      name: finalName,
      avatar,
    })
    onClose()
  }

  // Randomize Avatar (Dice 🎲 feature)
  const handleRandomize = () => {
    const r = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)]

    const newAvatar: AvatarConfig = {
      skinTone: r(SKIN_TONES),
      skinDetail: r(['smooth', 'vitiligo1', 'vitiligo2', 'freckles', 'blush']),
      eyeType: r(['normal', 'anime', 'focused', 'happy', 'wink', 'closed']),
      eyeColor: r(EYE_COLORS),
      hairStyle: r(['none', 'messy', 'anime', 'long_bangs', 'short_wavy', 'curly_afro', 'twin_tails', 'ponytail', 'bob']),
      hairColor: r(HAIR_COLORS),
      facialHair: r(['none', 'none', 'full_beard', 'mustache', 'goatee', 'stubble']),
      facialHairColor: r(HAIR_COLORS),
      topType: r(['none', 'kimono', 'yukata', 'tshirt', 'sweater', 'dress_shirt', 'hoodie']),
      topColor: r(FABRIC_COLORS),
      jacketType: r(['none', 'none', 'hoodie_open', 'cardigan', 'blazer', 'denim']),
      jacketColor: r(FABRIC_COLORS),
      bottomType: r(['none', 'kimono_skirt', 'jeans', 'sweatpants', 'skirt', 'shorts']),
      bottomColor: r(FABRIC_COLORS),
      shoesType: r(['none', 'sneakers', 'boots', 'sandals', 'loafers']),
      shoesColor: r(SHOE_COLORS),
      hatType: r(['none', 'none', 'ribbon_bow', 'cap_forward', 'cap_backward', 'beanie', 'headband']),
      hatColor: r(FABRIC_COLORS),
      glassesType: r(['none', 'none', 'round', 'square', 'sunglasses', 'wireframe']),
      glassesColor: r(FABRIC_COLORS),
      otherType: r(['none', 'none', 'headphones', 'mask']),
      otherColor: r(FABRIC_COLORS),
    }

    setAvatar(newAvatar)
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200 select-none">
      <div className="bg-[#1e1f22] border border-[#2b2d31] rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col h-[600px] max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-[#2b2d31] bg-[#18191c]">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-extrabold text-slate-100 tracking-tight">Editar Avatar</h2>
            <div className="h-4 w-px bg-[#2b2d31]" />
            <div className="flex items-center gap-1.5 bg-[#2b2d31] px-2.5 py-1 rounded-xl border border-[#383a40]">
              <span className="text-[11px] font-semibold text-slate-400">Nome:</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu Nickname"
                maxLength={16}
                className="bg-transparent text-xs font-bold text-slate-100 focus:outline-none focus:text-white w-28"
              />
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-[#2b2d31] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3-Column Main Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* 1. LEFT SIDEBAR: CATEGORIES LIST */}
          <CategoryTabs activeCategory={activeCategory} onSelectCategory={setActiveCategory} />

          {/* 2. MIDDLE COLUMN: OPTIONS GRID & PALETTE */}
          <div className="flex-1 bg-[#2b2d31] flex flex-col justify-between p-5 overflow-hidden">
            <OptionSelectorGrid
              activeCategory={activeCategory}
              avatar={avatar}
              onChangeAvatar={setAvatar}
              onEditPreset={handleOpenEditPreset}
              onCreatePreset={handleOpenCreatePreset}
            />

            <ColorPalettePicker
              activeCategory={activeCategory}
              avatar={avatar}
              onChangeAvatar={setAvatar}
            />
          </div>

          {/* 3. RIGHT COLUMN: 2D ROOM LIVE PREVIEW */}
          <AvatarPreviewCanvas
            isOpen={isOpen}
            avatar={avatar}
            name={name}
            localPlayer={localPlayer}
            onRandomize={handleRandomize}
          />
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

      {/* Pixel Art Drawing & Editing Studio Modal */}
      {editingPreset?.isOpen && (
        <AvatarPixelArtModal
          isOpen={editingPreset.isOpen}
          onClose={() => setEditingPreset(null)}
          category={editingPreset.category}
          presetName={editingPreset.presetName}
          initialDataUrl={editingPreset.dataUrl}
          avatar={avatar}
          onSave={handleSavePresetFromStudio}
        />
      )}
    </div>
  )
}
