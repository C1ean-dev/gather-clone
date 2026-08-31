import React, { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { PixelArtThumbnail } from '../../PixelArtThumbnail'
import { ConfirmModal } from '../../../components/ConfirmModal'

interface FurnitureTabItem {
  id: string
  name: string
  category?: string
  width: number
  height: number
  isObstacle?: boolean
  isCustom?: boolean
  [key: string]: any
}

interface Props {
  categories: string[]
  furnitureCategory: string
  setFurnitureCategory: (cat: string) => void
  addCategory: (cat: string) => void
  allFurniture: FurnitureTabItem[]
  filteredFurniture: FurnitureTabItem[]
  selectedFurnitureDefId: string
  setSelectedFurnitureDefId: (id: string) => void
  activeTool: string
  setActiveTool: (tool: any) => void
  deleteCustomAsset: (id: string) => void
}

export const FurnitureTab: React.FC<Props> = ({
  categories,
  furnitureCategory,
  setFurnitureCategory,
  addCategory,
  allFurniture,
  filteredFurniture,
  selectedFurnitureDefId,
  setSelectedFurnitureDefId,
  activeTool,
  setActiveTool,
  deleteCustomAsset,
}) => {
  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [newCategoryText, setNewCategoryText] = useState('')
  const [assetToDelete, setAssetToDelete] = useState<{ id: string; name: string } | null>(null)

  const handleSaveCategory = () => {
    const trimmed = newCategoryText.trim()
    if (trimmed) {
      addCategory(trimmed)
      setFurnitureCategory(trimmed)
      setNewCategoryText('')
      setIsAddingCategory(false)
    }
  }

  return (
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
                if (e.key === 'Enter') handleSaveCategory()
                else if (e.key === 'Escape') setIsAddingCategory(false)
              }}
            />
            <button
              onClick={handleSaveCategory}
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
            const isCustom = item.isCustom
            return (
              <div
                key={item.id}
                className={`relative p-2.5 rounded-xl border flex flex-col items-center gap-1.5 text-left transition-all group ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-500/15 shadow-lg shadow-indigo-500/10 ring-2 ring-indigo-500/30'
                    : 'border-[#2a3142] bg-[#12151d]/50 hover:border-slate-500'
                }`}
              >
                {/* Right Delete Button for custom items */}
                {isCustom && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setAssetToDelete({ id: item.id, name: item.name })
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

      {/* Confirm Delete Custom Element Modal */}
      <ConfirmModal
        isOpen={!!assetToDelete}
        title="Excluir Elemento Customizado"
        message={`Deseja realmente excluir o elemento "${assetToDelete?.name}"? Esta ação não pode ser desfeita.`}
        confirmText="Excluir Elemento"
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
