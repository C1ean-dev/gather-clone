import React, { useState } from 'react'
import { Shield, Users, Minimize2 } from 'lucide-react'
import { useMediaStore } from '../store/useMediaStore'
import { useGameStore } from '../store/useGameStore'
import { useMapStore } from '../store/useMapStore'
import { PeerManager } from '../p2p/PeerManager'
import { MediaManager } from '../media/MediaManager'
import { ScreenShareModal } from './ScreenShareModal'
import { GridParticipantTile, ParticipantData } from './grid/GridParticipantTile'
import { FullScreenLiveOverlay } from './grid/FullScreenLiveOverlay'
import { CallControlsBar } from './grid/CallControlsBar'

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
    localAudioLevel,
  } = useMediaStore()

  const { localPlayer, remotePlayers, addReaction } = useGameStore()
  const { mapData } = useMapStore()

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

          {/* 2. Compact Right-side Participants Rail */}
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
        <CallControlsBar
          handRaised={handRaised}
          setHandRaised={setHandRaised}
          showEmojiPicker={showEmojiPicker}
          setShowEmojiPicker={setShowEmojiPicker}
          onToggleScreenShare={handleToggleScreenShare}
          onLeaveCall={() => setGridCallOpen(false)}
        />
      </div>

      {/* Pure Fullscreen Live Stream Player */}
      {liveTheaterUser && (
        <FullScreenLiveOverlay
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
