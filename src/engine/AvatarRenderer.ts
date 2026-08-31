import { Player, Direction } from '../types/game'
import { TILE_SIZE } from './Constants'
import { ClothingRenderer } from './avatar/clothingRenderer'
import { HairRenderer } from './avatar/hairRenderer'
import { FaceRenderer } from './avatar/faceRenderer'
import { AccessoryRenderer } from './avatar/accessoryRenderer'
import { NameTagRenderer } from './avatar/nameTagRenderer'

export { ClothingRenderer } from './avatar/clothingRenderer'
export { HairRenderer } from './avatar/hairRenderer'
export { FaceRenderer } from './avatar/faceRenderer'
export { AccessoryRenderer } from './avatar/accessoryRenderer'
export { NameTagRenderer } from './avatar/nameTagRenderer'

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
    const px = player.x * size
    const py = player.y * size
    const avatar = player.avatar || {}
    const dir = player.direction || 'down'

    ctx.save()

    // 1. Gather Oval Drop Shadow under avatar feet
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)'
    ctx.beginPath()
    ctx.ellipse(px + size / 2, py + size - 2, 11, 4.5, 0, 0, Math.PI * 2)
    ctx.fill()

    // 2. Walk Bobbing & 4-Frame Step Cycle
    let bodyBob = 0
    let walkFrame = 0
    const isMoving = !!player.isMoving

    if (isMoving) {
      walkFrame = Math.floor((animationTick / 120) % 4)
      if (walkFrame === 1 || walkFrame === 3) {
        bodyBob = -1 // Passing position - body peaks 1px up
      } else {
        bodyBob = 0 // Stride contact positions
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
    const glassesType =
      avatar.glassesType ||
      (avatar.accessory === 'glasses' ? 'round' : avatar.accessory === 'sunglasses' ? 'sunglasses' : 'none')
    const glassesColor = avatar.glassesColor || avatar.accessoryColor || '#343a40'
    const otherType = avatar.otherType || (avatar.accessory === 'headphones' ? 'headphones' : 'none')
    const otherColor = avatar.otherColor || avatar.accessoryColor || '#20c997'

    // ==========================================
    // 3. BACK ARM (Behind body in side view)
    // ==========================================
    ClothingRenderer.drawBackArm(
      ctx,
      centerX,
      baseY,
      dir,
      topType,
      topColor,
      jacketType,
      jacketColor,
      skinTone,
      walkFrame,
      isMoving
    )

    // ==========================================
    // 4. LEGS, BOTTOMS & SHOES (4-Frame Walk Cycle)
    // ==========================================
    ClothingRenderer.drawLegsAndShoes(
      ctx,
      centerX,
      baseY,
      dir,
      bottomType,
      bottomColor,
      shoesType,
      shoesColor,
      walkFrame,
      isMoving
    )

    // ==========================================
    // 5. TORSO & TOPS (Kimono, Yukata, T-Shirt, Sweater, etc.)
    // ==========================================
    ClothingRenderer.drawTorsoAndTop(ctx, centerX, baseY, dir, topType, topColor, skinTone)

    // ==========================================
    // 6. JACKET (Open Hoodie, Cardigan, Blazer, Denim)
    // ==========================================
    if (jacketType !== 'none') {
      ClothingRenderer.drawJacket(ctx, centerX, baseY, dir, jacketType, jacketColor)
    }

    // ==========================================
    // 7. FRONT ARM (With 4-Frame natural swing)
    // ==========================================
    ClothingRenderer.drawFrontArm(
      ctx,
      centerX,
      baseY,
      dir,
      topType,
      topColor,
      jacketType,
      jacketColor,
      skinTone,
      walkFrame,
      isMoving
    )

    // ==========================================
    // 7. HEAD, SKIN DETAILS & FACE (Vitiligo, Freckles, Eyes)
    // ==========================================
    FaceRenderer.drawHeadAndFace(ctx, centerX, baseY, dir, skinTone, skinDetail)

    // ==========================================
    // 8. FACIAL HAIR (Beard, Mustache, Goatee, Stubble)
    // ==========================================
    if (facialHair !== 'none') {
      FaceRenderer.drawFacialHair(ctx, centerX, baseY, dir, facialHair, facialHairColor)
    }

    // ==========================================
    // 9. HAIRSTYLES (Messy, Anime, Long, Curls, Twin-Tails, etc.)
    // ==========================================
    HairRenderer.drawHair(ctx, centerX, baseY, dir, hairStyle, hairColor)

    // ==========================================
    // 10. GLASSES (Round, Square, Sunglasses, Wireframe)
    // ==========================================
    if (glassesType !== 'none') {
      AccessoryRenderer.drawGlasses(ctx, centerX, baseY, dir, glassesType, glassesColor)
    }

    // ==========================================
    // 11. HATS & HAIR ACCESSORIES (Ribbon Bow, Cap, Beanie, Headband)
    // ==========================================
    if (hatType !== 'none') {
      AccessoryRenderer.drawHat(ctx, centerX, baseY, dir, hatType, hatColor)
    }

    // ==========================================
    // 12. OTHER (Headphones, Mask, Star Badge)
    // ==========================================
    if (otherType !== 'none') {
      AccessoryRenderer.drawOther(ctx, centerX, baseY, dir, otherType, otherColor)
    }

    // ==========================================
    // 13. NAME TAG BADGE (Floating above head)
    // ==========================================
    if (showNameTag) {
      NameTagRenderer.drawNameTag(ctx, player, isLocal, centerX, py - 13)
    }

    ctx.restore()
  }
}
