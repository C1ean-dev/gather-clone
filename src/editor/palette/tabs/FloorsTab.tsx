import React, { useState } from 'react'
import { Trash2, Pencil, ShieldCheck } from 'lucide-react'
import { PixelArtThumbnail } from '../../PixelArtThumbnail'
import { FloorType } from '../../../types/map'
import { ConfirmModal } from '../../../components/ConfirmModal'

interface Props {
  floors: { id: string; name: string; isCustom?: boolean }[]
  selectedFloor: FloorType
  setSelectedFloor: (floor: FloorType) => void
  activeTool: string
  setActiveTool: (tool: any) => void
  deleteCustomAsset: (id: string) => void
  openEditModal?: (id: string, mode?: 'crop' | 'compose') => void
  onDeleteFloor?: (id: string) => void
}

export const FloorsTab: React.FC<Props> = ({
  floors,
  selectedFloor,
  setSelectedFloor,
  activeTool,
  setActiveTool,
  deleteCustomAsset,
  openEditModal,
  onDeleteFloor,
}) => {
  const [assetToDelete, setAssetToDelete] = useState<{ id: string; name: string } | null>(null)

  return (
    <div className="space-y-3">
      {/* Rule banner: floor paint only works inside zones. The user
          has to draw a zone first (using the "Demarcar zona" tool)
          and then click inside it to fill the whole zone with the
          selected floor. Clicking outside a zone is a no-op (the
          cursor preview already shows a forbidden outline). */}
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2.5">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300 px-1 pb-1.5">
          Como pintar pisos
        </div>
        <div className="text-[11px] text-emerald-100 px-1 leading-relaxed">
          1. Use a aba <span className="font-semibold">Zonas</span> para
          demarcar uma zona no mapa.
          <br />
          2. Volte aqui, escolha um piso e clique{' '}
          <span className="font-semibold">dentro da zona</span> — ela
          será preenchida inteira com o piso selecionado.
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto p-1">
        {floors.map((floor) => {
          const isSelected = selectedFloor === floor.id && activeTool === 'paint_floor'
          const isDefaultFloor = floor.id === 'habbo_parquet'
          return (
            <div
              key={floor.id}
              className={`relative p-2.5 rounded-xl border flex flex-col items-center gap-1.5 text-left transition-all group ${
                isSelected
                  ? 'border-indigo-500 bg-indigo-500/15 shadow-lg shadow-indigo-500/10 ring-2 ring-indigo-500/30'
                  : 'border-[#2a3142] bg-[#12151d]/50 hover:border-slate-500'
              }`}
            >
              {/* If default floor: show protected badge. Otherwise show Edit and Delete buttons */}
              {isDefaultFloor ? (
                <div
                  className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 z-10 flex items-center gap-1 shadow-sm"
                  title="Piso padrão protegido (não pode ser editado ou excluído)"
                >
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  <span>Padrão</span>
                </div>
              ) : (
                <div className="absolute top-1.5 right-1.5 flex items-center gap-1 z-10">
                  {openEditModal && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        openEditModal(floor.id, 'compose')
                      }}
                      className="p-1 rounded-md bg-blue-500/20 hover:bg-blue-500/40 text-blue-400 hover:text-blue-200 opacity-80 hover:opacity-100 transition-all shadow-sm"
                      title={`Editar piso "${floor.name}"`}
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setAssetToDelete({ id: floor.id, name: floor.name })
                    }}
                    className="p-1 rounded-md bg-rose-500/20 hover:bg-rose-500/40 text-rose-400 hover:text-rose-200 opacity-80 hover:opacity-100 transition-all shadow-sm"
                    title={`Excluir piso "${floor.name}"`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}

              <button
                onClick={() => {
                  setSelectedFloor(floor.id as any)
                  setActiveTool('paint_floor')
                }}
                className="w-full flex flex-col items-center gap-1.5"
              >
                <div className="w-full h-12 rounded-lg overflow-hidden border border-white/10 shadow-inner bg-[#181d28] flex items-center justify-center">
                  <PixelArtThumbnail type="floor" id={floor.id} size={48} />
                </div>
                <div className="w-full">
                  <div className="text-xs font-semibold text-slate-200 truncate">{floor.name}</div>
                  <div className="text-[10px] text-slate-400">
                    {isDefaultFloor ? 'Piso Padrão • Chão' : 'Piso Customizado • Livre'}
                  </div>
                </div>
              </button>
            </div>
          )
        })}
      </div>

      {/* Confirm Delete Floor Modal */}
      <ConfirmModal
        isOpen={!!assetToDelete}
        title="Excluir Piso"
        message={`Deseja realmente excluir o piso "${assetToDelete?.name}"? Áreas com este piso serão restauradas para o Piso Padrão.`}
        confirmText="Excluir Piso"
        confirmVariant="danger"
        onConfirm={() => {
          if (assetToDelete) {
            deleteCustomAsset(assetToDelete.id)
            if (onDeleteFloor) {
              onDeleteFloor(assetToDelete.id)
            }
            if (selectedFloor === assetToDelete.id) {
              setSelectedFloor('habbo_parquet')
            }
            setAssetToDelete(null)
          }
        }}
        onCancel={() => setAssetToDelete(null)}
      />
    </div>
  )
}
