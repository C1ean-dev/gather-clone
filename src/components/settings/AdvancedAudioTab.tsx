import React from 'react'
import { Shield } from 'lucide-react'
import { useMediaStore } from '../../store/useMediaStore'
import { MediaManager } from '../../media/MediaManager'

export const AdvancedAudioTab: React.FC = () => {
  const {
    echoCancellation,
    autoGainControl,
    isNoiseSuppressionEnabled,
    screenShareAudioVolume,
    duckingEnabled,
    setEchoCancellation,
    setAutoGainControl,
    toggleNoiseSuppression,
    setScreenShareAudioVolume,
    setDuckingEnabled,
  } = useMediaStore()

  const handleScreenVolumeChange = (vol: number) => {
    setScreenShareAudioVolume(vol)
    MediaManager.getInstance().updateScreenShareAudioVolume(vol)
  }

  return (
    <div className="space-y-6">
      {/* 1. Compartilhamento de Tela & Correção de Reverberação */}
      <div className="bg-[#12151d]/70 rounded-2xl p-4 border border-[#2a3142] space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold text-slate-200">
            Áudio de Compartilhamento de Tela (Anti-Reverberação)
          </span>
        </div>

        <div className="text-xs text-slate-400 leading-relaxed bg-[#1b202c] p-3 rounded-xl border border-[#2a3142]">
          <strong className="text-slate-200">Como funciona o isolamento anti-eco:</strong> Quando você transmite o áudio do seu computador junto com a tela, nosso motor aplica atenuação e ducking automático, impedindo que a voz dos outros participantes volte para a chamada em forma de eco ensurdecedor.
        </div>

        {/* Volume do Áudio da Tela */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span>Volume Padrão da Transmissão da Tela</span>
            <span className="font-bold text-indigo-400">{screenShareAudioVolume}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={screenShareAudioVolume}
            onChange={(e) => handleScreenVolumeChange(Number(e.target.value))}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
        </div>

        {/* Ducking Inteligente Toggle */}
        <div className="flex items-center justify-between pt-2 border-t border-[#2a3142]">
          <div>
            <div className="text-xs font-semibold text-slate-200">Ducking de Voz Inteligente</div>
            <div className="text-[10px] text-slate-400">
              Reduz automaticamente o áudio da tela em 75% enquanto você estiver falando
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={duckingEnabled}
              onChange={(e) => setDuckingEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
          </label>
        </div>
      </div>

      {/* 2. Processamento DSP & Cancelamento */}
      <div className="bg-[#12151d]/70 rounded-2xl p-4 border border-[#2a3142] space-y-3">
        <div className="text-xs font-bold text-slate-200 mb-2">Processamento de Voz & Filtros</div>

        {/* Supressor de Ruído */}
        <div className="flex items-center justify-between py-1">
          <div>
            <div className="text-xs font-semibold text-slate-200">Supressor de Ruído DSP (IA)</div>
            <div className="text-[10px] text-slate-400">
              Filtra ventiladores, cliques de teclado e zumbidos elétricos
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isNoiseSuppressionEnabled}
              onChange={() => {
                toggleNoiseSuppression()
                MediaManager.getInstance().updateNoiseSuppression(!isNoiseSuppressionEnabled)
              }}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
          </label>
        </div>

        {/* Cancelamento de Eco AEC */}
        <div className="flex items-center justify-between py-1 border-t border-[#2a3142]">
          <div>
            <div className="text-xs font-semibold text-slate-200">Cancelamento de Eco Acústico (AEC)</div>
            <div className="text-[10px] text-slate-400">
              Evita que o som dos alto-falantes retorne para o microfone
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={echoCancellation}
              onChange={(e) => setEchoCancellation(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
          </label>
        </div>

        {/* Controle Automático de Ganho AGC */}
        <div className="flex items-center justify-between py-1 border-t border-[#2a3142]">
          <div>
            <div className="text-xs font-semibold text-slate-200">Controle Automático de Ganho (AGC)</div>
            <div className="text-[10px] text-slate-400">
              Nivela vozes baixas e altas automaticamente para um volume confortável
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={autoGainControl}
              onChange={(e) => setAutoGainControl(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
          </label>
        </div>
      </div>
    </div>
  )
}
