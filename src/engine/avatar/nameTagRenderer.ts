import { Player } from '../../types/game'

const textWidthCache = new Map<string, number>()

function measureLabelWidth(
  ctx: CanvasRenderingContext2D,
  label: string,
  font: string
): number {
  const cached = textWidthCache.get(label)
  if (cached !== undefined) return cached
  ctx.font = font
  const w = ctx.measureText(label).width
  // Bound growth (usernames are low-cardinality, but cap anyway).
  if (textWidthCache.size > 500) textWidthCache.clear()
  textWidthCache.set(label, w)
  return w
}

export class NameTagRenderer {
  /**
   * Draw Gather Pill Name Tag (Compact & Sleek)
   */
  static drawNameTag(
    ctx: CanvasRenderingContext2D,
    player: Player,
    isLocal: boolean,
    centerX: number,
    tagY: number
  ) {
    const label = player.name || 'Player'
    const font = 'bold 7.5px Inter, sans-serif'
    const textW = measureLabelWidth(ctx, label, font)
    ctx.font = font
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
