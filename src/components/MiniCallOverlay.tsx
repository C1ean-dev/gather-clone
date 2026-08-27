import React, { useEffect, useRef, useState } from 'react'
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Maximize2,
  ScreenShare,
  Radio,
} from 'lucide-react'
import { useMediaStore } from '../store/useMediaStore'
import { useGameStore } from '../store/useGameStore'
import { useMapStore } from '../store/useMapStore'
import { MediaManager } from '../media/MediaManager'
import { ScreenShareModal } from './ScreenShareModal'

interface VideoTileProps {
  stream: MediaStream | null
  name: string
  isMuted?: boolean
  isCameraOff?: boolean
  isLocal?: boolean
  isScreenSharing?: boolean
  color?: string
  onClick?: () => void
}

const VideoTile: React.FC<VideoTileProps> = ({
  stream,
  name,
  isMuted,
  isCameraOff,
  isLocal,
  isScreenSharing,
  color,
  onClick,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  return (
    <div
      onClick={onClick}
      className="group relative w-32 h-24 bg-[#12151d] rounded-2xl overflow-hidden border border-[#2a3142] hover:border-indigo-500 shadow-lg flex items-center justify-center shrink-0 cursor-pointer transition-all hover:scale-105"
      title="Clique para expandir em tela cheia"
    >
      {/* Video Feed */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal} // Avoid local echo
        className={`w-full h-full object-cover ${isCameraOff && !isScreenSharing ? 'hidden' : 'block'} ${
          isLocal && !isScreenSharing ? '-scale-x-100' : ''
        }`}
      />

      {/* Camera Off Avatar Fallback */}
      {isCameraOff && !isScreenSharing && (
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-md border border-white/20"
          style={{ backgroundColor: color || '#4c6ef5' }}
        >
          {name.charAt(0).toUpperCase()}
        </div>
      )}

      {/* Top Live Badge */}
      {isScreenSharing && (
        <div className="absolute top-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 bg-rose-600 text-white rounded text-[8px] font-bold shadow animate-pulse">
          <Radio className="w-2.5 h-2.5" />
          <span>AO VIVO</span>
        </div>
      )}

      {/* Name Pill Tag */}
      <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between px-2 py-0.5 bg-black/60 backdrop-blur-md rounded-lg text-[10px] text-white">
        <span className="truncate font-medium">{isLocal ? `${name} (Você)` : name}</span>
        {isMuted && <MicOff className="w-2.5 h-2.5 text-rose-400 shrink-0" />}
      </div>
    </div>
  )
}

export const MiniCallOverlay: React.FC = () => {
  const {
    localStream,
    peerStreams,
    isMuted,
    isCameraOff,
    isScreenSharing,
    isGridCallOpen,
    setGridCallOpen,
    toggleMute,
    toggleCamera,
  } = useMediaStore()

  const { localPlayer, remotePlayers } = useGameStore()
  const { mapData } = useMapStore()

  const [isScreenModalOpen, setIsScreenModalOpen] = useState(false)

  // Only display if user is in a Private Zone
  if (!localPlayer.currentZoneId || isGridCallOpen) return null

  const currentZone = mapData.zones.find((z) => z.id === localPlayer.currentZoneId)
  const zoneName = currentZone?.name || 'Mesa Privada'

  // Filter remote participants who are in the same zone
  const peersInSameZone = Object.values(remotePlayers).filter(
    (p) => p.currentZoneId === localPlayer.currentZoneId
  )

  const handleToggleScreenShare = async () => {
    if (isScreenSharing) {
      MediaManager.getInstance().stopScreenShare()
    } else {
      setIsScreenModalOpen(true)
    }
  }

  return (
    <>
      <div className="fixed bottom-4 left-4 z-40 bg-[#1b202c]/95 backdrop-blur-xl border border-[#2a3142] rounded-3xl p-3 shadow-2xl animate-in slide-in-from-bottom-4 duration-200">
        {/* Top Status */}
        <div className="flex items-center justify-between gap-4 mb-2 px-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold text-slate-100">{zoneName}</span>
            <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded-full">
              {peersInSameZone.length + 1} online
            </span>
          </div>

          <button
            onClick={() => setGridCallOpen(true)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            title="Expandir Chamada (Modo Grade)"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        {/* Video Tiles Carousel (Clicking opens Spotlight Grid) */}
        <div className="flex gap-2 items-center overflow-x-auto pb-1 max-w-sm">
          {/* Local User */}
          <VideoTile
            stream={localStream}
            name={localPlayer.name}
            isMuted={isMuted}
            isCameraOff={isCameraOff}
            isLocal={true}
            isScreenSharing={localPlayer.isScreenSharing}
            color={localPlayer.avatar.shirtColor}
            onClick={() => setGridCallOpen(true)}
          />

          {/* Remote Peers in Zone */}
          {peersInSameZone.map((peer) => (
            <VideoTile
              key={peer.id}
              stream={peerStreams[peer.id] || null}
              name={peer.name}
              isMuted={peer.isMuted}
              isCameraOff={peer.isCameraOff}
              isLocal={false}
              isScreenSharing={peer.isScreenSharing}
              color={peer.avatar.shirtColor}
              onClick={() => setGridCallOpen(true)}
            />
          ))}
        </div>

        {/* Quick Controls Bar */}
        <div className="flex items-center justify-center gap-2 mt-2 pt-2 border-t border-[#2a3142]">
          <button
            onClick={toggleMute}
            className={`p-2 rounded-xl text-xs font-medium transition-colors ${
              isMuted ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
            title={isMuted ? 'Desmutar Microfone' : 'Mutar Microfone'}
          >
            {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          <button
            onClick={toggleCamera}
            className={`p-2 rounded-xl text-xs font-medium transition-colors ${
              isCameraOff ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
            title={isCameraOff ? 'Ligar Câmera' : 'Desligar Câmera'}
          >
            {isCameraOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
          </button>

          <button
            onClick={handleToggleScreenShare}
            className={`p-2 rounded-xl text-xs font-medium transition-colors ${
              isScreenSharing
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
            title="Compartilhar Tela"
          >
            <ScreenShare className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Screen Share Window Picker Modal */}
      <ScreenShareModal
        isOpen={isScreenModalOpen}
        onClose={() => setIsScreenModalOpen(false)}
      />
    </>
  )
}
