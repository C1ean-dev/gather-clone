import { FloorType, WallType, PlacedFurniture, PrivateZone } from '../types/map'
import { FURNITURE_CATALOG, TILE_SIZE } from './Constants'
import { useCustomAssetsStore, getCustomAssetImage } from '../store/useCustomAssetsStore'



export interface ZoneWallTheme {
  wallBody: string
  trimColor: string
  bevelColor: string
  shadowLine: string
  baseboard: string
  isBrick?: boolean
  isWood?: boolean
  isGlass?: boolean
  isStone?: boolean
}

export function getZoneWallTheme(wallType: WallType | string = 'drywall_white'): ZoneWallTheme {
  switch (wallType) {
    case 'habbo_hotel_gold':
      return {
        wallBody: '#eab308',
        trimColor: '#fef08a',
        bevelColor: '#ca8a04',
        shadowLine: '#854d0e',
        baseboard: '#713f12',
      }
    case 'habbo_brick_classic':
    case 'brick_red':
      return {
        wallBody: '#991b1b',
        trimColor: '#f87171',
        bevelColor: '#7f1d1d',
        shadowLine: '#450a0a',
        baseboard: '#57534e',
        isBrick: true,
      }
    case 'habbo_nightclub_dark':
      return {
        wallBody: '#1e1b4b',
        trimColor: '#818cf8',
        bevelColor: '#312e81',
        shadowLine: '#0f172a',
        baseboard: '#4f46e5',
      }
    case 'wood_panel':
      return {
        wallBody: '#78350f',
        trimColor: '#d97706',
        bevelColor: '#92400e',
        shadowLine: '#451a03',
        baseboard: '#292524',
        isWood: true,
      }
    case 'glass_modern':
      return {
        wallBody: 'rgba(186, 230, 253, 0.55)',
        trimColor: '#38bdf8',
        bevelColor: '#0284c7',
        shadowLine: '#0369a1',
        baseboard: '#0c4a6e',
        isGlass: true,
      }
    case 'forge_stone_wall':
    case 'stone_dark':
      return {
        wallBody: '#334155',
        trimColor: '#94a3b8',
        bevelColor: '#1e293b',
        shadowLine: '#0f172a',
        baseboard: '#475569',
        isStone: true,
      }
    case 'forge_dark_brick':
      return {
        wallBody: '#292524',
        trimColor: '#a8a29e',
        bevelColor: '#1c1917',
        shadowLine: '#0c0a09',
        baseboard: '#ea580c',
        isBrick: true,
      }
    case 'drywall_white':
    default:
      return {
        wallBody: '#d5dee5',
        trimColor: '#ffffff',
        bevelColor: '#b8c9d9',
        shadowLine: '#7d91a3',
        baseboard: '#deb887',
      }
  }
}

export class PixelArtRenderer {
  /**
   * Draw 2D Floor Tile
   */
  static drawFloor(ctx: CanvasRenderingContext2D, type: FloorType | string, x: number, y: number, size: number = TILE_SIZE) {
    const px = Math.floor(x)
    const py = Math.floor(y)
    // 0.75px subpixel bleed overlap completely eliminates tile seams / grid lines when camera zooms out
    const s = size + 0.75

    ctx.save()

    // 1. Check custom user floor element
    const customAsset = useCustomAssetsStore.getState().getAssetById(type)
    if (customAsset && customAsset.frames && customAsset.frames.length > 0) {
      const frameIdx = Math.floor((Date.now() / (customAsset.frameRateMs || 160)) % customAsset.frames.length)
      const img = getCustomAssetImage(customAsset.frames[frameIdx])
      if (img && img.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, px, py, s, s)
      } else {
        ctx.fillStyle = customAsset.iconColor || '#4c6ef5'
        ctx.fillRect(px, py, s, s)
      }
      ctx.restore()
      return
    }

    switch (type) {
      case 'forge_cobblestone':
        // Medieval Blacksmith Cobblestone floor
        ctx.fillStyle = '#474a51'
        ctx.fillRect(px, py, s, s)
        // Individual stones with mortar
        ctx.fillStyle = '#5c6069'
        ctx.fillRect(px + 2, py + 2, size / 2 - 3, size / 2 - 3)
        ctx.fillRect(px + size / 2 + 1, py + 2, size / 2 - 3, size / 2 - 3)
        ctx.fillRect(px + 2, py + size / 2 + 1, size / 2 - 3, size / 2 - 3)
        ctx.fillRect(px + size / 2 + 1, py + size / 2 + 1, size / 2 - 3, size / 2 - 3)
        // Stone highlights
        ctx.fillStyle = '#787d8a'
        ctx.fillRect(px + 3, py + 3, size / 2 - 6, 2)
        ctx.fillRect(px + size / 2 + 2, py + size / 2 + 2, size / 2 - 6, 2)
        // Soft Mortar lines
        ctx.fillStyle = 'rgba(47, 49, 54, 0.6)'
        ctx.fillRect(px, py + size / 2, size, 1)
        ctx.fillRect(px + size / 2, py, 1, size)
        break

      case 'forge_soot_stone':
        // Charred stone floor with soot and burning ember flecks
        ctx.fillStyle = '#202225'
        ctx.fillRect(px, py, s, s)
        ctx.fillStyle = '#2f3136'
        ctx.fillRect(px + 3, py + 3, size - 6, size - 6)
        // Soot stains
        ctx.fillStyle = '#16181b'
        ctx.fillRect(px + 6, py + 8, 12, 10)
        // Glowing ember flecks
        ctx.fillStyle = '#ff6b35'
        ctx.fillRect(px + 8, py + 12, 2, 2)
        ctx.fillStyle = '#ffa94d'
        ctx.fillRect(px + 22, py + 18, 2, 2)
        break

      case 'forge_iron_plates':
        // Riveted Heavy Iron / Steel floor plating
        ctx.fillStyle = '#343a40'
        ctx.fillRect(px, py, s, s)
        ctx.fillStyle = '#495057'
        ctx.fillRect(px + 2, py + 2, size - 4, size - 4)
        // Diagonal grip texture
        ctx.fillStyle = '#212529'
        ctx.fillRect(px + 6, py + 6, size - 12, 2)
        ctx.fillRect(px + 6, py + 14, size - 12, 2)
        ctx.fillRect(px + 6, py + 22, size - 12, 2)
        // Corner steel rivets
        ctx.fillStyle = '#ced4da'
        ctx.fillRect(px + 3, py + 3, 2, 2)
        ctx.fillRect(px + size - 5, py + 3, 2, 2)
        ctx.fillRect(px + 3, py + size - 5, 2, 2)
        ctx.fillRect(px + size - 5, py + size - 5, 2, 2)
        break

      case 'habbo_parquet':
      case 'wood_light':
        // Soft, elegant Gather Wood Plank Floor (seamless without harsh grid borders)
        ctx.fillStyle = '#f6e7d2'
        ctx.fillRect(px, py, s, s)
        // Soft alternating plank highlights (subtle grain, no harsh perimeter borders)
        ctx.fillStyle = 'rgba(235, 204, 168, 0.45)'
        ctx.fillRect(px, py + 8, size, 1)
        ctx.fillRect(px, py + 24, size, 1)
        ctx.fillStyle = 'rgba(228, 190, 150, 0.35)'
        ctx.fillRect(px + 16, py, 1, 8)
        ctx.fillRect(px + 8, py + 8, 1, 16)
        ctx.fillRect(px + 24, py + 24, 1, 8)
        break

      case 'habbo_hc_carpet':
        ctx.fillStyle = '#1b5e20'
        ctx.fillRect(px, py, size, size)
        ctx.fillStyle = '#2e7d32'
        ctx.fillRect(px + 2, py + 2, size - 4, size - 4)
        ctx.fillStyle = '#f59f00'
        ctx.strokeRect(px + 2.5, py + 2.5, size - 5, size - 5)
        ctx.fillStyle = '#ffd43b'
        ctx.fillRect(px + size / 2 - 1, py + size / 2 - 1, 3, 3)
        break

      case 'habbo_checker_red':
        ctx.fillStyle = '#f1f3f5'
        ctx.fillRect(px, py, size, size)
        ctx.fillStyle = '#c92a2a'
        ctx.fillRect(px, py, size / 2, size / 2)
        ctx.fillRect(px + size / 2, py + size / 2, size / 2, size / 2)
        break

      case 'habbo_pool_water':
        ctx.fillStyle = '#22b8cf'
        ctx.fillRect(px, py, size, size)
        ctx.fillStyle = '#15aabf'
        ctx.fillRect(px + 2, py + 2, size - 4, size - 4)
        ctx.fillStyle = '#66d9e8'
        ctx.fillRect(px + 4, py + 6, 8, 2)
        ctx.fillRect(px + 18, py + 16, 10, 2)
        break

      case 'habbo_disco_dance': {
        const discoColors = ['#e64980', '#7950f2', '#12b886', '#fab005', '#228be6']
        const colorIdx = (Math.floor(px / size) + Math.floor(py / size)) % discoColors.length
        ctx.fillStyle = discoColors[colorIdx]
        ctx.fillRect(px, py, size, size)
        ctx.fillStyle = 'rgba(255,255,255,0.4)'
        ctx.fillRect(px + 2, py + 2, size - 4, size - 4)
        break
      }

      case 'habbo_executive_rug':
        ctx.fillStyle = '#800020'
        ctx.fillRect(px, py, size, size)
        ctx.fillStyle = '#a01030'
        ctx.fillRect(px + 4, py + 4, size - 8, size - 8)
        ctx.fillStyle = '#fcc419'
        ctx.fillRect(px, py, size, 2)
        ctx.fillRect(px, py + size - 2, size, 2)
        break

      case 'wood_dark':
        ctx.fillStyle = '#8c5e3c'
        ctx.fillRect(px, py, size, size)
        ctx.fillStyle = '#7a5133'
        ctx.fillRect(px, py + size / 2, size, 1)
        ctx.fillStyle = '#6b4529'
        ctx.fillRect(px + size / 3, py, 1, size / 2)
        break

      case 'carpet_blue':
        ctx.fillStyle = '#9aa5b1'
        ctx.fillRect(px, py, size, size)
        ctx.fillStyle = '#8895a5'
        ctx.fillRect(px, py, size / 2, size / 2)
        ctx.fillRect(px + size / 2, py + size / 2, size / 2, size / 2)
        break

      case 'carpet_gray':
        ctx.fillStyle = '#343a40'
        ctx.fillRect(px, py, size, size)
        ctx.fillStyle = '#212529'
        ctx.fillRect(px + 6, py + 6, 2, 2)
        break

      case 'tile_white':
        ctx.fillStyle = '#e9ecef'
        ctx.fillRect(px, py, size, size)
        ctx.strokeStyle = '#ced4da'
        ctx.lineWidth = 1
        ctx.strokeRect(px + 0.5, py + 0.5, size - 1, size - 1)
        break

      case 'grass':
        // Soft green corridor surrounding the room
        ctx.fillStyle = '#d3e8d2'
        ctx.fillRect(px, py, size, size)
        ctx.fillStyle = '#c0dbc0'
        ctx.fillRect(px + 4, py + 8, 2, 3)
        ctx.fillRect(px + 18, py + 4, 2, 3)
        break

      case 'concrete':
      default:
        ctx.fillStyle = '#495057'
        ctx.fillRect(px, py, size, size)
        ctx.strokeStyle = '#343a40'
        ctx.strokeRect(px + 0.5, py + 0.5, size - 1, size - 1)
        break
    }
    ctx.restore()
  }

  /**
   * Draw 2D Wall Tile
   */
  static drawWall(ctx: CanvasRenderingContext2D, type: WallType | string, x: number, y: number, size: number = TILE_SIZE) {
    const px = Math.floor(x)
    const py = Math.floor(y)

    ctx.save()

    // 1. Check custom user wall element
    const customAsset = useCustomAssetsStore.getState().getAssetById(type)
    if (customAsset && customAsset.frames && customAsset.frames.length > 0) {
      const frameIdx = Math.floor((Date.now() / (customAsset.frameRateMs || 160)) % customAsset.frames.length)
      const img = getCustomAssetImage(customAsset.frames[frameIdx])
      if (img && img.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, px, py, size, size)
      } else {
        ctx.fillStyle = customAsset.iconColor || '#212529'
        ctx.fillRect(px, py, size, size)
      }
      ctx.restore()
      return
    }

    switch (type) {
      case 'forge_stone_wall':
        // Heavy Medieval Stone Wall
        ctx.fillStyle = '#2b2d31'
        ctx.fillRect(px, py, size, size)
        ctx.fillStyle = '#474b53'
        ctx.fillRect(px + 1, py + 1, size / 2 - 2, size / 2 - 2)
        ctx.fillRect(px + size / 2, py + 1, size / 2 - 1, size / 2 - 2)
        ctx.fillRect(px + 1, py + size / 2, size - 2, size / 2 - 1)
        // Stone Highlights & Shadows
        ctx.fillStyle = '#686d76'
        ctx.fillRect(px + 2, py + 2, size / 2 - 4, 2)
        ctx.fillStyle = '#1e1f22'
        ctx.fillRect(px + 1, py + size / 2 - 2, size - 2, 1)
        break

      case 'forge_dark_brick':
        // Dark Soot Refractory Brick Wall
        ctx.fillStyle = '#1a1b1e'
        ctx.fillRect(px, py, size, size)
        ctx.fillStyle = '#5c2b29'
        ctx.fillRect(px + 1, py + 2, size - 2, 7)
        ctx.fillRect(px + 1, py + 11, size / 2 - 2, 7)
        ctx.fillRect(px + size / 2 + 1, py + 11, size / 2 - 2, 7)
        ctx.fillRect(px + 1, py + 20, size - 2, 7)
        // Mortar lines
        ctx.fillStyle = '#2c2e33'
        ctx.fillRect(px, py + 9, size, 2)
        ctx.fillRect(px, py + 18, size, 2)
        ctx.fillRect(px + size / 2, py + 9, 2, 9)
        break

      case 'habbo_hotel_gold':
        ctx.fillStyle = '#d4af37'
        ctx.fillRect(px, py, size, size)
        ctx.fillStyle = '#f3e5ab'
        ctx.fillRect(px + 2, py + 2, size - 4, 4)
        ctx.fillStyle = '#aa820a'
        ctx.fillRect(px + 2, py + size - 4, size - 4, 3)
        break

      case 'habbo_brick_classic':
        ctx.fillStyle = '#c92a2a'
        ctx.fillRect(px, py, size, size)
        ctx.fillStyle = '#e03131'
        ctx.fillRect(px + 1, py + 2, size - 2, 6)
        ctx.fillRect(px + 1, py + 10, size / 2 - 2, 6)
        ctx.fillRect(px + size / 2 + 1, py + 10, size / 2 - 2, 6)
        ctx.fillStyle = '#f8f9fa'
        ctx.fillRect(px, py + 8, size, 2)
        ctx.fillRect(px, py + 16, size, 2)
        break

      case 'habbo_nightclub_dark':
        ctx.fillStyle = '#1e1b4b'
        ctx.fillRect(px, py, size, size)
        ctx.fillStyle = '#4338ca'
        ctx.fillRect(px + 2, py + 2, size - 4, size - 4)
        ctx.fillStyle = '#818cf8'
        ctx.fillRect(px + 4, py + size / 2, size - 8, 2)
        break

      case 'brick_red':
        ctx.fillStyle = '#8b0000'
        ctx.fillRect(px, py, size, size)
        ctx.fillStyle = '#a52a2a'
        ctx.fillRect(px + 2, py + 2, size - 4, size - 4)
        break

      case 'drywall_white':
        ctx.fillStyle = '#e2e8f0'
        ctx.fillRect(px, py, size, size)
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(px + 2, py + 2, size - 4, size - 4)
        break

      case 'wood_panel':
        ctx.fillStyle = '#78350f'
        ctx.fillRect(px, py, size, size)
        ctx.fillStyle = '#92400e'
        ctx.fillRect(px + 2, py + 2, size - 4, size - 4)
        break

      case 'glass_modern':
        ctx.fillStyle = 'rgba(186, 230, 253, 0.6)'
        ctx.fillRect(px, py, size, size)
        ctx.strokeStyle = '#0284c7'
        ctx.strokeRect(px + 1, py + 1, size - 2, size - 2)
        break

      case 'stone_dark':
      default:
        ctx.fillStyle = '#334155'
        ctx.fillRect(px, py, size, size)
        ctx.fillStyle = '#475569'
        ctx.fillRect(px + 2, py + 2, size - 4, size - 4)
        break
    }
    ctx.restore()
  }

  /**
   * Draw Exact Gather Room Architecture Textured with Zone Wall Type:
   * 1. Tall Themed Back Wall with trim & baseboard.
   * 2. Side Partitions with corresponding material.
   * 3. Solid 3D Front Wall Blocks with doorway.
   */
  static drawGatherRoom(ctx: CanvasRenderingContext2D, zone: PrivateZone, zones: PrivateZone[] = []) {
    if (zone.hasWalls === false) return

    const minX = Math.floor(zone.x * TILE_SIZE)
    const maxX = Math.floor((zone.x + zone.width) * TILE_SIZE)
    const minY = Math.floor(zone.y * TILE_SIZE)
    const maxY = Math.floor((zone.y + zone.height) * TILE_SIZE)
    const w = maxX - minX
    const h = maxY - minY

    ctx.save()

    // 1. Check custom user wall texture
    const customAsset = useCustomAssetsStore.getState().getAssetById(zone.wallType || '')
    let customPattern: CanvasPattern | null = null

    if (customAsset && customAsset.frames && customAsset.frames.length > 0) {
      const frameIdx = Math.floor((Date.now() / (customAsset.frameRateMs || 160)) % customAsset.frames.length)
      const img = getCustomAssetImage(customAsset.frames[frameIdx])
      if (img && img.complete && img.naturalWidth > 0) {
        customPattern = ctx.createPattern(img, 'repeat')
      }
    }

    const theme = getZoneWallTheme(zone.wallType || 'drywall_white')
    const wallBodyColor = theme.wallBody

    // Height of back wall (approx 2 tiles = 64px)
    const backWallH = Math.min(Math.floor(h * 0.32), 64)
    // Height of front wall blocks (approx 1.5 tiles = 48px)
    const frontWallH = Math.min(Math.floor(h * 0.24), 48)
    const frontWallY = maxY - frontWallH

    // Doorway opening in middle
    const doorW = Math.min(Math.floor(w * 0.38), 64)
    const doorStartX = minX + Math.floor((w - doorW) / 2)
    const doorEndX = doorStartX + doorW

    // Unified helper to render the wall material/texture seamlessly
    const fillWallTexture = (rx: number, ry: number, rw: number, rh: number) => {
      if (customPattern) {
        ctx.fillStyle = customPattern
        ctx.fillRect(rx, ry, rw, rh)
      } else {
        ctx.fillStyle = wallBodyColor
        ctx.fillRect(rx, ry, rw, rh)

        if (theme.isBrick) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.25)'
          for (let by = ry + 6; by < ry + rh - 4; by += 8) {
            ctx.fillRect(rx, by, rw, 1)
          }
        } else if (theme.isWood) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'
          for (let bx = rx + 16; bx < rx + rw; bx += 16) {
            ctx.fillRect(bx, ry, 1, rh)
          }
        } else if (theme.isGlass) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.35)'
          ctx.fillRect(rx + 2, ry + 2, rw - 4, rh - 4)
        }
      }
    }

    // ==========================================
    // 1. TALL BACK WALL (Parede de Fundo 100% com a Textura da Parede)
    // ==========================================
    fillWallTexture(minX, minY, w, backWallH)

    // Subtle natural depth shadows (ceiling top shadow & floor contact shadow)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)'
    ctx.fillRect(minX, minY, w, 2)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)'
    ctx.fillRect(minX, minY + backWallH - 3, w, 3)

    // ==========================================
    // 2. SIDE WALLS (Paredes Laterais com a Textura Real)
    // ==========================================
    const sideTopY = minY + backWallH
    const sideBottomY = frontWallY

    // Check adjacent neighbor zones on Left & Right
    const leftNeighbor = zones.find(
      (z) =>
        z.id !== zone.id &&
        z.hasWalls !== false &&
        Math.abs(Math.floor((z.x + z.width) * TILE_SIZE) - minX) <= 4 &&
        Math.max(z.y, zone.y) < Math.min(z.y + z.height, zone.y + zone.height)
    )

    const rightNeighbor = zones.find(
      (z) =>
        z.id !== zone.id &&
        z.hasWalls !== false &&
        Math.abs(maxX - Math.floor(z.x * TILE_SIZE)) <= 4 &&
        Math.max(z.y, zone.y) < Math.min(z.y + z.height, zone.y + zone.height)
    )

    // --- LEFT SIDE WALL ---
    if (leftNeighbor) {
      const overlapMinY = Math.max(minY, Math.floor(leftNeighbor.y * TILE_SIZE))
      const overlapMaxY = Math.min(maxY, Math.floor((leftNeighbor.y + leftNeighbor.height) * TILE_SIZE))
      const overlapH = overlapMaxY - overlapMinY
      const doorH = Math.min(Math.floor(overlapH * 0.65), 72)
      const doorStartY = overlapMinY + Math.floor((overlapH - doorH) / 2)
      const doorEndY = doorStartY + doorH

      if (doorStartY > sideTopY) {
        fillWallTexture(minX, sideTopY, 6, doorStartY - sideTopY)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.22)'
        ctx.fillRect(minX + 5, sideTopY, 1, doorStartY - sideTopY)
      }
      if (sideBottomY > doorEndY) {
        fillWallTexture(minX, doorEndY, 6, sideBottomY - doorEndY)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.22)'
        ctx.fillRect(minX + 5, doorEndY, 1, sideBottomY - doorEndY)
      }
    } else if (sideBottomY > sideTopY) {
      fillWallTexture(minX, sideTopY, 6, sideBottomY - sideTopY)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.22)'
      ctx.fillRect(minX + 5, sideTopY, 1, sideBottomY - sideTopY)
    }

    // --- RIGHT SIDE WALL ---
    if (rightNeighbor) {
      const overlapMinY = Math.max(minY, Math.floor(rightNeighbor.y * TILE_SIZE))
      const overlapMaxY = Math.min(maxY, Math.floor((rightNeighbor.y + rightNeighbor.height) * TILE_SIZE))
      const overlapH = overlapMaxY - overlapMinY
      const doorH = Math.min(Math.floor(overlapH * 0.65), 72)
      const doorStartY = overlapMinY + Math.floor((overlapH - doorH) / 2)
      const doorEndY = doorStartY + doorH

      if (doorStartY > sideTopY) {
        fillWallTexture(maxX - 6, sideTopY, 6, doorStartY - sideTopY)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.22)'
        ctx.fillRect(maxX - 6, sideTopY, 1, doorStartY - sideTopY)
      }
      if (sideBottomY > doorEndY) {
        fillWallTexture(maxX - 6, doorEndY, 6, sideBottomY - doorEndY)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.22)'
        ctx.fillRect(maxX - 6, doorEndY, 1, sideBottomY - doorEndY)
      }
    } else if (sideBottomY > sideTopY) {
      fillWallTexture(maxX - 6, sideTopY, 6, sideBottomY - sideTopY)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.22)'
      ctx.fillRect(maxX - 6, sideTopY, 1, sideBottomY - sideTopY)
    }

    // ==========================================
    // 3. FRONT WALL BLOCKS (Paredes da Frente com a Textura Real)
    // ==========================================
    // Left Front Block
    const leftBlockW = doorStartX - minX
    if (leftBlockW > 0) {
      fillWallTexture(minX, frontWallY, leftBlockW, frontWallH)
      // Top rim & doorway shadows
      ctx.fillStyle = 'rgba(0, 0, 0, 0.28)'
      ctx.fillRect(minX, frontWallY, leftBlockW, 2)
      ctx.fillRect(doorStartX - 2, frontWallY, 2, frontWallH)
    }

    // Right Front Block
    const rightBlockW = maxX - doorEndX
    if (rightBlockW > 0) {
      fillWallTexture(doorEndX, frontWallY, rightBlockW, frontWallH)
      // Top rim & doorway shadows
      ctx.fillStyle = 'rgba(0, 0, 0, 0.28)'
      ctx.fillRect(doorEndX, frontWallY, rightBlockW, 2)
      ctx.fillRect(doorEndX, frontWallY, 2, frontWallH)
    }

    ctx.restore()
  }

  /**
   * Draw 2D Furniture & Wall Decors
   */
  static drawFurniture(ctx: CanvasRenderingContext2D, furn: PlacedFurniture) {
    // 1. Check custom user element
    const customAsset = useCustomAssetsStore.getState().getAssetById(furn.defId)
    if (customAsset && customAsset.frames && customAsset.frames.length > 0) {
      const px = Math.floor(furn.x * TILE_SIZE)
      const py = Math.floor(furn.y * TILE_SIZE)
      const w = customAsset.width * TILE_SIZE
      const h = customAsset.height * TILE_SIZE

      ctx.save()
      if (customAsset.category !== 'walls_windows') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.22)'
        ctx.beginPath()
        ctx.ellipse(px + w / 2, py + h - 2, w / 2 - 2, 5, 0, 0, Math.PI * 2)
        ctx.fill()
      }

      const frameIdx = Math.floor((Date.now() / (customAsset.frameRateMs || 160)) % customAsset.frames.length)
      const img = getCustomAssetImage(customAsset.frames[frameIdx])
      if (img && img.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, px, py, w, h)
      } else {
        ctx.fillStyle = customAsset.iconColor || '#e03131'
        ctx.fillRect(px + 2, py + 2, w - 4, h - 4)
      }
      ctx.restore()
      return
    }

    const def = FURNITURE_CATALOG.find((f) => f.id === furn.defId)
    if (!def) return

    const px = Math.floor(furn.x * TILE_SIZE)
    const py = Math.floor(furn.y * TILE_SIZE)
    const w = def.width * TILE_SIZE
    const h = def.height * TILE_SIZE

    ctx.save()

    // Furniture drop shadow (except for wall-mounted items)
    if (def.category !== 'walls_windows') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.22)'
      ctx.beginPath()
      ctx.ellipse(px + w / 2, py + h - 2, w / 2 - 2, 5, 0, 0, Math.PI * 2)
      ctx.fill()
    }

    switch (def.spriteKey) {
      // ==========================================
      // 1. WALL ITEMS & WINDOWS (EXACT GATHER STYLE)
      // ==========================================
      case 'window_grid_large': {
        // 3-Pane Large Modern Office Window (as in screenshot)
        ctx.fillStyle = '#0f172a'
        ctx.fillRect(px + 2, py + 2, w - 4, h - 4)

        // Glass background gradient
        const colW = (w - 12) / 3
        for (let i = 0; i < 3; i++) {
          const colX = px + 4 + i * (colW + 2)

          // Top pane
          ctx.fillStyle = '#a5f3fc'
          ctx.fillRect(colX, py + 4, colW, 11)
          // Lower pane
          ctx.fillStyle = '#67e8f9'
          ctx.fillRect(colX, py + 17, colW, 10)

          // Glass diagonal glare reflections
          ctx.fillStyle = 'rgba(255, 255, 255, 0.65)'
          ctx.beginPath()
          ctx.moveTo(colX + 2, py + 4)
          ctx.lineTo(colX + 6, py + 4)
          ctx.lineTo(colX + 2, py + 12)
          ctx.closePath()
          ctx.fill()
        }

        // Inner Mullion Bars
        ctx.fillStyle = '#0f172a'
        ctx.fillRect(px + 2, py + 15, w - 4, 2)
        break
      }

      case 'window_grid_medium': {
        // 2-Pane Medium Office Window
        ctx.fillStyle = '#0f172a'
        ctx.fillRect(px + 2, py + 2, w - 4, h - 4)

        const colW = (w - 10) / 2
        for (let i = 0; i < 2; i++) {
          const colX = px + 4 + i * (colW + 2)
          ctx.fillStyle = '#a5f3fc'
          ctx.fillRect(colX, py + 4, colW, 11)
          ctx.fillStyle = '#67e8f9'
          ctx.fillRect(colX, py + 17, colW, 10)
        }
        ctx.fillStyle = '#0f172a'
        ctx.fillRect(px + 2, py + 15, w - 4, 2)
        break
      }

      case 'wall_cabinets_kitchen': {
        // Suspended Kitchen/Coffee Cabinets (3x1)
        ctx.fillStyle = '#1e293b'
        ctx.fillRect(px + 2, py + 2, w - 4, h - 6)

        const cabW = (w - 10) / 3
        for (let i = 0; i < 3; i++) {
          const cabX = px + 4 + i * (cabW + 2)
          ctx.fillStyle = '#334155'
          ctx.fillRect(cabX, py + 4, cabW, h - 10)
          ctx.strokeStyle = '#0f172a'
          ctx.lineWidth = 1
          ctx.strokeRect(cabX + 0.5, py + 4.5, cabW - 1, h - 11)

          // Silver handle
          ctx.fillStyle = '#e2e8f0'
          ctx.fillRect(cabX + cabW - 4, py + h - 12, 2, 4)
        }
        break
      }

      case 'wall_whiteboard': {
        // Office Whiteboard
        ctx.fillStyle = '#cbd5e1'
        ctx.fillRect(px + 2, py + 2, w - 4, h - 4)
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(px + 4, py + 4, w - 8, h - 9)

        // Pen tray & markers
        ctx.fillStyle = '#94a3b8'
        ctx.fillRect(px + 6, py + h - 5, w - 12, 2)
        ctx.fillStyle = '#3b82f6'
        ctx.fillRect(px + 10, py + h - 7, 6, 2)
        ctx.fillStyle = '#ef4444'
        ctx.fillRect(px + 18, py + h - 7, 6, 2)

        // Diagrams on board
        ctx.fillStyle = '#3b82f6'
        ctx.fillRect(px + 8, py + 8, 12, 6)
        ctx.fillStyle = '#10b981'
        ctx.fillRect(px + 24, py + 8, 16, 2)
        break
      }

      case 'wall_tv_large': {
        // Large OLED Wall TV
        ctx.fillStyle = '#0f172a'
        ctx.fillRect(px + 2, py + 2, w - 4, h - 4)
        ctx.fillStyle = '#1e293b'
        ctx.fillRect(px + 4, py + 4, w - 8, h - 8)

        // Slide / Chart on screen
        ctx.fillStyle = '#38bdf8'
        ctx.fillRect(px + 8, py + 8, 20, 10)
        ctx.fillStyle = '#f43f5e'
        ctx.fillRect(px + 32, py + 12, 16, 6)
        break
      }

      case 'wall_clock_modern': {
        // Round Wall Clock
        ctx.fillStyle = '#0f172a'
        ctx.beginPath()
        ctx.arc(px + w / 2, py + h / 2, 10, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.arc(px + w / 2, py + h / 2, 8, 0, Math.PI * 2)
        ctx.fill()
        // Clock hands
        ctx.strokeStyle = '#0f172a'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(px + w / 2, py + h / 2)
        ctx.lineTo(px + w / 2, py + h / 2 - 5)
        ctx.moveTo(px + w / 2, py + h / 2)
        ctx.lineTo(px + w / 2 + 4, py + h / 2)
        ctx.stroke()
        break
      }

      case 'wall_poster_habbo': {
        // Framed Poster
        ctx.fillStyle = '#5c3a21'
        ctx.fillRect(px + 4, py + 3, w - 8, h - 6)
        ctx.fillStyle = '#fcc419'
        ctx.fillRect(px + 6, py + 5, w - 12, h - 10)
        // Mini duck in frame
        ctx.fillStyle = '#fd7e14'
        ctx.fillRect(px + w / 2 + 1, py + h / 2 - 2, 3, 2)
        break
      }

      // ==========================================
      // 2. GATHER OFFICE FURNITURE (FROM SCREENSHOT)
      // ==========================================
      case 'desk_executive_clean': {
        // Large Clean Grey/White Meeting Table (3x1)
        ctx.fillStyle = '#e2e8f0'
        ctx.fillRect(px + 2, py + 2, w - 4, h - 6)
        ctx.fillStyle = '#f8fafc'
        ctx.fillRect(px + 3, py + 3, w - 6, 4)

        // Table base & drawers
        ctx.fillStyle = '#475569'
        ctx.fillRect(px + 2, py + h - 6, w - 4, 4)
        ctx.fillStyle = '#94a3b8'
        ctx.fillRect(px + 6, py + h - 6, 16, 3)
        ctx.fillStyle = '#334155'
        ctx.fillRect(px + 12, py + h - 5, 4, 1)
        break
      }

      case 'chair_office_mesh': {
        // Mesh Office Chair
        ctx.fillStyle = '#334155'
        ctx.beginPath()
        ctx.arc(px + w / 2, py + h / 2, 8, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#1e293b'
        ctx.beginPath()
        ctx.arc(px + w / 2, py + h / 2, 5, 0, Math.PI * 2)
        ctx.fill()
        break
      }

      case 'potted_bonsai_tree': {
        // Corner Potted Tree (as in screenshot)
        ctx.fillStyle = '#334155'
        ctx.beginPath()
        ctx.arc(px + w / 2, py + h - 6, 7, 0, Math.PI * 2)
        ctx.fill()
        // Trunk
        ctx.fillStyle = '#92400e'
        ctx.fillRect(px + w / 2 - 2, py + 10, 4, 12)
        // Green foliage
        ctx.fillStyle = '#22c55e'
        ctx.beginPath()
        ctx.arc(px + w / 2, py + 8, 9, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#4ade80'
        ctx.beginPath()
        ctx.arc(px + w / 2 - 2, py + 6, 5, 0, Math.PI * 2)
        ctx.fill()
        break
      }

      case 'coffee_bar_station': {
        // Coffee Bar Counter with Purple Cups (as in screenshot)
        ctx.fillStyle = '#334155'
        ctx.fillRect(px + 2, py + 4, w - 4, h - 8)
        ctx.fillStyle = '#475569'
        ctx.fillRect(px + 2, py + 4, w - 4, 4)

        // Espresso machine on left
        ctx.fillStyle = '#1e293b'
        ctx.fillRect(px + 6, py - 4, 14, 16)
        ctx.fillStyle = '#7c3aed'
        ctx.fillRect(px + 10, py + 4, 6, 6)

        // Purple coffee cups
        ctx.fillStyle = '#9333ea'
        ctx.fillRect(px + 28, py + 2, 6, 6)
        ctx.fillRect(px + 40, py + 2, 6, 6)

        // Mini fridge on right
        ctx.fillStyle = '#cbd5e1'
        ctx.fillRect(px + w - 22, py - 2, 16, 18)
        ctx.fillStyle = '#38bdf8'
        ctx.fillRect(px + w - 20, py + 2, 12, 10)
        break
      }

      case 'bookshelf_arcade': {
        // Bookshelf + Arcade Machine (as in screenshot)
        ctx.fillStyle = '#334155'
        ctx.fillRect(px + 2, py - 6, 24, h - 2)
        ctx.fillStyle = '#f59e0b'
        ctx.fillRect(px + 4, py - 2, 20, 10)
        ctx.fillStyle = '#ef4444'
        ctx.fillRect(px + 6, py + 10, 4, 4)

        // Bookshelf on right
        ctx.fillStyle = '#e2e8f0'
        ctx.fillRect(px + 30, py - 6, w - 32, h - 2)
        const bookColors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6']
        for (let i = 0; i < 6; i++) {
          ctx.fillStyle = bookColors[i % bookColors.length]
          ctx.fillRect(px + 34 + i * 4, py - 2, 3, 10)
          ctx.fillRect(px + 34 + i * 4, py + 10, 3, 8)
        }
        break
      }

      // ==========================================
      // 3. HABBO FURNI & CLASSICS
      // ==========================================
      case 'habbo_sofa_hc': {
        ctx.fillStyle = '#1e4620'
        ctx.fillRect(px + 2, py + 4, w - 4, h - 6)
        ctx.fillStyle = '#2d6a31'
        ctx.fillRect(px + 4, py + 6, w - 8, h - 10)
        ctx.fillStyle = '#ffd43b'
        ctx.fillRect(px + 10, py + 12, 3, 3)
        ctx.fillRect(px + w - 13, py + 12, 3, 3)
        ctx.fillStyle = '#5c3a21'
        ctx.fillRect(px + 1, py + 2, 5, h - 4)
        ctx.fillRect(px + w - 6, py + 2, 5, h - 4)
        break
      }

      case 'habbo_dragon_lamp': {
        ctx.fillStyle = '#c4881c'
        ctx.fillRect(px + 6, py + 12, w - 12, h - 14)
        ctx.fillStyle = '#d9480f'
        ctx.fillRect(px + 8, py + 6, 16, 10)
        ctx.fillStyle = '#ffd43b'
        ctx.fillRect(px + 10, py + 8, 3, 3)
        ctx.fillStyle = '#ff922b'
        ctx.fillRect(px + 12, py + 1, 8, 6)
        ctx.fillStyle = '#ffec99'
        ctx.fillRect(px + 14, py, 4, 3)
        break
      }

      case 'habbo_duck_yellow': {
        ctx.fillStyle = '#fcc419'
        ctx.beginPath()
        ctx.arc(px + 16, py + 18, 9, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(px + 20, py + 12, 6, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#fd7e14'
        ctx.fillRect(px + 24, py + 12, 5, 3)
        ctx.fillStyle = '#212529'
        ctx.fillRect(px + 21, py + 10, 2, 2)
        break
      }

      case 'habbo_executive_desk': {
        ctx.fillStyle = '#422814'
        ctx.fillRect(px + 2, py + 4, w - 4, h - 8)
        ctx.fillStyle = '#694123'
        ctx.fillRect(px + 4, py + 6, w - 8, h - 12)
        ctx.fillStyle = '#2b8a3e'
        ctx.fillRect(px + 6, py + 6, 7, 4)
        ctx.fillStyle = '#f8f9fa'
        ctx.fillRect(px + 24, py + 10, 10, 8)
        break
      }

      case 'habbo_bar_counter': {
        ctx.fillStyle = '#5c3a21'
        ctx.fillRect(px + 2, py + 4, w - 4, h - 8)
        ctx.fillStyle = '#8c5e3c'
        ctx.fillRect(px + 4, py + 4, w - 8, 4)
        ctx.fillStyle = '#ff6b6b'
        ctx.fillRect(px + 14, py + 10, 4, 4)
        break
      }

      case 'habbo_drink_vending': {
        ctx.fillStyle = '#1864ab'
        ctx.fillRect(px + 4, py + 2, w - 8, h - 4)
        ctx.fillStyle = '#339af0'
        ctx.fillRect(px + 6, py + 4, w - 12, 12)
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(px + 10, py + 8, 12, 3)
        break
      }

      case 'habbo_teleport_door': {
        ctx.fillStyle = '#3b1d0c'
        ctx.fillRect(px + 3, py + 1, w - 6, h - 3)
        ctx.fillStyle = '#653518'
        ctx.fillRect(px + 5, py + 3, w - 10, h - 6)
        ctx.fillStyle = '#ffd43b'
        ctx.fillRect(px + 7, py + 14, 3, 3)
        break
      }

      case 'habbo_plant_yucca': {
        ctx.fillStyle = '#d9480f'
        ctx.fillRect(px + 8, py + 16, 16, 12)
        ctx.fillStyle = '#5c3a21'
        ctx.fillRect(px + 14, py + 8, 4, 10)
        ctx.fillStyle = '#2b8a3e'
        ctx.beginPath()
        ctx.moveTo(px + 16, py + 2)
        ctx.lineTo(px + 4, py + 10)
        ctx.lineTo(px + 28, py + 10)
        ctx.closePath()
        ctx.fill()
        break
      }

      case 'habbo_dj_deck': {
        ctx.fillStyle = '#212529'
        ctx.fillRect(px + 2, py + 4, w - 4, h - 8)
        ctx.fillStyle = '#111'
        ctx.beginPath()
        ctx.arc(px + 16, py + 15, 9, 0, Math.PI * 2)
        ctx.arc(px + w - 16, py + 15, 9, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#51cf66'
        ctx.fillRect(px + w / 2 - 4, py + 8, 8, 2)
        break
      }

      case 'habbo_sofa_plasto': {
        ctx.fillStyle = '#1c7ed6'
        ctx.fillRect(px + 2, py + 6, w - 4, h - 8)
        ctx.fillStyle = '#339af0'
        ctx.fillRect(px + 4, py + 8, w - 8, h - 12)
        break
      }

      case 'desk_pc_single':
        ctx.fillStyle = '#d0bfff'
        ctx.fillRect(px + 2, py + 4, w - 4, h - 8)
        ctx.fillStyle = '#212529'
        ctx.fillRect(px + 14, py + 8, 36, 20)
        ctx.fillStyle = '#38d9a9'
        ctx.fillRect(px + 16, py + 10, 32, 16)
        break

      case 'desk_mac_dual':
        ctx.fillStyle = '#e9ecef'
        ctx.fillRect(px + 2, py + 4, w - 4, h - 8)
        ctx.fillStyle = '#212529'
        ctx.fillRect(px + 6, py + 8, 24, 18)
        ctx.fillRect(px + 34, py + 8, 24, 18)
        break

      case 'chair_office_black':
        ctx.fillStyle = '#343a40'
        ctx.beginPath()
        ctx.arc(px + w / 2, py + h / 2, 10, 0, Math.PI * 2)
        ctx.fill()
        break

      case 'table_meeting_large':
        ctx.fillStyle = '#343a40'
        ctx.fillRect(px + 4, py + 4, w - 8, h - 8)
        ctx.fillStyle = '#495057'
        ctx.fillRect(px + 6, py + 6, w - 12, h - 12)
        break

      // ==========================================
      // 4. FORJA ANTIGA / BLACKSMITH WORKSHOP (LPC)
      // ==========================================
      case 'forge_kiln_tall_chimney': {
        const fireFrames = ['forge_kiln_tall_chimney_f1', 'forge_kiln_tall_chimney_f2', 'forge_kiln_tall_chimney_f3', 'forge_kiln_tall_chimney_f2']
        const frameIdx = Math.floor((Date.now() / 150) % fireFrames.length)
        const img = getBlacksmithItemImage(fireFrames[frameIdx]) || getBlacksmithItemImage('forge_kiln_tall_chimney_f2')
        if (img && img.complete && img.naturalWidth > 0) {
          ctx.drawImage(img, px, py, w, h)
        } else {
          ctx.fillStyle = '#2b2d31'
          ctx.fillRect(px + 4, py + 4, w - 8, h - 8)
          ctx.fillStyle = '#ff6b35'
          ctx.fillRect(px + w / 2 - 12, py + h - 36, 24, 24)
        }
        break
      }

      case 'forge_conical_smelter': {
        const fireFrames = ['forge_conical_smelter_f0', 'forge_conical_smelter_f1', 'forge_conical_smelter_f2', 'forge_conical_smelter_f1']
        const frameIdx = Math.floor((Date.now() / 160) % fireFrames.length)
        const img = getBlacksmithItemImage(fireFrames[frameIdx]) || getBlacksmithItemImage('forge_conical_smelter_f1')
        if (img && img.complete && img.naturalWidth > 0) {
          ctx.drawImage(img, px, py, w, h)
        } else {
          ctx.fillStyle = '#5c3a21'
          ctx.fillRect(px + 8, py + 8, w - 16, h - 16)
          ctx.fillStyle = '#ff6b35'
          ctx.fillRect(px + w / 2 - 20, py + h - 40, 40, 28)
        }
        break
      }

      case 'ping_pong_table':
        ctx.fillStyle = '#2b8a3e'
        ctx.fillRect(px + 2, py + 4, w - 4, h - 8)
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(px + w / 2 - 1, py + 4, 2, h - 8)
        break

      default:
        ctx.fillStyle = def.iconColor || '#4c6ef5'
        ctx.fillRect(px + 2, py + 2, w - 4, h - 4)
        break
    }

    ctx.restore()
  }

  /**
   * Draw 2D Private Zone
   */
  static drawPrivateZone(ctx: CanvasRenderingContext2D, zone: PrivateZone, isCurrent: boolean = false) {
    const px = Math.floor(zone.x * TILE_SIZE)
    const py = Math.floor(zone.y * TILE_SIZE)
    const w = zone.width * TILE_SIZE
    const h = zone.height * TILE_SIZE

    ctx.save()

    // Translucent zone floor tint
    ctx.fillStyle = zone.color ? `${zone.color}${isCurrent ? '28' : '10'}` : isCurrent ? 'rgba(76, 110, 245, 0.20)' : 'rgba(76, 110, 245, 0.07)'
    ctx.fillRect(px, py, w, h)

    // Dashed border line
    ctx.strokeStyle = zone.color || '#4c6ef5'
    ctx.lineWidth = isCurrent ? 2.5 : 1.5
    ctx.setLineDash([6, 4])
    ctx.strokeRect(px + 1, py + 1, w - 2, h - 2)

    // Header badge
    ctx.setLineDash([])
    const label = zone.name.toUpperCase()
    ctx.font = 'bold 9px sans-serif'
    const textWidth = ctx.measureText(label).width

    ctx.fillStyle = zone.color || '#4c6ef5'
    ctx.beginPath()
    ctx.roundRect(px + 4, py + 4, textWidth + 12, 16, 4)
    ctx.fill()

    ctx.fillStyle = '#ffffff'
    ctx.fillText(label, px + 10, py + 15)

    ctx.restore()
  }
}
