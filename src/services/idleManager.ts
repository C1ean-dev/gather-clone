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

  private attachDomActivityListeners() {
    if (this.listenersAttached || typeof window === 'undefined') return
    this.listenersAttached = true

    const markActive = () => {
      this.lastDomActivityTime = Date.now()
      if (this.isAutoAway) {
        this.restoreActiveStatus()
      }
    }

    window.addEventListener('mousemove', markActive, { passive: true })
    window.addEventListener('keydown', markActive, { passive: true })
    window.addEventListener('pointerdown', markActive, { passive: true })
    window.addEventListener('wheel', markActive, { passive: true })
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

  private async checkIdleStatus() {
    const idleSeconds = await this.getIdleSeconds()
    const { localPlayer, setLocalStatus } = useGameStore.getState()

    if (idleSeconds >= IDLE_TIMEOUT_SECONDS) {
      if (!this.isAutoAway) {
        // Record previous status before going AFK
        this.previousStatus = {
          status: localPlayer.status,
          statusText: localPlayer.statusText,
          statusEmoji: localPlayer.statusEmoji,
        }
        this.isAutoAway = true
        setLocalStatus('away', 'Ausente (AFK)', '💤')
        try {
          PeerManager.getInstance().sendPlayerUpdate({
            status: 'away',
            statusText: 'Ausente (AFK)',
            statusEmoji: '💤',
          })
        } catch {}
      }
    } else if (this.isAutoAway && idleSeconds < 10) {
      this.restoreActiveStatus()
    }
  }

  private restoreActiveStatus() {
    if (!this.isAutoAway) return
    this.isAutoAway = false

    const { setLocalStatus } = useGameStore.getState()
    const restored = this.previousStatus || {
      status: 'available' as PresenceStatus,
      statusText: 'Disponível',
      statusEmoji: '',
    }

    setLocalStatus(restored.status, restored.statusText, restored.statusEmoji)
    try {
      PeerManager.getInstance().sendPlayerUpdate({
        status: restored.status,
        statusText: restored.statusText,
        statusEmoji: restored.statusEmoji,
      })
    } catch {}

    this.previousStatus = null
  }
}

export const idleManager = IdleManager.getInstance()
