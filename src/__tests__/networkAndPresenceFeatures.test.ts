import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  useNetworkQualityStore,
  calculateRating,
} from '../store/useNetworkQualityStore'
import { idleManager, IDLE_TIMEOUT_SECONDS } from '../services/idleManager'
import {
  sendNotification,
  playNotificationSound,
} from '../services/notificationService'
import { useGameStore } from '../store/useGameStore'

describe('Indicador de Qualidade de Rede (Network Quality Store)', () => {
  beforeEach(() => {
    useNetworkQualityStore.getState().clearAll()
  })

  it('calculates ratings accurately based on ping, loss, and jitter', () => {
    // Low latency, zero loss -> excellent
    expect(calculateRating(25, 0, 5)).toBe('excellent')

    // Moderate ping or loss -> good
    expect(calculateRating(100, 1, 10)).toBe('good')
    expect(calculateRating(40, 3, 10)).toBe('good')

    // High ping or loss -> poor
    expect(calculateRating(200, 2, 20)).toBe('poor')
    expect(calculateRating(50, 8, 20)).toBe('poor')

    // Critical conditions -> bad
    expect(calculateRating(400, 0, 20)).toBe('bad')
    expect(calculateRating(50, 20, 20)).toBe('bad')
    expect(calculateRating(50, 0, 120)).toBe('bad')
  })

  it('stores local and per-peer network qualities and cleans up disconnected peers', () => {
    const store = useNetworkQualityStore.getState()

    store.setLocalQuality({ pingMs: 35, lossPct: 0, jitterMs: 4 })
    expect(useNetworkQualityStore.getState().localQuality.rating).toBe('excellent')
    expect(useNetworkQualityStore.getState().localQuality.pingMs).toBe(35)

    store.setPeerQuality('peer-1', { pingMs: 180, lossPct: 6, jitterMs: 15 })
    expect(useNetworkQualityStore.getState().peerQualities['peer-1']?.rating).toBe('poor')

    store.setPeerQuality('peer-2', { pingMs: 25, lossPct: 0, jitterMs: 2 })
    expect(useNetworkQualityStore.getState().peerQualities['peer-2']?.rating).toBe('excellent')

    // Remove disconnected peer
    store.removePeerQuality('peer-1')
    expect(useNetworkQualityStore.getState().peerQualities['peer-1']).toBeUndefined()
    expect(useNetworkQualityStore.getState().peerQualities['peer-2']).toBeDefined()
  })
})

describe('Status de Presença Automático (Idle / AFK Presence Manager)', () => {
  beforeEach(() => {
    idleManager.stop()
    idleManager.resetForTesting()
    useGameStore.setState({
      localPlayer: {
        ...useGameStore.getState().localPlayer,
        status: 'available',
        statusText: 'Disponível',
        statusEmoji: '💻',
      },
    })
  })

  it('automatically sets status to Ausente (AFK) with 💤 after 5 minutes of inactivity', async () => {
    // Mock getIdleSeconds to simulate 301 seconds of inactivity
    vi.spyOn(idleManager, 'getIdleSeconds').mockResolvedValue(IDLE_TIMEOUT_SECONDS + 1)

    // Trigger internal idle check
    await (idleManager as any).checkIdleStatus()

    const localPlayer = useGameStore.getState().localPlayer
    expect(localPlayer.status).toBe('away')
    expect(localPlayer.statusText).toBe('Ausente (AFK)')
    expect(localPlayer.statusEmoji).toBe('💤')
  })

  it('automatically restores the previous status when the user returns', async () => {
    // 1. Go idle
    vi.spyOn(idleManager, 'getIdleSeconds').mockResolvedValue(IDLE_TIMEOUT_SECONDS + 5)
    await (idleManager as any).checkIdleStatus()

    expect(useGameStore.getState().localPlayer.status).toBe('away')

    // 2. User returns (idle time drops to 0 seconds)
    vi.spyOn(idleManager, 'getIdleSeconds').mockResolvedValue(0)
    await (idleManager as any).checkIdleStatus()

    const restoredPlayer = useGameStore.getState().localPlayer
    expect(restoredPlayer.status).toBe('available')
    expect(restoredPlayer.statusText).toBe('Disponível')
    expect(restoredPlayer.statusEmoji).toBe('💻')
  })
})

describe('Notificações Nativas do Windows & Som de Chamada (Notification Service)', () => {
  beforeEach(() => {
    // Mock global window and document
    ;(globalThis as any).window = {
      AudioContext: vi.fn().mockImplementation(() => ({
        currentTime: 0,
        state: 'running',
        createOscillator: () => ({
          type: 'triangle',
          frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
          connect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn(),
        }),
        createGain: () => ({
          gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
          connect: vi.fn(),
        }),
        destination: {},
      })),
      electronAPI: {},
    }
    ;(globalThis as any).document = {
      hasFocus: () => false,
      hidden: true,
    }
  })

  it('plays synthesized notification sounds without throwing errors', () => {
    expect(() => playNotificationSound('knock')).not.toThrow()
    expect(() => playNotificationSound('message')).not.toThrow()
    expect(() => playNotificationSound('call')).not.toThrow()
  })

  it('triggers native Windows notification when window is blurred or in background', async () => {
    const showMock = vi.fn().mockResolvedValue({ ok: true })
    ;(globalThis as any).window.electronAPI = {
      showNativeNotification: showMock,
    }

    let approved = false
    await sendNotification({
      title: 'Batida na Porta - Lira',
      body: 'Carlos está pedindo para entrar na sala.',
      soundType: 'knock',
      tag: 'test-knock',
      actions: [{ type: 'button', text: 'Permitir' }],
      onAction: (index) => {
        if (index === 0) approved = true
      },
    })

    expect(showMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Batida na Porta - Lira',
        body: 'Carlos está pedindo para entrar na sala.',
        tag: 'test-knock',
      })
    )
  })
})
