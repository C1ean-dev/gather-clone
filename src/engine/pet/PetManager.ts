import { Direction, Player, PetConfig } from '../../types/game'

export interface PetState {
  playerId: string
  x: number
  y: number
  direction: Direction
  isMoving: boolean
  walkFrame: number
  walkTick: number
  history: { x: number; y: number }[]
  idleTime: number
}

export class PetManager {
  private static instance: PetManager
  private pets: Map<string, PetState> = new Map()

  private constructor() {}

  public static getInstance(): PetManager {
    if (!PetManager.instance) {
      PetManager.instance = new PetManager()
    }
    return PetManager.instance
  }

  public getPet(playerId: string): PetState | undefined {
    return this.pets.get(playerId)
  }

  public getAllPets(): PetState[] {
    return Array.from(this.pets.values())
  }

  /**
   * Update all pets following their respective players
   */
  public update(deltaTime: number, players: Player[]) {
    const activePlayerIds = new Set<string>()

    for (const player of players) {
      const petConfig: PetConfig | undefined = player.avatar?.pet
      if (!petConfig || petConfig.type === 'none') {
        this.pets.delete(player.id)
        continue
      }

      activePlayerIds.add(player.id)
      let pet = this.pets.get(player.id)

      if (!pet) {
        // Initial spawn beside player
        const offsetX = player.direction === 'right' ? -0.8 : player.direction === 'left' ? 0.8 : 0.6
        const offsetY = player.direction === 'down' ? -0.6 : player.direction === 'up' ? 0.6 : 0.2
        pet = {
          playerId: player.id,
          x: player.x + offsetX,
          y: player.y + offsetY,
          direction: player.direction,
          isMoving: false,
          walkFrame: 0,
          walkTick: 0,
          history: [],
          idleTime: 0,
        }
        this.pets.set(player.id, pet)
      }

      this.updatePetFollowing(pet, player, deltaTime)
    }

    // Remove pets for players that are no longer present
    for (const id of Array.from(this.pets.keys())) {
      if (!activePlayerIds.has(id)) {
        this.pets.delete(id)
      }
    }
  }

  /**
   * Core trail-following logic for a single pet
   */
  private updatePetFollowing(pet: PetState, player: Player, deltaTime: number) {
    const dx = player.x - pet.x
    const dy = player.y - pet.y
    const distToPlayer = Math.sqrt(dx * dx + dy * dy)

    // 1. If distance is extreme (> 6 tiles, e.g. player teleported / changed room), snap directly
    if (distToPlayer > 6.0) {
      const offsetX = player.direction === 'right' ? -0.8 : player.direction === 'left' ? 0.8 : 0.5
      const offsetY = player.direction === 'down' ? -0.6 : player.direction === 'up' ? 0.6 : 0.2
      pet.x = player.x + offsetX
      pet.y = player.y + offsetY
      pet.history = []
      pet.isMoving = false
      pet.direction = player.direction
      return
    }

    // 2. Track player breadcrumbs into history
    const lastPoint = pet.history[pet.history.length - 1]
    const distToLast = lastPoint ? Math.hypot(player.x - lastPoint.x, player.y - lastPoint.y) : 1
    if (!lastPoint || distToLast >= 0.2) {
      pet.history.push({ x: player.x, y: player.y })
      if (pet.history.length > 25) {
        pet.history.shift()
      }
    }

    // 3. Determine target position
    // If player is moving or pet is far, follow trail. If player stopped, stay beside player.
    const STOP_DIST = 0.85
    const START_DIST = 1.15

    let targetX = player.x
    let targetY = player.y

    if (player.isMoving || distToPlayer > START_DIST) {
      // Pick trail target ~1.0 tile back
      let trailIdx = -1
      let accDist = 0
      for (let i = pet.history.length - 1; i >= 0; i--) {
        const p = pet.history[i]
        const d = Math.hypot(player.x - p.x, player.y - p.y)
        if (d >= 0.75) {
          trailIdx = i
          break
        }
      }

      if (trailIdx >= 0 && trailIdx < pet.history.length) {
        targetX = pet.history[trailIdx].x
        targetY = pet.history[trailIdx].y
      } else {
        // Fallback trailing offset behind player direction
        const offset = this.getTrailingOffset(player.direction)
        targetX = player.x + offset.x
        targetY = player.y + offset.y
      }
    } else {
      // Idle resting offset beside player
      const offset = this.getTrailingOffset(player.direction)
      targetX = player.x + offset.x
      targetY = player.y + offset.y
    }

    const toTargetX = targetX - pet.x
    const toTargetY = targetY - pet.y
    const distToTarget = Math.hypot(toTargetX, toTargetY)

    if (distToTarget > 0.08 && (distToPlayer > STOP_DIST || player.isMoving)) {
      pet.isMoving = true
      pet.idleTime = 0

      // Speed scales up if falling behind to ensure it never gets left behind
      const baseSpeed = 7.5
      const catchupMultiplier = distToPlayer > 2.5 ? 1.5 : distToPlayer > 1.8 ? 1.25 : 1.0
      const moveDist = baseSpeed * catchupMultiplier * deltaTime
      const step = Math.min(distToTarget, moveDist)

      pet.x += (toTargetX / distToTarget) * step
      pet.y += (toTargetY / distToTarget) * step

      // Update orientation
      if (Math.abs(toTargetX) > Math.abs(toTargetY)) {
        pet.direction = toTargetX > 0 ? 'right' : 'left'
      } else {
        pet.direction = toTargetY > 0 ? 'down' : 'up'
      }

      pet.walkTick += deltaTime * 12
      pet.walkFrame = Math.floor(pet.walkTick) % 4
    } else {
      pet.isMoving = false
      pet.idleTime += deltaTime

      // When stopped, prune old history so it stays fresh
      if (pet.history.length > 3) {
        pet.history = pet.history.slice(-3)
      }

      // Face the player when idle and looking at them
      if (distToPlayer > 0.3) {
        if (Math.abs(dx) > Math.abs(dy)) {
          pet.direction = dx > 0 ? 'right' : 'left'
        } else {
          pet.direction = dy > 0 ? 'down' : 'up'
        }
      }
    }
  }

  private getTrailingOffset(dir: Direction): { x: number; y: number } {
    switch (dir) {
      case 'down':
        return { x: 0.5, y: -0.8 }
      case 'up':
        return { x: -0.5, y: 0.8 }
      case 'left':
        return { x: 0.8, y: 0.3 }
      case 'right':
        return { x: -0.8, y: 0.3 }
    }
  }
}
