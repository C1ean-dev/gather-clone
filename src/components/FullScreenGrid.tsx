import React, { useEffect, useRef, useState } from 'react'
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  ScreenShare,
  Minimize2,
  Maximize2,
  Maximize,
  Hand,
  Smile,
  Shield,
  Volume2,
  VolumeX,
  SlidersHorizontal,
  LogOut,
  Sparkles,
  MessageSquare,
  Pin,
  Radio,
  Tv,
  LayoutGrid,
  ChevronRight,
  ChevronLeft,
  Users,
  X,
} from 'lucide-react'
import { useMediaStore } from '../store/useMediaStore'
import { useGameStore } from '../store/useGameStore'
import { useMapStore } from '../store/useMapStore'
import { useChatStore } from '../store/useChatStore'
import { MediaManager } from '../media/MediaManager'
import { PeerManager } from '../p2p/PeerManager'
import { ScreenShareModal } from './ScreenShareModal'

interface ParticipantData {
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

interface GridParticipantTileProps {
  user: ParticipantData
  isFocused?: boolean
  isSidebar?: boolean
  onFocus?: () => void
  onOpenLiveFullscreen?: (user: ParticipantData) => void
}

const GridParticipantTile: React.FC<GridParticipantTileProps> = ({
  user,
  isFocused,
  isSidebar,
  onFocus,
  onOpenLiveFullscreen,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const { outputVolume, selectedAudioOutput } = useMediaStore()

  const isLive = user.isScreenSharing || !!user.screenStream
  const effectiveStream = user.isLocal
    ? user.screenStream || user.stream
    : user.stream || user.screenStream

  useEffect(() => {
    if (videoRef.current && effectiveStream) {
      videoRef.current.srcObject = effectiveStream
    }
  }, [effectiveStream])

  useEffect(() => {
    if (!user.isLocal && videoRef.current) {
      const vol = Math.max(0, Math.min(1, outputVolume / 100))
      videoRef.current.volume = vol
      if (typeof (videoRef.current as any).setSinkId === 'function' && selectedAudioOutput) {
        ;(videoRef.current as any).setSinkId(selectedAudioOutput === 'default' ? '' : selectedAudioOutput).catch(() => {})
      }
    }
  }, [outputVolume, selectedAudioOutput, user.isLocal])

  const handleFullscreenClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onOpenLiveFullscreen) {
      onOpenLiveFullscreen(user)
    }
  }

  // Smaller sidebar tile styling vs Full / Grid tile styling
  if (isSidebar) {
    return (
      <div
        onClick={onFocus}
        className={`group relative w-full h-28 bg-[#12151d] rounded-2xl overflow-hidden border-2 transition-all flex items-center justify-center shadow-lg cursor-pointer select-none shrink-0 ${
          user.isSpeaking
            ? 'border-emerald-500 ring-2 ring-emerald-500/30'
            : isLive
            ? 'border-rose-500/80 hover:border-rose-400'
            : 'border-[#2a3142] hover:border-indigo-500'
        }`}
        title={`Clique para focar em ${user.name}`}
      >
        {/* Screen / Video Feed */}
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
                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow border border-white/20"
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

/**
 * Pure Fullscreen Live Stream Player (Fills 100% of Monitor with the Live Video)
 */
interface LiveFullscreenTheaterProps {
  user: ParticipantData
  onClose: () => void
}

const LiveFullscreenTheater: React.FC<LiveFullscreenTheaterProps> = ({ user, onClose }) => {
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

export const FullScreenGrid: React.FC = () => {
  const {
    isGridCallOpen,
    setGridCallOpen,
    localStream,
    localScreenStream,
    peerStreams,
    peerScreenStreams,
    isMuted,
    isCameraOff,
    isScreenSharing,
    isNoiseSuppressionEnabled,
    toggleMute,
    toggleCamera,
    toggleNoiseSuppression,
    localAudioLevel,
  } = useMediaStore()

  const { localPlayer, remotePlayers, addReaction } = useGameStore()
  const { mapData } = useMapStore()
  const { toggleChat } = useChatStore()

  const [handRaised, setHandRaised] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [isScreenModalOpen, setIsScreenModalOpen] = useState(false)
  const [focusedUserId, setFocusedUserId] = useState<string | null>(null)
  const [liveTheaterUser, setLiveTheaterUser] = useState<ParticipantData | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  if (!isGridCallOpen) return null

  const currentZone = mapData.zones.find((z) => z.id === localPlayer.currentZoneId)
  const zoneTitle = currentZone?.name || 'Revisão & Call de Time'

  const peersInSameZone = Object.values(remotePlayers).filter(
    (p) => p.currentZoneId === localPlayer.currentZoneId
  )

  const allInMeeting: ParticipantData[] = [
    {
      id: localPlayer.id,
      name: localPlayer.name,
      stream: localStream,
      screenStream: localScreenStream,
      isMuted,
      isCameraOff,
      isLocal: true,
      isScreenSharing: localPlayer.isScreenSharing,
      isSpeaking: localAudioLevel > 0.15 && !isMuted,
      shirtColor: localPlayer.avatar.shirtColor,
      statusEmoji: localPlayer.statusEmoji,
    },
    ...peersInSameZone.map((p) => ({
      id: p.id,
      name: p.name,
      stream: peerStreams[p.id] || null,
      screenStream: peerScreenStreams[p.id] || null,
      isMuted: p.isMuted,
      isCameraOff: p.isCameraOff,
      isLocal: false,
      isScreenSharing: p.isScreenSharing,
      isSpeaking: false,
      shirtColor: p.avatar.shirtColor,
      statusEmoji: p.statusEmoji,
    })),
  ]

  // If someone is screen sharing and no one is explicitly focused, default focus to the active screen share
  const activePresenter = allInMeeting.find((u) => u.screenStream || u.isScreenSharing)
  const focusedUser = focusedUserId
    ? allInMeeting.find((u) => u.id === focusedUserId)
    : activePresenter || (allInMeeting.length > 0 ? allInMeeting[0] : null)

  const handleToggleScreenShare = async () => {
    if (isScreenSharing) {
      MediaManager.getInstance().stopScreenShare()
    } else {
      setIsScreenModalOpen(true)
    }
  }

  const handleSendReaction = (emoji: string) => {
    const reaction = {
      id: 'react-' + Math.random().toString(36).substring(2, 7),
      playerId: localPlayer.id,
      emoji,
      x: localPlayer.x,
      y: localPlayer.y,
      createdAt: Date.now(),
    }
    addReaction(reaction)
    PeerManager.getInstance().sendReaction(reaction)
    setShowEmojiPicker(false)
  }

  const otherParticipants = allInMeeting.filter((u) => u.id !== focusedUser?.id)

  return (
    <>
      <div className="fixed inset-0 z-50 bg-[#0c0e14] flex flex-col justify-between p-3 select-none animate-in fade-in duration-200">
        {/* Top Bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-[#12151d]/90 backdrop-blur-md rounded-2xl border border-[#2a3142] shrink-0 mb-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h1 className="text-sm font-bold text-slate-100">{zoneTitle}</h1>
            </div>
            <span className="text-xs bg-[#1b202c] border border-[#2a3142] text-slate-400 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
              <Shield className="w-3 h-3 text-emerald-400" />
              Espaço Criptografado & Isolado
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Toggle Sidebar button */}
            {otherParticipants.length > 0 && (
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  isSidebarOpen
                    ? 'bg-indigo-600 text-white border-indigo-500'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
                title={isSidebarOpen ? 'Ocultar barra de participantes' : 'Exibir barra de participantes'}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Membros ({allInMeeting.length})</span>
              </button>
            )}

            <button
              onClick={() => setGridCallOpen(false)}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors"
            >
              <Minimize2 className="w-4 h-4" />
              Voltar ao Mapa 2D
            </button>
          </div>
        </div>

        {/* Main Video Presentation Area with Maximize Live Size + Compact Right Sidebar */}
        <div className="flex-1 w-full h-[calc(100vh-140px)] flex gap-3 items-stretch overflow-hidden">
          {/* 1. Large Main Live / Video Stage (Fills Maximum Width & Height) */}
          <div className="flex-1 h-full min-w-0 bg-[#0c0e14] rounded-3xl overflow-hidden flex items-center justify-center">
            {focusedUser ? (
              <GridParticipantTile
                user={focusedUser}
                isFocused={true}
                isSidebar={false}
                onOpenLiveFullscreen={(u) => setLiveTheaterUser(u)}
              />
            ) : (
              <div className="text-slate-400 text-sm">Nenhum participante conectado</div>
            )}
          </div>

          {/* 2. Compact Right-side Participants Rail (Canto direito bem menor) */}
          {isSidebarOpen && otherParticipants.length > 0 && (
            <div className="w-44 lg:w-48 h-full bg-[#12151d]/70 backdrop-blur-md rounded-3xl border border-[#2a3142] p-2 flex flex-col gap-2 overflow-y-auto shrink-0 animate-in slide-in-from-right-4 duration-200">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 py-0.5 flex items-center justify-between">
                <span>Participantes ({otherParticipants.length})</span>
              </div>

              {otherParticipants.map((otherUser) => (
                <GridParticipantTile
                  key={otherUser.id}
                  user={otherUser}
                  isFocused={false}
                  isSidebar={true}
                  onFocus={() => setFocusedUserId(otherUser.id)}
                  onOpenLiveFullscreen={(u) => setLiveTheaterUser(u)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Floating Emoji Picker Popover */}
        {showEmojiPicker && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-[#1b202c] border border-[#2a3142] rounded-2xl p-2 shadow-2xl flex gap-2 animate-in zoom-in-95 duration-150 z-50">
            {['❤️', '👍', '👏', '😂', '🎉', '🔥', '🚀', '✋'].map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleSendReaction(emoji)}
                className="text-2xl p-2 hover:bg-slate-800 rounded-xl transition-transform hover:scale-125"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* Bottom Controls Bar (Gather V2 Dock) */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-[#12151d]/95 backdrop-blur-xl rounded-2xl border border-[#2a3142] max-w-3xl mx-auto w-full shadow-2xl shrink-0 mt-2">
          {/* Left Side: Noise Suppressor DSP & Audio Settings */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                toggleNoiseSuppression()
                MediaManager.getInstance().updateNoiseSuppression(!isNoiseSuppressionEnabled)
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                isNoiseSuppressionEnabled
                  ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300 shadow-md'
                  : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
              title="Filtra ruídos de teclado, ventiladores e barulhos de fundo com DSP"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Supressor IA {isNoiseSuppressionEnabled ? 'ON' : 'OFF'}</span>
            </button>

            <button
              onClick={() => useMediaStore.getState().setSettingsModalOpen(true)}
              className="p-2 rounded-xl bg-slate-800/60 border border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              title="Configurações de Áudio e Voz"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          </div>

          {/* Center: Main Call Buttons */}
          <div className="flex items-center gap-2.5">
            {/* Mic */}
            <button
              onClick={toggleMute}
              className={`p-3 rounded-xl flex items-center justify-center transition-all ${
                isMuted
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30'
                  : 'bg-[#1b202c] text-white border border-[#2a3142] hover:bg-slate-700'
              }`}
              title={isMuted ? 'Desmutar Microfone (M)' : 'Mutar Microfone (M)'}
            >
              {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            {/* Camera */}
            <button
              onClick={toggleCamera}
              className={`p-3 rounded-xl flex items-center justify-center transition-all ${
                isCameraOff
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30'
                  : 'bg-[#1b202c] text-white border border-[#2a3142] hover:bg-slate-700'
              }`}
              title={isCameraOff ? 'Ligar Câmera (V)' : 'Desligar Câmera (V)'}
            >
              {isCameraOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
            </button>

            {/* Screen Share */}
            <button
              onClick={handleToggleScreenShare}
              className={`p-3 rounded-xl flex items-center justify-center transition-all ${
                isScreenSharing
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/40'
                  : 'bg-[#1b202c] text-slate-300 border border-[#2a3142] hover:bg-slate-700'
              }`}
              title="Compartilhar Tela / Janela"
            >
              <ScreenShare className="w-4 h-4" />
            </button>

            {/* Emoji Reactions */}
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-3 rounded-xl bg-[#1b202c] text-slate-300 border border-[#2a3142] hover:bg-slate-700 transition-colors"
              title="Enviar Reação Emoji"
            >
              <Smile className="w-4 h-4" />
            </button>

            {/* Hand Raise */}
            <button
              onClick={() => setHandRaised(!handRaised)}
              className={`p-3 rounded-xl border transition-all ${
                handRaised
                  ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                  : 'bg-[#1b202c] border-[#2a3142] text-slate-300 hover:bg-slate-700'
              }`}
              title="Levantar a Mão"
            >
              <Hand className="w-4 h-4" />
            </button>
          </div>

          {/* Right Side: Chat & Leave */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleChat}
              className="p-2.5 rounded-xl bg-[#1b202c] border border-[#2a3142] text-slate-300 hover:bg-slate-700 transition-colors"
              title="Abrir Chat"
            >
              <MessageSquare className="w-4 h-4" />
            </button>

            <button
              onClick={() => setGridCallOpen(false)}
              className="px-3.5 py-2 rounded-xl bg-rose-600/20 border border-rose-600/40 hover:bg-rose-600 text-rose-400 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Minimizar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Pure Fullscreen Live Stream Player */}
      {liveTheaterUser && (
        <LiveFullscreenTheater
          user={liveTheaterUser}
          onClose={() => setLiveTheaterUser(null)}
        />
      )}

      {/* Screen Share Window Picker Modal */}
      <ScreenShareModal
        isOpen={isScreenModalOpen}
        onClose={() => setIsScreenModalOpen(false)}
      />
    </>
  )
}
