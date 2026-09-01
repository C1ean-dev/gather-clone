import React from 'react'
import {
  Smile,
  Eye,
  Sparkles,
  User,
  Shirt,
  Layers,
  Footprints,
  Crown,
  Glasses,
  UserCircle,
} from 'lucide-react'

export type CategoryKey =
  | 'skin'
  | 'eyes'
  | 'hair'
  | 'facialHair'
  | 'top'
  | 'jacket'
  | 'bottom'
  | 'shoes'
  | 'hat'
  | 'glasses'
  | 'other'

interface Props {
  activeCategory: CategoryKey
  onSelectCategory: (category: CategoryKey) => void
}

export const CATEGORIES = [
  { id: 'skin', label: 'Maquiagem', icon: Smile },
  { id: 'eyes', label: 'Olhos', icon: Eye },
  { id: 'hair', label: 'Cabelo', icon: Sparkles },
  { id: 'facialHair', label: 'Pelos faciais', icon: User },
  { id: 'top', label: 'Parte de cima', icon: Shirt },
  { id: 'jacket', label: 'Jaqueta', icon: Layers },
  { id: 'bottom', label: 'Parte de baixo', icon: Footprints },
  { id: 'shoes', label: 'Sapatos', icon: Footprints },
  { id: 'hat', label: 'Chapéu', icon: Crown },
  { id: 'glasses', label: 'Óculos', icon: Glasses },
  { id: 'other', label: 'Personagem', icon: UserCircle },
]

export const CategoryTabs: React.FC<Props> = ({ activeCategory, onSelectCategory }) => {
  return (
    <div className="w-48 bg-[#18191c] border-r border-[#2b2d31] p-3 flex flex-col gap-1 overflow-y-auto shrink-0">
      {CATEGORIES.map((cat) => {
        const Icon = cat.icon
        const isActive = activeCategory === cat.id
        return (
          <button
            key={cat.id}
            onClick={() => onSelectCategory(cat.id as CategoryKey)}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all text-left ${
              isActive
                ? 'bg-[#3b82f6] text-white shadow-lg shadow-blue-500/30'
                : 'text-slate-300 hover:bg-[#2b2d31] hover:text-white'
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="truncate">{cat.label}</span>
          </button>
        )
      })}
    </div>
  )
}
