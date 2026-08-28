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

  // Quality & Audio Options: 480p, 720p, 1080p and 30, 60 FPS
  const [includeAudio, setIncludeAudio] = useState(true)
  const [resolution, setResolution] = useState<'480p' | '720p' | '1080p'>('1080p')
  const [fps, setFps] = useState<30 | 60>(30)

  const fetchSources = async () => {
    setLoading(true)
    const electronAPI = (window as any).electronAPI
    if (electronAPI && electronAPI.getSources) {
      try {
        const items = await electronAPI.getSources()
        setSources(items || [])
        if (items && items.length > 0) {
          setSelectedSourceId(items[0].id)
        }
      } catch (err) {
        console.error('Failed to get desktop sources:', err)
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

  const handleConfirm = async () => {
    const config: ScreenShareConfig = {
      sourceId: selectedSourceId || undefined,
      includeAudio,
      resolution,
      fps,
    }
    await MediaManager.getInstance().startScreenShare(config)
    onClose()
  }

  const handleNativePicker = async () => {
    const config: ScreenShareConfig = {
      sourceId: undefined, // Forces native system/browser window picker
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
                Selecione a tela ou janela, e defina a resolução (480p, 720p, 1080p), FPS (30, 60) e áudio
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
                {activeTab === 'screen' ? 'Selecione o Monitor' : 'Selecione a Janela do Aplicativo'}
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
                      {/* Thumbnail Image */}
                      <div className="h-28 bg-black/50 overflow-hidden flex items-center justify-center p-1.5">
                        <img
                          src={source.thumbnail}
                          alt={source.name}
                          className="w-full h-full object-contain rounded-lg"
                        />
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
                    { id: 60, label: '60 FPS', desc: 'Ultra Fluido (Jogos)' },
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
                    <div className="text-xs font-semibold text-slate-200">Transmitir Áudio do Sistema / Aplicativo</div>
                    <div className="text-[10px] text-slate-400">
                      Seus amigos ouvirão o som transmitido junto com seu microfone
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
                <div className="bg-[#1b202c] p-3 rounded-xl border border-[#2a3142] space-y-2 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between text-[11px] text-slate-300">
                    <span>Volume do Áudio Transmitido</span>
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
                  <div className="text-[10px] text-emerald-400 flex items-center gap-1.5 pt-1">
                    <Sparkles className="w-3 h-3 shrink-0" />
                    <span>Ducking anti-eco ativado: o som da tela diminui automaticamente quando você fala.</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#2a3142] bg-[#12151d]/90 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            Transmissão: <strong className="text-indigo-400">{resolution} @ {fps} FPS</strong>
            {includeAudio && ' (com Áudio)'}
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
