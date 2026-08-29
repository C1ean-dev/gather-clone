import React from 'react'
import { Zap, Gauge, Monitor, Eye, FastForward } from 'lucide-react'
import { useSettingsStore } from '../../store/useSettingsStore'

export const GraphicsSettingsTab: React.FC = () => {
  const {
    targetFps,
    showFpsCounter,
    enableCulling,
    moveSpeed,
    currentFps,
    setTargetFps,
    setShowFpsCounter,
    setEnableCulling,
    setMoveSpeed,
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
              ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
              : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>{showFpsCounter ? 'HUD na Tela: Ativado' : 'Exibir HUD na Tela'}</span>
        </button>
      </div>

      {/* Target FPS Selector */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Limite de Taxa de Quadros (Target FPS)</span>
          </label>
          <span className="text-[11px] text-slate-400 font-mono">
            {targetFps === 0 ? 'V-Sync (Taxa do Monitor)' : `${targetFps} FPS`}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          {[
            { fps: 30, label: '30 FPS', desc: 'Bateria / Economia' },
            { fps: 60, label: '60 FPS', desc: 'Padrão Recomendado' },
            { fps: 0, label: 'V-Sync', desc: 'Taxa Nativa do Monitor' },
          ].map((item) => {
            const isSelected = targetFps === item.fps
            return (
              <button
                key={item.fps}
                type="button"
                onClick={() => setTargetFps(item.fps)}
                className={`p-3.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                  isSelected
                    ? 'bg-indigo-600/25 border-indigo-500 ring-2 ring-indigo-500/40 text-white shadow-lg'
                    : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800/60'
                }`}
              >
                <div className={`text-base font-black font-mono ${isSelected ? 'text-indigo-400' : 'text-slate-200'}`}>
                  {item.label}
                </div>
                <div className="text-[10px] text-slate-400 font-medium leading-tight">{item.desc}</div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Performance Switches & Viewport Culling */}
      <div className="p-4 bg-slate-950/40 rounded-2xl border border-[#2a3142] space-y-4">
        <div className="text-xs font-bold text-slate-300 flex items-center gap-2">
          <Monitor className="w-4 h-4 text-indigo-400" />
          <span>Otimizações Gráficas do Canvas</span>
        </div>

        {/* Viewport Culling Toggle */}
        <div className="flex items-center justify-between py-1">
          <div>
            <div className="text-xs font-semibold text-slate-200">Culling de Câmera (Renderização Inteligente)</div>
            <div className="text-[10px] text-slate-400">
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

        {/* Show FPS HUD Toggle */}
        <div className="flex items-center justify-between py-1 border-t border-slate-800/80">
          <div>
            <div className="text-xs font-semibold text-slate-200">Contador de FPS Flutuante na Tela</div>
            <div className="text-[10px] text-slate-400">
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

      {/* Avatar Walk Speed Slider */}
      <div className="p-4 bg-slate-950/40 rounded-2xl border border-[#2a3142] space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
            <FastForward className="w-4 h-4 text-emerald-400" />
            <span>Velocidade de Deslocamento do Avatar</span>
          </label>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold font-mono text-emerald-400">{moveSpeed.toFixed(1)} tiles/s</span>
            {moveSpeed !== 4.5 && (
              <button
                type="button"
                onClick={() => setMoveSpeed(4.5)}
                className="text-[10px] text-slate-400 hover:text-slate-200 underline"
              >
                Restaurar (4.5)
              </button>
            )}
          </div>
        </div>
        <input
          type="range"
          min={3.0}
          max={8.0}
          step={0.5}
          value={moveSpeed}
          onChange={(e) => setMoveSpeed(parseFloat(e.target.value))}
          className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
        />
        <div className="flex justify-between text-[10px] text-slate-500 font-mono">
          <span>Lento (3.0)</span>
          <span>Normal (4.5)</span>
          <span>Rápido (6.0)</span>
          <span>Turbo (8.0)</span>
        </div>
      </div>
    </div>
  )
}
