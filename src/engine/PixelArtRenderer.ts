import { FloorType, WallType, PlacedFurniture, PrivateZone } from '../types/map'
import { FURNITURE_CATALOG, TILE_SIZE } from './Constants'

export class PixelArtRenderer {
  /**
   * Draw 2D Floor Tile
   */
  static drawFloor(ctx: CanvasRenderingContext2D, type: FloorType, x: number, y: number, size: number = TILE_SIZE) {
    const px = Math.floor(x)
    const py = Math.floor(y)

    ctx.save()
    switch (type) {
      case 'habbo_parquet':
        ctx.fillStyle = '#dfab68'
        ctx.fillRect(px, py, size, size)
        ctx.fillStyle = '#c7914e'
        ctx.fillRect(px, py + size / 2, size, 1)
        ctx.fillStyle = '#b37c3c'
        ctx.fillRect(px + size / 2, py, 1, size / 2)
        ctx.fillRect(px + size / 4, py + size / 2, 1, size / 2)
        ctx.fillRect(px + (size * 3) / 4, py + size / 2, 1, size / 2)
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

      case 'habbo_disco_dance':
        const discoColors = ['#e64980', '#7950f2', '#12b886', '#fab005', '#228be6']
        const colorIdx = (Math.floor(px / size) + Math.floor(py / size)) % discoColors.length
        ctx.fillStyle = discoColors[colorIdx]
        ctx.fillRect(px, py, size, size)
        ctx.fillStyle = 'rgba(255,255,255,0.4)'
        ctx.fillRect(px + 2, py + 2, size - 4, size - 4)
        break

      case 'habbo_executive_rug':
        ctx.fillStyle = '#800020'
        ctx.fillRect(px, py, size, size)
        ctx.fillStyle = '#a01030'
        ctx.fillRect(px + 4, py + 4, size - 8, size - 8)
        ctx.fillStyle = '#fcc419'
        ctx.fillRect(px, py, size, 2)
        ctx.fillRect(px, py + size - 2, size, 2)
        break

      case 'wood_light':
        ctx.fillStyle = '#e9c496'
        ctx.fillRect(px, py, size, size)
        ctx.fillStyle = '#dfb482'
        ctx.fillRect(px, py + size / 2, size, 1)
        ctx.fillStyle = '#d4a36e'
        ctx.fillRect(px + size / 2, py, 1, size / 2)
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
        ctx.fillStyle = '#364fc7'
        ctx.fillRect(px, py, size, size)
        ctx.fillStyle = '#2b3f9e'
        ctx.fillRect(px + 4, py + 4, 2, 2)
        ctx.fillRect(px + 20, py + 8, 2, 2)
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
        ctx.fillStyle = '#51cf66'
        ctx.fillRect(px, py, size, size)
        ctx.fillStyle = '#40c057'
        ctx.fillRect(px + 4, py + 8, 2, 4)
        ctx.fillRect(px + 18, py + 4, 2, 4)
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
   * Draw Thin Architectural Partition Wall (Paredes Finas / Divisórias)
   */
  static drawThinWall(
    ctx: CanvasRenderingContext2D,
    type: WallType,
    x: number,
    y: number,
    size: number = TILE_SIZE,
    hasTop: boolean = false,
    hasBottom: boolean = false,
    hasLeft: boolean = false,
    hasRight: boolean = false
  ) {
    const px = Math.floor(x)
    const py = Math.floor(y)
    const thickness = 6
    const halfT = thickness / 2
    const cx = px + size / 2
    const cy = py + size / 2

    ctx.save()

    let mainColor = '#d4be88'
    let borderColor = '#5c3a21'
    let topColor = '#fff0d0'

    switch (type) {
      case 'habbo_hotel_gold':
        mainColor = '#d4be88'
        borderColor = '#5c3a21'
        topColor = '#fff0d0'
        break
      case 'habbo_brick_classic':
      case 'brick_red':
        mainColor = '#c85a32'
        borderColor = '#7c2d12'
        topColor = '#ff8759'
        break
      case 'habbo_nightclub_dark':
        mainColor = '#0f172a'
        borderColor = '#38bdf8'
        topColor = '#ec4899'
        break
      case 'glass_modern':
        mainColor = 'rgba(120, 180, 240, 0.65)'
        borderColor = '#3b82f6'
        topColor = '#ffffff'
        break
      case 'wood_panel':
        mainColor = '#5c3a21'
        borderColor = '#3b1d0c'
        topColor = '#8c5e3c'
        break
      case 'drywall_white':
      default:
        mainColor = '#dee2e6'
        borderColor = '#adb5bd'
        topColor = '#ffffff'
        break
    }

    const isIsolated = !hasTop && !hasBottom && !hasLeft && !hasRight
    const drawHoriz = hasLeft || hasRight || isIsolated
    const drawVert = hasTop || hasBottom

    // 1. Horizontal beam
    if (drawHoriz) {
      const leftX = hasLeft ? px : cx - halfT
      const rightX = hasRight ? px + size : cx + halfT
      const width = rightX - leftX

      // Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.22)'
      ctx.fillRect(leftX, cy + halfT, width, 3)

      // Main body
      ctx.fillStyle = mainColor
      ctx.fillRect(leftX, cy - halfT, width, thickness)

      // Top trim
      ctx.fillStyle = topColor
      ctx.fillRect(leftX, cy - halfT, width, 1.5)

      // Outline
      ctx.strokeStyle = borderColor
      ctx.lineWidth = 1
      ctx.strokeRect(leftX + 0.5, cy - halfT + 0.5, width - 1, thickness - 1)
    }

    // 2. Vertical beam
    if (drawVert) {
      const topY = hasTop ? py : cy - halfT
      const bottomY = hasBottom ? py + size : cy + halfT
      const height = bottomY - topY

      // Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.22)'
      ctx.fillRect(cx + halfT, topY, 3, height)

      // Main body
      ctx.fillStyle = mainColor
      ctx.fillRect(cx - halfT, topY, thickness, height)

      // Top trim
      ctx.fillStyle = topColor
      ctx.fillRect(cx - halfT, topY, thickness, 1.5)

      // Outline
      ctx.strokeStyle = borderColor
      ctx.lineWidth = 1
      ctx.strokeRect(cx - halfT + 0.5, topY + 0.5, thickness - 1, height - 1)
    }

    ctx.restore()
  }

  /**
   * Draw Wall (Fallback / Thumbnail compatibility)
   */
  static drawWall(ctx: CanvasRenderingContext2D, type: WallType, x: number, y: number, size: number = TILE_SIZE) {
    this.drawThinWall(ctx, type, x, y, size, false, false, true, true)
  }

  /**
   * Draw 2D Furniture
   */
  static drawFurniture(ctx: CanvasRenderingContext2D, furn: PlacedFurniture) {
    const def = FURNITURE_CATALOG.find((f) => f.id === furn.defId)
    if (!def) return

    const px = Math.floor(furn.x * TILE_SIZE)
    const py = Math.floor(furn.y * TILE_SIZE)
    const w = def.width * TILE_SIZE
    const h = def.height * TILE_SIZE

    ctx.save()

    // Furniture drop shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)'
    ctx.beginPath()
    ctx.ellipse(px + w / 2, py + h - 2, w / 2 - 2, 6, 0, 0, Math.PI * 2)
    ctx.fill()

    switch (def.spriteKey) {
      // --- HABBO FURNI ---
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
