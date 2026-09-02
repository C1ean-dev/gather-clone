import Peer, { DataConnection, MediaConnection } from 'peerjs'
import { NetworkMessage } from '../types/p2p'
import { Player } from '../types/game'
import { useGameStore } from '../store/useGameStore'
import { useMapStore } from '../store/useMapStore'
import { useMediaStore } from '../store/useMediaStore'
import { useCustomAssetsStore } from '../store/useCustomAssetsStore'
import { CustomAsset } from '../types/customAsset'
import { PublicRoomsService } from '../services/publicRoomsService'
import { processNetworkMessage } from './messageHandlers'
import { MediaCallHandler } from './mediaCalls'
import { prioritizeH264HardwareCodec } from '../media/hardwareCodec'

export class PeerManager {
  private static instance: PeerManager
  private peer: Peer | null = null
  private connections: Map<string, DataConnection> = new Map()
  private mediaCalls: Map<string, MediaConnection> = new Map()
  private peerLastSeen: Map<string, number> = new Map()
  private heartbeatInterval: any = null
  private staleCheckInterval: any = null
  private roomCode: string | null = null
  private isHost: boolean = false

  private constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('gather:live-buffer-changed', (e: any) => {
        const ms = e.detail || 300
        MediaCallHandler.applyJitterBuffer(this.mediaCalls, ms)
      })
    }
  }

  public static getInstance(): PeerManager {
    if (!PeerManager.instance) {
      PeerManager.instance = new PeerManager()
    }
    return PeerManager.instance
  }

  public getMediaCalls(): Map<string, MediaConnection> {
    return this.mediaCalls
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

    // Clean up any stale peer connection first
    if (this.peer) {
      try {
        this.peer.destroy()
      } catch (e) {}
      this.peer = null
    }

    return new Promise((resolve, reject) => {
      let resolved = false

      this.peer = new Peer(hostPeerId, {
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' },
          ],
        },
      })

      this.peer.on('open', (id) => {
        if (resolved) return
        resolved = true
        console.log('[P2P] Room created with Host ID:', id)
        useGameStore.getState().setRoomSession(this.roomCode!, true, options)
        useGameStore.getState().setConnected(true)
        this.setupPeerListeners()
        this.startHeartbeat()
        resolve(this.roomCode!)
      })

      this.peer.on('error', async (err: any) => {
        if (resolved) return
        console.warn('[P2P] Error hosting room, checking fallback:', err)

        // If ID is already taken or unavailable (e.g. active room already hosted or lingering session)
        if (err?.type === 'unavailable-id' || err?.message?.includes('is taken') || err?.type === 'server-error') {
          resolved = true
          console.log('[P2P] Host ID already registered. Joining as client to active room...')
          try {
            if (this.peer) {
              try {
                this.peer.destroy()
              } catch (e) {}
              this.peer = null
            }
            await this.joinRoom(this.roomCode!, localPlayer)
            resolve(this.roomCode!)
          } catch (joinErr) {
            reject(joinErr)
          }
        } else {
          resolved = true
          reject(err)
        }
      })
    })
  }

  /**
   * Join an existing Room (with Smart Auto-Host Fallback if unhosted)
   */
  public async joinRoom(roomCode: string, localPlayer: Player): Promise<void> {
    this.roomCode = roomCode.toUpperCase()
    this.isHost = false
    const clientPeerId = `gather-v2-${this.roomCode}-peer-${Math.random().toString(36).substring(2, 7)}`
    const hostPeerId = `gather-v2-${this.roomCode}-host`

    return new Promise((resolve, reject) => {
      let isResolved = false
      let fallbackTimer: any = null

      this.peer = new Peer(clientPeerId, {
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' },
          ],
        },
      })

      const triggerAutoHost = async () => {
        if (isResolved) return
        isResolved = true
        if (fallbackTimer) clearTimeout(fallbackTimer)
        console.log(`[P2P Join] Host ${hostPeerId} is offline or unavailable. Auto-hosting space ${this.roomCode}...`)

        try {
          if (this.peer) {
            try {
              this.peer.destroy()
            } catch (e) {}
            this.peer = null
          }
          await this.createRoom(this.roomCode!, localPlayer, {
            roomName: `Espaço ${this.roomCode}`,
            isPublic: false,
          })
          resolve()
        } catch (err) {
          console.error('[P2P AutoHost] Error promoting to host:', err)
          reject(err)
        }
      }

      this.peer.on('open', (id) => {
        console.log('[P2P] Joined peer network with ID:', id)
        useGameStore.getState().setRoomSession(this.roomCode!, false)
        useGameStore.getState().setConnected(true)
        this.setupPeerListeners()
        this.startHeartbeat()

        // Connect to Host
        const conn = this.peer!.connect(hostPeerId, {
          metadata: { player: localPlayer },
          reliable: true,
        })

        // Wait up to 3.5s for host connection confirmation before auto-hosting
        fallbackTimer = setTimeout(() => {
          if (!isResolved && this.connections.size === 0) {
            triggerAutoHost()
          }
        }, 3500)

        conn.on('open', () => {
          if (!isResolved) {
            if (fallbackTimer) clearTimeout(fallbackTimer)
            isResolved = true
            resolve()
          }
        })

        this.setupDataConnection(conn)
      })

      this.peer.on('error', (err: any) => {
        console.warn('[P2P] Peer network warning/error:', err)
        if (!isResolved && (err?.type === 'peer-unavailable' || err?.message?.includes('Could not connect to peer'))) {
          triggerAutoHost()
        }
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
      const isSharing = useMediaStore.getState().isScreenSharing
      const screenStream = useMediaStore.getState().localScreenStream

      let streamToAnswer = localStream || new MediaStream()
      if (isSharing && screenStream && screenStream.getVideoTracks()[0]) {
        const combined = new MediaStream()
        if (localStream) {
          localStream.getAudioTracks().forEach((t) => combined.addTrack(t))
        }
        screenStream.getVideoTracks().forEach((t) => combined.addTrack(t))
        streamToAnswer = combined
      }

      call.answer(streamToAnswer)

      const pc = (call as any).peerConnection as RTCPeerConnection
      if (pc) {
        prioritizeH264HardwareCodec(pc)
        if (pc.addEventListener) {
          pc.addEventListener('negotiationneeded', () => {
            prioritizeH264HardwareCodec(pc)
          })
        }
      }

      // Configure receiver jitter buffer to eliminate stutter / frame dropping (up to 5.0s max)
      const applyBuffer = () => {
        const delayMs = useMediaStore.getState().liveBufferDelay || 3000
        const delaySec = Math.max(0.1, Math.min(5.0, delayMs / 1000))
        try {
          if (pc && pc.getReceivers) {
            pc.getReceivers().forEach((receiver) => {
              try {
                (receiver as any).playoutDelayHint = delaySec
              } catch (e) {}
              try {
                if ('jitterBufferTarget' in receiver) {
                  (receiver as any).jitterBufferTarget = delayMs
                }
              } catch (e) {}
            })
          }
        } catch (e) {}
      }

      try {
        const pc = (call as any).peerConnection as RTCPeerConnection
        if (pc && pc.addEventListener) {
          pc.addEventListener('track', () => {
            setTimeout(applyBuffer, 50)
          })
        }
      } catch (e) {}

      call.on('stream', (remoteStream) => {
        console.log('[P2P Media] Received remote stream from:', call.peer)
        applyBuffer()
        useMediaStore.getState().setPeerStream(call.peer, remoteStream)
      })

      call.on('close', () => {
        useMediaStore.getState().removePeerStream(call.peer)
      })

      call.on('error', () => {
        useMediaStore.getState().removePeerStream(call.peer)
      })

      this.mediaCalls.set(call.peer, call)
    })
  }

  private setupDataConnection(conn: DataConnection) {
    conn.on('open', () => {
      console.log('[P2P Data] Connected to peer:', conn.peer)
      this.connections.set(conn.peer, conn)
      this.peerLastSeen.set(conn.peer, Date.now())

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
      this.peerLastSeen.set(conn.peer, Date.now())
      this.handleNetworkMessage(data as NetworkMessage, conn.peer)
    })

    conn.on('close', () => {
      console.log('[P2P Data] Peer disconnected cleanly:', conn.peer)
      this.removePeer(conn.peer)
    })

    conn.on('error', (err) => {
      console.warn('[P2P Data] Peer connection error:', conn.peer, err)
      this.removePeer(conn.peer)
    })

    // Monitor underlying RTCPeerConnection states
    const pc = (conn as any).peerConnection as RTCPeerConnection
    if (pc) {
      pc.addEventListener('connectionstatechange', () => {
        if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
          console.log(`[P2P WebRTC] Connection state ${pc.connectionState} for ${conn.peer}`)
          this.removePeer(conn.peer)
        }
      })
      pc.addEventListener('iceconnectionstatechange', () => {
        if (['disconnected', 'failed', 'closed'].includes(pc.iceConnectionState)) {
          console.log(`[P2P ICE] State ${pc.iceConnectionState} for ${conn.peer}`)
          this.removePeer(conn.peer)
        }
      })
    }
  }

  /**
   * Centralized Peer Removal & Cleanup
   */
  private removePeer(peerId: string) {
    this.peerLastSeen.delete(peerId)
    const conn = this.connections.get(peerId)
    if (conn) {
      try {
        conn.close()
      } catch (e) {}
      this.connections.delete(peerId)
    }

    const wasHost = peerId.endsWith('-host') || (this.roomCode && peerId === `gather-v2-${this.roomCode}-host`)

    useGameStore.getState().removeRemotePlayer(peerId)
    this.endMediaCallWithPeer(peerId)

    if (this.isHost) {
      if (useGameStore.getState().isRoomPublic) {
        const totalPlayers = Object.keys(useGameStore.getState().remotePlayers).length + 1
        PublicRoomsService.getInstance().updateHosting({ playerCount: totalPlayers })
      }
      // Broadcast player leave to other peers
      this.broadcast(
        {
          type: 'PLAYER_LEAVE',
          senderId: this.peer ? this.peer.id : 'system',
          payload: { peerId },
          timestamp: Date.now(),
        },
        peerId
      )
    } else if (wasHost && this.roomCode) {
      this.handleHostDisconnected(peerId)
    }
  }

  /**
   * Automatic Host Migration & Failover Election
   */
  private handleHostDisconnected(hostPeerId: string) {
    console.log('[P2P Failover] Host disconnected from room:', this.roomCode)
    if (!this.roomCode) return

    // Identify remaining candidates
    const remainingPeers = Array.from(this.connections.keys()).filter((pid) => pid !== hostPeerId)
    const myId = this.peer ? this.peer.id : ''
    const candidateList = [myId, ...remainingPeers].filter(Boolean).sort()

    console.log('[P2P Failover] Candidates for host election:', candidateList)

    if (candidateList.length > 0 && candidateList[0] === myId) {
      console.log('[P2P Failover] This client was ELECTED as the NEW ROOM HOST!')
      this.promoteToHost()
    } else {
      console.log(`[P2P Failover] Peer ${candidateList[0]} elected. Reconnecting in 2.5s...`)
      setTimeout(() => {
        if (!this.isHost && this.roomCode) {
          this.reconnectToHost(`gather-v2-${this.roomCode}-host`)
        }
      }, 2500)
    }
  }

  private async promoteToHost() {
    if (!this.roomCode) return
    this.isHost = true
    const localPlayer = useGameStore.getState().localPlayer

    // Update store state
    useGameStore.getState().setConnectionHostId(localPlayer.id)
    useGameStore.getState().updatePlayerRole(localPlayer.id, 'host', {
      canEditMap: true,
      canManageRoles: true,
      canMuteOthers: true,
      canKick: true,
    })

    // Clean up old client peer instance
    this.stopHeartbeat()
    if (this.peer) {
      try {
        this.peer.destroy()
      } catch (e) {}
      this.peer = null
    }
    this.connections.clear()

    const hostPeerId = `gather-v2-${this.roomCode}-host`
    this.peer = new Peer(hostPeerId, {
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' },
        ],
      },
    })

    this.peer.on('open', (id) => {
      console.log('[P2P Failover] Successfully claimed Host ID:', id)
      useGameStore.getState().setConnected(true)
      this.setupPeerListeners()
      this.startHeartbeat()

      if (useGameStore.getState().isRoomPublic) {
        PublicRoomsService.getInstance().startHosting({
          id: 'room-' + this.roomCode,
          code: this.roomCode!,
          name: useGameStore.getState().roomName,
          description: useGameStore.getState().roomDescription,
          hostId: localPlayer.id,
          hostName: localPlayer.name,
          hostAvatar: localPlayer.avatar,
          hostColor: localPlayer.avatar?.shirtColor || '#4c6ef5',
          playerCount: Object.keys(useGameStore.getState().remotePlayers).length + 1,
          maxPlayers: useGameStore.getState().maxPlayers,
          color: useGameStore.getState().roomColor,
        })
      }
    })

    this.peer.on('error', (err) => {
      console.error('[P2P Failover] Error claiming host:', err)
    })
  }

  private reconnectToHost(hostPeerId: string) {
    if (!this.peer || this.peer.destroyed) return
    console.log('[P2P Failover] Attempting to reconnect to new host endpoint:', hostPeerId)
    const localPlayer = useGameStore.getState().localPlayer
    const conn = this.peer.connect(hostPeerId, {
      metadata: { player: localPlayer },
      reliable: true,
    })
    this.setupDataConnection(conn)
  }

  private handleNetworkMessage(msg: NetworkMessage, peerId: string) {
    this.peerLastSeen.set(peerId, Date.now())
    processNetworkMessage(
      msg,
      peerId,
      this.isHost,
      (m, exclude) => this.broadcast(m, exclude),
      (pid) => this.removePeer(pid),
      (remotePlayer) => this.checkZoneCallEligibility(remotePlayer)
    )
  }

  /**
   * Heartbeat System to Detect Stale/Disconnected Peers Automatically
   */
  private startHeartbeat() {
    this.stopHeartbeat()

    // 1. Send heartbeat packet every 2.5s
    this.heartbeatInterval = setInterval(() => {
      if (!this.peer || this.connections.size === 0) return
      const pingMsg: NetworkMessage = {
        type: 'HEARTBEAT',
        senderId: this.peer.id,
        payload: {},
        timestamp: Date.now(),
      }
      this.broadcast(pingMsg)
    }, 2500)

    // 2. Prune silent peers (no message for >6s)
    this.staleCheckInterval = setInterval(() => {
      const now = Date.now()
      const STALE_TIMEOUT_MS = 6000

      this.peerLastSeen.forEach((lastSeen, peerId) => {
        if (now - lastSeen > STALE_TIMEOUT_MS) {
          console.log(`[P2P] Peer ${peerId} timed out (${now - lastSeen}ms silent). Pruning.`)
          this.removePeer(peerId)
        }
      })
    }, 3000)
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
    if (this.staleCheckInterval) {
      clearInterval(this.staleCheckInterval)
      this.staleCheckInterval = null
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
    MediaCallHandler.checkZoneCallEligibility(
      remotePlayer,
      this.peer,
      this.mediaCalls,
      (pid) => this.endMediaCallWithPeer(pid)
    )
  }

  public endMediaCallWithPeer(peerId: string) {
    MediaCallHandler.endMediaCall(this.mediaCalls, peerId)
  }

  public endAllZoneMediaCalls() {
    MediaCallHandler.endAllMediaCalls(this.mediaCalls)
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
    MediaCallHandler.replaceVideoTrack(this.mediaCalls, newTrack, isScreenShare, maxBitrate, maxFramerate)
  }

  /**
   * Replace active audio track (When mixing system audio with microphone)
   */
  public replaceAudioTrack(newTrack: MediaStreamTrack | null) {
    MediaCallHandler.replaceAudioTrack(this.mediaCalls, newTrack)
  }

  /**
   * Broadcast Local Movement
   */
  public sendPlayerMove(x: number, y: number, direction: 'up' | 'down' | 'left' | 'right', isMoving: boolean) {
    if (!this.peer) return
    const msg: NetworkMessage = {
      type: 'PLAYER_MOVE',
      senderId: this.peer.id,
      payload: { x, y, direction, isMoving },
      timestamp: Date.now(),
    }
    this.broadcast(msg)
  }

  public sendMovement(x: number, y: number, direction: 'up' | 'down' | 'left' | 'right', isMoving: boolean) {
    this.sendPlayerMove(x, y, direction, isMoving)
  }

  /**
   * Broadcast Local Player Status / Presence / Zone changes
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
    this.stopHeartbeat()
    PublicRoomsService.getInstance().stopHosting()

    // Send immediate PLAYER_LEAVE broadcast so peers remove us instantly
    if (this.peer && this.connections.size > 0) {
      const leaveMsg: NetworkMessage = {
        type: 'PLAYER_LEAVE',
        senderId: this.peer.id,
        payload: { peerId: this.peer.id },
        timestamp: Date.now(),
      }
      this.broadcast(leaveMsg)
    }

    this.peerLastSeen.clear()

    this.mediaCalls.forEach((call) => {
      try {
        call.close()
      } catch (e) {}
    })
    this.mediaCalls.clear()

    this.connections.forEach((conn) => {
      try {
        conn.close()
      } catch (e) {}
    })
    this.connections.clear()

    if (this.peer) {
      try {
        this.peer.destroy()
      } catch (e) {}
      this.peer = null
    }

    useGameStore.getState().setConnected(false)
    useGameStore.getState().clearRemotePlayers()
    useMediaStore.getState().clearAllPeerStreams()
  }
}
