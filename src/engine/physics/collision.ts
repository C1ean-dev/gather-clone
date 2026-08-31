import { MapData } from '../../types/map'
import { FURNITURE_CATALOG } from '../Constants'
import { useCustomAssetsStore } from '../../store/useCustomAssetsStore'
import { useGameStore } from '../../store/useGameStore'
import { useChatStore } from '../../store/useChatStore'
import { useMediaStore } from '../../store/useMediaStore'
import { MediaManager } from '../../media/MediaManager'
import { PeerManager } from '../../p2p/PeerManager'

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

    // Helper to find adjacent neighbor zones
    const leftNeighbor = (map.zones || []).find(
      (z) =>
        z.id !== zone.id &&
        z.hasWalls !== false &&
        Math.abs(z.x + z.width - minX) <= 0.15 &&
        Math.max(z.y, zone.y) < Math.min(z.y + z.height, zone.y + zone.height)
    )

    const rightNeighbor = (map.zones || []).find(
      (z) =>
        z.id !== zone.id &&
        z.hasWalls !== false &&
        Math.abs(maxX - z.x) <= 0.15 &&
        Math.max(z.y, zone.y) < Math.min(z.y + z.height, zone.y + zone.height)
    )

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
 * Check if player has entered a Private Zone
 */
export function checkZonePresence(playerX: number, playerY: number, map: MapData) {
  const local = useGameStore.getState().localPlayer
  let detectedZone: string | null = null
  let detectedZoneName: string = ''

  for (const zone of map.zones || []) {
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
  }
}
