import { Player, Direction } from '../types/game'
import { TILE_SIZE } from './Constants'
import { getCustomAssetImage } from '../store/useCustomAssetsStore'
import { ClothingRenderer } from './avatar/clothingRenderer'
import { HairRenderer } from './avatar/hairRenderer'
import { FaceRenderer } from './avatar/faceRenderer'
import { AccessoryRenderer } from './avatar/accessoryRenderer'
import { NameTagRenderer } from './avatar/nameTagRenderer'
import { AvatarAtlasManager, SubTexture } from './avatar/AvatarAtlasManager'

export { ClothingRenderer } from './avatar/clothingRenderer'
export { HairRenderer } from './avatar/hairRenderer'
export { FaceRenderer } from './avatar/faceRenderer'
export { AccessoryRenderer } from './avatar/accessoryRenderer'
export { NameTagRenderer } from './avatar/nameTagRenderer'
export { AvatarAtlasManager } from './avatar/AvatarAtlasManager'

export class AvatarRenderer {
  /**
   * Draw a layer component from AvatarAtlasManager if present.
   * Returns true if rendered, false if not present (triggering hybrid procedural fallback).
   */
  static drawAtlasPart(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    bodyBob: number,
    size: number,
    dir: Direction,
    category: string,
    presetId: string,
    walkFrame: number = 0
  ): boolean {
    if (!presetId || presetId === 'none') return false

    // Resolve direction name and horizontal flip requirement
    let searchDir = dir
    let flipX = false
    if (dir === 'left') {
      searchDir = 'right'
      flipX = true
    }

    // Lookup candidate names in priority order:
    // 1. <category>_<presetId>_<dir>_<walkFrame> (frame-specific)
    // 2. <category>_<presetId>_<dir>_0 (static dir)
    // 3. <category>_<presetId>_<dir> (dir name only)
    // 4. <category>_<presetId>_<walkFrame>
    // 5. <category>_<presetId>_0
    // 6. <category>_<presetId>
    const candidateNames = [
      `${category}_${presetId}_${searchDir}_${walkFrame}`,
      `${category}_${presetId}_${searchDir}_0`,
      `${category}_${presetId}_${searchDir}`,
      `${category}_${presetId}_${walkFrame}`,
      `${category}_${presetId}_0`,
      `${category}_${presetId}`,
    ]

    let sub: SubTexture | undefined
    for (const name of candidateNames) {
      sub = AvatarAtlasManager.getSubTexture(category, name)
      if (sub) break
    }

    if (!sub) return false

    const img = AvatarAtlasManager.getImage(category)
    if (!img) return false

    // If img has complete property, verify it's loaded
    if ('complete' in img && !img.complete) return false

    ctx.save()
    if (flipX) {
      ctx.translate(px + size / 2, 0)
      ctx.scale(-1, 1)
      ctx.translate(-(px + size / 2), 0)
    }

    const destX = px + (sub.frameX ? -sub.frameX : 0)
    const destY = py + bodyBob + (sub.frameY ? -sub.frameY : 0)

    ctx.drawImage(
      img,
      sub.x,
      sub.y,
      sub.width,
      sub.height,
      destX,
      destY,
      size,
      size
    )
    ctx.restore()

    return true
  }

  /**
   * Draw Authentic Gather.town Pixel Art 2D Avatar with Hybrid Fallback
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

    // Normalize Colors and Types with Backward Compatibility
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

    // Helper to render hand-drawn custom component layers
    const drawCustomComponent = (dataUrl?: string) => {
      if (!dataUrl) return
      const img = getCustomAssetImage(dataUrl)
      if (img && img.complete && img.naturalWidth > 0) {
        ctx.save()
        if (dir === 'left') {
          ctx.translate(px + size / 2, 0)
          ctx.scale(-1, 1)
          ctx.translate(-(px + size / 2), 0)
        }
        ctx.drawImage(img, px, py + bodyBob, size, size)
        ctx.restore()
      }
    }

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
    const renderedBottom = this.drawAtlasPart(ctx, px, py, bodyBob, size, dir, 'bottom', bottomType, walkFrame)
    const renderedShoes = this.drawAtlasPart(ctx, px, py, bodyBob, size, dir, 'shoes', shoesType, walkFrame)
    if (!renderedBottom && !renderedShoes) {
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
    }
    drawCustomComponent(avatar.customComponents?.bottom)
    drawCustomComponent(avatar.customComponents?.shoes)

    // ==========================================
    // 5. TORSO & TOPS (Kimono, Yukata, T-Shirt, Sweater, or None)
    // ==========================================
    const renderedTop = this.drawAtlasPart(ctx, px, py, bodyBob, size, dir, 'top', topType, walkFrame)
    if (!renderedTop) {
      ClothingRenderer.drawTorsoAndTop(ctx, centerX, baseY, dir, topType, topColor, skinTone)
    }
    drawCustomComponent(avatar.customComponents?.top)

    // ==========================================
    // 6. JACKET (Open Hoodie, Cardigan, Blazer, Denim)
    // ==========================================
    if (jacketType !== 'none') {
      const renderedJacket = this.drawAtlasPart(ctx, px, py, bodyBob, size, dir, 'jacket', jacketType, walkFrame)
      if (!renderedJacket) {
        ClothingRenderer.drawJacket(ctx, centerX, baseY, dir, jacketType, jacketColor)
      }
    }
    drawCustomComponent(avatar.customComponents?.jacket)

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
    // 8.1 Base Head Shape
    FaceRenderer.drawHeadBase(ctx, centerX, baseY, dir, skinTone)

    // 8.2 Skin Details & Makeup (Blush, Freckles, Vitiligo)
    const renderedSkin = this.drawAtlasPart(ctx, px, py, bodyBob, size, dir, 'skin', skinDetail, walkFrame)
    if (!renderedSkin && !avatar.customComponents?.skin) {
      FaceRenderer.drawSkinDetails(ctx, centerX, baseY, dir, skinDetail)
    }
    drawCustomComponent(avatar.customComponents?.skin)

    // 8.3 Eyes (Rendered on top of makeup so eyes are always visible)
    const renderedEyes = this.drawAtlasPart(ctx, px, py, bodyBob, size, dir, 'eyes', eyeType, walkFrame)
    if (!renderedEyes && !avatar.customComponents?.eyes) {
      FaceRenderer.drawEyes(ctx, centerX, baseY, dir, eyeType, eyeColor)
    }
    drawCustomComponent(avatar.customComponents?.eyes)

    // 8.4 Mouth
    FaceRenderer.drawMouth(ctx, centerX, baseY, dir)

    // ==========================================
    // 8. FACIAL HAIR (Beard, Mustache, Goatee, Stubble)
    // ==========================================
    if (facialHair !== 'none') {
      const renderedFacialHair = this.drawAtlasPart(ctx, px, py, bodyBob, size, dir, 'facialHair', facialHair, walkFrame)
      if (!renderedFacialHair) {
        FaceRenderer.drawFacialHair(ctx, centerX, baseY, dir, facialHair, facialHairColor)
      }
    }
    drawCustomComponent(avatar.customComponents?.facialHair)

    // ==========================================
    // 9. HAIRSTYLES (Messy, Anime, Long, Curls, Twin-Tails, etc.)
    // ==========================================
    if (hairStyle !== 'none') {
      const renderedHair = this.drawAtlasPart(ctx, px, py, bodyBob, size, dir, 'hair', hairStyle, walkFrame)
      if (!renderedHair) {
        HairRenderer.drawHair(ctx, centerX, baseY, dir, hairStyle, hairColor)
      }
    }
    drawCustomComponent(avatar.customComponents?.hair)

    // ==========================================
    // 10. GLASSES (Round, Square, Sunglasses, Wireframe)
    // ==========================================
    if (glassesType !== 'none') {
      const renderedGlasses = this.drawAtlasPart(ctx, px, py, bodyBob, size, dir, 'glasses', glassesType, walkFrame)
      if (!renderedGlasses) {
        AccessoryRenderer.drawGlasses(ctx, centerX, baseY, dir, glassesType, glassesColor)
      }
    }
    drawCustomComponent(avatar.customComponents?.glasses)

    // ==========================================
    // 11. HATS & HAIR ACCESSORIES (Ribbon Bow, Cap, Beanie, Headband)
    // ==========================================
    if (hatType !== 'none') {
      const renderedHat = this.drawAtlasPart(ctx, px, py, bodyBob, size, dir, 'hat', hatType, walkFrame)
      if (!renderedHat) {
        AccessoryRenderer.drawHat(ctx, centerX, baseY, dir, hatType, hatColor)
      }
    }
    drawCustomComponent(avatar.customComponents?.hat)

    // ==========================================
    // 12. OTHER (Headphones, Mask, Star Badge)
    // ==========================================
    if (otherType !== 'none') {
      const renderedOther = this.drawAtlasPart(ctx, px, py, bodyBob, size, dir, 'other', otherType, walkFrame)
      if (!renderedOther) {
        AccessoryRenderer.drawOther(ctx, centerX, baseY, dir, otherType, otherColor)
      }
    }
    drawCustomComponent(avatar.customComponents?.other)

    // ==========================================
    // 13. NAME TAG BADGE (Floating above head)
    // ==========================================
    if (showNameTag) {
      NameTagRenderer.drawNameTag(ctx, player, isLocal, centerX, py - 13)
    }

    ctx.restore()
  }
}

