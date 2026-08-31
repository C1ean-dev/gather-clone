import { Direction } from '../../types/game'

export class FaceRenderer {
  /**
   * Draw Head, Eyes, Expressions & Skin Details (Vitiligo / Freckles / Blush)
   */
  static drawHeadAndFace(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    baseY: number,
    dir: Direction,
    skinTone: string,
    skinDetail: string,
    eyeType: string = 'normal',
    eyeColor: string = '#111111'
  ) {
    // 1. Base Head Shape
    ctx.fillStyle = skinTone
    ctx.beginPath()
    ctx.roundRect(centerX - 8, baseY - 29, 16, 14, 3.5)
    ctx.fill()

    // Chin shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.12)'
    ctx.fillRect(centerX - 6.5, baseY - 16, 13, 1.5)

    if (dir === 'down') {
      // 2. Skin Details - ONLY draw when explicitly chosen (Smooth = 100% clean and neutral)
      if (skinDetail === 'vitiligo1' || skinDetail === 'vitiligo2') {
        // Distinctive Vitiligo Patches across face
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)'
        // Under left eye & cheek
        ctx.fillRect(centerX - 6.5, baseY - 23, 4, 3)
        ctx.fillRect(centerX - 5.5, baseY - 20, 3, 2.5)
        // Across forehead / nose
        ctx.fillRect(centerX - 1, baseY - 26, 4, 3)
        if (skinDetail === 'vitiligo2') {
          ctx.fillRect(centerX + 3, baseY - 22, 3, 4)
        }
      } else if (skinDetail === 'freckles') {
        ctx.fillStyle = 'rgba(120, 50, 20, 0.5)'
        ctx.fillRect(centerX - 5, baseY - 21, 1, 1)
        ctx.fillRect(centerX - 3, baseY - 20, 1, 1)
        ctx.fillRect(centerX - 1, baseY - 21, 1, 1)
        ctx.fillRect(centerX + 1, baseY - 20, 1, 1)
        ctx.fillRect(centerX + 3, baseY - 21, 1, 1)
      } else if (skinDetail === 'blush') {
        // Soft Pink Cheek Blush (ONLY when blush is selected)
        ctx.fillStyle = 'rgba(255, 120, 120, 0.4)'
        ctx.fillRect(centerX - 6.5, baseY - 20, 2.5, 1.5)
        ctx.fillRect(centerX + 4, baseY - 20, 2.5, 1.5)
      }

      // 3. Eyes rendering
      this.drawEyes(ctx, centerX, baseY, dir, eyeType, eyeColor)

      // Cute Smile / Mouth
      ctx.fillStyle = '#8d4925'
      ctx.fillRect(centerX - 1.5, baseY - 18, 3, 1.2)
    } else if (dir === 'left' || dir === 'right') {
      this.drawEyes(ctx, centerX, baseY, dir, eyeType, eyeColor)

      ctx.fillStyle = '#8d4925'
      if (dir === 'left') {
        ctx.fillRect(centerX - 6.5, baseY - 18, 2, 1.2)
      } else {
        ctx.fillRect(centerX + 4.5, baseY - 18, 2, 1.2)
      }
    }
  }

  /**
   * Draw Eyes in different expressive styles
   */
  static drawEyes(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    baseY: number,
    dir: Direction,
    eyeType: string = 'normal',
    eyeColor: string = '#111111'
  ) {
    if (dir === 'up') return

    const color = eyeColor || '#111111'

    if (dir === 'down') {
      if (eyeType === 'happy') {
        // Cheerful curved eyes (^.^)
        ctx.strokeStyle = color
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.arc(centerX - 4, baseY - 22, 2.5, Math.PI, 0)
        ctx.arc(centerX + 4, baseY - 22, 2.5, Math.PI, 0)
        ctx.stroke()
      } else if (eyeType === 'closed') {
        // Calm closed eyes (-.-)
        ctx.fillStyle = color
        ctx.fillRect(centerX - 5.5, baseY - 22, 3.5, 1.5)
        ctx.fillRect(centerX + 2, baseY - 22, 3.5, 1.5)
      } else if (eyeType === 'focused') {
        // Focused / Cool narrow eyes
        ctx.fillStyle = color
        ctx.fillRect(centerX - 5.5, baseY - 23, 3, 2.5)
        ctx.fillRect(centerX + 2.5, baseY - 23, 3, 2.5)
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(centerX - 5.5, baseY - 23, 1, 1)
        ctx.fillRect(centerX + 2.5, baseY - 23, 1, 1)
      } else if (eyeType === 'wink') {
        // Left eye open, right eye wink
        ctx.fillStyle = color
        ctx.fillRect(centerX - 5.5, baseY - 24, 3, 4)
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(centerX - 5.5, baseY - 24, 1.2, 1.5)

        // Right eye winking line
        ctx.strokeStyle = color
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.arc(centerX + 4, baseY - 22, 2.5, Math.PI, 0)
        ctx.stroke()
      } else if (eyeType === 'anime') {
        // Extra sparkling anime eyes
        ctx.fillStyle = color
        ctx.fillRect(centerX - 6, baseY - 25, 3.5, 4.5)
        ctx.fillRect(centerX + 2.5, baseY - 25, 3.5, 4.5)
        ctx.fillStyle = '#ffffff'
        // Double specular glint
        ctx.fillRect(centerX - 6, baseY - 25, 1.5, 1.5)
        ctx.fillRect(centerX - 4.5, baseY - 22.5, 1, 1)
        ctx.fillRect(centerX + 2.5, baseY - 25, 1.5, 1.5)
        ctx.fillRect(centerX + 4, baseY - 22.5, 1, 1)
      } else {
        // Classic Gather Normal Clean Eyes
        ctx.fillStyle = color
        ctx.fillRect(centerX - 5.5, baseY - 24, 3, 4)
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(centerX - 5.5, baseY - 24, 1.2, 1.5) // Eye reflection

        ctx.fillStyle = color
        ctx.fillRect(centerX + 2.5, baseY - 24, 3, 4)
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(centerX + 2.5, baseY - 24, 1.2, 1.5)
      }
    } else if (dir === 'left') {
      const eyeX = centerX - 6.5
      if (eyeType === 'happy' || eyeType === 'wink') {
        ctx.strokeStyle = color
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.arc(eyeX + 1.5, baseY - 22, 2, Math.PI, 0)
        ctx.stroke()
      } else if (eyeType === 'closed') {
        ctx.fillStyle = color
        ctx.fillRect(eyeX, baseY - 22, 3, 1.5)
      } else if (eyeType === 'focused') {
        ctx.fillStyle = color
        ctx.fillRect(eyeX, baseY - 23, 3, 2.5)
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(eyeX, baseY - 23, 1, 1)
      } else {
        ctx.fillStyle = color
        ctx.fillRect(eyeX, baseY - 24, 3, 4)
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(eyeX, baseY - 24, 1.2, 1.5)
      }
    } else if (dir === 'right') {
      const eyeX = centerX + 3.5
      if (eyeType === 'happy') {
        ctx.strokeStyle = color
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.arc(eyeX + 1.5, baseY - 22, 2, Math.PI, 0)
        ctx.stroke()
      } else if (eyeType === 'closed') {
        ctx.fillStyle = color
        ctx.fillRect(eyeX, baseY - 22, 3, 1.5)
      } else if (eyeType === 'focused') {
        ctx.fillStyle = color
        ctx.fillRect(eyeX, baseY - 23, 3, 2.5)
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(eyeX + 2, baseY - 23, 1, 1)
      } else {
        ctx.fillStyle = color
        ctx.fillRect(eyeX, baseY - 24, 3, 4)
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(eyeX + 1.8, baseY - 24, 1.2, 1.5)
      }
    }
  }

  /**
   * Draw Facial Hair (Beard, Mustache, Goatee, Stubble)
   */
  static drawFacialHair(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    baseY: number,
    dir: Direction,
    type: string,
    color: string
  ) {
    if (dir === 'up') return

    ctx.fillStyle = color
    if (type === 'full_beard') {
      // Full jaw beard
      ctx.fillRect(centerX - 7.5, baseY - 20, 15, 6)
      ctx.fillRect(centerX - 5.5, baseY - 14, 11, 2)
      // Mustache part
      ctx.fillRect(centerX - 3.5, baseY - 20, 7, 2)
    } else if (type === 'mustache') {
      ctx.fillRect(centerX - 4.5, baseY - 20, 9, 2)
    } else if (type === 'goatee') {
      ctx.fillRect(centerX - 2.5, baseY - 18, 5, 4)
      ctx.fillRect(centerX - 3.5, baseY - 20, 7, 1.5)
    } else if (type === 'stubble') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)'
      ctx.fillRect(centerX - 6.5, baseY - 20, 13, 5)
    }
  }
}
