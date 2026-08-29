import { Direction } from '../../types/game'

export class InputHandler {
  public keysPressed: Set<string> = new Set()
  public targetTile: { x: number; y: number } | null = null

  public setup() {
    window.addEventListener('keydown', this.handleKeyDown)
    window.addEventListener('keyup', this.handleKeyUp)
  }

  public dispose() {
    window.removeEventListener('keydown', this.handleKeyDown)
    window.removeEventListener('keyup', this.handleKeyUp)
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

  public computeMovement(localX: number, localY: number, currentDirection: Direction): {
    dx: number
    dy: number
    nextDirection: Direction
  } {
    let dx = 0
    let dy = 0
    let nextDirection: Direction = currentDirection

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
      const diffX = this.targetTile.x - localX
      const diffY = this.targetTile.y - localY
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

    return { dx, dy, nextDirection }
  }
}
