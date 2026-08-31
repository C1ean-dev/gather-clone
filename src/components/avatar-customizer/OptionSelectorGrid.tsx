import React from 'react'
import { Check, Plus, Pencil, Trash2, RotateCcw, Sparkles } from 'lucide-react'
import {
  AvatarConfig,
  AvatarComponentSlot,
  SkinDetailType,
  EyeType,
  HairStyleType,
  FacialHairType,
  TopType,
  JacketType,
  BottomType,
  ShoesType,
  HatType,
  GlassesType,
  OtherType,
} from '../../types/game'
import { CategoryKey } from './CategoryTabs'
import { useCustomAssetsStore } from '../../store/useCustomAssetsStore'

interface Props {
  activeCategory: CategoryKey
  avatar: AvatarConfig
  onChangeAvatar: (newAvatar: AvatarConfig) => void
}

const CATEGORY_SLOT_MAP: Record<CategoryKey, AvatarComponentSlot | null> = {
  skin: 'skin',
  eyes: 'eyes',
  hair: 'hair',
  facialHair: 'facialHair',
  top: 'top',
  jacket: 'jacket',
  bottom: 'bottom',
  shoes: 'shoes',
  hat: 'hat',
  glasses: 'glasses',
  other: 'other',
  handDrawn: null,
}

const CATEGORY_TITLES: Record<CategoryKey, string> = {
  skin: 'Tom da Pele & Rosto',
  eyes: 'Olhos & Expressão',
  hair: 'Cabelo & Penteado',
  facialHair: 'Pelos Faciais / Barba',
  top: 'Parte de Cima / Camisas',
  jacket: 'Jaquetas & Casacos',
  bottom: 'Parte de Baixo / Calças',
  shoes: 'Sapatos & Calçados',
  hat: 'Chapéus & Tiaras',
  glasses: 'Óculos & Lentes',
  other: 'Acessórios / Extras',
  handDrawn: 'Skins Feitas à Mão',
}

export const OptionSelectorGrid: React.FC<Props> = ({ activeCategory, avatar, onChangeAvatar }) => {
  const { customAssets, deleteCustomAsset } = useCustomAssetsStore()
  const avatarAssets = customAssets.filter((a) => a.type === 'avatar')
  const activeSlot = CATEGORY_SLOT_MAP[activeCategory]

  return (
    <div className="flex-1 overflow-y-auto pr-1">
      {/* Component-specific Draw Header with Ghost Overview */}
      {activeCategory !== 'handDrawn' && activeSlot && (
        <div className="mb-3.5 p-2.5 rounded-2xl bg-[#1e1f22] border border-[#2b2d31] flex items-center justify-between gap-2 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-200">
              {CATEGORY_TITLES[activeCategory]}
            </span>
            {avatar.customComponents?.[activeSlot] && (
              <span className="px-2 py-0.5 rounded-full bg-violet-500/20 border border-violet-500/30 text-violet-300 font-bold text-[10px] flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-300" />
                <span>Peça Desenhada Ativa</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {avatar.customComponents?.[activeSlot] && (
              <button
                type="button"
                onClick={() => {
                  const newComponents = { ...avatar.customComponents }
                  delete newComponents[activeSlot]
                  onChangeAvatar({ ...avatar, customComponents: newComponents })
                }}
                className="px-2.5 py-1 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 font-bold text-[11px] flex items-center gap-1 transition-all"
                title="Remover desenho customizado desta categoria"
              >
                <Trash2 className="w-3 h-3" />
                <span>Remover</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                useCustomAssetsStore.getState().openDrawModal({
                  avatarComponentSlot: activeSlot,
                  showGhostAvatar: true,
                  dataUrl: avatar.customComponents?.[activeSlot],
                  name: `Desenho de ${CATEGORY_TITLES[activeCategory]}`,
                  width: 1,
                  height: 1,
                })
              }}
              className="px-3 py-1 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-500/20 transition-all active:scale-95"
              title={`Desenhar apenas ${CATEGORY_TITLES[activeCategory]} à mão com transparência do corpo de fundo`}
            >
              <Pencil className="w-3.5 h-3.5 text-amber-300" />
              <span>
                {avatar.customComponents?.[activeSlot]
                  ? '✏️ Editar Desenho à Mão'
                  : `✏️ Desenhar ${CATEGORY_TITLES[activeCategory].split(' ')[0]} à Mão`}
              </span>
            </button>
          </div>
        </div>
      )}
      {/* CATEGORY: FEITOS À MÃO / SKINS CUSTOMIZADAS */}
      {activeCategory === 'handDrawn' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">
              Skins & Componentes Desenhados à Mão
            </span>
            <button
              type="button"
              onClick={() => {
                useCustomAssetsStore.getState().openDrawModal({
                  name: 'Meu Avatar Pixel Art',
                  width: 1,
                  height: 1,
                })
              }}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-500/20 transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Desenhar Novo Avatar</span>
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {/* Option to clear custom hand-drawn skin and revert to standard avatar */}
            <button
              onClick={() => onChangeAvatar({ ...avatar, customSkinUrl: undefined, customAvatarId: undefined })}
              className={`group relative flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all aspect-square ${
                !avatar.customSkinUrl
                  ? 'border-[#3b82f6] bg-[#3b82f6]/20 shadow-md ring-2 ring-[#3b82f6]/30'
                  : 'border-[#383a40] bg-[#1e1f22] hover:border-slate-500'
              }`}
            >
              <div className="w-12 h-12 rounded-xl bg-[#26282e] border border-white/10 flex items-center justify-center mb-1.5">
                <RotateCcw className="w-5 h-5 text-slate-300 group-hover:rotate-45 transition-transform" />
              </div>
              <span className="text-[11px] font-semibold text-slate-200 text-center">
                Avatar Padrão
              </span>
              {!avatar.customSkinUrl && (
                <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-[#3b82f6] text-white rounded-full flex items-center justify-center">
                  <Check className="w-2.5 h-2.5" />
                </div>
              )}
            </button>

            {/* List of all custom drawn avatar skins */}
            {avatarAssets.map((asset) => {
              const isSelected = avatar.customSkinUrl === asset.frames[0] || avatar.customAvatarId === asset.id
              return (
                <div
                  key={asset.id}
                  className={`group relative flex flex-col items-center justify-between p-2.5 rounded-2xl border-2 transition-all aspect-square ${
                    isSelected
                      ? 'border-[#3b82f6] bg-[#3b82f6]/20 shadow-md ring-2 ring-[#3b82f6]/30'
                      : 'border-[#383a40] bg-[#1e1f22] hover:border-slate-500'
                  }`}
                >
                  {/* Top Left Edit in Draw Studio Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      useCustomAssetsStore.getState().openDrawModal({
                        dataUrl: asset.frames[0],
                        name: asset.name,
                        width: 1,
                        height: 1,
                      })
                    }}
                    className="absolute top-1.5 left-1.5 p-1 rounded-md bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-400 hover:text-indigo-200 z-10 transition-colors"
                    title="Editar pixels no Desenhar à Mão"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>

                  {/* Top Right Delete Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (confirm(`Excluir o avatar "${asset.name}"?`)) {
                        deleteCustomAsset(asset.id)
                        if (isSelected) {
                          onChangeAvatar({ ...avatar, customSkinUrl: undefined, customAvatarId: undefined })
                        }
                      }
                    }}
                    className="absolute top-1.5 right-1.5 p-1 rounded-md bg-rose-500/20 hover:bg-rose-500/40 text-rose-400 hover:text-rose-200 z-10 transition-colors"
                    title="Excluir skin de avatar"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onChangeAvatar({ ...avatar, customSkinUrl: asset.frames[0], customAvatarId: asset.id })}
                    className="w-full h-full flex flex-col items-center justify-center"
                  >
                    <div className="w-14 h-14 rounded-xl bg-[#12151d] border border-white/10 flex items-center justify-center p-1 overflow-hidden mb-1">
                      <img
                        src={asset.frames[0]}
                        alt={asset.name}
                        className="max-w-full max-h-full object-contain pixelated"
                      />
                    </div>
                    <span className="text-[11px] font-semibold text-slate-200 truncate max-w-[90px]">
                      {asset.name}
                    </span>
                  </button>

                  {isSelected && (
                    <div className="absolute bottom-1.5 right-1.5 w-4 h-4 bg-[#3b82f6] text-white rounded-full flex items-center justify-center">
                      <Check className="w-2.5 h-2.5" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
      {/* CATEGORY: TOM DA PELE */}
      {activeCategory === 'skin' && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { id: 'smooth', label: 'Lisa / Suave' },
            { id: 'vitiligo1', label: 'Vitiligo 1' },
            { id: 'vitiligo2', label: 'Vitiligo 2' },
            { id: 'freckles', label: 'Sardas' },
            { id: 'blush', label: 'Blush Rosado' },
          ].map((item) => {
            const isSelected = avatar.skinDetail === item.id
            return (
              <button
                key={item.id}
                onClick={() => onChangeAvatar({ ...avatar, skinDetail: item.id as SkinDetailType })}
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

      {/* CATEGORY: OLHOS */}
      {activeCategory === 'eyes' && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { id: 'normal', label: 'Padrão / Normal' },
            { id: 'anime', label: 'Brilho Anime' },
            { id: 'focused', label: 'Focado / Calmo' },
            { id: 'happy', label: 'Alegre (^.^)' },
            { id: 'wink', label: 'Piscadela (;.)' },
            { id: 'closed', label: 'Fechados / Zen' },
          ].map((item) => {
            const isSelected = (avatar.eyeType || 'normal') === item.id
            return (
              <button
                key={item.id}
                onClick={() => onChangeAvatar({ ...avatar, eyeType: item.id as EyeType })}
                className={`group relative flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all aspect-square ${
                  isSelected
                    ? 'border-[#3b82f6] bg-[#3b82f6]/20 shadow-md ring-2 ring-[#3b82f6]/30'
                    : 'border-[#383a40] bg-[#1e1f22] hover:border-slate-500'
                }`}
              >
                {/* Mini Face Eye Graphic */}
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center relative mb-1.5 shadow-sm"
                  style={{ backgroundColor: avatar.skinTone }}
                >
                  {item.id === 'happy' ? (
                    <span className="text-sm font-bold text-slate-900">^ . ^</span>
                  ) : item.id === 'closed' ? (
                    <span className="text-sm font-bold text-slate-900">- . -</span>
                  ) : item.id === 'wink' ? (
                    <span className="text-sm font-bold text-slate-900">• . ~</span>
                  ) : item.id === 'focused' ? (
                    <div className="flex gap-2">
                      <span className="w-2.5 h-1.5 rounded-xs" style={{ backgroundColor: avatar.eyeColor || '#111' }} />
                      <span className="w-2.5 h-1.5 rounded-xs" style={{ backgroundColor: avatar.eyeColor || '#111' }} />
                    </div>
                  ) : item.id === 'anime' ? (
                    <div className="flex gap-2">
                      <div className="w-3 h-3.5 rounded-xs relative" style={{ backgroundColor: avatar.eyeColor || '#111' }}>
                        <span className="w-1 h-1 bg-white absolute top-0 left-0" />
                      </div>
                      <div className="w-3 h-3.5 rounded-xs relative" style={{ backgroundColor: avatar.eyeColor || '#111' }}>
                        <span className="w-1 h-1 bg-white absolute top-0 left-0" />
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2.5">
                      <div className="w-2.5 h-3 rounded-xs relative" style={{ backgroundColor: avatar.eyeColor || '#111' }}>
                        <span className="w-1 h-1 bg-white absolute top-0 left-0" />
                      </div>
                      <div className="w-2.5 h-3 rounded-xs relative" style={{ backgroundColor: avatar.eyeColor || '#111' }}>
                        <span className="w-1 h-1 bg-white absolute top-0 left-0" />
                      </div>
                    </div>
                  )}
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
            { id: 'none', label: 'Careca / Nenhum' },
            { id: 'messy', label: 'Messy Anime' },
            { id: 'long_bangs', label: 'Longo c/ Franja' },
            { id: 'twin_tails', label: 'Maria Chiquinha' },
            { id: 'curly_afro', label: 'Afro / Cachos' },
            { id: 'anime', label: 'Espetado Anime' },
            { id: 'short_wavy', label: 'Curto Ondulado' },
            { id: 'ponytail', label: 'Rabo de Cavalo' },
            { id: 'bob', label: 'Chanel / Bob' },
            { id: 'buzz', label: 'Raspado' },
          ].map((item) => {
            const isSelected = avatar.hairStyle === item.id || (item.id === 'none' && (!avatar.hairStyle || avatar.hairStyle === 'bald'))
            return (
              <button
                key={item.id}
                onClick={() => onChangeAvatar({ ...avatar, hairStyle: item.id as HairStyleType })}
                className={`group relative flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all aspect-square ${
                  isSelected
                    ? 'border-[#3b82f6] bg-[#3b82f6]/20 shadow-md ring-2 ring-[#3b82f6]/30'
                    : 'border-[#383a40] bg-[#1e1f22] hover:border-slate-500'
                }`}
              >
                <div
                  className="w-10 h-10 rounded-2xl mb-1.5 flex items-center justify-center text-xs font-bold text-white shadow-md"
                  style={{ backgroundColor: item.id === 'none' ? '#18191c' : avatar.hairColor }}
                >
                  {item.id === 'none' ? '🚫' : '💇'}
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
                onClick={() => onChangeAvatar({ ...avatar, facialHair: item.id as FacialHairType })}
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
            { id: 'none', label: 'Nenhum' },
            { id: 'kimono', label: 'Quimono / Yukata' },
            { id: 'tshirt', label: 'Camiseta Básica' },
            { id: 'sweater', label: 'Suéter de Lã' },
            { id: 'dress_shirt', label: 'Camisa Social' },
            { id: 'hoodie', label: 'Moletom Canguru' },
            { id: 'tank', label: 'Regata' },
          ].map((item) => {
            const isSelected = avatar.topType === item.id || (!avatar.topType && item.id === 'none')
            return (
              <button
                key={item.id}
                onClick={() => onChangeAvatar({ ...avatar, topType: item.id as TopType })}
                className={`group relative flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all aspect-square ${
                  isSelected
                    ? 'border-[#3b82f6] bg-[#3b82f6]/20 shadow-md ring-2 ring-[#3b82f6]/30'
                    : 'border-[#383a40] bg-[#1e1f22] hover:border-slate-500'
                }`}
              >
                <div
                  className="w-10 h-10 rounded-2xl mb-1.5 flex items-center justify-center text-xs font-bold text-white shadow"
                  style={{ backgroundColor: item.id === 'none' ? '#18191c' : avatar.topColor }}
                >
                  {item.id === 'none' ? '🚫' : '👘'}
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
                onClick={() => onChangeAvatar({ ...avatar, jacketType: item.id as JacketType })}
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
            { id: 'none', label: 'Nenhum' },
            { id: 'kimono_skirt', label: 'Saia Quimono Hakama' },
            { id: 'jeans', label: 'Calça Jeans' },
            { id: 'sweatpants', label: 'Moletom Jogger' },
            { id: 'skirt', label: 'Saia Plissada' },
            { id: 'shorts', label: 'Bermuda / Shorts' },
          ].map((item) => {
            const isSelected = avatar.bottomType === item.id || (!avatar.bottomType && item.id === 'none')
            return (
              <button
                key={item.id}
                onClick={() => onChangeAvatar({ ...avatar, bottomType: item.id as BottomType })}
                className={`group relative flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all aspect-square ${
                  isSelected
                    ? 'border-[#3b82f6] bg-[#3b82f6]/20 shadow-md ring-2 ring-[#3b82f6]/30'
                    : 'border-[#383a40] bg-[#1e1f22] hover:border-slate-500'
                }`}
              >
                <div
                  className="w-10 h-10 rounded-2xl mb-1.5 flex items-center justify-center text-xs font-bold text-white shadow"
                  style={{ backgroundColor: item.id === 'none' ? '#18191c' : avatar.bottomColor }}
                >
                  {item.id === 'none' ? '🚫' : '👖'}
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
            { id: 'none', label: 'Nenhum / Descalço' },
            { id: 'sandals', label: 'Sandálias Geta' },
            { id: 'sneakers', label: 'Tênis Sneaker' },
            { id: 'boots', label: 'Botas' },
            { id: 'loafers', label: 'Sapato Social' },
          ].map((item) => {
            const isSelected = avatar.shoesType === item.id || (!avatar.shoesType && item.id === 'none')
            return (
              <button
                key={item.id}
                onClick={() => onChangeAvatar({ ...avatar, shoesType: item.id as ShoesType })}
                className={`group relative flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all aspect-square ${
                  isSelected
                    ? 'border-[#3b82f6] bg-[#3b82f6]/20 shadow-md ring-2 ring-[#3b82f6]/30'
                    : 'border-[#383a40] bg-[#1e1f22] hover:border-slate-500'
                }`}
              >
                <div
                  className="w-10 h-10 rounded-2xl mb-1.5 flex items-center justify-center text-xs font-bold text-white shadow"
                  style={{ backgroundColor: item.id === 'none' ? '#18191c' : avatar.shoesColor }}
                >
                  {item.id === 'none' ? '🚫' : '👟'}
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
                onClick={() => onChangeAvatar({ ...avatar, hatType: item.id as HatType })}
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
                onClick={() => onChangeAvatar({ ...avatar, glassesType: item.id as GlassesType })}
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
                onClick={() => onChangeAvatar({ ...avatar, otherType: item.id as OtherType })}
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
  )
}
