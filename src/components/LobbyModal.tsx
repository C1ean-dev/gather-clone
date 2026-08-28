import React, { useState, useEffect } from 'react'
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
  Globe,
  Search,
  Users,
  ArrowRight,
  Coffee,
  Code2,
  Gamepad2,
  BookOpen,
  Briefcase,
  Layers,
} from 'lucide-react'
import { useGameStore } from '../store/useGameStore'
import { useMapStore } from '../store/useMapStore'
import { useMediaStore } from '../store/useMediaStore'
import { PeerManager } from '../p2p/PeerManager'
import { MediaManager } from '../media/MediaManager'
import { PrivateZone } from '../types/map'
import { PublicSpaceInfo } from '../types/game'

const PUBLIC_SPACES_KEY = 'gather_v2_public_spaces'

const DEFAULT_PUBLIC_SPACES: PublicSpaceInfo[] = [
  {
    id: 'pub-tech-hub',
    name: '🏢 Gather Central Hub - Tech & Devs',
    description: 'Espaço principal da comunidade para troca de ideias sobre programação, IA e projetos.',
    category: 'tech',
    onlineCount: 14,
    code: 'GATHER-PUBLIC-TECH',
    color: '#3b82f6',
    tags: ['#programação', '#tecnologia', '#ia', '#devs'],
    isOfficial: true,
  },
  {
    id: 'pub-lounge-cafe',
    name: '☕ Lounge & Café Co-work',
    description: 'Ambiente descontraído para bater papo, networking informal e relaxar com um cafezinho virtual.',
    category: 'lounge',
    onlineCount: 8,
    code: 'GATHER-PUBLIC-LOUNGE',
    color: '#f59e0b',
    tags: ['#café', '#chill', '#conversa', '#networking'],
    isOfficial: true,
  },
  {
    id: 'pub-gaming-chill',
    name: '🎮 Sala Gamer & Boardgames',
    description: 'Encontro para quem curte conversar sobre jogos retrô, indie games e jogatinas multiplayer.',
    category: 'gaming',
    onlineCount: 11,
    code: 'GATHER-PUBLIC-GAMES',
    color: '#ec4899',
    tags: ['#jogos', '#pixelart', '#rpg', '#diversão'],
    isOfficial: true,
  },
  {
    id: 'pub-startup-hq',
    name: '🚀 Startup HQ & Coworking 24/7',
    description: 'Escritório colaborativo com mesas para sprints, pitch de projetos e foco em equipe.',
    category: 'office',
    onlineCount: 6,
    code: 'GATHER-PUBLIC-STARTUP',
    color: '#10b981',
    tags: ['#startups', '#empreendedorismo', '#foco'],
    isOfficial: true,
  },
  {
    id: 'pub-study-library',
    name: '📚 Biblioteca & Modo Foco Silencioso',
    description: 'Sala de estudos Pomodoro silenciosa. Microfones fechados e concentração total.',
    category: 'study',
    onlineCount: 9,
    code: 'GATHER-PUBLIC-STUDY',
    color: '#8b5cf6',
    tags: ['#estudos', '#pomodoro', '#silêncio', '#livros'],
    isOfficial: true,
  },
]

const loadSavedPublicSpaces = (): PublicSpaceInfo[] => {
  try {
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      const raw = window.localStorage.getItem(PUBLIC_SPACES_KEY)
      if (raw) {
        return JSON.parse(raw)
      }
    }
  } catch (e) {
    // Ignore
  }
  return DEFAULT_PUBLIC_SPACES
}

const savePublicSpaces = (spaces: PublicSpaceInfo[]) => {
  try {
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      window.localStorage.setItem(PUBLIC_SPACES_KEY, JSON.stringify(spaces))
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

  const [activeTab, setActiveTab] = useState<'connect' | 'public_servers' | 'rooms'>('connect')
  const [mode, setMode] = useState<'create' | 'join'>('create')
  const [roomInput, setRoomInput] = useState('')
  const [userName, setUserName] = useState(localPlayer.name)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Public Spaces state
  const [publicSpaces, setPublicSpaces] = useState<PublicSpaceInfo[]>(loadSavedPublicSpaces)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [isCreatingPublicSpace, setIsCreatingPublicSpace] = useState(false)
  const [newSpaceName, setNewSpaceName] = useState('')
  const [newSpaceDesc, setNewSpaceDesc] = useState('')
  const [newSpaceCategory, setNewSpaceCategory] = useState<'tech' | 'lounge' | 'gaming' | 'office' | 'study'>('tech')

  // Rooms inline editing
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null)
  const [editingZoneName, setEditingZoneName] = useState('')

  const handleStartEditing = (zone: PrivateZone) => {
    setEditingZoneId(zone.id)
    setEditingZoneName(zone.name)
  }

  const handleSaveEditing = (zoneId: string) => {
    if (editingZoneName.trim()) {
      renameZone(zoneId, editingZoneName.trim())
    }
    setEditingZoneId(null)
  }

  const handleCreateQuickRoom = () => {
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

  // 1-Click Join Public Room
  const handleJoinPublicRoom = async (roomCode: string) => {
    if (!userName.trim()) {
      setError('Por favor, informe seu nickname antes de entrar.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      setLocalPlayer({ name: userName.trim() })
      await MediaManager.getInstance().startMedia(true, true)
      await PeerManager.getInstance().joinRoom(roomCode, {
        ...localPlayer,
        name: userName.trim(),
      })
      onJoined()
    } catch (err: any) {
      console.error(err)
      setError('Não foi possível conectar a este servidor público no momento.')
    } finally {
      setLoading(false)
    }
  }

  // Create Custom Public Space
  const handleCreateCustomPublicSpace = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSpaceName.trim()) return

    const categoryColors = {
      tech: '#3b82f6',
      lounge: '#f59e0b',
      gaming: '#ec4899',
      office: '#10b981',
      study: '#8b5cf6',
    }

    const generatedCode = 'GATHER-' + Math.random().toString(36).substring(2, 8).toUpperCase()

    const created: PublicSpaceInfo = {
      id: 'pub-' + Math.random().toString(36).substring(2, 8),
      name: newSpaceName.trim(),
      description: newSpaceDesc.trim() || 'Servidor comunitário aberto para todos.',
      category: newSpaceCategory,
      onlineCount: 1,
      code: generatedCode,
      color: categoryColors[newSpaceCategory],
      tags: [`#${newSpaceCategory}`, '#comunidade'],
    }

    const updated = [created, ...publicSpaces]
    setPublicSpaces(updated)
    savePublicSpaces(updated)

    setIsCreatingPublicSpace(false)
    setNewSpaceName('')
    setNewSpaceDesc('')
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

  // Filter public spaces by search and category
  const filteredPublicSpaces = publicSpaces.filter((space) => {
    const matchesSearch =
      space.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      space.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      space.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesCat = categoryFilter === 'all' || space.category === categoryFilter
    return matchesSearch && matchesCat
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0c0e14]/90 backdrop-blur-xl p-4 select-none animate-in fade-in duration-300">
      <div className="bg-[#1b202c] border border-[#2a3142] rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
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

        {/* Tab Navigation: Conectar vs Servidores Públicos vs Minhas Salas Salvas */}
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
            onClick={() => setActiveTab('public_servers')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 shrink-0 ${
              activeTab === 'public_servers'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-blue-400" />
            <span>Salas Disponíveis (Públicas)</span>
            <span className="bg-blue-500/20 text-blue-300 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              {publicSpaces.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('rooms')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 shrink-0 ${
              activeTab === 'rooms'
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

        {/* TAB 2: SERVIDORES PÚBLICOS & SALAS DISPONÍVEIS */}
        {activeTab === 'public_servers' && (
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            {/* Header & New Space Button */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-blue-400" />
                  <span>Salas Públicas Disponíveis</span>
                </h3>
                <p className="text-[11px] text-slate-400">Entre em espaços abertos da comunidade com 1 clique</p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreatingPublicSpace(!isCreatingPublicSpace)}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Criar Espaço Público</span>
              </button>
            </div>

            {/* Modal for Creating Public Space */}
            {isCreatingPublicSpace && (
              <form
                onSubmit={handleCreateCustomPublicSpace}
                className="p-3.5 rounded-2xl bg-[#12151d] border border-indigo-500/40 space-y-3 animate-in fade-in duration-150 shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-300">Novo Espaço Comunitário</span>
                  <button
                    type="button"
                    onClick={() => setIsCreatingPublicSpace(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <input
                  type="text"
                  value={newSpaceName}
                  onChange={(e) => setNewSpaceName(e.target.value)}
                  placeholder="Nome do Espaço (Ex: Sala de Estudos Python)"
                  maxLength={35}
                  required
                  className="w-full bg-[#1b202c] border border-[#2a3142] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
                <input
                  type="text"
                  value={newSpaceDesc}
                  onChange={(e) => setNewSpaceDesc(e.target.value)}
                  placeholder="Descrição breve do objetivo da sala"
                  maxLength={80}
                  className="w-full bg-[#1b202c] border border-[#2a3142] rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
                <div className="flex gap-2 items-center justify-between">
                  <div className="flex gap-1">
                    {(['tech', 'lounge', 'gaming', 'office', 'study'] as const).map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setNewSpaceCategory(cat)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${
                          newSpaceCategory === cat
                            ? 'bg-indigo-600 text-white'
                            : 'bg-[#1b202c] text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 shadow"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Publicar</span>
                  </button>
                </div>
              </form>
            )}

            {/* Search Bar & Category Filters */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar salas públicas por nome ou tags..."
                  className="w-full bg-[#12151d] border border-[#2a3142] rounded-xl pl-9 pr-3.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Category Filter Pills */}
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {[
                  { id: 'all', label: 'Todas' },
                  { id: 'tech', label: '💻 Tech' },
                  { id: 'lounge', label: '☕ Lounge' },
                  { id: 'gaming', label: '🎮 Games' },
                  { id: 'office', label: '🏢 Escritório' },
                  { id: 'study', label: '📚 Estudo' },
                ].map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategoryFilter(c.id)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all shrink-0 ${
                      categoryFilter === c.id
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-[#12151d] text-slate-400 hover:text-slate-200 border border-[#2a3142]'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* List of Public Spaces */}
            <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
              {filteredPublicSpaces.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs bg-[#12151d] rounded-2xl border border-[#2a3142] p-4">
                  Nenhum servidor público encontrado com esse termo.
                </div>
              ) : (
                filteredPublicSpaces.map((space) => (
                  <div
                    key={space.id}
                    className="p-3.5 rounded-2xl bg-[#12151d] border border-[#2a3142] hover:border-indigo-500/60 transition-all flex flex-col gap-2 group shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div
                          className="w-3.5 h-3.5 rounded-full mt-1 shrink-0 shadow-sm"
                          style={{ backgroundColor: space.color }}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-100 truncate">{space.name}</span>
                            {space.isOfficial && (
                              <span className="text-[9px] bg-blue-500/20 text-blue-300 font-extrabold px-1.5 py-0.2 rounded border border-blue-500/30">
                                OFICIAL
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{space.description}</p>
                        </div>
                      </div>

                      {/* Online count */}
                      <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full shrink-0 border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span>{space.onlineCount} online</span>
                      </div>
                    </div>

                    {/* Bottom Row: Tags & Direct Join Button */}
                    <div className="flex items-center justify-between pt-1 border-t border-[#2a3142]/60">
                      <div className="flex gap-1.5 flex-wrap">
                        {space.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] text-indigo-400 bg-indigo-500/10 px-1.5 py-0.2 rounded font-medium"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleJoinPublicRoom(space.code)}
                        disabled={loading}
                        className="px-3.5 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition-all active:scale-95"
                      >
                        <span>Entrar</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 3: SALAS SALVAS & EDIÇÃO DE NOMES */}
        {activeTab === 'rooms' && (
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-200">Minhas Salas Privadas</h3>
                <p className="text-[11px] text-slate-400">Edite os nomes das salas do seu espaço ou crie novas</p>
              </div>
              <button
                type="button"
                onClick={handleCreateQuickRoom}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nova Sala</span>
              </button>
            </div>

            {/* List of Saved Zones */}
            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
              {mapData.zones.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs bg-[#12151d] rounded-2xl border border-[#2a3142] p-4">
                  Nenhuma sala privada criada ainda. Clique em "Nova Sala" para criar!
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
                                if (e.key === 'Enter') handleSaveEditing(zone.id)
                                if (e.key === 'Escape') setEditingZoneId(null)
                              }}
                              autoFocus
                              className="bg-[#1b202c] border border-indigo-500 rounded-lg px-2.5 py-1 text-xs font-bold text-white focus:outline-none flex-1"
                              maxLength={30}
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveEditing(zone.id)}
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
                            onClick={() => handleStartEditing(zone)}
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

            {/* Back to Connect Button */}
            <button
              type="button"
              onClick={() => setActiveTab('connect')}
              className="w-full py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all active:scale-98 flex items-center justify-center gap-2"
            >
              <DoorOpen className="w-4 h-4" />
              <span>Voltar para Conectar</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
