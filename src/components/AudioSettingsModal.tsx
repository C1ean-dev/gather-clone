import React, { useState, useEffect } from 'react'
import {
  X,
  Mic,
  Volume2,
  VolumeX,
  Headphones,
  Sliders,
  Sparkles,
  Shield,
  Radio,
  Play,
  RotateCcw,
  CheckCircle2,
  Activity,
  AlertCircle,
  HelpCircle,
  Zap,
  Gauge,
  Monitor,
  Eye,
  FastForward,
} from 'lucide-react'
import { useMediaStore } from '../store/useMediaStore'
import { useSettingsStore } from '../store/useSettingsStore'
import { MediaManager } from '../media/MediaManager'
import { AudioDeviceInfo, SensitivityMode } from '../types/audio'

export const AudioSettingsModal: React.FC = () => {
  const {
    isSettingsModalOpen,
    setSettingsModalOpen,
    selectedAudioInput,
    selectedAudioOutput,
    inputVolume,
    outputVolume,
    sensitivityMode,
    manualSensitivityThreshold,
    echoCancellation,
    autoGainControl,
    isNoiseSuppressionEnabled,
    screenShareAudioVolume,
    duckingEnabled,
    localAudioLevel,
    isGateOpen,
    isTestingMic,
    setSelectedAudioInput,
    setSelectedAudioOutput,
    setInputVolume,
    setOutputVolume,
    setSensitivityMode,
    setManualSensitivityThreshold,
    setEchoCancellation,
    setAutoGainControl,
    toggleNoiseSuppression,
    setScreenShareAudioVolume,
    setDuckingEnabled,
  } = useMediaStore()

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

  const [inputDevices, setInputDevices] = useState<AudioDeviceInfo[]>([])
  const [outputDevices, setOutputDevices] = useState<AudioDeviceInfo[]>([])
  const [activeTab, setActiveTab] = useState<'graphics' | 'devices' | 'advanced'>('graphics')
  const [isPlayingTestSound, setIsPlayingTestSound] = useState(false)

  // Enumerate all media devices
  const refreshDevices = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return

      const devices = await navigator.mediaDevices.enumerateDevices()

      const inputs: AudioDeviceInfo[] = devices
        .filter((d) => d.kind === 'audioinput')
        .map((d, idx) => ({
          deviceId: d.deviceId,
          label: d.label || `Microfone ${idx + 1}`,
          groupId: d.groupId,
        }))

      const outputs: AudioDeviceInfo[] = devices
        .filter((d) => d.kind === 'audiooutput')
        .map((d, idx) => ({
          deviceId: d.deviceId,
          label: d.label || `Alto-Falante/Fone ${idx + 1}`,
          groupId: d.groupId,
        }))

      setInputDevices(inputs)
      setOutputDevices(outputs)
    } catch (err) {
      console.warn('Could not enumerate audio devices:', err)
    }
  }

  useEffect(() => {
    if (isSettingsModalOpen) {
      refreshDevices()
      if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
        navigator.mediaDevices.addEventListener('devicechange', refreshDevices)
        return () => {
          navigator.mediaDevices.removeEventListener('devicechange', refreshDevices)
        }
      }
    } else {
      // Auto-stop mic test if modal is closed
      if (isTestingMic) {
        MediaManager.getInstance().setTestMic(false)
      }
    }
  }, [isSettingsModalOpen, isTestingMic])

  if (!isSettingsModalOpen) return null

  const handleClose = () => {
    if (isTestingMic) {
      MediaManager.getInstance().setTestMic(false)
    }
    setSettingsModalOpen(false)
  }

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
    // Adjust volume of all audio/video elements
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

  const handlePlayTestSound = () => {
    setIsPlayingTestSound(true)
    MediaManager.getInstance().playAudioTestBeep()
    setTimeout(() => setIsPlayingTestSound(false), 800)
  }

  const handleScreenVolumeChange = (vol: number) => {
    setScreenShareAudioVolume(vol)
    MediaManager.getInstance().updateScreenShareAudioVolume(vol)
  }

  if (!isSettingsModalOpen) return null

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200 select-none">
      <div className="bg-[#1b202c] border border-[#2a3142] rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a3142] bg-[#12151d]/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Configurações do Espaço</h2>
              <p className="text-xs text-slate-400">
                Taxa de FPS, Desempenho Gráfico, Voz & Microfone
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex gap-2 px-6 pt-3 border-b border-[#2a3142] bg-[#12151d]/40">
          <button
            onClick={() => setActiveTab('graphics')}
            className={`flex items-center gap-2 pb-3 px-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'graphics'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-4 h-4" />
            ⚡ Desempenho & FPS
          </button>
          <button
            onClick={() => setActiveTab('devices')}
            className={`flex items-center gap-2 pb-3 px-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'devices'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Mic className="w-4 h-4" />
            🎙️ Áudio & Microfone
          </button>
          <button
            onClick={() => setActiveTab('advanced')}
            className={`flex items-center gap-2 pb-3 px-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'advanced'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            ⚙️ Anti-Eco & Sistema
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'graphics' && (
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
          )}

          {activeTab === 'devices' && (
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
                      onClick={handlePlayTestSound}
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
          )}

          {activeTab === 'advanced' && (
            <div className="space-y-6">
              {/* ABA AVANÇADA / ANTI-ECO & COMPARTILHAMENTO */}
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
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#2a3142] bg-[#12151d]/90 flex items-center justify-between">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Configurações salvas automaticamente no seu dispositivo</span>
          </div>

          <button
            onClick={handleClose}
            className="px-6 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all active:scale-98"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  )
}
