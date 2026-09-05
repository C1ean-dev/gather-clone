import { MapData, PrivateZone } from '../../types/map'
import { FURNITURE_CATALOG } from '../Constants'
import { useCustomAssetsStore } from '../../store/useCustomAssetsStore'
import { useGameStore } from '../../store/useGameStore'
import { useMapStore } from '../../store/useMapStore'
import { useChatStore } from '../../store/useChatStore'
import { useMediaStore } from '../../store/useMediaStore'
import { MediaManager } from '../../media/MediaManager'
import { PeerManager } from '../../p2p/PeerManager'

/**
 * Cached adjacent-zone relations. checkCollision runs up to ~6× per frame
 * (sub-stepping + midpoint + wall-slide axes) and used to .find() both
 * neighbors per zone per call — O(Z²) per call. Relations only change when
 * the zones array identity changes, so memoize them here.
 */
let neighborCacheMap: MapData | null = null
let neighborCacheZones: PrivateZone[] | null = null
const leftNeighborCache = new Map<string, PrivateZone | undefined>()
const rightNeighborCache = new Map<string, PrivateZone | undefined>()

function getCachedNeighbors(
  map: MapData,
  zone: PrivateZone
): { left: PrivateZone | undefined; right: PrivateZone | undefined } {
  const zones = map.zones || []
  if (neighborCacheMap !== map || neighborCacheZones !== zones) {
    neighborCacheMap = map
    neighborCacheZones = zones
    leftNeighborCache.clear()
    rightNeighborCache.clear()
    for (const z of zones) {
      if (z.hasWalls === false) continue
      const zMinX = z.x
      const zMaxX = z.x + z.width
      let left: PrivateZone | undefined
      let right: PrivateZone | undefined
      for (const o of zones) {
        if (o.id === z.id || o.hasWalls === false) continue
        if (!left && Math.abs(o.x + o.width - zMinX) <= 0.15 &&
            Math.max(o.y, z.y) < Math.min(o.y + o.height, z.y + z.height)) {
          left = o
        }
        if (!right && Math.abs(zMaxX - o.x) <= 0.15 &&
            Math.max(o.y, z.y) < Math.min(o.y + o.height, z.y + z.height)) {
          right = o
        }
        if (left && right) break
      }
      leftNeighborCache.set(z.id, left)
      rightNeighborCache.set(z.id, right)
    }
  }
  return { left: leftNeighborCache.get(zone.id), right: rightNeighborCache.get(zone.id) }
}

/**
 * Precise Thin-Wall & Furniture Collision Checking
 * Only collides with the exact physical 6px partition beams and obstacle items,
 * completely eliminating invisible block boundaries.
 *
 * Zone side-wall collision band: visually 0.15 tiles thick, but the player's
 * footprint extends 0.22 tiles around its center. The band therefore remains
 * active until the complete footprint is outside the wall. This pairs with
 * the engine's MAX_SUBSTEP=0.05 sub-stepping to prevent tunneling.
 */
export function checkCollision(x: number, y: number, map: MapData): boolean {
  const playerRadius = 0.22
  // Inner side-wall thickness — at least the visual 0.15, but grown so a sample
  // taken at any sub-step boundary is still inside the wall whenever the player
  // is touching it.
  const sideWallThickness = Math.max(0.15, playerRadius + 0.05)

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

  // 1. Precise Room Architecture Collision (Exact 1:1 Gather Photo)
  for (const zone of map.zones) {
    if (zone.hasWalls === false) continue

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

    // Helper to find adjacent neighbor zones (memoized per map — see above).
    const { left: leftNeighbor, right: rightNeighbor } = getCachedNeighbors(map, zone)

    // A. Back Wall Collision (Top block)
    if (pMaxX > minX && pMinX < maxX && pMaxY > minY && pMinY < minY + backWallH) {
      return true
    }

    // B. Left Thin Side Wall Collision (Respects Doorway Opening to Left Room)
    if (leftNeighbor) {
      const overlapMinY = Math.max(minY, leftNeighbor.y)
      const overlapMaxY = Math.min(maxY, leftNeighbor.y + leftNeighbor.height)
      const overlapH = overlapMaxY - overlapMinY
      const doorH = Math.min(overlapH * 0.65, 2.25)
      const doorStartY = overlapMinY + (overlapH - doorH) / 2
      const doorEndY = doorStartY + doorH

      if (doorStartY > minY + backWallH) {
        if (
          pMaxX > minX &&
          pMinX < minX + sideWallThickness &&
          pMaxY > minY + backWallH &&
          pMinY < doorStartY
        ) {
          return true
        }
      }
      if (frontWallY > doorEndY) {
        if (
          pMaxX > minX &&
          pMinX < minX + sideWallThickness &&
          pMaxY > doorEndY &&
          pMinY < frontWallY
        ) {
          return true
        }
      }
      if (zone.isLocked) {
        const local = useGameStore.getState()?.localPlayer
        const isAuth = local && (local.currentZoneId === zone.id || useMapStore.getState()?.isPeerAuthorizedForZone(zone.id, local.id, local.name))
        if (!isAuth && pMaxX > minX && pMinX < minX + sideWallThickness && pMaxY > doorStartY && pMinY < doorEndY) {
          return true
        }
      }
    } else {
      if (
        pMaxX > minX &&
        pMinX < minX + sideWallThickness &&
        pMaxY > minY + backWallH &&
        pMinY < frontWallY
      ) {
        return true
      }
    }

    // C. Right Thin Side Wall Collision. The collision band is extended outside
    // the zone by playerRadius so the wall remains active while the player's
    // left edge is still inside the zone (pMinX < maxX). The inner edge uses
    // sideWallThickness so the player cannot overlap the wall from inside.
    // Combined with sub-stepping, this closes the tunnel gap at the boundary.
    if (rightNeighbor) {
      const overlapMinY = Math.max(minY, rightNeighbor.y)
      const overlapMaxY = Math.min(maxY, rightNeighbor.y + rightNeighbor.height)
      const overlapH = overlapMaxY - overlapMinY
      const doorH = Math.min(overlapH * 0.65, 2.25)
      const doorStartY = overlapMinY + (overlapH - doorH) / 2
      const doorEndY = doorStartY + doorH

      if (doorStartY > minY + backWallH) {
        if (
          pMaxX > maxX - sideWallThickness &&
          pMinX < maxX &&
          pMaxY > minY + backWallH &&
          pMinY < doorStartY
        ) {
          return true
        }
      }
      if (frontWallY > doorEndY) {
        if (
          pMaxX > maxX - sideWallThickness &&
          pMinX < maxX &&
          pMaxY > doorEndY &&
          pMinY < frontWallY
        ) {
          return true
        }
      }
      if (zone.isLocked) {
        const local = useGameStore.getState()?.localPlayer
        const isAuth = local && (local.currentZoneId === zone.id || useMapStore.getState()?.isPeerAuthorizedForZone(zone.id, local.id, local.name))
        if (!isAuth && pMaxX > maxX - sideWallThickness && pMinX < maxX && pMaxY > doorStartY && pMinY < doorEndY) {
          return true
        }
      }
    } else {
      if (
        pMaxX > maxX - sideWallThickness &&
        pMinX < maxX &&
        pMaxY > minY + backWallH &&
        pMinY < frontWallY
      ) {
        return true
      }
    }

    // D. Left Front Wall Block Collision
    if (pMaxX > minX && pMinX < doorStartX && pMaxY > frontWallY && pMinY < maxY) {
      return true
    }

    // E. Right Front Wall Block Collision
    if (pMaxX > doorEndX && pMinX < maxX && pMaxY > frontWallY && pMinY < maxY) {
      return true
    }

    // F. Locked Room Front Doorway Block Collision
    if (zone.isLocked) {
      const local = useGameStore.getState()?.localPlayer
      const isAuth = local && (local.currentZoneId === zone.id || useMapStore.getState()?.isPeerAuthorizedForZone(zone.id, local.id, local.name))
      if (!isAuth && pMaxX > doorStartX && pMinX < doorEndX && pMaxY > frontWallY && pMinY < maxY) {
        return true
      }
    }
  }

  // Outer Map Boundary Collision
  if (pMinX < 1 || pMaxX > map.width - 1 || pMinY < 1 || pMaxY > map.height - 1) {
    return true
  }

  // 2. Check Furniture Obstacle Collisions (Supports Per-Tile Collision Grid)
  for (const furn of map.furniture || []) {
    const customAsset = useCustomAssetsStore.getState().getAssetById(furn.defId)
    const def = customAsset || FURNITURE_CATALOG.find((f) => f.id === furn.defId)

    if (customAsset && customAsset.collisionGrid && customAsset.collisionGrid.length > 0) {
      for (let r = 0; r < customAsset.height; r++) {
        for (let c = 0; c < customAsset.width; c++) {
          if (customAsset.collisionGrid[r]?.[c]) {
            const tileMinX = furn.x + c + 0.05
            const tileMaxX = furn.x + c + 1 - 0.05
            const tileMinY = furn.y + r + 0.05
            const tileMaxY = furn.y + r + 1 - 0.05

            if (pMaxX > tileMinX && pMinX < tileMaxX && pMaxY > tileMinY && pMinY < tileMaxY) {
              return true
            }
          }
        }
      }
    } else if (def && def.isObstacle) {
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
 * Test whether a player at (playerX, playerY) is physically inside a private zone.
 *
 * `playerX` and `playerY` represent the top-left coordinate of the 1x1 grid tile
 * where the avatar is placed. The avatar's physical center is (playerX + 0.5, playerY + 0.5),
 * and its feet (ground contact point) are at (playerX + 0.5, playerY + 0.75).
 *
 * Using top-left (playerX, playerY) previously caused an avatar standing OUTSIDE the room
 * (e.g. leaning against the south or east wall) to have its top-left coordinate fall
 * inside the zone bounds, erroneously connecting them to the room call.
 */
export function isPlayerInZone(playerX: number, playerY: number, zone: PrivateZone): boolean {
  if (zone.isLocked) {
    const local = useGameStore.getState()?.localPlayer
    if (local) {
      const isAuthorized =
        local.currentZoneId === zone.id ||
        useMapStore.getState()?.isPeerAuthorizedForZone(zone.id, local.id, local.name)
      if (!isAuthorized) {
        return false
      }
    }
  }

  const pcx = playerX + 0.5
  const pcy = playerY + 0.5
  const feetY = playerY + 0.75

  const minX = zone.x
  const maxX = zone.x + zone.width
  const minY = zone.y
  const maxY = zone.y + zone.height

  // 1. Overall zone horizontal bounds check
  if (pcx < minX || pcx > maxX) {
    return false
  }

  // 2. Overall zone vertical bounds check (center and feet)
  if (pcy < minY || pcy > maxY || feetY > maxY + 0.05) {
    return false
  }

  // 3. For rooms with physical walls (Gather Room Architecture):
  if (zone.hasWalls !== false) {
    const h = zone.height
    const w = zone.width
    const frontWallH = Math.min(h * 0.24, 1.5)
    const frontWallY = maxY - frontWallH
    const doorW = Math.min(w * 0.38, 2.0)
    const doorStartX = minX + (w - doorW) / 2
    const doorEndX = doorStartX + doorW

    // A. Front Wall Band:
    // If the player's center is in the front-wall Y band (frontWallY to maxY),
    // they can ONLY be inside the zone if they are within the doorway opening!
    // Leaning on the solid front wall blocks (left or right of the door) is OUTSIDE the room.
    if (pcy >= frontWallY) {
      const inDoorway = pcx >= doorStartX && pcx <= doorEndX
      if (!inDoorway) {
        return false
      }
      // In the doorway, their feet must have crossed the south threshold into the room
      if (feetY >= maxY) {
        return false
      }
    }

    // B. Back Wall Band:
    // The back wall is from minY to minY + backWallH (solid wall block).
    // An avatar above the back wall is outside behind the room.
    const backWallH = Math.min(h * 0.32, 2.0)
    if (pcy < minY + backWallH * 0.4) {
      return false
    }
  }

  return true
}

/**
 * Check if player has entered a Private Zone
 */
export function checkZonePresence(playerX: number, playerY: number, map: MapData) {
  const local = useGameStore.getState().localPlayer
  let detectedZone: string | null = null
  let detectedZoneName: string = ''

  for (const zone of map.zones || []) {
    if (isPlayerInZone(playerX, playerY, zone)) {
      detectedZone = zone.id
      detectedZoneName = zone.name
      break
    }
  }

  if (local.currentZoneId !== detectedZone) {
    const prevZoneId = local.currentZoneId

    // When leaving a private zone, immediately close screen sharing and terminate zone calls
    if (prevZoneId && prevZoneId !== detectedZone) {
      console.log(`[Zone Exit] Player exited zone ${prevZoneId}. Closing screen share and resetting media.`)
      if (useMediaStore.getState().isScreenSharing) {
        MediaManager.getInstance().stopScreenShare()
      }
      useMediaStore.getState().setGridCallOpen(false)
      PeerManager.getInstance().endAllZoneMediaCalls()
    }

    useGameStore.getState().setCurrentZoneId(detectedZone)
    useChatStore.getState().updateZoneChannel(detectedZoneName)
    PeerManager.getInstance().sendPlayerUpdate({ currentZoneId: detectedZone })
    useMapStore.getState().checkAndUnlockEmptyZones()
  }
}
