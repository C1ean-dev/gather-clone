import React, { useState } from 'react'
import {
  Layers,
  Square,
  Armchair,
  Sparkles,
  Trash2,
  X,
  LayoutGrid,
  Trash,
  MousePointerClick,
  Check,
  RotateCcw,
  Flame,
  Plus,
  Wand2,
  Pencil,
  Save,
} from 'lucide-react'
import { useMapStore } from '../store/useMapStore'
import { FloorType, WallType, EditorTool, PrivateZone } from '../types/map'
import { FURNITURE_CATALOG } from '../engine/Constants'
import { PeerManager } from '../p2p/PeerManager'
import { PixelArtThumbnail } from './PixelArtThumbnail'
import { useCustomAssetsStore } from '../store/useCustomAssetsStore'
import { useSavedSpacesStore } from '../store/useSavedSpacesStore'
import { CustomElementModal } from './CustomElementModal'

export const AssetPalette: React.FC = () => {
  const {
    isEditorOpen,
    setEditorOpen,
    activeTool,
    setActiveTool,
    selectedFloor,
    setSelectedFloor,
    selectedWall,
    setSelectedWall,
    selectedFurnitureDefId,
    setSelectedFurnitureDefId,
    zoneDraft,
    setZoneDraft,
    addOrUpdateZone,
    removeZone,
    resetEmptyWorkspace,
    mapData,
  } = useMapStore()

  const {
    customAssets,
    customCategories,
    setCustomModalOpen,
    openEditModal,
    openCreateModal,
    deleteCustomAsset,
    addCategory,
    deleteCategory,
    getAllCategories,
  } = useCustomAssetsStore()

  const categories = getAllCategories()

  const [activeTab, setActiveTab] = useState<'furniture' | 'floors' | 'walls' | 'zones'>('furniture')
  const [furnitureCategory, setFurnitureCategory] = useState<string>(() => categories[0] || 'Forja Antiga')
  const [isAddingCategory, setIsAddingCategory] = useState<boolean>(false)
  const [newCategoryText, setNewCategoryText] = useState<string>('')
  const [savedFeedback, setSavedFeedback] = useState<boolean>(false)

  if (!isEditorOpen) return null

  const baseFloors: { id: FloorType | string; name: string }[] = [
    { id: 'habbo_parquet', name: 'Piso Padrão (Madeira)' },
  ]

  const customFloors = customAssets
    .filter((a) => a.type === 'floor')
    .map((a) => ({ id: a.id, name: `✨ ${a.name}`, isCustom: true }))

  const floors = [...customFloors, ...baseFloors]

  const baseWalls: { id: WallType | string; name: string }[] = [
    { id: 'drywall_white', name: 'Parede Padrão (Drywall)' },
  ]

  const customWalls = customAssets
    .filter((a) => a.type === 'wall')
    .map((a) => ({ id: a.id, name: `✨ ${a.name}`, isCustom: true }))

  const walls = [...customWalls, ...baseWalls]

  const customFurnitureDefs = customAssets
    .filter((a) => a.type === 'furniture')
    .map((a) => ({
      id: a.id,
      name: a.name,
      category: a.category || 'Geral',
      width: a.width,
      height: a.height,
      isObstacle: a.isObstacle,
      spriteKey: a.id,
      iconColor: a.iconColor || '#e03131',
      isCustom: true,
    }))

  const allFurniture = [...customFurnitureDefs, ...FURNITURE_CATALOG]
  const filteredFurniture = allFurniture.filter((f) => f.category === furnitureCategory)
  const currentFurniture = allFurniture.find((f) => f.id === selectedFurnitureDefId)
  const currentFloor = floors.find((f) => f.id === selectedFloor)
  const currentWall = walls.find((w) => w.id === selectedWall)

  const handleDeleteZone = (id: string) => {
    removeZone(id)
    PeerManager.getInstance().sendMapEdit('remove_zone', { id })
  }

  const handleResetWorkspace = () => {
    if (window.confirm('Deseja limpar todo o mapa e iniciar um novo espaço em branco?')) {
      resetEmptyWorkspace()
      PeerManager.getInstance().broadcast({
        type: 'MAP_SYNC',
        senderId: 'host',
        payload: { mapData: useMapStore.getState().mapData },
        timestamp: Date.now(),
      })
    }
  }

  const handleLoadBlacksmithTemplate = () => {
    if (window.confirm('Deseja carregar o cenário completo da Forja Antiga (Oficina Medieval)?')) {
      useMapStore.getState().loadBlacksmithTemplate()
      PeerManager.getInstance().broadcast({
        type: 'MAP_SYNC',
        senderId: 'host',
        payload: { mapData: useMapStore.getState().mapData },
        timestamp: Date.now(),
      })
    }
  }

  // Get active item summary for display
  const getActiveItemSummary = () => {
    if (activeTool === 'eraser') {
      return {
        title: 'Borracha de Remoção',
        subtitle: 'Clique sobre qualquer parede ou mobília para apagar',
        badge: 'Modo Apagar',
        thumbnail: (
          <div className="w-12 h-12 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center">
            <Trash2 className="w-6 h-6 text-rose-400" />
          </div>
        ),
      }
    }
    if (activeTool === 'draw_zone') {
      return {
        title: zoneDraft.name || 'Zona Privada',
        subtitle: 'Clique e arraste no mapa para demarcar a área',
        badge: 'Demarcar Zona',
        thumbnail: (
          <div
            className="w-12 h-12 rounded-xl border-2 border-dashed border-white/60 flex items-center justify-center shadow-inner"
            style={{ backgroundColor: `${zoneDraft.color}44` }}
          >
            <Sparkles className="w-6 h-6 text-white" />
          </div>
        ),
      }
    }
    if (activeTool === 'paint_floor') {
      return {
        title: currentFloor?.name || 'Piso',
        subtitle: 'Clique no chão para pintar o piso',
        badge: 'Pintar Piso',
        thumbnail: (
          <div className="p-1 rounded-xl bg-[#1b202c] border border-white/15 shadow-md">
            <PixelArtThumbnail type="floor" id={selectedFloor} size={40} />
          </div>
        ),
      }
    }
    if (activeTool === 'paint_wall') {
      return {
        title: currentWall?.name || 'Parede',
        subtitle: 'Clique no mapa para levantar paredes com colisão',
        badge: 'Pintar Parede',
        thumbnail: (
          <div className="p-1 rounded-xl bg-[#1b202c] border border-white/15 shadow-md">
            <PixelArtThumbnail type="wall" id={selectedWall} size={40} />
          </div>
        ),
      }
    }
    // Place Furniture
    if (currentFurniture) {
      return {
        title: currentFurniture.name,
        subtitle: `${currentFurniture.width}x${currentFurniture.height} tiles • Clique para posicionar`,
        badge: 'Objeto Selecionado',
        thumbnail: (
          <div className="p-1 rounded-xl bg-[#1b202c] border border-white/15 shadow-md flex items-center justify-center">
            <PixelArtThumbnail type="furniture" id={selectedFurnitureDefId} size={40} />
          </div>
        ),
      }
    }

    return {
      title: 'Nenhuma mobília selecionada',
      subtitle: 'Crie ou selecione um elemento abaixo para posicionar',
      badge: 'Modo Mobília',
      thumbnail: (
        <div className="w-12 h-12 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center">
          <Armchair className="w-5 h-5 text-slate-400" />
        </div>
      ),
    }
  }

  const activeItem = getActiveItemSummary()

  return (
    <>
      <div className="absolute top-16 right-4 w-92 bg-[#1b202c]/95 backdrop-blur-md border border-[#2a3142] rounded-2xl shadow-2xl z-40 overflow-hidden flex flex-col max-h-[calc(100vh-120px)] animate-in fade-in slide-in-from-right-4 duration-200 select-none">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a3142] bg-[#12151d]/70">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-400" />
            <span className="font-bold text-sm text-slate-100">Editor de Espaço</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCustomModalOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white font-bold text-xs shadow-md transition-all border border-white/10"
              title="Adicionar e recortar novos elementos personalizados com transparência"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Criar Elemento</span>
            </button>
            <button
              onClick={() => setEditorOpen(false)}
              className="p-1 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ACTIVE SELECTED OBJECT CARD WITH REAL PIXEL ART THUMBNAIL */}
        <div className="p-3 bg-[#12151d]/90 border-b border-[#2a3142] flex items-center gap-3">
          {activeItem.thumbnail}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                {activeItem.badge}
              </span>
            </div>
            <div className="text-xs font-bold text-slate-100 truncate mt-0.5">{activeItem.title}</div>
            <div className="text-[10px] text-slate-400 truncate">{activeItem.subtitle}</div>
          </div>
        </div>

      {/* Tabs */}
      <div className="grid grid-cols-4 p-1.5 gap-1 bg-[#12151d]/40 border-b border-[#2a3142]">
        <button
          onClick={() => {
            setActiveTab('furniture')
            setActiveTool('place_furniture')
          }}
          className={`flex flex-col items-center py-2 px-1 rounded-xl text-xs font-medium transition-all ${
            activeTab === 'furniture'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Armchair className="w-4 h-4 mb-1" />
          Mobília
        </button>

        <button
          onClick={() => {
            setActiveTab('floors')
            setActiveTool('paint_floor')
          }}
          className={`flex flex-col items-center py-2 px-1 rounded-xl text-xs font-medium transition-all ${
            activeTab === 'floors'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <LayoutGrid className="w-4 h-4 mb-1" />
          Pisos
        </button>

        <button
          onClick={() => {
            setActiveTab('zones')
            setActiveTool('draw_zone')
          }}
          className={`flex flex-col items-center py-2 px-1 rounded-xl text-xs font-medium transition-all ${
            activeTab === 'zones'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Square className="w-4 h-4 mb-1" />
          Zonas & Paredes
        </button>
      </div>

      {/* Content Area */}
      <div className="p-4 overflow-y-auto flex-1 space-y-4">
        {/* FURNITURE TAB WITH DYNAMIC USER CATEGORIES & CREATED ASSETS */}
        {activeTab === 'furniture' && (
          <div className="space-y-3">
            {/* Dynamic Category Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1">
              {categories.map((cat) => {
                const isActive = furnitureCategory === cat
                const catCount = allFurniture.filter((f) => f.category === cat).length
                return (
                  <div key={cat} className="flex items-center shrink-0">
                    <button
                      onClick={() => setFurnitureCategory(cat)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-colors ${
                        isActive
                          ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/40'
                          : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span>{cat}</span>
                      <span className="text-[10px] opacity-60">({catCount})</span>
                    </button>
                  </div>
                )
              })}

              {/* Add Category Button / Input */}
              {isAddingCategory ? (
                <div className="flex items-center gap-1 shrink-0 bg-slate-900 border border-blue-500/60 rounded-lg p-0.5">
                  <input
                    type="text"
                    value={newCategoryText}
                    onChange={(e) => setNewCategoryText(e.target.value)}
                    placeholder="Nome..."
                    autoFocus
                    className="px-2 py-0.5 bg-transparent text-xs text-white focus:outline-none w-24"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const trimmed = newCategoryText.trim()
                        if (trimmed) {
                          addCategory(trimmed)
                          setFurnitureCategory(trimmed)
                          setNewCategoryText('')
                          setIsAddingCategory(false)
                        }
                      } else if (e.key === 'Escape') {
                        setIsAddingCategory(false)
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      const trimmed = newCategoryText.trim()
                      if (trimmed) {
                        addCategory(trimmed)
                        setFurnitureCategory(trimmed)
                        setNewCategoryText('')
                        setIsAddingCategory(false)
                      }
                    }}
                    className="px-1.5 py-0.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-[10px] font-bold"
                  >
                    OK
                  </button>
                  <button
                    onClick={() => setIsAddingCategory(false)}
                    className="px-1 text-slate-400 hover:text-white text-xs"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsAddingCategory(true)}
                  className="px-2 py-1 rounded-lg text-xs font-semibold whitespace-nowrap bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 flex items-center gap-1 transition-colors shrink-0"
                  title="Criar nova categoria personalizada"
                >
                  <Plus className="w-3 h-3" />
                  <span>Nova Categoria</span>
                </button>
              )}
            </div>

            {/* Item Grid */}
            {filteredFurniture.length > 0 ? (
              <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto p-1">
                {filteredFurniture.map((item) => {
                  const isSelected = selectedFurnitureDefId === item.id && activeTool === 'place_furniture'
                  const isCustom = (item as any).isCustom
                  return (
                    <div
                      key={item.id}
                      className={`relative p-2.5 rounded-xl border flex flex-col items-center gap-1.5 text-left transition-all group ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-500/15 shadow-lg shadow-indigo-500/10 ring-2 ring-indigo-500/30'
                          : 'border-[#2a3142] bg-[#12151d]/50 hover:border-slate-500'
                      }`}
                    >
                      {/* Left Edit Pencil Button (Opens Studio to edit this custom element) */}
                      {isCustom && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            openEditModal(item.id)
                          }}
                          className="absolute top-1.5 left-1.5 p-1 rounded-md bg-blue-500/20 hover:bg-blue-500/40 text-blue-400 hover:text-blue-200 opacity-80 hover:opacity-100 transition-all z-10"
                          title="Editar este elemento"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                      )}

                      {/* Right Delete Button for custom items */}
                      {isCustom && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            if (window.confirm(`Deseja excluir o elemento "${item.name}"?`)) {
                              deleteCustomAsset(item.id)
                            }
                          }}
                          className="absolute top-1.5 right-1.5 p-1 rounded-md bg-rose-500/20 hover:bg-rose-500/40 text-rose-400 hover:text-rose-200 opacity-80 hover:opacity-100 transition-all z-10"
                          title="Excluir elemento customizado"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setSelectedFurnitureDefId(item.id)
                          setActiveTool('place_furniture')
                        }}
                        className="w-full flex flex-col items-center gap-1.5"
                      >
                        <div className="w-full h-12 rounded-lg overflow-hidden border border-white/10 shadow-inner bg-[#181d28] flex items-center justify-center">
                          <PixelArtThumbnail type="furniture" id={item.id} size={48} />
                        </div>
                        <div className="w-full">
                          <div className="text-xs font-semibold text-slate-200 truncate">{item.name}</div>
                          <div className="text-[10px] text-slate-400">
                            {item.width}x{item.height} tiles • {item.isObstacle ? '🛡️ Obstáculo' : 'Livre'}
                          </div>
                        </div>
                      </button>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-xs text-slate-500 text-center py-6 bg-[#12151d]/40 rounded-xl border border-[#2a3142]">
                Nenhum item nesta categoria. Crie um novo no botão acima!
              </div>
            )}
          </div>
        )}

        {/* FLOORS TAB WITH REAL PIXEL ART THUMBNAILS */}
        {activeTab === 'floors' && (
          <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto p-1">
            {floors.map((floor) => {
              const isSelected = selectedFloor === floor.id && activeTool === 'paint_floor'
              const isCustom = (floor as any).isCustom
              return (
                <div
                  key={floor.id}
                  className={`relative p-2.5 rounded-xl border flex flex-col items-center gap-1.5 text-left transition-all ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-500/15 ring-2 ring-indigo-500/30'
                      : 'border-[#2a3142] bg-[#12151d]/50 hover:border-slate-500'
                  }`}
                >
                  {isCustom && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        openEditModal(floor.id)
                      }}
                      className="absolute top-1.5 left-1.5 p-1 rounded-md bg-blue-500/20 hover:bg-blue-500/40 text-blue-400 hover:text-blue-200 z-10"
                      title="Editar este piso"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  )}
                  {isCustom && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        if (window.confirm(`Deseja excluir o piso "${floor.name}"?`)) {
                          deleteCustomAsset(floor.id)
                        }
                      }}
                      className="absolute top-1.5 right-1.5 p-1 rounded-md bg-rose-500/20 hover:bg-rose-500/40 text-rose-400 hover:text-rose-200 z-10"
                      title="Excluir piso"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setSelectedFloor(floor.id as any)
                      setActiveTool('paint_floor')
                    }}
                    className="w-full flex flex-col items-center gap-1.5"
                  >
                    <div className="w-full h-10 rounded-lg overflow-hidden border border-white/15 shadow-inner bg-[#181d28] flex items-center justify-center">
                      <PixelArtThumbnail type="floor" id={floor.id} size={40} />
                    </div>
                    <span className="text-xs font-medium text-slate-300 text-center truncate w-full">{floor.name}</span>
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* ZONES & WALLS TAB (ZONAS DEMARCADAS COM PAREDES CUSTOMIZADAS) */}
        {activeTab === 'zones' && (
          <div className="space-y-4">
            {/* Draw with Mouse Hero Box */}
            <div className="p-3.5 bg-[#12151d]/85 rounded-2xl border-2 border-indigo-500/40 space-y-3.5 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-100">
                  <MousePointerClick className="w-4 h-4 text-indigo-400" />
                  <span>Demarcar Nova Sala / Zona</span>
                </div>
                {activeTool === 'draw_zone' && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold flex items-center gap-1">
                    <Check className="w-3 h-3" /> Ativo
                  </span>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-1">Nome da Sala / Zona</label>
                <input
                  type="text"
                  value={zoneDraft.name}
                  onChange={(e) => setZoneDraft({ ...zoneDraft, name: e.target.value })}
                  placeholder="Ex: Sala de Reunião / Forja Medieval"
                  className="w-full bg-[#1b202c] border border-[#2a3142] rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Color Picker */}
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-1">Cor da Identificação</label>
                <div className="flex gap-2">
                  {['#4c6ef5', '#20c997', '#fab005', '#ff6b6b', '#be4bdb', '#339af0', '#e03131'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setZoneDraft({ ...zoneDraft, color: c })}
                      className={`w-7 h-7 rounded-full border-2 transition-transform ${
                        zoneDraft.color === c ? 'scale-115 border-white ring-2 ring-white/40' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Zone Walls & Texture Config */}
              <div className="pt-2 border-t border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-200">
                    <input
                      type="checkbox"
                      checked={zoneDraft.hasWalls !== false}
                      onChange={(e) => setZoneDraft({ ...zoneDraft, hasWalls: e.target.checked })}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-0 bg-slate-900 border-slate-700 cursor-pointer"
                    />
                    <span>🧱 Construir Paredes nesta Zona</span>
                  </label>
                </div>

                {zoneDraft.hasWalls !== false && (
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-semibold text-slate-400">Textura das Paredes da Sala:</div>
                    <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto p-1 bg-slate-950/40 rounded-xl border border-slate-800/80">
                      {walls.map((wall) => {
                        const isSelected = (zoneDraft.wallType || 'drywall_white') === wall.id
                        const isCustom = (wall as any).isCustom
                        return (
                          <div key={wall.id} className="relative group">
                            <button
                              type="button"
                              onClick={() => setZoneDraft({ ...zoneDraft, wallType: wall.id as any })}
                              className={`w-full p-1.5 rounded-lg border flex items-center gap-2 text-left transition-all ${
                                isSelected
                                  ? 'border-indigo-500 bg-indigo-500/20 ring-1 ring-indigo-500'
                                  : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                              }`}
                            >
                              <div className="w-6 h-6 rounded overflow-hidden shrink-0 border border-white/10 flex items-center justify-center bg-slate-950">
                                <PixelArtThumbnail type="wall" id={wall.id} size={24} />
                              </div>
                              <span className="text-[10px] font-medium text-slate-300 truncate">{wall.name}</span>
                            </button>
                            {isCustom && (
                              <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-950/90 px-1 py-0.5 rounded-md border border-slate-800 z-10">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    openEditModal(wall.id)
                                  }}
                                  className="p-1 rounded hover:bg-blue-500/20 text-blue-400"
                                  title="Editar esta parede"
                                >
                                  <Pencil className="w-2.5 h-2.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (window.confirm(`Deseja excluir a parede "${wall.name}"?`)) {
                                      deleteCustomAsset(wall.id)
                                    }
                                  }}
                                  className="p-1 rounded hover:bg-rose-500/20 text-rose-400"
                                  title="Excluir parede"
                                >
                                  <Trash2 className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Drag Tool Activation Button */}
              <button
                type="button"
                onClick={() => setActiveTool('draw_zone')}
                className={`w-full py-2.5 rounded-xl text-xs font-bold shadow-lg flex items-center justify-center gap-2 transition-all ${
                  activeTool === 'draw_zone'
                    ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
                }`}
              >
                <MousePointerClick className="w-4 h-4" />
                <span>{activeTool === 'draw_zone' ? 'Pronto! Arraste no mapa agora' : 'Ativar Desenho no Mouse'}</span>
              </button>

              <div className="text-[11px] text-slate-400 text-center leading-relaxed">
                👉 Clique no mapa e <strong className="text-slate-200">arraste</strong> para criar a sala com as paredes selecionadas.
              </div>
            </div>

            {/* List of Existing Zones */}
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-slate-400">Salas & Zonas Ativas ({mapData.zones.length})</div>
              {mapData.zones.length === 0 ? (
                <div className="text-xs text-slate-500 text-center py-4 bg-[#12151d]/40 rounded-xl border border-[#2a3142]">
                  Nenhuma zona criada. Arraste no mapa para criar uma sala!
                </div>
              ) : (
                mapData.zones.map((zone) => (
                  <div
                    key={zone.id}
                    className="p-3 rounded-xl bg-[#12151d]/60 border border-[#2a3142] space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: zone.color }} />
                        <div>
                          <div className="text-xs font-semibold text-slate-200">{zone.name}</div>
                          <div className="text-[10px] text-slate-400">
                            {zone.width}x{zone.height} tiles • ({zone.x}, {zone.y})
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteZone(zone.id)}
                        className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                        title="Excluir Zona"
                      >
                        <Trash className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Zone Wall Configuration Switcher */}
                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                      <button
                        onClick={() => {
                          const nextHasWalls = !(zone.hasWalls !== false)
                          useMapStore.getState().updateZone(zone.id, { hasWalls: nextHasWalls })
                          PeerManager.getInstance().broadcast({
                            type: 'MAP_SYNC',
                            senderId: 'host',
                            payload: { mapData: useMapStore.getState().mapData },
                            timestamp: Date.now(),
                          })
                        }}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                          zone.hasWalls !== false
                            ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                            : 'bg-slate-800/60 text-slate-400 border-slate-700'
                        }`}
                      >
                        {zone.hasWalls !== false ? '🧱 Com Paredes' : 'Área Aberta (Sem Paredes)'}
                      </button>

                      {zone.hasWalls !== false && (
                        <select
                          value={zone.wallType || 'drywall_white'}
                          onChange={(e) => {
                            const newWall = e.target.value as WallType
                            useMapStore.getState().updateZone(zone.id, { wallType: newWall })
                            PeerManager.getInstance().broadcast({
                              type: 'MAP_SYNC',
                              senderId: 'host',
                              payload: { mapData: useMapStore.getState().mapData },
                              timestamp: Date.now(),
                            })
                          }}
                          className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-0.5 text-[10px] text-slate-200 focus:outline-none focus:border-indigo-500 max-w-[130px]"
                        >
                          {walls.map((w) => (
                            <option key={w.id} value={w.id}>
                              {w.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer Tools: Salvar Espaço, Borracha e Limpar Espaço */}
      <div className="p-3 border-t border-[#2a3142] bg-[#12151d]/80 flex gap-2">
        <button
          onClick={() => {
            const { activeSpaceId, saveCurrentMapToSpace, createSavedSpace } = useSavedSpacesStore.getState()
            if (activeSpaceId) {
              saveCurrentMapToSpace(activeSpaceId, mapData)
            } else {
              createSavedSpace(mapData.name || 'Meu Espaço', mapData)
            }
            setSavedFeedback(true)
            setTimeout(() => setSavedFeedback(false), 2000)
          }}
          className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            savedFeedback
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20'
          }`}
          title="Salvar todas as alterações deste espaço/mapa"
        >
          {savedFeedback ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>Salvo!</span>
            </>
          ) : (
            <>
              <Save className="w-3.5 h-3.5" />
              <span>Salvar Espaço</span>
            </>
          )}
        </button>

        <button
          onClick={() => setActiveTool(activeTool === 'eraser' ? 'place_furniture' : 'eraser')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-medium flex items-center justify-center gap-2 transition-all ${
            activeTool === 'eraser'
              ? 'bg-rose-600 text-white shadow-md ring-2 ring-rose-500/30'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          <Trash2 className="w-4 h-4" />
          <span>{activeTool === 'eraser' ? 'Borracha Ativa' : 'Borracha'}</span>
        </button>

        <button
          onClick={handleResetWorkspace}
          className="py-2 px-2.5 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center gap-1 transition-all"
          title="Limpar e reiniciar mapa em branco"
        >
          <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
          <span>Limpar</span>
        </button>
      </div>
    </div>

    {/* Custom Element Studio / Asset Importer Modal */}
    <CustomElementModal />
  </>
  )
}
