import React, { useState, useRef, useEffect } from 'react'
import {
  MessageSquare,
  Hash,
  Send,
  Smile,
  X,
  Users,
  ChevronDown,
  Lock,
  Volume2,
  Mic,
} from 'lucide-react'
import { useChatStore } from '../store/useChatStore'
import { useGameStore } from '../store/useGameStore'
import { useMediaStore } from '../store/useMediaStore'
import { PeerManager } from '../p2p/PeerManager'
import { ChatMessage } from '../types/chat'

export const ChatDrawer: React.FC = () => {
  const {
    channels,
    activeChannelId,
    messages,
    isChatOpen,
    setChatOpen,
    setActiveChannel,
    addMessage,
    addReactionToMessage,
  } = useChatStore()

  const { localPlayer, remotePlayers } = useGameStore()
  const { peerStreams, isGridCallOpen } = useMediaStore()

  const [inputMessage, setInputMessage] = useState('')
  const [showEmojiMenu, setShowEmojiMenu] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  const activeChannel = channels.find((c) => c.id === activeChannelId) || channels[0]
  const filteredMessages = messages.filter((m) => m.channelId === activeChannelId)

  const remotePlayerList = Object.values(remotePlayers)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [filteredMessages.length])

  if (!isChatOpen) return null

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputMessage.trim()) return

    const newMsg: ChatMessage = {
      id: 'msg-' + Math.random().toString(36).substring(2, 9),
      senderId: localPlayer.id,
      senderName: localPlayer.name,
      channelId: activeChannelId,
      content: inputMessage.trim(),
      timestamp: Date.now(),
      avatarConfig: localPlayer.avatar,
    }

    addMessage(newMsg)
    PeerManager.getInstance().sendChatMessage(newMsg)
    setInputMessage('')
  }

  const handleReact = (msgId: string, emoji: string) => {
    addReactionToMessage(msgId, emoji, localPlayer.id)
    setShowEmojiMenu(null)
  }

  return (
    <div
      className={`fixed left-0 bottom-0 w-[420px] max-w-[90vw] bg-[#12151d]/98 backdrop-blur-xl border-r border-[#2a3142] flex flex-col shadow-2xl animate-in slide-in-from-left duration-200 ${
        isGridCallOpen ? 'top-0 z-[60]' : 'top-14 z-40'
      }`}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a3142] bg-[#1b202c]/50">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-indigo-400" />
          <span className="font-bold text-sm text-slate-100">Chat & Canais</span>
        </div>
        <button
          onClick={() => setChatOpen(false)}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sub-sidebar: Channels & DMs */}
        <div className="w-36 bg-[#0c0e14]/60 border-r border-[#2a3142] flex flex-col p-2 space-y-4 overflow-y-auto">
          {/* Channels Section */}
          <div className="space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1 flex items-center justify-between">
              <span>Canais</span>
              <ChevronDown className="w-3 h-3" />
            </div>

            {channels.map((ch) => {
              const isCurrent = ch.id === activeChannelId
              return (
                <button
                  key={ch.id}
                  onClick={() => setActiveChannel(ch.id)}
                  className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isCurrent
                      ? 'bg-indigo-600/30 text-indigo-400 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    {ch.type === 'zone' ? (
                      <Lock className="w-3 h-3 text-emerald-400 shrink-0" />
                    ) : (
                      <Hash className="w-3 h-3 shrink-0" />
                    )}
                    <span className="truncate">{ch.name}</span>
                  </div>
                  {ch.unreadCount > 0 && (
                    <span className="bg-indigo-500 text-white text-[10px] px-1.5 py-0.2 rounded-full">
                      {ch.unreadCount}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Direct Messages Section */}
          <div className="space-y-1 flex-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1">
              Amigos ({remotePlayerList.length})
            </div>

            {remotePlayerList.length === 0 ? (
              <div className="text-[11px] text-slate-400 px-2 py-1 italic">Ninguém online</div>
            ) : (
              remotePlayerList.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-slate-800/40 cursor-pointer"
                >
                  <div className="relative">
                    <div
                      className="w-5 h-5 rounded-full border border-white/20 flex items-center justify-center text-[10px] font-bold text-white"
                      style={{ backgroundColor: player.avatar.shirtColor || '#4c6ef5' }}
                    >
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-1 ring-slate-900" />
                  </div>
                  <span className="truncate text-xs">{player.name}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Message Stream & Input */}
        <div className="flex-1 flex flex-col bg-[#12151d]">
          {/* Channel Info Bar */}
          <div className="px-3 py-2 border-b border-[#2a3142] flex items-center justify-between bg-[#1b202c]/20">
            <div className="flex items-center gap-1.5">
              <Hash className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-bold text-slate-200">{activeChannel.name}</span>
            </div>
            <span className="text-[10px] text-slate-400">{activeChannel.description}</span>
          </div>

          {/* Messages List */}
          <div className="flex-1 p-3 overflow-y-auto space-y-3">
            {filteredMessages.length === 0 ? (
              <div className="text-center text-xs text-slate-400 py-8">
                Nenhuma mensagem enviada ainda. Seja o primeiro a falar!
              </div>
            ) : (
              filteredMessages.map((msg) => {
                const isMine = msg.senderId === localPlayer.id
                return (
                  <div key={msg.id} className="group relative flex flex-col space-y-1">
                    <div className="flex items-baseline justify-between">
                      <span className={`text-xs font-semibold ${isMine ? 'text-indigo-400' : 'text-slate-300'}`}>
                        {msg.senderName}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="text-xs text-slate-200 bg-[#1b202c] p-2 rounded-xl border border-[#2a3142]/60 break-words">
                      {msg.content}
                    </div>

                    {/* Reactions List */}
                    {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {Object.entries(msg.reactions).map(([emoji, users]) => (
                          <button
                            key={emoji}
                            onClick={() => handleReact(msg.id, emoji)}
                            className={`text-[11px] px-1.5 py-0.5 rounded-md border flex items-center gap-1 ${
                              users.includes(localPlayer.id)
                                ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                                : 'bg-[#1b202c] border-[#2a3142] text-slate-400'
                            }`}
                          >
                            <span>{emoji}</span>
                            <span>{users.length}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <form onSubmit={handleSendMessage} className="p-3 border-t border-[#2a3142] bg-[#1b202c]/40">
            <div className="flex items-center gap-2 bg-[#12151d] border border-[#2a3142] rounded-xl px-3 py-2 focus-within:border-indigo-500">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={`Mensagem em #${activeChannel.name}...`}
                className="flex-1 bg-transparent text-xs text-slate-100 placeholder-slate-400 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim()}
                className="p-1 rounded-lg text-indigo-400 hover:text-indigo-300 disabled:opacity-30 transition-opacity"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
