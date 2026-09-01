import React, { useState, useEffect } from 'react'
import { Check, Pencil, Plus, Trash2, Download } from 'lucide-react'
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
import { CustomAsset } from '../../types/customAsset'
import { exportCategoryAtlas } from '../../engine/avatar/avatarAtlasExporter'
import { cropContentDataUrl } from '../../engine/avatar/avatarBakeService'

interface Props {
  activeCategory: CategoryKey
  avatar: AvatarConfig
  onChangeAvatar: (newAvatar: AvatarConfig) => void
  onEditPreset?: (category: AvatarComponentSlot, presetId: string, label: string) => void
  onCreatePreset?: (category: AvatarComponentSlot) => void
}

/**
 * Renders an auto-cropped close-up preview of the pixel art,
 * eliminating all surrounding empty space and centering the item.
 */
const AutoCroppedThumbnail: React.FC<{
  src: string
  alt: string
}> = ({ src, alt }) => {
  const [displayUrl, setDisplayUrl] = useState<string>(src)

  useEffect(() => {
    let active = true
    cropContentDataUrl(src).then((cropped) => {
      if (active && cropped) {
        setDisplayUrl(cropped)
      }
    })
    return () => {
      active = false
    }
  }, [src])

  return (
    <div className="w-12 h-12 rounded-xl mb-1.5 flex items-center justify-center relative shadow-sm overflow-hidden bg-[#18191c] border border-slate-700/50">
      <img
        src={displayUrl}
        alt={alt}
        className="w-full h-full object-contain [image-rendering:pixelated]"
      />
    </div>
  )
}

export const OptionSelectorGrid: React.FC<Props> = ({
  activeCategory,
  avatar,
  onChangeAvatar,
  onEditPreset,
  onCreatePreset,
}) => {
  const { customAssets, deleteCustomAsset } = useCustomAssetsStore()
  const [deletingAsset, setDeletingAsset] = useState<CustomAsset | null>(null)

  const categoryCustomAssets = customAssets.filter(
    (a) => a.type === 'avatar' && a.avatarSlot === activeCategory
  )

  const handleConfirmDelete = (asset: CustomAsset) => {
    // 1. Delete from custom assets store (syncs nativeAssets.json & P2P)
    deleteCustomAsset(asset.id)

    // 2. If current player is wearing this asset, safely reset to default
    const slot = activeCategory as AvatarComponentSlot
    if (avatar.customComponents?.[slot] === asset.frames[0]) {
      const updatedComponents = { ...avatar.customComponents }
      delete updatedComponents[slot]

      const fallbackUpdate: Partial<AvatarConfig> = {
        customComponents: updatedComponents,
      }

      switch (slot) {
        case 'hair': fallbackUpdate.hairStyle = 'none'; break
        case 'top': fallbackUpdate.topType = 'none'; break
        case 'jacket': fallbackUpdate.jacketType = 'none'; break
        case 'bottom': fallbackUpdate.bottomType = 'none'; break
        case 'shoes': fallbackUpdate.shoesType = 'none'; break
        case 'hat': fallbackUpdate.hatType = 'none'; break
        case 'glasses': fallbackUpdate.glassesType = 'none'; break
        case 'other': fallbackUpdate.otherType = 'none'; break
        case 'facialHair': fallbackUpdate.facialHair = 'none'; break
        case 'eyes': fallbackUpdate.eyeType = 'normal'; break
        case 'skin': fallbackUpdate.skinDetail = 'smooth'; break
      }

      onChangeAvatar({
        ...avatar,
        ...fallbackUpdate,
      })
    }

    setDeletingAsset(null)
  }

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
        <div className="w-12 h-12 rounded-xl mb-1.5 flex items-center justify-center bg-[#3b82f6]/10 group-hover:bg-[#3b82f6] group-hover:text-white transition-all shadow-sm">
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

          <div
            onClick={(e) => {
              e.stopPropagation()
              setDeletingAsset(asset)
            }}
            title={`Excluir ${asset.name}`}
            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-lg bg-[#2b2d31]/90 hover:bg-rose-600 text-slate-400 hover:text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 z-10 shadow-md cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </div>

          {/* Close-up Cropped Thumbnail Preview */}
          <AutoCroppedThumbnail
            src={asset.thumbnail || asset.frames[0]}
            alt={asset.name}
          />

          <span className="text-[11px] font-bold text-[#60a5fa] truncate max-w-[80px]" title={asset.name}>
            {asset.name}
          </span>

          {isSelected && (
            <div className="absolute bottom-1.5 right-1.5 w-4 h-4 bg-[#3b82f6] text-white rounded-full flex items-center justify-center shadow">
              <Check className="w-2.5 h-2.5" />
            </div>
          )}
        </button>
      )
    })
  }

  return (
    <div className="flex-1 overflow-y-auto pr-1">
      {/* Top action bar with Export Atlas Button */}
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="text-xs font-bold text-slate-300">Opções & Presets</span>
        <button
          type="button"
          onClick={() => exportCategoryAtlas(activeCategory, customAssets, avatar)}
          title={`Exportar Folha PNG e Arquivo Sparrow XML para a categoria ${activeCategory}`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#18191c] hover:bg-[#383a40] border border-[#383a40] text-slate-300 hover:text-white text-[11px] font-semibold transition-all shadow-xs cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-[#3b82f6]" />
          <span>Exportar Atlas (.xml + .png)</span>
        </button>
      </div>

      {/* CATEGORY: MAQUIAGEM */}
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

      {/* Delete Confirmation Modal */}
      {deletingAsset && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-150 select-none">
          <div className="bg-[#1e1f22] border border-[#383a40] rounded-2xl p-5 max-w-sm w-full shadow-2xl flex flex-col gap-4 text-slate-100">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">Excluir Preset</h3>
                <p className="text-xs text-slate-400">Esta ação é permanente.</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Tem certeza que deseja excluir o preset customizado <strong className="text-white font-semibold">"{deletingAsset.name}"</strong>?
            </p>

            <div className="flex items-center justify-end gap-2.5 mt-1">
              <button
                onClick={() => setDeletingAsset(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-[#2b2d31] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleConfirmDelete(deletingAsset)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/30 transition-all"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
