import React, { useState } from 'react'
import { Trash2 } from 'lucide-react'
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
}

export const FloorsTab: React.FC<Props> = ({
  floors,
  selectedFloor,
  setSelectedFloor,
  activeTool,
  setActiveTool,
  deleteCustomAsset,
}) => {
  const [assetToDelete, setAssetToDelete] = useState<{ id: string; name: string } | null>(null)

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto p-1">
        {floors.map((floor) => {
          const isSelected = selectedFloor === floor.id && activeTool === 'paint_floor'
          const isCustom = floor.isCustom
          return (
            <div
              key={floor.id}
              className={`relative p-2.5 rounded-xl border flex flex-col items-center gap-1.5 text-left transition-all group ${
                isSelected
                  ? 'border-indigo-500 bg-indigo-500/15 shadow-lg shadow-indigo-500/10 ring-2 ring-indigo-500/30'
                  : 'border-[#2a3142] bg-[#12151d]/50 hover:border-slate-500'
              }`}
            >
              {/* Right Delete Button */}
              {isCustom && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setAssetToDelete({ id: floor.id, name: floor.name })
                  }}
                  className="absolute top-1.5 right-1.5 p-1 rounded-md bg-rose-500/20 hover:bg-rose-500/40 text-rose-400 hover:text-rose-200 opacity-80 hover:opacity-100 transition-all z-10"
                  title="Excluir piso customizado"
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
                <div className="w-full h-12 rounded-lg overflow-hidden border border-white/10 shadow-inner bg-[#181d28] flex items-center justify-center">
                  <PixelArtThumbnail type="floor" id={floor.id} size={48} />
                </div>
                <div className="w-full">
                  <div className="text-xs font-semibold text-slate-200 truncate">{floor.name}</div>
                  <div className="text-[10px] text-slate-400">
                    {floor.isCustom ? 'Piso Customizado • Livre' : 'Piso Padrão • Chão'}
                  </div>
                </div>
              </button>
            </div>
          )
        })}
      </div>

      {/* Confirm Delete Custom Floor Modal */}
      <ConfirmModal
        isOpen={!!assetToDelete}
        title="Excluir Piso Customizado"
        message={`Deseja realmente excluir o piso "${assetToDelete?.name}"? Esta ação não pode ser desfeita.`}
        confirmText="Excluir Piso"
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
