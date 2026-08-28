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
  ArrowRight,
  Globe,
  Radio,
  Users,
  Search,
  RefreshCw,
  Copy,
} from 'lucide-react'
import { useGameStore } from '../store/useGameStore'
import { useMapStore } from '../store/useMapStore'
import { useMediaStore } from '../store/useMediaStore'
import { PeerManager } from '../p2p/PeerManager'
import { MediaManager } from '../media/MediaManager'
import { PrivateZone } from '../types/map'
import { PublicRoomInfo } from '../types/game'
import { PublicRoomsService } from '../services/publicRoomsService'
import { createEmptyWorkspace } from '../editor/templates'
import { useSavedSpacesStore, SavedSpace } from '../store/useSavedSpacesStore'

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

  // Creation options
  const [createRoomName, setCreateRoomName] = useState(`Espaço de ${localPlayer.name || 'Trabalho'}`)
  const [createIsPublic, setCreateIsPublic] = useState(true)
  const [createDescription, setCreateDescription] = useState('')

  // 1. Saved Spaces Store Integration (Salas / Espaços Completos Salvos)
  const {
    savedSpaces,
    activeSpaceId,
    setActiveSpaceId,
    createSavedSpace,
    updateSavedSpace,
    duplicateSavedSpace,
    deleteSavedSpace,
  } = useSavedSpacesStore()

  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(
    () => activeSpaceId || savedSpaces[0]?.id || null
  )
  const [editingSpaceId, setEditingSpaceId] = useState<string | null>(null)
  const [editingSpaceName, setEditingSpaceName] = useState('')

  const handleStartEditingSpace = (space: SavedSpace) => {
    setEditingSpaceId(space.id)
    setEditingSpaceName(space.name)
  }

  const handleSaveEditingSpace = (spaceId: string) => {
    if (editingSpaceName.trim()) {
      updateSavedSpace(spaceId, { name: editingSpaceName.trim() })
    }
    setEditingSpaceId(null)
  }

  const handleCreateNewSpace = () => {
    const empty = createEmptyWorkspace()
    empty.name = `Novo Espaço ${savedSpaces.length + 1}`
    const created = createSavedSpace(empty.name, empty)
    setSelectedSpaceId(created.id)
    setEditingSpaceId(created.id)
    setEditingSpaceName(created.name)
  }

  // 2. Real-time Public Rooms Hub State
  const [publicRooms, setPublicRooms] = useState<PublicRoomInfo[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [copiedRoomCode, setCopiedRoomCode] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  // Subscribe to PublicRoomsService
  useEffect(() => {
    const unsubscribe = PublicRoomsService.getInstance().subscribe((rooms) => {
      setPublicRooms(rooms)
    })
    return () => unsubscribe()
  }, [])

  const handleManualRefresh = () => {
    setIsRefreshing(true)
    PublicRoomsService.getInstance().refresh()
    setTimeout(() => setIsRefreshing(false), 600)
  }

  const handleCopyCode = (e: React.MouseEvent, code: string) => {
    e.stopPropagation()
    navigator.clipboard.writeText(code)
    setCopiedRoomCode(code)
    setTimeout(() => setCopiedRoomCode(null), 2000)
  }

  const filteredPublicRooms = publicRooms.filter((room) => {
    return (
      room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      room.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      room.hostName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (room.description && room.description.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  })

  // 3. Join a Public Room from Hub
  const handleJoinPublicRoom = async (room: PublicRoomInfo) => {
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
      await PeerManager.getInstance().joinRoom(room.code, {
        ...localPlayer,
        name: userName.trim(),
      })
      onJoined()
    } catch (err: any) {
      console.error(err)
      setError(`Não foi possível conectar à sala "${room.name}". O host pode ter fechado o app.`)
    } finally {
      setLoading(false)
    }
  }

  // 4. Create and Connect
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

      // 2. Initialize media stream
      await MediaManager.getInstance().startMedia(true, true)

      // 3. Create or Join Room
      if (mode === 'create') {
        const roomTitle = createRoomName.trim() || `Espaço de ${userName.trim()}`
        const newMap = createEmptyWorkspace()
        newMap.id = 'room-' + Math.random().toString(36).substring(2, 8)
        newMap.name = roomTitle

        // Create new saved space so it appears in Salas Salvas and tracks future edits
        const createdSpace = createSavedSpace(
          roomTitle,
          newMap,
          createDescription.trim() || 'Espaço criado via Conectar'
        )

        setActiveSpaceId(createdSpace.id)
        setSelectedSpaceId(createdSpace.id)
        useMapStore.getState().setMapData(newMap)

        setLocalPlayer({
          name: userName.trim(),
          x: newMap.spawnPoint.x,
          y: newMap.spawnPoint.y,
          currentZoneId: null,
        })

        const generatedCode = 'GATHER-' + Math.random().toString(36).substring(2, 7).toUpperCase()
        const randomColors = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4']
        const color = randomColors[Math.floor(Math.random() * randomColors.length)]

        await PeerManager.getInstance().createRoom(
          generatedCode,
          {
            ...localPlayer,
            name: userName.trim(),
            x: newMap.spawnPoint.x,
            y: newMap.spawnPoint.y,
            currentZoneId: null,
          },
          {
            roomName: createdSpace.name,
            roomDescription: createDescription.trim() || 'Espaço virtual público aberto para todos',
            isPublic: createIsPublic,
            maxPlayers: 25,
            color,
          }
        )
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

  // Enter a Saved Space (Loads whole map: floors, walls, furniture, zones)
  const handleEnterSavedSpace = async (targetSpaceId?: string) => {
    if (!userName.trim()) {
      setError('Por favor, informe seu nickname.')
      setActiveTab('connect')
      return
    }

    const spaceId = targetSpaceId || selectedSpaceId
    const targetSpace = savedSpaces.find((s) => s.id === spaceId) || savedSpaces[0]
    if (!targetSpace) {
      setError('Nenhum espaço salvo encontrado.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // 1. Load full map into MapStore & persist active space
      useMapStore.getState().setMapData(targetSpace.mapData)
      setActiveSpaceId(targetSpace.id)

      const spawnX = targetSpace.mapData.spawnPoint?.x ?? 34
      const spawnY = targetSpace.mapData.spawnPoint?.y ?? 20

      setLocalPlayer({
        name: userName.trim(),
        x: spawnX,
        y: spawnY,
        currentZoneId: null,
      })

      await MediaManager.getInstance().startMedia(true, true)
      const generatedCode = 'GATHER-' + Math.random().toString(36).substring(2, 7).toUpperCase()
      await PeerManager.getInstance().createRoom(
        generatedCode,
        {
          ...localPlayer,
          name: userName.trim(),
          x: spawnX,
          y: spawnY,
          currentZoneId: null,
        },
        {
          roomName: targetSpace.name,
          isPublic: false,
        }
      )
      onJoined()
    } catch (err: any) {
      console.error(err)
      setError('Não foi possível carregar o espaço.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0c0e14]/90 backdrop-blur-xl p-4 select-none animate-in fade-in duration-300">
      <div className="bg-[#1b202c] border border-[#2a3142] rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Banner Header */}
        <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 p-5 text-center relative overflow-hidden shrink-0">
          <div className="absolute -top-12 -right-12 w-36 h-36 rounded-full bg-white/10 blur-2xl" />
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-2xl font-extrabold text-white shadow-xl mb-1.5">
              G
            </div>
            <h1 className="text-lg font-extrabold text-white tracking-tight">Gather V2 Desktop</h1>
            <p className="text-xs text-indigo-100">
              Escritório virtual colaborativo com salas públicas em tempo real, áudio P2P e zonas privadas
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#2a3142] bg-[#12151d]/80 px-5 pt-3 gap-2 shrink-0 overflow-x-auto">
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
            onClick={() => setActiveTab('available_rooms')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 shrink-0 relative ${
              activeTab === 'available_rooms'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
            <span>Salas Disponíveis (Hub)</span>
            <span className="bg-blue-500/20 text-blue-300 text-[10px] px-1.5 py-0.2 rounded-full font-bold border border-blue-500/30 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              {publicRooms.length}
            </span>
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
              {savedSpaces.length}
            </span>
          </button>
        </div>

        {/* TAB 1: CONECTAR (CRIAR OU ENTRAR) */}
        {activeTab === 'connect' && (
          <form onSubmit={handleStart} className="p-6 space-y-4 overflow-y-auto">
            {/* User Nickname & Avatar Button */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Seu Nickname</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => {
                    setUserName(e.target.value)
                    if (createRoomName === `Espaço de ${localPlayer.name || 'Trabalho'}`) {
                      setCreateRoomName(`Espaço de ${e.target.value}`)
                    }
                  }}
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
                Entrar por Código
              </button>
            </div>

            {/* Create Mode Options */}
            {mode === 'create' && (
              <div className="space-y-3 p-3.5 bg-[#12151d]/60 rounded-2xl border border-[#2a3142]/60 animate-in fade-in duration-150">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Nome da Sala / Espaço
                  </label>
                  <input
                    type="text"
                    value={createRoomName}
                    onChange={(e) => setCreateRoomName(e.target.value)}
                    placeholder="Ex: Devs Hub, Reunião de Equipe..."
                    className="w-full bg-[#12151d] border border-[#2a3142] rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                    maxLength={35}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Visibilidade da Sala</label>
                  <button
                    type="button"
                    onClick={() => setCreateIsPublic(!createIsPublic)}
                    className={`w-full py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-between transition-colors ${
                      createIsPublic
                        ? 'bg-blue-500/15 border-blue-500/40 text-blue-300'
                        : 'bg-[#12151d] border-[#2a3142] text-slate-400'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      {createIsPublic ? (
                        <Globe className="w-4 h-4 text-blue-400" />
                      ) : (
                        <Shield className="w-4 h-4 text-slate-400" />
                      )}
                      <span>{createIsPublic ? 'Pública (visível no Hub)' : 'Privada (somente com código)'}</span>
                    </span>
                    <span
                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                        createIsPublic ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-400'
                      }`}
                    >
                      {createIsPublic ? '✓' : ''}
                    </span>
                  </button>
                </div>

                {createIsPublic && (
                  <p className="text-[10px] text-indigo-300/80 bg-indigo-500/10 p-2 rounded-xl border border-indigo-500/20">
                    🌐 <strong>Sala Pública:</strong> outros usuários do app verão sua sala no Hub de Salas Disponíveis e poderão entrar facilmente!
                  </p>
                )}
              </div>
            )}

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

        {/* TAB 2: SALAS DISPONÍVEIS (HUB DE SALAS PÚBLICAS) */}
        {activeTab === 'available_rooms' && (
          <div className="p-5 space-y-3.5 overflow-y-auto flex-1 flex flex-col">
            {/* Top Hub Bar: Status, Search, Refresh, Create */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                    <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-100 flex items-center gap-2">
                      Hub de Salas Públicas
                      <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        {publicRooms.length} {publicRooms.length === 1 ? 'sala ativa' : 'salas ativas'}
                      </span>
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleManualRefresh}
                    className="p-1.5 rounded-xl bg-[#12151d] hover:bg-slate-800 border border-[#2a3142] text-slate-300 hover:text-white transition-all"
                    title="Atualizar lista de salas públicas"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('create')
                      setCreateIsPublic(true)
                      setActiveTab('connect')
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Abrir Sala</span>
                  </button>
                </div>
              </div>

              {/* Search input & Categories */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por nome da sala, host ou código..."
                  className="w-full bg-[#12151d] border border-[#2a3142] rounded-xl pl-8 pr-8 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

            </div>

            {/* Public Rooms List */}
            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1 flex-1">
              {filteredPublicRooms.length === 0 ? (
                <div className="text-center py-9 bg-[#12151d]/70 rounded-2xl border border-[#2a3142] p-6 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mx-auto flex items-center justify-center">
                    <Globe className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">
                      {searchQuery
                        ? 'Nenhuma sala encontrada com esses termos.'
                        : 'Nenhuma sala pública aberta no momento.'}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
                      {searchQuery
                        ? 'Tente buscar por outro nome ou código da sala.'
                        : 'Abra seu espaço e deixe-o público para aparecer aqui para outros usuários!'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('create')
                      setCreateIsPublic(true)
                      setActiveTab('connect')
                    }}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Criar a Primeira Sala Pública</span>
                  </button>
                </div>
              ) : (
                filteredPublicRooms.map((room) => {
                  const isCopied = copiedRoomCode === room.code

                  return (
                    <div
                      key={room.code}
                      className="p-3.5 rounded-2xl bg-[#12151d] border border-[#2a3142] hover:border-indigo-500/60 transition-all group flex flex-col gap-2 relative overflow-hidden shadow-sm"
                    >
                      {/* Left accent color bar */}
                      <div
                        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
                        style={{ backgroundColor: room.color || '#3b82f6' }}
                      />

                      {/* Header row: Room Name, Live status */}
                      <div className="flex items-center justify-between gap-2 pl-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs font-bold text-slate-100 truncate group-hover:text-indigo-300 transition-colors">
                            {room.name}
                          </span>
                        </div>

                        {/* Online count badge */}
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-300 shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <Users className="w-3 h-3" />
                          <span>{room.playerCount} online</span>
                        </div>
                      </div>

                      {/* Description snippet if any */}
                      {room.description && (
                        <p className="text-[11px] text-slate-400 pl-1 line-clamp-1">
                          {room.description}
                        </p>
                      )}

                      {/* Footer row: Host info, Code, Enter Button */}
                      <div className="flex items-center justify-between gap-2 pl-1 pt-1 border-t border-[#2a3142]/60 mt-0.5">
                        {/* Host avatar & nickname */}
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 border border-white/20"
                            style={{ backgroundColor: room.hostColor || '#4c6ef5' }}
                          >
                            {room.hostName.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-[11px] text-slate-300 truncate">
                            Criado por <strong className="text-slate-100">{room.hostName}</strong>
                          </span>
                        </div>

                        {/* Actions: Copy Code & Enter Room */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => handleCopyCode(e, room.code)}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#1b202c] hover:bg-slate-800 border border-[#2a3142] text-[10px] font-mono text-slate-300 transition-colors"
                            title="Copiar código da sala"
                          >
                            <span>{room.code}</span>
                            {isCopied ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3 text-slate-400" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleJoinPublicRoom(room)}
                            disabled={loading}
                            className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all active:scale-95 group/btn"
                          >
                            <span>Entrar</span>
                            <ArrowRight className="w-3 h-3 group-hover/btn:translate-x-0.5 transition-transform" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 3: SALAS SALVAS (ESPAÇOS COMPLETOS SALVOS) */}
        {activeTab === 'saved_rooms' && (
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-200">Meus Espaços & Salas Salvas</h3>
                <p className="text-[11px] text-slate-400">Mapas completos com pisos, paredes, móveis e zonas</p>
              </div>
              <button
                type="button"
                onClick={handleCreateNewSpace}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Novo Espaço</span>
              </button>
            </div>

            {/* List of Saved Spaces */}
            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
              {savedSpaces.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs bg-[#12151d]/70 rounded-2xl border border-[#2a3142] p-6 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mx-auto flex items-center justify-center">
                    <LayoutGrid className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">Nenhum ambiente salvo</h4>
                    <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
                      Crie um novo ambiente na aba Conectar ou clique no botão abaixo para começar um espaço do zero!
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCreateNewSpace}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Criar Novo Espaço</span>
                  </button>
                </div>
              ) : (
                savedSpaces.map((space) => {
                  const isEditing = editingSpaceId === space.id
                  const isSelected = selectedSpaceId === space.id
                  const totalZones = space.mapData.zones?.length || 0
                  const totalFurniture = space.mapData.furniture?.length || 0

                  return (
                    <div
                      key={space.id}
                      onClick={() => !isEditing && setSelectedSpaceId(space.id)}
                      onDoubleClick={() => !isEditing && handleEnterSavedSpace(space.id)}
                      className={`cursor-pointer flex items-center justify-between p-3.5 rounded-2xl border transition-all group ${
                        isSelected
                          ? 'bg-indigo-600/20 border-indigo-500 ring-2 ring-indigo-500/40 shadow-lg shadow-indigo-600/10'
                          : 'bg-[#12151d] border-[#2a3142] hover:border-slate-600 hover:bg-[#161a24]'
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
                        {/* Radio Checkmark Indicator */}
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all ${
                            isSelected
                              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/40 ring-2 ring-indigo-400/40'
                              : 'border border-slate-700 bg-slate-900/80 text-transparent'
                          }`}
                        >
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>

                        {/* Space Color / Icon Indicator */}
                        <div
                          className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                          style={{ backgroundColor: space.color || '#4c6ef5' }}
                        />

                        {/* Name or Inline Editor */}
                        {isEditing ? (
                          <div className="flex items-center gap-1.5 flex-1" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="text"
                              value={editingSpaceName}
                              onChange={(e) => setEditingSpaceName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEditingSpace(space.id)
                                if (e.key === 'Escape') setEditingSpaceId(null)
                              }}
                              autoFocus
                              className="bg-[#1b202c] border border-indigo-500 rounded-lg px-2.5 py-1 text-xs font-bold text-white focus:outline-none flex-1"
                              maxLength={35}
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveEditingSpace(space.id)}
                              className="p-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500"
                              title="Salvar Nome"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingSpaceId(null)}
                              className="p-1 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600"
                              title="Cancelar"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-bold truncate ${isSelected ? 'text-white font-black' : 'text-slate-200'}`}>
                                {space.name}
                              </span>
                              {isSelected && (
                                <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-indigo-500/30 text-indigo-300 border border-indigo-500/40">
                                  ✓ Selecionado
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400">
                              {totalZones} {totalZones === 1 ? 'zona privada' : 'zonas privadas'} • {totalFurniture} {totalFurniture === 1 ? 'móvel' : 'móveis'} • {space.mapData.width}x{space.mapData.height} tiles
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      {!isEditing && (
                        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => handleEnterSavedSpace(space.id)}
                            className="px-2.5 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold flex items-center gap-1 shadow-sm transition-all active:scale-95"
                            title="Entrar neste Espaço"
                          >
                            <span>Entrar</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStartEditingSpace(space)}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                            title="Editar Nome do Espaço"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => duplicateSavedSpace(space.id)}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                            title="Duplicar Espaço"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Deseja excluir o espaço "${space.name}"?`)) {
                                deleteSavedSpace(space.id)
                              }
                            }}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="Excluir Espaço"
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

            {/* Quick Enter Space Button (when saved spaces exist) */}
            {savedSpaces.length > 0 && (() => {
              const selectedSpace = savedSpaces.find((s) => s.id === selectedSpaceId) || savedSpaces[0]
              if (!selectedSpace) return null
              return (
                <button
                  type="button"
                  onClick={() => handleEnterSavedSpace(selectedSpace.id)}
                  disabled={loading}
                  className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all active:scale-98 flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>
                    Entrar no Espaço: {selectedSpace.name}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )
            })()}
          </div>
        )}
      </div>
    </div>
  )
}
