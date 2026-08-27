import React, { useEffect, useRef, useState } from 'react'
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Maximize2,
  Minimize2,
  ScreenShare,
  Radio,
  Settings,
  ChevronDown,
  ChevronUp,
  Monitor,
  Sparkles,
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
  isScreenTrack?: boolean
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
  isScreenTrack,
  color,
  onClick,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const { outputVolume, selectedAudioOutput } = useMediaStore()

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  useEffect(() => {
    if (videoRef.current && !isLocal) {
      videoRef.current.volume = Math.max(0, Math.min(1, outputVolume / 100))
      if (typeof (videoRef.current as any).setSinkId === 'function' && selectedAudioOutput) {
        ;(videoRef.current as any).setSinkId(selectedAudioOutput === 'default' ? '' : selectedAudioOutput).catch(() => {})
      }
    }
  }, [outputVolume, selectedAudioOutput, isLocal])

  return (
    <div
      onClick={onClick}
      className={`group relative w-32 h-24 bg-[#12151d] rounded-2xl overflow-hidden border-2 transition-all flex items-center justify-center shrink-0 cursor-pointer hover:scale-105 shadow-lg select-none ${
        isScreenTrack
          ? 'border-rose-500/80 hover:border-rose-400'
          : 'border-[#2a3142] hover:border-indigo-500'
      }`}
      title={isScreenTrack ? 'Transmissão de Tela - Clique para expandir' : 'Clique para expandir em tela cheia'}
    >
      {/* Video Feed */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal} // Avoid local echo
        className={`w-full h-full ${isScreenTrack ? 'object-contain bg-black' : 'object-cover'} ${
          isCameraOff && !isScreenSharing && !isScreenTrack ? 'hidden' : 'block'
        } ${isLocal && !isScreenSharing && !isScreenTrack ? '-scale-x-100' : ''}`}
      />

      {/* Camera Off Avatar Fallback */}
      {isCameraOff && !isScreenSharing && !isScreenTrack && (
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-md border border-white/20"
          style={{ backgroundColor: color || '#4c6ef5' }}
        >
          {name.charAt(0).toUpperCase()}
        </div>
      )}

      {/* Top Live Badge */}
      {(isScreenSharing || isScreenTrack) && (
        <div className="absolute top-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 bg-rose-600 text-white rounded text-[8px] font-bold shadow animate-pulse">
          <Radio className="w-2.5 h-2.5" />
          <span>{isScreenTrack ? 'TELA AO VIVO' : 'AO VIVO'}</span>
        </div>
      )}

      {/* Name Pill Tag */}
      <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between px-2 py-0.5 bg-black/70 backdrop-blur-md rounded-lg text-[10px] text-white">
        <span className="truncate font-medium">
          {isScreenTrack ? `Tela (${name})` : isLocal ? `${name} (Você)` : name}
        </span>
        {isMuted && !isScreenTrack && <MicOff className="w-2.5 h-2.5 text-rose-400 shrink-0" />}
      </div>
    </div>
  )
}

/**
 * Floating Picture-in-Picture Screen Share Preview Window
 */
interface FloatingScreenPreviewProps {
  stream: MediaStream | null
  presenterName: string
  isLocal: boolean
  onExpand: () => void
  onClose: () => void
}

const FloatingScreenPreview: React.FC<FloatingScreenPreviewProps> = ({
  stream,
  presenterName,
  isLocal,
  onExpand,
  onClose,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const { outputVolume, selectedAudioOutput } = useMediaStore()

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  useEffect(() => {
    if (videoRef.current && !isLocal) {
      videoRef.current.volume = Math.max(0, Math.min(1, outputVolume / 100))
      if (typeof (videoRef.current as any).setSinkId === 'function' && selectedAudioOutput) {
        ;(videoRef.current as any).setSinkId(selectedAudioOutput === 'default' ? '' : selectedAudioOutput).catch(() => {})
      }
    }
  }, [outputVolume, selectedAudioOutput, isLocal])

  return (
    <div className="mb-2 w-72 sm:w-80 bg-[#12151d] rounded-2xl overflow-hidden border-2 border-indigo-500/80 shadow-2xl animate-in slide-in-from-bottom-2 duration-200">
      {/* Floating Screen Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#1b202c] border-b border-[#2a3142]">
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 px-1.5 py-0.5 bg-rose-600 text-white rounded text-[9px] font-bold shadow animate-pulse">
            <Radio className="w-2.5 h-2.5" />
            <span>AO VIVO</span>
          </div>
          <span className="text-[11px] font-bold text-slate-200 truncate max-w-[140px]">
            {isLocal ? 'Sua Apresentação' : `Tela de ${presenterName}`}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onExpand}
            className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
            title="Expandir Tela Cheia (Modo Grade)"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
            title="Recolher Janela Flutuante"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Floating Video Stream */}
      <div
        onClick={onExpand}
        className="relative w-full h-40 bg-black flex items-center justify-center cursor-pointer group"
        title="Clique para expandir em tela cheia"
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className="w-full h-full object-contain bg-black"
        />

        {/* Hover Overlay with Expand Action */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <span className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-lg flex items-center gap-1.5 backdrop-blur-md">
            <Maximize2 className="w-3.5 h-3.5" />
            Expandir Apresentação
          </span>
        </div>
      </div>
    </div>
  )
}

export const MiniCallOverlay: React.FC = () => {
  const {
    localStream,
    localScreenStream,
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
  const [isFloatingPreviewVisible, setIsFloatingPreviewVisible] = useState(true)

  // Only display if user is in a Private Zone
  if (!localPlayer.currentZoneId || isGridCallOpen) return null

  const currentZone = mapData.zones.find((z) => z.id === localPlayer.currentZoneId)
  const zoneName = currentZone?.name || 'Mesa Privada'

  // Filter remote participants who are in the same zone
  const peersInSameZone = Object.values(remotePlayers).filter(
    (p) => p.currentZoneId === localPlayer.currentZoneId
  )

  // Find if there is an active screen share in this zone (local or remote)
  const remotePresenter = peersInSameZone.find((p) => p.isScreenSharing && peerStreams[p.id])
  const hasActiveScreenShare = isScreenSharing || !!remotePresenter

  const activeScreenStream = isScreenSharing
    ? localScreenStream
    : remotePresenter
    ? peerStreams[remotePresenter.id]
    : null

  const presenterName = isScreenSharing
    ? localPlayer.name
    : remotePresenter
    ? remotePresenter.name
    : ''

  const isPresenterLocal = isScreenSharing

  const handleToggleScreenShare = async () => {
    if (isScreenSharing) {
      MediaManager.getInstance().stopScreenShare()
    } else {
      setIsScreenModalOpen(true)
    }
  }

  return (
    <>
      <div className="fixed bottom-4 left-4 z-40 flex flex-col items-start select-none">
        {/* 1. Dedicated Floating Screen Share PiP Window (When sharing is active) */}
        {hasActiveScreenShare && activeScreenStream && isFloatingPreviewVisible && (
          <FloatingScreenPreview
            stream={activeScreenStream}
            presenterName={presenterName}
            isLocal={isPresenterLocal}
            onExpand={() => setGridCallOpen(true)}
            onClose={() => setIsFloatingPreviewVisible(false)}
          />
        )}

        {/* 2. Main Floating Zone Call Card */}
        <div className="bg-[#1b202c]/95 backdrop-blur-xl border border-[#2a3142] rounded-3xl p-3 shadow-2xl animate-in slide-in-from-bottom-4 duration-200">
          {/* Top Status */}
          <div className="flex items-center justify-between gap-4 mb-2 px-1">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold text-slate-100">{zoneName}</span>
              <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded-full">
                {peersInSameZone.length + 1} online
              </span>
            </div>

            <div className="flex items-center gap-1">
              {/* Toggle Floating Screen Share Preview button if active */}
              {hasActiveScreenShare && !isFloatingPreviewVisible && (
                <button
                  onClick={() => setIsFloatingPreviewVisible(true)}
                  className="px-2 py-0.5 rounded-lg bg-rose-600/20 text-rose-400 border border-rose-500/30 hover:bg-rose-600 hover:text-white transition-all text-[10px] font-bold flex items-center gap-1"
                  title="Exibir Tela Flutuante da Apresentação"
                >
                  <Monitor className="w-3 h-3" />
                  <span>Ver Tela</span>
                </button>
              )}

              <button
                onClick={() => setGridCallOpen(true)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
                title="Expandir Chamada (Modo Grade)"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Video Tiles Carousel (Clicking opens Spotlight Grid) */}
          <div className="flex gap-2 items-center overflow-x-auto pb-1 max-w-sm sm:max-w-md">
            {/* Local User Camera */}
            <VideoTile
              stream={localStream}
              name={localPlayer.name}
              isMuted={isMuted}
              isCameraOff={isCameraOff}
              isLocal={true}
              isScreenSharing={false}
              color={localPlayer.avatar.shirtColor}
              onClick={() => setGridCallOpen(true)}
            />

            {/* Local Screen Share Tile (if sharing) */}
            {isScreenSharing && localScreenStream && (
              <VideoTile
                stream={localScreenStream}
                name={localPlayer.name}
                isLocal={true}
                isScreenSharing={true}
                isScreenTrack={true}
                onClick={() => setGridCallOpen(true)}
              />
            )}

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
                isScreenTrack={peer.isScreenSharing}
                color={peer.avatar.shirtColor}
                onClick={() => setGridCallOpen(true)}
              />
            ))}
          </div>

          {/* Quick Controls Bar */}
          <div className="flex items-center justify-center gap-2 mt-2 pt-2 border-t border-[#2a3142]">
            {/* Mic */}
            <button
              onClick={toggleMute}
              className={`p-2 rounded-xl text-xs font-medium transition-colors ${
                isMuted ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
              }`}
              title={isMuted ? 'Desmutar Microfone' : 'Mutar Microfone'}
            >
              {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            {/* Camera */}
            <button
              onClick={toggleCamera}
              className={`p-2 rounded-xl text-xs font-medium transition-colors ${
                isCameraOff ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
              }`}
              title={isCameraOff ? 'Ligar Câmera' : 'Desligar Câmera'}
            >
              {isCameraOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
            </button>

            {/* Screen Share (Flashing and glowing when active) */}
            <button
              onClick={handleToggleScreenShare}
              className={`p-2 rounded-xl text-xs font-medium transition-all ${
                isScreenSharing
                  ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/40 animate-pulse'
                  : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
              }`}
              title={isScreenSharing ? 'Parar Compartilhamento de Tela' : 'Compartilhar Tela'}
            >
              <ScreenShare className="w-4 h-4" />
            </button>

            {/* Settings */}
            <button
              onClick={() => useMediaStore.getState().setSettingsModalOpen(true)}
              className="p-2 rounded-xl text-xs font-medium bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white transition-colors"
              title="Configurações de Áudio e Voz"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
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
