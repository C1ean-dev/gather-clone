import React, { useState } from 'react'
import {
  Layers,
  Square,
  Armchair,
  Sparkles,
  Trash2,
  FolderDown,
  X,
  PlusCircle,
  LayoutGrid,
  Crown,
} from 'lucide-react'
import { useMapStore } from '../store/useMapStore'
import { FloorType, WallType, EditorTool } from '../types/map'
import { FURNITURE_CATALOG } from '../engine/Constants'
import { PeerManager } from '../p2p/PeerManager'

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
    loadTemplate,
    mapData,
  } = useMapStore()

  const [activeTab, setActiveTab] = useState<'furniture' | 'floors' | 'walls' | 'zones' | 'templates'>('furniture')
  const [furnitureCategory, setFurnitureCategory] = useState<string>('habbo')

  if (!isEditorOpen) return null

  const floors: { id: FloorType; name: string; color: string }[] = [
    { id: 'habbo_parquet', name: 'Habbo Parquet', color: '#dfab68' },
    { id: 'habbo_hc_carpet', name: 'Carpete HC Club', color: '#2e7d32' },
    { id: 'habbo_checker_red', name: 'Xadrez Habbo Vermelho', color: '#c92a2a' },
    { id: 'habbo_pool_water', name: 'Água de Piscina Habbo', color: '#22b8cf' },
    { id: 'habbo_disco_dance', name: 'Pista de Dança DJ', color: '#e64980' },
    { id: 'habbo_executive_rug', name: 'Tapete Executivo Bordô', color: '#800020' },
    { id: 'wood_light', name: 'Madeira Clara', color: '#e9c496' },
    { id: 'wood_dark', name: 'Carvalho Escuro', color: '#8c5e3c' },
    { id: 'carpet_blue', name: 'Carpete Azul', color: '#364fc7' },
    { id: 'carpet_gray', name: 'Carpete Grafite', color: '#343a40' },
    { id: 'tile_white', name: 'Azulejo Branco', color: '#e9ecef' },
    { id: 'grass', name: 'Grama / Jardim', color: '#51cf66' },
  ]

  const walls: { id: WallType; name: string; color: string }[] = [
    { id: 'habbo_hotel_gold', name: 'Hotel Habbo Dourado', color: '#e8d4a2' },
    { id: 'habbo_brick_classic', name: 'Tijolos Habbo Clássico', color: '#c85a32' },
    { id: 'habbo_nightclub_dark', name: 'Clube Massiva Noite', color: '#0f172a' },
    { id: 'brick_red', name: 'Tijolo Vermelho', color: '#c92a2a' },
    { id: 'drywall_white', name: 'Drywall Branco', color: '#dee2e6' },
    { id: 'wood_panel', name: 'Painel de Madeira', color: '#8b5a2b' },
    { id: 'glass_modern', name: 'Vidro Moderno', color: '#74c0fc' },
    { id: 'stone_dark', name: 'Pedra Escura', color: '#212529' },
  ]

  const filteredFurniture = FURNITURE_CATALOG.filter((f) => f.category === furnitureCategory)

  return (
    <div className="absolute top-16 right-4 w-84 bg-[#1b202c]/95 backdrop-blur-md border border-[#2a3142] rounded-2xl shadow-2xl z-40 overflow-hidden flex flex-col max-h-[calc(100vh-120px)] animate-in fade-in slide-in-from-right-4 duration-200 select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a3142] bg-[#12151d]/70">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-amber-400" />
          <span className="font-bold text-sm text-slate-100">Catálogo Habbo & Editor</span>
        </div>
        <button
          onClick={() => setEditorOpen(false)}
          className="p-1 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-5 p-1.5 gap-1 bg-[#12151d]/40 border-b border-[#2a3142]">
        <button
          onClick={() => {
            setActiveTab('furniture')
            setActiveTool('place_furniture')
          }}
          className={`flex flex-col items-center py-2 px-1 rounded-xl text-xs font-medium transition-all ${
            activeTab === 'furniture'
              ? 'bg-amber-600 text-white shadow-md'
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
              ? 'bg-amber-600 text-white shadow-md'
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
              ? 'bg-amber-600 text-white shadow-md'
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
              ? 'bg-amber-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Sparkles className="w-4 h-4 mb-1" />
          Zonas
        </button>

        <button
          onClick={() => setActiveTab('templates')}
          className={`flex flex-col items-center py-2 px-1 rounded-xl text-xs font-medium transition-all ${
            activeTab === 'templates'
              ? 'bg-amber-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <FolderDown className="w-4 h-4 mb-1" />
          Modelos
        </button>
      </div>

      {/* Content Area */}
      <div className="p-4 overflow-y-auto flex-1 space-y-4">
        {/* FURNITURE TAB */}
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
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
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
                        ? 'border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/10'
                        : 'border-[#2a3142] bg-[#12151d]/40 hover:border-slate-600'
                    }`}
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center border border-white/10 shadow"
                      style={{ backgroundColor: item.iconColor }}
                    >
                      <Armchair className="w-5 h-5 text-white/90" />
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

        {/* FLOORS TAB */}
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
                      ? 'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/20'
                      : 'border-[#2a3142] bg-[#12151d]/40 hover:border-slate-600'
                  }`}
                >
                  <div
                    className="w-8 h-8 rounded-lg border border-white/20 shadow-inner"
                    style={{ backgroundColor: floor.color }}
                  />
                  <span className="text-[11px] font-medium text-slate-300 text-center">{floor.name}</span>
                </button>
              )
            })}
          </div>
        )}

        {/* WALLS TAB */}
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
                      ? 'border-amber-500 bg-amber-500/10'
                      : 'border-[#2a3142] bg-[#12151d]/40 hover:border-slate-600'
                  }`}
                >
                  <div
                    className="w-full h-8 rounded-lg border border-white/20 shadow-inner"
                    style={{ backgroundColor: wall.color }}
                  />
                  <span className="text-xs font-medium text-slate-300 text-center">{wall.name}</span>
                </button>
              )
            })}
          </div>
        )}

        {/* ZONES TAB */}
        {activeTab === 'zones' && (
          <div className="space-y-3">
            <div className="text-xs text-slate-400 leading-relaxed">
              As <strong>Zonas Privadas</strong> isolam áudio e vídeo automaticamente para você e seus amigos conversarem.
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto p-1">
              {mapData.zones.map((zone) => (
                <div
                  key={zone.id}
                  className="p-2.5 rounded-xl bg-[#12151d]/60 border border-[#2a3142] flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: zone.color }} />
                    <div>
                      <div className="text-xs font-semibold text-slate-200">{zone.name}</div>
                      <div className="text-[10px] text-slate-400">{zone.description || 'Zona Privada'}</div>
                    </div>
                  </div>
                  <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400">
                    {zone.width}x{zone.height}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TEMPLATES TAB */}
        {activeTab === 'templates' && (
          <div className="space-y-3">
            <button
              onClick={() => {
                loadTemplate('habbo_hotel_lobby')
                PeerManager.getInstance().broadcast({
                  type: 'MAP_SYNC',
                  senderId: 'host',
                  payload: { mapData: useMapStore.getState().mapData },
                  timestamp: Date.now(),
                })
              }}
              className="w-full p-3 rounded-xl border border-[#2a3142] bg-[#12151d]/60 hover:border-amber-500 text-left transition-all group"
            >
              <div className="text-xs font-bold text-slate-200 group-hover:text-amber-400 flex items-center gap-1.5">
                <span>🏨 Habbo Hotel - Recepção Clássica</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Saguão com balcão de check-in, Sala VIP Habbo Club (HC), Suíte Executiva, Teleportes e Pato Amarelo.
              </div>
            </button>

            <button
              onClick={() => {
                loadTemplate('habbo_rooftop_pool')
                PeerManager.getInstance().broadcast({
                  type: 'MAP_SYNC',
                  senderId: 'host',
                  payload: { mapData: useMapStore.getState().mapData },
                  timestamp: Date.now(),
                })
              }}
              className="w-full p-3 rounded-xl border border-[#2a3142] bg-[#12151d]/60 hover:border-amber-500 text-left transition-all group"
            >
              <div className="text-xs font-bold text-slate-200 group-hover:text-amber-400 flex items-center gap-1.5">
                <span>🏖️ Habbo Hotel - Piscina & Rooftop Club</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Piscina pública com espreguiçadeiras, pista de dança e cabine de DJ do Clube Massiva.
              </div>
            </button>

            <button
              onClick={() => {
                loadTemplate('modern_tech_hq')
                PeerManager.getInstance().broadcast({
                  type: 'MAP_SYNC',
                  senderId: 'host',
                  payload: { mapData: useMapStore.getState().mapData },
                  timestamp: Date.now(),
                })
              }}
              className="w-full p-3 rounded-xl border border-[#2a3142] bg-[#12151d]/60 hover:border-indigo-500 text-left transition-all group"
            >
              <div className="text-xs font-semibold text-slate-200 group-hover:text-indigo-400">
                🏢 Tech Startup HQ (Moderno)
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Escritório completo com ilhas de time, salas de reunião e lounge de descanso.
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Footer Tools (Borracha / Deselecionar) */}
      <div className="p-3 border-t border-[#2a3142] bg-[#12151d]/80 flex gap-2">
        <button
          onClick={() => setActiveTool(activeTool === 'eraser' ? 'select' : 'eraser')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-medium flex items-center justify-center gap-2 transition-all ${
            activeTool === 'eraser'
              ? 'bg-rose-600 text-white shadow-md'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          <Trash2 className="w-4 h-4" />
          {activeTool === 'eraser' ? 'Borracha Ativa' : 'Borracha'}
        </button>
      </div>
    </div>
  )
}
