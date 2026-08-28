import React, { useState } from 'react'
import {
  PlusCircle,
  LogIn,
  Sparkles,
  User,
  Shield,
  LayoutGrid,
  DoorOpen,
  Edit2,
  Check,
  X,
  Trash2,
  Plus,
  ArrowRight,
  Globe,
} from 'lucide-react'
import { useGameStore } from '../store/useGameStore'
import { useMapStore } from '../store/useMapStore'
import { useMediaStore } from '../store/useMediaStore'
import { PeerManager } from '../p2p/PeerManager'
import { MediaManager } from '../media/MediaManager'
import { PrivateZone } from '../types/map'

export interface AvailableRoomItem {
  id: string
  name: string
  code: string
  color: string
  description?: string
}

const AVAILABLE_ROOMS_KEY = 'gather_v2_available_rooms'

const loadAvailableRooms = (): AvailableRoomItem[] => {
  try {
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      const raw = window.localStorage.getItem(AVAILABLE_ROOMS_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) return parsed
      }
    }
  } catch (e) {
    // Ignore
  }
  return []
}

const saveAvailableRooms = (rooms: AvailableRoomItem[]) => {
  try {
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      window.localStorage.setItem(AVAILABLE_ROOMS_KEY, JSON.stringify(rooms))
    }
  } catch (e) {
    // Ignore
  }
}

interface Props {
  onJoined: () => void
  onOpenAvatarCustomizer: () => void
}

export const LobbyModal: React.FC<Props> = ({ onJoined, onOpenAvatarCustomizer }) => {
  const { localPlayer, setLocalPlayer } = useGameStore()
  const { mapData, renameZone, removeZone, addOrUpdateZone } = useMapStore()

  const [activeTab, setActiveTab] = useState<'connect' | 'saved_rooms' | 'available_rooms'>('connect')
  const [mode, setMode] = useState<'create' | 'join'>('create')
  const [roomInput, setRoomInput] = useState('')
  const [userName, setUserName] = useState(localPlayer.name)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 1. Saved Rooms inline editing
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null)
  const [editingZoneName, setEditingZoneName] = useState('')

  const handleStartEditingZone = (zone: PrivateZone) => {
    setEditingZoneId(zone.id)
    setEditingZoneName(zone.name)
  }

  const handleSaveEditingZone = (zoneId: string) => {
    if (editingZoneName.trim()) {
      renameZone(zoneId, editingZoneName.trim())
    }
    setEditingZoneId(null)
  }

  const handleCreateQuickZone = () => {
    const randomColors = ['#4c6ef5', '#20c997', '#fa5252', '#fab005', '#be4bdb', '#15aabf']
    const color = randomColors[Math.floor(Math.random() * randomColors.length)]
    const newZone: PrivateZone = {
      id: 'zone-' + Math.random().toString(36).substring(2, 7),
      name: `Nova Sala ${mapData.zones.length + 1}`,
      color,
      x: 3 + (mapData.zones.length % 3) * 8,
      y: 3 + Math.floor(mapData.zones.length / 3) * 8,
      width: 7,
      height: 6,
      description: 'Sala de reunião e conversa privada',
    }
    addOrUpdateZone(newZone)
    setEditingZoneId(newZone.id)
    setEditingZoneName(newZone.name)
  }

  // 2. Available Rooms (Salas Disponíveis) state & inline editing
  const [availableRooms, setAvailableRooms] = useState<AvailableRoomItem[]>(loadAvailableRooms)
  const [editingAvailableId, setEditingAvailableId] = useState<string | null>(null)
  const [editingAvailableName, setEditingAvailableName] = useState('')

  const handleStartEditingAvailable = (room: AvailableRoomItem) => {
    setEditingAvailableId(room.id)
    setEditingAvailableName(room.name)
  }

  const handleSaveEditingAvailable = (roomId: string) => {
    if (editingAvailableName.trim()) {
      const updated = availableRooms.map((r) =>
        r.id === roomId ? { ...r, name: editingAvailableName.trim() } : r
      )
      setAvailableRooms(updated)
      saveAvailableRooms(updated)
    }
    setEditingAvailableId(null)
  }

  const handleCreateAvailableRoom = () => {
    const randomColors = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4']
    const color = randomColors[Math.floor(Math.random() * randomColors.length)]
    const code = 'GATHER-' + Math.random().toString(36).substring(2, 7).toUpperCase()
    const newRoom: AvailableRoomItem = {
      id: 'avail-' + Math.random().toString(36).substring(2, 7),
      name: `Servidor Disponível ${availableRooms.length + 1}`,
      code,
      color,
      description: 'Sala pública disponível para todos',
    }
    const updated = [newRoom, ...availableRooms]
    setAvailableRooms(updated)
    saveAvailableRooms(updated)
    setEditingAvailableId(newRoom.id)
    setEditingAvailableName(newRoom.name)
  }

  const handleDeleteAvailableRoom = (id: string) => {
    const updated = availableRooms.filter((r) => r.id !== id)
    setAvailableRooms(updated)
    saveAvailableRooms(updated)
  }

  const handleJoinAvailableRoom = async (code: string) => {
    if (!userName.trim()) {
      setError('Por favor, informe seu nickname.')
      setActiveTab('connect')
      return
    }

    setLoading(true)
    setError(null)

    try {
      setLocalPlayer({ name: userName.trim() })
      await MediaManager.getInstance().startMedia(true, true)
      await PeerManager.getInstance().joinRoom(code, {
        ...localPlayer,
        name: userName.trim(),
      })
      onJoined()
    } catch (err: any) {
      console.error(err)
      setError('Não foi possível conectar a esta sala disponível.')
    } finally {
      setLoading(false)
    }
  }

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

  // 1-Click Join Space from Saved Rooms tab
  const handleQuickEnterSpace = async () => {
    if (!userName.trim()) {
      setError('Por favor, informe seu nickname.')
      setActiveTab('connect')
      return
    }

    setLoading(true)
    setError(null)

    try {
      setLocalPlayer({ name: userName.trim() })
      await MediaManager.getInstance().startMedia(true, true)
      const generatedCode = 'GATHER-' + Math.random().toString(36).substring(2, 7).toUpperCase()
      await PeerManager.getInstance().createRoom(generatedCode, {
        ...localPlayer,
        name: userName.trim(),
      })
      onJoined()
    } catch (err: any) {
      console.error(err)
      setError('Não foi possível entrar no espaço.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0c0e14]/90 backdrop-blur-xl p-4 select-none animate-in fade-in duration-300">
      <div className="bg-[#1b202c] border border-[#2a3142] rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Banner Header */}
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-6 text-center relative overflow-hidden shrink-0">
          <div className="absolute -top-12 -right-12 w-36 h-36 rounded-full bg-white/10 blur-2xl" />
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-2xl font-extrabold text-white shadow-xl mb-2">
              G
            </div>
            <h1 className="text-lg font-extrabold text-white tracking-tight">Gather V2 Desktop</h1>
            <p className="text-xs text-indigo-100">Seu escritório virtual em pixel art com áudio e salas privadas</p>
          </div>
        </div>

        {/* Tab Navigation: Conectar vs Salas Salvas vs Salas Disponíveis */}
        <div className="flex border-b border-[#2a3142] bg-[#12151d]/70 px-6 pt-3 gap-2 shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('connect')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 shrink-0 ${
              activeTab === 'connect'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <DoorOpen className="w-3.5 h-3.5" />
            <span>Conectar</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('saved_rooms')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 shrink-0 ${
              activeTab === 'saved_rooms'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Salas Salvas</span>
            <span className="bg-indigo-500/20 text-indigo-300 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              {mapData.zones.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('available_rooms')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 shrink-0 ${
              activeTab === 'available_rooms'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-blue-400" />
            <span>Salas Disponíveis</span>
            <span className="bg-blue-500/20 text-blue-300 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              {availableRooms.length}
            </span>
          </button>
        </div>

        {/* TAB 1: CONECTAR */}
        {activeTab === 'connect' && (
          <form onSubmit={handleStart} className="p-6 space-y-4 overflow-y-auto">
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
                  className="px-3.5 py-2 bg-[#12151d] hover:bg-slate-800 border border-[#2a3142] rounded-xl text-xs font-semibold text-indigo-400 flex items-center gap-1.5 transition-colors"
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

            {/* Features highlight & Audio Quick Config */}
            <div className="bg-[#12151d]/60 rounded-2xl p-3 border border-[#2a3142]/60 space-y-2 text-[11px] text-slate-400">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Supressor de Ruído DSP & Anti-Eco ativados</span>
                </div>
                <button
                  type="button"
                  onClick={() => useMediaStore.getState().setSettingsModalOpen(true)}
                  className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 underline"
                >
                  Configurar Áudio
                </button>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>Salas salvas automaticamente no seu espaço</span>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="text-xs text-rose-400 bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/30">
                {error}
              </div>
            )}

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
        )}

        {/* TAB 2: SALAS SALVAS (ZONAS DO ESPAÇO) */}
        {activeTab === 'saved_rooms' && (
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-200">Minhas Salas Salvas</h3>
                <p className="text-[11px] text-slate-400">Salas privadas e zonas configuradas no seu espaço</p>
              </div>
              <button
                type="button"
                onClick={handleCreateQuickZone}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nova Sala</span>
              </button>
            </div>

            {/* List of Saved Rooms */}
            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
              {mapData.zones.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs bg-[#12151d] rounded-2xl border border-[#2a3142] p-4">
                  Nenhuma sala salva no momento. Clique em "+ Nova Sala" para criar!
                </div>
              ) : (
                mapData.zones.map((zone) => {
                  const isEditing = editingZoneId === zone.id
                  return (
                    <div
                      key={zone.id}
                      className="flex items-center justify-between p-3 rounded-2xl bg-[#12151d] border border-[#2a3142] hover:border-slate-600 transition-all group"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
                        {/* Zone Color Indicator */}
                        <div
                          className="w-4 h-4 rounded-full shrink-0 shadow-sm"
                          style={{ backgroundColor: zone.color || '#4c6ef5' }}
                        />

                        {/* Name or Inline Editor */}
                        {isEditing ? (
                          <div className="flex items-center gap-1.5 flex-1">
                            <input
                              type="text"
                              value={editingZoneName}
                              onChange={(e) => setEditingZoneName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEditingZone(zone.id)
                                if (e.key === 'Escape') setEditingZoneId(null)
                              }}
                              autoFocus
                              className="bg-[#1b202c] border border-indigo-500 rounded-lg px-2.5 py-1 text-xs font-bold text-white focus:outline-none flex-1"
                              maxLength={30}
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveEditingZone(zone.id)}
                              className="p-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500"
                              title="Salvar Nome"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingZoneId(null)}
                              className="p-1 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600"
                              title="Cancelar"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-bold text-slate-100 truncate">{zone.name}</span>
                            <span className="text-[10px] text-slate-400">
                              Área: {zone.width}x{zone.height} tiles • Privada
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      {!isEditing && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleStartEditingZone(zone)}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                            title="Editar Nome da Sala"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeZone(zone.id)}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="Excluir Sala"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>

            {/* Quick Enter Space Button */}
            <button
              type="button"
              onClick={handleQuickEnterSpace}
              disabled={loading}
              className="w-full py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all active:scale-98 flex items-center justify-center gap-2"
            >
              <span>Entrar no Meu Espaço</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* TAB 3: SALAS DISPONÍVEIS (SERVIDORES PÚBLICOS / COMPARTILHADOS) */}
        {activeTab === 'available_rooms' && (
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-200">Salas Disponíveis</h3>
                <p className="text-[11px] text-slate-400">Salas públicas abertas para entrar ou gerenciar</p>
              </div>
              <button
                type="button"
                onClick={handleCreateAvailableRoom}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nova Sala</span>
              </button>
            </div>

            {/* List of Available Rooms */}
            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
              {availableRooms.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs bg-[#12151d] rounded-2xl border border-[#2a3142] p-4">
                  Nenhuma sala disponível no momento. Clique em "+ Nova Sala" para adicionar uma sala pública!
                </div>
              ) : (
                availableRooms.map((room) => {
                  const isEditing = editingAvailableId === room.id
                  return (
                    <div
                      key={room.id}
                      className="flex items-center justify-between p-3 rounded-2xl bg-[#12151d] border border-[#2a3142] hover:border-slate-600 transition-all group"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
                        {/* Room Color Indicator */}
                        <div
                          className="w-4 h-4 rounded-full shrink-0 shadow-sm"
                          style={{ backgroundColor: room.color || '#3b82f6' }}
                        />

                        {/* Name or Inline Editor */}
                        {isEditing ? (
                          <div className="flex items-center gap-1.5 flex-1">
                            <input
                              type="text"
                              value={editingAvailableName}
                              onChange={(e) => setEditingAvailableName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEditingAvailable(room.id)
                                if (e.key === 'Escape') setEditingAvailableId(null)
                              }}
                              autoFocus
                              className="bg-[#1b202c] border border-indigo-500 rounded-lg px-2.5 py-1 text-xs font-bold text-white focus:outline-none flex-1"
                              maxLength={30}
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveEditingAvailable(room.id)}
                              className="p-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500"
                              title="Salvar Nome"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingAvailableId(null)}
                              className="p-1 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600"
                              title="Cancelar"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-bold text-slate-100 truncate">{room.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              Código: {room.code}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      {!isEditing && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleJoinAvailableRoom(room.code)}
                            disabled={loading}
                            className="px-3 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1 shadow-sm transition-all active:scale-95"
                            title="Entrar nesta sala"
                          >
                            <span>Entrar</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStartEditingAvailable(room)}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                            title="Editar Nome da Sala"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteAvailableRoom(room.id)}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="Excluir Sala"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
