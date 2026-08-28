import { Player } from './game'
import { MapData, PlacedFurniture, PrivateZone } from './map'
import { ChatMessage } from './chat'

export type NetworkMessageType =
  | 'PLAYER_JOIN'
  | 'PLAYER_LEAVE'
  | 'PLAYER_MOVE'
  | 'PLAYER_UPDATE'
  | 'MAP_SYNC'
  | 'MAP_EDIT'
  | 'CUSTOM_ASSETS_SYNC'
  | 'CUSTOM_ASSET_ADD_OR_UPDATE'
  | 'CUSTOM_ASSET_DELETE'
  | 'CHAT_MESSAGE'
  | 'REACTION'
  | 'REQUEST_MAP'
  | 'HEARTBEAT'
  | 'HEARTBEAT_ACK'

export interface NetworkMessage {
  type: NetworkMessageType
  senderId: string
  payload: any
  timestamp: number
}

export interface PlayerMovePayload {
  x: number
  y: number
  direction: 'up' | 'down' | 'left' | 'right'
  isMoving: boolean
}

export interface PlayerUpdatePayload {
  player: Partial<Player>
}

export interface MapEditPayload {
  action: 'set_floor' | 'set_wall' | 'add_furniture' | 'remove_furniture' | 'add_zone' | 'remove_zone' | 'update_zone'
  data: any
}

export interface PeerConnectionState {
  peerId: string
  isConnected: boolean
  isHost: boolean
  latency?: number
}
