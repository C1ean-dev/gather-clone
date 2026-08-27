import { Player, AvatarConfig, Direction } from '../types/game'
import { TILE_SIZE } from './Constants'

export class AvatarRenderer {
  /**
   * Draw Authentic Habbo Hotel 2D Avatar
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
    const dir = player.direction || 'down'

    ctx.save()

    // 1. Habbo Oval Drop Shadow under avatar feet
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)'
    ctx.beginPath()
    ctx.ellipse(px + size / 2, py + size - 2, 11, 4.5, 0, 0, Math.PI * 2)
    ctx.fill()

    // 2. Walk Bobbing & Step Cycle (Classic Habbo 2-step rhythm)
    let bodyBob = 0
    let legOffset = 0
    let armOffset = 0

    if (player.isMoving) {
      const step = Math.floor((animationTick / 110) % 4)
      if (step === 1) {
        bodyBob = -1
        legOffset = 3
        armOffset = 3
      } else if (step === 3) {
        bodyBob = -1
        legOffset = -3
        armOffset = -3
      }
    }

    const centerX = px + size / 2
    const baseY = py + size - 7 + bodyBob

    // Colors
    const skinColor = avatar.skinColor || '#f5cba7'
    const skinShadow = '#d4a373'
    const skinHighlight = '#fdebd0'
    const shirtColor = avatar.shirtColor || '#339af0'
    const pantsColor = avatar.pantsColor || '#2c3e50'
    const hairColor = avatar.hairColor || '#212529'

    // ==========================================
    // 3. LEGS & HABBO CHUNKY SNEAKERS
    // ==========================================
    ctx.fillStyle = pantsColor

    if (dir === 'down' || dir === 'up') {
      // Left Leg
      ctx.fillRect(centerX - 6, baseY - 5, 5, 8 + legOffset)
      // Right Leg
      ctx.fillRect(centerX + 1, baseY - 5, 5, 8 - legOffset)

      // Inner leg crease line
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)'
      ctx.fillRect(centerX - 1, baseY - 5, 2, 6)

      // Left Habbo Sneaker (Shoe Body + White Rubber Toe Cap + Dark Sole)
      const lShoeY = baseY + 3 + legOffset
      ctx.fillStyle = '#e03131' // Red sneaker body
      ctx.fillRect(centerX - 7, lShoeY, 6, 3)
      ctx.fillStyle = '#ffffff' // White toe cap
      ctx.fillRect(centerX - 7, lShoeY + 1, 3, 2)
      ctx.fillStyle = '#111111' // Dark sole
      ctx.fillRect(centerX - 7, lShoeY + 3, 6, 1.5)

      // Right Habbo Sneaker
      const rShoeY = baseY + 3 - legOffset
      ctx.fillStyle = '#e03131'
      ctx.fillRect(centerX + 1, rShoeY, 6, 3)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(centerX + 4, rShoeY + 1, 3, 2)
      ctx.fillStyle = '#111111'
      ctx.fillRect(centerX + 1, rShoeY + 3, 6, 1.5)
    } else {
      // Side profile legs
      ctx.fillRect(centerX - 3, baseY - 5, 6, 8)

      // Side shoe
      const sShoeY = baseY + 3
      ctx.fillStyle = '#e03131'
      ctx.fillRect(centerX - 4, sShoeY, 8, 3)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(dir === 'left' ? centerX - 5 : centerX + 4, sShoeY + 1, 3, 2)
      ctx.fillStyle = '#111111'
      ctx.fillRect(centerX - 5, sShoeY + 3, 9, 1.5)
    }

    // ==========================================
    // 4. TORSO & CLOTHING (Habbo Shirt / Suit / Hoodie)
    // ==========================================
    ctx.fillStyle = shirtColor
    ctx.beginPath()
    ctx.roundRect(centerX - 7, baseY - 16, 14, 12, 2.5)
    ctx.fill()

    // Shirt shading / details
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)'
    ctx.fillRect(centerX - 7, baseY - 6, 14, 2) // bottom waist hem

    if (dir !== 'up') {
      if (avatar.shirtType === 'suit') {
        // White shirt V-neck
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(centerX - 2, baseY - 16, 4, 7)
        // Red Habbo necktie
        ctx.fillStyle = '#e03131'
        ctx.fillRect(centerX - 1, baseY - 15, 2, 8)
        // Jacket lapels
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'
        ctx.fillRect(centerX - 6, baseY - 16, 3, 9)
        ctx.fillRect(centerX + 3, baseY - 16, 3, 9)
      } else if (avatar.shirtType === 'hoodie') {
        // Kangaroo pouch pocket
        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)'
        ctx.fillRect(centerX - 4, baseY - 9, 8, 4)
        // Drawstrings
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(centerX - 2, baseY - 15, 1, 4)
        ctx.fillRect(centerX + 1, baseY - 15, 1, 4)
      } else {
        // Classic Habbo crewneck collar & stripe
        ctx.fillStyle = skinColor
        ctx.fillRect(centerX - 3, baseY - 16, 6, 2.5)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'
        ctx.fillRect(centerX - 6, baseY - 12, 12, 2) // chest graphic stripe
      }
    }

    // ==========================================
    // 5. ARMS & HANDS (with walk swing)
    // ==========================================
    if (dir === 'down' || dir === 'up') {
      // Left Arm
      const lArmY = baseY - 15 + armOffset
      ctx.fillStyle = shirtColor
      ctx.fillRect(centerX - 10, lArmY, 3, 7) // Sleeve
      ctx.fillStyle = skinColor
      ctx.fillRect(centerX - 10, lArmY + 7, 3, 3) // Hand

      // Right Arm
      const rArmY = baseY - 15 - armOffset
      ctx.fillStyle = shirtColor
      ctx.fillRect(centerX + 7, rArmY, 3, 7)
      ctx.fillStyle = skinColor
      ctx.fillRect(centerX + 7, rArmY + 7, 3, 3)
    } else if (dir === 'left') {
      const armY = baseY - 15 + armOffset
      ctx.fillStyle = shirtColor
      ctx.fillRect(centerX - 8, armY, 4, 7)
      ctx.fillStyle = skinColor
      ctx.fillRect(centerX - 9, armY + 7, 4, 3)
    } else if (dir === 'right') {
      const armY = baseY - 15 - armOffset
      ctx.fillStyle = shirtColor
      ctx.fillRect(centerX + 4, armY, 4, 7)
      ctx.fillStyle = skinColor
      ctx.fillRect(centerX + 5, armY + 7, 4, 3)
    }

    // ==========================================
    // 6. HABBO HEAD & EXPRESSIVE PIXEL FACE
    // ==========================================
    // Head shape
    ctx.fillStyle = skinColor
    ctx.beginPath()
    ctx.roundRect(centerX - 7.5, baseY - 28, 15, 13, 3)
    ctx.fill()

    // Chin shadow
    ctx.fillStyle = skinShadow
    ctx.fillRect(centerX - 6, baseY - 16, 12, 1.5)

    if (dir === 'down') {
      // Forehead highlight
      ctx.fillStyle = skinHighlight
      ctx.fillRect(centerX - 5, baseY - 27, 10, 1.5)

      // Classic Habbo Eyes (2 vertical black pixels + white shine reflection)
      // Left Eye
      ctx.fillStyle = '#1a1a1a'
      ctx.fillRect(centerX - 5, baseY - 23, 2.5, 3.5)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(centerX - 5, baseY - 23, 1, 1.5) // Eye shine

      // Right Eye
      ctx.fillStyle = '#1a1a1a'
      ctx.fillRect(centerX + 2.5, baseY - 23, 2.5, 3.5)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(centerX + 2.5, baseY - 23, 1, 1.5)

      // Subtle cheek blush
      ctx.fillStyle = 'rgba(255, 140, 130, 0.45)'
      ctx.fillRect(centerX - 6, baseY - 20, 2, 1.5)
      ctx.fillRect(centerX + 4, baseY - 20, 2, 1.5)

      // Habbo Smug Smile / Mouth
      ctx.fillStyle = '#a0522d'
      ctx.fillRect(centerX - 1.5, baseY - 18, 3, 1.2)
    } else if (dir === 'left') {
      // Side Eye
      ctx.fillStyle = '#1a1a1a'
      ctx.fillRect(centerX - 6, baseY - 23, 2.5, 3.5)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(centerX - 6, baseY - 23, 1, 1.5)

      // Side Smile
      ctx.fillStyle = '#a0522d'
      ctx.fillRect(centerX - 6, baseY - 18, 2, 1.2)
    } else if (dir === 'right') {
      // Side Eye
      ctx.fillStyle = '#1a1a1a'
      ctx.fillRect(centerX + 3.5, baseY - 23, 2.5, 3.5)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(centerX + 3.5, baseY - 23, 1, 1.5)

      // Side Smile
      ctx.fillStyle = '#a0522d'
      ctx.fillRect(centerX + 4, baseY - 18, 2, 1.2)
    }

    // ==========================================
    // 7. HABBO HAIRSTYLES (Spiky, Afro, Cap, Long, etc.)
    // ==========================================
    this.drawHabboHair(ctx, avatar, centerX, baseY, dir, hairColor)

    // ==========================================
    // 8. ACCESSORIES (Headphones, Glasses, Beanie, etc.)
    // ==========================================
    this.drawHabboAccessory(ctx, avatar, centerX, baseY, dir)

    // ==========================================
    // 9. HABBO NAME TAG / PILL BADGE
    // ==========================================
    this.drawHabboNameTag(ctx, player, isLocal, centerX, py - 6)

    ctx.restore()
  }

  /**
   * Draw Authentic Habbo Hairstyles
   */
  private static drawHabboHair(
    ctx: CanvasRenderingContext2D,
    avatar: AvatarConfig,
    centerX: number,
    baseY: number,
    dir: Direction,
    hairColor: string
  ) {
    if (avatar.hairStyle === 'bald') return

    ctx.fillStyle = hairColor

    switch (avatar.hairStyle) {
      case 'spiky': {
        // Classic Habbo Anime/Goku Spiky Hair
        ctx.beginPath()
        ctx.roundRect(centerX - 8.5, baseY - 30, 17, 7, 3)
        ctx.fill()

        // Spikes on top
        ctx.beginPath()
        ctx.moveTo(centerX - 8, baseY - 26)
        ctx.lineTo(centerX - 7, baseY - 33)
        ctx.lineTo(centerX - 3, baseY - 29)
        ctx.lineTo(centerX, baseY - 35)
        ctx.lineTo(centerX + 3, baseY - 29)
        ctx.lineTo(centerX + 7, baseY - 33)
        ctx.lineTo(centerX + 8, baseY - 26)
        ctx.closePath()
        ctx.fill()

        // Highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)'
        ctx.fillRect(centerX - 3, baseY - 33, 6, 2)
        break
      }

      case 'long': {
        // Long Hair / Emo Bangs
        ctx.beginPath()
        ctx.roundRect(centerX - 8.5, baseY - 30, 17, 8, 3)
        ctx.fill()
        // Side locks
        ctx.fillRect(centerX - 9, baseY - 26, 3.5, 14)
        ctx.fillRect(centerX + 5.5, baseY - 26, 3.5, 14)
        if (dir === 'up') {
          ctx.fillRect(centerX - 8.5, baseY - 28, 17, 16)
        }
        break
      }

      case 'curly': {
        // Textured Afro / Curls
        ctx.beginPath()
        ctx.arc(centerX - 5, baseY - 29, 6, 0, Math.PI * 2)
        ctx.arc(centerX, baseY - 32, 6.5, 0, Math.PI * 2)
        ctx.arc(centerX + 5, baseY - 29, 6, 0, Math.PI * 2)
        ctx.fill()
        break
      }

      case 'ponytail': {
        ctx.beginPath()
        ctx.roundRect(centerX - 8.5, baseY - 30, 17, 7, 3)
        ctx.fill()
        // Ponytail puff
        ctx.beginPath()
        const ptx = dir === 'left' ? centerX + 7 : centerX - 7
        ctx.arc(ptx, baseY - 27, 5.5, 0, Math.PI * 2)
        ctx.fill()
        break
      }

      case 'short':
      case 'buzz':
      default: {
        // Classic Habbo Short Haircut with Sideburns
        ctx.beginPath()
        ctx.roundRect(centerX - 8.5, baseY - 30, 17, 7, 3)
        ctx.fill()
        // Sideburns
        ctx.fillRect(centerX - 8.5, baseY - 26, 2.5, 4)
        ctx.fillRect(centerX + 6, baseY - 26, 2.5, 4)
        if (dir === 'up') {
          ctx.fillRect(centerX - 8.5, baseY - 28, 17, 10)
        }
        break
      }
    }
  }

  /**
   * Draw Accessories
   */
  private static drawHabboAccessory(
    ctx: CanvasRenderingContext2D,
    avatar: AvatarConfig,
    centerX: number,
    baseY: number,
    dir: Direction
  ) {
    if (!avatar.accessory || avatar.accessory === 'none') return

    const color = avatar.accessoryColor || '#20c997'

    switch (avatar.accessory) {
      case 'headphones': {
        // Habbo DJ Headphones
        ctx.strokeStyle = color
        ctx.lineWidth = 2.5
        ctx.beginPath()
        ctx.arc(centerX, baseY - 27, 9, Math.PI, 0)
        ctx.stroke()

        // Ear cups with gold trim
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.roundRect(centerX - 10.5, baseY - 26, 3.5, 8, 1.5)
        ctx.roundRect(centerX + 7, baseY - 26, 3.5, 8, 1.5)
        ctx.fill()

        ctx.fillStyle = '#ffd43b'
        ctx.fillRect(centerX - 9.5, baseY - 24, 2, 4)
        ctx.fillRect(centerX + 7.5, baseY - 24, 2, 4)
        break
      }

      case 'glasses': {
        if (dir !== 'up') {
          ctx.strokeStyle = color
          ctx.lineWidth = 1.5
          ctx.strokeRect(centerX - 6.5, baseY - 24, 5, 4.5)
          ctx.strokeRect(centerX + 1.5, baseY - 24, 5, 4.5)
          ctx.beginPath()
          ctx.moveTo(centerX - 1.5, baseY - 22)
          ctx.lineTo(centerX + 1.5, baseY - 22)
          ctx.stroke()
        }
        break
      }

      case 'sunglasses': {
        if (dir !== 'up') {
          // Cool Habbo shades
          ctx.fillStyle = '#111111'
          ctx.beginPath()
          ctx.roundRect(centerX - 7, baseY - 24, 5.5, 4.5, 1)
          ctx.roundRect(centerX + 1.5, baseY - 24, 5.5, 4.5, 1)
          ctx.fill()
          // Bridge
          ctx.fillRect(centerX - 1.5, baseY - 22, 3, 1.5)
          // Lens reflection
          ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'
          ctx.fillRect(centerX - 6, baseY - 23, 3, 1)
          ctx.fillRect(centerX + 2.5, baseY - 23, 3, 1)
        }
        break
      }

      case 'cap': {
        // Habbo Skater Cap (Backwards / Front)
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.roundRect(centerX - 9, baseY - 32, 18, 7, 3.5)
        ctx.fill()
        // Visor
        if (dir === 'down') {
          ctx.fillRect(centerX - 10, baseY - 26, 20, 2.5)
        } else if (dir === 'left') {
          ctx.fillRect(centerX - 13, baseY - 27, 8, 2.5)
        } else if (dir === 'right') {
          ctx.fillRect(centerX + 5, baseY - 27, 8, 2.5)
        }
        break
      }

      case 'beanie': {
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.roundRect(centerX - 9, baseY - 34, 18, 11, 4)
        ctx.fill()
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'
        ctx.fillRect(centerX - 9, baseY - 25, 18, 2)
        break
      }
    }
  }

  /**
   * Draw Habbo Style Name Tag / Presence Pill
   */
  private static drawHabboNameTag(
    ctx: CanvasRenderingContext2D,
    player: Player,
    isLocal: boolean,
    centerX: number,
    tagY: number
  ) {
    const label = (isLocal ? 'Você' : player.name) + (player.statusEmoji ? ` ${player.statusEmoji}` : '')
    ctx.font = 'bold 10.5px Inter, sans-serif'
    const textW = ctx.measureText(label).width
    const pillW = textW + 22
    const pillH = 19
    const pillX = centerX - pillW / 2

    // Background pill (Habbo dark glass badge)
    ctx.fillStyle = isLocal ? 'rgba(15, 23, 42, 0.95)' : 'rgba(27, 32, 44, 0.92)'
    ctx.beginPath()
    ctx.roundRect(pillX, tagY - pillH, pillW, pillH, 9.5)
    ctx.fill()

    // Border
    ctx.strokeStyle = isLocal ? '#38bdf8' : '#334155'
    ctx.lineWidth = 1.2
    ctx.stroke()

    // Habbo Online Dot
    let statusColor = '#22c55e'
    if (player.status === 'busy') statusColor = '#ef4444'
    else if (player.status === 'focusing') statusColor = '#a855f7'
    else if (player.status === 'away') statusColor = '#f59e0b'

    ctx.fillStyle = statusColor
    ctx.beginPath()
    ctx.arc(pillX + 8.5, tagY - pillH / 2, 3.5, 0, Math.PI * 2)
    ctx.fill()

    // Text name
    ctx.fillStyle = '#ffffff'
    ctx.fillText(label, pillX + 16, tagY - 5.5)
  }
}
