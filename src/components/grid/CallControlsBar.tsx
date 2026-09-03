import React from 'react'
import {
  Sparkles,
  SlidersHorizontal,
  Mic,
  MicOff,
  Video,
  VideoOff,
  ScreenShare,
  Smile,
  Hand,
  MessageSquare,
  LogOut,
} from 'lucide-react'
import { useMediaStore } from '../../store/useMediaStore'
import { MediaManager } from '../../media/MediaManager'
import { useChatStore } from '../../store/useChatStore'

interface Props {
  handRaised: boolean
  setHandRaised: (raised: boolean) => void
  showEmojiPicker: boolean
  setShowEmojiPicker: (show: boolean) => void
  onToggleScreenShare: () => void
  onLeaveCall: () => void
}

export const CallControlsBar: React.FC<Props> = ({
  handRaised,
  setHandRaised,
  showEmojiPicker,
  setShowEmojiPicker,
  onToggleScreenShare,
  onLeaveCall,
}) => {
  // Granular selectors — booleans/toggles only change on user action, but
  // whole-store would also re-render this bar on every VU-meter tick.
  const isMuted = useMediaStore((s) => s.isMuted)
  const isCameraOff = useMediaStore((s) => s.isCameraOff)
  const isScreenSharing = useMediaStore((s) => s.isScreenSharing)
  const isNoiseSuppressionEnabled = useMediaStore((s) => s.isNoiseSuppressionEnabled)
  const toggleMute = useMediaStore((s) => s.toggleMute)
  const toggleCamera = useMediaStore((s) => s.toggleCamera)
  const toggleNoiseSuppression = useMediaStore((s) => s.toggleNoiseSuppression)

  const isChatOpen = useChatStore((state) => state.isChatOpen)
  const activeChannelId = useChatStore((state) => state.activeChannelId)
  const zoneChannel = useChatStore((state) => state.channels.find((c) => c.id === 'current-zone'))
  const unreadZoneCount = zoneChannel?.unreadCount || 0

  const handleOpenRoomChat = () => {
    const chatStore = useChatStore.getState()
    if (chatStore.isChatOpen && chatStore.activeChannelId === 'current-zone') {
      chatStore.setChatOpen(false)
    } else {
      chatStore.setActiveChannel('current-zone')
      chatStore.setChatOpen(true)
    }
  }

  return (
    <div className="flex items-center justify-between px-6 py-2.5 bg-[#12151d]/95 backdrop-blur-xl rounded-2xl border border-[#2a3142] max-w-3xl mx-auto w-full shadow-2xl shrink-0 mt-2">
      {/* Left Side: Audio Settings */}
      <div className="flex items-center gap-2">
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
          onClick={onToggleScreenShare}
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
          onClick={handleOpenRoomChat}
          className={`p-2.5 rounded-xl border transition-all relative ${
            isChatOpen && activeChannelId === 'current-zone'
              ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
              : 'bg-[#1b202c] border-[#2a3142] text-slate-300 hover:bg-slate-700 hover:text-white'
          }`}
          title="Abrir Chat da Sala"
        >
          <MessageSquare className="w-4 h-4" />
          {unreadZoneCount > 0 && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-indigo-400 ring-2 ring-[#12151d] animate-pulse flex items-center justify-center text-[8px] font-bold text-slate-950">
              {unreadZoneCount > 9 ? '9+' : unreadZoneCount}
            </span>
          )}
        </button>

        <button
          onClick={onLeaveCall}
          className="px-3.5 py-2 rounded-xl bg-rose-600/20 border border-rose-600/40 hover:bg-rose-600 text-rose-400 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Minimizar</span>
        </button>
      </div>
    </div>
  )
}
