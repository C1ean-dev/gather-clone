import React, { useEffect, useRef, useState } from 'react'
import { Radio, Minimize2, Volume2, Volume1, VolumeX, Gauge } from 'lucide-react'
import { ParticipantData } from './GridParticipantTile'
import { useMediaStore } from '../../store/useMediaStore'

interface Props {
  user: ParticipantData
  onClose: () => void
}

export const FullScreenLiveOverlay: React.FC<Props> = ({ user, onClose }) => {
  const theaterVideoRef = useRef<HTMLVideoElement | null>(null)
  const theaterContainerRef = useRef<HTMLDivElement | null>(null)
  const [controlsVisible, setControlsVisible] = useState(true)
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isInteractingWithVolumeRef = useRef(false)

  const {
    participantVolumes,
    setParticipantVolume,
    outputVolume,
    selectedAudioOutput,
    liveBufferDelay,
    setLiveBufferDelay,
  } = useMediaStore()
  const rawVolume = participantVolumes[user.id] !== undefined ? participantVolumes[user.id] : 100
  const [prevVolume, setPrevVolume] = useState<number>(rawVolume > 0 ? rawVolume : 100)

  const activeStream = user.screenStream || user.stream

  useEffect(() => {
    const video = theaterVideoRef.current
    if (!video || !activeStream) return

    video.srcObject = activeStream

    // Apply audio output device if supported
    if (selectedAudioOutput && typeof (video as any).setSinkId === 'function') {
      ;(video as any).setSinkId(selectedAudioOutput === 'default' ? '' : selectedAudioOutput).catch(() => {})
    }

    // Explicit play() to prevent paused on mount
    video.play().catch(() => {})

    const handleTrackAdded = () => {
      video.play().catch(() => {})
    }

    activeStream.addEventListener('addtrack', handleTrackAdded)
    return () => {
      activeStream.removeEventListener('addtrack', handleTrackAdded)
    }
  }, [activeStream, selectedAudioOutput])

  // Update volume in real-time
  useEffect(() => {
    const video = theaterVideoRef.current
    if (!video) return

    if (user.isLocal) {
      video.muted = true
      video.volume = 0
    } else {
      video.muted = false
      const master = (outputVolume !== undefined ? outputVolume : 100) / 100
      const participant = rawVolume / 100
      video.volume = Math.max(0, Math.min(1, master * participant))
    }
  }, [rawVolume, outputVolume, user.isLocal])

  const handleVolumeChange = (newVal: number) => {
    const clamped = Math.max(0, Math.min(100, newVal))
    setParticipantVolume(user.id, clamped)
    if (clamped > 0) {
      setPrevVolume(clamped)
    }
  }

  const handleToggleMute = () => {
    if (rawVolume > 0) {
      setPrevVolume(rawVolume)
      handleVolumeChange(0)
    } else {
      handleVolumeChange(prevVolume || 100)
    }
  }

  // Keyboard shortcut handlers (ESC, Mute, Volume Up/Down)
  useEffect(() => {
    const el = theaterContainerRef.current
    if (el && !document.fullscreenElement) {
      el.requestFullscreen().catch(() => {})
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'm' || e.key === 'M') {
        handleToggleMute()
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        handleVolumeChange(rawVolume + 5)
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        handleVolumeChange(rawVolume - 5)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {})
      }
    }
  }, [onClose, rawVolume, prevVolume])

  // Auto hide floating controls after 3.5 seconds of inactivity
  const handleMouseMove = () => {
    setControlsVisible(true)
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current)
    hideTimeoutRef.current = setTimeout(() => {
      if (!isInteractingWithVolumeRef.current) {
        setControlsVisible(false)
      }
    }, 3500)
  }

  return (
    <div
      ref={theaterContainerRef}
      onMouseMove={handleMouseMove}
      className="fixed inset-0 z-[100] bg-black flex items-center justify-center overflow-hidden select-none cursor-default"
    >
      <video
        ref={theaterVideoRef}
        autoPlay
        playsInline
        muted={user.isLocal}
        onLoadedMetadata={() => theaterVideoRef.current?.play().catch(() => {})}
        onCanPlay={() => theaterVideoRef.current?.play().catch(() => {})}
        className="w-full h-full object-contain bg-black"
        onDoubleClick={onClose}
      />

      <div
        className={`absolute top-6 left-6 right-6 flex items-center justify-between transition-opacity duration-300 z-50 ${
          controlsVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-3 bg-black/80 backdrop-blur-xl px-4 py-2 rounded-2xl border border-white/15 shadow-2xl">
          <div className="flex items-center gap-2 px-2.5 py-1 bg-rose-600 text-white rounded-lg text-xs font-extrabold animate-pulse">
            <Radio className="w-3.5 h-3.5" />
            <span>AO VIVO</span>
          </div>
          <div className="text-sm font-bold text-white flex items-center gap-2">
            <span>{user.name}</span>
            <span className="text-slate-400 font-normal text-xs">• Transmissão em Tela Cheia</span>
          </div>
        </div>

        {/* Right Actions: Buffer Control + Volume Control + Exit Fullscreen */}
        <div className="flex items-center gap-3">
          {/* Live Anti-Stutter Jitter Buffer Selector */}
          {!user.isLocal && (
            <div
              className="flex items-center gap-2 bg-black/80 backdrop-blur-xl px-3.5 py-2 rounded-2xl border border-white/15 shadow-2xl"
              onMouseEnter={() => {
                isInteractingWithVolumeRef.current = true
              }}
              onMouseLeave={() => {
                isInteractingWithVolumeRef.current = false
              }}
            >
              <div className="flex items-center gap-1.5 text-xs text-slate-200">
                <Gauge className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="hidden sm:inline font-semibold">Buffer:</span>
                <span className="font-mono text-emerald-400 font-bold">{liveBufferDelay}ms</span>
              </div>

              {/* Quick Buffer Presets */}
              <div className="flex items-center gap-1 bg-white/5 p-0.5 rounded-xl border border-white/10">
                {[
                  { ms: 100, label: '100ms', desc: 'Tempo Real' },
                  { ms: 300, label: '300ms', desc: 'Fluido (Padrão)' },
                  { ms: 600, label: '600ms', desc: 'Anti-travamento' },
                  { ms: 1000, label: '1.0s', desc: 'Buffer Alto' },
                ].map((preset) => (
                  <button
                    key={preset.ms}
                    type="button"
                    onClick={() => setLiveBufferDelay(preset.ms)}
                    title={`Buffer ${preset.label} (${preset.desc})`}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                      liveBufferDelay === preset.ms
                        ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                        : 'text-slate-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Volume Control for Viewer */}
          {!user.isLocal && (
            <div
              className="flex items-center gap-2.5 bg-black/80 backdrop-blur-xl px-4 py-2 rounded-2xl border border-white/15 shadow-2xl"
              onMouseEnter={() => {
                isInteractingWithVolumeRef.current = true
              }}
              onMouseLeave={() => {
                isInteractingWithVolumeRef.current = false
              }}
            >
              <button
                onClick={handleToggleMute}
                className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                title={rawVolume === 0 ? 'Desmutar Transmissão (M)' : 'Mutar Transmissão (M)'}
              >
                {rawVolume === 0 ? (
                  <VolumeX className="w-4 h-4 text-rose-400" />
                ) : rawVolume < 50 ? (
                  <Volume1 className="w-4 h-4 text-indigo-400" />
                ) : (
                  <Volume2 className="w-4 h-4 text-indigo-400" />
                )}
              </button>

              <input
                type="range"
                min="0"
                max="100"
                value={rawVolume}
                onChange={(e) => handleVolumeChange(Number(e.target.value))}
                onMouseDown={() => {
                  isInteractingWithVolumeRef.current = true
                }}
                onMouseUp={() => {
                  isInteractingWithVolumeRef.current = false
                }}
                className="w-24 sm:w-28 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400"
                title={`Volume da Transmissão: ${rawVolume}% (Use ↑/↓)`}
              />

              <span className="text-xs font-mono font-bold text-slate-200 min-w-[34px] text-right">
                {rawVolume}%
              </span>
            </div>
          )}

          <button
            onClick={onClose}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-black/80 hover:bg-rose-600 text-white border border-white/15 backdrop-blur-xl shadow-2xl font-bold text-xs transition-all hover:scale-105"
          >
            <Minimize2 className="w-4 h-4" />
            <span>Sair da Tela Cheia (ESC)</span>
          </button>
        </div>
      </div>

      <div
        className={`absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/80 backdrop-blur-xl px-6 py-3 rounded-3xl border border-white/15 shadow-2xl transition-opacity duration-300 z-50 ${
          controlsVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <span className="text-xs text-slate-300 font-medium flex items-center gap-2">
          <span>Dê dois cliques no vídeo ou pressione <kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-white border border-slate-700 text-[10px]">ESC</kbd> para voltar</span>
          {!user.isLocal && (
            <>
              <span className="text-slate-500">•</span>
              <span>Volume: <kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-white border border-slate-700 text-[10px]">↑</kbd> <kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-white border border-slate-700 text-[10px]">↓</kbd></span>
              <span className="text-slate-500">•</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <Gauge className="w-3.5 h-3.5" />
                Buffer Anti-Lag: {liveBufferDelay}ms
              </span>
            </>
          )}
        </span>
      </div>
    </div>
  )
}
