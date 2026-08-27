import { Player, AvatarConfig, Direction } from '../types/game'
import { TILE_SIZE } from './Constants'

export class AvatarRenderer {
  /**
   * Draw complete 2D player avatar on canvas
   */
  static drawPlayer(
    ctx: CanvasRenderingContext2D,
    player: Player,
    isLocal: boolean,
    animationTick: number,
    size: number = TILE_SIZE
  ) {
    const px = Math.floor(player.x * size)
    const py = Math.floor(player.y * size)
    const avatar = player.avatar

    ctx.save()

    // 1. Soft Shadow under feet
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
    ctx.beginPath()
    ctx.ellipse(px + size / 2, py + size - 2, 10, 4, 0, 0, Math.PI * 2)
    ctx.fill()

    // 2. Walk bobbing / step offset
    let walkOffset = 0
    let legOffset = 0
    if (player.isMoving) {
      const step = Math.floor((animationTick / 100) % 4)
      if (step === 1 || step === 3) {
        walkOffset = -2
        legOffset = step === 1 ? 3 : -3
      }
    }

    const centerX = px + size / 2
    const baseY = py + size - 8 + walkOffset

    // 3. Draw Legs / Pants / Shoes
    ctx.fillStyle = avatar.pantsColor || '#2c3e50'
    // Left Leg
    ctx.fillRect(centerX - 6, baseY - 4, 4, 8 + (player.isMoving ? legOffset : 0))
    // Right Leg
    ctx.fillRect(centerX + 2, baseY - 4, 4, 8 - (player.isMoving ? legOffset : 0))

    // Shoes
    ctx.fillStyle = '#1c1f26'
    ctx.fillRect(centerX - 7, baseY + 4 + (player.isMoving ? legOffset : 0), 5, 3)
    ctx.fillRect(centerX + 2, baseY + 4 - (player.isMoving ? legOffset : 0), 5, 3)

    // 4. Draw Torso / Shirt
    ctx.fillStyle = avatar.shirtColor || '#4c6ef5'
    ctx.beginPath()
    ctx.roundRect(centerX - 7, baseY - 15, 14, 12, 3)
    ctx.fill()

    // Shirt details (collar / zipper / tie)
    if (avatar.shirtType === 'suit') {
      ctx.fillStyle = '#f8f9fa' // white shirt
      ctx.fillRect(centerX - 2, baseY - 15, 4, 6)
      ctx.fillStyle = '#e03131' // red tie
      ctx.fillRect(centerX - 1, baseY - 14, 2, 8)
    } else if (avatar.shirtType === 'hoodie') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)'
      ctx.fillRect(centerX - 5, baseY - 7, 10, 4) // pouch pocket
    }

    // Arms
    ctx.fillStyle = avatar.skinColor || '#ffd1a4'
    if (player.direction === 'left') {
      ctx.fillRect(centerX - 8, baseY - 14, 3, 9)
    } else if (player.direction === 'right') {
      ctx.fillRect(centerX + 5, baseY - 14, 3, 9)
    } else {
      ctx.fillRect(centerX - 9, baseY - 14, 3, 9)
      ctx.fillRect(centerX + 6, baseY - 14, 3, 9)
    }

    // 5. Draw Head / Face
    ctx.fillStyle = avatar.skinColor || '#ffd1a4'
    ctx.beginPath()
    ctx.roundRect(centerX - 7, baseY - 26, 14, 12, 4)
    ctx.fill()

    // Eyes / Facial features based on direction
    ctx.fillStyle = '#1e2022'
    if (player.direction === 'down') {
      ctx.fillRect(centerX - 4, baseY - 21, 2, 3)
      ctx.fillRect(centerX + 2, baseY - 21, 2, 3)
      // Smile
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)'
      ctx.fillRect(centerX - 2, baseY - 16, 4, 1)
    } else if (player.direction === 'left') {
      ctx.fillRect(centerX - 6, baseY - 21, 2, 3)
    } else if (player.direction === 'right') {
      ctx.fillRect(centerX + 4, baseY - 21, 2, 3)
    }

    // 6. Draw Hair
    this.drawHair(ctx, avatar, centerX, baseY, player.direction)

    // 7. Draw Accessories
    this.drawAccessory(ctx, avatar, centerX, baseY, player.direction)

    // 8. Name Tag Pill
    this.drawNameTag(ctx, player, isLocal, centerX, py - 6)

    ctx.restore()
  }

  /**
   * Draw Customizable Hair Styles
   */
  private static drawHair(
    ctx: CanvasRenderingContext2D,
    avatar: AvatarConfig,
    centerX: number,
    baseY: number,
    direction: Direction
  ) {
    if (avatar.hairStyle === 'bald') return

    ctx.fillStyle = avatar.hairColor || '#2b2b2b'

    switch (avatar.hairStyle) {
      case 'short':
        ctx.beginPath()
        ctx.roundRect(centerX - 8, baseY - 29, 16, 7, 3)
        ctx.fill()
        if (direction === 'up') {
          ctx.fillRect(centerX - 8, baseY - 27, 16, 10)
        }
        break

      case 'spiky':
        ctx.beginPath()
        ctx.moveTo(centerX - 8, baseY - 24)
        ctx.lineTo(centerX - 6, baseY - 31)
        ctx.lineTo(centerX - 2, baseY - 27)
        ctx.lineTo(centerX + 1, baseY - 32)
        ctx.lineTo(centerX + 4, baseY - 27)
        ctx.lineTo(centerX + 7, baseY - 30)
        ctx.lineTo(centerX + 8, baseY - 24)
        ctx.closePath()
        ctx.fill()
        break

      case 'long':
        ctx.beginPath()
        ctx.roundRect(centerX - 8, baseY - 29, 16, 8, 3)
        ctx.fill()
        ctx.fillRect(centerX - 8, baseY - 24, 3, 14)
        ctx.fillRect(centerX + 5, baseY - 24, 3, 14)
        if (direction === 'up') {
          ctx.fillRect(centerX - 8, baseY - 27, 16, 15)
        }
        break

      case 'curly':
        ctx.beginPath()
        ctx.arc(centerX - 5, baseY - 28, 5, 0, Math.PI * 2)
        ctx.arc(centerX, baseY - 30, 6, 0, Math.PI * 2)
        ctx.arc(centerX + 5, baseY - 28, 5, 0, Math.PI * 2)
        ctx.fill()
        break

      case 'ponytail':
        ctx.beginPath()
        ctx.roundRect(centerX - 8, baseY - 29, 16, 7, 3)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(centerX + (direction === 'left' ? 7 : -7), baseY - 26, 5, 0, Math.PI * 2)
        ctx.fill()
        break

      case 'buzz':
      default:
        ctx.beginPath()
        ctx.roundRect(centerX - 7, baseY - 28, 14, 4, 2)
        ctx.fill()
        break
    }
  }

  /**
   * Draw Accessories
   */
  private static drawAccessory(
    ctx: CanvasRenderingContext2D,
    avatar: AvatarConfig,
    centerX: number,
    baseY: number,
    direction: Direction
  ) {
    if (!avatar.accessory || avatar.accessory === 'none') return

    const color = avatar.accessoryColor || '#20c997'

    switch (avatar.accessory) {
      case 'headphones':
        ctx.strokeStyle = color
        ctx.lineWidth = 2.5
        ctx.beginPath()
        ctx.arc(centerX, baseY - 25, 9, Math.PI, 0)
        ctx.stroke()
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.roundRect(centerX - 10, baseY - 24, 3, 7, 1.5)
        ctx.roundRect(centerX + 7, baseY - 24, 3, 7, 1.5)
        ctx.fill()
        if (direction !== 'up') {
          ctx.fillStyle = '#fab005'
          ctx.fillRect(centerX - 8, baseY - 19, 4, 2)
        }
        break

      case 'glasses':
        if (direction !== 'up') {
          ctx.strokeStyle = color
          ctx.lineWidth = 1.5
          ctx.strokeRect(centerX - 6, baseY - 22, 5, 4)
          ctx.strokeRect(centerX + 1, baseY - 22, 5, 4)
          ctx.beginPath()
          ctx.moveTo(centerX - 1, baseY - 20)
          ctx.lineTo(centerX + 1, baseY - 20)
          ctx.stroke()
        }
        break

      case 'sunglasses':
        if (direction !== 'up') {
          ctx.fillStyle = '#12151d'
          ctx.fillRect(centerX - 6, baseY - 22, 5, 4)
          ctx.fillRect(centerX + 1, baseY - 22, 5, 4)
        }
        break

      case 'cap':
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.roundRect(centerX - 8, baseY - 30, 16, 6, 3)
        ctx.fill()
        if (direction === 'down') {
          ctx.fillRect(centerX - 9, baseY - 24, 18, 2)
        } else if (direction === 'left') {
          ctx.fillRect(centerX - 12, baseY - 25, 8, 2)
        } else if (direction === 'right') {
          ctx.fillRect(centerX + 4, baseY - 25, 8, 2)
        }
        break

      case 'beanie':
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.roundRect(centerX - 8, baseY - 32, 16, 10, 4)
        ctx.fill()
        break
    }
  }

  /**
   * Draw Floating Name Tag & Status Pill
   */
  private static drawNameTag(
    ctx: CanvasRenderingContext2D,
    player: Player,
    isLocal: boolean,
    centerX: number,
    tagY: number
  ) {
    const label = (isLocal ? 'Você' : player.name) + (player.statusEmoji ? ` ${player.statusEmoji}` : '')
    ctx.font = '600 11px Inter, sans-serif'
    const textW = ctx.measureText(label).width
    const pillW = textW + 20
    const pillH = 18
    const pillX = centerX - pillW / 2

    // Background pill
    ctx.fillStyle = isLocal ? 'rgba(18, 21, 29, 0.95)' : 'rgba(27, 32, 44, 0.9)'
    ctx.beginPath()
    ctx.roundRect(pillX, tagY - pillH, pillW, pillH, 9)
    ctx.fill()

    // Border
    ctx.strokeStyle = isLocal ? '#4c6ef5' : '#2a3142'
    ctx.lineWidth = 1
    ctx.stroke()

    // Status presence dot
    let statusColor = '#20c997'
    if (player.status === 'busy') statusColor = '#fa5252'
    else if (player.status === 'focusing') statusColor = '#be4bdb'
    else if (player.status === 'away') statusColor = '#fab005'

    ctx.fillStyle = statusColor
    ctx.beginPath()
    ctx.arc(pillX + 8, tagY - pillH / 2, 3.5, 0, Math.PI * 2)
    ctx.fill()

    // Text name
    ctx.fillStyle = '#ffffff'
    ctx.fillText(label, pillX + 15, tagY - 5)
  }
}
