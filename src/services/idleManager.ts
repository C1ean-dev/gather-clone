/**
 * Idle / AFK Presence Manager
 * Detects OS-level mouse and keyboard inactivity via Electron's powerMonitor.getSystemIdleTime()
 * with browser event fallback. After 5 minutes (300 seconds) of inactivity, automatically switches
 * player status to "Ausente (AFK)" with "💤" emoji. Automatically restores previous status on return.
 */

import { useGameStore } from '../store/useGameStore'
import { PeerManager } from '../p2p/PeerManager'
import { PresenceInfo, sanitizePresence } from '../types/game'

export const IDLE_TIMEOUT_SECONDS = 300 // 5 minutes

class IdleManager {
  private static instance: IdleManager | null = null
  private timer: ReturnType<typeof setInterval> | null = null
  private lastDomActivityTime = Date.now()
  private isAutoAway = false
  private previousStatus: PresenceInfo | null = null
  private listenersAttached = false
  private storeSubscribed = false

  private constructor() {
    this.subscribeToStoreChanges()
  }

  public static getInstance(): IdleManager {
    if (!IdleManager.instance) {
      IdleManager.instance = new IdleManager()
    }
    return IdleManager.instance
  }

  private subscribeToStoreChanges() {
    if (this.storeSubscribed) return
    this.storeSubscribed = true

    useGameStore.subscribe((state) => {
      // If the user's status is changed to anything other than the transient auto-away,
      // cancel any active auto-away flag so explicit manual choices are never overwritten.
      if (
        this.isAutoAway &&
        state.localPlayer.statusText !== 'Ausente (AFK)' &&
        state.localPlayer.statusEmoji !== '💤'
      ) {
        this.cancelAutoAway()
      }
    })
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

  public cancelAutoAway() {
    this.isAutoAway = false
    this.previousStatus = null
  }

  /**
   * Identifies whether the current user is in transient auto-away (AFK).
   * Note: Explicit manual choice of 'away' (with statusText 'Ausente') is deliberately
   * excluded so that user activity does not overwrite manual status choices.
   */
  public isAfk(): boolean {
    const { localPlayer } = useGameStore.getState()
    return (
      this.isAutoAway ||
      localPlayer.statusText === 'Ausente (AFK)' ||
      localPlayer.statusEmoji === '💤'
    )
  }

  public markUserActive() {
    this.lastDomActivityTime = Date.now()
    if (this.isAfk()) {
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
        // Record previous status before going AFK, ensuring it's not away
        this.previousStatus = sanitizePresence(localPlayer)
        this.isAutoAway = true
        const awayPresence: PresenceInfo = {
          status: 'away',
          statusText: 'Ausente (AFK)',
          statusEmoji: '💤',
        }
        // Pass persist = false so auto AFK is never saved permanently into localStorage
        setLocalStatus(awayPresence, false)
        try {
          PeerManager.getInstance().sendPlayerUpdate(awayPresence)
        } catch {}
      }
    } else if (idleSeconds < IDLE_TIMEOUT_SECONDS) {
      // If idle time is below timeout and user is marked away, restore active state!
      if (this.isAfk()) {
        this.restoreActiveStatus()
      }
    }
  }

  public restoreActiveStatus() {
    this.isAutoAway = false

    const { setLocalStatus } = useGameStore.getState()
    const targetPresence = sanitizePresence(this.previousStatus)

    setLocalStatus(targetPresence, false)
    try {
      PeerManager.getInstance().sendPlayerUpdate(targetPresence)
    } catch {}

    this.previousStatus = null
  }
}

export const idleManager = IdleManager.getInstance()
