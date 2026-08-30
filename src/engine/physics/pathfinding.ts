import { MapData } from '../../types/map'
import { checkCollision } from './collision'

export interface Point {
  x: number
  y: number
}

/**
 * Checks if a straight ray between point (x1, y1) and (x2, y2) is clear of collisions.
 * Uses fractional step sampling (0.2 tiles) to check character footprint clearance.
 */
export function hasLineOfSight(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  map: MapData
): boolean {
  const dist = Math.hypot(x2 - x1, y2 - y1)
  if (dist === 0) return !checkCollision(x1, y1, map)

  // Step every ~0.2 tiles (approx 6.4 pixels)
  const stepCount = Math.max(1, Math.ceil(dist / 0.2))
  for (let i = 0; i <= stepCount; i++) {
    const t = i / stepCount
    const sampleX = x1 + (x2 - x1) * t
    const sampleY = y1 + (y2 - y1) * t
    if (checkCollision(sampleX, sampleY, map)) {
      return false
    }
  }
  return true
}

/**
 * Finds the nearest walkable tile to a target point if target is inside an obstacle.
 */
function findNearestWalkableTile(
  targetX: number,
  targetY: number,
  originX: number,
  originY: number,
  map: MapData
): Point | null {
  if (!checkCollision(targetX, targetY, map)) {
    return { x: targetX, y: targetY }
  }

  let bestPoint: Point | null = null
  let bestDist = Infinity

  const maxRadius = 4
  for (let r = 1; r <= maxRadius; r++) {
    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) {
        if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue
        const nx = targetX + dx
        const ny = targetY + dy

        if (nx >= 0 && nx < map.width && ny >= 0 && ny < map.height) {
          if (!checkCollision(nx, ny, map)) {
            // Distance from origin to neighbor + small penalty for distance from target
            const distFromOrigin = Math.hypot(nx - originX, ny - originY)
            const distFromTarget = Math.hypot(dx, dy)
            const score = distFromOrigin + distFromTarget * 0.5
            if (score < bestDist) {
              bestDist = score
              bestPoint = { x: nx, y: ny }
            }
          }
        }
      }
    }
    if (bestPoint) break
  }

  return bestPoint
}

// Min-Heap implementation for fast A* Priority Queue
class MinHeap<T> {
  private data: { item: T; priority: number }[] = []

  push(item: T, priority: number) {
    this.data.push({ item, priority })
    this.bubbleUp(this.data.length - 1)
  }

  pop(): T | undefined {
    if (this.data.length === 0) return undefined
    const top = this.data[0].item
    const bottom = this.data.pop()!
    if (this.data.length > 0) {
      this.data[0] = bottom
      this.bubbleDown(0)
    }
    return top
  }

  get size(): number {
    return this.data.length
  }

  private bubbleUp(idx: number) {
    while (idx > 0) {
      const parentIdx = (idx - 1) >> 1
      if (this.data[idx].priority < this.data[parentIdx].priority) {
        const temp = this.data[idx]
        this.data[idx] = this.data[parentIdx]
        this.data[parentIdx] = temp
        idx = parentIdx
      } else {
        break
      }
    }
  }

  private bubbleDown(idx: number) {
    const len = this.data.length
    while (true) {
      const leftIdx = (idx << 1) + 1
      const rightIdx = leftIdx + 1
      let smallest = idx

      if (leftIdx < len && this.data[leftIdx].priority < this.data[smallest].priority) {
        smallest = leftIdx
      }
      if (rightIdx < len && this.data[rightIdx].priority < this.data[smallest].priority) {
        smallest = rightIdx
      }

      if (smallest !== idx) {
        const temp = this.data[idx]
        this.data[idx] = this.data[smallest]
        this.data[smallest] = temp
        idx = smallest
      } else {
        break
      }
    }
  }
}

/**
 * A* Pathfinding Algorithm with 8-directional movement, obstacle avoidance,
 * and Line-of-Sight Path Smoothing (String Pulling).
 */
export function findPath(
  startX: number,
  startY: number,
  targetX: number,
  targetY: number,
  map: MapData
): Point[] {
  // 1. Direct Line-of-Sight Check (Fast Path)
  // If no obstacle exists between start and target, return straight line target immediately!
  if (hasLineOfSight(startX, startY, targetX, targetY, map)) {
    return [{ x: targetX, y: targetY }]
  }

  // 2. Adjust target if target is inside an obstacle
  const walkableTarget = findNearestWalkableTile(
    Math.round(targetX),
    Math.round(targetY),
    startX,
    startY,
    map
  )
  if (!walkableTarget) {
    return []
  }

  const startGridX = Math.round(startX)
  const startGridY = Math.round(startY)
  const goalGridX = walkableTarget.x
  const goalGridY = walkableTarget.y

  if (startGridX === goalGridX && startGridY === goalGridY) {
    return [{ x: walkableTarget.x, y: walkableTarget.y }]
  }

  // A* Data structures
  const key = (x: number, y: number) => `${x},${y}`
  const openSet = new MinHeap<{ x: number; y: number }>()
  const cameFrom = new Map<string, Point>()
  const gScore = new Map<string, number>()
  const closedSet = new Set<string>()

  // Heuristic: Octile Distance
  const heuristic = (x: number, y: number) => {
    const dx = Math.abs(x - goalGridX)
    const dy = Math.abs(y - goalGridY)
    return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy)
  }

  const startKey = key(startGridX, startGridY)
  gScore.set(startKey, 0)
  openSet.push({ x: startGridX, y: startGridY }, heuristic(startGridX, startGridY))

  // 8 Neighbor offsets: 4 Cardinal + 4 Diagonal
  const neighbors = [
    { dx: 0, dy: -1, cost: 1.0 },
    { dx: 0, dy: 1, cost: 1.0 },
    { dx: -1, dy: 0, cost: 1.0 },
    { dx: 1, dy: 0, cost: 1.0 },
    { dx: -1, dy: -1, cost: Math.SQRT2 },
    { dx: 1, dy: -1, cost: Math.SQRT2 },
    { dx: -1, dy: 1, cost: Math.SQRT2 },
    { dx: 1, dy: 1, cost: Math.SQRT2 },
  ]

  let iterations = 0
  const maxIterations = 3000
  let reachedGoal = false

  while (openSet.size > 0 && iterations < maxIterations) {
    iterations++
    const current = openSet.pop()!
    const currentKey = key(current.x, current.y)

    if (current.x === goalGridX && current.y === goalGridY) {
      reachedGoal = true
      break
    }

    if (closedSet.has(currentKey)) continue
    closedSet.add(currentKey)

    const currentG = gScore.get(currentKey) ?? Infinity

    for (const offset of neighbors) {
      const nx = current.x + offset.dx
      const ny = current.y + offset.dy
      const nKey = key(nx, ny)

      if (closedSet.has(nKey)) continue
      if (nx < 0 || nx >= map.width || ny < 0 || ny >= map.height) continue

      // For diagonal movement, prevent cutting through wall corners:
      // Both adjacent orthogonal neighbors must be walkable
      if (offset.dx !== 0 && offset.dy !== 0) {
        if (checkCollision(current.x + offset.dx, current.y, map)) continue
        if (checkCollision(current.x, current.y + offset.dy, map)) continue
      }

      // Check collision on the tile
      if (checkCollision(nx, ny, map)) continue

      const tentativeG = currentG + offset.cost
      const existingG = gScore.get(nKey) ?? Infinity

      if (tentativeG < existingG) {
        cameFrom.set(nKey, current)
        gScore.set(nKey, tentativeG)
        const fScore = tentativeG + heuristic(nx, ny)
        openSet.push({ x: nx, y: ny }, fScore)
      }
    }
  }

  if (!reachedGoal) {
    return []
  }

  // 3. Reconstruct raw path from goal to start
  const rawPath: Point[] = []
  let curr: Point | undefined = { x: goalGridX, y: goalGridY }
  while (curr) {
    rawPath.push(curr)
    curr = cameFrom.get(key(curr.x, curr.y))
  }
  rawPath.reverse()

  // Replace end point with exact desired destination
  rawPath[rawPath.length - 1] = { x: walkableTarget.x, y: walkableTarget.y }

  // 4. Line-of-Sight Path Smoothing (Funnel / Raycast Simplification)
  // Eliminates zig-zag steps and produces smooth, natural trajectories around corners
  const smoothedPath: Point[] = []
  let currentIdx = 0

  while (currentIdx < rawPath.length) {
    let furthestIdx = currentIdx + 1

    // Look as far ahead as possible with clear line of sight
    for (let checkIdx = rawPath.length - 1; checkIdx > currentIdx; checkIdx--) {
      const fromPoint = currentIdx === 0 ? { x: startX, y: startY } : rawPath[currentIdx]
      const toPoint = rawPath[checkIdx]

      if (hasLineOfSight(fromPoint.x, fromPoint.y, toPoint.x, toPoint.y, map)) {
        furthestIdx = checkIdx
        break
      }
    }

    if (furthestIdx < rawPath.length) {
      smoothedPath.push(rawPath[furthestIdx])
      currentIdx = furthestIdx
    } else {
      if (currentIdx < rawPath.length - 1) {
        smoothedPath.push(rawPath[rawPath.length - 1])
      }
      break
    }
  }

  return smoothedPath.length > 0 ? smoothedPath : [{ x: walkableTarget.x, y: walkableTarget.y }]
}
