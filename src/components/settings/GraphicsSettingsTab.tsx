import React from 'react'
import { Zap, Gauge, Monitor, Eye } from 'lucide-react'
import { useSettingsStore } from '../../store/useSettingsStore'

export const GraphicsSettingsTab: React.FC = () => {
  const {
    targetFps,
    showFpsCounter,
    enableCulling,
    currentFps,
    setTargetFps,
    setShowFpsCounter,
    setEnableCulling,
  } = useSettingsStore()

  return (
    <div className="space-y-6">
      {/* Live FPS & Performance Banner */}
      <div className="p-4 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 rounded-2xl border border-indigo-500/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <Gauge className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Desempenho em Tempo Real</div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-2xl font-black font-mono text-white">
                {currentFps} <span className="text-sm font-semibold text-slate-400">FPS</span>
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  currentFps >= 50
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : currentFps >= 25
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}
              >
                {currentFps >= 50 ? '🟢 Fluidez Excelente' : currentFps >= 25 ? '🟡 Moderado' : '🔴 Baixo'}
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowFpsCounter(!showFpsCounter)}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
            showFpsCounter
              ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/30'
              : 'bg-slate-800/80 border-[#383a40] text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>{showFpsCounter ? 'Ocultar HUD' : 'Exibir HUD na Tela'}</span>
        </button>
      </div>

      {/* Frame Rate Limit Selector */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Limite de Taxa de Quadros (Target FPS)</span>
          </label>
          <span className="text-[11px] font-mono text-slate-400">
            {targetFps === 0 ? 'V-Sync (Taxa do Monitor)' : `${targetFps} FPS`}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { fps: 30, label: '30 FPS', sub: 'Bateria / Economia' },
            { fps: 60, label: '60 FPS', sub: 'Padrão Recomendado' },
            { fps: 0, label: 'V-Sync', sub: 'Taxa Nativa do Monitor' },
          ].map((opt) => {
            const isSelected = targetFps === opt.fps
            return (
              <button
                key={opt.fps}
                type="button"
                onClick={() => setTargetFps(opt.fps)}
                className={`p-4 rounded-2xl border text-center transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600/20 border-indigo-500 ring-2 ring-indigo-500/40 shadow-lg shadow-indigo-600/20'
                    : 'bg-slate-950/40 border-[#2a3142] hover:border-slate-600 hover:bg-slate-900/60'
                }`}
              >
                <div className={`text-base font-black ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                  {opt.label}
                </div>
                <div className="text-[11px] text-slate-500 mt-1 font-medium">{opt.sub}</div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Graphics Toggles */}
      <div className="p-4 bg-slate-950/40 rounded-2xl border border-[#2a3142] space-y-4">
        <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
          <Monitor className="w-4 h-4 text-indigo-400" />
          <span>Otimizações Gráficas do Canvas</span>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-200">Culling de Câmera (Renderização Inteligente)</div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Renderiza apenas pisos e blocos visíveis no visor da câmera. Aumenta os FPS em até 5x a 15x.
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={enableCulling}
              onChange={(e) => setEnableCulling(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
          </label>
        </div>

        <div className="flex items-center justify-between border-t border-[#2a3142]/60 pt-3">
          <div>
            <div className="text-xs font-semibold text-slate-200">Contador de FPS Flutuante na Tela</div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Exibe um selo HUD compacto no canto superior direito com a taxa de FPS atual.
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={showFpsCounter}
              onChange={(e) => setShowFpsCounter(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
          </label>
        </div>
      </div>
    </div>
  )
}
