/**
 * Idle / AFK Presence Manager
 * Detects OS-level mouse and keyboard inactivity via Electron's powerMonitor.getSystemIdleTime()
 * with browser event fallback. After 5 minutes (300 seconds) of inactivity, automatically switches
 * player status to "Ausente (AFK)" with "💤" emoji. Automatically restores previous status on return.
 */

import { useGameStore } from '../store/useGameStore'
import { PeerManager } from '../p2p/PeerManager'
import { PresenceStatus } from '../types/game'

export const IDLE_TIMEOUT_SECONDS = 300 // 5 minutes

interface PreviousStatus {
  status: PresenceStatus
  statusText?: string
  statusEmoji?: string
}

class IdleManager {
  private static instance: IdleManager | null = null
  private timer: ReturnType<typeof setInterval> | null = null
  private lastDomActivityTime = Date.now()
  private isAutoAway = false
  private previousStatus: PreviousStatus | null = null
  private listenersAttached = false

  private constructor() {}

  public static getInstance(): IdleManager {
    if (!IdleManager.instance) {
      IdleManager.instance = new IdleManager()
    }
    return IdleManager.instance
  }

  public start() {
    if (this.timer) return

    this.attachDomActivityListeners()

    // Poll every 3 seconds
    this.timer = setInterval(async () => {
      await this.checkIdleStatus()
    }, 3000)
  }

  public stop() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  public resetForTesting() {
    this.isAutoAway = false
    this.previousStatus = null
    this.lastDomActivityTime = Date.now()
  }

  public markUserActive() {
    this.lastDomActivityTime = Date.now()
    const { localPlayer } = useGameStore.getState()
    const isAfk =
      this.isAutoAway ||
      localPlayer.status === 'away' ||
      localPlayer.statusText === 'Ausente (AFK)' ||
      localPlayer.statusEmoji === '💤'

    if (isAfk) {
      this.restoreActiveStatus()
    }
  }

  private attachDomActivityListeners() {
    if (this.listenersAttached || typeof window === 'undefined') return
    this.listenersAttached = true

    const markActive = () => this.markUserActive()

    // Use capture phase so stopped propagation on inner elements doesn't swallow user activity
    window.addEventListener('mousemove', markActive, { passive: true, capture: true })
    window.addEventListener('keydown', markActive, { passive: true, capture: true })
    window.addEventListener('pointerdown', markActive, { passive: true, capture: true })
    window.addEventListener('wheel', markActive, { passive: true, capture: true })
    window.addEventListener('focus', markActive, { passive: true, capture: true })
    window.addEventListener('touchstart', markActive, { passive: true, capture: true })
  }

  /**
   * Retrieves the current idle seconds from Electron's powerMonitor or DOM fallback.
   */
  public async getIdleSeconds(): Promise<number> {
    const electronAPI = (window as any).electronAPI
    if (electronAPI?.getSystemIdleTime) {
      try {
        const osIdle = await electronAPI.getSystemIdleTime()
        if (typeof osIdle === 'number') {
          return osIdle
        }
      } catch (err) {
        console.debug('[IdleManager] Failed to get OS idle time:', err)
      }
    }

    // Fallback: DOM idle seconds
    return Math.floor((Date.now() - this.lastDomActivityTime) / 1000)
  }

  public async checkIdleStatus() {
    const idleSeconds = await this.getIdleSeconds()
    const { localPlayer, setLocalStatus } = useGameStore.getState()

    if (idleSeconds >= IDLE_TIMEOUT_SECONDS) {
      if (!this.isAutoAway && localPlayer.status !== 'away') {
        // Record previous status before going AFK, ensuring it's not already away
        const prevStatus = localPlayer.status
        const prevText =
          localPlayer.statusText === 'Ausente (AFK)' ? 'Disponível' : (localPlayer.statusText || 'Disponível')
        const prevEmoji = localPlayer.statusEmoji === '💤' ? '' : (localPlayer.statusEmoji || '')

        this.previousStatus = {
          status: prevStatus,
          statusText: prevText,
          statusEmoji: prevEmoji,
        }
        this.isAutoAway = true
        // Pass persist = false so auto AFK is never saved permanently into localStorage
        setLocalStatus('away', 'Ausente (AFK)', '💤', false)
        try {
          PeerManager.getInstance().sendPlayerUpdate({
            status: 'away',
            statusText: 'Ausente (AFK)',
            statusEmoji: '💤',
          })
        } catch {}
      }
    } else if (idleSeconds < IDLE_TIMEOUT_SECONDS) {
      // If idle time is below timeout and user is marked away, restore active state!
      const isAfk =
        this.isAutoAway ||
        localPlayer.status === 'away' ||
        localPlayer.statusText === 'Ausente (AFK)' ||
        localPlayer.statusEmoji === '💤'

      if (isAfk) {
        this.restoreActiveStatus()
      }
    }
  }

  public restoreActiveStatus() {
    this.isAutoAway = false

    const { setLocalStatus } = useGameStore.getState()
    const prev = this.previousStatus

    // Guarantee that target status is NEVER away / Ausente (AFK)
    const targetStatus = prev?.status && prev.status !== 'away' ? prev.status : 'available'
    const targetText =
      prev?.statusText && prev.statusText !== 'Ausente (AFK)' ? prev.statusText : 'Disponível'
    const targetEmoji = prev?.statusEmoji && prev.statusEmoji !== '💤' ? prev.statusEmoji : ''

    setLocalStatus(targetStatus, targetText, targetEmoji, false)
    try {
      PeerManager.getInstance().sendPlayerUpdate({
        status: targetStatus,
        statusText: targetText,
        statusEmoji: targetEmoji,
      })
    } catch {}

    this.previousStatus = null
  }
}

export const idleManager = IdleManager.getInstance()
