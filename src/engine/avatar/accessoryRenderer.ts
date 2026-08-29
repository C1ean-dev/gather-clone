import { Direction } from '../../types/game'

export class AccessoryRenderer {
  /**
   * Draw Glasses
   */
  static drawGlasses(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    baseY: number,
    dir: Direction,
    glassesType: string,
    glassesColor: string
  ) {
    if (dir === 'up') return

    if (glassesType === 'round') {
      // Round Glasses with White Glass Shine (Reference Akatrione)
      ctx.strokeStyle = glassesColor
      ctx.lineWidth = 1.5
      ctx.strokeRect(centerX - 6.5, baseY - 25, 5, 5)
      ctx.strokeRect(centerX + 1.5, baseY - 25, 5, 5)
      // Bridge
      ctx.beginPath()
      ctx.moveTo(centerX - 1.5, baseY - 22.5)
      ctx.lineTo(centerX + 1.5, baseY - 22.5)
      ctx.stroke()
      // Glass sheen
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'
      ctx.fillRect(centerX - 5.5, baseY - 24, 2, 2)
      ctx.fillRect(centerX + 2.5, baseY - 24, 2, 2)
    } else if (glassesType === 'sunglasses') {
      ctx.fillStyle = '#111111'
      ctx.beginPath()
      ctx.roundRect(centerX - 7, baseY - 25, 5.5, 4.5, 1)
      ctx.roundRect(centerX + 1.5, baseY - 25, 5.5, 4.5, 1)
      ctx.fill()
      ctx.fillRect(centerX - 1.5, baseY - 23, 3, 1.5)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'
      ctx.fillRect(centerX - 6, baseY - 24, 3, 1)
      ctx.fillRect(centerX + 2.5, baseY - 24, 3, 1)
    } else if (glassesType === 'square' || glassesType === 'wireframe') {
      ctx.strokeStyle = glassesColor
      ctx.lineWidth = 1.2
      ctx.strokeRect(centerX - 7, baseY - 24, 5.5, 3.5)
      ctx.strokeRect(centerX + 1.5, baseY - 24, 5.5, 3.5)
      ctx.beginPath()
      ctx.moveTo(centerX - 1.5, baseY - 22.5)
      ctx.lineTo(centerX + 1.5, baseY - 22.5)
      ctx.stroke()
    }
  }

  /**
   * Draw Hats and Hair Ribbons / Bows
   */
  static drawHat(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    baseY: number,
    dir: Direction,
    hatType: string,
    hatColor: string
  ) {
    if (hatType === 'ribbon_bow') {
      // Cute Ribbon / Bow on Top (Reference Aravon / Ann image 1)
      ctx.fillStyle = hatColor
      // Center knot
      ctx.fillRect(centerX - 1.5, baseY - 34, 3, 3)
      // Left bow wing
      ctx.beginPath()
      ctx.moveTo(centerX - 1.5, baseY - 33)
      ctx.lineTo(centerX - 6, baseY - 37)
      ctx.lineTo(centerX - 6, baseY - 30)
      ctx.closePath()
      ctx.fill()
      // Right bow wing
      ctx.beginPath()
      ctx.moveTo(centerX + 1.5, baseY - 33)
      ctx.lineTo(centerX + 6, baseY - 37)
      ctx.lineTo(centerX + 6, baseY - 30)
      ctx.closePath()
      ctx.fill()
    } else if (hatType === 'cap_forward' || hatType === 'cap_backward') {
      ctx.fillStyle = hatColor
      ctx.beginPath()
      ctx.roundRect(centerX - 9, baseY - 33, 18, 7, 3.5)
      ctx.fill()
      if (hatType === 'cap_forward') {
        if (dir === 'down') ctx.fillRect(centerX - 10, baseY - 27, 20, 2.5)
        else if (dir === 'left') ctx.fillRect(centerX - 13, baseY - 28, 8, 2.5)
        else if (dir === 'right') ctx.fillRect(centerX + 5, baseY - 28, 8, 2.5)
      } else {
        if (dir === 'up') ctx.fillRect(centerX - 10, baseY - 27, 20, 2.5)
      }
    } else if (hatType === 'beanie') {
      ctx.fillStyle = hatColor
      ctx.beginPath()
      ctx.roundRect(centerX - 9, baseY - 35, 18, 11, 4)
      ctx.fill()
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'
      ctx.fillRect(centerX - 9, baseY - 26, 18, 2)
    } else if (hatType === 'headband') {
      ctx.fillStyle = hatColor
      ctx.fillRect(centerX - 8.5, baseY - 29, 17, 3)
    }
  }

  /**
   * Draw Other Accessories (Headphones, Mask, Star Badge)
   */
  static drawOther(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    baseY: number,
    dir: Direction,
    otherType: string,
    otherColor: string
  ) {
    if (otherType === 'headphones') {
      ctx.strokeStyle = otherColor
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.arc(centerX, baseY - 27, 9.5, Math.PI, 0)
      ctx.stroke()

      ctx.fillStyle = otherColor
      ctx.beginPath()
      ctx.roundRect(centerX - 11, baseY - 26, 3.5, 8, 1.5)
      ctx.roundRect(centerX + 7.5, baseY - 26, 3.5, 8, 1.5)
      ctx.fill()
    } else if (otherType === 'mask') {
      if (dir !== 'up') {
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.roundRect(centerX - 5, baseY - 20, 10, 6, 2)
        ctx.fill()
      }
    }
  }
}
