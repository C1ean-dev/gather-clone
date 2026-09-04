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
import { MediaCallHandler, ICE_CONNECT_TIMEOUT_MS, SHARED_RTC_CONFIG, resolveCallGlare } from './mediaCalls'
import { prioritizeH264HardwareCodec } from '../media/hardwareCodec'
import { DynamicBufferManager } from '../services/DynamicBufferManager'
import { diagLog, summarizeStream } from '../utils/diagnosticLogger'

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
        const ms = e.detail || MediaCallHandler.DEFAULT_LIVE_BUFFER_MS
        // Legacy single-number slider event: apply ONLY to video; audio
        // stays at its dynamic value. The DynamicBufferManager writes to
        // liveBufferDelay frequently (every 1.5s) so this rarely fires
        // unless the user touches the slider.
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
    },
    retryCount: number = 0
  ): Promise<string> {
    this.roomCode = roomCode.trim().toUpperCase()
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
      let hostTimeout: any = null

      diagLog('room', 'create-begin', { roomCode: this.roomCode, hostPeerId })

      hostTimeout = setTimeout(() => {
        if (!resolved) {
          resolved = true
          console.warn(`[P2P Host] Host registration timeout (${hostPeerId})`)
          diagLog('room', 'create-timeout', { roomCode: this.roomCode, hostPeerId })
          // Never destroy a NEWER run's peer: a stale timeout must not kill
          // a session that already replaced this one (fast room switching).
          if (this.peer !== myPeer) return
          try {
            if (this.peer) {
              this.peer.destroy()
              this.peer = null
            }
          } catch (e) {}
          if (retryCount === 0) {
            console.log('[P2P Host] Host registration timed out, attempting to join as client...')
            this.joinRoom(this.roomCode!, localPlayer, retryCount + 1)
              .then(() => resolve(this.roomCode!))
              .catch((err) => reject(err))
          } else {
            reject(new Error('Tempo limite de conexão excedido ao registrar o espaço no servidor P2P.'))
          }
        }
      }, 7000)

      const myPeer = new Peer(hostPeerId, {
        // STUN + TURN fallback (see SHARED_RTC_CONFIG): without the TURN
        // leg, symmetric-NAT users spin ICE for 10-20s ("delay").
        config: SHARED_RTC_CONFIG,
      })
      this.peer = myPeer

      this.peer.on('open', (id) => {
        if (resolved) return
        // Stale open (a newer run replaced this peer): quietly drop it.
        if (this.peer !== myPeer) {
          try {
            myPeer.destroy()
          } catch {}
          return
        }
        resolved = true
        if (hostTimeout) clearTimeout(hostTimeout)
        console.log('[P2P] Room created with Host ID:', id)
        diagLog('room', 'create-open', { roomCode: this.roomCode, hostPeerId: id })
        useGameStore.getState().setRoomSession(this.roomCode!, true, options)
        useGameStore.getState().setConnected(true)
        this.setupPeerListeners()
        this.startHeartbeat()
        resolve(this.roomCode!)
      })

      this.peer.on('error', async (err: any) => {
        if (resolved) return
        // Stale error from a replaced peer: ignore entirely.
        if (this.peer !== myPeer) return
        if (hostTimeout) clearTimeout(hostTimeout)
        console.warn('[P2P] Error hosting room, checking fallback:', err)
        diagLog('room', 'create-error', {
          roomCode: this.roomCode,
          type: err?.type || null,
          message: String(err?.message || err || '').slice(0, 160),
        })

        // If ID is already taken or unavailable (e.g. active room already hosted or lingering session)
        if (
          (err?.type === 'unavailable-id' || err?.message?.includes('is taken') || err?.type === 'server-error') &&
          retryCount === 0
        ) {
          resolved = true
          console.log('[P2P] Host ID already registered. Joining as client to active room...')
          try {
            if (this.peer) {
              try {
                this.peer.destroy()
              } catch (e) {}
              this.peer = null
            }
            await this.joinRoom(this.roomCode!, localPlayer, retryCount + 1)
            resolve(this.roomCode!)
          } catch (joinErr) {
            reject(joinErr)
          }
        } else {
          resolved = true
          try {
            if (this.peer) {
              this.peer.destroy()
              this.peer = null
            }
          } catch (e) {}
          reject(err)
        }
      })
    })
  }

  /**
   * Join an existing Room (with Smart Auto-Host Fallback if unhosted)
   */
  public async joinRoom(roomCode: string, localPlayer: Player, retryCount: number = 0): Promise<void> {
    this.roomCode = roomCode.trim().toUpperCase()
    this.isHost = false
    const clientPeerId = `gather-v2-${this.roomCode}-peer-${Math.random().toString(36).substring(2, 7)}`
    const hostPeerId = `gather-v2-${this.roomCode}-host`

    // Clean up any stale peer connection first
    if (this.peer) {
      try {
        this.peer.destroy()
      } catch (e) {}
      this.peer = null
    }

    return new Promise((resolve, reject) => {
      let isResolved = false
      let fallbackTimer: any = null
      let joinTimeout: any = null

      diagLog('room', 'join-begin', { roomCode: this.roomCode, clientPeerId })

      const triggerAutoHost = async () => {
        if (isResolved) return
        // Stale run (a newer session replaced this peer): stay out of the way.
        if (this.peer !== myPeer) return
        isResolved = true
        if (fallbackTimer) clearTimeout(fallbackTimer)
        if (joinTimeout) clearTimeout(joinTimeout)
        console.log(`[P2P Join] Host ${hostPeerId} is offline or unavailable. Auto-hosting space ${this.roomCode}...`)
        diagLog('room', 'join-autohost', { roomCode: this.roomCode })

        try {
          if (this.peer) {
            try {
              this.peer.destroy()
            } catch (e) {}
            this.peer = null
          }
          if (retryCount === 0) {
            await this.createRoom(
              this.roomCode!,
              localPlayer,
              {
                roomName: `Espaço ${this.roomCode}`,
                isPublic: false,
              },
              retryCount + 1
            )
            resolve()
          } else {
            reject(new Error(`Host da sala ${this.roomCode} não respondeu.`))
          }
        } catch (err) {
          console.error('[P2P AutoHost] Error promoting to host:', err)
          reject(err)
        }
      }

      joinTimeout = setTimeout(() => {
        if (!isResolved) {
          console.warn(`[P2P Join] Overall connection timeout for room ${this.roomCode}`)
          diagLog('room', 'join-timeout-autohost', { roomCode: this.roomCode })
          triggerAutoHost()
        }
      }, 7500)

      const myPeer = new Peer(clientPeerId, {
        // STUN + TURN fallback (see SHARED_RTC_CONFIG).
        config: SHARED_RTC_CONFIG,
      })
      this.peer = myPeer

      this.peer.on('open', (id) => {
        console.log('[P2P] Joined peer network with ID:', id)
        if (isResolved || this.peer !== myPeer) return
        diagLog('room', 'join-open', { roomCode: this.roomCode, clientPeerId: id })
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
            if (joinTimeout) clearTimeout(joinTimeout)
            isResolved = true
            diagLog('room', 'join-host-open', { roomCode: this.roomCode })
            resolve()
          }
        })

        conn.on('error', (connErr) => {
          console.warn('[P2P Data] Failed to connect to host:', connErr)
          if (!isResolved) {
            triggerAutoHost()
          }
        })

        conn.on('close', () => {
          if (!isResolved) {
            console.warn('[P2P Data] Host connection closed before open')
            triggerAutoHost()
          }
        })

        this.setupDataConnection(conn)
      })

      this.peer.on('error', (err: any) => {
        console.warn('[P2P] Peer network warning/error:', err)
        if (!isResolved) {
          // Stale error from a replaced peer: ignore entirely.
          if (this.peer !== myPeer) return
          diagLog('room', 'join-error', {
            roomCode: this.roomCode,
            type: err?.type || null,
            message: String(err?.message || err || '').slice(0, 160),
          })
          if (
            err?.type === 'peer-unavailable' ||
            err?.message?.includes('Could not connect to peer') ||
            err?.type === 'unavailable-id' ||
            err?.type === 'server-error'
          ) {
            triggerAutoHost()
          } else {
            isResolved = true
            if (fallbackTimer) clearTimeout(fallbackTimer)
            if (joinTimeout) clearTimeout(joinTimeout)
            try {
              if (this.peer) {
                this.peer.destroy()
                this.peer = null
              }
            } catch (e) {}
            reject(new Error(`Falha de conexão P2P: ${err?.type || err?.message || 'erro de rede'}`))
          }
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
      const myId = this.peer ? this.peer.id : ''
      const existing = this.mediaCalls.get(call.peer)
      if (existing && existing !== call) {
        // Glare: both sides dialed on zone entry. Converge on ONE call —
        // the smaller peer id's OUTGOING call wins (see resolveCallGlare).
        const verdict = resolveCallGlare(
          myId,
          call.peer,
          (existing as unknown as { __dir?: 'in' | 'out' }).__dir
        )
        if (verdict === 'drop-incoming') {
          diagLog('p2p', 'call.duplicate-dropped', { fromPeer: call.peer })
          try {
            call.close()
          } catch {}
          return
        }
        diagLog('p2p', 'call.duplicate-replaced', { fromPeer: call.peer })
        // Drop the map entry BEFORE closing so the loser's 'close' handler
        // (guarded by map identity below) cannot wipe the winner's tile.
        this.mediaCalls.delete(call.peer)
        try {
          ;(existing as unknown as { close?: () => void }).close?.()
        } catch {}
        // Fall through: answer the winner, overwrite the map entry below.
      }
      const localStream = useMediaStore.getState().localStream
      const isSharing = useMediaStore.getState().isScreenSharing
      const screenStream = useMediaStore.getState().localScreenStream

      // Answer WITH the real stream in the single PeerJS negotiation.
      // (Never attach tracks directly on the pc afterwards — PeerJS ignores
      // later `negotiationneeded`, so that would leave the caller with BLACK
      // video. See MediaCallHandler.applyEncoderCaps.)
      useGameStore.getState().setCallState(call.peer, 'connecting')

      // Seed adaptive buffer for this brand-new connection so it starts
      // at the floor and grows only if the network actually needs it.
      DynamicBufferManager.getInstance().resetForNewCall()

      let streamToAnswer: MediaStream

      if (isSharing && screenStream && screenStream.getVideoTracks()[0]) {
        const combined = new MediaStream()
        if (localStream) {
          localStream.getAudioTracks().forEach((t) => combined.addTrack(t))
        }
        screenStream.getVideoTracks().forEach((t) => combined.addTrack(t))
        streamToAnswer = combined
      } else if (localStream) {
        streamToAnswer = localStream
      } else {
        streamToAnswer = new MediaStream()
        diagLog('p2p', 'call.answer-empty-no-local-stream', { fromPeer: call.peer })
      }

      diagLog('p2p', 'call.answer', {
        fromPeer: call.peer,
        sharing: isSharing,
        tracks: summarizeStream(streamToAnswer),
      })
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
      // Inbound track arrival + mute/unmute transitions (receiver-side
      // visibility — 'stream' alone never re-fires on replaceTrack).
      MediaCallHandler.watchRemoteTracks(pc, call.peer, 'in')

      // Configure receiver jitter buffer. The DynamicBufferManager runs
      // every 1.5s and will overwrite this with the optimal adaptive value
      // — we just seed it with the floor here so the very first packet
      // doesn't go through with a 5s+ legacy default. Audio is left
      // undefined on purpose: applyReceiverBuffer then reads the adaptive
      // engine's current audio value (1ms on a fresh call).
      const applyBuffer = (audioMs?: number, videoMs?: number) => {
        const v = videoMs ?? MediaCallHandler.DEFAULT_LIVE_BUFFER_MS
        if (audioMs === undefined) {
          MediaCallHandler.applyReceiverBuffer(pc, v)
        } else {
          MediaCallHandler.applyReceiverBuffer(pc, v, audioMs)
        }
      }

      try {
        if (pc && pc.addEventListener) {
          pc.addEventListener('track', () => {
            setTimeout(applyBuffer, 50)
          })
        }
      } catch (e) {}

      let settled = false
      let iceTimeout: any = null
      const markConnected = (reason: string) => {
        if (settled) return
        settled = true
        if (iceTimeout) {
          clearTimeout(iceTimeout)
          iceTimeout = null
        }
        console.log(`[P2P Media] Connected incoming call from ${call.peer} (${reason})`)
        diagLog('p2p', 'call.incoming-connected', { fromPeer: call.peer, reason })
        // Prove the sender side is actually transmitting (bytesSent).
        MediaCallHandler.logSenderSnapshot(this.mediaCalls, 'incoming-connected')
        if (pc) MediaCallHandler.applyEncoderCaps(pc)
        applyBuffer()
        useGameStore.getState().setCallState(call.peer, 'connected')
      }
      const markFailed = (reason: string) => {
        if (settled) return
        settled = true
        if (iceTimeout) {
          clearTimeout(iceTimeout)
          iceTimeout = null
        }
        console.warn(`[P2P Media] Incoming call from ${call.peer} failed (${reason})`)
        diagLog('p2p', 'call.incoming-failed', {
          fromPeer: call.peer,
          reason,
          iceState: (pc as RTCPeerConnection | null)?.iceConnectionState,
        })
        useGameStore.getState().setCallState(call.peer, 'failed')
      }

      if (pc && pc.addEventListener) {
        pc.addEventListener('iceconnectionstatechange', () => {
          const s = pc.iceConnectionState
          if (s === 'connected' || s === 'completed') {
            markConnected('ice=' + s)
          } else if (s === 'failed') {
            markFailed('ice=failed')
          }
        })
        pc.addEventListener('connectionstatechange', () => {
          const s = pc.connectionState
          if (s === 'connected') {
            markConnected('pc=connected')
          } else if (s === 'failed') {
            markFailed('pc=failed')
          }
        })
      }

      // Late-race safety net only: settle 'connected' if the transport is
      // provably up — never fake it.
      iceTimeout = setTimeout(() => {
        try {
          const s = pc?.iceConnectionState
          if (s === 'connected' || s === 'completed') markConnected('late-ice=' + s)
        } catch (e) {}
      }, ICE_CONNECT_TIMEOUT_MS)

      call.on('stream', (remoteStream) => {
        console.log('[P2P Media] Received remote stream from:', call.peer)
        // A losing glare duplicate can still fire after being replaced:
        // only the map's current call may drive the tile and the state.
        if (this.mediaCalls.get(call.peer) !== call) {
          diagLog('p2p', 'call.remote-stream-stale', { fromPeer: call.peer })
          return
        }
        markConnected('remote-stream')
        applyBuffer()
        diagLog('p2p', 'call.remote-stream', {
          fromPeer: call.peer,
          tracks: summarizeStream(remoteStream),
        })
        useMediaStore.getState().setPeerStream(call.peer, remoteStream)
      })

      call.on('close', () => {
        if (iceTimeout) clearTimeout(iceTimeout)
        if (this.mediaCalls.get(call.peer) === call) {
          useGameStore.getState().setCallState(call.peer, 'idle')
          useMediaStore.getState().removePeerStream(call.peer)
        }
      })

      call.on('error', () => {
        if (iceTimeout) clearTimeout(iceTimeout)
        if (this.mediaCalls.get(call.peer) === call) {
          useGameStore.getState().setCallState(call.peer, 'failed')
          useMediaStore.getState().removePeerStream(call.peer)
        }
      })

      ;(call as unknown as { __dir?: 'in' | 'out' }).__dir = 'in'
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
          // Chunked delivery: one giant CUSTOM_ASSETS_SYNC (MBs of dataURL
          // pixel-art frames) saturates the host uplink for seconds and the
          // resulting router bufferbloat delays LIVE audio/video for everyone
          // mid-call. Batches of 8 assets every 120ms leave headroom for
          // media. syncRemoteCustomAssets MERGES by id, so batches are
          // protocol-compatible with receivers expecting a single message.
          const ASSET_BATCH_SIZE = 8
          const ASSET_BATCH_GAP_MS = 120
          for (let i = 0; i < customAssets.length; i += ASSET_BATCH_SIZE) {
            const batch = customAssets.slice(i, i + ASSET_BATCH_SIZE)
            const isFirst = i === 0
            const sendBatch = () => {
              this.sendToPeer(conn, {
                type: 'CUSTOM_ASSETS_SYNC',
                senderId: this.peer!.id,
                payload: { customAssets: batch, categories: isFirst ? customCategories : undefined },
                timestamp: Date.now(),
              })
            }
            if (isFirst) {
              sendBatch()
            } else {
              setTimeout(() => {
                // sendToPeer already no-ops on closed connections.
                sendBatch()
              }, (i / ASSET_BATCH_SIZE) * ASSET_BATCH_GAP_MS)
            }
          }
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
      // STUN + TURN fallback (see SHARED_RTC_CONFIG).
      config: SHARED_RTC_CONFIG,
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

  /**
   * Re-evaluate zone calls against every known remote player. Called when
   * the local media stream becomes ready AFTER the data channel already
   * delivered PLAYER_JOIN messages (parallel room-join path) — without this,
   * calls that "should" exist are silently missed until someone moves zones.
   */
  public recheckZoneCalls() {
    const remotePlayers = useGameStore.getState().remotePlayers
    Object.values(remotePlayers).forEach((p) => {
      this.checkZoneCallEligibility(p)
    })
  }

  public endMediaCallWithPeer(peerId: string) {
    MediaCallHandler.endMediaCall(this.mediaCalls, peerId)
  }

  /**
   * Log what this side is actually SENDING on every live call (sender track
   * state + outbound-rtp counters). Called on media transitions (mute,
   * camera, screenshare) so the next diagnostic log shows whether a black
   * tile is a sender problem (bytesSent flat) or a receiver/tile problem.
   */
  public logSenderSnapshot(reason: string) {
    MediaCallHandler.logSenderSnapshot(this.mediaCalls, reason)
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

    // Reset adaptive buffer state so a future room join starts fresh.
    DynamicBufferManager.getInstance().resetForNewCall()

    this.roomCode = null
    this.isHost = false

    useGameStore.getState().setConnected(false)
    useGameStore.getState().setRoomSession('', false)
    useGameStore.getState().clearRemotePlayers()
    // clearRemotePlayers already clears callStates (defined in same set()).
    useMediaStore.getState().clearAllPeerStreams()
  }
}
