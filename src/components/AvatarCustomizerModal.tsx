import React, { useState, useEffect, useRef } from 'react'
import { X, Check, Smile, User, Palette } from 'lucide-react'
import { useGameStore } from '../store/useGameStore'
import { AvatarConfig, PresenceStatus } from '../types/game'
import { AvatarRenderer } from '../engine/AvatarRenderer'
import { PeerManager } from '../p2p/PeerManager'

interface Props {
  isOpen: boolean
  onClose: () => void
}

export const AvatarCustomizerModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { localPlayer, setLocalPlayer, setLocalStatus } = useGameStore()

  const [name, setName] = useState(localPlayer.name)
  const [avatar, setAvatar] = useState<AvatarConfig>({ ...localPlayer.avatar })
  const [status, setStatus] = useState<PresenceStatus>(localPlayer.status)
  const [statusText, setStatusText] = useState(localPlayer.statusText || 'Disponível')
  const [statusEmoji, setStatusEmoji] = useState(localPlayer.statusEmoji || '💻')
  const [activeTab, setActiveTab] = useState<'hair' | 'clothes' | 'face' | 'status'>('hair')

  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null)

  // Live Canvas Preview Animation
  useEffect(() => {
    if (!isOpen || !previewCanvasRef.current) return
    const canvas = previewCanvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.imageSmoothingEnabled = false
    let frameId: number

    const render = (tick: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.save()
      ctx.scale(3, 3) // 3x zoom for clear preview

      const tempPlayer = {
        ...localPlayer,
        name,
        avatar,
        status,
        statusText,
        statusEmoji,
        direction: 'down' as const,
        isMoving: true,
        x: 0.8,
        y: 0.5,
      }

      AvatarRenderer.drawPlayer(ctx, tempPlayer, true, tick)
      ctx.restore()

      frameId = requestAnimationFrame(render)
    }

    frameId = requestAnimationFrame(render)
    return () => cancelAnimationFrame(frameId)
  }, [isOpen, avatar, name, status, statusText, statusEmoji])

  if (!isOpen) return null

  const handleSave = () => {
    setLocalPlayer({ name, avatar })
    setLocalStatus(status, statusText, statusEmoji)
    PeerManager.getInstance().sendPlayerUpdate({
      name,
      avatar,
      status,
      statusText,
      statusEmoji,
    })
    onClose()
  }

  const skinColors = ['#ffd1a4', '#f5b080', '#e09865', '#ba6c48', '#8c4826', '#5c2d15']
  const hairColors = ['#2b2b2b', '#5c3a21', '#8b5a2b', '#d4a373', '#f4d06f', '#c0392b', '#9b59b6', '#3498db', '#20c997']
  const clothingColors = ['#4c6ef5', '#20c997', '#fa5252', '#fab005', '#be4bdb', '#15aabf', '#fd7e14', '#212529', '#f8f9fa']
  const emojiPresets = ['💻', '🎧', '☕', '🎸', '🍕', '🚀', '🔥', '✨', '🎯', '🥑']

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#1b202c] border border-[#2a3142] rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a3142] bg-[#12151d]/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
              <User className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Personalizar Avatar & Perfil</h2>
              <p className="text-xs text-slate-400">Estilize seu personagem pixel-art e defina seu status</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Top Row: Preview + Name & Status */}
          <div className="flex gap-6 items-center bg-[#12151d]/50 p-4 rounded-2xl border border-[#2a3142]">
            {/* Live Pixel Preview */}
            <div className="w-24 h-24 rounded-2xl bg-[#0c0e14] border border-[#2a3142] flex items-center justify-center overflow-hidden shadow-inner shrink-0">
              <canvas ref={previewCanvasRef} width={96} height={96} className="pixelated" />
            </div>

            {/* Inputs */}
            <div className="flex-1 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Seu Nickname</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#1b202c] border border-[#2a3142] rounded-xl px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                  placeholder="Seu Nome"
                  maxLength={18}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Status Personalizado</label>
                <div className="flex gap-2">
                  <span className="text-lg bg-[#1b202c] border border-[#2a3142] rounded-xl px-2.5 py-1 flex items-center">
                    {statusEmoji}
                  </span>
                  <input
                    type="text"
                    value={statusText}
                    onChange={(e) => setStatusText(e.target.value)}
                    className="flex-1 bg-[#1b202c] border border-[#2a3142] rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                    placeholder="Ex: Codando algo massa..."
                    maxLength={30}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-2 border-b border-[#2a3142] pb-2">
            {[
              { id: 'hair', label: 'Cabelo' },
              { id: 'clothes', label: 'Roupas' },
              { id: 'face', label: 'Acessórios & Pele' },
              { id: 'status', label: 'Presença & Emoji' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* TAB: HAIR */}
          {activeTab === 'hair' && (
            <div className="space-y-4">
              <div>
                <span className="text-xs font-semibold text-slate-300 block mb-2">Estilo de Cabelo</span>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'short', label: 'Curto Moderno' },
                    { id: 'long', label: 'Longo' },
                    { id: 'spiky', label: 'Espetado' },
                    { id: 'curly', label: 'Cacheado' },
                    { id: 'ponytail', label: 'Rabo de Cavalo' },
                    { id: 'buzz', label: 'Raspado' },
                    { id: 'bald', label: 'Careca' },
                  ].map((style) => (
                    <button
                      key={style.id}
                      onClick={() => setAvatar({ ...avatar, hairStyle: style.id as any })}
                      className={`p-2.5 rounded-xl border text-xs font-medium transition-all ${
                        avatar.hairStyle === style.id
                          ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300'
                          : 'border-[#2a3142] bg-[#12151d]/40 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      {style.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-300 block mb-2">Cor do Cabelo</span>
                <div className="flex flex-wrap gap-2">
                  {hairColors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setAvatar({ ...avatar, hairColor: color })}
                      className={`w-8 h-8 rounded-full border-2 transition-transform ${
                        avatar.hairColor === color ? 'border-white scale-110 shadow-lg' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB: CLOTHES */}
          {activeTab === 'clothes' && (
            <div className="space-y-4">
              <div>
                <span className="text-xs font-semibold text-slate-300 block mb-2">Tipo de Roupa</span>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'tshirt', label: 'Camiseta Básica' },
                    { id: 'hoodie', label: 'Moletom / Hoodie' },
                    { id: 'suit', label: 'Terno & Gravata' },
                  ].map((shirt) => (
                    <button
                      key={shirt.id}
                      onClick={() => setAvatar({ ...avatar, shirtType: shirt.id as any })}
                      className={`p-2.5 rounded-xl border text-xs font-medium transition-all ${
                        avatar.shirtType === shirt.id
                          ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300'
                          : 'border-[#2a3142] bg-[#12151d]/40 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      {shirt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-300 block mb-2">Cor da Camisa</span>
                <div className="flex flex-wrap gap-2">
                  {clothingColors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setAvatar({ ...avatar, shirtColor: color })}
                      className={`w-8 h-8 rounded-full border-2 transition-transform ${
                        avatar.shirtColor === color ? 'border-white scale-110 shadow-lg' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-300 block mb-2">Cor da Calça</span>
                <div className="flex flex-wrap gap-2">
                  {clothingColors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setAvatar({ ...avatar, pantsColor: color })}
                      className={`w-8 h-8 rounded-full border-2 transition-transform ${
                        avatar.pantsColor === color ? 'border-white scale-110 shadow-lg' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB: FACE & ACCESSORIES */}
          {activeTab === 'face' && (
            <div className="space-y-4">
              <div>
                <span className="text-xs font-semibold text-slate-300 block mb-2">Tom de Pele</span>
                <div className="flex flex-wrap gap-2">
                  {skinColors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setAvatar({ ...avatar, skinColor: color })}
                      className={`w-8 h-8 rounded-full border-2 transition-transform ${
                        avatar.skinColor === color ? 'border-white scale-110 shadow-lg' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-300 block mb-2">Acessório</span>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'headphones', label: '🎧 Fone Gamer' },
                    { id: 'glasses', label: '👓 Óculos de Grau' },
                    { id: 'sunglasses', label: '🕶️ Óculos Escuros' },
                    { id: 'cap', label: '🧢 Boné' },
                    { id: 'beanie', label: '🧶 Gorro' },
                    { id: 'none', label: 'Nenhum' },
                  ].map((acc) => (
                    <button
                      key={acc.id}
                      onClick={() => setAvatar({ ...avatar, accessory: acc.id as any })}
                      className={`p-2.5 rounded-xl border text-xs font-medium transition-all ${
                        avatar.accessory === acc.id
                          ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300'
                          : 'border-[#2a3142] bg-[#12151d]/40 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      {acc.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB: STATUS & PRESENCE */}
          {activeTab === 'status' && (
            <div className="space-y-4">
              <div>
                <span className="text-xs font-semibold text-slate-300 block mb-2">Estado de Presença</span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'available', label: 'Disponível', color: '#20c997' },
                    { id: 'busy', label: 'Ocupado / Em Call', color: '#fa5252' },
                    { id: 'focusing', label: 'Modo Foco / Não Perturbe', color: '#be4bdb' },
                    { id: 'away', label: 'Ausente / Café', color: '#fab005' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setStatus(s.id as any)}
                      className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs font-medium transition-all ${
                        status === s.id
                          ? 'border-indigo-500 bg-indigo-500/10 text-slate-100'
                          : 'border-[#2a3142] bg-[#12151d]/40 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-300 block mb-2">Emoji Rápido de Status</span>
                <div className="flex flex-wrap gap-2">
                  {emojiPresets.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => setStatusEmoji(emoji)}
                      className={`w-10 h-10 rounded-xl text-lg flex items-center justify-center border transition-all ${
                        statusEmoji === emoji
                          ? 'border-indigo-500 bg-indigo-500/20 scale-110'
                          : 'border-[#2a3142] bg-[#12151d]/50 hover:bg-slate-800'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#2a3142] bg-[#12151d]/80 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all"
          >
            <Check className="w-4 h-4" />
            Salvar Alterações
          </button>
        </div>
      </div>
    </div>
  )
}
