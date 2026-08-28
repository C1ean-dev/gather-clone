import { PublicRoomInfo } from '../types/game'

const STORAGE_KEY = 'gather_v2_public_hub_cache'
const BROADCAST_CHANNEL_NAME = 'gather_v2_public_hub_channel'
const HEARTBEAT_INTERVAL_MS = 10000 // 10s
const STALE_ROOM_THRESHOLD_MS = 35000 // 35s

type MessageType = 'ANNOUNCE_ROOM' | 'UNREGISTER_ROOM' | 'QUERY_ROOMS' | 'HEARTBEAT'

interface HubMessage {
  type: MessageType
  roomId?: string
  roomInfo?: PublicRoomInfo
  timestamp: number
}

export class PublicRoomsService {
  private static instance: PublicRoomsService
  private rooms: Map<string, PublicRoomInfo> = new Map()
  private listeners: Set<(rooms: PublicRoomInfo[]) => void> = new Set()
  private broadcastChannel: BroadcastChannel | null = null
  private ws: WebSocket | null = null
  private heartbeatTimer: any = null
  private pruneTimer: any = null
  private currentHosting: PublicRoomInfo | null = null
  private isConnectedToRelay: boolean = false

  private constructor() {
    this.initLocalStorageCache()
    this.initBroadcastChannel()
    this.initWebSocketRelay()
    this.startPruneInterval()
  }

  public static getInstance(): PublicRoomsService {
    if (!PublicRoomsService.instance) {
      PublicRoomsService.instance = new PublicRoomsService()
    }
    return PublicRoomsService.instance
  }

  /**
   * 1. Initialize Local Storage Cache
   */
  private initLocalStorageCache() {
    try {
      if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
        const raw = window.localStorage.getItem(STORAGE_KEY)
        if (raw) {
          const parsed: PublicRoomInfo[] = JSON.parse(raw)
          const now = Date.now()
          parsed.forEach((room) => {
            if (now - room.lastHeartbeat < STALE_ROOM_THRESHOLD_MS) {
              this.rooms.set(room.code, room)
            }
          })
        }
      }
    } catch (e) {
      // Ignore
    }
  }

  private saveToStorage() {
    try {
      if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
        const activeRooms = Array.from(this.rooms.values())
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(activeRooms))
      }
    } catch (e) {
      // Ignore
    }
  }

  /**
   * 2. Local Multi-Window / Multi-Tab Synchronization
   */
  private initBroadcastChannel() {
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        this.broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME)
        this.broadcastChannel.onmessage = (event) => {
          this.handleIncomingMessage(event.data as HubMessage)
        }
      }
    } catch (err) {
      console.warn('[PublicRoomsHub] BroadcastChannel not supported:', err)
    }
  }

  /**
   * 3. Public WebSockets Relay for Internet P2P discovery
   */
  private initWebSocketRelay() {
    const relayUrls = [
      'wss://broker.emqx.io:8084/mqtt',
      'wss://broker.hivemq.com:8884/mqtt',
    ]

    const connectToRelay = (urlIndex: number = 0) => {
      if (urlIndex >= relayUrls.length) {
        return
      }

      try {
        const url = relayUrls[urlIndex]
        const ws = new WebSocket(url, ['mqtt'])

        ws.onopen = () => {
          this.isConnectedToRelay = true
          this.ws = ws
          this.sendMqttConnectAndSubscribe()
          this.queryRooms()
        }

        ws.onmessage = (event) => {
          this.handleMqttMessage(event.data)
        }

        ws.onerror = () => {
          this.isConnectedToRelay = false
        }

        ws.onclose = () => {
          this.isConnectedToRelay = false
          this.ws = null
          // Retry connection after delay
          setTimeout(() => connectToRelay((urlIndex + 1) % relayUrls.length), 10000)
        }
      } catch (err) {
        // Fallback to next relay
        setTimeout(() => connectToRelay(urlIndex + 1), 5000)
      }
    }

    if (typeof window !== 'undefined' && 'WebSocket' in window) {
      connectToRelay(0)
    }
  }

  /**
   * Minimal MQTT 3.1.1 WebSocket Framing for Zero-Dependency WebSockets PubSub
   */
  private sendMqttConnectAndSubscribe() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return

    try {
      const clientId = 'gather_hub_' + Math.random().toString(36).substring(2, 10)
      const connectPacket = this.encodeMqttConnect(clientId)
      this.ws.send(connectPacket)

      // MQTT SUBSCRIBE to topic "gather_v2_public_hub/events"
      setTimeout(() => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          const subPacket = this.encodeMqttSubscribe('gather_v2_public_hub/events', 1)
          this.ws.send(subPacket)
        }
      }, 500)
    } catch (e) {
      console.warn('[PublicRoomsHub] MQTT framing failed:', e)
    }
  }

  private encodeMqttConnect(clientId: string): Uint8Array {
    const protocolName = 'MQTT'
    const protoLen = protocolName.length
    const clientLen = clientId.length
    const varHeader = [0, protoLen, ...Array.from(protocolName).map((c) => c.charCodeAt(0)), 4, 2, 0, 60] // clean session, 60s keepalive
    const payload = [0, clientLen, ...Array.from(clientId).map((c) => c.charCodeAt(0))]
    const remainingLength = varHeader.length + payload.length
    return new Uint8Array([0x10, remainingLength, ...varHeader, ...payload])
  }

  private encodeMqttSubscribe(topic: string, packetId: number): Uint8Array {
    const topicLen = topic.length
    const varHeader = [packetId >> 8, packetId & 0xff]
    const payload = [0, topicLen, ...Array.from(topic).map((c) => c.charCodeAt(0)), 0]
    const remainingLength = varHeader.length + payload.length
    return new Uint8Array([0x82, remainingLength, ...varHeader, ...payload])
  }

  private encodeMqttPublish(topic: string, message: string): Uint8Array {
    const topicLen = topic.length
    const topicBytes = [0, topicLen, ...Array.from(topic).map((c) => c.charCodeAt(0))]
    const msgBytes = Array.from(message).map((c) => c.charCodeAt(0))
    const remainingLength = topicBytes.length + msgBytes.length

    // Handle variable length encoding
    const lengthBytes: number[] = []
    let len = remainingLength
    do {
      let encodedByte = len % 128
      len = Math.floor(len / 128)
      if (len > 0) encodedByte |= 128
      lengthBytes.push(encodedByte)
    } while (len > 0)

    return new Uint8Array([0x30, ...lengthBytes, ...topicBytes, ...msgBytes])
  }

  private handleMqttMessage(data: any) {
    try {
      if (data instanceof ArrayBuffer || data instanceof Uint8Array) {
        const bytes = new Uint8Array(data)
        // Check if PUBLISH packet (0x30 to 0x3F)
        if ((bytes[0] & 0xf0) === 0x30) {
          let index = 1
          while ((bytes[index] & 0x80) !== 0) index++ // skip remaining length
          index++
          const topicLen = (bytes[index] << 8) | bytes[index + 1]
          index += 2 + topicLen
          const payloadStr = String.fromCharCode.apply(null, Array.from(bytes.slice(index)))
          const msg = JSON.parse(payloadStr) as HubMessage
          this.handleIncomingMessage(msg)
        }
      } else if (typeof data === 'string') {
        const msg = JSON.parse(data) as HubMessage
        this.handleIncomingMessage(msg)
      }
    } catch (e) {
      // Ignore binary control packet parsing errors
    }
  }

  private broadcastMessage(msg: HubMessage) {
    // 1. Local BroadcastChannel
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(msg)
      } catch (err) {
        // Ignore
      }
    }

    // 2. WebSocket MQTT Relay
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        const str = JSON.stringify(msg)
        const packet = this.encodeMqttPublish('gather_v2_public_hub/events', str)
        this.ws.send(packet)
      } catch (err) {
        // Ignore
      }
    }
  }

  /**
   * 4. Handle incoming messages from peers / relay
   */
  private handleIncomingMessage(msg: HubMessage) {
    if (!msg || !msg.type) return

    const now = Date.now()

    switch (msg.type) {
      case 'ANNOUNCE_ROOM':
      case 'HEARTBEAT': {
        if (msg.roomInfo && msg.roomInfo.code) {
          const room: PublicRoomInfo = {
            ...msg.roomInfo,
            lastHeartbeat: now,
          }
          this.rooms.set(room.code, room)
          this.saveToStorage()
          this.notifyListeners()
        }
        break
      }

      case 'UNREGISTER_ROOM': {
        if (msg.roomId) {
          this.rooms.delete(msg.roomId)
          this.saveToStorage()
          this.notifyListeners()
        }
        break
      }

      case 'QUERY_ROOMS': {
        // If we are currently hosting a room, answer with our announcement
        if (this.currentHosting) {
          this.broadcastMessage({
            type: 'ANNOUNCE_ROOM',
            roomInfo: {
              ...this.currentHosting,
              lastHeartbeat: now,
            },
            timestamp: now,
          })
        }
        break
      }
    }
  }

  /**
   * 5. Start Hosting a Public Room
   */
  public startHosting(
    roomInfo: Omit<PublicRoomInfo, 'lastHeartbeat' | 'createdAt'> & { createdAt?: number }
  ) {
    const now = Date.now()
    const fullRoomInfo: PublicRoomInfo = {
      ...roomInfo,
      createdAt: roomInfo.createdAt || now,
      lastHeartbeat: now,
    }

    this.currentHosting = fullRoomInfo
    this.rooms.set(fullRoomInfo.code, fullRoomInfo)
    this.saveToStorage()
    this.notifyListeners()

    // Send immediate announcement
    this.broadcastMessage({
      type: 'ANNOUNCE_ROOM',
      roomInfo: fullRoomInfo,
      timestamp: now,
    })

    // Setup repeating heartbeat
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer)
    this.heartbeatTimer = setInterval(() => {
      if (this.currentHosting) {
        this.currentHosting.lastHeartbeat = Date.now()
        this.rooms.set(this.currentHosting.code, this.currentHosting)
        this.broadcastMessage({
          type: 'HEARTBEAT',
          roomInfo: this.currentHosting,
          timestamp: Date.now(),
        })
      }
    }, HEARTBEAT_INTERVAL_MS)
  }

  /**
   * Update Player Count or Room details while hosting
   */
  public updateHosting(update: Partial<PublicRoomInfo>) {
    if (!this.currentHosting) return

    this.currentHosting = {
      ...this.currentHosting,
      ...update,
      lastHeartbeat: Date.now(),
    }

    this.rooms.set(this.currentHosting.code, this.currentHosting)
    this.saveToStorage()
    this.notifyListeners()

    this.broadcastMessage({
      type: 'ANNOUNCE_ROOM',
      roomInfo: this.currentHosting,
      timestamp: Date.now(),
    })
  }

  /**
   * Stop Hosting / Close Public Room
   */
  public stopHosting() {
    if (!this.currentHosting) return

    const roomId = this.currentHosting.code
    this.currentHosting = null

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }

    this.rooms.delete(roomId)
    this.saveToStorage()
    this.notifyListeners()

    this.broadcastMessage({
      type: 'UNREGISTER_ROOM',
      roomId,
      timestamp: Date.now(),
    })
  }

  /**
   * Query all active rooms on the network
   */
  public queryRooms() {
    this.broadcastMessage({
      type: 'QUERY_ROOMS',
      timestamp: Date.now(),
    })
  }

  /**
   * Periodic pruning of inactive/offline rooms (>35s without heartbeat)
   */
  private startPruneInterval() {
    if (this.pruneTimer) clearInterval(this.pruneTimer)
    this.pruneTimer = setInterval(() => {
      const now = Date.now()
      let changed = false

      this.rooms.forEach((room, code) => {
        // Do not prune our own currently hosted room
        if (this.currentHosting && this.currentHosting.code === code) return

        if (now - room.lastHeartbeat > STALE_ROOM_THRESHOLD_MS) {
          this.rooms.delete(code)
          changed = true
        }
      })

      if (changed) {
        this.saveToStorage()
        this.notifyListeners()
      }
    }, 5000)
  }

  /**
   * Get all active public rooms sorted by activity
   */
  public getRooms(): PublicRoomInfo[] {
    const list = Array.from(this.rooms.values())
    const now = Date.now()
    return list
      .filter((r) => now - r.lastHeartbeat < STALE_ROOM_THRESHOLD_MS)
      .sort((a, b) => b.playerCount - a.playerCount || b.createdAt - a.createdAt)
  }

  /**
   * Subscribe to real-time room updates
   */
  public subscribe(listener: (rooms: PublicRoomInfo[]) => void): () => void {
    this.listeners.add(listener)
    listener(this.getRooms())
    this.queryRooms() // Ask for fresh announcements

    return () => {
      this.listeners.delete(listener)
    }
  }

  private notifyListeners() {
    const rooms = this.getRooms()
    this.listeners.forEach((listener) => {
      try {
        listener(rooms)
      } catch (err) {
        console.error('[PublicRoomsHub] Listener error:', err)
      }
    })
  }

  public refresh() {
    this.queryRooms()
    this.notifyListeners()
  }
}
