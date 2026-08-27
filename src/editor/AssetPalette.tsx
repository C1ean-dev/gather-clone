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
} from 'lucide-react'
import { useMapStore } from '../store/useMapStore'
import { FloorType, WallType, EditorTool, PrivateZone } from '../types/map'
import { FURNITURE_CATALOG } from '../engine/Constants'
import { PeerManager } from '../p2p/PeerManager'
import { PixelArtThumbnail } from './PixelArtThumbnail'

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

  const [activeTab, setActiveTab] = useState<'furniture' | 'floors' | 'walls' | 'zones'>('furniture')
  const [furnitureCategory, setFurnitureCategory] = useState<string>('habbo')

  if (!isEditorOpen) return null

  const floors: { id: FloorType; name: string }[] = [
    { id: 'habbo_parquet', name: 'Habbo Parquet' },
    { id: 'habbo_hc_carpet', name: 'Carpete HC Club' },
    { id: 'habbo_checker_red', name: 'Xadrez Vermelho' },
    { id: 'habbo_pool_water', name: 'Água de Piscina' },
    { id: 'habbo_disco_dance', name: 'Pista de Dança' },
    { id: 'habbo_executive_rug', name: 'Tapete Executivo' },
    { id: 'wood_light', name: 'Madeira Clara' },
    { id: 'wood_dark', name: 'Carvalho Escuro' },
    { id: 'carpet_blue', name: 'Carpete Azul' },
    { id: 'carpet_gray', name: 'Carpete Grafite' },
    { id: 'tile_white', name: 'Azulejo Branco' },
    { id: 'grass', name: 'Grama / Jardim' },
  ]

  const walls: { id: WallType; name: string }[] = [
    { id: 'habbo_hotel_gold', name: 'Hotel Habbo Dourado' },
    { id: 'habbo_brick_classic', name: 'Tijolos Habbo Clássico' },
    { id: 'habbo_nightclub_dark', name: 'Clube Massiva Noite' },
    { id: 'brick_red', name: 'Tijolo Vermelho' },
    { id: 'drywall_white', name: 'Drywall Branco' },
    { id: 'wood_panel', name: 'Painel de Madeira' },
    { id: 'glass_modern', name: 'Vidro Moderno' },
    { id: 'stone_dark', name: 'Pedra Escura' },
  ]

  const filteredFurniture = FURNITURE_CATALOG.filter((f) => f.category === furnitureCategory)
  const currentFurniture = FURNITURE_CATALOG.find((f) => f.id === selectedFurnitureDefId)
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
    return {
      title: currentFurniture?.name || 'Mobília',
      subtitle: `${currentFurniture?.width || 1}x${currentFurniture?.height || 1} tiles • Clique para posicionar`,
      badge: 'Objeto Selecionado',
      thumbnail: (
        <div className="p-1 rounded-xl bg-[#1b202c] border border-white/15 shadow-md flex items-center justify-center">
          <PixelArtThumbnail type="furniture" id={selectedFurnitureDefId} size={40} />
        </div>
      ),
    }
  }

  const activeItem = getActiveItemSummary()

  return (
    <div className="absolute top-16 right-4 w-92 bg-[#1b202c]/95 backdrop-blur-md border border-[#2a3142] rounded-2xl shadow-2xl z-40 overflow-hidden flex flex-col max-h-[calc(100vh-120px)] animate-in fade-in slide-in-from-right-4 duration-200 select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a3142] bg-[#12151d]/70">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-indigo-400" />
          <span className="font-bold text-sm text-slate-100">Editor de Espaço</span>
        </div>
        <button
          onClick={() => setEditorOpen(false)}
          className="p-1 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
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
            setActiveTab('walls')
            setActiveTool('paint_wall')
          }}
          className={`flex flex-col items-center py-2 px-1 rounded-xl text-xs font-medium transition-all ${
            activeTab === 'walls'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Square className="w-4 h-4 mb-1" />
          Paredes
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
          <Sparkles className="w-4 h-4 mb-1" />
          Zonas
        </button>
      </div>

      {/* Content Area */}
      <div className="p-4 overflow-y-auto flex-1 space-y-4">
        {/* FURNITURE TAB WITH REAL PIXEL ART THUMBNAILS */}
        {activeTab === 'furniture' && (
          <div className="space-y-3">
            {/* Category Pills */}
            <div className="flex gap-1 overflow-x-auto pb-1">
              {[
                { id: 'habbo', label: '👑 Habbo Furni' },
                { id: 'desks', label: 'Mesas' },
                { id: 'chairs', label: 'Cadeiras' },
                { id: 'meeting', label: 'Reunião' },
                { id: 'lounge', label: 'Lounge' },
                { id: 'decor', label: 'Decoração' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setFurnitureCategory(cat.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    furnitureCategory === cat.id
                      ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/40'
                      : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Item Grid */}
            <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto p-1">
              {filteredFurniture.map((item) => {
                const isSelected = selectedFurnitureDefId === item.id && activeTool === 'place_furniture'
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setSelectedFurnitureDefId(item.id)
                      setActiveTool('place_furniture')
                    }}
                    className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 text-left transition-all ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-500/15 shadow-lg shadow-indigo-500/10 ring-2 ring-indigo-500/30'
                        : 'border-[#2a3142] bg-[#12151d]/50 hover:border-slate-500'
                    }`}
                  >
                    {/* REAL PIXEL ART SPRITE THUMBNAIL */}
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-[#181d28] border border-white/10 shadow-inner">
                      <PixelArtThumbnail type="furniture" id={item.id} size={42} />
                    </div>
                    <div className="w-full text-center">
                      <div className="text-xs font-medium text-slate-200 truncate">{item.name}</div>
                      <div className="text-[10px] text-slate-400">
                        {item.width}x{item.height} tiles
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* FLOORS TAB WITH REAL PIXEL ART THUMBNAILS */}
        {activeTab === 'floors' && (
          <div className="grid grid-cols-3 gap-2 max-h-72 overflow-y-auto p-1">
            {floors.map((floor) => {
              const isSelected = selectedFloor === floor.id && activeTool === 'paint_floor'
              return (
                <button
                  key={floor.id}
                  onClick={() => {
                    setSelectedFloor(floor.id)
                    setActiveTool('paint_floor')
                  }}
                  className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-500/15 ring-2 ring-indigo-500/30'
                      : 'border-[#2a3142] bg-[#12151d]/50 hover:border-slate-500'
                  }`}
                >
                  <div className="w-10 h-10 rounded-lg overflow-hidden border border-white/15 shadow-inner bg-[#181d28] flex items-center justify-center">
                    <PixelArtThumbnail type="floor" id={floor.id} size={36} />
                  </div>
                  <span className="text-[11px] font-medium text-slate-300 text-center truncate w-full">{floor.name}</span>
                </button>
              )
            })}
          </div>
        )}

        {/* WALLS TAB WITH REAL PIXEL ART THUMBNAILS */}
        {activeTab === 'walls' && (
          <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto p-1">
            {walls.map((wall) => {
              const isSelected = selectedWall === wall.id && activeTool === 'paint_wall'
              return (
                <button
                  key={wall.id}
                  onClick={() => {
                    setSelectedWall(wall.id)
                    setActiveTool('paint_wall')
                  }}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-500/15 ring-2 ring-indigo-500/30'
                      : 'border-[#2a3142] bg-[#12151d]/50 hover:border-slate-500'
                  }`}
                >
                  <div className="w-full h-10 rounded-lg overflow-hidden border border-white/15 shadow-inner bg-[#181d28] flex items-center justify-center">
                    <PixelArtThumbnail type="wall" id={wall.id} size={40} />
                  </div>
                  <span className="text-xs font-medium text-slate-300 text-center truncate w-full">{wall.name}</span>
                </button>
              )
            })}
          </div>
        )}

        {/* ZONES TAB (DRAG-TO-DRAW WITH MOUSE) */}
        {activeTab === 'zones' && (
          <div className="space-y-4">
            {/* Draw with Mouse Hero Box */}
            <div className="p-3.5 bg-[#12151d]/85 rounded-2xl border-2 border-indigo-500/40 space-y-3 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-100">
                  <MousePointerClick className="w-4 h-4 text-indigo-400" />
                  <span>Demarcar Zona com o Mouse</span>
                </div>
                {activeTool === 'draw_zone' && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold flex items-center gap-1">
                    <Check className="w-3 h-3" /> Ativo
                  </span>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-1">Nome da Zona Privada</label>
                <input
                  type="text"
                  value={zoneDraft.name}
                  onChange={(e) => setZoneDraft({ ...zoneDraft, name: e.target.value })}
                  placeholder="Ex: Mesa de Projetos / Reunião"
                  className="w-full bg-[#1b202c] border border-[#2a3142] rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Color Picker */}
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-1">Cor de Destaque</label>
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
                👉 Clique no mapa e <strong className="text-slate-200">arraste</strong> para abrir a área do tamanho desejado.
              </div>
            </div>

            {/* List of Existing Zones */}
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-slate-400">Zonas Ativas ({mapData.zones.length})</div>
              {mapData.zones.length === 0 ? (
                <div className="text-xs text-slate-500 text-center py-4 bg-[#12151d]/40 rounded-xl border border-[#2a3142]">
                  Nenhuma zona criada. Arraste no mapa para criar uma!
                </div>
              ) : (
                mapData.zones.map((zone) => (
                  <div
                    key={zone.id}
                    className="p-2.5 rounded-xl bg-[#12151d]/60 border border-[#2a3142] flex items-center justify-between"
                  >
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
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer Tools: Borracha e Limpar Espaço */}
      <div className="p-3 border-t border-[#2a3142] bg-[#12151d]/80 flex gap-2">
        <button
          onClick={() => setActiveTool(activeTool === 'eraser' ? 'place_furniture' : 'eraser')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-medium flex items-center justify-center gap-2 transition-all ${
            activeTool === 'eraser'
              ? 'bg-rose-600 text-white shadow-md ring-2 ring-rose-500/30'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          <Trash2 className="w-4 h-4" />
          {activeTool === 'eraser' ? 'Borracha Ativa' : 'Borracha'}
        </button>

        <button
          onClick={handleResetWorkspace}
          className="py-2 px-3 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center gap-1.5 transition-all"
          title="Limpar e reiniciar mapa em branco"
        >
          <RotateCcw className="w-4 h-4 text-amber-400" />
          <span>Limpar</span>
        </button>
      </div>
    </div>
  )
}
