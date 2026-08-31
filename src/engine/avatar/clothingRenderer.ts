import { Direction } from '../../types/game'

export class ClothingRenderer {
  /**
   * Draw Back Arm (Only for side profile: dir === 'left' || dir === 'right')
   * Drawn behind the torso and legs for authentic 2D depth.
   */
  static drawBackArm(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    baseY: number,
    dir: Direction,
    topType: string,
    topColor: string,
    jacketType: string,
    jacketColor: string,
    skinTone: string,
    walkFrame: number,
    isMoving: boolean
  ) {
    if (dir === 'down' || dir === 'up') return

    const sleeveColor = jacketType !== 'none' ? jacketColor : topType === 'none' ? skinTone : topColor
    const facing = dir === 'right' ? 1 : -1

    let armOffsetX = 0
    let armOffsetY = 0

    if (isMoving) {
      if (walkFrame === 0) {
        // Quadro 1: Início da movimentação - Braço de trás balança para FRENTE (+X)
        armOffsetX = facing * 3
        armOffsetY = 0.5
      } else if (walkFrame === 1 || walkFrame === 3) {
        // Quadros 2 e 4: Continuação / passagem pelo meio
        armOffsetX = 0
        armOffsetY = 0
      } else if (walkFrame === 2) {
        // Quadro 3: Repetição espelhada - Braço de trás balança para TRÁS (-X)
        armOffsetX = -facing * 2.5
        armOffsetY = 0.5
      }
    }

    const armX = centerX + armOffsetX - 1.5
    const armY = baseY - 15 + armOffsetY

    // Shadowed back arm (darkened for depth)
    ctx.save()
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'
    ctx.fillRect(armX - 0.5, armY - 0.5, 4, 10)

    // Arm / Sleeve
    ctx.fillStyle = sleeveColor
    ctx.fillRect(armX, armY, 3.5, 6.5)

    // Hand
    ctx.fillStyle = skinTone
    ctx.fillRect(armX, armY + 6.5, 3.5, 3)
    ctx.restore()
  }

  /**
   * Draw Legs, Bottoms & Shoes with 4-Frame Walk Cycle
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
    walkFrame: number,
    isMoving: boolean,
    skinTone: string = '#ffd1a4'
  ) {
    const facing = dir === 'right' ? 1 : -1
    const legColor = bottomType === 'none' ? skinTone : bottomColor

    if (bottomType === 'kimono_skirt') {
      // Long Hakama / Kimono Skirt
      let skirtW = 16
      let skirtX = centerX - 8
      if (dir === 'left' || dir === 'right') {
        skirtW = 12
        skirtX = centerX - 6
      }

      ctx.fillStyle = bottomColor
      ctx.beginPath()
      ctx.roundRect(skirtX, baseY - 6, skirtW, 9, 2)
      ctx.fill()

      if (dir === 'down') {
        // Floral Cross Pattern on Kimono bottom
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)'
        ctx.fillRect(centerX - 5, baseY - 2, 3, 1)
        ctx.fillRect(centerX - 4, baseY - 3, 1, 3)

        ctx.fillRect(centerX + 2, baseY - 2, 3, 1)
        ctx.fillRect(centerX + 3, baseY - 3, 1, 3)

        ctx.fillRect(centerX - 1, baseY + 1, 3, 1)
        ctx.fillRect(centerX, baseY, 1, 3)
      }

      // Geta / Sandals under skirt
      if (dir === 'down' || dir === 'up') {
        const lShoeY = baseY + 3 + (isMoving && walkFrame === 0 ? 2 : isMoving && walkFrame === 2 ? -1 : 0)
        const rShoeY = baseY + 3 + (isMoving && walkFrame === 2 ? 2 : isMoving && walkFrame === 0 ? -1 : 0)
        this.drawSingleShoe(ctx, centerX - 5, lShoeY, 3.5, shoesType, shoesColor, dir, 'left', skinTone)
        this.drawSingleShoe(ctx, centerX + 1.5, rShoeY, 3.5, shoesType, shoesColor, dir, 'right', skinTone)
      } else {
        // Side View Sandals with 4-frame animation
        if (!isMoving) {
          this.drawSingleShoe(ctx, centerX - 3.5, baseY + 3, 7, shoesType, shoesColor, dir, 'side', skinTone)
        } else if (walkFrame === 0) {
          this.drawSingleShoe(ctx, centerX + (facing * 2.5) - 3, baseY + 3, 6, shoesType, shoesColor, dir, 'side', skinTone)
          this.drawSingleShoe(ctx, centerX - (facing * 3) - 2.5, baseY + 3, 5, shoesType, shoesColor, dir, 'side', skinTone)
        } else if (walkFrame === 1) {
          this.drawSingleShoe(ctx, centerX - 3, baseY + 3, 6, shoesType, shoesColor, dir, 'side', skinTone)
          this.drawSingleShoe(ctx, centerX - (facing * 1.5) - 2, baseY + 1, 4.5, shoesType, shoesColor, dir, 'side', skinTone)
        } else if (walkFrame === 2) {
          this.drawSingleShoe(ctx, centerX - (facing * 3) - 3, baseY + 3, 6, shoesType, shoesColor, dir, 'side', skinTone)
          this.drawSingleShoe(ctx, centerX + (facing * 2.5) - 2.5, baseY + 3, 5, shoesType, shoesColor, dir, 'side', skinTone)
        } else {
          this.drawSingleShoe(ctx, centerX - 3, baseY + 3, 6, shoesType, shoesColor, dir, 'side', skinTone)
          this.drawSingleShoe(ctx, centerX + (facing * 1.5) - 2, baseY + 1, 4.5, shoesType, shoesColor, dir, 'side', skinTone)
        }
      }
      return
    }

    ctx.fillStyle = legColor

    if (dir === 'down' || dir === 'up') {
      let lLegOffset = 0
      let rLegOffset = 0

      if (isMoving) {
        if (walkFrame === 0) {
          lLegOffset = 2
          rLegOffset = -2
        } else if (walkFrame === 2) {
          lLegOffset = -2
          rLegOffset = 2
        }
      }

      // Left Leg
      ctx.fillRect(centerX - 6, baseY - 5, 5, 8 + lLegOffset)
      // Right Leg
      ctx.fillRect(centerX + 1, baseY - 5, 5, 8 + rLegOffset)

      // Inner leg crease line
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)'
      ctx.fillRect(centerX - 1, baseY - 5, 2, 6)

      // Shoes / Feet
      this.drawSingleShoe(ctx, centerX - 7, baseY + 3 + lLegOffset, 6, shoesType, shoesColor, dir, 'left', skinTone)
      this.drawSingleShoe(ctx, centerX + 1, baseY + 3 + rLegOffset, 6, shoesType, shoesColor, dir, 'right', skinTone)
    } else {
      // Side Profile Legs with 4-Frame Walk Cycle
      if (!isMoving) {
        // Idle
        ctx.fillRect(centerX - 3, baseY - 5, 6, 8)
        this.drawSingleShoe(ctx, centerX - 4, baseY + 3, 8, shoesType, shoesColor, dir, 'side', skinTone)
      } else if (walkFrame === 0) {
        // Quadro 1: Início da movimentação
        // Perna de trás (sombra) recuada
        ctx.save()
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)'
        ctx.fillRect(centerX - (facing * 3.5) - 2, baseY - 5, 4.5, 8)
        this.drawSingleShoe(ctx, centerX - (facing * 4) - 2.5, baseY + 3, 6, shoesType, shoesColor, dir, 'side', skinTone)
        ctx.restore()

        // Perna da frente avançada
        ctx.fillStyle = legColor
        ctx.fillRect(centerX + (facing * 2.5) - 2.5, baseY - 5, 5, 8)
        this.drawSingleShoe(ctx, centerX + (facing * 3) - 3.5, baseY + 3, 7, shoesType, shoesColor, dir, 'side', skinTone)
      } else if (walkFrame === 1) {
        // Quadro 2: Continuação do movimento inicial (Passing position)
        // Perna de trás flexionando e passando pelo meio
        ctx.save()
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)'
        ctx.fillRect(centerX - 1.5, baseY - 5, 4.5, 6)
        this.drawSingleShoe(ctx, centerX - 2.5, baseY + 1, 6, shoesType, shoesColor, dir, 'side', skinTone)
        ctx.restore()

        // Perna de apoio firme no centro
        ctx.fillStyle = legColor
        ctx.fillRect(centerX - 2.5, baseY - 5, 5, 8)
        this.drawSingleShoe(ctx, centerX - 3.5, baseY + 3, 7, shoesType, shoesColor, dir, 'side', skinTone)
      } else if (walkFrame === 2) {
        // Quadro 3: Repetição espelhada do Quadro 1
        // Perna de trás avançada
        ctx.save()
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)'
        ctx.fillRect(centerX + (facing * 3) - 2, baseY - 5, 4.5, 8)
        this.drawSingleShoe(ctx, centerX + (facing * 3.5) - 2.5, baseY + 3, 6, shoesType, shoesColor, dir, 'side', skinTone)
        ctx.restore()

        // Perna da frente recuada
        ctx.fillStyle = legColor
        ctx.fillRect(centerX - (facing * 3.5) - 2.5, baseY - 5, 5, 8)
        this.drawSingleShoe(ctx, centerX - (facing * 4) - 3.5, baseY + 3, 7, shoesType, shoesColor, dir, 'side', skinTone)
      } else {
        // Quadro 4: Repetição espelhada do Quadro 2 (Passing position oposta)
        // Perna de apoio (trás) firme no centro
        ctx.save()
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)'
        ctx.fillRect(centerX - 2, baseY - 5, 4.5, 8)
        this.drawSingleShoe(ctx, centerX - 3, baseY + 3, 6, shoesType, shoesColor, dir, 'side', skinTone)
        ctx.restore()

        // Perna da frente flexionando e passando pelo meio
        ctx.fillStyle = legColor
        ctx.fillRect(centerX - 2, baseY - 5, 5, 6)
        this.drawSingleShoe(ctx, centerX - 3, baseY + 1, 7, shoesType, shoesColor, dir, 'side', skinTone)
      }
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
    side: 'left' | 'right' | 'side',
    skinTone: string = '#ffd1a4'
  ) {
    if (shoesType === 'none') {
      // Barefoot / Pés descalços
      ctx.fillStyle = skinTone
      ctx.fillRect(x, y + 1, w, 2.5)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)'
      ctx.fillRect(x, y + 3.5, w, 1)
      return
    }

    if (shoesType === 'sandals') {
      // Exposed foot with colored straps
      ctx.fillStyle = skinTone
      ctx.fillRect(x, y, w, 2)
      ctx.fillStyle = color || '#51cf66'
      ctx.fillRect(x + 1, y, w - 2, 1)
      ctx.fillStyle = '#111111'
      ctx.fillRect(x, y + 2, w, 1)
    } else if (shoesType === 'boots') {
      // Tall boots
      ctx.fillStyle = color || '#212529'
      ctx.fillRect(x, y - 2, w, 5)
      ctx.fillStyle = '#111111'
      ctx.fillRect(x, y + 3, w, 1.5)
    } else {
      // Chunky Sneakers with White Toe Cap and Dark Sole
      ctx.fillStyle = color || '#e03131'
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
   * Draw Torso and Top (Kimono, T-shirt, Sweater, or None)
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
    if (topType === 'none') {
      // Bare Torso with Neutral Skin
      ctx.fillStyle = skinTone
      ctx.beginPath()
      ctx.roundRect(centerX - 7.5, baseY - 16, 15, 12, 2.5)
      ctx.fill()

      if (dir !== 'up') {
        // Subtle collarbone shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)'
        ctx.fillRect(centerX - 4.5, baseY - 14.5, 3, 1)
        ctx.fillRect(centerX + 1.5, baseY - 14.5, 3, 1)

        // Subtle belly button
        ctx.fillRect(centerX - 0.5, baseY - 7, 1, 1)
      }
      return
    }

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
    if (jacketType === 'none') return

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
   * Draw Front Arm (or both arms for down/up directions) with 4-Frame Walk Cycle
   */
  static drawFrontArm(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    baseY: number,
    dir: Direction,
    topType: string,
    topColor: string,
    jacketType: string,
    jacketColor: string,
    skinTone: string,
    walkFrame: number,
    isMoving: boolean
  ) {
    const sleeveColor = jacketType !== 'none' ? jacketColor : topType === 'none' ? skinTone : topColor

    if (dir === 'down' || dir === 'up') {
      let lArmOffset = 0
      let rArmOffset = 0

      if (isMoving) {
        if (walkFrame === 0) {
          lArmOffset = 2
          rArmOffset = -2
        } else if (walkFrame === 2) {
          lArmOffset = -2
          rArmOffset = 2
        }
      }

      // Left Arm
      const lArmY = baseY - 15 + lArmOffset
      ctx.fillStyle = sleeveColor
      ctx.fillRect(centerX - 10.5, lArmY, 3.5, 7) // Sleeve
      ctx.fillStyle = skinTone
      ctx.fillRect(centerX - 10.5, lArmY + 7, 3.5, 3.5) // Hand

      // Right Arm
      const rArmY = baseY - 15 + rArmOffset
      ctx.fillStyle = sleeveColor
      ctx.fillRect(centerX + 7, rArmY, 3.5, 7)
      ctx.fillStyle = skinTone
      ctx.fillRect(centerX + 7, rArmY + 7, 3.5, 3.5)
    } else {
      // Side Profile Front Arm with 4-Frame Walk Cycle
      const facing = dir === 'right' ? 1 : -1
      let armOffsetX = 0
      let armOffsetY = 0

      if (isMoving) {
        if (walkFrame === 0) {
          // Quadro 1: Início da movimentação - Braço da frente balança para TRÁS (-X)
          armOffsetX = -facing * 2.5
          armOffsetY = 0.5
        } else if (walkFrame === 1 || walkFrame === 3) {
          // Quadros 2 e 4: Posição central neutra ao lado do corpo
          armOffsetX = 0
          armOffsetY = 0
        } else if (walkFrame === 2) {
          // Quadro 3: Repetição espelhada - Braço da frente balança para FRENTE (+X)
          armOffsetX = facing * 3
          armOffsetY = 0.5
        }
      }

      const armX = centerX + armOffsetX - 2
      const armY = baseY - 15 + armOffsetY

      // Sleeve / Bare arm
      ctx.fillStyle = sleeveColor
      ctx.fillRect(armX, armY, 4, 7)

      // Hand
      ctx.fillStyle = skinTone
      ctx.fillRect(armX, armY + 7, 3.5, 3.5)
    }
  }

  // Keep drawArms for backward compatibility
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
    this.drawFrontArm(ctx, centerX, baseY, dir, topType, topColor, jacketType, jacketColor, skinTone, 0, false)
  }
}
