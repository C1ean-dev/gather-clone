import { Direction } from '../../types/game'

export class ClothingRenderer {
  /**
   * Draw Legs, Bottoms & Shoes
   */
  static drawLegsAndShoes(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    baseY: number,
    dir: Direction,
    bottomType: string,
    bottomColor: string,
    shoesType: string,
    shoesColor: string,
    legOffset: number
  ) {
    if (bottomType === 'kimono_skirt') {
      // Long Hakama / Kimono Skirt with Floral Crosses (Like Gather reference image)
      ctx.fillStyle = bottomColor
      ctx.beginPath()
      ctx.roundRect(centerX - 8, baseY - 6, 16, 9, 2)
      ctx.fill()

      // Floral Cross Pattern on Kimono bottom
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)'
      ctx.fillRect(centerX - 5, baseY - 2, 3, 1)
      ctx.fillRect(centerX - 4, baseY - 3, 1, 3)

      ctx.fillRect(centerX + 2, baseY - 2, 3, 1)
      ctx.fillRect(centerX + 3, baseY - 3, 1, 3)

      ctx.fillRect(centerX - 1, baseY + 1, 3, 1)
      ctx.fillRect(centerX, baseY, 1, 3)

      // Geta / Sandals poking from under the skirt
      ctx.fillStyle = shoesColor || '#51cf66'
      ctx.fillRect(centerX - 5, baseY + 3, 3.5, 2.5)
      ctx.fillRect(centerX + 1.5, baseY + 3, 3.5, 2.5)
      return
    }

    ctx.fillStyle = bottomColor

    if (dir === 'down' || dir === 'up') {
      // Left Leg
      ctx.fillRect(centerX - 6, baseY - 5, 5, 8 + legOffset)
      // Right Leg
      ctx.fillRect(centerX + 1, baseY - 5, 5, 8 - legOffset)

      // Inner leg crease line
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)'
      ctx.fillRect(centerX - 1, baseY - 5, 2, 6)

      // Shoes
      this.drawSingleShoe(ctx, centerX - 7, baseY + 3 + legOffset, 6, shoesType, shoesColor, dir, 'left')
      this.drawSingleShoe(ctx, centerX + 1, baseY + 3 - legOffset, 6, shoesType, shoesColor, dir, 'right')
    } else {
      // Side Profile Legs
      ctx.fillRect(centerX - 3, baseY - 5, 6, 8)
      this.drawSingleShoe(ctx, centerX - 4, baseY + 3, 8, shoesType, shoesColor, dir, 'side')
    }
  }

  static drawSingleShoe(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    shoesType: string,
    color: string,
    dir: Direction,
    side: 'left' | 'right' | 'side'
  ) {
    if (shoesType === 'sandals') {
      // Exposed foot with colored straps
      ctx.fillStyle = '#f5cba7'
      ctx.fillRect(x, y, w, 2)
      ctx.fillStyle = color
      ctx.fillRect(x + 1, y, w - 2, 1)
      ctx.fillStyle = '#111111'
      ctx.fillRect(x, y + 2, w, 1)
    } else if (shoesType === 'boots') {
      // Tall boots
      ctx.fillStyle = color
      ctx.fillRect(x, y - 2, w, 5)
      ctx.fillStyle = '#111111'
      ctx.fillRect(x, y + 3, w, 1.5)
    } else {
      // Chunky Sneakers with White Toe Cap and Dark Sole
      ctx.fillStyle = color
      ctx.fillRect(x, y, w, 3)
      ctx.fillStyle = '#ffffff'
      if (side === 'left') ctx.fillRect(x, y + 1, 2.5, 2)
      else if (side === 'right') ctx.fillRect(x + w - 2.5, y + 1, 2.5, 2)
      else ctx.fillRect(dir === 'left' ? x : x + w - 3, y + 1, 3, 2)

      ctx.fillStyle = '#111111'
      ctx.fillRect(x, y + 3, w, 1.5)
    }
  }

  /**
   * Draw Torso and Top (Kimono, T-shirt, Sweater, etc.)
   */
  static drawTorsoAndTop(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    baseY: number,
    dir: Direction,
    topType: string,
    topColor: string,
    skinTone: string
  ) {
    ctx.fillStyle = topColor
    ctx.beginPath()
    ctx.roundRect(centerX - 7.5, baseY - 16, 15, 12, 2.5)
    ctx.fill()

    if (dir !== 'up') {
      if (topType === 'kimono' || topType === 'yukata') {
        // Overlapping Kimono White Collar V-Neck
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.moveTo(centerX - 4, baseY - 16)
        ctx.lineTo(centerX, baseY - 10)
        ctx.lineTo(centerX + 4, baseY - 16)
        ctx.lineTo(centerX + 2, baseY - 16)
        ctx.lineTo(centerX, baseY - 11)
        ctx.lineTo(centerX - 2, baseY - 16)
        ctx.closePath()
        ctx.fill()

        // Inner V-neck skin
        ctx.fillStyle = skinTone
        ctx.fillRect(centerX - 1.5, baseY - 16, 3, 3)

        // Obi Sash (Thick patterned belt)
        ctx.fillStyle = '#ced4da' // Light gray obi
        ctx.fillRect(centerX - 7.5, baseY - 10, 15, 4.5)
        ctx.fillStyle = '#868e96'
        ctx.fillRect(centerX - 2.5, baseY - 9.5, 5, 3.5) // Knot
      } else if (topType === 'dress_shirt' || topType === 'suit') {
        // White shirt V-neck & Tie
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(centerX - 2.5, baseY - 16, 5, 7)
        ctx.fillStyle = '#e03131'
        ctx.fillRect(centerX - 1, baseY - 15, 2, 8)
      } else if (topType === 'sweater') {
        // Knit sweater texture & ribbed neck
        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)'
        ctx.fillRect(centerX - 4, baseY - 16, 8, 2)
        ctx.fillRect(centerX - 6, baseY - 12, 12, 1)
        ctx.fillRect(centerX - 6, baseY - 9, 12, 1)
      } else {
        // Crewneck T-Shirt Collar
        ctx.fillStyle = skinTone
        ctx.fillRect(centerX - 3, baseY - 16, 6, 2.5)
      }
    }
  }

  /**
   * Draw Open Jacket / Hoodie / Blazer
   */
  static drawJacket(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    baseY: number,
    dir: Direction,
    jacketType: string,
    jacketColor: string
  ) {
    ctx.fillStyle = jacketColor
    if (dir !== 'up') {
      // Left Lapel / Flap
      ctx.fillRect(centerX - 8.5, baseY - 16.5, 4, 13)
      // Right Lapel / Flap
      ctx.fillRect(centerX + 4.5, baseY - 16.5, 4, 13)

      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'
      ctx.fillRect(centerX - 8.5, baseY - 16.5, 1, 13)
      ctx.fillRect(centerX + 7.5, baseY - 16.5, 1, 13)
    } else {
      ctx.fillRect(centerX - 8.5, baseY - 16.5, 17, 13)
    }
  }

  /**
   * Draw Arms & Hands
   */
  static drawArms(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    baseY: number,
    dir: Direction,
    topType: string,
    topColor: string,
    jacketType: string,
    jacketColor: string,
    skinTone: string,
    armOffset: number
  ) {
    const sleeveColor = jacketType !== 'none' ? jacketColor : topColor

    if (dir === 'down' || dir === 'up') {
      // Left Arm
      const lArmY = baseY - 15 + armOffset
      ctx.fillStyle = sleeveColor
      ctx.fillRect(centerX - 10.5, lArmY, 3.5, 7) // Sleeve
      ctx.fillStyle = skinTone
      ctx.fillRect(centerX - 10.5, lArmY + 7, 3.5, 3.5) // Hand

      // Right Arm
      const rArmY = baseY - 15 - armOffset
      ctx.fillStyle = sleeveColor
      ctx.fillRect(centerX + 7, rArmY, 3.5, 7)
      ctx.fillStyle = skinTone
      ctx.fillRect(centerX + 7, rArmY + 7, 3.5, 3.5)
    } else if (dir === 'left') {
      const armY = baseY - 15 + armOffset
      ctx.fillStyle = sleeveColor
      ctx.fillRect(centerX - 8.5, armY, 4.5, 7)
      ctx.fillStyle = skinTone
      ctx.fillRect(centerX - 9.5, armY + 7, 4.5, 3.5)
    } else if (dir === 'right') {
      const armY = baseY - 15 - armOffset
      ctx.fillStyle = sleeveColor
      ctx.fillRect(centerX + 4, armY, 4.5, 7)
      ctx.fillStyle = skinTone
      ctx.fillRect(centerX + 5, armY + 7, 4.5, 3.5)
    }
  }
}
