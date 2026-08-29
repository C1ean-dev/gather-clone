import React, { useEffect, useRef } from 'react'
import { Radio, MicOff, Maximize, Pin, Maximize2 } from 'lucide-react'

export interface ParticipantData {
  id: string
  name: string
  stream: MediaStream | null
  screenStream?: MediaStream | null
  isMuted?: boolean
  isCameraOff?: boolean
  isLocal?: boolean
  isScreenSharing?: boolean
  isSpeaking?: boolean
  shirtColor?: string
  statusEmoji?: string
}

interface Props {
  user: ParticipantData
  isFocused?: boolean
  isSidebar?: boolean
  onFocus?: () => void
  onOpenLiveFullscreen?: (user: ParticipantData) => void
}

export const GridParticipantTile: React.FC<Props> = ({
  user,
  isFocused = false,
  isSidebar = false,
  onFocus,
  onOpenLiveFullscreen,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const isLive = Boolean(user.screenStream || user.isScreenSharing)
  const activeStream = user.screenStream || user.stream

  useEffect(() => {
    if (videoRef.current && activeStream) {
      videoRef.current.srcObject = activeStream
    }
  }, [activeStream, isLive])

  const handleFullscreenClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onOpenLiveFullscreen) {
      onOpenLiveFullscreen(user)
    }
  }

  // Compact Sidebar Thumbnail
  if (isSidebar) {
    return (
      <div
        onClick={onFocus}
        className={`group relative w-full aspect-video bg-[#12151d] rounded-2xl overflow-hidden border-2 transition-all flex items-center justify-center cursor-pointer shadow-md shrink-0 select-none ${
          user.isSpeaking
            ? 'border-emerald-500 ring-2 ring-emerald-500/30'
            : isFocused
            ? 'border-indigo-500 ring-2 ring-indigo-500/40'
            : 'border-[#2a3142] hover:border-slate-500'
        }`}
      >
        {isLive ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={user.isLocal}
            className="w-full h-full object-cover bg-black"
          />
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted={user.isLocal}
              className={`w-full h-full object-cover ${user.isCameraOff ? 'hidden' : 'block'} ${
                user.isLocal ? '-scale-x-100' : ''
              }`}
            />
            {user.isCameraOff && (
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-md border border-white/20"
                style={{ backgroundColor: user.shirtColor || '#4c6ef5' }}
              >
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
          </>
        )}

        {/* Live Badge if sharing in sidebar */}
        {isLive && (
          <div className="absolute top-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 bg-rose-600 text-white rounded-md text-[8px] font-bold shadow animate-pulse">
            <Radio className="w-2.5 h-2.5" />
            <span>AO VIVO</span>
          </div>
        )}

        {/* Small Bottom Name Tag */}
        <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between px-2 py-0.5 bg-black/70 backdrop-blur-md rounded-lg text-[10px] text-white">
          <span className="truncate font-semibold">
            {isLive ? `Tela (${user.name})` : user.isLocal ? `${user.name} (Você)` : user.name}
          </span>
          {user.isMuted && !isLive && <MicOff className="w-2.5 h-2.5 text-rose-400 shrink-0" />}
        </div>
      </div>
    )
  }

  // Large Main / Grid Tile
  return (
    <div
      onClick={onFocus}
      onDoubleClick={handleFullscreenClick}
      className={`group relative w-full h-full bg-[#12151d] rounded-3xl overflow-hidden border-2 transition-all flex items-center justify-center shadow-2xl cursor-pointer select-none ${
        user.isSpeaking
          ? 'border-emerald-500 shadow-emerald-500/20 shadow-lg ring-2 ring-emerald-500/30'
          : isFocused
          ? 'border-indigo-500 ring-2 ring-indigo-500/30'
          : 'border-[#2a3142] hover:border-slate-500'
      }`}
    >
      {/* Screen Share or Video Content */}
      {isLive ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={user.isLocal}
          className="w-full h-full object-contain bg-black"
        />
      ) : (
        <>
          {/* Main Camera Video */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={user.isLocal}
            className={`w-full h-full object-cover ${user.isCameraOff ? 'hidden' : 'block'} ${
              user.isLocal ? '-scale-x-100' : ''
            }`}
          />

          {/* Camera Off Avatar Screen */}
          {user.isCameraOff && (
            <div className="flex flex-col items-center gap-3">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-extrabold text-white shadow-2xl border-2 border-white/20"
                style={{ backgroundColor: user.shirtColor || '#4c6ef5' }}
              >
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="text-sm font-semibold text-slate-300 flex items-center gap-1.5">
                <span>{user.name}</span>
                {user.statusEmoji && <span>{user.statusEmoji}</span>}
              </div>
            </div>
          )}
        </>
      )}

      {/* Top Badges: LIVE indicator + Expand Fullscreen Button */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
        {isLive ? (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-rose-600/95 text-white rounded-xl text-xs font-bold shadow-lg flex-shrink-0 animate-pulse pointer-events-auto">
            <Radio className="w-3.5 h-3.5" />
            <span>TRANSMISSÃO AO VIVO DE TELA</span>
          </div>
        ) : (
          <div />
        )}

        {/* Action buttons on hover */}
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto">
          <button
            onClick={handleFullscreenClick}
            className="px-3 py-1.5 rounded-xl bg-black/80 hover:bg-indigo-600 text-white backdrop-blur-md transition-all shadow-md flex items-center gap-1.5 text-xs font-bold"
            title="Expandir Live em Tela Cheia do Monitor"
          >
            <Maximize className="w-4 h-4" />
            <span>Tela Cheia</span>
          </button>

          {onFocus && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onFocus()
              }}
              className={`p-2 rounded-xl backdrop-blur-md transition-colors shadow-md ${
                isFocused ? 'bg-indigo-600 text-white' : 'bg-black/80 hover:bg-slate-700 text-white'
              }`}
              title={isFocused ? 'Desafixar' : 'Fixar / Destacar'}
            >
              <Pin className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Bottom Name Pill & Live Expand Button */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
        <div className="bg-black/80 backdrop-blur-md px-3.5 py-1.5 rounded-xl flex items-center gap-2 border border-white/10 text-xs font-semibold text-white pointer-events-auto">
          <span>{isLive ? `Tela de ${user.name}` : user.isLocal ? `${user.name} (Você)` : user.name}</span>
          {user.isMuted && !isLive && <MicOff className="w-3.5 h-3.5 text-rose-400" />}
        </div>

        {isLive && (
          <button
            onClick={handleFullscreenClick}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-2xl flex items-center gap-2 pointer-events-auto backdrop-blur-md transition-transform hover:scale-105 active:scale-95"
          >
            <Maximize2 className="w-4 h-4" />
            <span>Expandir Live</span>
          </button>
        )}
      </div>
    </div>
  )
}
