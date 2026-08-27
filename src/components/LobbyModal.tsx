import React, { useState } from 'react'
import { PlusCircle, LogIn, Sparkles, User, Shield, Video, Mic, Volume2 } from 'lucide-react'
import { useGameStore } from '../store/useGameStore'
import { PeerManager } from '../p2p/PeerManager'
import { MediaManager } from '../media/MediaManager'

interface Props {
  onJoined: () => void
  onOpenAvatarCustomizer: () => void
}

export const LobbyModal: React.FC<Props> = ({ onJoined, onOpenAvatarCustomizer }) => {
  const { localPlayer, setLocalPlayer } = useGameStore()

  const [mode, setMode] = useState<'create' | 'join'>('create')
  const [roomInput, setRoomInput] = useState('')
  const [userName, setUserName] = useState(localPlayer.name)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userName.trim()) {
      setError('Por favor, informe seu nickname.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // 1. Update player name
      setLocalPlayer({ name: userName.trim() })

      // 2. Initialize media stream (Camera & Mic with Noise Suppressor)
      await MediaManager.getInstance().startMedia(true, true)

      // 3. Create or Join Room
      if (mode === 'create') {
        const generatedCode = 'GATHER-' + Math.random().toString(36).substring(2, 7).toUpperCase()
        await PeerManager.getInstance().createRoom(generatedCode, {
          ...localPlayer,
          name: userName.trim(),
        })
      } else {
        if (!roomInput.trim()) {
          setError('Por favor, insira o código da sala.')
          setLoading(false)
          return
        }
        await PeerManager.getInstance().joinRoom(roomInput.trim(), {
          ...localPlayer,
          name: userName.trim(),
        })
      }

      onJoined()
    } catch (err: any) {
      console.error(err)
      setError('Não foi possível conectar. Verifique o código da sala e tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0c0e14]/90 backdrop-blur-xl p-4 select-none animate-in fade-in duration-300">
      <div className="bg-[#1b202c] border border-[#2a3142] rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
        {/* Banner Header */}
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-8 text-center relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-36 h-36 rounded-full bg-white/10 blur-2xl" />
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-3xl font-extrabold text-white shadow-xl mb-3">
              G
            </div>
            <h1 className="text-xl font-extrabold text-white tracking-tight">Gather V2 Desktop</h1>
            <p className="text-xs text-indigo-100 mt-1">Seu escritório virtual em pixel art para chamadas com amigos</p>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleStart} className="p-6 space-y-5">
          {/* User Nickname & Avatar Button */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Seu Nickname</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Ex: Lucas, Carol..."
                className="flex-1 bg-[#12151d] border border-[#2a3142] rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                maxLength={18}
                required
              />
              <button
                type="button"
                onClick={onOpenAvatarCustomizer}
                className="px-3 py-2 bg-[#12151d] hover:bg-slate-800 border border-[#2a3142] rounded-xl text-xs font-semibold text-indigo-400 flex items-center gap-1.5 transition-colors"
                title="Personalizar Avatar Pixel Art"
              >
                <User className="w-4 h-4" />
                <span>Avatar</span>
              </button>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-[#12151d] rounded-2xl border border-[#2a3142]">
            <button
              type="button"
              onClick={() => setMode('create')}
              className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                mode === 'create'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              Criar Espaço
            </button>
            <button
              type="button"
              onClick={() => setMode('join')}
              className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                mode === 'join'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LogIn className="w-4 h-4" />
              Entrar em Sala
            </button>
          </div>

          {/* Join Code Input */}
          {mode === 'join' && (
            <div className="space-y-1.5 animate-in fade-in duration-150">
              <label className="block text-xs font-semibold text-slate-300">Código da Sala</label>
              <input
                type="text"
                value={roomInput}
                onChange={(e) => setRoomInput(e.target.value.toUpperCase())}
                placeholder="Ex: GATHER-A9K3F"
                className="w-full bg-[#12151d] border border-[#2a3142] rounded-xl px-3.5 py-2 text-sm font-mono text-indigo-300 tracking-wider uppercase focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}

          {/* Features highlight */}
          <div className="bg-[#12151d]/60 rounded-2xl p-3 border border-[#2a3142]/60 space-y-2 text-[11px] text-slate-400">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Supressor de Ruído DSP ativado automaticamente</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>Rede P2P WebRTC direta sem servidores terceiros</span>
            </div>
          </div>

          {/* Error message */}
          {error && <div className="text-xs text-rose-400 bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/30">{error}</div>}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 transition-all active:scale-98 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span>Conectando ao Espaço...</span>
            ) : mode === 'create' ? (
              <span>Criar e Entrar no Espaço</span>
            ) : (
              <span>Entrar na Sala</span>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
