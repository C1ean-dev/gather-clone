import React, { useEffect, useRef, useState } from 'react'
import { Radio, Minimize2 } from 'lucide-react'
import { ParticipantData } from './GridParticipantTile'

interface Props {
  user: ParticipantData
  onClose: () => void
}

export const FullScreenLiveOverlay: React.FC<Props> = ({ user, onClose }) => {
  const theaterVideoRef = useRef<HTMLVideoElement | null>(null)
  const theaterContainerRef = useRef<HTMLDivElement | null>(null)
  const [controlsVisible, setControlsVisible] = useState(true)
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const activeStream = user.screenStream || user.stream

  useEffect(() => {
    if (theaterVideoRef.current && activeStream) {
      theaterVideoRef.current.srcObject = activeStream
    }
  }, [activeStream])

  // Automatically request browser/monitor fullscreen on the theater container
  useEffect(() => {
    const el = theaterContainerRef.current
    if (el && !document.fullscreenElement) {
      el.requestFullscreen().catch(() => {})
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {})
      }
    }
  }, [onClose])

  // Auto hide floating controls after 3.5 seconds of inactivity
  const handleMouseMove = () => {
    setControlsVisible(true)
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current)
    hideTimeoutRef.current = setTimeout(() => {
      setControlsVisible(false)
    }, 3500)
  }

  return (
    <div
      ref={theaterContainerRef}
      onMouseMove={handleMouseMove}
      className="fixed inset-0 z-[100] bg-black flex items-center justify-center overflow-hidden select-none cursor-default"
    >
      {/* 100% Fullscreen Video Player */}
      <video
        ref={theaterVideoRef}
        autoPlay
        playsInline
        muted={user.isLocal}
        className="w-full h-full object-contain bg-black"
        onDoubleClick={onClose}
      />

      {/* Floating Top Control Bar (Auto-hiding) */}
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

        <button
          onClick={onClose}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-black/80 hover:bg-rose-600 text-white border border-white/15 backdrop-blur-xl shadow-2xl font-bold text-xs transition-all hover:scale-105"
        >
          <Minimize2 className="w-4 h-4" />
          <span>Sair da Tela Cheia (ESC)</span>
        </button>
      </div>

      {/* Floating Bottom Info Pill (Auto-hiding) */}
      <div
        className={`absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/80 backdrop-blur-xl px-6 py-3 rounded-3xl border border-white/15 shadow-2xl transition-opacity duration-300 z-50 ${
          controlsVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <span className="text-xs text-slate-300 font-medium">
          Dê dois cliques no vídeo ou pressione <kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-white border border-slate-700 text-[10px]">ESC</kbd> para voltar à reunião
        </span>
      </div>
    </div>
  )
}
