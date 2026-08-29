import { FloorType } from '../../types/map'
import { TILE_SIZE } from '../Constants'
import { useCustomAssetsStore, getCustomAssetImage } from '../../store/useCustomAssetsStore'

export class FloorRenderer {
  /**
   * Draw 2D Floor Tile
   */
  static drawFloor(
    ctx: CanvasRenderingContext2D,
    type: FloorType | string,
    x: number,
    y: number,
    size: number = TILE_SIZE
  ) {
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
}
