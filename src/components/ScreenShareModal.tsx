import React, { useState, useEffect } from 'react'
import {
  Monitor,
  AppWindow,
  X,
  Check,
  ScreenShare,
  Volume2,
  Sliders,
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
  const [selectedAudioSourceId, setSelectedAudioSourceId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'screen' | 'window'>('screen')
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // No navegador (sem Electron) não há desktopCapturer — a lista de
  // miniaturas não existe e o caminho correto é o seletor nativo.
  const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI?.getSources

  // Source-only audio is mandatory. It is never a user-selectable mode.
  const includeAudio = true
  const [resolution, setResolution] = useState<'480p' | '720p' | '1080p'>('1080p')
  const [fps, setFps] = useState<30 | 60>(30)

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
          const firstScreen = items.find((item) => item.id.startsWith('screen:'))
          setSelectedSourceId((prev) => prev ?? firstScreen?.id ?? items[0].id)
        }
      } catch (err) {
        console.error('Failed to get desktop sources:', err)
        setFetchError('Não foi possível listar telas e janelas automaticamente. Tente recarregar a lista.')
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
  const isSharingWholeScreen = selectedSource?.id.startsWith('screen:')
  const effectiveAudioSourceId = isSharingWholeScreen ? selectedSourceId : (selectedAudioSourceId || selectedSourceId)
  const selectedAudioSource = windows.find((source) => source.id === effectiveAudioSourceId)

  const handleConfirm = async () => {
    if (isElectron && !effectiveAudioSourceId) return
    const config: ScreenShareConfig = {
      sourceId: selectedSourceId || undefined,
      sourceName: selectedSource?.name,
      audioSourceId: effectiveAudioSourceId || undefined,
      includeAudio,
      resolution,
      fps,
    }
    await MediaManager.getInstance().startScreenShare(config)
    onClose()
  }

  const handleNativePicker = async () => {
    const config: ScreenShareConfig = {
      sourceId: undefined, // Browser-only native picker
      sourceName: undefined,
      includeAudio,
      resolution,
      fps,
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
                Transmita somente o áudio do aplicativo escolhido, sem vazar o som das demais janelas
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
              {!isElectron && (
                <button
                  type="button"
                  onClick={handleNativePicker}
                  className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 underline"
                >
                  <span>Usar Seletor do Sistema / Navegador</span>
                </button>
              )}
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
                  {!isElectron && (
                    <button
                      type="button"
                      onClick={handleNativePicker}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md transition-all inline-flex items-center gap-2"
                    >
                      <ScreenShare className="w-4 h-4" />
                      Usar Seletor do Sistema
                    </button>
                  )}
                </div>
              </div>
            ) : currentList.length === 0 ? (
              <div className="p-6 text-center bg-[#12151d]/50 rounded-2xl border border-[#2a3142] space-y-3">
                <p className="text-xs text-slate-300">
                  {isElectron
                    ? 'Nenhuma fonte foi encontrada. Recarregue a lista para manter o áudio isolado da fonte selecionada.'
                    : 'Nenhuma miniatura capturada automaticamente. Você pode usar o seletor nativo do sistema com 1 clique!'}
                </p>
                {!isElectron && (
                  <button
                    type="button"
                    onClick={handleNativePicker}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md transition-all inline-flex items-center gap-2"
                  >
                    <ScreenShare className="w-4 h-4" />
                    Abrir Seletor de Telas do Sistema
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-52 overflow-y-auto p-1">
                {currentList.map((source) => {
                  const isSelected = selectedSourceId === source.id
                  return (
                    <button
                      key={source.id}
                      onClick={() => {
                        setSelectedSourceId(source.id)
                        if (source.id.startsWith('window:')) {
                          setSelectedAudioSourceId(source.id)
                        }
                      }}
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

          {isElectron && isSharingWholeScreen && (
            <div className="space-y-1.5 rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-200">
                <Volume2 className="h-4 w-4 text-emerald-400" />
                Áudio Dinâmico por Monitor Ativo
              </div>
              <p className="text-[11px] leading-relaxed text-slate-300">
                Todos os aplicativos nesta tela serão ouvidos na live. Se você mover uma janela (ex: Spotify, YouTube ou jogo) para outro monitor, o som dela é silenciado imediatamente; ao retornar à tela, volta a reproduzir.
              </p>
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

            {/* Mandatory source-only audio policy */}
            <div className="pt-2 border-t border-[#2a3142]/60 space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center border bg-emerald-500/20 border-emerald-500/40 text-emerald-400">
                    <Volume2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-200">Áudio isolado da fonte — sempre ativo</div>
                    <div className="text-[10px] text-slate-400">
                      {isElectron
                        ? isSharingWholeScreen
                          ? 'Captura dinâmica do monitor selecionado; aplicativos em outros monitores ficam bloqueados.'
                          : `Captura apenas ${selectedAudioSource?.name || 'a janela escolhida'}; o áudio global do Windows fica bloqueado.`
                        : 'O seletor do navegador envia apenas o áudio da guia ou janela escolhida.'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-[#1b202c] p-3.5 rounded-xl border border-[#2a3142] space-y-3">
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

                <div className="p-2.5 rounded-xl bg-emerald-950/25 border border-emerald-500/30 flex items-center gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold text-emerald-300">
                        Áudio exclusivo da fonte selecionada
                      </div>
                      <div className="text-[9px] text-slate-400 leading-tight">
                        Outros aplicativos não entram na live. Seu microfone continua ativo na chamada, em uma entrada separada.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#2a3142] bg-[#12151d]/90 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            Transmissão: <strong className="text-indigo-400">{resolution} @ {fps} FPS</strong>
            <span className="text-slate-300"> • Som exclusivo da fonte</span>
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
              disabled={!selectedSourceId}
              className="px-6 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 text-white shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all active:scale-98"
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

