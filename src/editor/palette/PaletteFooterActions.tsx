import React from 'react'
import { Trash2, RotateCcw } from 'lucide-react'

interface Props {
  activeTool: string
  setActiveTool: (tool: any) => void
  onResetWorkspace: () => void
}

export const PaletteFooterActions: React.FC<Props> = ({
  activeTool,
  setActiveTool,
  onResetWorkspace,
}) => {
  return (
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
        <span>{activeTool === 'eraser' ? 'Borracha Ativa' : 'Borracha'}</span>
      </button>

      <button
        onClick={onResetWorkspace}
        className="py-2 px-3 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center gap-1.5 transition-all"
        title="Limpar e reiniciar mapa em branco"
      >
        <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
        <span>Limpar Espaço</span>
      </button>
    </div>
  )
}
