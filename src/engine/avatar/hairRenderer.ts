import { Direction } from '../../types/game'

export class HairRenderer {
  /**
   * Draw Hairstyles (Messy, Anime, Long, Curls, Twin-Tails, etc.)
   */
  static drawHair(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    baseY: number,
    dir: Direction,
    style: string,
    color: string
  ) {
    if (style === 'bald') return

    ctx.fillStyle = color

    switch (style) {
      case 'messy': {
        // Gather Anime Messy Hair with Textured Bangs (Reference clean avatar)
        ctx.beginPath()
        ctx.roundRect(centerX - 9, baseY - 31, 18, 8, 3.5)
        ctx.fill()

        // Fringe Bangs
        ctx.fillRect(centerX - 8.5, baseY - 28, 4, 6)
        ctx.fillRect(centerX - 3.5, baseY - 27, 3, 5)
        ctx.fillRect(centerX + 1.5, baseY - 28, 4, 6)
        ctx.fillRect(centerX + 5.5, baseY - 27, 3, 5)

        // Spikes on top
        ctx.fillRect(centerX - 6, baseY - 33, 4, 3)
        ctx.fillRect(centerX + 1, baseY - 34, 4, 4)
        if (dir === 'up') {
          ctx.fillRect(centerX - 9, baseY - 30, 18, 14)
        }
        break
      }

      case 'long_bangs':
      case 'long': {
        // Long Hair with Bangs (Reference Aravon purple hair)
        ctx.beginPath()
        ctx.roundRect(centerX - 9, baseY - 31, 18, 9, 3.5)
        ctx.fill()

        // Front bangs across eyes
        ctx.fillRect(centerX - 6, baseY - 27, 2, 6)
        ctx.fillRect(centerX - 2, baseY - 26, 2, 5)
        ctx.fillRect(centerX + 2, baseY - 27, 2, 6)
        ctx.fillRect(centerX + 5, baseY - 26, 2, 5)

        // Side flowing locks
        ctx.fillRect(centerX - 10, baseY - 28, 4, 18)
        ctx.fillRect(centerX + 6, baseY - 28, 4, 18)

        if (dir === 'up') {
          ctx.fillRect(centerX - 9, baseY - 29, 18, 19)
        }
        break
      }

      case 'twin_tails': {
        // Twin Tails with Pigtails (Reference Ann orange hair)
        ctx.beginPath()
        ctx.roundRect(centerX - 9, baseY - 31, 18, 8, 3.5)
        ctx.fill()

        // Front Bangs
        ctx.fillRect(centerX - 7, baseY - 27, 3, 5)
        ctx.fillRect(centerX - 2, baseY - 26, 4, 5)
        ctx.fillRect(centerX + 4, baseY - 27, 3, 5)

        // Twin Side Pigtails
        ctx.fillRect(centerX - 11, baseY - 26, 4, 12)
        ctx.fillRect(centerX + 7, baseY - 26, 4, 12)
        break
      }

      case 'curly_afro':
      case 'curly': {
        // Textured Afro / Curls (Reference Akatrione avatar)
        ctx.beginPath()
        ctx.arc(centerX - 6, baseY - 29, 6.5, 0, Math.PI * 2)
        ctx.arc(centerX, baseY - 33, 7.5, 0, Math.PI * 2)
        ctx.arc(centerX + 6, baseY - 29, 6.5, 0, Math.PI * 2)
        ctx.fill()

        // Sideburns
        ctx.fillRect(centerX - 9, baseY - 27, 3, 6)
        ctx.fillRect(centerX + 6, baseY - 27, 3, 6)
        break
      }

      case 'anime':
      case 'spiky': {
        // Goku / Anime Spikes
        ctx.beginPath()
        ctx.roundRect(centerX - 9, baseY - 31, 18, 8, 3.5)
        ctx.fill()
        ctx.beginPath()
        ctx.moveTo(centerX - 8, baseY - 27)
        ctx.lineTo(centerX - 7, baseY - 35)
        ctx.lineTo(centerX - 3, baseY - 30)
        ctx.lineTo(centerX, baseY - 37)
        ctx.lineTo(centerX + 3, baseY - 30)
        ctx.lineTo(centerX + 7, baseY - 35)
        ctx.lineTo(centerX + 8, baseY - 27)
        ctx.closePath()
        ctx.fill()
        break
      }

      case 'short_wavy':
      case 'short':
      case 'buzz':
      default: {
        ctx.beginPath()
        ctx.roundRect(centerX - 8.5, baseY - 30, 17, 7, 3)
        ctx.fill()
        ctx.fillRect(centerX - 8.5, baseY - 26, 2.5, 4)
        ctx.fillRect(centerX + 6, baseY - 26, 2.5, 4)
        if (dir === 'up') {
          ctx.fillRect(centerX - 8.5, baseY - 28, 17, 10)
        }
        break
      }
    }
  }
}
