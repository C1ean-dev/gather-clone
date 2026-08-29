import React, { useState } from 'react'
import { MousePointerClick, Check, Pencil, Trash2, Trash, Settings, Shield, Crown, Lock, Unlock } from 'lucide-react'
import { PixelArtThumbnail } from '../../PixelArtThumbnail'
import { WallType, PrivateZone, MapData } from '../../../types/map'
import { useMapStore } from '../../../store/useMapStore'
import { PeerManager } from '../../../p2p/PeerManager'
import { RoomSettingsModal } from '../../../components/RoomSettingsModal'
import { ConfirmModal } from '../../../components/ConfirmModal'

interface Props {
  activeTool: string
  setActiveTool: (tool: any) => void
  zoneDraft: { name: string; color: string; hasWalls?: boolean; wallType?: WallType | string }
  setZoneDraft: (draft: any) => void
  walls: { id: string | WallType; name: string; isCustom?: boolean }[]
  mapData: MapData
  handleDeleteZone: (id: string) => void
  openEditModal: (id: string) => void
  deleteCustomAsset: (id: string) => void
}

export const ZonesTab: React.FC<Props> = ({
  activeTool,
  setActiveTool,
  zoneDraft,
  setZoneDraft,
  walls,
  mapData,
  handleDeleteZone,
  openEditModal,
  deleteCustomAsset,
}) => {
  const [selectedZoneForConfig, setSelectedZoneForConfig] = useState<PrivateZone | null>(null)
  const [assetToDelete, setAssetToDelete] = useState<{ id: string; name: string } | null>(null)

  return (
    <div className="space-y-4">
      {/* Modal for Configuring Selected Private Zone */}
      {selectedZoneForConfig && (
        <RoomSettingsModal
          zone={selectedZoneForConfig}
          isOpen={true}
          onClose={() => {
            // Refresh with updated zone if still exists
            setSelectedZoneForConfig(null)
          }}
        />
      )}

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
                  const isCustom = wall.isCustom
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
                              setAssetToDelete({ id: wall.id as string, name: wall.name })
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
          mapData.zones.map((zone: PrivateZone) => (
            <div
              key={zone.id}
              className="p-3 rounded-xl bg-[#12151d]/60 border border-[#2a3142] space-y-2.5 group hover:border-[#38435c] transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: zone.color }} />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-slate-200">{zone.name}</span>
                      {zone.isLocked && (
                        <span className="text-[9px] bg-rose-500/20 text-rose-300 px-1.5 py-0.2 rounded-full border border-rose-500/30 flex items-center gap-0.5">
                          <Lock className="w-2.5 h-2.5" /> Trancada
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                      <span>{zone.width}x{zone.height} tiles</span>
                      <span>•</span>
                      {zone.admins && zone.admins.length > 0 ? (
                        <span className="text-amber-400 flex items-center gap-0.5">
                          <Crown className="w-2.5 h-2.5" /> {zone.admins.length} ADMs
                        </span>
                      ) : (
                        <span>Sem ADM</span>
                      )}
                      {zone.members && zone.members.length > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-indigo-400">{zone.members.length} membros</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setSelectedZoneForConfig(zone)}
                    className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-indigo-600/30 text-slate-300 hover:text-indigo-300 border border-slate-700 transition-colors flex items-center gap-1 text-[10px] font-semibold"
                    title="Configurar Sala & Permissões"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>Configurar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteZone(zone.id)}
                    className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                    title="Excluir Zona"
                  >
                    <Trash className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Welcome Message Preview if set */}
              {zone.welcomeMessage && (
                <div className="text-[10px] text-slate-400 bg-slate-950/60 p-1.5 rounded-lg border border-slate-800/60 italic truncate">
                  💬 "{zone.welcomeMessage}"
                </div>
              )}

              {/* Zone Wall Configuration Switcher */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <button
                  type="button"
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
      {/* Confirm Delete Custom Wall Modal */}
      <ConfirmModal
        isOpen={!!assetToDelete}
        title="Excluir Parede Customizada"
        message={`Deseja realmente excluir a parede "${assetToDelete?.name}"? Esta ação não pode ser desfeita.`}
        confirmText="Excluir Parede"
        confirmVariant="danger"
        onConfirm={() => {
          if (assetToDelete) {
            deleteCustomAsset(assetToDelete.id)
            setAssetToDelete(null)
          }
        }}
        onCancel={() => setAssetToDelete(null)}
      />
    </div>
  )
}
