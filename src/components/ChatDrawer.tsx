import React, { useState, useRef, useEffect } from 'react'
import {
  MessageSquare,
  Hash,
  Send,
  X,
  ChevronDown,
  Lock,
  Paperclip,
  Download,
  FileText,
  Maximize2,
  AlertCircle,
} from 'lucide-react'
import { useChatStore } from '../store/useChatStore'
import { useGameStore } from '../store/useGameStore'
import { useMediaStore } from '../store/useMediaStore'
import { PeerManager } from '../p2p/PeerManager'
import { ChatMessage, ChatAttachment } from '../types/chat'

function formatFileSize(bytes: number): string {
  if (!bytes || bytes < 1024) return `${bytes || 0} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function isImageAttachment(att: { type?: string; name?: string }): boolean {
  if (att.type && att.type.startsWith('image/')) return true
  const ext = att.name?.toLowerCase().split('.').pop() || ''
  return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'].includes(ext)
}

function downloadAttachment(att: ChatAttachment) {
  try {
    const link = document.createElement('a')
    link.href = att.dataUrl
    link.download = att.name || 'arquivo'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  } catch (err) {
    console.error('Falha ao baixar anexo:', err)
  }
}

/**
 * Outer gate: subscribes ONLY to isChatOpen so 60Hz position updates don't
 * re-render the chat drawer while it's closed (the common case).
 */
export const ChatDrawer: React.FC = () => {
  const isChatOpen = useChatStore((s) => s.isChatOpen)
  if (!isChatOpen) return null
  return <ChatDrawerInner />
}

const ChatDrawerInner: React.FC = () => {
  const {
    channels,
    activeChannelId,
    messages,
    setChatOpen,
    setActiveChannel,
    addMessage,
    addReactionToMessage,
  } = useChatStore()

  const { localPlayer, remotePlayers } = useGameStore()
  const isGridCallOpen = useMediaStore((s) => s.isGridCallOpen)

  const [inputMessage, setInputMessage] = useState('')
  const [pendingAttachment, setPendingAttachment] = useState<ChatAttachment | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [lightboxImage, setLightboxImage] = useState<{ url: string; name: string } | null>(null)

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  const activeChannel = channels.find((c) => c.id === activeChannelId) || channels[0]
  const filteredMessages = messages.filter((m) => m.channelId === activeChannelId)
  const remotePlayerList = Object.values(remotePlayers)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [filteredMessages.length])

  const handleFileSelect = (file: File) => {
    setUploadError(null)
    const MAX_BYTES = 15 * 1024 * 1024 // 15MB limit for P2P safety
    if (file.size > MAX_BYTES) {
      setUploadError(`Arquivo excede o limite máximo de 15MB (${(file.size / (1024 * 1024)).toFixed(1)}MB)`)
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      setPendingAttachment({
        id: 'att-' + Math.random().toString(36).substring(2, 9),
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        dataUrl,
      })
    }
    reader.onerror = () => {
      setUploadError('Erro ao carregar o arquivo.')
    }
    reader.readAsDataURL(file)
  }

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputMessage.trim() && !pendingAttachment) return

    const newMsg: ChatMessage = {
      id: 'msg-' + Math.random().toString(36).substring(2, 9),
      senderId: localPlayer.id,
      senderName: localPlayer.name,
      channelId: activeChannelId,
      content: inputMessage.trim(),
      timestamp: Date.now(),
      avatarConfig: localPlayer.avatar,
      attachment: pendingAttachment || undefined,
    }

    addMessage(newMsg)
    PeerManager.getInstance().sendChatMessage(newMsg)
    setInputMessage('')
    setPendingAttachment(null)
    setUploadError(null)
  }

  const handleReact = (msgId: string, emoji: string) => {
    addReactionToMessage(msgId, emoji, localPlayer.id)
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsDragging(false)
        }
      }}
      onDrop={(e) => {
        e.preventDefault()
        setIsDragging(false)
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          handleFileSelect(e.dataTransfer.files[0])
        }
      }}
      className={`fixed left-0 bottom-0 w-[440px] max-w-[90vw] bg-[#12151d]/98 backdrop-blur-xl border-r border-[#2a3142] flex flex-col shadow-2xl animate-in slide-in-from-left duration-200 ${
        isGridCallOpen ? 'top-0 z-[60]' : 'top-14 z-50'
      }`}
    >
      {/* Drag & Drop Visual Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-indigo-950/85 backdrop-blur-sm border-2 border-dashed border-indigo-400 flex flex-col items-center justify-center gap-2 text-indigo-200 pointer-events-none animate-in fade-in duration-150">
          <Paperclip className="w-10 h-10 text-indigo-400 animate-bounce" />
          <span className="font-bold text-sm">Solte o arquivo para anexar ao chat</span>
          <span className="text-xs text-indigo-300/70">Imagens, PDFs, documentos até 15MB</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a3142] bg-[#1b202c]/50">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-indigo-400" />
          <span className="font-bold text-sm text-slate-100">Chat & Canais</span>
        </div>
        <button
          onClick={() => setChatOpen(false)}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          title="Fechar chat"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sub-sidebar: Channels & DMs */}
        <div className="w-36 bg-[#0c0e14]/60 border-r border-[#2a3142] flex flex-col p-2 space-y-4 overflow-y-auto shrink-0">
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
        <div className="flex-1 flex flex-col bg-[#12151d] overflow-hidden">
          {/* Channel Info Bar */}
          <div className="px-3 py-2 border-b border-[#2a3142] flex items-center justify-between bg-[#1b202c]/20 shrink-0">
            <div className="flex items-center gap-1.5 truncate">
              <Hash className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-xs font-bold text-slate-200 truncate">{activeChannel.name}</span>
            </div>
            <span className="text-[10px] text-slate-400 truncate max-w-[180px]">{activeChannel.description}</span>
          </div>

          {/* Messages List */}
          <div className="flex-1 p-3 overflow-y-auto space-y-3">
            {filteredMessages.length === 0 ? (
              <div className="text-center text-xs text-slate-400 py-8">
                Nenhuma mensagem enviada ainda. Envie uma mensagem ou arquivo!
              </div>
            ) : (
              filteredMessages.map((msg) => {
                const isMine = msg.senderId === localPlayer.id
                const hasAttachment = !!msg.attachment
                const isImage = hasAttachment && isImageAttachment(msg.attachment!)

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

                    <div className="text-xs text-slate-200 bg-[#1b202c] p-2.5 rounded-xl border border-[#2a3142]/60 break-words space-y-2">
                      {/* Text content if present */}
                      {msg.content && <div>{msg.content}</div>}

                      {/* File / Image Attachment */}
                      {hasAttachment && msg.attachment && (
                        <div>
                          {isImage ? (
                            <div className="relative group/img rounded-lg overflow-hidden border border-[#2a3142] bg-black/40 max-w-[280px]">
                              <img
                                src={msg.attachment.dataUrl}
                                alt={msg.attachment.name}
                                className="max-h-48 w-auto object-cover rounded-lg cursor-pointer hover:opacity-95 transition-opacity"
                                onClick={() =>
                                  setLightboxImage({
                                    url: msg.attachment!.dataUrl,
                                    name: msg.attachment!.name,
                                  })
                                }
                              />
                              <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover/img:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setLightboxImage({
                                      url: msg.attachment!.dataUrl,
                                      name: msg.attachment!.name,
                                    })
                                  }
                                  className="p-1 rounded bg-black/70 hover:bg-black/90 text-white backdrop-blur-sm shadow"
                                  title="Expandir imagem"
                                >
                                  <Maximize2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => downloadAttachment(msg.attachment!)}
                                  className="p-1 rounded bg-black/70 hover:bg-black/90 text-white backdrop-blur-sm shadow"
                                  title="Baixar imagem"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <div className="px-2 py-1 bg-black/60 text-[10px] text-slate-300 truncate">
                                {msg.attachment.name} • {formatFileSize(msg.attachment.size)}
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between p-2 bg-[#12151d] hover:bg-[#151923] border border-[#2a3142] rounded-lg gap-2.5 transition-colors group/file">
                              <div className="flex items-center gap-2 overflow-hidden">
                                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                                  <FileText className="w-4 h-4" />
                                </div>
                                <div className="overflow-hidden">
                                  <div className="text-xs font-semibold text-slate-200 truncate max-w-[150px] group-hover/file:text-indigo-300 transition-colors">
                                    {msg.attachment.name}
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    {formatFileSize(msg.attachment.size)}
                                  </div>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => downloadAttachment(msg.attachment!)}
                                className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-medium rounded-lg flex items-center gap-1.5 shadow transition-all shrink-0 active:scale-95"
                                title="Baixar arquivo"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>Baixar</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
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

          {/* Message Input & Attachment Bar */}
          <form onSubmit={handleSendMessage} className="p-3 border-t border-[#2a3142] bg-[#1b202c]/40 shrink-0">
            {/* Error banner if upload exceeds limit */}
            {uploadError && (
              <div className="mb-2 px-2.5 py-1.5 bg-rose-500/10 border border-rose-500/30 rounded-lg flex items-center justify-between text-xs text-rose-300 animate-in fade-in duration-150">
                <div className="flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>{uploadError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setUploadError(null)}
                  className="text-rose-400 hover:text-rose-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Pending Attachment Preview Chip */}
            {pendingAttachment && (
              <div className="mb-2 p-2 bg-[#1b202c] border border-indigo-500/40 rounded-xl flex items-center justify-between gap-2 shadow-lg animate-in slide-in-from-bottom-1 duration-150">
                <div className="flex items-center gap-2 overflow-hidden">
                  {isImageAttachment(pendingAttachment) ? (
                    <img
                      src={pendingAttachment.dataUrl}
                      alt={pendingAttachment.name}
                      className="w-9 h-9 object-cover rounded-lg border border-[#2a3142] shrink-0"
                    />
                  ) : (
                    <div className="w-9 h-9 bg-indigo-500/20 border border-indigo-500/30 rounded-lg flex items-center justify-center text-indigo-400 shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                  )}
                  <div className="overflow-hidden">
                    <div className="text-xs font-semibold text-slate-100 truncate max-w-[200px]">
                      {pendingAttachment.name}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {formatFileSize(pendingAttachment.size)}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPendingAttachment(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  title="Remover anexo"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="flex items-center gap-2 bg-[#12151d] border border-[#2a3142] rounded-xl px-2.5 py-1.5 focus-within:border-indigo-500 transition-colors">
              {/* Hidden File Input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileSelect(e.target.files[0])
                    e.target.value = ''
                  }
                }}
                className="hidden"
              />

              {/* Attach File Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-1 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-slate-800/60 transition-colors"
                title="Anexar arquivo ou imagem (até 15MB)"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              {/* Text Input with Paste listener */}
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onPaste={(e) => {
                  if (e.clipboardData.files && e.clipboardData.files.length > 0) {
                    e.preventDefault()
                    handleFileSelect(e.clipboardData.files[0])
                  }
                }}
                placeholder={
                  pendingAttachment
                    ? 'Adicione uma legenda (opcional)...'
                    : `Mensagem em #${activeChannel.name}...`
                }
                className="flex-1 bg-transparent text-xs text-slate-100 placeholder-slate-400 focus:outline-none"
              />

              {/* Send Button */}
              <button
                type="submit"
                disabled={!inputMessage.trim() && !pendingAttachment}
                className="p-1.5 rounded-lg text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 disabled:opacity-30 disabled:hover:bg-transparent transition-all active:scale-95"
                title="Enviar"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Lightbox Modal for Full Image View */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[88vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between text-slate-200 mb-2 px-2">
              <span className="text-xs font-semibold truncate max-w-sm">{lightboxImage.name}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    downloadAttachment({
                      id: '',
                      name: lightboxImage.name,
                      size: 0,
                      type: 'image/png',
                      dataUrl: lightboxImage.url,
                    })
                  }
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors flex items-center gap-1.5 text-xs font-medium"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLightboxImage(null)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <img
              src={lightboxImage.url}
              alt={lightboxImage.name}
              className="max-w-full max-h-[78vh] object-contain rounded-2xl border border-white/10 shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  )
}
