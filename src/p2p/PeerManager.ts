import Peer, { DataConnection, MediaConnection } from 'peerjs'
import { NetworkMessage, PlayerMovePayload } from '../types/p2p'
import { Player } from '../types/game'
import { useGameStore } from '../store/useGameStore'
import { useMapStore } from '../store/useMapStore'
import { useChatStore } from '../store/useChatStore'
import { useMediaStore } from '../store/useMediaStore'
import { useCustomAssetsStore } from '../store/useCustomAssetsStore'
import { CustomAsset } from '../types/customAsset'
import { PublicRoomsService } from '../services/publicRoomsService'

export class PeerManager {
  private static instance: PeerManager
  private peer: Peer | null = null
  private connections: Map<string, DataConnection> = new Map()
  private mediaCalls: Map<string, MediaConnection> = new Map()
  private roomCode: string | null = null
  private isHost: boolean = false

  private constructor() {}

  public static getInstance(): PeerManager {
    if (!PeerManager.instance) {
      PeerManager.instance = new PeerManager()
    }
    return PeerManager.instance
  }

  /**
   * Host a new Room
   */
  public async createRoom(
    roomCode: string,
    localPlayer: Player,
    options?: {
      roomName?: string
      roomDescription?: string
      isPublic?: boolean
      maxPlayers?: number
      color?: string
    }
  ): Promise<string> {
    this.roomCode = roomCode.toUpperCase()
    this.isHost = true
    const hostPeerId = `gather-v2-${this.roomCode}-host`

    return new Promise((resolve, reject) => {
      this.peer = new Peer(hostPeerId, {
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' },
          ],
        },
      })

      this.peer.on('open', (id) => {
        console.log('[P2P] Room created with Host ID:', id)
        useGameStore.getState().setRoomSession(this.roomCode!, true, options)
        useGameStore.getState().setConnected(true)
        this.setupPeerListeners()
        resolve(this.roomCode!)
      })

      this.peer.on('error', (err) => {
        console.error('[P2P] Error hosting room:', err)
        reject(err)
      })
    })
  }

  /**
   * Join an existing Room
   */
  public async joinRoom(roomCode: string, localPlayer: Player): Promise<void> {
    this.roomCode = roomCode.toUpperCase()
    this.isHost = false
    const clientPeerId = `gather-v2-${this.roomCode}-peer-${Math.random().toString(36).substring(2, 7)}`
    const hostPeerId = `gather-v2-${this.roomCode}-host`

    return new Promise((resolve, reject) => {
      this.peer = new Peer(clientPeerId, {
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' },
          ],
        },
      })

      this.peer.on('open', (id) => {
        console.log('[P2P] Joined peer network with ID:', id)
        useGameStore.getState().setRoomSession(this.roomCode!, false)
        useGameStore.getState().setConnected(true)
        this.setupPeerListeners()

        // Connect to Host
        const conn = this.peer!.connect(hostPeerId, {
          metadata: { player: localPlayer },
          reliable: true,
        })

        this.setupDataConnection(conn)
        resolve()
      })

      this.peer.on('error', (err) => {
        console.error('[P2P] Error joining room:', err)
        reject(err)
      })
    })
  }

  private setupPeerListeners() {
    if (!this.peer) return

    // Incoming Data Connection
    this.peer.on('connection', (conn) => {
      this.setupDataConnection(conn)
    })

    // Incoming Media Call (WebRTC Audio/Video)
    this.peer.on('call', (call) => {
      console.log('[P2P Media] Incoming call from:', call.peer)
      const localStream = useMediaStore.getState().localStream

      // Answer call with local stream (or blank stream if muted/no cam)
      if (localStream) {
        call.answer(localStream)
      } else {
        // Answer with empty audio/video stream
        const emptyStream = new MediaStream()
        call.answer(emptyStream)
      }

      call.on('stream', (remoteStream) => {
        console.log('[P2P Media] Received remote stream from:', call.peer)
        useMediaStore.getState().setPeerStream(call.peer, remoteStream)
      })

      call.on('close', () => {
        useMediaStore.getState().removePeerStream(call.peer)
      })

      this.mediaCalls.set(call.peer, call)
    })
  }

  private setupDataConnection(conn: DataConnection) {
    conn.on('open', () => {
      console.log('[P2P Data] Connected to peer:', conn.peer)
      this.connections.set(conn.peer, conn)

      // Send our local player join message
      const localPlayer = useGameStore.getState().localPlayer
      this.sendToPeer(conn, {
        type: 'PLAYER_JOIN',
        senderId: this.peer!.id,
        payload: { player: localPlayer },
        timestamp: Date.now(),
      })

      // If we are Host, send current map, custom assets, and all existing players to the newcomer
      if (this.isHost) {
        const currentMap = useMapStore.getState().mapData
        this.sendToPeer(conn, {
          type: 'MAP_SYNC',
          senderId: this.peer!.id,
          payload: { mapData: currentMap },
          timestamp: Date.now(),
        })

        const customAssets = useCustomAssetsStore.getState().customAssets
        const customCategories = useCustomAssetsStore.getState().customCategories
        if (customAssets && customAssets.length > 0) {
          this.sendToPeer(conn, {
            type: 'CUSTOM_ASSETS_SYNC',
            senderId: this.peer!.id,
            payload: { customAssets, categories: customCategories },
            timestamp: Date.now(),
          })
        }

        // Also broadcast newcomer to other peers
        const remotePlayers = useGameStore.getState().remotePlayers
        Object.values(remotePlayers).forEach((p) => {
          this.sendToPeer(conn, {
            type: 'PLAYER_JOIN',
            senderId: p.id,
            payload: { player: p },
            timestamp: Date.now(),
          })
        })
      }
    })

    conn.on('data', (data: any) => {
      this.handleNetworkMessage(data as NetworkMessage, conn.peer)
    })

    conn.on('close', () => {
      console.log('[P2P Data] Peer disconnected:', conn.peer)
      this.connections.delete(conn.peer)
      useGameStore.getState().removeRemotePlayer(conn.peer)
      this.endMediaCallWithPeer(conn.peer)
    })
  }

  private handleNetworkMessage(msg: NetworkMessage, peerId: string) {
    switch (msg.type) {
      case 'PLAYER_JOIN': {
        const player: Player = {
          ...msg.payload.player,
          id: peerId,
        }
        useGameStore.getState().setRemotePlayer(player)
        if (this.isHost && useGameStore.getState().isRoomPublic) {
          const totalPlayers = Object.keys(useGameStore.getState().remotePlayers).length + 1
          PublicRoomsService.getInstance().updateHosting({ playerCount: totalPlayers })
        }
        // Check if we should initiate Zone call
        this.checkZoneCallEligibility(player)
        break
      }

      case 'PLAYER_MOVE': {
        const payload: PlayerMovePayload = msg.payload
        useGameStore
          .getState()
          .updateRemotePlayerPosition(peerId, payload.x, payload.y, payload.direction, payload.isMoving)
        break
      }

      case 'PLAYER_UPDATE': {
        const updated = msg.payload.player
        const existing = useGameStore.getState().remotePlayers[peerId]
        if (existing) {
          const nextPlayer = { ...existing, ...updated }
          useGameStore.getState().setRemotePlayer(nextPlayer)
          this.checkZoneCallEligibility(nextPlayer)
        }
        break
      }

      case 'PLAYER_LEAVE': {
        useGameStore.getState().removeRemotePlayer(peerId)
        this.endMediaCallWithPeer(peerId)
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
    if (this.isHost && msg.type !== 'MAP_SYNC' && msg.type !== 'CUSTOM_ASSETS_SYNC') {
      this.broadcast(msg, peerId)
    }
  }

  /**
   * Broadcast message to all connected peers
   */
  public broadcast(msg: NetworkMessage, excludePeerId?: string) {
    this.connections.forEach((conn, pid) => {
      if (pid !== excludePeerId && conn.open) {
        this.sendToPeer(conn, msg)
      }
    })
  }

  private sendToPeer(conn: DataConnection, msg: NetworkMessage) {
    if (conn.open) {
      try {
        conn.send(msg)
      } catch (err) {
        console.warn('Failed to send data to peer:', err)
      }
    }
  }

  /**
   * Check if local player and remote peer are in the same Private Zone and manage MediaCall
   */
  public checkZoneCallEligibility(remotePlayer: Player) {
    const localPlayer = useGameStore.getState().localPlayer
    const localStream = useMediaStore.getState().localStream

    const inSameZone =
      localPlayer.currentZoneId !== null &&
      localPlayer.currentZoneId !== undefined &&
      localPlayer.currentZoneId === remotePlayer.currentZoneId

    const existingCall = this.mediaCalls.get(remotePlayer.id)

    if (inSameZone) {
      // Should have active call
      if (!existingCall && this.peer && localStream) {
        console.log(`[Zone Call] Connecting audio/video with ${remotePlayer.name} in zone ${localPlayer.currentZoneId}`)
        const call = this.peer.call(remotePlayer.id, localStream)
        if (call) {
          call.on('stream', (remoteStream) => {
            useMediaStore.getState().setPeerStream(remotePlayer.id, remoteStream)
          })
          call.on('close', () => {
            useMediaStore.getState().removePeerStream(remotePlayer.id)
          })
          this.mediaCalls.set(remotePlayer.id, call)
        }
      }
    } else {
      // Out of zone: tear down call
      if (existingCall) {
        console.log(`[Zone Call] Leaving zone with ${remotePlayer.name}, terminating media call`)
        this.endMediaCallWithPeer(remotePlayer.id)
      }
    }
  }

  public endMediaCallWithPeer(peerId: string) {
    const call = this.mediaCalls.get(peerId)
    if (call) {
      call.close()
      this.mediaCalls.delete(peerId)
    }
    useMediaStore.getState().removePeerStream(peerId)
  }

  /**
   * Replace active video track (Switching between Camera & Screen Share with High Bitrate)
   */
  public replaceVideoTrack(
    newTrack: MediaStreamTrack | null,
    isScreenShare: boolean = false,
    maxBitrate: number = 8_000_000,
    maxFramerate: number = 60
  ) {
    this.mediaCalls.forEach((call) => {
      try {
        const pc = (call as any).peerConnection as RTCPeerConnection
        if (pc) {
          const senders = pc.getSenders()
          const videoSender = senders.find((s) => s.track && s.track.kind === 'video')
          if (videoSender && newTrack) {
            videoSender.replaceTrack(newTrack).then(() => {
              try {
                const params = videoSender.getParameters()
                if (params && params.encodings && params.encodings.length > 0) {
                  if (isScreenShare) {
                    params.encodings[0].maxBitrate = maxBitrate // 5000kbps, 6000kbps, 7000kbps, 8000kbps
                    params.encodings[0].maxFramerate = maxFramerate
                    params.encodings[0].scaleResolutionDownBy = 1.0
                    ;(params as any).degradationPreference = 'maintain-resolution'
                  } else {
                    params.encodings[0].maxBitrate = 2_000_000
                    params.encodings[0].maxFramerate = 30
                    delete (params as any).degradationPreference
                  }
                  videoSender.setParameters(params).catch(() => {})
                }
              } catch (paramErr) {
                // Ignore on unsupported browsers
              }
            }).catch((err) => console.warn('Could not replace video track:', err))
          }
        }
      } catch (err) {
        console.warn('Error replacing video track:', err)
      }
    })
  }

  /**
   * Replace active audio track (When mixing system audio with microphone)
   */
  public replaceAudioTrack(newTrack: MediaStreamTrack | null) {
    this.mediaCalls.forEach((call) => {
      try {
        const pc = (call as any).peerConnection as RTCPeerConnection
        if (pc) {
          const senders = pc.getSenders()
          const audioSender = senders.find((s) => s.track && s.track.kind === 'audio')
          if (audioSender && newTrack) {
            audioSender.replaceTrack(newTrack).catch((err) => console.warn('Could not replace audio track:', err))
          }
        }
      } catch (err) {
        console.warn('Error replacing audio track:', err)
      }
    })
  }

  /**
   * Broadcast Local Movement
   */
  public sendMovement(x: number, y: number, direction: 'up' | 'down' | 'left' | 'right', isMoving: boolean) {
    if (!this.peer) return
    const msg: NetworkMessage = {
      type: 'PLAYER_MOVE',
      senderId: this.peer.id,
      payload: { x, y, direction, isMoving },
      timestamp: Date.now(),
    }
    this.broadcast(msg)
  }

  /**
   * Broadcast Player Update (Status, Avatar, Zone)
   */
  public sendPlayerUpdate(player: Partial<Player>) {
    if (!this.peer) return
    const msg: NetworkMessage = {
      type: 'PLAYER_UPDATE',
      senderId: this.peer.id,
      payload: { player },
      timestamp: Date.now(),
    }
    this.broadcast(msg)

    // Re-check zone call status for all peers
    const remotePlayers = useGameStore.getState().remotePlayers
    Object.values(remotePlayers).forEach((p) => {
      this.checkZoneCallEligibility(p)
    })
  }

  /**
   * Broadcast Custom Asset Creation or Update across P2P Mesh
   */
  public sendCustomAssetAddOrUpdate(asset: CustomAsset) {
    if (!this.peer) return
    const msg: NetworkMessage = {
      type: 'CUSTOM_ASSET_ADD_OR_UPDATE',
      senderId: this.peer.id,
      payload: { asset },
      timestamp: Date.now(),
    }
    this.broadcast(msg)
  }

  /**
   * Broadcast Custom Asset Deletion across P2P Mesh
   */
  public sendCustomAssetDelete(id: string) {
    if (!this.peer) return
    const msg: NetworkMessage = {
      type: 'CUSTOM_ASSET_DELETE',
      senderId: this.peer.id,
      payload: { id },
      timestamp: Date.now(),
    }
    this.broadcast(msg)
  }

  /**
   * Broadcast Full Custom Assets List
   */
  public sendCustomAssetsSync(customAssets: CustomAsset[], categories?: string[]) {
    if (!this.peer) return
    const msg: NetworkMessage = {
      type: 'CUSTOM_ASSETS_SYNC',
      senderId: this.peer.id,
      payload: { customAssets, categories },
      timestamp: Date.now(),
    }
    this.broadcast(msg)
  }

  /**
   * Broadcast Map Edit
   */
  public sendMapEdit(action: string, data: any) {
    if (!this.peer) return
    const msg: NetworkMessage = {
      type: 'MAP_EDIT',
      senderId: this.peer.id,
      payload: { action, data },
      timestamp: Date.now(),
    }
    this.broadcast(msg)
  }

  /**
   * Broadcast Chat Message
   */
  public sendChatMessage(message: any) {
    if (!this.peer) return
    const msg: NetworkMessage = {
      type: 'CHAT_MESSAGE',
      senderId: this.peer.id,
      payload: { message },
      timestamp: Date.now(),
    }
    this.broadcast(msg)
  }

  /**
   * Broadcast Reaction
   */
  public sendReaction(reaction: any) {
    if (!this.peer) return
    const msg: NetworkMessage = {
      type: 'REACTION',
      senderId: this.peer.id,
      payload: { reaction },
      timestamp: Date.now(),
    }
    this.broadcast(msg)
  }

  public disconnect() {
    PublicRoomsService.getInstance().stopHosting()
    this.mediaCalls.forEach((call) => call.close())
    this.mediaCalls.clear()
    this.connections.forEach((conn) => conn.close())
    this.connections.clear()
    if (this.peer) {
      this.peer.destroy()
      this.peer = null
    }
    useGameStore.getState().setConnected(false)
    useGameStore.getState().clearRemotePlayers()
    useMediaStore.getState().clearAllPeerStreams()
  }
}
