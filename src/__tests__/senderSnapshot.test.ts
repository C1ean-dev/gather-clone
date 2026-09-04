import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { MediaCallHandler } from '../p2p/mediaCalls'
import { diagStats, __resetDiagForTests } from '../utils/diagnosticLogger'

const tick = () => new Promise<void>((r) => setTimeout(r, 0))

function fakePc() {
  return {
    getSenders: () => [
      { track: { kind: 'audio', enabled: true, readyState: 'live', id: 'audio-track-id-abcdef123456' } },
      { track: { kind: 'video', enabled: true, readyState: 'live', id: 'video-track-id-abcdef123456' } },
    ],
    getStats: async () =>
      new Map<string, any>([
        ['out-a', { type: 'outbound-rtp', kind: 'audio', bytesSent: 111, packetsSent: 7 }],
        ['out-v', { type: 'outbound-rtp', kind: 'video', bytesSent: 22222, packetsSent: 99, framesSent: 12 }],
        ['in-v', { type: 'inbound-rtp', kind: 'video', bytesReceived: 1 }],
        ['cand', { type: 'candidate-pair', state: 'succeeded' }],
      ]),
    addEventListener: vi.fn(),
  }
}

describe('logSenderSnapshot', () => {
  beforeEach(() => __resetDiagForTests())
  afterEach(() => __resetDiagForTests())

  it('logs sender-state synchronously and sender-stats after getStats resolves', async () => {
    const calls = new Map<string, any>([{ peerConnection: fakePc() }].map((c) => ['peer-1', c]))
    MediaCallHandler.logSenderSnapshot(calls, 'camera-on')
    // sender-state is sync; sender-stats needs the getStats microtask.
    expect(diagStats().buffered).toBe(1)
    await tick()
    await tick()
    expect(diagStats().buffered).toBe(2)
  })

  it('skips calls without a usable PeerConnection', async () => {
    const calls = new Map<string, any>([
      ['no-pc', {}],
      ['broken', { peerConnection: { getSenders: () => { throw new Error('x') } } }],
    ])
    MediaCallHandler.logSenderSnapshot(calls, 'mute-off')
    await tick()
    expect(diagStats().buffered).toBe(0)
  })
})

describe('watchRemoteTracks', () => {
  beforeEach(() => __resetDiagForTests())
  afterEach(() => __resetDiagForTests())

  it('logs arrival once per track and every mute/unmute/ended transition', () => {
    const pc = fakePc()
    MediaCallHandler.watchRemoteTracks(pc as unknown as RTCPeerConnection, 'peer-9', 'in')
    const trackListener = pc.addEventListener.mock.calls.find((c) => c[0] === 'track')?.[1] as (
      evt: unknown
    ) => void
    expect(trackListener).toBeDefined()

    const track = {
      kind: 'video',
      muted: true,
      readyState: 'live',
      id: 'remote-video-track-id-xyz987',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }
    trackListener({ track })
    expect(diagStats().buffered).toBe(1) // remote-track arrival

    // Same track firing 'track' again must not duplicate arrival nor listeners.
    trackListener({ track })
    expect(diagStats().buffered).toBe(1)
    expect(track.addEventListener).toHaveBeenCalledTimes(3) // mute+unmute+ended once

    const unmute = track.addEventListener.mock.calls.find((c) => c[0] === 'unmute')?.[1] as () => void
    unmute()
    expect(diagStats().buffered).toBe(2) // remote-track-state
  })
})
