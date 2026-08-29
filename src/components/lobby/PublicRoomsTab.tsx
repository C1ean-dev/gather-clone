import React from 'react'
import { Radio, RefreshCw, Plus, Search, X, Globe, Users, Check, Copy, ArrowRight } from 'lucide-react'
import { PublicRoomInfo } from '../../types/game'

interface Props {
  publicRooms: PublicRoomInfo[]
  filteredPublicRooms: PublicRoomInfo[]
  searchQuery: string
  setSearchQuery: (query: string) => void
  isRefreshing: boolean
  handleManualRefresh: () => void
  copiedRoomCode: string | null
  handleCopyCode: (e: React.MouseEvent, code: string) => void
  handleJoinPublicRoom: (room: PublicRoomInfo) => void
  loading: boolean
  onOpenCreateMode: () => void
}

export const PublicRoomsTab: React.FC<Props> = ({
  publicRooms,
  filteredPublicRooms,
  searchQuery,
  setSearchQuery,
  isRefreshing,
  handleManualRefresh,
  copiedRoomCode,
  handleCopyCode,
  handleJoinPublicRoom,
  loading,
  onOpenCreateMode,
}) => {
  return (
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
              onClick={onOpenCreateMode}
              className="px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Abrir Sala</span>
            </button>
          </div>
        </div>

        {/* Search input */}
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
              onClick={onOpenCreateMode}
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
  )
}
