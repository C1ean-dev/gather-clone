import React from 'react'
import { Mic, Headphones, Play, Activity, Radio, CheckCircle2, Sparkles } from 'lucide-react'
import { useMediaStore } from '../../store/useMediaStore'
import { MediaManager } from '../../media/MediaManager'
import { AudioDeviceInfo, SensitivityMode } from '../../types/audio'

interface Props {
  inputDevices: AudioDeviceInfo[]
  outputDevices: AudioDeviceInfo[]
  isPlayingTestSound: boolean
  onPlayTestSound: () => void
}

export const AudioDevicesTab: React.FC<Props> = ({
  inputDevices,
  outputDevices,
  isPlayingTestSound,
  onPlayTestSound,
}) => {
  const {
    selectedAudioInput,
    selectedAudioOutput,
    inputVolume,
    outputVolume,
    sensitivityMode,
    manualSensitivityThreshold,
    localAudioLevel,
    isGateOpen,
    isTestingMic,
    setInputVolume,
    setOutputVolume,
    setSensitivityMode,
    setManualSensitivityThreshold,
  } = useMediaStore()

  const handleInputChange = async (deviceId: string) => {
    await MediaManager.getInstance().changeAudioInput(deviceId)
  }

  const handleOutputChange = async (deviceId: string) => {
    await MediaManager.getInstance().changeAudioOutput(deviceId)
  }

  const handleInputVolumeChange = (vol: number) => {
    setInputVolume(vol)
    MediaManager.getInstance().updateInputVolume(vol)
  }

  const handleOutputVolumeChange = (vol: number) => {
    setOutputVolume(vol)
    const elements = document.querySelectorAll('video, audio')
    elements.forEach((el: any) => {
      if (!el.muted) {
        el.volume = Math.max(0, Math.min(1, vol / 100))
      }
    })
  }

  const handleSensitivityModeToggle = (mode: SensitivityMode) => {
    setSensitivityMode(mode)
    MediaManager.getInstance().updateSensitivity(mode, manualSensitivityThreshold)
  }

  const handleThresholdChange = (val: number) => {
    setManualSensitivityThreshold(val)
    MediaManager.getInstance().updateSensitivity(sensitivityMode, val)
  }

  const handleTestMicToggle = () => {
    const nextTesting = !isTestingMic
    MediaManager.getInstance().setTestMic(nextTesting)
  }

  return (
    <div className="space-y-6">
      {/* 1. Microfone & Alto-falantes Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Microfone */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs font-bold text-slate-200">
            <Mic className="w-4 h-4 text-indigo-400" />
            <span>Dispositivo de Entrada (Microfone)</span>
          </label>
          <select
            value={selectedAudioInput}
            onChange={(e) => handleInputChange(e.target.value)}
            className="w-full bg-[#12151d] border border-[#2a3142] rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
          >
            <option value="default">Microfone Padrão do Sistema</option>
            {inputDevices.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label}
              </option>
            ))}
          </select>

          {/* Volume de Entrada */}
          <div className="pt-2">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
              <span>Volume de Entrada (Ganho)</span>
              <span className="font-bold text-indigo-400">{inputVolume}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={200}
              value={inputVolume}
              onChange={(e) => handleInputVolumeChange(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>
        </div>

        {/* Saída de Som */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-200">
              <Headphones className="w-4 h-4 text-indigo-400" />
              <span>Dispositivo de Saída (Fones/Caixas)</span>
            </label>
            <button
              type="button"
              onClick={onPlayTestSound}
              className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-all flex items-center gap-1 ${
                isPlayingTestSound
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 animate-pulse'
                  : 'bg-[#12151d] border-[#2a3142] text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
              title="Testar saída de áudio"
            >
              <Play className="w-3 h-3" />
              <span>{isPlayingTestSound ? 'Tocando...' : 'Testar Som'}</span>
            </button>
          </div>
          <select
            value={selectedAudioOutput}
            onChange={(e) => handleOutputChange(e.target.value)}
            className="w-full bg-[#12151d] border border-[#2a3142] rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
          >
            <option value="default">Alto-Falante Padrão do Sistema</option>
            {outputDevices.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label}
              </option>
            ))}
          </select>

          {/* Volume de Saída */}
          <div className="pt-2">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
              <span>Volume de Saída dos Participantes</span>
              <span className="font-bold text-indigo-400">{outputVolume}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={outputVolume}
              onChange={(e) => handleOutputVolumeChange(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* 2. Seção de Teste de Microfone & VU Meter */}
      <div className="bg-[#12151d]/70 rounded-2xl p-4 border border-[#2a3142] space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-slate-200">Teste do Microfone</span>
          </div>
          <button
            type="button"
            onClick={handleTestMicToggle}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md ${
              isTestingMic
                ? 'bg-rose-600 text-white animate-pulse'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>{isTestingMic ? 'Parar Teste' : 'Testar Microfone'}</span>
          </button>
        </div>

        {isTestingMic && (
          <div className="text-[11px] text-indigo-300 bg-indigo-500/10 border border-indigo-500/30 p-2.5 rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>Fale no microfone para ouvir o retorno em tempo real nos seus fones de ouvido!</span>
          </div>
        )}

        {/* Real-time Dynamic VU Meter Bar with Sensitivity Cutoff Marker */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span>Nível de Entrada Sonoro</span>
            <span className={isGateOpen ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
              {isGateOpen ? '● Microfone Aberto (Voz Detectada)' : '○ Filtrando Ruído'}
            </span>
          </div>

          <div className="relative w-full h-4 bg-slate-950 rounded-full overflow-hidden border border-[#2a3142] p-0.5">
            {/* Live volume level fill */}
            <div
              className={`h-full rounded-full transition-all duration-75 ${
                isGateOpen
                  ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 shadow-lg shadow-emerald-500/30'
                  : 'bg-slate-600/40'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, localAudioLevel * 100))}%` }}
            />

            {/* Manual Sensitivity Marker Overlay (Discord style) */}
            {sensitivityMode === 'manual' && (
              <div
                className="absolute top-0 bottom-0 w-1 bg-amber-400 z-10 shadow-md pointer-events-none"
                style={{ left: `${manualSensitivityThreshold}%` }}
                title={`Limiar de Sensibilidade: ${manualSensitivityThreshold}%`}
              >
                <div className="w-2.5 h-2.5 bg-amber-400 rotate-45 -translate-x-1/3 -translate-y-1/3 rounded-xs" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Seção de Ajuste de Sensibilidade (Noise Gate) */}
      <div className="bg-[#12151d]/70 rounded-2xl p-4 border border-[#2a3142] space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-200">Sensibilidade de Entrada (Noise Gate)</span>
            <p className="text-[11px] text-slate-400">
              Determina o volume mínimo para o microfone abrir e transmitir sua voz
            </p>
          </div>

          {/* Mode Switcher: Auto vs Manual */}
          <div className="flex bg-[#1b202c] p-1 rounded-xl border border-[#2a3142]">
            <button
              type="button"
              onClick={() => handleSensitivityModeToggle('auto')}
              className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all ${
                sensitivityMode === 'auto'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Automático
            </button>
            <button
              type="button"
              onClick={() => handleSensitivityModeToggle('manual')}
              className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all ${
                sensitivityMode === 'manual'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Manual
            </button>
          </div>
        </div>

        {sensitivityMode === 'manual' ? (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[11px] text-slate-300">
              <span>Limiar de Ativação Manual</span>
              <span className="font-bold text-amber-400">{manualSensitivityThreshold}%</span>
            </div>
            <input
              type="range"
              min={1}
              max={100}
              value={manualSensitivityThreshold}
              onChange={(e) => handleThresholdChange(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
            />
            <p className="text-[10px] text-slate-500">
              Ajuste a barra para que o ruído de fundo fique à esquerda do marcador amarelo e sua voz normal fique à direita.
            </p>
          </div>
        ) : (
          <div className="text-[11px] text-emerald-300/90 bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              O sistema detecta dinamicamente os barulhos da sua sala e calibra a sensibilidade automaticamente.
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
