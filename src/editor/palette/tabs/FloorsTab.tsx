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

      <div className="grid grid-cols-3 gap-2 max-h-80 overflow-y-auto p-0.5">
        {floors.map((floor) => {
          const isSelected = selectedFloor === floor.id && activeTool === 'paint_floor'
          const isDefaultFloor = floor.id === 'habbo_parquet'
          return (
            <div
              key={floor.id}
              onClick={() => {
                setSelectedFloor(floor.id as any)
                setActiveTool('paint_floor')
              }}
              className={`group relative aspect-square rounded-xl border flex flex-col items-center justify-between p-1.5 transition-all select-none cursor-pointer ${
                isSelected
                  ? 'border-indigo-500 bg-indigo-500/20 shadow-md shadow-indigo-500/20 ring-2 ring-indigo-500/40'
                  : 'border-[#2a3142] bg-[#12151d]/60 hover:border-slate-500 hover:bg-[#181d28]'
              }`}
              title={floor.name}
            >
              {/* Top Badge / Actions */}
              <div className="w-full flex items-center justify-end z-10 pointer-events-none">
                {isDefaultFloor ? (
                  <div
                    className="px-1 py-0.5 rounded text-[8px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-0.5 shadow-sm"
                    title="Piso padrão protegido"
                  >
                    <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" />
                    <span>Padrão</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-0.5 pointer-events-auto">
                    {openEditModal && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          openEditModal(floor.id, 'compose')
                        }}
                        className="p-1 rounded-md bg-blue-500/30 hover:bg-blue-500/60 text-blue-300 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                        title={`Editar piso "${floor.name}"`}
                      >
                        <Pencil className="w-2.5 h-2.5" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setAssetToDelete({ id: floor.id, name: floor.name })
                      }}
                      className="p-1 rounded-md bg-rose-500/30 hover:bg-rose-500/60 text-rose-300 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                      title={`Excluir piso "${floor.name}"`}
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Center Floor Thumbnail */}
              <div className="flex-1 flex items-center justify-center w-full min-h-0 overflow-hidden py-0.5">
                <PixelArtThumbnail type="floor" id={floor.id} size={48} />
              </div>

              {/* Bottom Label */}
              <div className="w-full text-center px-0.5">
                <div className="text-[11px] font-semibold text-slate-200 truncate leading-tight">
                  {floor.name.replace(/^✨\s*/, '')}
                </div>
              </div>
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
