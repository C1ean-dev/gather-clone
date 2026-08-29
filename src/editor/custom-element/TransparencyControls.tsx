import React from 'react'
import { Pipette, Wand2, Sliders } from 'lucide-react'
import { RGBColor, PRESET_BG_COLORS } from '../../utils/imageTransparency'

interface Props {
  enableBgRemoval: boolean
  setEnableBgRemoval: (val: boolean) => void
  targetColor: RGBColor
  setTargetColor: (color: RGBColor) => void
  tolerance: number
  setTolerance: (tol: number) => void
  removeWhiteFringe: boolean
  setRemoveWhiteFringe: (val: boolean) => void
  isEyedropperActive: boolean
  setIsEyedropperActive: (active: boolean) => void
}

export const TransparencyControls: React.FC<Props> = ({
  enableBgRemoval,
  setEnableBgRemoval,
  targetColor,
  setTargetColor,
  tolerance,
  setTolerance,
  removeWhiteFringe,
  setRemoveWhiteFringe,
  isEyedropperActive,
  setIsEyedropperActive,
}) => {
  return (
    <div className="bg-[#18191c] rounded-2xl p-4 border border-[#2b2d31] space-y-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wand2 className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold text-slate-200">Filtro de Transparência Automática</span>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={enableBgRemoval}
            onChange={(e) => setEnableBgRemoval(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
        </label>
      </div>

      {enableBgRemoval && (
        <div className="space-y-3 pt-1 border-t border-[#2b2d31]">
          {/* Target Color Swatch & Eyedropper */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-300">Cor de Fundo Alvo:</span>
              <div
                className="w-6 h-6 rounded-lg border border-white/20 shadow-inner"
                style={{ backgroundColor: `rgb(${targetColor.r}, ${targetColor.g}, ${targetColor.b})` }}
              />
            </div>
            <button
              type="button"
              onClick={() => setIsEyedropperActive(!isEyedropperActive)}
              className={`px-3 py-1 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                isEyedropperActive
                  ? 'bg-amber-500 text-slate-900 border-amber-400 shadow-md animate-pulse'
                  : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
            >
              <Pipette className="w-3.5 h-3.5" />
              <span>{isEyedropperActive ? 'Clique na imagem...' : 'Conta-gotas'}</span>
            </button>
          </div>

          {/* Color Presets */}
          <div className="space-y-1">
            <span className="text-[10px] font-semibold text-slate-400">Paletas Comuns (Spritesheets):</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { name: 'LPC Escuro', color: PRESET_BG_COLORS.LPC_DARK },
                { name: 'Preto', color: PRESET_BG_COLORS.BLACK },
                { name: 'Branco', color: PRESET_BG_COLORS.WHITE },
                { name: 'Magenta', color: PRESET_BG_COLORS.MAGENTA },
                { name: 'Verde Croma', color: PRESET_BG_COLORS.GREEN },
                { name: 'Azul', color: PRESET_BG_COLORS.CYAN },
              ].map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => setTargetColor(preset.color)}
                  className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-[#12151d] hover:bg-slate-800 border border-[#2b2d31] text-slate-300 hover:text-white transition-colors flex items-center gap-1"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full border border-white/20"
                    style={{ backgroundColor: `rgb(${preset.color.r}, ${preset.color.g}, ${preset.color.b})` }}
                  />
                  <span>{preset.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tolerance Slider */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span className="flex items-center gap-1">
                <Sliders className="w-3.5 h-3.5 text-slate-400" />
                <span>Tolerância de Cor</span>
              </span>
              <span className="font-mono font-bold text-amber-400">{tolerance}</span>
            </div>
            <input
              type="range"
              min={1}
              max={100}
              value={tolerance}
              onChange={(e) => setTolerance(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>

          {/* White Fringe Removal */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-slate-300">Suavizar Bordas e Halos</span>
            <input
              type="checkbox"
              checked={removeWhiteFringe}
              onChange={(e) => setRemoveWhiteFringe(e.target.checked)}
              className="w-4 h-4 rounded text-amber-500 focus:ring-0 bg-slate-800 border-slate-700 cursor-pointer"
            />
          </div>
        </div>
      )}
    </div>
  )
}
