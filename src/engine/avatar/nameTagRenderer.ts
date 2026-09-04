import { Player } from '../../types/game'
import { useGameStore } from '../../store/useGameStore'

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
   *
   * When `player.callState === 'connecting'`, the status dot pulses amber and
   * the label gets a "connecting…" badge so users see the WebRTC handshake
   * happening instead of a frozen / delayed avatar.
   */
  static drawNameTag(
    ctx: CanvasRenderingContext2D,
    player: Player,
    isLocal: boolean,
    centerX: number,
    tagY: number
  ) {
    const callState =
      (player.id && useGameStore.getState().callStates[player.id]) || player.callState || 'idle'
    const isConnecting = callState === 'connecting'

    const baseLabel = player.name || 'Player'
    const label = isConnecting ? `${baseLabel} •••` : baseLabel

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

    ctx.strokeStyle = isLocal
      ? '#38bdf8'
      : isConnecting
        ? '#f59e0b'
        : '#334155'
    ctx.lineWidth = 1.0
    ctx.stroke()

    // Presence dot
    let statusColor = '#22c55e'
    if (isConnecting) {
      // Pulsing amber while WebRTC ICE/codec handshake runs.
      const t = (Date.now() % 900) / 900
      const pulse = 0.45 + Math.abs(Math.sin(t * Math.PI)) * 0.55
      ctx.globalAlpha = pulse
      statusColor = '#f59e0b'
    } else if (player.status === 'busy') statusColor = '#ef4444'
    else if (player.status === 'focusing') statusColor = '#a855f7'
    else if (player.status === 'away') statusColor = '#f59e0b'

    ctx.fillStyle = statusColor
    ctx.beginPath()
    ctx.arc(pillX + 5.5, pillY + pillH / 2, 2.2, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1

    // Text name
    ctx.fillStyle = isConnecting ? '#fde68a' : '#ffffff'
    ctx.fillText(label, pillX + 10.5, pillY + 9.2)
  }
}
