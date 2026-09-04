import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const { FakePeer } = vi.hoisted(() => {
  class FakePeer {
    static instances: FakePeer[] = []
    id: string
    destroyed = false
    destroyedCount = 0
    handlers = new Map<string, ((...args: any[]) => void)[]>()
    constructor(id: string) {
      this.id = id
      FakePeer.instances.push(this)
    }
    on(evt: string, fn: (...args: any[]) => void) {
      const list = this.handlers.get(evt) || []
      list.push(fn)
      this.handlers.set(evt, list)
      return this
    }
    emit(evt: string, ...args: any[]) {
      ;(this.handlers.get(evt) || []).forEach((fn) => fn(...args))
    }
    destroy() {
      this.destroyed = true
      this.destroyedCount += 1
    }
    connect() {
      return { on: () => {}, metadata: {} }
    }
  }
  return { FakePeer }
})

vi.mock('peerjs', () => ({ default: FakePeer }))

import { PeerManager } from '../p2p/PeerManager'
import { diagStats, __resetDiagForTests } from '../utils/diagnosticLogger'
import { useGameStore } from '../store/useGameStore'

const player = () => ({
  ...useGameStore.getState().localPlayer,
  name: 'Tester',
})

describe('room entry (createRoom)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    FakePeer.instances.length = 0
    __resetDiagForTests()
    const pm = PeerManager.getInstance() as any
    pm.peer = null
    pm.roomCode = null
    vi.spyOn(pm, 'startHeartbeat').mockImplementation(() => {})
    vi.spyOn(pm, 'setupPeerListeners').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    __resetDiagForTests()
  })

  it('resolves on open and logs create-begin/create-open', async () => {
    const pm = PeerManager.getInstance()
    const pending = pm.createRoom('code-aaa', player() as any)
    expect(FakePeer.instances).toHaveLength(1)
    FakePeer.instances[0].emit('open', 'gather-v2-CODE-AAA-host')
    await expect(pending).resolves.toBe('CODE-AAA')
    // create-begin + create-open at minimum.
    expect(diagStats().buffered).toBeGreaterThanOrEqual(2)
  })

  it('a stale host timeout never destroys the newer run peer', async () => {
    const pm = PeerManager.getInstance()
    // Run 1 starts and hangs (broker never answers).
    const run1 = pm.createRoom('code-aaa', player() as any)
    // Silence the dangling promise: it must stay pending, never settle.
    let run1Settled: string | null = null
    run1.then(
      () => (run1Settled = 'resolved'),
      () => (run1Settled = 'rejected')
    )
    expect(FakePeer.instances).toHaveLength(1)
    const peerA = FakePeer.instances[0]

    // Run 2 replaces it (fast room switch / retry after guard reset).
    const run2 = pm.createRoom('code-bbb', player() as any)
    // Pre-cleanup of run 2 legitimately destroys the stale peer A.
    expect(peerA.destroyed).toBe(true)
    FakePeer.instances[1].emit('open', 'gather-v2-CODE-BBB-host')
    await expect(run2).resolves.toBe('CODE-BBB')
    const peerB = FakePeer.instances[1]
    const destroysAfterOpen = peerB.destroyedCount

    // Let run 1's 7s host timeout fire: it must not touch peer B...
    await vi.advanceTimersByTimeAsync(8000)
    expect(peerB.destroyedCount).toBe(destroysAfterOpen)
    // ...and must not settle run 1 (run 2 owns the outcome).
    expect(run1Settled).toBeNull()
  })

  it('unavailable-id falls back to joinRoom and logs the error', async () => {
    const pm = PeerManager.getInstance()
    const joinSpy = vi.spyOn(pm, 'joinRoom').mockResolvedValue(undefined)
    const pending = pm.createRoom('code-aaa', player() as any)
    FakePeer.instances[0].emit('error', { type: 'unavailable-id', message: 'ID is taken' })
    await pending
    expect(joinSpy).toHaveBeenCalledTimes(1)
    expect(diagStats().buffered).toBeGreaterThanOrEqual(2) // begin + error
  })
})
