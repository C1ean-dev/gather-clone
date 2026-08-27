import { TILE_SIZE, FURNITURE_CATALOG } from './Constants'
import { PixelArtRenderer } from './PixelArtRenderer'
import { AvatarRenderer } from './AvatarRenderer'
import { MapData } from '../types/map'
import { Player, Direction } from '../types/game'
import { useGameStore } from '../store/useGameStore'
import { useMapStore } from '../store/useMapStore'
import { useChatStore } from '../store/useChatStore'
import { PeerManager } from '../p2p/PeerManager'

export class CanvasEngine {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private isRunning: boolean = false
  private animationFrameId: number | null = null

  // Camera & Viewport
  public camera = { x: 0, y: 0, zoom: 1.5 }
  private keysPressed: Set<string> = new Set()
  private targetTile: { x: number; y: number } | null = null
  private lastTime: number = performance.now()
  private moveSpeed = 4.2 // tiles per second

  // Editor hover preview
  public hoverTile: { x: number; y: number } | null = null

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    const context = canvas.getContext('2d', { alpha: false })
    if (!context) throw new Error('Could not get Canvas 2D context')
    this.ctx = context

    this.ctx.imageSmoothingEnabled = false

    this.setupInputs()
  }

  private setupInputs() {
    window.addEventListener('keydown', this.handleKeyDown)
    window.addEventListener('keyup', this.handleKeyUp)
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    // Ignore game movement keys if typing in chat/input
    if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
      return
    }

    const key = e.key.toLowerCase()
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
      this.keysPressed.add(key)
      this.targetTile = null // Cancel click-to-move if using keys
    }
  }

  private handleKeyUp = (e: KeyboardEvent) => {
    const key = e.key.toLowerCase()
    this.keysPressed.delete(key)
  }

  public setClickTarget(tileX: number, tileY: number) {
    this.targetTile = { x: tileX, y: tileY }
  }

  public start() {
    if (this.isRunning) return
    this.isRunning = true
    this.lastTime = performance.now()
    this.loop(this.lastTime)
  }

  public stop() {
    this.isRunning = false
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
    }
  }

  public dispose() {
    this.stop()
    window.removeEventListener('keydown', this.handleKeyDown)
    window.removeEventListener('keyup', this.handleKeyUp)
  }

  private loop = (currentTime: number) => {
    if (!this.isRunning) return

    const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.1) // cap at 100ms
    this.lastTime = currentTime

    this.update(deltaTime, currentTime)
    this.render(currentTime)

    this.animationFrameId = requestAnimationFrame(this.loop)
  }

  /**
   * Physics, Input, Collision, and Zone update
   */
  private update(deltaTime: number, currentTime: number) {
    const gameStore = useGameStore.getState()
    const mapStore = useMapStore.getState()
    const local = gameStore.localPlayer
    const map = mapStore.mapData

    let dx = 0
    let dy = 0
    let nextDirection: Direction = local.direction
    let isMoving = false

    // 1. Keyboard Movement
    if (this.keysPressed.has('w') || this.keysPressed.has('arrowup')) {
      dy -= 1
      nextDirection = 'up'
    }
    if (this.keysPressed.has('s') || this.keysPressed.has('arrowdown')) {
      dy += 1
      nextDirection = 'down'
    }
    if (this.keysPressed.has('a') || this.keysPressed.has('arrowleft')) {
      dx -= 1
      nextDirection = 'left'
    }
    if (this.keysPressed.has('d') || this.keysPressed.has('arrowright')) {
      dx += 1
      nextDirection = 'right'
    }

    // 2. Click to Move Path Guidance
    if (this.targetTile && dx === 0 && dy === 0) {
      const diffX = this.targetTile.x - local.x
      const diffY = this.targetTile.y - local.y
      const dist = Math.hypot(diffX, diffY)

      if (dist < 0.1) {
        this.targetTile = null
      } else {
        dx = diffX / dist
        dy = diffY / dist
        if (Math.abs(diffX) > Math.abs(diffY)) {
          nextDirection = diffX > 0 ? 'right' : 'left'
        } else {
          nextDirection = diffY > 0 ? 'down' : 'up'
        }
      }
    }

    // Normalize diagonal movement
    if (dx !== 0 && dy !== 0) {
      dx *= 0.7071
      dy *= 0.7071
    }

    if (dx !== 0 || dy !== 0) {
      isMoving = true
      const step = this.moveSpeed * deltaTime
      const nextX = local.x + dx * step
      const nextY = local.y + dy * step

      // Collision checks
      const canMoveX = !this.checkCollision(nextX, local.y, map)
      const canMoveY = !this.checkCollision(local.x, nextY, map)

      let finalX = local.x
      let finalY = local.y

      if (canMoveX) finalX = nextX
      if (canMoveY) finalY = nextY

      // Clamp within map bounds
      finalX = Math.max(1, Math.min(map.width - 2, finalX))
      finalY = Math.max(1, Math.min(map.height - 2, finalY))

      // Update state and broadcast
      gameStore.setLocalPosition(finalX, finalY, nextDirection, isMoving)
      PeerManager.getInstance().sendMovement(finalX, finalY, nextDirection, isMoving)
    } else if (local.isMoving) {
      gameStore.setLocalPosition(local.x, local.y, local.direction, false)
      PeerManager.getInstance().sendMovement(local.x, local.y, local.direction, false)
    }

    // 3. Smooth Camera Follow
    const targetCamX = local.x * TILE_SIZE + TILE_SIZE / 2
    const targetCamY = local.y * TILE_SIZE + TILE_SIZE / 2
    this.camera.x += (targetCamX - this.camera.x) * 0.12
    this.camera.y += (targetCamY - this.camera.y) * 0.12

    // 4. Zone Detection
    this.updateZoneDetection(local, map)
  }

  /**
   * Check tile and furniture collisions
   */
  private checkCollision(x: number, y: number, map: MapData): boolean {
    const radius = 0.35 // player collision radius in tiles
    const checkPoints = [
      { x: x + 0.5 - radius, y: y + 0.8 - radius },
      { x: x + 0.5 + radius, y: y + 0.8 - radius },
      { x: x + 0.5 - radius, y: y + 0.8 + radius },
      { x: x + 0.5 + radius, y: y + 0.8 + radius },
    ]

    for (const pt of checkPoints) {
      const tx = Math.floor(pt.x)
      const ty = Math.floor(pt.y)

      // Bounds
      if (tx < 0 || tx >= map.width || ty < 0 || ty >= map.height) return true

      // Wall collision
      if (map.walls[ty] && map.walls[ty][tx] !== null) return true

      // Furniture collision
      for (const item of map.furniture) {
        const def = FURNITURE_CATALOG.find((f) => f.id === item.defId)
        if (def && def.isObstacle) {
          if (tx >= item.x && tx < item.x + def.width && ty >= item.y && ty < item.y + def.height) {
            return true
          }
        }
      }
    }

    return false
  }

  /**
   * Check if player entered/exited a Private Zone
   */
  private updateZoneDetection(local: Player, map: MapData) {
    const playerCenterX = local.x + 0.5
    const playerCenterY = local.y + 0.5

    let detectedZone: string | null = null
    let detectedZoneName: string | null = null

    for (const zone of map.zones) {
      if (
        playerCenterX >= zone.x &&
        playerCenterX < zone.x + zone.width &&
        playerCenterY >= zone.y &&
        playerCenterY < zone.y + zone.height
      ) {
        detectedZone = zone.id
        detectedZoneName = zone.name
        break
      }
    }

    if (local.currentZoneId !== detectedZone) {
      console.log(`[Zone] Transitioned from ${local.currentZoneId} to ${detectedZone}`)
      useGameStore.getState().setCurrentZoneId(detectedZone)
      useChatStore.getState().updateZoneChannel(detectedZoneName)
      PeerManager.getInstance().sendPlayerUpdate({ currentZoneId: detectedZone })
    }
  }

  /**
   * Render Loop
   */
  private render(currentTime: number) {
    const ctx = this.ctx
    const canvas = this.canvas
    const map = useMapStore.getState().mapData
    const isEditorOpen = useMapStore.getState().isEditorOpen
    const localPlayer = useGameStore.getState().localPlayer
    const remotePlayers = useGameStore.getState().remotePlayers
    const reactions = useGameStore.getState().reactions

    // Clear background
    ctx.fillStyle = '#0c0e14'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.save()

    // Center camera on player
    const viewWidth = canvas.width / this.camera.zoom
    const viewHeight = canvas.height / this.camera.zoom

    ctx.scale(this.camera.zoom, this.camera.zoom)
    ctx.translate(
      Math.floor(viewWidth / 2 - this.camera.x),
      Math.floor(viewHeight / 2 - this.camera.y)
    )

    // 1. Draw Floors
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const floor = map.floors[y]?.[x] || 'wood_light'
        PixelArtRenderer.drawFloor(ctx, floor, x * TILE_SIZE, y * TILE_SIZE)
      }
    }

    // 2. Draw Private Zones (Beneath furniture & players)
    for (const zone of map.zones) {
      const isCurrent = localPlayer.currentZoneId === zone.id
      PixelArtRenderer.drawPrivateZone(ctx, zone, isCurrent)
    }

    // 3. Draw Placed Furniture
    for (const item of map.furniture) {
      PixelArtRenderer.drawFurniture(ctx, item)
    }

    // 4. Draw Walls
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const wall = map.walls[y]?.[x]
        if (wall) {
          PixelArtRenderer.drawWall(ctx, wall, x * TILE_SIZE, y * TILE_SIZE)
        }
      }
    }

    // 5. Sort and Draw Players by Y-depth
    const allPlayers: { player: Player; isLocal: boolean }[] = [
      { player: localPlayer, isLocal: true },
      ...Object.values(remotePlayers).map((p) => ({ player: p, isLocal: false })),
    ]

    allPlayers.sort((a, b) => a.player.y - b.player.y)

    for (const p of allPlayers) {
      AvatarRenderer.drawPlayer(ctx, p.player, p.isLocal, currentTime)
    }

    // 6. Draw Floating Reactions
    for (const r of reactions) {
      const age = currentTime - r.createdAt
      if (age < 3000) {
        const floatY = r.y * TILE_SIZE - (age / 1000) * 20
        ctx.font = '20px serif'
        ctx.fillText(r.emoji, r.x * TILE_SIZE + 6, floatY)
      }
    }

    // 7. Draw Editor Hover Tile Preview
    if (isEditorOpen && this.hoverTile) {
      ctx.strokeStyle = '#20c997'
      ctx.lineWidth = 2
      ctx.strokeRect(
        this.hoverTile.x * TILE_SIZE + 0.5,
        this.hoverTile.y * TILE_SIZE + 0.5,
        TILE_SIZE - 1,
        TILE_SIZE - 1
      )
    }

    ctx.restore()
  }

  public screenToTile(screenX: number, screenY: number): { x: number; y: number } {
    const viewWidth = this.canvas.width / this.camera.zoom
    const viewHeight = this.canvas.height / this.camera.zoom
    const offsetX = viewWidth / 2 - this.camera.x
    const offsetY = viewHeight / 2 - this.camera.y

    const worldX = screenX / this.camera.zoom - offsetX
    const worldY = screenY / this.camera.zoom - offsetY

    return {
      x: Math.floor(worldX / TILE_SIZE),
      y: Math.floor(worldY / TILE_SIZE),
    }
  }
}
