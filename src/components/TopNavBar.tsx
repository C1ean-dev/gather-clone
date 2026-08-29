import React, { useState, useEffect, useRef } from 'react'
import {
  Copy,
  Check,
  Edit3,
  MessageSquare,
  Users,
  Settings,
  Sparkles,
  Share2,
  Lock,
  Globe,
  Rocket,
  Volume2,
  VolumeX,
  LogOut,
} from 'lucide-react'
import { useGameStore } from '../store/useGameStore'
import { useMapStore } from '../store/useMapStore'
import { useChatStore } from '../store/useChatStore'
import { useMediaStore } from '../store/useMediaStore'
import { PeerManager } from '../p2p/PeerManager'

interface Props {
  onOpenAvatarModal: () => void
  onOpenUpdateModal?: () => void
  hasUpdate?: boolean
  onDisconnect?: () => void
}

export const TopNavBar: React.FC<Props> = ({
  onOpenAvatarModal,
  onOpenUpdateModal,
  hasUpdate,
  onDisconnect,
}) => {
  const {
    localPlayer,
    remotePlayers,
    roomId,
    isOwner,
    isHost,
    isRoomPublic,
    toggleRoomPrivacy,
    roomName,
    isOnlineUsersOpen,
    toggleOnlineUsers,
  } = useGameStore()
  const { mapData, isEditorOpen, toggleEditor } = useMapStore()
  const { isChatOpen, toggleChat, channels } = useChatStore()
  const { isMuted, toggleMute } = useMediaStore()

  const [copied, setCopied] = useState(false)
  const [autoSavedNotice, setAutoSavedNotice] = useState(false)
  const prevEditorOpenRef = useRef(isEditorOpen)

  useEffect(() => {
    if (prevEditorOpenRef.current && !isEditorOpen) {
      setAutoSavedNotice(true)
      const t = setTimeout(() => setAutoSavedNotice(false), 2400)
      return () => clearTimeout(t)
    }
    prevEditorOpenRef.current = isEditorOpen
  }, [isEditorOpen])

  const currentZone = mapData.zones.find((z) => z.id === localPlayer.currentZoneId)
  const totalUnread = channels.reduce((acc, c) => acc + c.unreadCount, 0)
  const remotePlayerList = Object.values(remotePlayers)

  const handleCopyCode = () => {
    if (!roomId) return
    navigator.clipboard.writeText(roomId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <header className="h-14 bg-[#12151d]/90 backdrop-blur-md border-b border-[#2a3142] px-4 flex items-center justify-between z-30 select-none">
      {/* Left: Brand + Room Code + Privacy Toggle */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-500/20">
            <span className="text-white font-extrabold text-sm">G</span>
          </div>
          <div>
            <span className="text-sm font-extrabold tracking-tight text-white flex items-center gap-1.5">
              Gather <span className="text-[10px] bg-indigo-500/30 text-indigo-300 px-1.5 py-0.2 rounded">V2</span>
            </span>
          </div>
        </div>

        {/* Room Name & Code Badge */}
        {roomId && (
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#1b202c] hover:bg-slate-800 border border-[#2a3142] rounded-xl text-xs font-semibold text-slate-200 transition-all group"
            title={`Código Fixo da Sala: ${roomId}\n(Clique para copiar)`}
          >
            {roomName && roomName !== 'Espaço Principal' ? (
              <span className="text-slate-200 font-bold max-w-[100px] sm:max-w-[140px] truncate">{roomName}:</span>
            ) : (
              <span className="text-slate-400 font-normal">Sala:</span>
            )}
            <span className="font-mono text-indigo-400 font-bold max-w-[110px] sm:max-w-[200px] truncate">{roomId}</span>
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-200 shrink-0" />
            )}
          </button>
        )}

        {/* Room Privacy Toggle Badge (Owner can switch Public / Private) */}
        {roomId && (
          <button
            onClick={isOwner ? toggleRoomPrivacy : undefined}
            disabled={!isOwner}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
              isRoomPublic
                ? 'bg-blue-500/15 border-blue-500/40 text-blue-300 hover:bg-blue-500/25'
                : 'bg-[#1b202c] border-[#2a3142] text-slate-300 hover:bg-slate-800'
            } ${!isOwner ? 'cursor-default opacity-80' : 'cursor-pointer hover:scale-105 active:scale-95'}`}
            title={
              isOwner
                ? isRoomPublic
                  ? 'Esta sala está Pública (visível na lista de Salas Disponíveis). Clique para torná-la Privada.'
                  : 'Esta sala está Privada (somente via código). Clique para torná-la Pública na lista de Salas Disponíveis.'
                : isRoomPublic
                ? 'Sala Pública'
                : 'Sala Privada'
            }
          >
            {isRoomPublic ? (
              <>
                <Globe className="w-3.5 h-3.5 text-blue-400" />
                <span>Pública</span>
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>Privada</span>
              </>
            )}
            {isOwner && (
              <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1 py-0.2 rounded font-bold ml-0.5">
                Dono
              </span>
            )}
          </button>
        )}
      </div>

      {/* Center: Current Zone indicator */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-4 py-1.5 bg-[#1b202c]/60 border border-[#2a3142] rounded-full">
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: currentZone ? currentZone.color : '#6b7280' }}
          />
          <span className="text-xs font-semibold text-slate-200">
            {currentZone ? currentZone.name : 'Corredor Geral'}
          </span>
          {currentZone && (
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-medium px-2 py-0.2 rounded-full flex items-center gap-1">
              <Lock className="w-2.5 h-2.5" />
              Áudio Privado
            </span>
          )}
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2.5">
        {/* Auto-saved Feedback indicator */}
        {autoSavedNotice && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-xs font-semibold text-emerald-300 animate-in fade-in duration-200">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span>Espaço Salvo!</span>
          </div>
        )}

        {/* Edit Space Toggle */}
        <button
          onClick={toggleEditor}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
            isEditorOpen
              ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
              : 'bg-[#1b202c] text-slate-300 border-[#2a3142] hover:bg-slate-800'
          }`}
          title="Editar Mobília, Pisos e Zonas do Espaço"
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>{isEditorOpen ? 'Fechar Editor' : 'Editar Espaço'}</span>
        </button>

        {/* Chat Drawer Toggle */}
        <button
          onClick={toggleChat}
          className={`relative p-2 rounded-xl border transition-all ${
            isChatOpen
              ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
              : 'bg-[#1b202c] text-slate-300 border-[#2a3142] hover:bg-slate-800'
          }`}
          title="Abrir Chat e Canais"
        >
          <MessageSquare className="w-4 h-4" />
          {totalUnread > 0 && !isChatOpen && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-indigo-500 text-white text-[10px] font-bold flex items-center justify-center animate-bounce">
              {totalUnread}
            </span>
          )}
        </button>

        {/* Online People Toggle Button */}
        <button
          onClick={toggleOnlineUsers}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
            isOnlineUsersOpen
              ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30 ring-2 ring-indigo-500/30'
              : 'bg-[#1b202c] hover:bg-slate-800 border-[#2a3142] text-slate-300 hover:text-white'
          }`}
          title="Ver Participantes Online, Amigos e Gerenciar Permissões"
        >
          <Users className={`w-3.5 h-3.5 ${isOnlineUsersOpen ? 'text-white' : 'text-emerald-400'}`} />
          <span>{remotePlayerList.length + 1}</span>
        </button>

        {/* Available Update Notification Rocket */}
        {hasUpdate && onOpenUpdateModal && (
          <button
            onClick={onOpenUpdateModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 animate-pulse transition-all hover:scale-105"
            title="Nova atualização disponível! Clique para ver e atualizar"
          >
            <Rocket className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Atualização!</span>
          </button>
        )}

        {/* Audio & Video Settings Button */}
        <button
          onClick={() => useMediaStore.getState().setSettingsModalOpen(true)}
          className="p-2 rounded-xl bg-[#1b202c] hover:bg-slate-800 border border-[#2a3142] text-slate-300 hover:text-white transition-all group"
          title="Configurações de Áudio e Chamada"
        >
          <Settings className="w-4 h-4 text-slate-400 group-hover:text-indigo-400 group-hover:rotate-45 transition-transform" />
        </button>

        {/* User Profile / Avatar Button */}
        <button
          onClick={onOpenAvatarModal}
          className="flex items-center gap-2 pl-2 pr-3 py-1 bg-[#1b202c] hover:bg-slate-800 border border-[#2a3142] rounded-xl transition-all group"
        >
          <div className="relative">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs text-white border border-white/20"
              style={{ backgroundColor: localPlayer.avatar.shirtColor || '#4c6ef5' }}
            >
              {localPlayer.name.charAt(0).toUpperCase()}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#12151d]" />
          </div>
          <div className="text-left">
            <div className="text-xs font-bold text-slate-200 group-hover:text-white leading-tight">
              {localPlayer.name}
            </div>
            <div className="text-[10px] text-slate-400 leading-tight truncate max-w-[80px]">
              {localPlayer.statusEmoji} {localPlayer.statusText}
            </div>
          </div>
        </button>

        {/* Disconnect / Leave Space Button */}
        {onDisconnect && (
          <button
            onClick={onDisconnect}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-950/40 hover:bg-rose-600/30 border border-rose-500/30 text-rose-300 hover:text-rose-100 rounded-xl text-xs font-bold transition-all active:scale-95 group shadow-sm hover:shadow-rose-500/20"
            title="Sair / Desconectar deste espaço"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-400 group-hover:text-rose-200 transition-colors" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        )}
      </div>
    </header>
  )
}
