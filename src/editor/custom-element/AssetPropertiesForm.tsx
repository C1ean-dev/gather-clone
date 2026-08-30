import React from 'react'
import { Package, Plus } from 'lucide-react'
import { CustomAssetType } from '../../types/customAsset'

interface Props {
  elementName: string
  setElementName: (name: string) => void
  elementType: CustomAssetType
  onSelectElementType: (type: CustomAssetType) => void
  category: string
  setCategory: (cat: string) => void
  allCategories: string[]
  isCreatingNewCategory: boolean
  setIsCreatingNewCategory: (creating: boolean) => void
  newCategoryName: string
  setNewCategoryName: (name: string) => void
  onAddNewCategory: () => void
}

export const AssetPropertiesForm: React.FC<Props> = ({
  elementName,
  setElementName,
  elementType,
  onSelectElementType,
  category,
  setCategory,
  allCategories,
  isCreatingNewCategory,
  setIsCreatingNewCategory,
  newCategoryName,
  setNewCategoryName,
  onAddNewCategory,
}) => {
  return (
    <div className="bg-[#18191c] rounded-2xl p-4 border border-[#2b2d31] space-y-3.5">
      <div className="flex items-center gap-2">
        <Package className="w-4 h-4 text-indigo-400" />
        <span className="text-xs font-bold text-slate-200">Propriedades do Elemento</span>
      </div>

      {/* Name Input */}
      <div className="space-y-1">
        <label className="block text-[11px] font-semibold text-slate-300">Nome do Objeto</label>
        <input
          type="text"
          value={elementName}
          onChange={(e) => setElementName(e.target.value)}
          placeholder="Ex: Forja de Armas, Trono de Ouro, Parede Rústica..."
          className="w-full bg-[#12151d] border border-[#2b2d31] rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
          maxLength={30}
        />
      </div>

      {/* Element Type Selector */}
      <div className="space-y-1">
        <label className="block text-[11px] font-semibold text-slate-300">Tipo de Elemento</label>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { type: 'furniture', label: 'Mobília / Objeto' },
            { type: 'floor', label: 'Piso do Chão' },
            { type: 'wall', label: 'Parede' },
          ].map((item) => (
            <button
              key={item.type}
              type="button"
              onClick={() => onSelectElementType(item.type as CustomAssetType)}
              className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border transition-all ${
                elementType === item.type
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                  : 'bg-[#12151d] border-[#2b2d31] text-slate-400 hover:text-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Category Dropdown & Creator */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="block text-[11px] font-semibold text-slate-300">Categoria no Menu</label>
          <button
            type="button"
            onClick={() => setIsCreatingNewCategory(!isCreatingNewCategory)}
            className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5"
          >
            <Plus className="w-3 h-3" />
            <span>{isCreatingNewCategory ? 'Usar Existente' : 'Nova Categoria'}</span>
          </button>
        </div>

        {isCreatingNewCategory ? (
          <div className="flex gap-1.5">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Nome da categoria..."
              className="flex-1 bg-[#12151d] border border-[#2a3142] rounded-xl px-3 py-1 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
              maxLength={20}
            />
            <button
              type="button"
              onClick={onAddNewCategory}
              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow transition-colors"
            >
              Salvar
            </button>
          </div>
        ) : (
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-[#12151d] border border-[#2b2d31] rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
          >
            {allCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  )
}
