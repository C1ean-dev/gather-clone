import React, { useState, useEffect, useMemo } from 'react'
import { DoorOpen, Globe, LayoutGrid } from 'lucide-react'
import { useGameStore } from '../store/useGameStore'
import { useMapStore } from '../store/useMapStore'
import { useMediaStore } from '../store/useMediaStore'
import { useSavedSpacesStore } from '../store/useSavedSpacesStore'
import { PeerManager } from '../p2p/PeerManager'
import { MediaManager } from '../media/MediaManager'
import { createEmptyWorkspace } from '../editor/templates'
import { PublicRoomsService } from '../services/publicRoomsService'
import { PublicRoomInfo, Player } from '../types/game'
import { SavedSpace } from '../store/useSavedSpacesStore'
import { DirectConnectTab } from './lobby/DirectConnectTab'
import { PublicRoomsTab } from './lobby/PublicRoomsTab'
import { SavedSpacesTab } from './lobby/SavedSpacesTab'

interface Props {
  onJoined: () => void
  onOpenAvatarCustomizer: () => void
}

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export const LobbyModal: React.FC<Props> = ({ onJoined, onOpenAvatarCustomizer }) => {
  const { localPlayer, setLocalPlayer } = useGameStore()
  const {
    savedSpaces,
    activeSpaceId,
    setActiveSpaceId,
    createSavedSpace,
    updateSavedSpace,
    deleteSavedSpace,
    duplicateSavedSpace,
  } = useSavedSpacesStore()

  const [activeTab, setActiveTab] = useState<'connect' | 'available_rooms' | 'saved_rooms'>('connect')
  const [userName, setUserName] = useState(localPlayer.name || '')
  const [roomInput, setRoomInput] = useState('')
  const [mode, setMode] = useState<'create' | 'join'>('create')
  const [createRoomName, setCreateRoomName] = useState(`Espaço de ${localPlayer.name || 'Trabalho'}`)
  const [createDescription, setCreateDescription] = useState('Espaço de colaboração e produtividade')
  const [createIsPublic, setCreateIsPublic] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Selected space in saved rooms
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>(activeSpaceId || savedSpaces[0]?.id || '')

  // Inline editing space name
  const [editingSpaceId, setEditingSpaceId] = useState<string | null>(null)
  const [editingSpaceName, setEditingSpaceName] = useState('')

  // Public Rooms (Hub)
  const [publicRooms, setPublicRooms] = useState<PublicRoomInfo[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [copiedRoomCode, setCopiedRoomCode] = useState<string | null>(null)

  useEffect(() => {
    if (activeTab === 'available_rooms') {
      const hub = PublicRoomsService.getInstance()
      setPublicRooms(hub.getRooms())
      hub.refresh()

      const interval = setInterval(() => {
        hub.refresh()
      }, 3000)
      return () => clearInterval(interval)
    }
  }, [activeTab])

  useEffect(() => {
    const unsubscribe = PublicRoomsService.getInstance().subscribe((rooms) => {
      setPublicRooms(rooms)
    })
    return () => unsubscribe()
  }, [])

  const handleManualRefresh = () => {
    setIsRefreshing(true)
    const hub = PublicRoomsService.getInstance()
    hub.refresh()
    setPublicRooms(hub.getRooms())
    setTimeout(() => setIsRefreshing(false), 500)
  }

  const filteredPublicRooms = useMemo(() => {
    let list = publicRooms
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.hostName.toLowerCase().includes(q) ||
          r.code.toLowerCase().includes(q) ||
          (r.description && r.description.toLowerCase().includes(q))
      )
    }
    return list.sort((a, b) => b.createdAt - a.createdAt)
  }, [publicRooms, searchQuery])

  const handleCopyCode = (e: React.MouseEvent, code: string) => {
    e.stopPropagation()
    navigator.clipboard.writeText(code)
    setCopiedRoomCode(code)
    setTimeout(() => setCopiedRoomCode(null), 2000)
  }

  const handleJoinPublicRoom = async (room: PublicRoomInfo) => {
    if (!userName.trim()) {
      setError('Por favor, informe seu nickname antes de entrar na sala.')
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

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userName.trim()) {
      setError('Por favor, informe seu nickname.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      setLocalPlayer({ name: userName.trim() })
      useMediaStore.getState().setMuted(true)
      useMediaStore.getState().setCameraOff(true)
      await MediaManager.getInstance().startMedia(true, true)

      if (mode === 'create') {
        const roomTitle = createRoomName.trim() || `Espaço de ${userName.trim()}`
        const newMap = createEmptyWorkspace()
        newMap.id = 'room-' + Math.random().toString(36).substring(2, 8)
        newMap.name = roomTitle

        const persistentRoomCode = generateUUID()

        const createdSpace = createSavedSpace(
          roomTitle,
          newMap,
          createDescription.trim() || 'Espaço criado via Conectar',
          persistentRoomCode
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

        const randomColors = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4']
        const color = randomColors[Math.floor(Math.random() * randomColors.length)]

        const playerPayload: Player = {
          ...useGameStore.getState().localPlayer,
          name: userName.trim(),
          x: newMap.spawnPoint.x,
          y: newMap.spawnPoint.y,
          currentZoneId: null,
        }

        await PeerManager.getInstance().createRoom(
          persistentRoomCode,
          playerPayload,
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
        const playerPayload: Player = {
          ...useGameStore.getState().localPlayer,
          name: userName.trim(),
        }
        await PeerManager.getInstance().joinRoom(roomInput.trim(), playerPayload)
      }

      onJoined()
    } catch (err: any) {
      console.error(err)
      setError('Não foi possível conectar. Verifique o código da sala e tente novamente.')
    } finally {
      setLoading(false)
    }
  }

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

      useMediaStore.getState().setMuted(true)
      useMediaStore.getState().setCameraOff(true)
      await MediaManager.getInstance().startMedia(true, true)

      let persistentCode = targetSpace.roomCode
      if (!persistentCode) {
        persistentCode = generateUUID()
        updateSavedSpace(targetSpace.id, { roomCode: persistentCode })
      }

      const playerPayload: Player = {
        ...useGameStore.getState().localPlayer,
        name: userName.trim(),
        x: spawnX,
        y: spawnY,
        currentZoneId: null,
      }

      await PeerManager.getInstance().createRoom(
        persistentCode,
        playerPayload,
        {
          roomName: targetSpace.name,
          isPublic: true,
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

  const handleCreateNewSpace = () => {
    const defaultName = `Espaço #${savedSpaces.length + 1}`
    const newMap = createEmptyWorkspace()
    newMap.name = defaultName
    const persistentCode = generateUUID()
    const newSpace = createSavedSpace(
      defaultName,
      newMap,
      'Novo espaço de trabalho virtual',
      persistentCode
    )
    setSelectedSpaceId(newSpace.id)
    handleEnterSavedSpace(newSpace.id)
  }

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

        {/* TAB 1: CONECTAR */}
        {activeTab === 'connect' && (
          <DirectConnectTab
            userName={userName}
            setUserName={(name) => {
              setUserName(name)
              if (createRoomName === `Espaço de ${localPlayer.name || 'Trabalho'}`) {
                setCreateRoomName(`Espaço de ${name}`)
              }
            }}
            onOpenAvatarCustomizer={onOpenAvatarCustomizer}
            mode={mode}
            setMode={setMode}
            createRoomName={createRoomName}
            setCreateRoomName={setCreateRoomName}
            createIsPublic={createIsPublic}
            setCreateIsPublic={setCreateIsPublic}
            roomInput={roomInput}
            setRoomInput={setRoomInput}
            error={error}
            loading={loading}
            onSubmit={handleStart}
          />
        )}

        {/* TAB 2: SALAS DISPONÍVEIS */}
        {activeTab === 'available_rooms' && (
          <PublicRoomsTab
            publicRooms={publicRooms}
            filteredPublicRooms={filteredPublicRooms}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            isRefreshing={isRefreshing}
            handleManualRefresh={handleManualRefresh}
            copiedRoomCode={copiedRoomCode}
            handleCopyCode={handleCopyCode}
            handleJoinPublicRoom={handleJoinPublicRoom}
            loading={loading}
            onOpenCreateMode={() => {
              setMode('create')
              setCreateIsPublic(true)
              setActiveTab('connect')
            }}
          />
        )}

        {/* TAB 3: SALAS SALVAS */}
        {activeTab === 'saved_rooms' && (
          <SavedSpacesTab
            savedSpaces={savedSpaces}
            selectedSpaceId={selectedSpaceId}
            setSelectedSpaceId={setSelectedSpaceId}
            editingSpaceId={editingSpaceId}
            editingSpaceName={editingSpaceName}
            setEditingSpaceName={setEditingSpaceName}
            handleStartEditingSpace={handleStartEditingSpace}
            handleSaveEditingSpace={handleSaveEditingSpace}
            setEditingSpaceId={setEditingSpaceId}
            handleEnterSavedSpace={handleEnterSavedSpace}
            handleCreateNewSpace={handleCreateNewSpace}
            duplicateSavedSpace={duplicateSavedSpace}
            deleteSavedSpace={deleteSavedSpace}
            copiedRoomCode={copiedRoomCode}
            handleCopyCode={handleCopyCode}
            loading={loading}
          />
        )}
      </div>
    </div>
  )
}
