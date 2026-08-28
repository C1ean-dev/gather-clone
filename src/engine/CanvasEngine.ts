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
  public camera = { x: 0, y: 0, zoom: 1.6 }
  private keysPressed: Set<string> = new Set()
  private targetTile: { x: number; y: number } | null = null
  private lastTime: number = performance.now()
  private moveSpeed = 4.5 // tiles per second

  // Editor hover preview & Drag-to-Draw Zone
  public hoverTile: { x: number; y: number } | null = null
  public zoneDragStart: { x: number; y: number } | null = null
  public zoneDragCurrent: { x: number; y: number } | null = null

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
    this.canvas.addEventListener('wheel', this.handleWheel, { passive: false })
  }

  private handleWheel = (e: WheelEvent) => {
    e.preventDefault()
    const zoomDelta = e.deltaY < 0 ? 0.15 : -0.15
    this.camera.zoom = Math.max(0.4, Math.min(4.0, Number((this.camera.zoom + zoomDelta).toFixed(2))))
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
      return
    }

    const key = e.key.toLowerCase()
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
      this.keysPressed.add(key)
      this.targetTile = null
    }
  }

  private handleKeyUp = (e: KeyboardEvent) => {
    const key = e.key.toLowerCase()
    this.keysPressed.delete(key)
  }

  public setClickTarget(tileX: number, tileY: number) {
    this.targetTile = { x: tileX, y: tileY }
  }

  /**
   * Auto-fit camera zoom to occupy 95%+ of screen viewport
   */
  public fitToScreen(percentage: number = 0.95) {
    const map = useMapStore.getState().mapData
    const mapPixelWidth = map.width * TILE_SIZE
    const mapPixelHeight = map.height * TILE_SIZE

    if (mapPixelWidth === 0 || mapPixelHeight === 0 || this.canvas.width === 0 || this.canvas.height === 0) return

    const targetZoomX = (this.canvas.width * percentage) / mapPixelWidth
    const targetZoomY = (this.canvas.height * percentage) / mapPixelHeight
    const optimalZoom = Math.min(targetZoomX, targetZoomY)

    this.camera.zoom = Math.max(0.6, Math.min(3.2, optimalZoom))
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
    this.canvas.removeEventListener('wheel', this.handleWheel)
  }

  private loop = (currentTime: number) => {
    if (!this.isRunning) return

    const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.1)
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
      const length = Math.hypot(dx, dy)
      dx /= length
      dy /= length
    }

    // 3. Collision Detection & Step Validation
    if (dx !== 0 || dy !== 0) {
      isMoving = true
      const stepDist = this.moveSpeed * deltaTime
      const targetX = local.x + dx * stepDist
      const targetY = local.y + dy * stepDist

      let finalX = local.x
      let finalY = local.y

      if (!this.checkCollision(targetX, local.y, map)) {
        finalX = targetX
      }
      if (!this.checkCollision(local.x, targetY, map)) {
        finalY = targetY
      }

      gameStore.setLocalPlayer({
        x: finalX,
        y: finalY,
        direction: nextDirection,
        isMoving: true,
      })

      // Broadcast Movement
      PeerManager.getInstance().sendMovement(finalX, finalY, nextDirection, true)
    } else if (local.isMoving) {
      gameStore.setLocalPlayer({ isMoving: false })
      PeerManager.getInstance().sendMovement(local.x, local.y, local.direction, false)
    }

    // 4. Smooth Camera Following
    this.camera.x += (local.x * TILE_SIZE - this.camera.x) * 0.15
    this.camera.y += (local.y * TILE_SIZE - this.camera.y) * 0.15

    // 5. Zone Detection
    this.checkZonePresence(local.x, local.y, map)
  }

  /**
   * Precise Thin-Wall & Furniture Collision Checking
   * Only collides with the exact physical 6px partition beams and obstacle items,
   * completely eliminating invisible block boundaries.
   */
  private checkCollision(x: number, y: number, map: MapData): boolean {
    const playerRadius = 0.22
    const pcx = x + 0.5
    const pcy = y + 0.5

    const pMinX = pcx - playerRadius
    const pMaxX = pcx + playerRadius
    const pMinY = pcy - playerRadius
    const pMaxY = pcy + playerRadius

    // Map bounds checking
    if (pMinX < 0.5 || pMaxX >= map.width - 0.5 || pMinY < 0.5 || pMaxY >= map.height - 0.5) {
      return true
    }

    const minTileX = Math.floor(pMinX)
    const maxTileX = Math.floor(pMaxX)
    const minTileY = Math.floor(pMinY)
    const maxTileY = Math.floor(pMaxY)

    const halfThickness = 0.1 // 6px / 32px ~ 0.1875 -> half thickness 0.1 tile

    // 1. Precise Room Architecture Collision (Exact 1:1 Gather Photo)
    for (const zone of map.zones) {
      const minX = zone.x
      const maxX = zone.x + zone.width
      const minY = zone.y
      const maxY = zone.y + zone.height
      const h = zone.height
      const w = zone.width

      const backWallH = Math.min(h * 0.32, 2.0)
      const frontWallH = Math.min(h * 0.24, 1.5)
      const frontWallY = maxY - frontWallH

      const doorW = Math.min(w * 0.38, 2.0)
      const doorStartX = minX + (w - doorW) / 2
      const doorEndX = doorStartX + doorW

      // A. Back Wall Collision (Top block)
      if (pMaxX > minX && pMinX < maxX && pMaxY > minY && pMinY < minY + backWallH) {
        return true
      }

      // B. Left Thin Side Wall Collision
      if (pMaxX > minX && pMinX < minX + 0.15 && pMaxY > minY + backWallH && pMinY < frontWallY) {
        return true
      }

      // C. Right Thin Side Wall Collision
      if (pMaxX > maxX - 0.15 && pMinX < maxX && pMaxY > minY + backWallH && pMinY < frontWallY) {
        return true
      }

      // D. Left Front Wall Block Collision
      if (pMaxX > minX && pMinX < doorStartX && pMaxY > frontWallY && pMinY < maxY) {
        return true
      }

      // E. Right Front Wall Block Collision
      if (pMaxX > doorEndX && pMinX < maxX && pMaxY > frontWallY && pMinY < maxY) {
        return true
      }
    }

    // Outer Map Boundary Collision
    if (pMinX < 1 || pMaxX > map.width - 1 || pMinY < 1 || pMaxY > map.height - 1) {
      return true
    }

    // 2. Check Furniture Obstacle Collisions
    for (const furn of map.furniture) {
      const def = FURNITURE_CATALOG.find((f) => f.id === furn.defId)
      if (def && def.isObstacle) {
        const furnMinX = furn.x + 0.05
        const furnMaxX = furn.x + def.width - 0.05
        const furnMinY = furn.y + 0.05
        const furnMaxY = furn.y + def.height - 0.05

        if (pMaxX > furnMinX && pMinX < furnMaxX && pMaxY > furnMinY && pMinY < furnMaxY) {
          return true
        }
      }
    }

    return false
  }

  /**
   * Check if player has entered a Private Zone
   */
  private checkZonePresence(playerX: number, playerY: number, map: MapData) {
    const local = useGameStore.getState().localPlayer
    let detectedZone: string | null = null
    let detectedZoneName: string = ''

    for (const zone of map.zones) {
      if (
        playerX >= zone.x &&
        playerX <= zone.x + zone.width &&
        playerY >= zone.y &&
        playerY <= zone.y + zone.height
      ) {
        detectedZone = zone.id
        detectedZoneName = zone.name
        break
      }
    }

    if (local.currentZoneId !== detectedZone) {
      useGameStore.getState().setCurrentZoneId(detectedZone)
      useChatStore.getState().updateZoneChannel(detectedZoneName)
      PeerManager.getInstance().sendPlayerUpdate({ currentZoneId: detectedZone })
    }
  }

  /**
   * 2D Render Loop
   */
  private render(currentTime: number) {
    const ctx = this.ctx
    const canvas = this.canvas
    const mapStore = useMapStore.getState()
    const map = mapStore.mapData
    const isEditorOpen = mapStore.isEditorOpen
    const activeTool = mapStore.activeTool
    const zoneDraft = mapStore.zoneDraft
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
        const floor = map.floors[y]?.[x] || 'habbo_parquet'
        PixelArtRenderer.drawFloor(ctx, floor, x * TILE_SIZE, y * TILE_SIZE)
      }
    }

    // 2. Draw Gather Room Architecture (1:1 Exact Photo Replica)
    for (const zone of map.zones) {
      PixelArtRenderer.drawGatherRoom(ctx, zone, map.zones)
    }

    // 3. Draw Zone Header Badges & Dashed Overlays (Only in Editor Mode)
    if (isEditorOpen) {
      for (const zone of map.zones) {
        const isCurrent = localPlayer.currentZoneId === zone.id
        PixelArtRenderer.drawPrivateZone(ctx, zone, isCurrent)
      }
    }

    // 4. Draw Placed Furniture & Wall Windows
    for (const item of map.furniture) {
      PixelArtRenderer.drawFurniture(ctx, item)
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

    // 7. Draw Live Drag-to-Draw Zone Preview
    if (isEditorOpen && activeTool === 'draw_zone' && this.zoneDragStart && this.zoneDragCurrent) {
      const minX = Math.min(this.zoneDragStart.x, this.zoneDragCurrent.x)
      const maxX = Math.max(this.zoneDragStart.x, this.zoneDragCurrent.x)
      const minY = Math.min(this.zoneDragStart.y, this.zoneDragCurrent.y)
      const maxY = Math.max(this.zoneDragStart.y, this.zoneDragCurrent.y)

      const w = (maxX - minX + 1) * TILE_SIZE
      const h = (maxY - minY + 1) * TILE_SIZE
      const px = minX * TILE_SIZE
      const py = minY * TILE_SIZE

      const isOverlapping = map.zones.some((z) => {
        const zMaxX = z.x + z.width - 1
        const zMaxY = z.y + z.height - 1
        const overlapX = Math.min(maxX, zMaxX) - Math.max(minX, z.x)
        const overlapY = Math.min(maxY, zMaxY) - Math.max(minY, z.y)
        return overlapX >= 1 && overlapY >= 1
      })

      ctx.save()
      // Fill
      ctx.fillStyle = isOverlapping
        ? 'rgba(239, 68, 68, 0.35)'
        : zoneDraft.color
        ? `${zoneDraft.color}35`
        : 'rgba(76, 110, 245, 0.25)'
      ctx.fillRect(px, py, w, h)

      // Dashed border
      ctx.strokeStyle = isOverlapping ? '#ef4444' : zoneDraft.color || '#4c6ef5'
      ctx.lineWidth = 3
      ctx.setLineDash([8, 4])
      ctx.strokeRect(px + 1.5, py + 1.5, w - 3, h - 3)

      // Dimension badge
      ctx.setLineDash([])
      const badgeText = isOverlapping
        ? `🚫 SOBREPOSIÇÃO NÃO PERMITIDA (${maxX - minX + 1}x${maxY - minY + 1})`
        : `${zoneDraft.name} (${maxX - minX + 1}x${maxY - minY + 1} tiles)`
      ctx.font = 'bold 11px sans-serif'
      const textWidth = ctx.measureText(badgeText).width

      ctx.fillStyle = isOverlapping ? '#dc2626' : zoneDraft.color || '#4c6ef5'
      ctx.beginPath()
      ctx.roundRect(px + 4, py - 20, textWidth + 14, 18, 5)
      ctx.fill()

      ctx.fillStyle = '#ffffff'
      ctx.fillText(badgeText, px + 11, py - 6)
      ctx.restore()
    }
    // Draw Editor Hover Tile Preview with Asset Dimensions
    else if (isEditorOpen && this.hoverTile) {
      ctx.save()
      const tx = this.hoverTile.x
      const ty = this.hoverTile.y

      if (activeTool === 'place_furniture') {
        const furnDef = FURNITURE_CATALOG.find((f) => f.id === mapStore.selectedFurnitureDefId)
        const w = (furnDef?.width || 1) * TILE_SIZE
        const h = (furnDef?.height || 1) * TILE_SIZE

        // Semi-transparent ghost furniture preview
        ctx.fillStyle = furnDef?.iconColor ? `${furnDef.iconColor}44` : 'rgba(76, 110, 245, 0.3)'
        ctx.fillRect(tx * TILE_SIZE, ty * TILE_SIZE, w, h)
        ctx.strokeStyle = furnDef?.iconColor || '#4c6ef5'
        ctx.lineWidth = 2
        ctx.strokeRect(tx * TILE_SIZE + 0.5, ty * TILE_SIZE + 0.5, w - 1, h - 1)
      } else if (activeTool === 'paint_floor') {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'
        ctx.fillRect(tx * TILE_SIZE, ty * TILE_SIZE, TILE_SIZE, TILE_SIZE)
        ctx.strokeStyle = '#20c997'
        ctx.lineWidth = 2
        ctx.strokeRect(tx * TILE_SIZE + 0.5, ty * TILE_SIZE + 0.5, TILE_SIZE - 1, TILE_SIZE - 1)
      } else if (activeTool === 'paint_wall') {
        ctx.fillStyle = 'rgba(232, 212, 162, 0.4)'
        ctx.fillRect(tx * TILE_SIZE, ty * TILE_SIZE, TILE_SIZE, TILE_SIZE)
        ctx.strokeStyle = '#fab005'
        ctx.lineWidth = 2
        ctx.strokeRect(tx * TILE_SIZE + 0.5, ty * TILE_SIZE + 0.5, TILE_SIZE - 1, TILE_SIZE - 1)
      } else if (activeTool === 'eraser') {
        ctx.fillStyle = 'rgba(224, 49, 49, 0.3)'
        ctx.fillRect(tx * TILE_SIZE, ty * TILE_SIZE, TILE_SIZE, TILE_SIZE)
        ctx.strokeStyle = '#fa5252'
        ctx.lineWidth = 2
        ctx.strokeRect(tx * TILE_SIZE + 0.5, ty * TILE_SIZE + 0.5, TILE_SIZE - 1, TILE_SIZE - 1)
      } else {
        ctx.strokeStyle = '#20c997'
        ctx.lineWidth = 2
        ctx.strokeRect(tx * TILE_SIZE + 0.5, ty * TILE_SIZE + 0.5, TILE_SIZE - 1, TILE_SIZE - 1)
      }
      ctx.restore()
    }

    ctx.restore()
  }

  public screenToTile(screenX: number, screenY: number): { x: number; y: number } {
    const viewWidth = this.canvas.width / this.camera.zoom
    const viewHeight = this.canvas.height / this.camera.zoom
    const offsetX = Math.floor(viewWidth / 2 - this.camera.x)
    const offsetY = Math.floor(viewHeight / 2 - this.camera.y)

    const worldX = screenX / this.camera.zoom - offsetX
    const worldY = screenY / this.camera.zoom - offsetY

    return {
      x: Math.floor(worldX / TILE_SIZE),
      y: Math.floor(worldY / TILE_SIZE),
    }
  }
}
