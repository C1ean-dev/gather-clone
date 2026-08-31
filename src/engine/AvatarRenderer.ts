import { Player, Direction } from '../types/game'
import { TILE_SIZE } from './Constants'
import { getCustomAssetImage } from '../store/useCustomAssetsStore'
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

    // Custom Hand-Drawn Avatar Skin Override
    if (avatar.customSkinUrl) {
      const img = getCustomAssetImage(avatar.customSkinUrl)
      if (img && img.complete && img.naturalWidth > 0) {
        ctx.save()
        if (dir === 'left') {
          ctx.translate(px + size / 2, 0)
          ctx.scale(-1, 1)
          ctx.translate(-(px + size / 2), 0)
        }
        ctx.drawImage(img, px, py + bodyBob, size, size)
        ctx.restore()

        if (showNameTag) {
          NameTagRenderer.drawNameTag(ctx, player, isLocal, centerX, py - 13)
        }
        ctx.restore()
        return
      }
    }

    // Normalize Colors and Types with Backward Compatibility (Default to clean, neutral avatar)
    const skinTone = avatar.skinTone || avatar.skinColor || '#ffd1a4'
    const skinDetail = avatar.skinDetail || 'smooth'
    const eyeType = avatar.eyeType || 'normal'
    const eyeColor = avatar.eyeColor || '#111111'
    const hairStyle = avatar.hairStyle || 'none'
    const hairColor = avatar.hairColor || '#212529'
    const facialHair = avatar.facialHair || 'none'
    const facialHairColor = avatar.facialHairColor || hairColor
    const topType = avatar.topType || avatar.shirtType || 'none'
    const topColor = avatar.topColor || avatar.shirtColor || '#212529'
    const jacketType = avatar.jacketType || 'none'
    const jacketColor = avatar.jacketColor || '#4c6ef5'
    const bottomType = avatar.bottomType || 'none'
    const bottomColor = avatar.bottomColor || avatar.pantsColor || '#212529'
    const shoesType = avatar.shoesType || 'none'
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
      isMoving,
      skinTone
    )

    // ==========================================
    // 5. TORSO & TOPS (Kimono, Yukata, T-Shirt, Sweater, or None)
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
    // 8. HEAD, SKIN DETAILS, EYES & FACE
    // ==========================================
    FaceRenderer.drawHeadAndFace(ctx, centerX, baseY, dir, skinTone, skinDetail, eyeType, eyeColor)

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
