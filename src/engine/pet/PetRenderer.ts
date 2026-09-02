import { Direction, PetConfig, PetType } from '../../types/game'
import { TILE_SIZE } from '../Constants'
import { PetState } from './PetManager'
import { getCustomAssetImage, useCustomAssetsStore } from '../../store/useCustomAssetsStore'

const MEOWTH_SPRITE_URL =
  '/assets/avatar/5660688_738696_lazy91_meowth-sprite-sheet.fff89e386a74ef7fd067b8f49695f124.png'

const MEOWTH_FRAMES: Record<Direction, { x: number; y: number; w: number; h: number }[]> = {
  down: [
    { x: 0, y: 32, w: 80, h: 80 },
    { x: 0, y: 112, w: 80, h: 80 },
    { x: 80, y: 32, w: 80, h: 80 },
    { x: 80, y: 112, w: 80, h: 80 },
  ],
  up: [
    { x: 160, y: 32, w: 80, h: 80 },
    { x: 160, y: 112, w: 80, h: 80 },
  ],
  left: [{ x: 240, y: 112, w: 80, h: 80 }],
  right: [{ x: 240, y: 32, w: 80, h: 80 }],
}

let meowthImg: HTMLImageElement | null = null
const getMeowthImage = (): HTMLImageElement => {
  if (!meowthImg && typeof Image !== 'undefined') {
    meowthImg = new Image()
    meowthImg.src = MEOWTH_SPRITE_URL
  }
  return meowthImg!
}

export class PetRenderer {
  public static drawPet(
    ctx: CanvasRenderingContext2D,
    pet: PetState,
    petConfig: PetConfig,
    currentTime: number,
    showNameTag: boolean = true
  ) {
    if (!petConfig || petConfig.type === 'none') return

    const px = pet.x * TILE_SIZE
    const py = pet.y * TILE_SIZE

    ctx.save()

    // 1. Draw Specific Model (Built-in or Custom Hand-drawn/Sliced)
    if (petConfig.type === 'custom' || petConfig.directionalFrames || petConfig.customAssetId) {
      this.drawCustomPet(ctx, px, py, pet, petConfig, currentTime)
    } else {
      switch (petConfig.type) {
        case 'meowth':
          this.drawMeowth(ctx, px, py, pet, currentTime)
          break
        case 'dog':
          this.drawDog(ctx, px, py, pet, petConfig, currentTime)
          break
        case 'cat':
          this.drawCat(ctx, px, py, pet, petConfig, currentTime)
          break
        case 'slime':
          this.drawSlime(ctx, px, py, pet, petConfig, currentTime)
          break
        case 'chick':
          this.drawChick(ctx, px, py, pet, petConfig, currentTime)
          break
      }
    }

    // 3. Floating Name Tag & Heart Badge
    if (showNameTag) {
      this.drawNameTag(ctx, px, py, petConfig, currentTime)
    }

    ctx.restore()
  }

  /**
   * 1. Official Meowth Overworld Sprite
   */
  private static drawMeowth(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    pet: PetState,
    currentTime: number
  ) {
    const img = getMeowthImage()
    if (!img || !img.complete || img.naturalWidth === 0) {
      // Fallback while loading
      this.drawCat(ctx, px, py, pet, { type: 'cat' }, currentTime)
      return
    }

    const dirFrames = MEOWTH_FRAMES[pet.direction] || MEOWTH_FRAMES.down
    const frameIdx = pet.isMoving ? pet.walkFrame % dirFrames.length : 0
    const frame = dirFrames[frameIdx] || dirFrames[0]

    const bob = pet.isMoving ? Math.sin(currentTime / 100) * 1.5 : Math.sin(currentTime / 400) * 0.8
    const petSize = 26
    const drawX = px + 16 - petSize / 2
    const drawY = py + 26 - petSize + bob

    ctx.drawImage(img, frame.x, frame.y, frame.w, frame.h, drawX, drawY, petSize, petSize)
  }

  /**
   * 2. Pixel Art Dog with floppy ears and animated wagging tail
   */
  private static drawDog(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    pet: PetState,
    config: PetConfig,
    currentTime: number
  ) {
    const furColor = config.color || '#d97706'
    const earColor = '#92400e'
    const chestColor = '#fef3c7'
    const collarColor = '#ef4444'

    const bob = pet.isMoving ? Math.sin(currentTime / 90) * 2 : Math.sin(currentTime / 350) * 0.8
    const cx = px + 16
    const cy = py + 22 + bob

    ctx.save()
    if (pet.direction === 'left') {
      ctx.translate(cx, 0)
      ctx.scale(-1, 1)
      ctx.translate(-cx, 0)
    }

    // Wagging tail
    const tailWag = Math.sin(currentTime / 70) * 0.4
    ctx.save()
    ctx.translate(cx - 7, cy - 2)
    ctx.rotate(tailWag - 0.4)
    ctx.fillStyle = earColor
    ctx.beginPath()
    ctx.roundRect(-4, -6, 4, 7, 2)
    ctx.fill()
    ctx.restore()

    // Body
    ctx.fillStyle = furColor
    ctx.beginPath()
    ctx.roundRect(cx - 7, cy - 6, 14, 10, 4)
    ctx.fill()

    // Chest patch
    ctx.fillStyle = chestColor
    ctx.beginPath()
    ctx.roundRect(cx - 1, cy - 4, 6, 6, 2)
    ctx.fill()

    // Collar
    ctx.fillStyle = collarColor
    ctx.fillRect(cx + 2, cy - 6, 3, 4)
    // Gold bell
    ctx.fillStyle = '#f59e0b'
    ctx.beginPath()
    ctx.arc(cx + 3.5, cy - 1.5, 1.2, 0, Math.PI * 2)
    ctx.fill()

    // Head
    ctx.fillStyle = furColor
    ctx.beginPath()
    ctx.roundRect(cx + 1, cy - 12, 10, 9, 3)
    ctx.fill()

    // Floppy ear
    const earBounce = pet.isMoving ? Math.sin(currentTime / 90) * 0.2 : 0
    ctx.save()
    ctx.translate(cx + 3, cy - 12)
    ctx.rotate(earBounce)
    ctx.fillStyle = earColor
    ctx.beginPath()
    ctx.roundRect(-2, 0, 4, 7, 2)
    ctx.fill()
    ctx.restore()

    // Snout and nose
    ctx.fillStyle = chestColor
    ctx.beginPath()
    ctx.roundRect(cx + 7, cy - 8, 5, 5, 2)
    ctx.fill()
    ctx.fillStyle = '#1e1b4b'
    ctx.fillRect(cx + 10, cy - 8, 2, 2)

    // Eye
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(cx + 5, cy - 10, 2, 2)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(cx + 5, cy - 10, 1, 1)

    // Paws with walk cycle
    const pawStep1 = pet.isMoving ? Math.sin(currentTime / 90) * 3 : 0
    const pawStep2 = pet.isMoving ? -Math.sin(currentTime / 90) * 3 : 0
    ctx.fillStyle = earColor
    ctx.fillRect(cx - 5 + pawStep1, cy + 3, 3, 3)
    ctx.fillRect(cx + 3 + pawStep2, cy + 3, 3, 3)

    ctx.restore()
  }

  /**
   * 3. Pixel Art Cat with pointed ears and animated curling tail
   */
  private static drawCat(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    pet: PetState,
    config: PetConfig,
    currentTime: number
  ) {
    const furColor = config.color || '#475569'
    const chestColor = '#f8fafc'
    const innerEarColor = '#fda4af'

    const bob = pet.isMoving ? Math.sin(currentTime / 80) * 1.8 : Math.sin(currentTime / 380) * 0.6
    const cx = px + 16
    const cy = py + 22 + bob

    ctx.save()
    if (pet.direction === 'left') {
      ctx.translate(cx, 0)
      ctx.scale(-1, 1)
      ctx.translate(-cx, 0)
    }

    // Curved swishing tail
    const tailSwish = Math.sin(currentTime / 180) * 0.35
    ctx.save()
    ctx.translate(cx - 6, cy - 2)
    ctx.rotate(tailSwish - 0.6)
    ctx.strokeStyle = furColor
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.quadraticCurveTo(-4, -6, -2, -10)
    ctx.stroke()
    ctx.restore()

    // Body
    ctx.fillStyle = furColor
    ctx.beginPath()
    ctx.roundRect(cx - 6, cy - 5, 12, 9, 4)
    ctx.fill()

    // White belly
    ctx.fillStyle = chestColor
    ctx.beginPath()
    ctx.roundRect(cx - 1, cy - 3, 5, 5, 2)
    ctx.fill()

    // Head
    ctx.fillStyle = furColor
    ctx.beginPath()
    ctx.roundRect(cx + 1, cy - 11, 9, 8, 3)
    ctx.fill()

    // Pointy Ears
    ctx.fillStyle = furColor
    ctx.beginPath()
    ctx.moveTo(cx + 2, cy - 11)
    ctx.lineTo(cx + 4, cy - 16)
    ctx.lineTo(cx + 6, cy - 11)
    ctx.fill()

    ctx.beginPath()
    ctx.moveTo(cx + 6, cy - 11)
    ctx.lineTo(cx + 8, cy - 16)
    ctx.lineTo(cx + 10, cy - 11)
    ctx.fill()

    // Inner pink ear
    ctx.fillStyle = innerEarColor
    ctx.beginPath()
    ctx.moveTo(cx + 3, cy - 11)
    ctx.lineTo(cx + 4, cy - 14)
    ctx.lineTo(cx + 5, cy - 11)
    ctx.fill()

    // Eyes (emerald green cat eyes)
    ctx.fillStyle = '#10b981'
    ctx.fillRect(cx + 5, cy - 9, 2, 2.5)
    ctx.fillStyle = '#064e3b'
    ctx.fillRect(cx + 6, cy - 9, 1, 2.5)

    // Pink nose
    ctx.fillStyle = '#f43f5e'
    ctx.fillRect(cx + 9, cy - 7, 1.5, 1.5)

    // Whiskers
    ctx.strokeStyle = '#cbd5e1'
    ctx.lineWidth = 0.8
    ctx.beginPath()
    ctx.moveTo(cx + 8, cy - 6)
    ctx.lineTo(cx + 13, cy - 7)
    ctx.moveTo(cx + 8, cy - 5)
    ctx.lineTo(cx + 13, cy - 4)
    ctx.stroke()

    // Paws
    const pawStep1 = pet.isMoving ? Math.sin(currentTime / 80) * 2.5 : 0
    const pawStep2 = pet.isMoving ? -Math.sin(currentTime / 80) * 2.5 : 0
    ctx.fillStyle = chestColor
    ctx.fillRect(cx - 4 + pawStep1, cy + 3, 2.5, 2.5)
    ctx.fillRect(cx + 3 + pawStep2, cy + 3, 2.5, 2.5)

    ctx.restore()
  }

  /**
   * 4. Bouncy Kawaii Slime with squish & stretch physics
   */
  private static drawSlime(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    pet: PetState,
    config: PetConfig,
    currentTime: number
  ) {
    const slimeColor = config.color || '#10b981'
    const isHopping = pet.isMoving
    const hop = isHopping ? Math.abs(Math.sin(currentTime / 110)) * 6 : Math.sin(currentTime / 350) * 1.5

    // Squish & Stretch factor
    const stretch = isHopping ? (hop / 6) * 0.35 : 0.08 * Math.sin(currentTime / 350)
    const scaleX = 1 - stretch
    const scaleY = 1 + stretch

    const cx = px + 16
    const cy = py + 23 - hop

    ctx.save()
    ctx.translate(cx, cy)
    ctx.scale(scaleX, scaleY)

    // Outer Slime Jelly
    ctx.fillStyle = slimeColor
    ctx.beginPath()
    ctx.arc(0, -2, 9, Math.PI, 0, false)
    ctx.quadraticCurveTo(9, 6, 0, 6)
    ctx.quadraticCurveTo(-9, 6, -9, -2)
    ctx.fill()

    // Inner glowing core
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)'
    ctx.beginPath()
    ctx.ellipse(0, 0, 6, 4.5, 0, 0, Math.PI * 2)
    ctx.fill()

    // Specular shine dot
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(-3, -5, 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(-5, -2, 1, 0, Math.PI * 2)
    ctx.fill()

    // Kawaii Eyes
    const lookOffset = pet.direction === 'left' ? -2 : pet.direction === 'right' ? 2 : 0
    ctx.fillStyle = '#064e3b'
    ctx.beginPath()
    ctx.arc(-3 + lookOffset, 0, 1.8, 0, Math.PI * 2)
    ctx.arc(3 + lookOffset, 0, 1.8, 0, Math.PI * 2)
    ctx.fill()

    // Eye catchlights
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(-3.5 + lookOffset, -0.6, 0.7, 0, Math.PI * 2)
    ctx.arc(2.5 + lookOffset, -0.6, 0.7, 0, Math.PI * 2)
    ctx.fill()

    // Pink blush
    ctx.fillStyle = 'rgba(244, 63, 94, 0.5)'
    ctx.beginPath()
    ctx.ellipse(-5 + lookOffset, 2, 1.5, 1, 0, 0, Math.PI * 2)
    ctx.ellipse(5 + lookOffset, 2, 1.5, 1, 0, 0, Math.PI * 2)
    ctx.fill()

    ctx.restore()
  }

  /**
   * 5. Tiny Chick that hops and flaps wings
   */
  private static drawChick(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    pet: PetState,
    config: PetConfig,
    currentTime: number
  ) {
    const bodyColor = config.color || '#facc15'
    const beakColor = '#f97316'

    const hop = pet.isMoving ? Math.abs(Math.sin(currentTime / 90)) * 5 : Math.sin(currentTime / 280) * 0.8
    const cx = px + 16
    const cy = py + 23 - hop

    ctx.save()
    if (pet.direction === 'left') {
      ctx.translate(cx, 0)
      ctx.scale(-1, 1)
      ctx.translate(-cx, 0)
    }

    // Little round body
    ctx.fillStyle = bodyColor
    ctx.beginPath()
    ctx.arc(cx, cy - 3, 7.5, 0, Math.PI * 2)
    ctx.fill()

    // Flapping wing
    const wingAngle = pet.isMoving ? Math.sin(currentTime / 60) * 0.45 : 0
    ctx.save()
    ctx.translate(cx - 2, cy - 3)
    ctx.rotate(wingAngle)
    ctx.fillStyle = '#eab308'
    ctx.beginPath()
    ctx.ellipse(0, 0, 4, 2.5, -0.2, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    // Cute beak
    ctx.fillStyle = beakColor
    ctx.beginPath()
    ctx.moveTo(cx + 6, cy - 4)
    ctx.lineTo(cx + 10, cy - 2.5)
    ctx.lineTo(cx + 6, cy - 1)
    ctx.fill()

    // Big round eye
    ctx.fillStyle = '#1e1b4b'
    ctx.beginPath()
    ctx.arc(cx + 3.5, cy - 4.5, 1.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(cx + 3, cy - 5, 0.6, 0, Math.PI * 2)
    ctx.fill()

    // Little feet
    ctx.fillStyle = beakColor
    ctx.fillRect(cx - 2, cy + 4, 2, 2)
    ctx.fillRect(cx + 2, cy + 4, 2, 2)

    ctx.restore()
  }

  /**
   * Floating Name Tag & Heart Particles
   */
  private static drawNameTag(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    petConfig: PetConfig,
    currentTime: number
  ) {
    const petName = petConfig.name?.trim() || this.getDefaultPetName(petConfig.type)
    if (!petName) return

    ctx.save()
    const tagText = `🐾 ${petName}`
    ctx.font = 'bold 9px sans-serif'
    const textW = ctx.measureText(tagText).width
    const tagW = textW + 10
    const tagH = 13
    const tagX = px + 16 - tagW / 2
    const tagY = py + 2

    // Dark sleek backdrop pill
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)'
    ctx.beginPath()
    ctx.roundRect(tagX, tagY, tagW, tagH, 6)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'
    ctx.lineWidth = 1
    ctx.stroke()

    // Text
    ctx.fillStyle = '#ffffff'
    ctx.fillText(tagText, tagX + 5, tagY + 9.5)

    // Occasional subtle floating heart when happy
    const heartCycle = (currentTime % 4000) / 4000
    if (heartCycle < 0.25) {
      const heartY = tagY - 3 - heartCycle * 14
      const alpha = 1 - heartCycle / 0.25
      ctx.fillStyle = `rgba(244, 63, 94, ${alpha})`
      ctx.font = '10px serif'
      ctx.fillText('❤️', tagX + tagW / 2 - 4, heartY)
    }

    ctx.restore()
  }

  public static getDefaultPetName(type: string): string {
    switch (type) {
      case 'meowth':
        return 'Meowth'
      case 'dog':
        return 'Cachorrinho'
      case 'cat':
        return 'Gatinho'
      case 'slime':
        return 'Slime'
      case 'chick':
        return 'Pintinho'
      default:
        return 'Pet'
    }
  }

  /**
   * Draw Custom Pet created via Pixel Art Studio or Spritesheet Slicer
   */
  private static drawCustomPet(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    pet: PetState,
    config: PetConfig,
    currentTime: number
  ) {
    let directionalFrames = config.directionalFrames
    if (!directionalFrames && config.customAssetId) {
      const asset = useCustomAssetsStore
        .getState()
        .customAssets.find((a) => a.id === config.customAssetId)
      if (asset?.directionalFrames) {
        directionalFrames = asset.directionalFrames
      } else if (asset?.frames?.length) {
        directionalFrames = {
          down: asset.frames[0],
          up: asset.frames[1] || asset.frames[0],
          left: asset.frames[2] || asset.frames[0],
          right: asset.frames[3] || asset.frames[0],
        }
      }
    }

    if (!directionalFrames) return

    const dir = pet.direction || 'down'
    const rawFrames = directionalFrames[dir] || directionalFrames.down
    let frameUrl: string | undefined

    if (typeof rawFrames === 'string') {
      frameUrl = rawFrames
    } else if (Array.isArray(rawFrames) && rawFrames.length > 0) {
      if (pet.isMoving) {
        const frameIdx = pet.walkFrame % rawFrames.length
        frameUrl = rawFrames[frameIdx] || rawFrames[0]
      } else {
        frameUrl = rawFrames[0]
      }
    }

    if (!frameUrl) return

    const img = getCustomAssetImage(frameUrl)
    if (!img || !img.complete || img.naturalWidth === 0) return

    const bob = pet.isMoving ? Math.sin(currentTime / 100) * 1.5 : Math.sin(currentTime / 400) * 0.8
    const petSize = 28
    const drawX = px + 16 - petSize / 2
    const drawY = py + 26 - petSize + bob

    ctx.drawImage(img, drawX, drawY, petSize, petSize)
  }

  /**
   * Bakes built-in procedural pets (dog, cat, slime, chick) into 32x32 PNG dataURLs
   * for each direction (down, up, left, right), allowing them to be loaded directly
   * into the Pixel Art Studio editor!
   */
  public static bakeBuiltinPetFrames(petType: PetType, color?: string): Record<Direction, string> {
    const directions: Direction[] = ['down', 'up', 'left', 'right']
    const result: Record<Direction, string> = {
      down: '',
      up: '',
      left: '',
      right: '',
    }

    if (typeof document === 'undefined') return result

    for (const dir of directions) {
      const canvas = document.createElement('canvas')
      canvas.width = 32
      canvas.height = 32
      const ctx = canvas.getContext('2d')
      if (!ctx) continue
      ctx.imageSmoothingEnabled = false

      const fakePet: PetState = {
        playerId: 'bake',
        x: 0,
        y: 0,
        direction: dir,
        isMoving: false,
        walkFrame: 0,
        walkTick: 0,
        history: [],
        idleTime: 0,
      }
      const fakeConfig: PetConfig = {
        type: petType,
        color: color || '#10b981',
      }

      switch (petType) {
        case 'dog':
          this.drawDog(ctx, 0, 4, fakePet, fakeConfig, 0)
          break
        case 'cat':
          this.drawCat(ctx, 0, 4, fakePet, fakeConfig, 0)
          break
        case 'slime':
          this.drawSlime(ctx, 0, 4, fakePet, fakeConfig, 0)
          break
        case 'chick':
          this.drawChick(ctx, 0, 4, fakePet, fakeConfig, 0)
          break
      }

      result[dir] = canvas.toDataURL('image/png')
    }

    return result
  }
}
