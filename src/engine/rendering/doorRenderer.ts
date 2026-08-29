import { PrivateZone, WallType } from '../../types/map'
import { TILE_SIZE } from '../Constants'
import { getZoneWallTheme, ZoneWallTheme } from './wallRenderer'

export class DoorRenderer {
  /**
   * Draw Front Entrance Doorway & Doors for a Private Zone
   */
  static drawFrontDoor(
    ctx: CanvasRenderingContext2D,
    zone: PrivateZone,
    doorStartX: number,
    doorEndX: number,
    frontWallY: number,
    frontWallH: number,
    maxY: number
  ) {
    const doorW = doorEndX - doorStartX
    if (doorW <= 0) return

    const theme = getZoneWallTheme(zone.wallType || 'drywall_white')
    const isLocked = !!zone.isLocked
    const doorH = frontWallH

    ctx.save()

    // -------------------------------------------------------------
    // 1. FLOOR THRESHOLD & WELCOME MAT (Soleira e Capacho)
    // -------------------------------------------------------------
    const thresholdY = maxY - 6
    const thresholdH = 6

    // Dark wooden / metal threshold bar at the floor transition
    ctx.fillStyle = '#1c1917'
    ctx.fillRect(doorStartX - 2, thresholdY, doorW + 4, thresholdH)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'
    ctx.fillRect(doorStartX - 2, thresholdY + thresholdH - 1, doorW + 4, 1)

    // Sleek Zone Welcome Mat / Accent Rug
    const matPadding = Math.min(6, Math.floor(doorW * 0.1))
    const matX = doorStartX + matPadding
    const matW = doorW - matPadding * 2
    const matY = frontWallY + 4
    const matH = doorH - 10

    if (matW > 10 && matH > 8) {
      // Mat border & shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)'
      ctx.fillRect(matX, matY, matW, matH)

      // Mat inner fabric
      ctx.fillStyle = zone.color ? `${zone.color}40` : 'rgba(76, 110, 245, 0.25)'
      ctx.fillRect(matX + 2, matY + 2, matW - 4, matH - 4)

      // Mat border line
      ctx.strokeStyle = zone.color || '#4c6ef5'
      ctx.lineWidth = 1
      ctx.strokeRect(matX + 1.5, matY + 1.5, matW - 3, matH - 3)

      // Tiny welcome chevron / stripe
      ctx.fillStyle = zone.color || '#4c6ef5'
      ctx.fillRect(matX + matW / 2 - 4, matY + matH / 2 - 1, 8, 2)
    }

    // -------------------------------------------------------------
    // 2. DOOR FRAME & LINTEL (Batentes Laterais e Verga Superior)
    // -------------------------------------------------------------
    const frameColor = theme.isWood
      ? '#451a03'
      : theme.isStone
      ? '#1e293b'
      : theme.isGlass
      ? '#0369a1'
      : '#1e293b'

    const trimColor = theme.trimColor || '#ffffff'

    // Left Door Jamb (Batente Esquerdo)
    ctx.fillStyle = frameColor
    ctx.fillRect(doorStartX - 3, frontWallY, 4, doorH)
    ctx.fillStyle = trimColor
    ctx.fillRect(doorStartX - 3, frontWallY, 1, doorH)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)'
    ctx.fillRect(doorStartX, frontWallY, 1, doorH)

    // Right Door Jamb (Batente Direito)
    ctx.fillStyle = frameColor
    ctx.fillRect(doorEndX - 1, frontWallY, 4, doorH)
    ctx.fillStyle = trimColor
    ctx.fillRect(doorEndX + 2, frontWallY, 1, doorH)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)'
    ctx.fillRect(doorEndX - 1, frontWallY, 1, doorH)

    // Top Door Header / Lintel Beam (Verga Superior 3D)
    const lintelH = 8
    ctx.fillStyle = frameColor
    ctx.fillRect(doorStartX - 3, frontWallY, doorW + 6, lintelH)
    // Lintel highlight & shadow
    ctx.fillStyle = trimColor
    ctx.fillRect(doorStartX - 3, frontWallY, doorW + 6, 1.5)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)'
    ctx.fillRect(doorStartX - 3, frontWallY + lintelH - 2, doorW + 6, 2)

    // -------------------------------------------------------------
    // 3. DOOR LEAVES (Portas Abertas vs Portas Fechadas/Trancadas)
    // -------------------------------------------------------------
    if (isLocked) {
      // ==========================================
      // A. LOCKED DOORS (PORTAS FECHADAS COM TRANCA)
      // ==========================================
      const halfW = Math.floor(doorW / 2)
      const leafH = doorH - lintelH

      // Left Door Leaf (Closed)
      this.drawDoorPanel(
        ctx,
        doorStartX,
        frontWallY + lintelH,
        halfW - 1,
        leafH,
        theme,
        'left',
        true
      )

      // Right Door Leaf (Closed)
      this.drawDoorPanel(
        ctx,
        doorStartX + halfW + 1,
        frontWallY + lintelH,
        halfW - 1,
        leafH,
        theme,
        'right',
        true
      )

      // Center Door Seam
      ctx.fillStyle = '#0f172a'
      ctx.fillRect(doorStartX + halfW - 1, frontWallY + lintelH, 2, leafH)

      // Security Lock Badge on center of closed doors
      const lockCenterX = doorStartX + halfW
      const lockCenterY = frontWallY + lintelH + Math.floor(leafH * 0.45)

      // Glowing Lock Plate
      ctx.fillStyle = 'rgba(239, 68, 68, 0.25)'
      ctx.beginPath()
      ctx.arc(lockCenterX, lockCenterY, 9, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = '#ef4444'
      ctx.beginPath()
      ctx.arc(lockCenterX, lockCenterY, 6, 0, Math.PI * 2)
      ctx.fill()

      // Metallic Keyhole / Padlock Icon
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(lockCenterX - 2, lockCenterY - 1, 4, 3)
      ctx.beginPath()
      ctx.arc(lockCenterX, lockCenterY - 2.5, 2, Math.PI, 0)
      ctx.lineWidth = 1.2
      ctx.strokeStyle = '#ffffff'
      ctx.stroke()
    } else {
      // ==========================================
      // B. OPEN DOORS (PORTAS ABERTAS E CONVIDATIVAS)
      // ==========================================
      const openLeafW = Math.min(10, Math.floor(doorW * 0.24))
      const leafH = doorH - lintelH

      // Left Open Door (Recessed against left jamb in 3D angle)
      this.drawDoorPanel(
        ctx,
        doorStartX + 1,
        frontWallY + lintelH,
        openLeafW,
        leafH,
        theme,
        'left',
        false
      )

      // Right Open Door (Recessed against right jamb in 3D angle)
      this.drawDoorPanel(
        ctx,
        doorEndX - openLeafW - 1,
        frontWallY + lintelH,
        openLeafW,
        leafH,
        theme,
        'right',
        false
      )
    }

    ctx.restore()
  }

  /**
   * Helper to draw a single door leaf panel with authentic pixel textures
   */
  private static drawDoorPanel(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    theme: ZoneWallTheme,
    side: 'left' | 'right',
    isClosed: boolean
  ) {
    ctx.save()

    if (theme.isWood) {
      // -------------------------------------------------------------
      // Wood Door (Madeira Nobre com Painéis e Maçaneta Dourada)
      // -------------------------------------------------------------
      ctx.fillStyle = '#78350f'
      ctx.fillRect(x, y, w, h)

      // Wood Grain Border Frame
      ctx.strokeStyle = '#451a03'
      ctx.lineWidth = 1.5
      ctx.strokeRect(x + 0.75, y + 0.75, w - 1.5, h - 1.5)

      // Inner Recessed Wood Panels
      if (w >= 8 && h >= 16) {
        const panelMargin = 3
        const panelW = w - panelMargin * 2
        const upperH = Math.floor((h - 12) * 0.55)
        const lowerH = Math.floor((h - 12) * 0.45)

        // Upper Panel
        ctx.fillStyle = '#92400e'
        ctx.fillRect(x + panelMargin, y + 3, panelW, upperH)
        ctx.strokeStyle = '#451a03'
        ctx.lineWidth = 1
        ctx.strokeRect(x + panelMargin + 0.5, y + 3.5, panelW - 1, upperH - 1)

        // Lower Panel
        ctx.fillStyle = '#92400e'
        ctx.fillRect(x + panelMargin, y + 6 + upperH, panelW, lowerH)
        ctx.strokeRect(x + panelMargin + 0.5, y + 6.5 + upperH, panelW - 1, lowerH - 1)
      }

      // Brass / Gold Handle Knob
      const handleX = side === 'left' ? x + w - 3 : x + 3
      const handleY = y + Math.floor(h * 0.52)
      ctx.fillStyle = '#f59e0b'
      ctx.beginPath()
      ctx.arc(handleX, handleY, 2, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#fef08a'
      ctx.fillRect(handleX - 0.5, handleY - 0.5, 1, 1)
    } else if (theme.isStone) {
      // -------------------------------------------------------------
      // Iron-Studded Medieval / Castle Door (Madeira Rústica + Ferro)
      // -------------------------------------------------------------
      ctx.fillStyle = '#334155'
      ctx.fillRect(x, y, w, h)

      // Vertical Planks
      ctx.fillStyle = '#1e293b'
      for (let px = x + 4; px < x + w - 2; px += 5) {
        ctx.fillRect(px, y, 1, h)
      }

      // Horizontal Iron Reinforcement Straps
      ctx.fillStyle = '#0f172a'
      ctx.fillRect(x, y + 4, w, 3)
      ctx.fillRect(x, y + h - 7, w, 3)

      // Iron Studs (Cravos de ferro)
      ctx.fillStyle = '#94a3b8'
      ctx.fillRect(x + 2, y + 5, 1.5, 1.5)
      ctx.fillRect(x + w - 3.5, y + 5, 1.5, 1.5)
      ctx.fillRect(x + 2, y + h - 6, 1.5, 1.5)
      ctx.fillRect(x + w - 3.5, y + h - 6, 1.5, 1.5)

      // Heavy Iron Ring Handle
      const handleX = side === 'left' ? x + w - 3 : x + 3
      const handleY = y + Math.floor(h * 0.52)
      ctx.strokeStyle = '#94a3b8'
      ctx.lineWidth = 1.2
      ctx.strokeRect(handleX - 1.5, handleY - 2, 3, 4)
    } else {
      // -------------------------------------------------------------
      // Modern Office Glass / Aluminum Door (Vidro Translúcido + Alumínio)
      // -------------------------------------------------------------
      // Dark Aluminum Frame
      ctx.fillStyle = '#1e293b'
      ctx.fillRect(x, y, w, h)

      // Translucent Blue-Tinted Glass Pane
      if (w >= 6 && h >= 10) {
        const glassMargin = 2
        const glassW = w - glassMargin * 2
        const glassH = h - glassMargin * 2

        ctx.fillStyle = 'rgba(186, 230, 253, 0.75)'
        ctx.fillRect(x + glassMargin, y + glassMargin, glassW, glassH)

        // Glass Specular Glint Highlight (Brilho diagonal)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.65)'
        ctx.beginPath()
        ctx.moveTo(x + glassMargin, y + glassMargin + 2)
        ctx.lineTo(x + glassMargin + Math.min(glassW, 6), y + glassMargin)
        ctx.lineTo(x + glassMargin + Math.min(glassW, 8), y + glassMargin)
        ctx.lineTo(x + glassMargin, y + glassMargin + Math.min(glassH, 10))
        ctx.closePath()
        ctx.fill()
      }

      // Vertical Brushed Stainless Steel Push/Pull Bar Handle
      const handleX = side === 'left' ? x + w - 3 : x + 2.5
      const handleY = y + Math.floor(h * 0.35)
      const handleH = Math.floor(h * 0.32)

      ctx.fillStyle = '#f8fafc'
      ctx.fillRect(handleX, handleY, 1.5, handleH)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'
      ctx.fillRect(handleX + 1.5, handleY, 0.5, handleH)
    }

    ctx.restore()
  }

  /**
   * Draw Side Connecting Doorway Arch between adjacent rooms
   */
  static drawSideDoorway(
    ctx: CanvasRenderingContext2D,
    x: number,
    startY: number,
    endY: number,
    theme: ZoneWallTheme,
    side: 'left' | 'right'
  ) {
    const doorH = endY - startY
    if (doorH <= 0) return

    ctx.save()

    const frameColor = theme.isWood ? '#451a03' : '#1e293b'
    const trimColor = theme.trimColor || '#ffffff'

    // Floor threshold transition strip
    ctx.fillStyle = '#1c1917'
    ctx.fillRect(x - 1, startY, 8, doorH)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)'
    ctx.fillRect(x + 1, startY + 2, 4, doorH - 4)

    // Top Doorway Jamb (Batente Superior da Passagem Lateral)
    ctx.fillStyle = frameColor
    ctx.fillRect(x - 1, startY, 8, 4)
    ctx.fillStyle = trimColor
    ctx.fillRect(x - 1, startY, 8, 1)

    // Bottom Doorway Jamb (Batente Inferior da Passagem Lateral)
    ctx.fillStyle = frameColor
    ctx.fillRect(x - 1, endY - 4, 8, 4)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'
    ctx.fillRect(x - 1, endY - 1, 8, 1)

    ctx.restore()
  }
}
