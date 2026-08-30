import { CameraManager } from './camera/CameraManager'
import { InputHandler } from './input/InputHandler'
import { checkCollision, checkZonePresence } from './physics/collision'
import { findPath } from './physics/pathfinding'
import { WorldRenderer } from './rendering/worldRenderer'
import { useGameStore } from '../store/useGameStore'
import { useMapStore } from '../store/useMapStore'
import { useSettingsStore } from '../store/useSettingsStore'
import { PeerManager } from '../p2p/PeerManager'

export class CanvasEngine {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private isRunning: boolean = false
  private animationFrameId: number | null = null

  // Subsystems
  public camera: CameraManager
  public input: InputHandler

  private lastTime: number = performance.now()
  private lastRenderTime: number = performance.now()
  private frameCount: number = 0
  private lastFpsUpdate: number = performance.now()
  private fps: number = 60
  private stuckCounter: number = 0

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

    this.camera = new CameraManager()
    this.input = new InputHandler()

    this.setupInputs()
  }

  private setupInputs() {
    this.input.setup()
    this.canvas.addEventListener('wheel', this.camera.handleWheel, { passive: false })
  }

  /**
   * Calculates intelligent collision-avoidance path from current player position to target tile
   */
  public setClickTarget(tileX: number, tileY: number) {
    const local = useGameStore.getState().localPlayer
    const map = useMapStore.getState().mapData
    const path = findPath(local.x, local.y, tileX, tileY, map)
    if (path.length > 0) {
      this.input.setPath(path)
      this.stuckCounter = 0
    }
  }

  /**
   * Auto-fit camera zoom to occupy 95%+ of screen viewport
   */
  public fitToScreen(percentage: number = 0.95) {
    this.camera.fitToScreen(this.canvas, percentage)
  }

  public start() {
    if (this.isRunning) return
    this.isRunning = true
    this.lastTime = performance.now()
    this.lastRenderTime = performance.now()
    this.lastFpsUpdate = performance.now()
    this.frameCount = 0
    this.loop(performance.now())
  }

  public stop() {
    this.isRunning = false
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
    }
  }

  public dispose() {
    this.stop()
    this.input.dispose()
    this.canvas.removeEventListener('wheel', this.camera.handleWheel)
  }

  private loop = (currentTime: number) => {
    if (!this.isRunning) return

    const settings = useSettingsStore.getState()
    const targetFps = settings.targetFps

    // FPS Limiter (if targetFps > 0)
    if (targetFps > 0) {
      const minInterval = 1000 / targetFps
      const elapsed = currentTime - this.lastRenderTime
      if (elapsed < minInterval - 1.0) {
        this.animationFrameId = requestAnimationFrame(this.loop)
        return
      }
    }

    const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.1)
    this.lastTime = currentTime
    this.lastRenderTime = currentTime

    // Compute live FPS
    this.frameCount++
    if (currentTime - this.lastFpsUpdate >= 500) {
      const liveFps = Math.round((this.frameCount * 1000) / (currentTime - this.lastFpsUpdate))
      this.fps = liveFps
      this.frameCount = 0
      this.lastFpsUpdate = currentTime
      settings.setCurrentFps(liveFps)
    }

    this.update(deltaTime)
    this.render(currentTime)

    this.animationFrameId = requestAnimationFrame(this.loop)
  }

  private lastMovementBroadcast: number = 0

  /**
   * Physics, Input, Collision, and Zone update
   */
  private update(deltaTime: number) {
    const gameStore = useGameStore.getState()
    const mapStore = useMapStore.getState()
    const local = gameStore.localPlayer
    const map = mapStore.mapData
    const moveSpeed = useSettingsStore.getState().moveSpeed || 4.5

    const { dx, dy, nextDirection } = this.input.computeMovement(local.x, local.y, local.direction)

    // Collision Detection & Step Validation
    if (dx !== 0 || dy !== 0) {
      const stepDist = moveSpeed * deltaTime
      const targetX = local.x + dx * stepDist
      const targetY = local.y + dy * stepDist

      let finalX = local.x
      let finalY = local.y

      if (!checkCollision(targetX, local.y, map)) {
        finalX = targetX
      }
      if (!checkCollision(local.x, targetY, map)) {
        finalY = targetY
      }

      // Check if character got stuck against an obstacle while following a path
      if (this.input.path.length > 0) {
        if (finalX === local.x && finalY === local.y) {
          this.stuckCounter++
          if (this.stuckCounter > 15) {
            // Re-calculate path around obstacle or abort
            const dest = this.input.finalDestination
            if (dest) {
              const newPath = findPath(local.x, local.y, dest.x, dest.y, map)
              if (newPath.length > 0) {
                this.input.setPath(newPath)
              } else {
                this.input.clearPath()
              }
            } else {
              this.input.clearPath()
            }
            this.stuckCounter = 0
          }
        } else {
          this.stuckCounter = 0
        }
      }

      gameStore.setLocalPosition(finalX, finalY, nextDirection, true)

      // Throttled Broadcast Movement (25Hz) to prevent WebRTC DataChannel congestion
      const now = performance.now()
      if (!local.isMoving || now - this.lastMovementBroadcast >= 40) {
        this.lastMovementBroadcast = now
        PeerManager.getInstance().sendMovement(finalX, finalY, nextDirection, true)
      }

      // Smooth Camera Following synchronized with new position
      this.camera.followPlayer(finalX, finalY, deltaTime)

      // Zone Detection
      checkZonePresence(finalX, finalY, map)
    } else {
      if (local.isMoving) {
        gameStore.setLocalPosition(local.x, local.y, local.direction, false)
        PeerManager.getInstance().sendMovement(local.x, local.y, local.direction, false)
        this.lastMovementBroadcast = performance.now()
      }

      // Keep camera smoothly aligned even when standing still
      this.camera.followPlayer(local.x, local.y, deltaTime)
      checkZonePresence(local.x, local.y, map)
    }
  }

  /**
   * 2D Render Loop
   */
  private render(currentTime: number) {
    WorldRenderer.render(
      this.ctx,
      this.canvas,
      this.camera,
      this.hoverTile,
      this.zoneDragStart,
      this.zoneDragCurrent,
      currentTime,
      this.fps,
      this.input.finalDestination
    )
  }

  public screenToTile(screenX: number, screenY: number): { x: number; y: number } {
    return this.camera.screenToTile(this.canvas, screenX, screenY)
  }
}
