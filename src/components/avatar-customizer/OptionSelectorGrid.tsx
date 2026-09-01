import React from 'react'
import { Check, Pencil, Plus } from 'lucide-react'
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
  onEditPreset?: (category: AvatarComponentSlot, presetId: string, label: string) => void
  onCreatePreset?: (category: AvatarComponentSlot) => void
}

export const OptionSelectorGrid: React.FC<Props> = ({
  activeCategory,
  avatar,
  onChangeAvatar,
  onEditPreset,
  onCreatePreset,
}) => {
  const { customAssets } = useCustomAssetsStore()
  const categoryCustomAssets = customAssets.filter(
    (a) => a.type === 'avatar' && a.avatarSlot === activeCategory
  )

  const selectNativePreset = (update: Partial<AvatarConfig>) => {
    const updatedComponents = { ...avatar.customComponents }
    delete updatedComponents[activeCategory as AvatarComponentSlot]
    onChangeAvatar({
      ...avatar,
      ...update,
      customComponents: updatedComponents,
    })
  }

  const renderCard = (
    item: { id: string; label: string },
    isSelected: boolean,
    iconContent: React.ReactNode,
    onSelect: () => void
  ) => {
    // If a customComponent for this activeCategory is equipped, no native preset is considered selected
    const isCustomEquipped = !!avatar.customComponents?.[activeCategory as AvatarComponentSlot]
    const effectiveSelected = !isCustomEquipped && isSelected

    return (
      <button
        key={item.id}
        onClick={onSelect}
        className={`group relative flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all aspect-square ${
          effectiveSelected
            ? 'border-[#3b82f6] bg-[#3b82f6]/20 shadow-md ring-2 ring-[#3b82f6]/30'
            : 'border-[#383a40] bg-[#1e1f22] hover:border-slate-500'
        }`}
      >
        {onEditPreset && item.id !== 'none' && (
          <div
            onClick={(e) => {
              e.stopPropagation()
              onEditPreset(activeCategory as AvatarComponentSlot, item.id, item.label)
            }}
            title={`Editar ${item.label} no Estúdio Pixel Art`}
            className="absolute top-1.5 left-1.5 w-6 h-6 rounded-lg bg-[#2b2d31]/90 hover:bg-[#3b82f6] text-slate-300 hover:text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 z-10 shadow-md cursor-pointer"
          >
            <Pencil className="w-3.5 h-3.5" />
          </div>
        )}

        {iconContent}

        <span className="text-[11px] font-semibold text-slate-200 truncate max-w-[80px]">
          {item.label}
        </span>
        {effectiveSelected && (
          <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-[#3b82f6] text-white rounded-full flex items-center justify-center">
            <Check className="w-2.5 h-2.5" />
          </div>
        )}
      </button>
    )
  }

  const renderCreateCard = () => {
    if (!onCreatePreset) return null
    return (
      <button
        key="__create_new__"
        onClick={() => onCreatePreset(activeCategory as AvatarComponentSlot)}
        className="group relative flex flex-col items-center justify-center p-3 rounded-2xl border-2 border-dashed border-[#3b82f6]/50 bg-[#3b82f6]/5 hover:bg-[#3b82f6]/15 hover:border-[#3b82f6] transition-all aspect-square text-[#3b82f6]"
        title="Criar novo preset do zero no estúdio"
      >
        <div className="w-10 h-10 rounded-2xl mb-1.5 flex items-center justify-center bg-[#3b82f6]/10 group-hover:bg-[#3b82f6] group-hover:text-white transition-all shadow-sm">
          <Plus className="w-5 h-5" />
        </div>
        <span className="text-[11px] font-bold truncate max-w-[80px]">Criar Novo</span>
      </button>
    )
  }

  const renderCustomPresetCards = () => {
    return categoryCustomAssets.map((asset) => {
      const isSelected = avatar.customComponents?.[activeCategory as AvatarComponentSlot] === asset.frames[0]
      return (
        <button
          key={asset.id}
          onClick={() => {
            onChangeAvatar({
              ...avatar,
              customComponents: {
                ...avatar.customComponents,
                [activeCategory as AvatarComponentSlot]: asset.frames[0],
              },
            })
          }}
          className={`group relative flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all aspect-square ${
            isSelected
              ? 'border-[#3b82f6] bg-[#3b82f6]/20 shadow-md ring-2 ring-[#3b82f6]/30'
              : 'border-[#383a40] bg-[#1e1f22] hover:border-slate-500'
          }`}
        >
          {onEditPreset && (
            <div
              onClick={(e) => {
                e.stopPropagation()
                onEditPreset(activeCategory as AvatarComponentSlot, asset.id, asset.name)
              }}
              title={`Editar ${asset.name} no Estúdio Pixel Art`}
              className="absolute top-1.5 left-1.5 w-6 h-6 rounded-lg bg-[#2b2d31]/90 hover:bg-[#3b82f6] text-slate-300 hover:text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 z-10 shadow-md cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" />
            </div>
          )}

          <div className="w-10 h-10 rounded-2xl mb-1.5 flex items-center justify-center bg-[#18191c] border border-slate-700/60 overflow-hidden shadow">
            {asset.frames[0] ? (
              <img src={asset.frames[0]} alt={asset.name} className="w-8 h-8 [image-rendering:pixelated]" />
            ) : (
              <span className="text-xs">🎨</span>
            )}
          </div>

          <span className="text-[11px] font-bold text-[#60a5fa] truncate max-w-[80px]" title={asset.name}>
            {asset.name}
          </span>

          {isSelected && (
            <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-[#3b82f6] text-white rounded-full flex items-center justify-center">
              <Check className="w-2.5 h-2.5" />
            </div>
          )}
        </button>
      )
    })
  }

  return (
    <div className="flex-1 overflow-y-auto pr-1">
      {/* CATEGORY: TOM DA PELE */}
      {activeCategory === 'skin' && (
        <div className="grid grid-cols-3 gap-3">
          {renderCreateCard()}
          {renderCustomPresetCards()}
          {[
            { id: 'smooth', label: 'Lisa / Suave' },
            { id: 'vitiligo1', label: 'Vitiligo 1' },
            { id: 'vitiligo2', label: 'Vitiligo 2' },
            { id: 'freckles', label: 'Sardas' },
            { id: 'blush', label: 'Blush Rosado' },
          ].map((item) => {
            const isSelected = avatar.skinDetail === item.id
            return renderCard(
              item,
              isSelected,
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
                <div className="flex gap-3 mt-1">
                  <span className="w-2 h-2 bg-black rounded-xs" />
                  <span className="w-2 h-2 bg-black rounded-xs" />
                </div>
              </div>,
              () => selectNativePreset({ skinDetail: item.id as SkinDetailType })
            )
          })}
        </div>
      )}

      {/* CATEGORY: OLHOS */}
      {activeCategory === 'eyes' && (
        <div className="grid grid-cols-3 gap-3">
          {renderCreateCard()}
          {renderCustomPresetCards()}
          {[
            { id: 'normal', label: 'Padrão / Normal' },
            { id: 'anime', label: 'Brilho Anime' },
            { id: 'focused', label: 'Focado / Calmo' },
            { id: 'happy', label: 'Alegre (^.^)' },
            { id: 'wink', label: 'Piscadela (;.)' },
            { id: 'closed', label: 'Fechados (--)' },
          ].map((item) => {
            const isSelected = (avatar.eyeType || 'normal') === item.id
            return renderCard(
              item,
              isSelected,
              <div
                className="w-10 h-10 rounded-2xl mb-1.5 flex items-center justify-center relative shadow-sm"
                style={{ backgroundColor: avatar.skinTone }}
              >
                <div className="flex gap-2.5 items-center">
                  {item.id === 'normal' && (
                    <>
                      <div className="w-2 h-2 rounded-xs" style={{ backgroundColor: avatar.eyeColor || '#111' }} />
                      <div className="w-2 h-2 rounded-xs" style={{ backgroundColor: avatar.eyeColor || '#111' }} />
                    </>
                  )}
                  {item.id === 'anime' && (
                    <>
                      <div className="w-2.5 h-2.5 rounded-xs flex flex-col justify-between" style={{ backgroundColor: avatar.eyeColor || '#111' }}>
                        <div className="w-1 h-1 bg-white ml-auto" />
                      </div>
                      <div className="w-2.5 h-2.5 rounded-xs flex flex-col justify-between" style={{ backgroundColor: avatar.eyeColor || '#111' }}>
                        <div className="w-1 h-1 bg-white ml-auto" />
                      </div>
                    </>
                  )}
                  {item.id === 'focused' && (
                    <>
                      <div className="w-2.5 h-1" style={{ backgroundColor: avatar.eyeColor || '#111' }} />
                      <div className="w-2.5 h-1" style={{ backgroundColor: avatar.eyeColor || '#111' }} />
                    </>
                  )}
                  {item.id === 'happy' && (
                    <>
                      <div className="w-2 h-1 border-t-2" style={{ borderColor: avatar.eyeColor || '#111' }} />
                      <div className="w-2 h-1 border-t-2" style={{ borderColor: avatar.eyeColor || '#111' }} />
                    </>
                  )}
                  {item.id === 'wink' && (
                    <>
                      <div className="w-2 h-2 rounded-xs" style={{ backgroundColor: avatar.eyeColor || '#111' }} />
                      <div className="w-2 h-1 border-t-2" style={{ borderColor: avatar.eyeColor || '#111' }} />
                    </>
                  )}
                  {item.id === 'closed' && (
                    <>
                      <div className="w-2 h-0.5" style={{ backgroundColor: avatar.eyeColor || '#111' }} />
                      <div className="w-2 h-0.5" style={{ backgroundColor: avatar.eyeColor || '#111' }} />
                    </>
                  )}
                </div>
              </div>,
              () => selectNativePreset({ eyeType: item.id as EyeType })
            )
          })}
        </div>
      )}

      {/* CATEGORY: CABELO */}
      {activeCategory === 'hair' && (
        <div className="grid grid-cols-3 gap-3">
          {renderCreateCard()}
          {renderCustomPresetCards()}
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
            const isSelected =
              avatar.hairStyle === item.id ||
              (item.id === 'none' && (!avatar.hairStyle || avatar.hairStyle === 'bald'))
            return renderCard(
              item,
              isSelected,
              <div
                className="w-10 h-10 rounded-2xl mb-1.5 flex items-center justify-center text-xs font-bold text-white shadow-md"
                style={{ backgroundColor: item.id === 'none' ? '#18191c' : avatar.hairColor }}
              >
                {item.id === 'none' ? '🚫' : '💇'}
              </div>,
              () => selectNativePreset({ hairStyle: item.id as HairStyleType })
            )
          })}
        </div>
      )}

      {/* CATEGORY: PELOS FACIAIS */}
      {activeCategory === 'facialHair' && (
        <div className="grid grid-cols-3 gap-3">
          {renderCreateCard()}
          {renderCustomPresetCards()}
          {[
            { id: 'none', label: 'Nenhum' },
            { id: 'full_beard', label: 'Barba Cheia' },
            { id: 'mustache', label: 'Bigode' },
            { id: 'goatee', label: 'Cavanhaque' },
            { id: 'stubble', label: 'Sombra / Por Fazer' },
          ].map((item) => {
            const isSelected = avatar.facialHair === item.id
            return renderCard(
              item,
              isSelected,
              <div className="w-10 h-10 rounded-2xl mb-1.5 flex items-center justify-center text-sm font-bold bg-[#18191c] text-slate-200">
                {item.id === 'none' ? '🚫' : '🧔'}
              </div>,
              () => selectNativePreset({ facialHair: item.id as FacialHairType })
            )
          })}
        </div>
      )}

      {/* CATEGORY: PARTE DE CIMA (TOPS) */}
      {activeCategory === 'top' && (
        <div className="grid grid-cols-3 gap-3">
          {renderCreateCard()}
          {renderCustomPresetCards()}
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
            return renderCard(
              item,
              isSelected,
              <div
                className="w-10 h-10 rounded-2xl mb-1.5 flex items-center justify-center text-xs font-bold text-white shadow"
                style={{ backgroundColor: item.id === 'none' ? '#18191c' : avatar.topColor }}
              >
                {item.id === 'none' ? '🚫' : '👘'}
              </div>,
              () => selectNativePreset({ topType: item.id as TopType })
            )
          })}
        </div>
      )}

      {/* CATEGORY: JAQUETA */}
      {activeCategory === 'jacket' && (
        <div className="grid grid-cols-3 gap-3">
          {renderCreateCard()}
          {renderCustomPresetCards()}
          {[
            { id: 'none', label: 'Nenhuma' },
            { id: 'hoodie_open', label: 'Moletom Aberto' },
            { id: 'cardigan', label: 'Cardigan' },
            { id: 'blazer', label: 'Blazer Social' },
            { id: 'denim', label: 'Jaqueta Jeans' },
          ].map((item) => {
            const isSelected = avatar.jacketType === item.id
            return renderCard(
              item,
              isSelected,
              <div
                className="w-10 h-10 rounded-2xl mb-1.5 flex items-center justify-center text-xs font-bold text-white shadow"
                style={{ backgroundColor: item.id === 'none' ? '#18191c' : avatar.jacketColor }}
              >
                {item.id === 'none' ? '🚫' : '🧥'}
              </div>,
              () => selectNativePreset({ jacketType: item.id as JacketType })
            )
          })}
        </div>
      )}

      {/* CATEGORY: PARTE DE BAIXO */}
      {activeCategory === 'bottom' && (
        <div className="grid grid-cols-3 gap-3">
          {renderCreateCard()}
          {renderCustomPresetCards()}
          {[
            { id: 'none', label: 'Nenhum' },
            { id: 'kimono_skirt', label: 'Saia Quimono Hakama' },
            { id: 'jeans', label: 'Calça Jeans' },
            { id: 'sweatpants', label: 'Moletom Jogger' },
            { id: 'skirt', label: 'Saia Plissada' },
            { id: 'shorts', label: 'Bermuda / Shorts' },
          ].map((item) => {
            const isSelected = avatar.bottomType === item.id || (!avatar.bottomType && item.id === 'none')
            return renderCard(
              item,
              isSelected,
              <div
                className="w-10 h-10 rounded-2xl mb-1.5 flex items-center justify-center text-xs font-bold text-white shadow"
                style={{ backgroundColor: item.id === 'none' ? '#18191c' : avatar.bottomColor }}
              >
                {item.id === 'none' ? '🚫' : '👖'}
              </div>,
              () => selectNativePreset({ bottomType: item.id as BottomType })
            )
          })}
        </div>
      )}

      {/* CATEGORY: SAPATOS */}
      {activeCategory === 'shoes' && (
        <div className="grid grid-cols-3 gap-3">
          {renderCreateCard()}
          {renderCustomPresetCards()}
          {[
            { id: 'none', label: 'Nenhum / Descalço' },
            { id: 'sandals', label: 'Sandálias Geta' },
            { id: 'sneakers', label: 'Tênis Sneaker' },
            { id: 'boots', label: 'Botas' },
            { id: 'loafers', label: 'Sapato Social' },
          ].map((item) => {
            const isSelected = avatar.shoesType === item.id || (!avatar.shoesType && item.id === 'none')
            return renderCard(
              item,
              isSelected,
              <div
                className="w-10 h-10 rounded-2xl mb-1.5 flex items-center justify-center text-xs font-bold text-white shadow"
                style={{ backgroundColor: item.id === 'none' ? '#18191c' : avatar.shoesColor }}
              >
                {item.id === 'none' ? '🚫' : '👟'}
              </div>,
              () => selectNativePreset({ shoesType: item.id as ShoesType })
            )
          })}
        </div>
      )}

      {/* CATEGORY: CHAPÉU & LAÇOS */}
      {activeCategory === 'hat' && (
        <div className="grid grid-cols-3 gap-3">
          {renderCreateCard()}
          {renderCustomPresetCards()}
          {[
            { id: 'none', label: 'Nenhum' },
            { id: 'ribbon_bow', label: 'Laço / Fita' },
            { id: 'cap_forward', label: 'Boné Frontal' },
            { id: 'cap_backward', label: 'Boné Virado' },
            { id: 'beanie', label: 'Gorro de Lã' },
            { id: 'headband', label: 'Faixa de Cabeça' },
          ].map((item) => {
            const isSelected = avatar.hatType === item.id
            return renderCard(
              item,
              isSelected,
              <div
                className="w-10 h-10 rounded-2xl mb-1.5 flex items-center justify-center text-xs font-bold text-white shadow"
                style={{ backgroundColor: item.id === 'none' ? '#18191c' : avatar.hatColor }}
              >
                {item.id === 'none' ? '🚫' : '🎀'}
              </div>,
              () => selectNativePreset({ hatType: item.id as HatType })
            )
          })}
        </div>
      )}

      {/* CATEGORY: ÓCULOS */}
      {activeCategory === 'glasses' && (
        <div className="grid grid-cols-3 gap-3">
          {renderCreateCard()}
          {renderCustomPresetCards()}
          {[
            { id: 'none', label: 'Nenhum' },
            { id: 'round', label: 'Redondos' },
            { id: 'square', label: 'Quadrados' },
            { id: 'sunglasses', label: 'Escuros' },
            { id: 'wireframe', label: 'Armação de Metal' },
          ].map((item) => {
            const isSelected = avatar.glassesType === item.id
            return renderCard(
              item,
              isSelected,
              <div
                className="w-10 h-10 rounded-2xl mb-1.5 flex items-center justify-center text-xs font-bold text-white shadow"
                style={{ backgroundColor: item.id === 'none' ? '#18191c' : avatar.glassesColor }}
              >
                {item.id === 'none' ? '🚫' : '👓'}
              </div>,
              () => selectNativePreset({ glassesType: item.id as GlassesType })
            )
          })}
        </div>
      )}

      {/* CATEGORY: OUTRO / EXTRAS */}
      {activeCategory === 'other' && (
        <div className="grid grid-cols-3 gap-3">
          {renderCreateCard()}
          {renderCustomPresetCards()}
          {[
            { id: 'none', label: 'Nenhum' },
            { id: 'headphones', label: 'Fones Gamer DJ' },
            { id: 'mask', label: 'Máscara Facial' },
          ].map((item) => {
            const isSelected = avatar.otherType === item.id
            return renderCard(
              item,
              isSelected,
              <div
                className="w-10 h-10 rounded-2xl mb-1.5 flex items-center justify-center text-xs font-bold text-white shadow"
                style={{ backgroundColor: item.id === 'none' ? '#18191c' : avatar.otherColor }}
              >
                {item.id === 'none' ? '🚫' : '🎧'}
              </div>,
              () => selectNativePreset({ otherType: item.id as OtherType })
            )
          })}
        </div>
      )}
    </div>
  )
}
