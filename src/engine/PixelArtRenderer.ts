import { FloorType, WallType, PlacedFurniture, PrivateZone } from '../types/map'
import { FURNITURE_CATALOG, TILE_SIZE } from './Constants'

export class PixelArtRenderer {
  /**
   * Draw Floor Tile with Habbo Hotel & Classic themes
   */
  static drawFloor(ctx: CanvasRenderingContext2D, type: FloorType, x: number, y: number, size: number = TILE_SIZE) {
    const px = Math.floor(x)
    const py = Math.floor(y)

    ctx.save()
    switch (type) {
      case 'habbo_parquet':
        // Classic Habbo Hotel Parquet Flooring
        ctx.fillStyle = '#dfab68'
        ctx.fillRect(px, py, size, size)
        ctx.fillStyle = '#c7914e'
        ctx.fillRect(px, py + size / 2, size, 1)
        ctx.fillStyle = '#b37c3c'
        ctx.fillRect(px + size / 2, py, 1, size / 2)
        ctx.fillRect(px + size / 4, py + size / 2, 1, size / 2)
        ctx.fillRect(px + (size * 3) / 4, py + size / 2, 1, size / 2)
        // Pixel bevel
        ctx.fillStyle = '#ebd19f'
        ctx.fillRect(px, py, size, 1)
        ctx.fillRect(px, py, 1, size)
        break

      case 'habbo_hc_carpet':
        // Habbo Club (HC) Emerald & Gold Carpet
        ctx.fillStyle = '#1b5e20'
        ctx.fillRect(px, py, size, size)
        ctx.fillStyle = '#2e7d32'
        ctx.fillRect(px + 3, py + 3, size - 6, size - 6)
        ctx.fillStyle = '#f59f00' // Gold HC border
        ctx.strokeRect(px + 2.5, py + 2.5, size - 5, size - 5)
        ctx.fillStyle = '#ffd43b'
        ctx.fillRect(px + size / 2 - 1, py + size / 2 - 1, 3, 3)
        break

      case 'habbo_checker_red':
        // Classic Habbo Red & Cream Checkerboard
        ctx.fillStyle = '#f1f3f5'
        ctx.fillRect(px, py, size, size)
        ctx.fillStyle = '#c92a2a'
        ctx.fillRect(px, py, size / 2, size / 2)
        ctx.fillRect(px + size / 2, py + size / 2, size / 2, size / 2)
        ctx.strokeStyle = '#212529'
        ctx.lineWidth = 1
        ctx.strokeRect(px + 0.5, py + 0.5, size - 1, size - 1)
        break

      case 'habbo_pool_water':
        // Habbo Public Pool Shimmering Blue Tiles
        ctx.fillStyle = '#22b8cf'
        ctx.fillRect(px, py, size, size)
        ctx.fillStyle = '#15aabf'
        ctx.fillRect(px + 2, py + 2, size - 4, size - 4)
        ctx.fillStyle = '#66d9e8' // Water ripple highlight
        ctx.fillRect(px + 4, py + 6, 8, 2)
        ctx.fillRect(px + 18, py + 16, 10, 2)
        ctx.fillRect(px + 8, py + 24, 6, 2)
        break

      case 'habbo_disco_dance':
        // Habbo Nightclub Disco Light Tiles
        const discoColors = ['#e64980', '#7950f2', '#12b886', '#fab005', '#228be6']
        const colorIdx = (Math.floor(px / size) + Math.floor(py / size)) % discoColors.length
        ctx.fillStyle = discoColors[colorIdx]
        ctx.fillRect(px, py, size, size)
        ctx.fillStyle = 'rgba(255,255,255,0.4)'
        ctx.fillRect(px + 2, py + 2, size - 4, size - 4)
        ctx.strokeStyle = '#12151d'
        ctx.lineWidth = 2
        ctx.strokeRect(px + 1, py + 1, size - 2, size - 2)
        break

      case 'habbo_executive_rug':
        // Habbo Executive Burgundy & Gold Fringe Rug
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
        ctx.fillRect(px + size / 4, py + size / 2, 1, size / 2)
        break

      case 'wood_dark':
        ctx.fillStyle = '#8c5e3c'
        ctx.fillRect(px, py, size, size)
        ctx.fillStyle = '#7a5133'
        ctx.fillRect(px, py + size / 2, size, 1)
        ctx.fillStyle = '#6b4529'
        ctx.fillRect(px + size / 3, py, 1, size / 2)
        ctx.fillRect(px + (size * 2) / 3, py + size / 2, 1, size / 2)
        break

      case 'carpet_blue':
        ctx.fillStyle = '#364fc7'
        ctx.fillRect(px, py, size, size)
        ctx.fillStyle = '#2b3f9e'
        ctx.fillRect(px + 4, py + 4, 2, 2)
        ctx.fillRect(px + 20, py + 8, 2, 2)
        ctx.fillRect(px + 12, py + 22, 2, 2)
        ctx.fillRect(px + 26, py + 24, 2, 2)
        break

      case 'carpet_gray':
        ctx.fillStyle = '#343a40'
        ctx.fillRect(px, py, size, size)
        ctx.fillStyle = '#212529'
        ctx.fillRect(px + 6, py + 6, 2, 2)
        ctx.fillRect(px + 22, py + 14, 2, 2)
        ctx.fillRect(px + 10, py + 24, 2, 2)
        break

      case 'carpet_purple':
        ctx.fillStyle = '#5f3dc4'
        ctx.fillRect(px, py, size, size)
        ctx.fillStyle = '#4f30a8'
        ctx.fillRect(px + 8, py + 8, 2, 2)
        ctx.fillRect(px + 24, py + 18, 2, 2)
        break

      case 'tile_white':
        ctx.fillStyle = '#e9ecef'
        ctx.fillRect(px, py, size, size)
        ctx.strokeStyle = '#ced4da'
        ctx.lineWidth = 1
        ctx.strokeRect(px + 0.5, py + 0.5, size - 1, size - 1)
        break

      case 'tile_checker':
        ctx.fillStyle = '#dee2e6'
        ctx.fillRect(px, py, size, size)
        ctx.fillStyle = '#adb5bd'
        ctx.fillRect(px, py, size / 2, size / 2)
        ctx.fillRect(px + size / 2, py + size / 2, size / 2, size / 2)
        break

      case 'grass':
        ctx.fillStyle = '#51cf66'
        ctx.fillRect(px, py, size, size)
        ctx.fillStyle = '#40c057'
        ctx.fillRect(px + 4, py + 8, 2, 4)
        ctx.fillRect(px + 18, py + 4, 2, 4)
        ctx.fillRect(px + 12, py + 20, 2, 4)
        ctx.fillRect(px + 24, py + 16, 2, 4)
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
   * Draw Wall Tile
   */
  static drawWall(ctx: CanvasRenderingContext2D, type: WallType, x: number, y: number, size: number = TILE_SIZE) {
    const px = Math.floor(x)
    const py = Math.floor(y)

    ctx.save()
    // Drop shadow under the wall
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'
    ctx.fillRect(px, py + size - 4, size, 4)

    switch (type) {
      case 'habbo_hotel_gold':
        // Habbo Classic Gold & Mahogany Wallpaper
        ctx.fillStyle = '#e8d4a2'
        ctx.fillRect(px, py, size, size - 4)
        ctx.fillStyle = '#f3e5c8'
        ctx.fillRect(px, py, size, 6)
        // Vertical decorative striped grooves
        ctx.fillStyle = '#d4be88'
        ctx.fillRect(px + 8, py + 6, 2, size - 14)
        ctx.fillRect(px + 22, py + 6, 2, size - 14)
        // Mahogany Baseboard
        ctx.fillStyle = '#4a2810'
        ctx.fillRect(px, py + size - 8, size, 4)
        ctx.fillStyle = '#6e3c1b'
        ctx.fillRect(px, py + size - 8, size, 1)
        break

      case 'habbo_brick_classic':
        // Habbo Classic Orange/Red Brick Wall
        ctx.fillStyle = '#c85a32'
        ctx.fillRect(px, py, size, size - 4)
        ctx.fillStyle = '#8f3818' // Mortar lines
        ctx.fillRect(px, py + 7, size, 2)
        ctx.fillRect(px, py + 15, size, 2)
        ctx.fillRect(px, py + 23, size, 2)
        ctx.fillRect(px + 8, py, 2, 7)
        ctx.fillRect(px + 24, py, 2, 7)
        ctx.fillRect(px + 16, py + 7, 2, 8)
        ctx.fillRect(px + 8, py + 15, 2, 8)
        ctx.fillRect(px + 24, py + 15, 2, 8)
        break

      case 'habbo_nightclub_dark':
        // Habbo Massiva Nightclub Wall
        ctx.fillStyle = '#0f172a'
        ctx.fillRect(px, py, size, size - 4)
        ctx.fillStyle = '#38bdf8'
        ctx.fillRect(px, py + 4, size, 2) // Neon Cyan stripe
        ctx.fillStyle = '#ec4899'
        ctx.fillRect(px, py + 12, size, 2) // Neon Pink stripe
        break

      case 'brick_red':
        ctx.fillStyle = '#b04a37'
        ctx.fillRect(px, py, size, size - 4)
        ctx.fillStyle = '#6b2d21'
        ctx.fillRect(px, py + 6, size, 1)
        ctx.fillRect(px, py + 13, size, 1)
        ctx.fillRect(px, py + 20, size, 1)
        ctx.fillRect(px + 6, py, 1, 6)
        ctx.fillRect(px + 20, py, 1, 6)
        ctx.fillRect(px + 13, py + 6, 1, 7)
        break

      case 'wood_panel':
        ctx.fillStyle = '#5c3a21'
        ctx.fillRect(px, py, size, size - 4)
        ctx.fillStyle = '#422814'
        ctx.fillRect(px + 7, py, 1, size - 4)
        ctx.fillRect(px + 15, py, 1, size - 4)
        ctx.fillRect(px + 23, py, 1, size - 4)
        ctx.fillStyle = '#7a4f2f'
        ctx.fillRect(px, py, size, 3)
        break

      case 'glass_modern':
        ctx.fillStyle = 'rgba(120, 180, 240, 0.45)'
        ctx.fillRect(px, py, size, size - 4)
        ctx.strokeStyle = '#3b82f6'
        ctx.lineWidth = 2
        ctx.strokeRect(px + 1, py + 1, size - 2, size - 6)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
        ctx.fillRect(px + 4, py + 4, 3, size - 12)
        break

      case 'drywall_white':
      default:
        ctx.fillStyle = '#ced4da'
        ctx.fillRect(px, py, size, size - 4)
        ctx.fillStyle = '#adb5bd'
        ctx.fillRect(px, py + size - 8, size, 4)
        ctx.fillStyle = '#f8f9fa'
        ctx.fillRect(px, py, size, 2)
        break
    }
    ctx.restore()
  }

  /**
   * Draw Furniture with Habbo Furni & Classic Items
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
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
    ctx.beginPath()
    ctx.ellipse(px + w / 2, py + h - 2, w / 2 - 2, 6, 0, 0, Math.PI * 2)
    ctx.fill()

    switch (def.spriteKey) {
      // --- HABBO HOTEL ICONIC FURNI ---
      case 'habbo_sofa_hc': {
        // Legendary HC Club Green Sofa
        ctx.fillStyle = '#1e4620' // Base
        ctx.fillRect(px + 2, py + 6, w - 4, h - 8)
        ctx.fillStyle = '#2d6a31' // Cushions
        ctx.fillRect(px + 4, py + 8, w - 8, h - 12)
        // Gold buttons
        ctx.fillStyle = '#ffd43b'
        ctx.fillRect(px + 12, py + 14, 3, 3)
        ctx.fillRect(px + w - 15, py + 14, 3, 3)
        // Mahogany Armrests
        ctx.fillStyle = '#5c3a21'
        ctx.fillRect(px + 1, py + 4, 6, h - 6)
        ctx.fillRect(px + w - 7, py + 4, 6, h - 6)
        ctx.fillStyle = '#8c5e3c'
        ctx.fillRect(px + 1, py + 4, 6, 2)
        ctx.fillRect(px + w - 7, py + 4, 6, 2)
        break
      }

      case 'habbo_dragon_lamp': {
        // Legendary Fire Dragon Rare Lamp
        // Golden Base Pedestal
        ctx.fillStyle = '#c4881c'
        ctx.fillRect(px + 6, py + 14, w - 12, h - 16)
        ctx.fillStyle = '#ffe066'
        ctx.fillRect(px + 8, py + 12, w - 16, 3)
        // Dragon Head
        ctx.fillStyle = '#d9480f'
        ctx.fillRect(px + 8, py + 6, 16, 10)
        ctx.fillStyle = '#ffd43b'
        ctx.fillRect(px + 10, py + 8, 3, 3) // Eye
        // Flickering Flame Fire 🔥
        ctx.fillStyle = '#ff922b'
        ctx.fillRect(px + 12, py + 1, 8, 7)
        ctx.fillStyle = '#ffec99'
        ctx.fillRect(px + 14, py, 4, 4)
        break
      }

      case 'habbo_duck_yellow': {
        // Classic Habbo Yellow Duckie 🦆
        ctx.fillStyle = '#fcc419' // Body
        ctx.beginPath()
        ctx.arc(px + 16, py + 18, 9, 0, Math.PI * 2)
        ctx.fill()
        // Head
        ctx.beginPath()
        ctx.arc(px + 20, py + 12, 6, 0, Math.PI * 2)
        ctx.fill()
        // Orange Beak
        ctx.fillStyle = '#fd7e14'
        ctx.fillRect(px + 24, py + 12, 5, 3)
        // Eye
        ctx.fillStyle = '#212529'
        ctx.fillRect(px + 21, py + 10, 2, 2)
        break
      }

      case 'habbo_executive_desk': {
        // Habbo Executive Desk
        ctx.fillStyle = '#422814'
        ctx.fillRect(px + 2, py + 4, w - 4, h - 8)
        ctx.fillStyle = '#694123'
        ctx.fillRect(px + 4, py + 6, w - 8, h - 12)
        // Green Banker Lamp
        ctx.fillStyle = '#ffd43b'
        ctx.fillRect(px + 8, py + 8, 3, 6)
        ctx.fillStyle = '#2f9e44'
        ctx.fillRect(px + 6, py + 6, 7, 4)
        // Papers
        ctx.fillStyle = '#f8f9fa'
        ctx.fillRect(px + 24, py + 10, 10, 8)
        break
      }

      case 'habbo_bar_counter': {
        // Habbo Reception / Bar Counter
        ctx.fillStyle = '#5c3a21'
        ctx.fillRect(px + 2, py + 4, w - 4, h - 8)
        ctx.fillStyle = '#8c5e3c'
        ctx.fillRect(px + 4, py + 4, w - 8, 4) // Wooden top
        // Drink Glass
        ctx.fillStyle = '#74c0fc'
        ctx.fillRect(px + 14, py + 8, 4, 6)
        ctx.fillStyle = '#ff6b6b'
        ctx.fillRect(px + 14, py + 10, 4, 4)
        break
      }

      case 'habbo_drink_vending': {
        // Habbo Soda Vending Machine
        ctx.fillStyle = '#1864ab'
        ctx.fillRect(px + 4, py + 2, w - 8, h - 4)
        ctx.fillStyle = '#339af0'
        ctx.fillRect(px + 6, py + 4, w - 12, 12)
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(px + 10, py + 8, 12, 3)
        // Dispenser slot
        ctx.fillStyle = '#112233'
        ctx.fillRect(px + 8, py + 20, w - 16, 6)
        break
      }

      case 'habbo_teleport_door': {
        // Habbo Teleporter Wardrobe
        ctx.fillStyle = '#3b1d0c'
        ctx.fillRect(px + 3, py + 1, w - 6, h - 3)
        ctx.fillStyle = '#653518'
        ctx.fillRect(px + 5, py + 3, w - 10, h - 6)
        // Brass Knob
        ctx.fillStyle = '#ffd43b'
        ctx.fillRect(px + 7, py + 14, 3, 3)
        break
      }

      case 'habbo_plant_yucca': {
        // Habbo Classic Yucca
        // Pot
        ctx.fillStyle = '#d9480f'
        ctx.fillRect(px + 8, py + 16, 16, 12)
        // Trunk & Leaves
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
        // Habbo Sound DJ Deck
        ctx.fillStyle = '#212529'
        ctx.fillRect(px + 2, py + 4, w - 4, h - 8)
        // Turntables
        ctx.fillStyle = '#111'
        ctx.beginPath()
        ctx.arc(px + 16, py + 15, 9, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(px + w - 16, py + 15, 9, 0, Math.PI * 2)
        ctx.fill()
        // Flashing Equalizer LEDs
        ctx.fillStyle = '#51cf66'
        ctx.fillRect(px + w / 2 - 4, py + 8, 8, 2)
        ctx.fillStyle = '#ffd43b'
        ctx.fillRect(px + w / 2 - 4, py + 12, 8, 2)
        ctx.fillStyle = '#ff6b6b'
        ctx.fillRect(px + w / 2 - 4, py + 16, 8, 2)
        break
      }

      case 'habbo_pool_lounger': {
        // Striped Pool Lounger
        ctx.fillStyle = '#f8f9fa'
        ctx.fillRect(px + 4, py + 4, w - 8, h - 8)
        ctx.fillStyle = '#22b8cf'
        ctx.fillRect(px + 4, py + 8, w - 8, 4)
        ctx.fillRect(px + 4, py + 18, w - 8, 4)
        ctx.fillRect(px + 4, py + 28, w - 8, 4)
        ctx.fillRect(px + 4, py + 38, w - 8, 4)
        break
      }

      case 'habbo_tv_retro': {
        // Retro CRT TV
        ctx.fillStyle = '#495057'
        ctx.fillRect(px + 4, py + 6, w - 8, h - 10)
        ctx.fillStyle = '#22b8cf' // Glowing screen
        ctx.fillRect(px + 6, py + 8, w - 16, h - 16)
        // Antenna
        ctx.strokeStyle = '#ced4da'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(px + 10, py + 6)
        ctx.lineTo(px + 4, py + 1)
        ctx.moveTo(px + 22, py + 6)
        ctx.lineTo(px + 28, py + 1)
        ctx.stroke()
        break
      }

      case 'habbo_sofa_plasto': {
        // Blue Plasto Sofa
        ctx.fillStyle = '#1c7ed6'
        ctx.fillRect(px + 2, py + 6, w - 4, h - 8)
        ctx.fillStyle = '#339af0'
        ctx.fillRect(px + 4, py + 8, w - 8, h - 12)
        ctx.fillStyle = '#74c0fc'
        ctx.fillRect(px + 4, py + 8, w - 8, 2)
        break
      }

      // --- STANDARD MODERN & OFFICE FURNI ---
      case 'desk_pc_single':
        ctx.fillStyle = '#d0bfff'
        ctx.fillRect(px + 2, py + 4, w - 4, h - 8)
        ctx.fillStyle = '#212529'
        ctx.fillRect(px + 14, py + 8, 36, 20)
        ctx.fillStyle = '#38d9a9'
        ctx.fillRect(px + 16, py + 10, 32, 16)
        ctx.fillStyle = '#495057'
        ctx.fillRect(px + 18, py + 32, 28, 10)
        break

      case 'desk_mac_dual':
        ctx.fillStyle = '#e9ecef'
        ctx.fillRect(px + 2, py + 4, w - 4, h - 8)
        ctx.fillStyle = '#212529'
        ctx.fillRect(px + 6, py + 8, 24, 18)
        ctx.fillRect(px + 34, py + 8, 24, 18)
        ctx.fillStyle = '#74c0fc'
        ctx.fillRect(px + 8, py + 10, 20, 14)
        ctx.fillRect(px + 36, py + 10, 20, 14)
        break

      case 'desk_gamer_triple':
        ctx.fillStyle = '#212529'
        ctx.fillRect(px + 2, py + 4, w - 4, h - 8)
        // RGB Underglow
        ctx.fillStyle = '#f06595'
        ctx.fillRect(px + 4, py + h - 6, w - 8, 3)
        // 3 Monitors
        ctx.fillStyle = '#339af0'
        ctx.fillRect(px + 6, py + 8, 24, 16)
        ctx.fillRect(px + 36, py + 6, 24, 18)
        ctx.fillRect(px + 66, py + 8, 24, 16)
        break

      case 'desk_simple_wood':
        ctx.fillStyle = '#8c5e3c'
        ctx.fillRect(px + 2, py + 4, w - 4, h - 8)
        ctx.fillStyle = '#a8754e'
        ctx.fillRect(px + 4, py + 6, w - 8, h - 12)
        break

      case 'chair_office_black':
        ctx.fillStyle = '#343a40'
        ctx.beginPath()
        ctx.arc(px + w / 2, py + h / 2, 10, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#212529'
        ctx.beginPath()
        ctx.arc(px + w / 2, py + h / 2, 7, 0, Math.PI * 2)
        ctx.fill()
        break

      case 'chair_gamer_red':
        ctx.fillStyle = '#e03131'
        ctx.fillRect(px + 6, py + 6, w - 12, h - 12)
        ctx.fillStyle = '#212529'
        ctx.fillRect(px + 9, py + 9, w - 18, h - 18)
        break

      case 'chair_wooden':
        ctx.fillStyle = '#d9480f'
        ctx.fillRect(px + 8, py + 8, w - 16, h - 16)
        ctx.fillStyle = '#f76707'
        ctx.fillRect(px + 10, py + 10, w - 20, h - 20)
        break

      case 'table_meeting_large':
        ctx.fillStyle = '#343a40'
        ctx.fillRect(px + 4, py + 4, w - 8, h - 8)
        ctx.fillStyle = '#495057'
        ctx.fillRect(px + 6, py + 6, w - 12, h - 12)
        ctx.fillStyle = '#74c0fc'
        ctx.fillRect(px + w / 2 - 16, py + h / 2 - 8, 32, 16)
        break

      case 'table_meeting_round':
        ctx.fillStyle = '#343a40'
        ctx.beginPath()
        ctx.arc(px + w / 2, py + h / 2, w / 2 - 4, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#495057'
        ctx.beginPath()
        ctx.arc(px + w / 2, py + h / 2, w / 2 - 8, 0, Math.PI * 2)
        ctx.fill()
        break

      case 'whiteboard_stand':
        ctx.fillStyle = '#ced4da'
        ctx.fillRect(px + 2, py + 2, w - 4, h - 4)
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(px + 4, py + 4, w - 8, h - 8)
        ctx.fillStyle = '#339af0'
        ctx.fillRect(px + 8, py + 8, 16, 2)
        ctx.fillStyle = '#ff6b6b'
        ctx.fillRect(px + 8, py + 14, 24, 2)
        break

      case 'tv_presentation':
        ctx.fillStyle = '#212529'
        ctx.fillRect(px + 2, py + 4, w - 4, h - 8)
        ctx.fillStyle = '#1098ad'
        ctx.fillRect(px + 4, py + 6, w - 8, h - 12)
        break

      case 'sofa_orange_3seat':
        ctx.fillStyle = '#d9480f'
        ctx.fillRect(px + 2, py + 4, w - 4, h - 8)
        ctx.fillStyle = '#f76707'
        ctx.fillRect(px + 4, py + 6, w - 8, h - 12)
        break

      case 'sofa_blue_2seat':
        ctx.fillStyle = '#1864ab'
        ctx.fillRect(px + 2, py + 4, w - 4, h - 8)
        ctx.fillStyle = '#228be6'
        ctx.fillRect(px + 4, py + 6, w - 8, h - 12)
        break

      case 'beanbag_purple':
        ctx.fillStyle = '#7950f2'
        ctx.beginPath()
        ctx.arc(px + w / 2, py + h / 2, 12, 0, Math.PI * 2)
        ctx.fill()
        break

      case 'coffee_table_round':
        ctx.fillStyle = '#8c5e3c'
        ctx.beginPath()
        ctx.arc(px + w / 2, py + h / 2, w / 2 - 6, 0, Math.PI * 2)
        ctx.fill()
        break

      case 'ping_pong_table':
        ctx.fillStyle = '#2b8a3e'
        ctx.fillRect(px + 2, py + 4, w - 4, h - 8)
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(px + w / 2 - 1, py + 4, 2, h - 8)
        ctx.strokeRect(px + 3, py + 5, w - 6, h - 10)
        break

      case 'coffee_machine_station':
        ctx.fillStyle = '#8c5e3c'
        ctx.fillRect(px + 2, py + 4, w - 4, h - 8)
        ctx.fillStyle = '#212529'
        ctx.fillRect(px + 10, py + 4, 20, 16)
        ctx.fillStyle = '#ff6b6b'
        ctx.fillRect(px + 14, py + 12, 4, 4)
        break

      case 'water_cooler':
        ctx.fillStyle = '#ced4da'
        ctx.fillRect(px + 6, py + 10, w - 12, h - 12)
        ctx.fillStyle = '#339af0'
        ctx.beginPath()
        ctx.arc(px + w / 2, py + 10, 8, 0, Math.PI * 2)
        ctx.fill()
        break

      case 'plant_pot_large':
        ctx.fillStyle = '#d9480f'
        ctx.fillRect(px + 6, py + 24, w - 12, 20)
        ctx.fillStyle = '#2b8a3e'
        ctx.beginPath()
        ctx.arc(px + w / 2, py + 18, 14, 0, Math.PI * 2)
        ctx.fill()
        break

      case 'bookshelf_wood':
        ctx.fillStyle = '#5c3a21'
        ctx.fillRect(px + 2, py + 2, w - 4, h - 4)
        ctx.fillStyle = '#ff6b6b'
        ctx.fillRect(px + 6, py + 10, 12, 14)
        ctx.fillStyle = '#339af0'
        ctx.fillRect(px + 20, py + 10, 14, 14)
        ctx.fillStyle = '#ffd43b'
        ctx.fillRect(px + 38, py + 10, 16, 14)
        break

      default:
        ctx.fillStyle = def.iconColor || '#4c6ef5'
        ctx.fillRect(px + 2, py + 2, w - 4, h - 4)
        break
    }

    ctx.restore()
  }

  /**
   * Draw Demarcated Private Zone
   */
  static drawPrivateZone(ctx: CanvasRenderingContext2D, zone: PrivateZone, isCurrent: boolean = false) {
    const px = Math.floor(zone.x * TILE_SIZE)
    const py = Math.floor(zone.y * TILE_SIZE)
    const w = zone.width * TILE_SIZE
    const h = zone.height * TILE_SIZE

    ctx.save()

    // Translucent Zone Floor tint
    ctx.fillStyle = zone.color ? `${zone.color}${isCurrent ? '33' : '18'}` : isCurrent ? 'rgba(76, 110, 245, 0.22)' : 'rgba(76, 110, 245, 0.10)'
    ctx.fillRect(px, py, w, h)

    // Dashed border line
    ctx.strokeStyle = zone.color || '#4c6ef5'
    ctx.lineWidth = isCurrent ? 3 : 2
    ctx.setLineDash([6, 4])
    ctx.strokeRect(px + 1, py + 1, w - 2, h - 2)

    // Zone Header Badge
    ctx.setLineDash([])
    const label = zone.name.toUpperCase()
    ctx.font = 'bold 9px monospace'
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
