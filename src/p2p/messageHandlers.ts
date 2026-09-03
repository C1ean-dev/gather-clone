import { NetworkMessage, PlayerMovePayload } from '../types/p2p'
import { Player } from '../types/game'
import { useGameStore } from '../store/useGameStore'
import { useMapStore } from '../store/useMapStore'
import { useChatStore } from '../store/useChatStore'
import { useCustomAssetsStore } from '../store/useCustomAssetsStore'
import { PublicRoomsService } from '../services/publicRoomsService'

export function processNetworkMessage(
  msg: NetworkMessage,
  peerId: string,
  isHost: boolean,
  broadcast: (msg: NetworkMessage, excludePeerId?: string) => void,
  removePeer: (peerId: string) => void,
  checkZoneCallEligibility: (remotePlayer: Player) => void
) {
  switch (msg.type) {
    case 'HEARTBEAT': {
      // Respond with HEARTBEAT_ACK so sender computes round-trip latency
      broadcast({
        type: 'HEARTBEAT_ACK',
        senderId: useGameStore.getState().localPlayer.id,
        payload: { clientTimestamp: msg.timestamp },
        timestamp: Date.now(),
      })
      break
    }

    case 'HEARTBEAT_ACK': {
      if (msg.payload?.clientTimestamp) {
        const rtt = Math.max(1, Math.round(Date.now() - msg.payload.clientTimestamp))
        useGameStore.getState().updatePlayerPing(peerId, rtt)
      }
      break
    }

    case 'PLAYER_JOIN': {
      const isPeerHost = peerId.endsWith('-host')
      const incomingGameId: string | undefined =
        msg.payload.player?.gameId ?? msg.payload.player?.id
      const localId = useGameStore.getState().localPlayer.id
      // 1. Never register our own echo as a remote player — it would render
      // as a frozen copy of ourselves stuck at the join position (ghost).
      if (incomingGameId && incomingGameId === localId) {
        break
      }
      // 2. Same human reconnected with a new connection id (ICE churn, flap):
      // drop the stale entry so the old frozen clone disappears instead of
      // lingering next to the live one.
      if (incomingGameId) {
        const st = useGameStore.getState()
        for (const [key, p] of Object.entries(st.remotePlayers)) {
          if (key !== peerId && (p.gameId ?? p.id) === incomingGameId) {
            st.removeRemotePlayer(key)
          }
        }
      }
      const player: Player = {
        ...msg.payload.player,
        id: peerId,
        gameId: incomingGameId,
        isHost: isPeerHost,
        role: isPeerHost ? 'host' : msg.payload.player?.role === 'admin' ? 'admin' : msg.payload.player?.role === 'guest' ? 'guest' : 'member',
      }
      useGameStore.getState().setRemotePlayer(player)
      if (isHost && useGameStore.getState().isRoomPublic) {
        const totalPlayers = Object.keys(useGameStore.getState().remotePlayers).length + 1
        PublicRoomsService.getInstance().updateHosting({ playerCount: totalPlayers })
      }
      checkZoneCallEligibility(player)
      break
    }

    case 'PLAYER_MOVE': {
      // Defensive: movement allegedly from ourselves must never create or
      // move a remote entry (would mirror/freeze a clone of the local avatar).
      if (peerId === useGameStore.getState().localPlayer.id) break
      const payload: PlayerMovePayload = msg.payload
      useGameStore
        .getState()
        .updateRemotePlayerPosition(peerId, payload.x, payload.y, payload.direction, payload.isMoving)
      break
    }

    case 'PLAYER_UPDATE': {
      if (peerId === useGameStore.getState().localPlayer.id) break
      const updated = msg.payload.player
      const existing = useGameStore.getState().remotePlayers[peerId]
      if (existing) {
        const isPeerHost = peerId.endsWith('-host')
        const nextPlayer: Player = {
          ...existing,
          ...updated,
          isHost: isPeerHost,
          role: isPeerHost ? 'host' : updated?.role || existing.role || 'member',
        }
        useGameStore.getState().setRemotePlayer(nextPlayer)
        checkZoneCallEligibility(nextPlayer)
      }
      break
    }

    case 'PLAYER_LEAVE': {
      const targetId = msg.payload?.peerId || peerId
      removePeer(targetId)
      break
    }

    case 'MAP_SYNC': {
      if (msg.payload.mapData) {
        useMapStore.getState().setMapData(msg.payload.mapData)
      }
      break
    }

    case 'CUSTOM_ASSETS_SYNC': {
      if (msg.payload.customAssets) {
        useCustomAssetsStore.getState().syncRemoteCustomAssets(
          msg.payload.customAssets,
          msg.payload.categories
        )
      }
      break
    }

    case 'CUSTOM_ASSET_ADD_OR_UPDATE': {
      if (msg.payload.asset) {
        useCustomAssetsStore.getState().syncRemoteAssetAddOrUpdate(msg.payload.asset)
      }
      break
    }

    case 'CUSTOM_ASSET_DELETE': {
      if (msg.payload.id) {
        useCustomAssetsStore.getState().syncRemoteAssetDelete(msg.payload.id)
      }
      break
    }

    case 'MAP_EDIT': {
      const { action, data } = msg.payload
      if (action === 'set_floor') {
        useMapStore.getState().setFloorTile(data.x, data.y, data.floor)
      } else if (action === 'paint_floor_in_zone') {
        // A remote peer clicked inside a zone with paint_floor
        // selected; replicate the same "fill the whole zone" effect
        // locally so both sides stay in sync.
        useMapStore.getState().paintFloorInZone(data.zoneId, data.floor)
      } else if (action === 'set_wall') {
        useMapStore.getState().setWallTile(data.x, data.y, data.wall)
      } else if (action === 'add_furniture') {
        useMapStore.getState().addFurniture(data.furniture)
      } else if (action === 'remove_furniture') {
        useMapStore.getState().removeFurnitureAt(data.x, data.y)
      } else if (action === 'add_zone') {
        useMapStore.getState().addOrUpdateZone(data.zone)
      } else if (action === 'remove_zone') {
        useMapStore.getState().removeZone(data.id)
      }
      break
    }

    case 'CHAT_MESSAGE': {
      useChatStore.getState().addMessage(msg.payload.message)
      break
    }

    case 'REACTION': {
      useGameStore.getState().addReaction(msg.payload.reaction)
      break
    }
  }

  // If host, forward to other peers in mesh
  if (isHost && msg.type !== 'MAP_SYNC' && msg.type !== 'CUSTOM_ASSETS_SYNC' && msg.type !== 'HEARTBEAT') {
    broadcast(msg, peerId)
  }
}
