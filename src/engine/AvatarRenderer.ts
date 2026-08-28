import { Player, AvatarConfig, Direction } from '../types/game'
import { TILE_SIZE } from './Constants'

export class AvatarRenderer {
  /**
   * Draw Authentic Gather.town Pixel Art 2D Avatar
   */
  static drawPlayer(
    ctx: CanvasRenderingContext2D,
    player: Player,
    isLocal: boolean,
    animationTick: number,
    size: number = TILE_SIZE,
    showNameTag: boolean = true
  ) {
    const px = Math.floor(player.x * size)
    const py = Math.floor(player.y * size)
    const avatar = player.avatar || {}
    const dir = player.direction || 'down'

    ctx.save()

    // 1. Gather Oval Drop Shadow under avatar feet
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)'
    ctx.beginPath()
    ctx.ellipse(px + size / 2, py + size - 2, 11, 4.5, 0, 0, Math.PI * 2)
    ctx.fill()

    // 2. Walk Bobbing & Step Cycle (2-step smooth rhythm)
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

    // Normalize Colors and Types with Backward Compatibility
    const skinTone = avatar.skinTone || avatar.skinColor || '#ffd1a4'
    const skinDetail = avatar.skinDetail || 'smooth'
    const hairStyle = avatar.hairStyle || 'messy'
    const hairColor = avatar.hairColor || '#212529'
    const facialHair = avatar.facialHair || 'none'
    const facialHairColor = avatar.facialHairColor || hairColor
    const topType = avatar.topType || avatar.shirtType || 'kimono'
    const topColor = avatar.topColor || avatar.shirtColor || '#212529'
    const jacketType = avatar.jacketType || 'none'
    const jacketColor = avatar.jacketColor || '#4c6ef5'
    const bottomType = avatar.bottomType || (topType === 'kimono' || topType === 'yukata' ? 'kimono_skirt' : 'jeans')
    const bottomColor = avatar.bottomColor || avatar.pantsColor || '#212529'
    const shoesType = avatar.shoesType || 'sneakers'
    const shoesColor = avatar.shoesColor || '#e03131'
    const hatType = avatar.hatType || 'none'
    const hatColor = avatar.hatColor || '#fa5252'
    const glassesType = avatar.glassesType || (avatar.accessory === 'glasses' ? 'round' : avatar.accessory === 'sunglasses' ? 'sunglasses' : 'none')
    const glassesColor = avatar.glassesColor || avatar.accessoryColor || '#343a40'
    const otherType = avatar.otherType || (avatar.accessory === 'headphones' ? 'headphones' : 'none')
    const otherColor = avatar.otherColor || avatar.accessoryColor || '#20c997'

    // ==========================================
    // 3. LEGS, BOTTOMS & SHOES
    // ==========================================
    this.drawLegsAndShoes(ctx, centerX, baseY, dir, bottomType, bottomColor, shoesType, shoesColor, legOffset)

    // ==========================================
    // 4. TORSO & TOPS (Kimono, Yukata, T-Shirt, Sweater, etc.)
    // ==========================================
    this.drawTorsoAndTop(ctx, centerX, baseY, dir, topType, topColor, skinTone)

    // ==========================================
    // 5. JACKET (Open Hoodie, Cardigan, Blazer, Denim)
    // ==========================================
    if (jacketType !== 'none') {
      this.drawJacket(ctx, centerX, baseY, dir, jacketType, jacketColor)
    }

    // ==========================================
    // 6. ARMS & SLEEVES (With walk cycle)
    // ==========================================
    this.drawArms(ctx, centerX, baseY, dir, topType, topColor, jacketType, jacketColor, skinTone, armOffset)

    // ==========================================
    // 7. HEAD, SKIN DETAILS & FACE (Vitiligo, Freckles, Eyes)
    // ==========================================
    this.drawHeadAndFace(ctx, centerX, baseY, dir, skinTone, skinDetail)

    // ==========================================
    // 8. FACIAL HAIR (Beard, Mustache, Goatee, Stubble)
    // ==========================================
    if (facialHair !== 'none') {
      this.drawFacialHair(ctx, centerX, baseY, dir, facialHair, facialHairColor)
    }

    // ==========================================
    // 9. HAIRSTYLES (Messy, Anime, Long, Curls, Twin-Tails, etc.)
    // ==========================================
    this.drawHair(ctx, centerX, baseY, dir, hairStyle, hairColor)

    // ==========================================
    // 10. GLASSES (Round, Square, Sunglasses, Wireframe)
    // ==========================================
    if (glassesType !== 'none') {
      this.drawGlasses(ctx, centerX, baseY, dir, glassesType, glassesColor)
    }

    // ==========================================
    // 11. HATS & HAIR ACCESSORIES (Ribbon Bow, Cap, Beanie, Headband)
    // ==========================================
    if (hatType !== 'none') {
      this.drawHat(ctx, centerX, baseY, dir, hatType, hatColor)
    }

    // ==========================================
    // 12. OTHER (Headphones, Mask, Star Badge)
    // ==========================================
    if (otherType !== 'none') {
      this.drawOther(ctx, centerX, baseY, dir, otherType, otherColor)
    }

    // ==========================================
    // 13. NAME TAG BADGE (Floating above head)
    // ==========================================
    if (showNameTag) {
      this.drawNameTag(ctx, player, isLocal, centerX, py - 13)
    }

    ctx.restore()
  }

  /**
   * Draw Legs, Bottoms & Shoes
   */
  private static drawLegsAndShoes(
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

  private static drawSingleShoe(
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
  private static drawTorsoAndTop(
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
  private static drawJacket(
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
  private static drawArms(
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

  /**
   * Draw Head, Eyes, Expressions & Skin Details (Vitiligo / Freckles / Blush)
   */
  private static drawHeadAndFace(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    baseY: number,
    dir: Direction,
    skinTone: string,
    skinDetail: string
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
      // 2. Skin Details (Vitiligo / Freckles / Blush)
      if (skinDetail === 'vitiligo1' || skinDetail === 'vitiligo2') {
        // Distinctive Vitiligo Patches across face (Gather reference)
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
      }

      // Soft Pink Cheek Blush
      ctx.fillStyle = 'rgba(255, 120, 120, 0.4)'
      ctx.fillRect(centerX - 6.5, baseY - 20, 2.5, 1.5)
      ctx.fillRect(centerX + 4, baseY - 20, 2.5, 1.5)

      // 3. Expressive Gather Eyes (Large anime pupils + specular gleam)
      // Left Eye
      ctx.fillStyle = '#111111'
      ctx.fillRect(centerX - 5.5, baseY - 24, 3, 4)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(centerX - 5.5, baseY - 24, 1.2, 1.5) // Eye reflection

      // Right Eye
      ctx.fillStyle = '#111111'
      ctx.fillRect(centerX + 2.5, baseY - 24, 3, 4)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(centerX + 2.5, baseY - 24, 1.2, 1.5)

      // Cute Smile / Mouth
      ctx.fillStyle = '#8d4925'
      ctx.fillRect(centerX - 1.5, baseY - 18, 3, 1.2)
    } else if (dir === 'left') {
      // Side Profile Left Eye
      ctx.fillStyle = '#111111'
      ctx.fillRect(centerX - 6.5, baseY - 24, 3, 4)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(centerX - 6.5, baseY - 24, 1.2, 1.5)

      ctx.fillStyle = '#8d4925'
      ctx.fillRect(centerX - 6.5, baseY - 18, 2, 1.2)
    } else if (dir === 'right') {
      // Side Profile Right Eye
      ctx.fillStyle = '#111111'
      ctx.fillRect(centerX + 3.5, baseY - 24, 3, 4)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(centerX + 3.5, baseY - 24, 1.2, 1.5)

      ctx.fillStyle = '#8d4925'
      ctx.fillRect(centerX + 4.5, baseY - 18, 2, 1.2)
    }
  }

  /**
   * Draw Facial Hair (Beard, Mustache, Goatee, Stubble)
   */
  private static drawFacialHair(
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

  /**
   * Draw Hairstyles (Messy, Anime, Long, Curls, Twin-Tails, etc.)
   */
  private static drawHair(
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

  /**
   * Draw Glasses
   */
  private static drawGlasses(
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
  private static drawHat(
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
  private static drawOther(
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

  /**
   * Draw Gather Pill Name Tag (Compact & Sleek)
   */
  private static drawNameTag(
    ctx: CanvasRenderingContext2D,
    player: Player,
    isLocal: boolean,
    centerX: number,
    tagY: number
  ) {
    const label = (isLocal ? 'Você' : player.name) + (player.statusEmoji ? ` ${player.statusEmoji}` : '')
    ctx.font = 'bold 7.5px Inter, sans-serif'
    const textW = ctx.measureText(label).width
    const pillW = textW + 14
    const pillH = 13
    const pillX = centerX - pillW / 2
    const pillY = tagY - pillH + 2

    // Background pill (Gather dark glass badge)
    ctx.fillStyle = isLocal ? 'rgba(15, 23, 42, 0.92)' : 'rgba(27, 32, 44, 0.90)'
    ctx.beginPath()
    ctx.roundRect(pillX, pillY, pillW, pillH, 6.5)
    ctx.fill()

    ctx.strokeStyle = isLocal ? '#38bdf8' : '#334155'
    ctx.lineWidth = 1.0
    ctx.stroke()

    // Presence dot
    let statusColor = '#22c55e'
    if (player.status === 'busy') statusColor = '#ef4444'
    else if (player.status === 'focusing') statusColor = '#a855f7'
    else if (player.status === 'away') statusColor = '#f59e0b'

    ctx.fillStyle = statusColor
    ctx.beginPath()
    ctx.arc(pillX + 5.5, pillY + pillH / 2, 2.2, 0, Math.PI * 2)
    ctx.fill()

    // Text name
    ctx.fillStyle = '#ffffff'
    ctx.fillText(label, pillX + 10.5, pillY + 9.2)
  }
}
