import React, { useState, useEffect } from 'react'
import {
  Monitor,
  AppWindow,
  X,
  Check,
  ScreenShare,
  Volume2,
  VolumeX,
  Sliders,
  Sparkles,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react'
import { MediaManager, ScreenShareConfig } from '../media/MediaManager'
import { useMediaStore } from '../store/useMediaStore'

interface DesktopSource {
  id: string
  name: string
  thumbnail: string
  appIcon?: string | null
}

interface Props {
  isOpen: boolean
  onClose: () => void
}

export const ScreenShareModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [sources, setSources] = useState<DesktopSource[]>([])
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'screen' | 'window'>('screen')
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // No navegador (sem Electron) não há desktopCapturer — a lista de
  // miniaturas não existe e o caminho correto é o seletor nativo.
  const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI?.getSources

  // Quality & Audio Options: 480p, 720p, 1080p and 30, 60 FPS
  const [includeAudio, setIncludeAudio] = useState(true)
  const [resolution, setResolution] = useState<'480p' | '720p' | '1080p'>('1080p')
  const [fps, setFps] = useState<30 | 60>(30)
  // user microphone is mixed with screen audio so participants hear both screen and voice
  const mixMicrophone = true
  // Isolates incoming remote peer call audio from the screen share live stream
  const [isolateCallAudio, setIsolateCallAudio] = useState(
    () => useMediaStore.getState().screenShareIsolateCallAudio
  )

  const fetchSources = async () => {
    setLoading(true)
    setFetchError(null)
    const electronAPI = (window as any).electronAPI
    if (electronAPI && electronAPI.getSources) {
      try {
        // Race contra o IPC: o desktopCapturer pode TRAVAR (não só falhar)
        // em alguns drivers/GPUs — sem timeout o modal gira para sempre.
        const items = (await Promise.race([
          electronAPI.getSources(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Tempo esgotado ao listar telas')), 9000)
          ),
        ])) as DesktopSource[]
        setSources(items || [])
        if (items && items.length > 0) {
          setSelectedSourceId((prev) => prev ?? items[0].id)
        }
      } catch (err) {
        console.error('Failed to get desktop sources:', err)
        setFetchError('Não foi possível listar telas e janelas automaticamente. Tente recarregar ou use o seletor do sistema.')
      }
    }
    setLoading(false)
  }

  useEffect(() => {
    if (!isOpen) return
    fetchSources()
  }, [isOpen])

  if (!isOpen) return null

  const screens = sources.filter((s) => s.id.startsWith('screen:'))
  const windows = sources.filter((s) => s.id.startsWith('window:'))

  const currentList = activeTab === 'screen' ? (screens.length > 0 ? screens : sources) : windows
  const selectedSource = sources.find((s) => s.id === selectedSourceId)

  const handleConfirm = async () => {
    const config: ScreenShareConfig = {
      sourceId: selectedSourceId || undefined,
      sourceName: selectedSource?.name,
      includeAudio,
      resolution,
      fps,
      mixMicrophone,
      isolateCallAudio,
    }
    await MediaManager.getInstance().startScreenShare(config)
    onClose()
  }

  const handleNativePicker = async () => {
    const config: ScreenShareConfig = {
      sourceId: undefined, // Forces native system/browser window picker
      sourceName: undefined,
      includeAudio,
      resolution,
      fps,
      mixMicrophone,
      isolateCallAudio,
    }
    await MediaManager.getInstance().startScreenShare(config)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200 select-none">
      <div className="bg-[#1b202c] border border-[#2a3142] rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a3142] bg-[#12151d]/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <ScreenShare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Compartilhar Tela & Áudio</h2>
              <p className="text-xs text-slate-400">
                Transmita som de alta fidelidade da sua aplicação ou vídeo sem eco de outras chamadas
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchSources}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              title="Recarregar Janelas"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex gap-2 px-6 pt-3 border-b border-[#2a3142] bg-[#12151d]/40">
          <button
            onClick={() => setActiveTab('screen')}
            className={`flex items-center gap-2 pb-3 px-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'screen'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Monitor className="w-4 h-4" />
            Telas Inteiras ({screens.length || 1})
          </button>
          <button
            onClick={() => setActiveTab('window')}
            className={`flex items-center gap-2 pb-3 px-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'window'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <AppWindow className="w-4 h-4" />
            Janelas de Aplicativos ({windows.length})
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* Source Thumbnails Grid */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-300">
                {activeTab === 'screen' ? 'Selecione o Monitor' : 'Selecione a Janela do Aplicativo (ex: Chrome)'}
              </span>
              <button
                type="button"
                onClick={handleNativePicker}
                className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 underline"
              >
                <span>Usar Seletor do Sistema / Navegador</span>
              </button>
            </div>

            {loading ? (
              <div className="text-center py-10 text-sm text-slate-400">Detectando telas disponíveis...</div>
            ) : !isElectron ? (
              <div className="p-6 text-center bg-[#12151d]/50 rounded-2xl border border-[#2a3142] space-y-3">
                <p className="text-xs text-slate-300">
                  Você está no navegador: a lista de miniaturas só existe no app desktop. Use o seletor
                  nativo do sistema para escolher a tela ou janela.
                </p>
                <button
                  type="button"
                  onClick={handleNativePicker}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md transition-all inline-flex items-center gap-2"
                >
                  <ScreenShare className="w-4 h-4" />
                  Abrir Seletor de Telas do Sistema
                </button>
              </div>
            ) : fetchError ? (
              <div className="p-6 text-center bg-rose-950/30 rounded-2xl border border-rose-500/30 space-y-3">
                <p className="text-xs text-rose-200">{fetchError}</p>
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={fetchSources}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all inline-flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Tentar Novamente
                  </button>
                  <button
                    type="button"
                    onClick={handleNativePicker}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md transition-all inline-flex items-center gap-2"
                  >
                    <ScreenShare className="w-4 h-4" />
                    Usar Seletor do Sistema
                  </button>
                </div>
              </div>
            ) : currentList.length === 0 ? (
              <div className="p-6 text-center bg-[#12151d]/50 rounded-2xl border border-[#2a3142] space-y-3">
                <p className="text-xs text-slate-300">
                  Nenhuma miniatura capturada automaticamente. Você pode usar o seletor nativo do sistema com 1 clique!
                </p>
                <button
                  type="button"
                  onClick={handleNativePicker}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md transition-all inline-flex items-center gap-2"
                >
                  <ScreenShare className="w-4 h-4" />
                  Abrir Seletor de Telas do Sistema
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-52 overflow-y-auto p-1">
                {currentList.map((source) => {
                  const isSelected = selectedSourceId === source.id
                  return (
                    <button
                      key={source.id}
                      onClick={() => setSelectedSourceId(source.id)}
                      className={`flex flex-col rounded-2xl border overflow-hidden text-left transition-all group ${
                        isSelected
                          ? 'border-indigo-500 ring-2 ring-indigo-500/40 bg-indigo-500/10 shadow-lg'
                          : 'border-[#2a3142] bg-[#12151d]/60 hover:border-slate-600'
                      }`}
                    >
                      {/* Thumbnail Image or Monitor/Window Icon Fallback */}
                      <div className="h-28 bg-black/60 overflow-hidden flex items-center justify-center p-2 relative">
                        {source.thumbnail && source.thumbnail.length > 30 ? (
                          <img
                            src={source.thumbnail}
                            alt={source.name}
                            className="w-full h-full object-contain rounded-lg"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                            {source.id.startsWith('screen:') ? (
                              <Monitor className="w-10 h-10 text-indigo-400/80" />
                            ) : (
                              <AppWindow className="w-10 h-10 text-indigo-400/80" />
                            )}
                            <span className="text-[10px] text-slate-400 font-medium text-center px-1 truncate max-w-[150px]">
                              {source.name}
                            </span>
                          </div>
                        )}
                        {source.appIcon && (
                          <img
                            src={source.appIcon}
                            alt="App Icon"
                            className="absolute bottom-1.5 right-1.5 w-4 h-4 rounded shadow bg-black/50 p-0.5"
                          />
                        )}
                      </div>

                      {/* Label */}
                      <div className="p-2.5 bg-[#1b202c] border-t border-[#2a3142] flex items-center justify-between gap-1.5">
                        <span className="text-[11px] font-medium text-slate-200 truncate">{source.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Selected Target Feedback */}
          {selectedSource && (
            <div className="flex items-center gap-2 px-3.5 py-2 bg-indigo-950/30 border border-indigo-500/30 rounded-xl text-xs text-indigo-200">
              <AppWindow className="w-4 h-4 text-indigo-400 shrink-0" />
              <span className="truncate">
                Transmitindo: <strong className="text-indigo-300">{selectedSource.name}</strong>
              </span>
            </div>
          )}

          {/* Settings Section: Resolution, FPS and Sound */}
          <div className="bg-[#12151d]/60 rounded-2xl p-4 border border-[#2a3142] space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
              <Sliders className="w-4 h-4 text-indigo-400" />
              <span>Qualidade & Taxa de Quadros</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Resolution Options: 480p, 720p, 1080p */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">Resolução de Vídeo</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: '480p', label: '480p SD', desc: 'Leve' },
                    { id: '720p', label: '720p HD', desc: 'Equilibrado' },
                    { id: '1080p', label: '1080p FHD', desc: 'Nítido' },
                  ].map((res) => (
                    <button
                      key={res.id}
                      type="button"
                      onClick={() => setResolution(res.id as any)}
                      className={`py-2 px-2 rounded-xl text-center border transition-all ${
                        resolution === res.id
                          ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300 shadow-md ring-1 ring-indigo-500/30'
                          : 'border-[#2a3142] bg-[#1b202c] text-slate-400 hover:text-slate-200 hover:border-slate-600'
                      }`}
                    >
                      <div className="text-xs font-bold">{res.label}</div>
                      <div className="text-[9px] opacity-70">{res.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Frame Rate (FPS) Options: 30, 60 */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">Taxa de Quadros (FPS)</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 30, label: '30 FPS', desc: 'Padrão (Trabalho)' },
                    { id: 60, label: '60 FPS', desc: 'Ultra Fluido (Vídeo / Jogos)' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFps(f.id as any)}
                      className={`py-2 px-2 rounded-xl text-center border transition-all ${
                        fps === f.id
                          ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300 shadow-md ring-1 ring-indigo-500/30'
                          : 'border-[#2a3142] bg-[#1b202c] text-slate-400 hover:text-slate-200 hover:border-slate-600'
                      }`}
                    >
                      <div className="text-xs font-bold">{f.label}</div>
                      <div className="text-[9px] opacity-70">{f.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Audio Toggle Switch & Anti-Echo Volume Slider */}
            <div className="pt-2 border-t border-[#2a3142]/60 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                      includeAudio
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    {includeAudio ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-200">Transmitir Áudio da Janela / Sistema</div>
                    <div className="text-[10px] text-slate-400">
                      Transmite o som do vídeo, navegador (Chrome) ou aplicativo com fidelidade 48kHz
                    </div>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeAudio}
                    onChange={(e) => setIncludeAudio(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {includeAudio && (
                <div className="bg-[#1b202c] p-3.5 rounded-xl border border-[#2a3142] space-y-3 animate-in fade-in duration-150">
                  {/* Volume Slider */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-300">
                      <span>Volume da Transmissão</span>
                      <span className="font-bold text-indigo-400">{useMediaStore.getState().screenShareAudioVolume}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={useMediaStore.getState().screenShareAudioVolume}
                      onChange={(e) => {
                        const val = Number(e.target.value)
                        useMediaStore.getState().setScreenShareAudioVolume(val)
                        MediaManager.getInstance().updateScreenShareAudioVolume(val)
                      }}
                      className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>


                  {/* Call Audio Isolation (Anti-Bleed) Shield Card */}
                  <div className="p-2.5 rounded-xl bg-emerald-950/25 border border-emerald-500/30 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-[11px] font-semibold text-emerald-300">
                          Isolamento Ativo de Vozes da Chamada
                        </div>
                        <div className="text-[9px] text-slate-400 leading-tight">
                          Bloqueia as vozes dos outros participantes da reunião para que apenas o som do app saia na live.
                        </div>
                      </div>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={isolateCallAudio}
                        onChange={(e) => {
                          const checked = e.target.checked
                          setIsolateCallAudio(checked)
                          useMediaStore.getState().setScreenShareIsolateCallAudio(checked)
                          MediaManager.getInstance().setScreenShareIsolateCallAudio(checked)
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>

                  {mixMicrophone && (
                    <div className="text-[10px] text-indigo-400 flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 shrink-0" />
                      <span>Ducking inteligente ativo: o som do app diminui quando você fala.</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#2a3142] bg-[#12151d]/90 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            Transmissão: <strong className="text-indigo-400">{resolution} @ {fps} FPS</strong>
            {includeAudio && (
              <span className="text-slate-300">
                {' • '}
                Aplicação + sua voz
                {isolateCallAudio ? ' (Anti-vazamento ativo)' : ''}
              </span>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              className="px-6 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all active:scale-98"
            >
              <ScreenShare className="w-4 h-4" />
              Iniciar Apresentação
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

