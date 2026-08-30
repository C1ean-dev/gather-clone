import React, { useState, useEffect, useRef } from 'react'
import { Shield, Sparkles, Mic, RotateCw, Check } from 'lucide-react'
import { useMediaStore } from '../../store/useMediaStore'
import { MediaManager } from '../../media/MediaManager'
import { AudioProcessorMode } from '../../types/audio'

export const AdvancedAudioTab: React.FC = () => {
  const {
    echoCancellation,
    autoGainControl,
    isNoiseSuppressionEnabled,
    screenShareAudioVolume,
    duckingEnabled,
    audioProcessorMode,
    selectedAudioInput,
    micCalibrations,
    isCalibrating,
    hasUserChosenProcessorMode,
    manualSensitivityThreshold,
    sensitivityMode,
    setEchoCancellation,
    setAutoGainControl,
    toggleNoiseSuppression,
    setScreenShareAudioVolume,
    setDuckingEnabled,
    setAudioProcessorMode,
    setManualSensitivityThreshold,
    setIsCalibrating,
    clearMicCalibration,
  } = useMediaStore()

  // Local UI state for the calibration wizard.
  const [calProgress, setCalProgress] = useState(0) // 0..1
  const [calSecondsLeft, setCalSecondsLeft] = useState(0)
  const [lastCalibration, setLastCalibration] = useState<{
    noiseFloorDb: number
    snrDb: number
    recommendedMode: AudioProcessorMode
    recommendedSensitivity: number
  } | null>(null)
  const lastTickRef = useRef(0)

  const currentCalibration = micCalibrations[selectedAudioInput] || null

  const handleCalibrate = async () => {
    const mgr = MediaManager.getInstance()
    // Grab the raw mic stream directly so we measure the actual environment,
    // not the post-processed output.
    let rawStream: MediaStream
    try {
      rawStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId:
            selectedAudioInput && selectedAudioInput !== 'default'
              ? { exact: selectedAudioInput }
              : undefined,
          echoCancellation: false,
          autoGainControl: false,
          noiseSuppression: false,
        },
        video: false,
      })
    } catch (err) {
      console.warn('[calibration] failed to open raw mic:', err)
      setIsCalibrating(false)
      return
    }

    setCalProgress(0)
    setCalSecondsLeft(5)
    lastTickRef.current = performance.now()

    try {
      const result = await mgr.calibrateMicrophone(rawStream, 5000, (elapsedMs) => {
        const elapsedSec = elapsedMs / 1000
        setCalProgress(Math.min(1, elapsedSec / 5))
        setCalSecondsLeft(Math.max(0, 5 - Math.ceil(elapsedSec)))
      })
      setLastCalibration({
        noiseFloorDb: result.noiseFloorDb,
        snrDb: result.snrDb,
        recommendedMode: result.recommendedMode,
        recommendedSensitivity: result.recommendedSensitivity,
      })
      setCalProgress(1)
      setCalSecondsLeft(0)
    } catch (err) {
      console.warn('[calibration] failed:', err)
    } finally {
      rawStream.getTracks().forEach((t) => t.stop())
    }
  }

  const handleResetCalibration = () => {
    clearMicCalibration(selectedAudioInput)
    setLastCalibration(null)
  }

  // Drop the local "lastCalibration" highlight a few seconds after the run.
  useEffect(() => {
    if (!lastCalibration) return
    const id = window.setTimeout(() => setLastCalibration(null), 6000)
    return () => window.clearTimeout(id)
  }, [lastCalibration])

  // Label describing what's currently in effect (manual vs auto).
  const engineLabel = hasUserChosenProcessorMode
    ? 'Escolha manual'
    : currentCalibration
      ? 'Calibrado automaticamente'
      : 'Padrão'

  const handleScreenVolumeChange = (vol: number) => {
    setScreenShareAudioVolume(vol)
    MediaManager.getInstance().updateScreenShareAudioVolume(vol)
  }

  const engineModeLabel = (mode: AudioProcessorMode): string => {
    if (mode === 'rnnoise') return 'RNNoise Neural'
    if (mode === 'soft') return 'DSP Suave'
    return 'DSP Clássico'
  }

  /**
   * Single-line "Label: current_value [Aplicar]" row. The button is only
   * shown when the suggestion isn't already in effect, so it never feels
   * like a no-op. Clicking applies the suggestion with one click.
   */
  const SuggestedActionRow: React.FC<{
    label: string
    current: React.ReactNode
    active: boolean
    onApply: () => void
    applyLabel: string
  }> = ({ label, current, active, onApply, applyLabel }) => (
    <div className="flex items-center gap-2 text-[10.5px]">
      <span className="text-slate-400 shrink-0">{label}</span>
      <span className="flex-1 truncate">{current}</span>
      {active ? (
        <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
          Aplicado
        </span>
      ) : (
        <button
          type="button"
          onClick={onApply}
          className="px-2 py-0.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-[9.5px] font-bold uppercase tracking-wide transition-colors active:scale-95"
        >
          {applyLabel}
        </button>
      )}
    </div>
  )

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

        {/* Calibration Wizard */}
        <div className="space-y-2 pb-3 border-b border-[#2a3142]">
          <div className="flex items-center gap-1.5">
            <Mic className="w-3.5 h-3.5 text-emerald-400" />
            <div className="text-xs font-semibold text-slate-200">
              Calibração Automática de Microfone
            </div>
            <span
              className={`ml-auto text-[9.5px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${
                hasUserChosenProcessorMode
                  ? 'bg-slate-700 text-slate-300'
                  : currentCalibration
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-slate-800 text-slate-400'
              }`}
              title="Origem do motor ativo"
            >
              {engineLabel}
            </span>
          </div>
          <div className="text-[10px] text-slate-400 leading-snug">
            Fique em silêncio por 3 segundos. Medimos o ruído ambiente e
            escolhemos o melhor motor automaticamente. Você pode sobrescrever
            manualmente abaixo a qualquer momento.
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isCalibrating}
              onClick={handleCalibrate}
              className={`flex-1 px-3 py-2 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                isCalibrating
                  ? 'bg-slate-800 text-slate-400 cursor-wait'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-600/20 active:scale-95'
              }`}
            >
              {isCalibrating ? (
                <>
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Medindo... {calSecondsLeft}s</span>
                </>
              ) : currentCalibration ? (
                <>
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Recalibrar</span>
                </>
              ) : (
                <>
                  <Mic className="w-3.5 h-3.5" />
                  <span>Calibrar Microfone</span>
                </>
              )}
            </button>
            {currentCalibration && !isCalibrating && (
              <button
                type="button"
                onClick={handleResetCalibration}
                className="px-2 py-2 rounded-xl text-[10px] text-slate-400 hover:text-slate-200 hover:bg-[#2b2d31]"
                title="Limpar calibração deste microfone"
              >
                Limpar
              </button>
            )}
          </div>

          {/* Progress bar */}
          {isCalibrating && (
            <div className="h-1 bg-[#1b202c] rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{ width: `${Math.round(calProgress * 100)}%` }}
              />
            </div>
          )}

          {/* Calibration summary + 1-click apply */}
          {(currentCalibration || lastCalibration) && (
            <div className="text-[10px] text-slate-300 bg-[#1b202c] rounded-xl p-2 border border-[#2a3142] leading-snug space-y-2">
              <div className="flex items-center gap-1 text-emerald-300 font-bold">
                <Check className="w-3 h-3" />
                <span>Resultado da calibração</span>
              </div>

              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 font-mono">
                <span className="text-slate-400">Ruído ambiente:</span>
                <span>
                  {(
                    lastCalibration?.noiseFloorDb ??
                    currentCalibration?.noiseFloorDb ??
                    0
                  ).toFixed(1)}{' '}
                  dBFS
                </span>
                <span className="text-slate-400">SNR estimado:</span>
                <span>
                  {(
                    lastCalibration?.snrDb ?? currentCalibration?.snrDb ?? 0
                  ).toFixed(1)}{' '}
                  dB
                </span>
              </div>

              {/* Suggested engine with 1-click apply */}
              <SuggestedActionRow
                label="Motor sugerido:"
                current={
                  <span className="font-bold text-indigo-300">
                    {engineModeLabel(
                      lastCalibration?.recommendedMode ??
                        currentCalibration?.recommendedMode ??
                        'classic'
                    )}
                  </span>
                }
                active={audioProcessorMode === (lastCalibration?.recommendedMode ?? currentCalibration?.recommendedMode ?? 'classic')}
                onApply={async () => {
                  const mode =
                    lastCalibration?.recommendedMode ??
                    currentCalibration?.recommendedMode ??
                    'classic'
                  if (audioProcessorMode === mode) return
                  setAudioProcessorMode(mode)
                  await MediaManager.getInstance().reprocessStream()
                }}
                applyLabel="Aplicar motor"
              />

              {/* Suggested sensitivity with 1-click apply */}
              <SuggestedActionRow
                label="Sensibilidade:"
                current={
                  <span className="font-mono">
                    {lastCalibration?.recommendedSensitivity ??
                      currentCalibration?.recommendedSensitivity ??
                      20}
                    %
                  </span>
                }
                active={
                  manualSensitivityThreshold ===
                  (lastCalibration?.recommendedSensitivity ??
                    currentCalibration?.recommendedSensitivity ??
                    20)
                }
                onApply={() => {
                  const sens =
                    lastCalibration?.recommendedSensitivity ??
                    currentCalibration?.recommendedSensitivity ??
                    20
                  setManualSensitivityThreshold(sens)
                  MediaManager.getInstance().updateSensitivity(
                    sensitivityMode,
                    sens
                  )
                }}
                applyLabel="Aplicar sensibilidade"
              />
            </div>
          )}
        </div>

        {/* Engine Selector: Classic / Soft DSP / RNNoise (neural) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Motor de Supressão de Ruído</span>
              </div>
              <div className="text-[10px] text-slate-400">
                Escolha entre DSP clássico, DSP suave (sem cortes duros) e
                rede neural RNNoise
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {(
              [
                {
                  id: 'classic',
                  title: 'DSP Clássico',
                  desc: 'Corte agressivo. Baixo CPU.',
                },
                {
                  id: 'soft',
                  title: 'DSP Suave',
                  desc: 'Preserva consoantes e sílabas.',
                },
                {
                  id: 'rnnoise',
                  title: 'RNNoise Neural',
                  desc: 'IA treinada (Xiph). Melhor qualidade.',
                },
              ] as Array<{ id: AudioProcessorMode; title: string; desc: string }>
            ).map((opt) => {
              const selected = audioProcessorMode === opt.id
              const isAutoSuggested =
                selected &&
                !hasUserChosenProcessorMode &&
                !!currentCalibration
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={async () => {
                    if (audioProcessorMode === opt.id) return
                    setAudioProcessorMode(opt.id)
                    await MediaManager.getInstance().reprocessStream()
                  }}
                  className={`text-left p-2 rounded-xl border transition-colors ${
                    selected
                      ? isAutoSuggested
                        ? 'border-emerald-500/70 bg-emerald-500/10'
                        : 'border-indigo-500 bg-indigo-500/15'
                      : 'border-[#2a3142] bg-[#1b202c] hover:border-indigo-400/60'
                  }`}
                >
                  <div
                    className={`text-[11px] font-bold flex items-center gap-1 ${
                      isAutoSuggested
                        ? 'text-emerald-200'
                        : selected
                          ? 'text-indigo-200'
                          : 'text-slate-200'
                    }`}
                  >
                    {opt.title}
                    {isAutoSuggested && (
                      <span
                        className="text-[8px] font-bold uppercase tracking-wide px-1 py-0.5 rounded bg-emerald-500/30 text-emerald-200"
                        title="Escolhido pela calibração"
                      >
                        Auto
                      </span>
                    )}
                  </div>
                  <div className="text-[9.5px] text-slate-400 mt-0.5 leading-tight">
                    {opt.desc}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Supressor de Ruído */}
        <div className="flex items-center justify-between py-1 border-t border-[#2a3142] pt-3 mt-1">
          <div>
            <div className="text-xs font-semibold text-slate-200">Supressor de Ruído DSP</div>
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
