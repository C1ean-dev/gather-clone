import { Player, AvatarConfig, Direction } from '../types/game'
import { TILE_SIZE } from './Constants'

export class AvatarRenderer {
  /**
   * Draw Authentic Gather.town Pixel Art 2D Avatar (1:1 Replica)
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
    ctx.fillStyle = 'rgba(0, 0, 0, 0.32)'
    ctx.beginPath()
    ctx.ellipse(px + size / 2, py + size - 2, 10, 4, 0, 0, Math.PI * 2)
    ctx.fill()

    // 2. Walk Bobbing & Step Cycle (Smooth 2-step rhythm)
    let bodyBob = 0
    let legOffset = 0
    let armOffset = 0

    if (player.isMoving) {
      const step = Math.floor((animationTick / 110) % 4)
      if (step === 1) {
        bodyBob = -1
        legOffset = 2
        armOffset = 2
      } else if (step === 3) {
        bodyBob = -1
        legOffset = -2
        armOffset = -2
      }
    }

    const centerX = px + size / 2
    const baseY = py + size - 5 + bodyBob

    // Normalize Colors and Types
    const skinTone = avatar.skinTone || avatar.skinColor || '#f5ab7c'
    const skinDetail = avatar.skinDetail || 'vitiligo1'
    const hairStyle = avatar.hairStyle || 'messy'
    const hairColor = avatar.hairColor || '#2e293a'
    const facialHair = avatar.facialHair || 'none'
    const facialHairColor = avatar.facialHairColor || hairColor
    const topType = avatar.topType || avatar.shirtType || 'kimono'
    const topColor = avatar.topColor || avatar.shirtColor || '#292c33'
    const jacketType = avatar.jacketType || 'none'
    const jacketColor = avatar.jacketColor || '#4c6ef5'
    const bottomType = avatar.bottomType || (topType === 'kimono' || topType === 'yukata' ? 'kimono_skirt' : 'jeans')
    const bottomColor = avatar.bottomColor || avatar.pantsColor || '#292c33'
    const shoesType = avatar.shoesType || 'sandals'
    const shoesColor = avatar.shoesColor || '#51cf66'
    const hatType = avatar.hatType || 'none'
    const hatColor = avatar.hatColor || '#fa5252'
    const glassesType =
      avatar.glassesType ||
      (avatar.accessory === 'glasses'
        ? 'round'
        : avatar.accessory === 'sunglasses'
        ? 'sunglasses'
        : 'none')
    const glassesColor = avatar.glassesColor || avatar.accessoryColor || '#343a40'
    const otherType = avatar.otherType || (avatar.accessory === 'headphones' ? 'headphones' : 'none')
    const otherColor = avatar.otherColor || avatar.accessoryColor || '#20c997'

    // ==========================================
    // 3. RENDER GATHER PIXEL ART SPRITE
    // ==========================================
    if (topType === 'kimono' || topType === 'yukata') {
      this.drawGatherKimonoAvatar(
        ctx,
        centerX,
        baseY,
        dir,
        skinTone,
        skinDetail,
        hairStyle,
        hairColor,
        facialHair,
        facialHairColor,
        topColor,
        bottomColor,
        shoesColor,
        glassesType,
        glassesColor,
        hatType,
        hatColor,
        otherType,
        otherColor,
        armOffset,
        legOffset
      )
    } else {
      this.drawGatherModernAvatar(
        ctx,
        centerX,
        baseY,
        dir,
        skinTone,
        skinDetail,
        hairStyle,
        hairColor,
        facialHair,
        facialHairColor,
        topType,
        topColor,
        jacketType,
        jacketColor,
        bottomType,
        bottomColor,
        shoesType,
        shoesColor,
        glassesType,
        glassesColor,
        hatType,
        hatColor,
        otherType,
        otherColor,
        armOffset,
        legOffset
      )
    }

    // ==========================================
    // 4. NAME TAG BADGE (Compact Gather Style)
    // ==========================================
    if (showNameTag) {
      this.drawNameTag(ctx, player, isLocal, centerX, py - 13)
    }

    ctx.restore()
  }

  /**
   * Draw Exact Gather Kimono / Yukata Avatar (1:1 Reference Photos)
   */
  private static drawGatherKimonoAvatar(
    ctx: CanvasRenderingContext2D,
    cx: number,
    by: number,
    dir: Direction,
    skinTone: string,
    skinDetail: string,
    hairStyle: string,
    hairColor: string,
    facialHair: string,
    facialHairColor: string,
    robeColor: string,
    skirtColor: string,
    shoesColor: string,
    glassesType: string,
    glassesColor: string,
    hatType: string,
    hatColor: string,
    otherType: string,
    otherColor: string,
    armOffset: number,
    legOffset: number
  ) {
    const blackOutline = '#110e18'
    const darkRobe = robeColor || '#292c33'
    const robeShadow = '#1c1f24'
    const obiWhite = '#e9ecef'
    const obiShadow = '#adb5bd'

    // ==========================================
    // DIRECTION: DOWN (FRONT VIEW) - Image 1
    // ==========================================
    if (dir === 'down') {
      // 1. Lower Hakama Skirt (with 1px black outline)
      ctx.fillStyle = blackOutline
      ctx.beginPath()
      ctx.roundRect(cx - 7, by - 12, 14, 15, 2.5)
      ctx.fill()

      // Skirt Body
      ctx.fillStyle = skirtColor || darkRobe
      ctx.beginPath()
      ctx.roundRect(cx - 6, by - 11, 12, 13, 2)
      ctx.fill()

      // Skirt Shadow
      ctx.fillStyle = robeShadow
      ctx.fillRect(cx - 6, by - 1, 12, 3)

      // Floral Cross Symbols (3 white diamond stars)
      this.drawFloralCross(ctx, cx - 3.5, by - 5)
      this.drawFloralCross(ctx, cx + 3.5, by - 5)
      this.drawFloralCross(ctx, cx, by - 2)

      // 2. Torso & Upper Kimono
      ctx.fillStyle = blackOutline
      ctx.fillRect(cx - 6, by - 17, 12, 7)
      ctx.fillStyle = darkRobe
      ctx.fillRect(cx - 5, by - 16, 10, 6)

      // Overlapping Inner White Collar V-Neck
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(cx - 3, by - 16, 2, 4)
      ctx.fillRect(cx + 1, by - 16, 2, 4)
      ctx.fillRect(cx - 1, by - 13, 2, 2)

      // Inner Skin V-Neck
      ctx.fillStyle = skinTone
      ctx.fillRect(cx - 1, by - 16, 2, 3)

      // White Obi Belt
      ctx.fillStyle = blackOutline
      ctx.fillRect(cx - 7, by - 12, 14, 4.5)
      ctx.fillStyle = obiWhite
      ctx.fillRect(cx - 6, by - 11, 12, 3)
      ctx.fillStyle = obiShadow
      ctx.fillRect(cx - 6, by - 9, 12, 1)

      // 3. Wide Hanging Sleeves & Hands
      // Left Sleeve & Hand
      ctx.fillStyle = blackOutline
      ctx.fillRect(cx - 9, by - 16 + armOffset, 4, 11)
      ctx.fillStyle = darkRobe
      ctx.fillRect(cx - 8, by - 15 + armOffset, 2.5, 9)
      // Left peach hand
      ctx.fillStyle = skinTone
      ctx.fillRect(cx - 8, by - 6 + armOffset, 2.5, 3)

      // Right Sleeve & Hand
      ctx.fillStyle = blackOutline
      ctx.fillRect(cx + 5, by - 16 - armOffset, 4, 11)
      ctx.fillStyle = darkRobe
      ctx.fillRect(cx + 5.5, by - 15 - armOffset, 2.5, 9)
      // Right peach hand
      ctx.fillStyle = skinTone
      ctx.fillRect(cx + 5.5, by - 6 - armOffset, 2.5, 3)

      // 4. Head & Face
      this.drawExactGatherHeadAndFace(ctx, cx, by, dir, skinTone, skinDetail)

      // 5. Facial Hair
      if (facialHair !== 'none') {
        this.drawFacialHair(ctx, cx, by, dir, facialHair, facialHairColor)
      }

      // 6. Hair
      this.drawExactGatherHair(ctx, cx, by, dir, hairStyle, hairColor)

      // 7. Glasses
      if (glassesType !== 'none') {
        this.drawExactGlasses(ctx, cx, by, dir, glassesType, glassesColor)
      }

      // 8. Hat
      if (hatType !== 'none') {
        this.drawExactHat(ctx, cx, by, dir, hatType, hatColor)
      }

      // 9. Other
      if (otherType !== 'none') {
        this.drawExactOther(ctx, cx, by, dir, otherType, otherColor)
      }
    }

    // ==========================================
    // DIRECTION: UP (BACK VIEW) - Image 3
    // ==========================================
    else if (dir === 'up') {
      // 1. Lower Hakama Skirt Back
      ctx.fillStyle = blackOutline
      ctx.beginPath()
      ctx.roundRect(cx - 7, by - 12, 14, 15, 2.5)
      ctx.fill()

      ctx.fillStyle = skirtColor || darkRobe
      ctx.beginPath()
      ctx.roundRect(cx - 6, by - 11, 12, 13, 2)
      ctx.fill()

      // Skirt Bottom Shadow
      ctx.fillStyle = robeShadow
      ctx.fillRect(cx - 6, by - 1, 12, 3)

      // Floral Crosses on back
      this.drawFloralCross(ctx, cx - 3.5, by - 4)
      this.drawFloralCross(ctx, cx + 3.5, by - 4)
      this.drawFloralCross(ctx, cx, by - 1)

      // 2. Torso Back
      ctx.fillStyle = blackOutline
      ctx.fillRect(cx - 6, by - 17, 12, 7)
      ctx.fillStyle = darkRobe
      ctx.fillRect(cx - 5, by - 16, 10, 6)

      // 3. Sleeves Back
      ctx.fillStyle = blackOutline
      ctx.fillRect(cx - 9, by - 16 - armOffset, 4, 11)
      ctx.fillStyle = darkRobe
      ctx.fillRect(cx - 8, by - 15 - armOffset, 2.5, 9)

      ctx.fillStyle = blackOutline
      ctx.fillRect(cx + 5, by - 16 + armOffset, 4, 11)
      ctx.fillStyle = darkRobe
      ctx.fillRect(cx + 5.5, by - 15 + armOffset, 2.5, 9)

      // 4. Large White Obi Knot / Bow (Musubi) on Back - Reference Image 3!
      this.drawGatherBackObiBow(ctx, cx, by)

      // 5. Back of Head & Hair
      this.drawExactGatherHair(ctx, cx, by, dir, hairStyle, hairColor)

      // 6. Hat
      if (hatType !== 'none') {
        this.drawExactHat(ctx, cx, by, dir, hatType, hatColor)
      }
    }

    // ==========================================
    // DIRECTION: LEFT (PROFILE VIEW) - Image 2 & 5
    // ==========================================
    else if (dir === 'left') {
      // 1. Skirt Profile
      ctx.fillStyle = blackOutline
      ctx.beginPath()
      ctx.roundRect(cx - 5, by - 12, 10, 15, 2.5)
      ctx.fill()

      ctx.fillStyle = skirtColor || darkRobe
      ctx.beginPath()
      ctx.roundRect(cx - 4, by - 11, 8, 13, 2)
      ctx.fill()

      // Side Floral Cross
      this.drawFloralCross(ctx, cx - 0.5, by - 3)

      // 2. Torso Profile
      ctx.fillStyle = blackOutline
      ctx.fillRect(cx - 4.5, by - 17, 9, 7)
      ctx.fillStyle = darkRobe
      ctx.fillRect(cx - 3.5, by - 16, 7, 6)

      // 3. White Obi Knot Sticking Out on the Back (Right side of profile)
      ctx.fillStyle = blackOutline
      ctx.fillRect(cx + 3, by - 13, 3, 5)
      ctx.fillStyle = obiWhite
      ctx.fillRect(cx + 3.5, by - 12.5, 2, 4)

      // 4. Hanging Wide Sleeve Profile
      ctx.fillStyle = blackOutline
      ctx.fillRect(cx - 3.5, by - 16 + armOffset, 5.5, 11)
      ctx.fillStyle = darkRobe
      ctx.fillRect(cx - 2.5, by - 15 + armOffset, 3.5, 9)

      // Inner white cuff
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(cx - 2.5, by - 7 + armOffset, 3.5, 1)

      // Hand
      ctx.fillStyle = skinTone
      ctx.fillRect(cx - 2, by - 6 + armOffset, 2.5, 3)

      // 5. Head Profile
      this.drawExactGatherHeadAndFace(ctx, cx, by, dir, skinTone, skinDetail)

      // 6. Hair Profile
      this.drawExactGatherHair(ctx, cx, by, dir, hairStyle, hairColor)

      // 7. Glasses Profile
      if (glassesType !== 'none') {
        this.drawExactGlasses(ctx, cx, by, dir, glassesType, glassesColor)
      }

      // 8. Hat
      if (hatType !== 'none') {
        this.drawExactHat(ctx, cx, by, dir, hatType, hatColor)
      }
    }

    // ==========================================
    // DIRECTION: RIGHT (PROFILE VIEW) - Image 4
    // ==========================================
    else if (dir === 'right') {
      // 1. Skirt Profile
      ctx.fillStyle = blackOutline
      ctx.beginPath()
      ctx.roundRect(cx - 5, by - 12, 10, 15, 2.5)
      ctx.fill()

      ctx.fillStyle = skirtColor || darkRobe
      ctx.beginPath()
      ctx.roundRect(cx - 4, by - 11, 8, 13, 2)
      ctx.fill()

      // Side Floral Cross
      this.drawFloralCross(ctx, cx + 0.5, by - 3)

      // 2. Torso Profile
      ctx.fillStyle = blackOutline
      ctx.fillRect(cx - 4.5, by - 17, 9, 7)
      ctx.fillStyle = darkRobe
      ctx.fillRect(cx - 3.5, by - 16, 7, 6)

      // 3. White Obi Knot Sticking Out on the Back (Left side of profile)
      ctx.fillStyle = blackOutline
      ctx.fillRect(cx - 6, by - 13, 3, 5)
      ctx.fillStyle = obiWhite
      ctx.fillRect(cx - 5.5, by - 12.5, 2, 4)

      // 4. Hanging Wide Sleeve Profile
      ctx.fillStyle = blackOutline
      ctx.fillRect(cx - 2, by - 16 - armOffset, 5.5, 11)
      ctx.fillStyle = darkRobe
      ctx.fillRect(cx - 1, by - 15 - armOffset, 3.5, 9)

      // Inner white cuff
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(cx - 1, by - 7 - armOffset, 3.5, 1)

      // Hand
      ctx.fillStyle = skinTone
      ctx.fillRect(cx - 0.5, by - 6 - armOffset, 2.5, 3)

      // 5. Head Profile
      this.drawExactGatherHeadAndFace(ctx, cx, by, dir, skinTone, skinDetail)

      // 6. Hair Profile
      this.drawExactGatherHair(ctx, cx, by, dir, hairStyle, hairColor)

      // 7. Glasses Profile
      if (glassesType !== 'none') {
        this.drawExactGlasses(ctx, cx, by, dir, glassesType, glassesColor)
      }

      // 8. Hat
      if (hatType !== 'none') {
        this.drawExactHat(ctx, cx, by, dir, hatType, hatColor)
      }
    }
  }

  /**
   * Draw Floral Diamond Cross (Gather Hakama Kammon Pattern)
   */
  private static drawFloralCross(ctx: CanvasRenderingContext2D, x: number, y: number) {
    ctx.fillStyle = '#e2e8f0' // Silver white floral cross
    ctx.fillRect(x - 0.5, y - 1.5, 1, 3) // Vertical
    ctx.fillRect(x - 1.5, y - 0.5, 3, 1) // Horizontal
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(x - 0.5, y - 0.5, 1, 1) // Center shine
  }

  /**
   * Draw Large White Butterfly Obi Bow on Back (Musubi) - Reference Image 3
   */
  private static drawGatherBackObiBow(ctx: CanvasRenderingContext2D, cx: number, by: number) {
    const blackOutline = '#110e18'
    const obiWhite = '#ffffff'
    const obiShadow = '#ced4da'

    // Black outline around the entire bow
    ctx.fillStyle = blackOutline
    ctx.beginPath()
    ctx.roundRect(cx - 6, by - 14, 12, 7.5, 2)
    ctx.fill()

    // Left bow wing
    ctx.fillStyle = obiWhite
    ctx.beginPath()
    ctx.roundRect(cx - 5.5, by - 13.5, 4.5, 6, 1.5)
    ctx.fill()
    ctx.fillStyle = obiShadow
    ctx.fillRect(cx - 5.5, by - 9.5, 4.5, 2)

    // Right bow wing
    ctx.fillStyle = obiWhite
    ctx.beginPath()
    ctx.roundRect(cx + 1, by - 13.5, 4.5, 6, 1.5)
    ctx.fill()
    ctx.fillStyle = obiShadow
    ctx.fillRect(cx + 1, by - 9.5, 4.5, 2)

    // Center knot
    ctx.fillStyle = blackOutline
    ctx.fillRect(cx - 1.5, by - 12.5, 3, 4.5)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(cx - 1, by - 12, 2, 3.5)

    // Hanging ribbon tails below the bow
    ctx.fillStyle = blackOutline
    ctx.fillRect(cx - 4.5, by - 7.5, 3, 5)
    ctx.fillRect(cx + 1.5, by - 7.5, 3, 5)

    ctx.fillStyle = obiWhite
    ctx.fillRect(cx - 4, by - 7, 2, 4)
    ctx.fillRect(cx + 2, by - 7, 2, 4)
  }

  /**
   * Draw Head, Expressive Eyes & Skin Details (1:1 Gather Reference)
   */
  private static drawExactGatherHeadAndFace(
    ctx: CanvasRenderingContext2D,
    cx: number,
    by: number,
    dir: Direction,
    skinTone: string,
    skinDetail: string
  ) {
    const blackOutline = '#110e18'
    const blushColor = '#f56d60' // Rosy red/orange blush
    const vitiligoColor = '#fedec8' // Lighter skin patch

    if (dir === 'down') {
      // 1. Black Head Outline (1px border)
      ctx.fillStyle = blackOutline
      ctx.beginPath()
      ctx.roundRect(cx - 7.5, by - 29, 15, 13, 3)
      ctx.fill()

      // 2. Base Skin Body
      ctx.fillStyle = skinTone
      ctx.beginPath()
      ctx.roundRect(cx - 6.5, by - 28, 13, 11, 2)
      ctx.fill()

      // 3. Peach Ears with outline
      ctx.fillStyle = blackOutline
      ctx.fillRect(cx - 8.5, by - 24, 2, 4)
      ctx.fillRect(cx + 6.5, by - 24, 2, 4)
      ctx.fillStyle = skinTone
      ctx.fillRect(cx - 8, by - 23.5, 1.5, 3)
      ctx.fillRect(cx + 6.5, by - 23.5, 1.5, 3)

      // 4. Vitiligo / Freckles Patches across Cheeks & Nose (Gather Reference Image 1)
      if (skinDetail === 'vitiligo1' || skinDetail === 'vitiligo2') {
        ctx.fillStyle = vitiligoColor
        // Left patch under eye
        ctx.fillRect(cx - 5.5, by - 22, 3.5, 3)
        // Center nose bridge patch
        ctx.fillRect(cx - 1.5, by - 24, 3, 4)
        // Right cheek patch
        if (skinDetail === 'vitiligo2') {
          ctx.fillRect(cx + 2.5, by - 21, 3, 2.5)
        }
      } else if (skinDetail === 'freckles') {
        ctx.fillStyle = 'rgba(110, 45, 15, 0.65)'
        ctx.fillRect(cx - 4.5, by - 20, 1, 1)
        ctx.fillRect(cx - 2.5, by - 19, 1, 1)
        ctx.fillRect(cx - 0.5, by - 20, 1, 1)
        ctx.fillRect(cx + 1.5, by - 19, 1, 1)
        ctx.fillRect(cx + 3.5, by - 20, 1, 1)
      }

      // 5. Rosy Red/Orange Cheek Blush (Image 1)
      ctx.fillStyle = blushColor
      ctx.fillRect(cx - 6, by - 19.5, 2.5, 1.5)
      ctx.fillRect(cx + 3.5, by - 19.5, 2.5, 1.5)

      // 6. Gather Expressive Eyes (Big pupils with white specular shine)
      // Left Eye
      ctx.fillStyle = blackOutline
      ctx.fillRect(cx - 5, by - 23.5, 3, 3.5) // Brow & Pupil
      ctx.fillStyle = '#4a2e1b' // Warm brown iris
      ctx.fillRect(cx - 5, by - 21, 3, 1)
      ctx.fillStyle = '#ffffff' // Crisp specular reflection shine!
      ctx.fillRect(cx - 5, by - 22.5, 1.2, 1.5)

      // Right Eye
      ctx.fillStyle = blackOutline
      ctx.fillRect(cx + 2, by - 23.5, 3, 3.5)
      ctx.fillStyle = '#4a2e1b'
      ctx.fillRect(cx + 2, by - 21, 3, 1)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(cx + 2, by - 22.5, 1.2, 1.5)

      // 7. Small Subtle Mouth
      ctx.fillStyle = '#6e331b'
      ctx.fillRect(cx - 1, by - 17, 2, 1.2)
    } else if (dir === 'left') {
      // Black Head Outline Profile
      ctx.fillStyle = blackOutline
      ctx.beginPath()
      ctx.roundRect(cx - 6.5, by - 29, 13, 13, 3)
      ctx.fill()

      // Base Skin Body
      ctx.fillStyle = skinTone
      ctx.beginPath()
      ctx.roundRect(cx - 5.5, by - 28, 11, 11, 2)
      ctx.fill()

      // Right Ear visible in profile
      ctx.fillStyle = blackOutline
      ctx.fillRect(cx + 1.5, by - 24, 2.5, 4.5)
      ctx.fillStyle = skinTone
      ctx.fillRect(cx + 2, by - 23.5, 1.5, 3.5)

      // Blush
      ctx.fillStyle = blushColor
      ctx.fillRect(cx - 5.5, by - 19.5, 2.5, 1.5)

      // Single Side Eye (Looking Left) - Image 2
      ctx.fillStyle = blackOutline
      ctx.fillRect(cx - 5, by - 23.5, 3, 3.5)
      ctx.fillStyle = '#4a2e1b'
      ctx.fillRect(cx - 5, by - 21, 3, 1)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(cx - 5, by - 22.5, 1.2, 1.5)
    } else if (dir === 'right') {
      // Black Head Outline Profile
      ctx.fillStyle = blackOutline
      ctx.beginPath()
      ctx.roundRect(cx - 6.5, by - 29, 13, 13, 3)
      ctx.fill()

      // Base Skin Body
      ctx.fillStyle = skinTone
      ctx.beginPath()
      ctx.roundRect(cx - 5.5, by - 28, 11, 11, 2)
      ctx.fill()

      // Left Ear visible in profile
      ctx.fillStyle = blackOutline
      ctx.fillRect(cx - 4, by - 24, 2.5, 4.5)
      ctx.fillStyle = skinTone
      ctx.fillRect(cx - 3.5, by - 23.5, 1.5, 3.5)

      // Blush
      ctx.fillStyle = blushColor
      ctx.fillRect(cx + 3, by - 19.5, 2.5, 1.5)

      // Single Side Eye (Looking Right) - Image 4
      ctx.fillStyle = blackOutline
      ctx.fillRect(cx + 2, by - 23.5, 3, 3.5)
      ctx.fillStyle = '#4a2e1b'
      ctx.fillRect(cx + 2, by - 21, 3, 1)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(cx + 2, by - 22.5, 1.2, 1.5)
    }
  }

  /**
   * Draw Exact Gather Hairstyle with Highlights & Bangs (Images 1, 2, 3, 4)
   */
  private static drawExactGatherHair(
    ctx: CanvasRenderingContext2D,
    cx: number,
    by: number,
    dir: Direction,
    style: string,
    color: string
  ) {
    if (style === 'bald') return

    const blackOutline = '#110e18'
    const hairBase = color || '#2e293a'
    const hairHighlight = '#504860' // Soft lavender highlight

    if (style === 'messy' || style === 'short') {
      if (dir === 'down') {
        // Hair Outline (Top and sides)
        ctx.fillStyle = blackOutline
        ctx.beginPath()
        ctx.roundRect(cx - 8.5, by - 32, 17, 10, 4)
        ctx.fill()

        // Top Tuft Spikes (Image 1)
        ctx.fillRect(cx - 5, by - 34, 3, 3)
        ctx.fillRect(cx + 2, by - 33, 4, 2)

        // Hair Body
        ctx.fillStyle = hairBase
        ctx.beginPath()
        ctx.roundRect(cx - 7.5, by - 31, 15, 8, 3)
        ctx.fill()
        ctx.fillRect(cx - 4.5, by - 33, 2, 2)
        ctx.fillRect(cx + 2.5, by - 32, 3, 2)

        // Highlights along crest
        ctx.fillStyle = hairHighlight
        ctx.fillRect(cx - 3, by - 31, 6, 1.5)
        ctx.fillRect(cx + 3, by - 29, 3, 1.5)

        // Fringe Bangs Hanging Down on Forehead (Image 1 exact locks)
        // Left lock
        ctx.fillStyle = blackOutline
        ctx.fillRect(cx - 6, by - 26, 3, 5)
        ctx.fillStyle = hairBase
        ctx.fillRect(cx - 5.5, by - 25.5, 2, 4)

        // Center lock
        ctx.fillStyle = blackOutline
        ctx.fillRect(cx - 1.5, by - 26, 3, 6)
        ctx.fillStyle = hairBase
        ctx.fillRect(cx - 1, by - 25.5, 2, 5)
        ctx.fillStyle = hairHighlight
        ctx.fillRect(cx - 1, by - 25.5, 1, 3)

        // Right lock
        ctx.fillStyle = blackOutline
        ctx.fillRect(cx + 3, by - 26, 3, 5)
        ctx.fillStyle = hairBase
        ctx.fillRect(cx + 3.5, by - 25.5, 2, 4)
      } else if (dir === 'up') {
        // Back of Head Hair (Image 3 exact reference!)
        ctx.fillStyle = blackOutline
        ctx.beginPath()
        ctx.roundRect(cx - 8.5, by - 32, 17, 16, 4)
        ctx.fill()
        ctx.fillRect(cx - 5, by - 34, 3, 3)

        ctx.fillStyle = hairBase
        ctx.beginPath()
        ctx.roundRect(cx - 7.5, by - 31, 15, 14, 3)
        ctx.fill()
        ctx.fillRect(cx - 4.5, by - 33, 2, 2)

        // Shaded texture locks down the back
        ctx.fillStyle = hairHighlight
        ctx.fillRect(cx - 3, by - 30, 6, 2)
        ctx.fillRect(cx - 2, by - 26, 4, 3)
        ctx.fillRect(cx - 4, by - 22, 3, 3)
        ctx.fillRect(cx + 1, by - 22, 3, 3)
      } else if (dir === 'left') {
        // Profile Left Hair (Image 2 & 5)
        ctx.fillStyle = blackOutline
        ctx.beginPath()
        ctx.roundRect(cx - 8, by - 32, 16, 14, 4)
        ctx.fill()
        ctx.fillRect(cx - 3, by - 34, 4, 3)

        ctx.fillStyle = hairBase
        ctx.beginPath()
        ctx.roundRect(cx - 7, by - 31, 14, 12, 3)
        ctx.fill()
        ctx.fillRect(cx - 2.5, by - 33, 3, 2)

        // Front Bangs Profile
        ctx.fillStyle = blackOutline
        ctx.fillRect(cx - 7.5, by - 26, 3.5, 6)
        ctx.fillStyle = hairBase
        ctx.fillRect(cx - 7, by - 25.5, 2.5, 5)

        // Highlight
        ctx.fillStyle = hairHighlight
        ctx.fillRect(cx - 4, by - 30, 5, 2)
      } else if (dir === 'right') {
        // Profile Right Hair (Image 4)
        ctx.fillStyle = blackOutline
        ctx.beginPath()
        ctx.roundRect(cx - 8, by - 32, 16, 14, 4)
        ctx.fill()
        ctx.fillRect(cx - 1, by - 34, 4, 3)

        ctx.fillStyle = hairBase
        ctx.beginPath()
        ctx.roundRect(cx - 7, by - 31, 14, 12, 3)
        ctx.fill()
        ctx.fillRect(cx - 0.5, by - 33, 3, 2)

        // Front Bangs Profile
        ctx.fillStyle = blackOutline
        ctx.fillRect(cx + 4, by - 26, 3.5, 6)
        ctx.fillStyle = hairBase
        ctx.fillRect(cx + 4.5, by - 25.5, 2.5, 5)

        // Highlight
        ctx.fillStyle = hairHighlight
        ctx.fillRect(cx - 1, by - 30, 5, 2)
      }
    } else {
      // Fallback for other hairstyles (Long, Anime, Curls, Twin-Tails)
      this.drawHair(ctx, cx, by, dir, style, color)
    }
  }

  /**
   * Draw Modern Gather Outfits (T-Shirts, Hoodies, Jeans, Sweaters, etc.)
   */
  private static drawGatherModernAvatar(
    ctx: CanvasRenderingContext2D,
    cx: number,
    by: number,
    dir: Direction,
    skinTone: string,
    skinDetail: string,
    hairStyle: string,
    hairColor: string,
    facialHair: string,
    facialHairColor: string,
    topType: string,
    topColor: string,
    jacketType: string,
    jacketColor: string,
    bottomType: string,
    bottomColor: string,
    shoesType: string,
    shoesColor: string,
    glassesType: string,
    glassesColor: string,
    hatType: string,
    hatColor: string,
    otherType: string,
    otherColor: string,
    armOffset: number,
    legOffset: number
  ) {
    const blackOutline = '#110e18'

    // 1. Legs & Shoes
    ctx.fillStyle = blackOutline
    ctx.fillRect(cx - 6, by - 6, 5, 9 + legOffset)
    ctx.fillRect(cx + 1, by - 6, 5, 9 - legOffset)

    ctx.fillStyle = bottomColor
    ctx.fillRect(cx - 5.5, by - 5.5, 4, 8 + legOffset)
    ctx.fillRect(cx + 1.5, by - 5.5, 4, 8 - legOffset)

    // Shoes
    ctx.fillStyle = blackOutline
    ctx.fillRect(cx - 6.5, by + 2.5 + legOffset, 5.5, 3.5)
    ctx.fillRect(cx + 1, by + 2.5 - legOffset, 5.5, 3.5)
    ctx.fillStyle = shoesColor
    ctx.fillRect(cx - 6, by + 3 + legOffset, 4.5, 2.5)
    ctx.fillRect(cx + 1.5, by + 3 - legOffset, 4.5, 2.5)

    // 2. Torso
    ctx.fillStyle = blackOutline
    ctx.beginPath()
    ctx.roundRect(cx - 7, by - 17, 14, 12, 2.5)
    ctx.fill()

    ctx.fillStyle = topColor
    ctx.beginPath()
    ctx.roundRect(cx - 6, by - 16, 12, 10, 2)
    ctx.fill()

    // 3. Arms
    ctx.fillStyle = blackOutline
    ctx.fillRect(cx - 9.5, by - 16 + armOffset, 3.5, 9)
    ctx.fillRect(cx + 6, by - 16 - armOffset, 3.5, 9)
    ctx.fillStyle = topColor
    ctx.fillRect(cx - 9, by - 15.5 + armOffset, 2.5, 7)
    ctx.fillRect(cx + 6.5, by - 15.5 - armOffset, 2.5, 7)

    // Hands
    ctx.fillStyle = skinTone
    ctx.fillRect(cx - 9, by - 8.5 + armOffset, 2.5, 2.5)
    ctx.fillRect(cx + 6.5, by - 8.5 - armOffset, 2.5, 2.5)

    // 4. Head & Face
    this.drawExactGatherHeadAndFace(ctx, cx, by, dir, skinTone, skinDetail)

    // 5. Hair
    this.drawExactGatherHair(ctx, cx, by, dir, hairStyle, hairColor)

    // 6. Accessories
    if (glassesType !== 'none') {
      this.drawExactGlasses(ctx, cx, by, dir, glassesType, glassesColor)
    }
    if (hatType !== 'none') {
      this.drawExactHat(ctx, cx, by, dir, hatType, hatColor)
    }
    if (otherType !== 'none') {
      this.drawExactOther(ctx, cx, by, dir, otherType, otherColor)
    }
  }

  /**
   * Draw Glasses
   */
  private static drawExactGlasses(
    ctx: CanvasRenderingContext2D,
    cx: number,
    by: number,
    dir: Direction,
    type: string,
    color: string
  ) {
    if (dir === 'up') return

    if (type === 'round') {
      ctx.strokeStyle = color
      ctx.lineWidth = 1.2
      ctx.strokeRect(cx - 5.5, by - 24, 4, 4)
      ctx.strokeRect(cx + 1.5, by - 24, 4, 4)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)'
      ctx.fillRect(cx - 5, by - 23.5, 1.5, 1.5)
      ctx.fillRect(cx + 2, by - 23.5, 1.5, 1.5)
    } else if (type === 'sunglasses') {
      ctx.fillStyle = '#111111'
      ctx.fillRect(cx - 6, by - 24, 5, 4)
      ctx.fillRect(cx + 1, by - 24, 5, 4)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'
      ctx.fillRect(cx - 5, by - 23, 2, 1)
      ctx.fillRect(cx + 2, by - 23, 2, 1)
    }
  }

  /**
   * Draw Hat
   */
  private static drawExactHat(
    ctx: CanvasRenderingContext2D,
    cx: number,
    by: number,
    dir: Direction,
    type: string,
    color: string
  ) {
    if (type === 'ribbon_bow') {
      ctx.fillStyle = '#110e18'
      ctx.fillRect(cx - 2, by - 35, 4, 4)
      ctx.fillStyle = color
      ctx.fillRect(cx - 1.5, by - 34.5, 3, 3)
      ctx.fillRect(cx - 5, by - 35, 3.5, 3)
      ctx.fillRect(cx + 1.5, by - 35, 3.5, 3)
    } else if (type === 'cap_forward') {
      ctx.fillStyle = color
      ctx.fillRect(cx - 8, by - 34, 16, 5)
      if (dir === 'down') ctx.fillRect(cx - 9, by - 29, 18, 2)
    }
  }

  /**
   * Draw Other
   */
  private static drawExactOther(
    ctx: CanvasRenderingContext2D,
    cx: number,
    by: number,
    dir: Direction,
    type: string,
    color: string
  ) {
    if (type === 'headphones') {
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(cx, by - 28, 9, Math.PI, 0)
      ctx.stroke()
      ctx.fillStyle = color
      ctx.fillRect(cx - 10, by - 26, 3, 6)
      ctx.fillRect(cx + 7, by - 26, 3, 6)
    }
  }

  /**
   * Draw Facial Hair
   */
  private static drawFacialHair(
    ctx: CanvasRenderingContext2D,
    cx: number,
    by: number,
    dir: Direction,
    type: string,
    color: string
  ) {
    if (dir === 'up') return
    ctx.fillStyle = color
    if (type === 'full_beard') {
      ctx.fillRect(cx - 6, by - 19, 12, 4)
    } else if (type === 'mustache') {
      ctx.fillRect(cx - 4, by - 19, 8, 1.5)
    }
  }

  /**
   * General Hair Fallback
   */
  private static drawHair(
    ctx: CanvasRenderingContext2D,
    cx: number,
    by: number,
    dir: Direction,
    style: string,
    color: string
  ) {
    ctx.fillStyle = color
    ctx.fillRect(cx - 7, by - 30, 14, 8)
  }

  /**
   * Draw Compact Name Tag
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

    ctx.fillStyle = isLocal ? 'rgba(15, 23, 42, 0.92)' : 'rgba(27, 32, 44, 0.90)'
    ctx.beginPath()
    ctx.roundRect(pillX, pillY, pillW, pillH, 6.5)
    ctx.fill()

    ctx.strokeStyle = isLocal ? '#38bdf8' : '#334155'
    ctx.lineWidth = 1.0
    ctx.stroke()

    let statusColor = '#22c55e'
    if (player.status === 'busy') statusColor = '#ef4444'
    else if (player.status === 'focusing') statusColor = '#a855f7'
    else if (player.status === 'away') statusColor = '#f59e0b'

    ctx.fillStyle = statusColor
    ctx.beginPath()
    ctx.arc(pillX + 5.5, pillY + pillH / 2, 2.2, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = '#ffffff'
    ctx.fillText(label, pillX + 10.5, pillY + 9.2)
  }
}
