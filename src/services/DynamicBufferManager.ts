import { useMediaStore } from '../store/useMediaStore'
import { MediaCallHandler } from '../p2p/mediaCalls'
import { PeerManager } from '../p2p/PeerManager'

export interface QualityProfile {
  resolution: '480p' | '720p' | '1080p'
  fps: number
}

/**
 * Per-track RTCStats snapshot. We keep one of these per (peerId, kind) so the
 * adaptive logic can compute deltas (drops/s, jitter trend) instead of acting
 * on instantaneous single samples that are noisy and would over-correct.
 */
interface TrackStatsSnapshot {
  framesDropped: number
  framesReceived: number
  packetsLost: number
  packetsReceived: number
  jitterSec: number
  timestamp: number
}

/**
 * One adaptive buffer entry. We hold TWO of these per kind (audio + video)
 * so each pipeline can shrink/grow independently based on its own network
 * condition. The previous design used ONE number for everything, which made
 * audio "ride along" on video quality decisions and produce the 2-3s lag.
 */
export interface AdaptiveBuffer {
  /** Current jitter buffer target in ms (what we feed WebRTC). */
  currentMs: number
  /** Lowest we will let this kind of track fall to (no point below this). */
  floorMs: number
  /** Highest we will let this kind of track grow to (latency ceiling). */
  ceilingMs: number
  /** Number of consecutive clean samples — used to slowly relax the buffer. */
  cleanSamples: number
  /** Last computed target (for hysteresis, prevents flapping). */
  lastTargetMs: number
}

export const DYNAMIC_BUFFER_DEFAULT: Record<'audio' | 'video', AdaptiveBuffer> = {
  audio: {
    // Floor = 1ms. WebRTC's playoutDelayHint accepts 1ms increments on all
    // major browsers (Chromium, Firefox, Safari 17+). Starting at the
    // absolute minimum lets the adaptive loop grow organically from real
    // network measurements instead of paying 40-80ms of latency "just in
    // case" on every call.
    currentMs: 1,
    floorMs: 1,
    ceilingMs: 500,
    cleanSamples: 0,
    lastTargetMs: 1,
  },
  video: {
    currentMs: 1,
    floorMs: 1,
    ceilingMs: 1500,
    cleanSamples: 0,
    lastTargetMs: 1,
  },
}

export class DynamicBufferManager {
  private static instance: DynamicBufferManager | null = null
  private monitorInterval: any = null

  /** Per-(peerId, kind) RTC stats history used for delta-based decisions. */
  private lastStats: Map<string, TrackStatsSnapshot> = new Map()

  /** Per-kind adaptive state. */
  private buffers: Record<'audio' | 'video', AdaptiveBuffer> = {
    audio: { ...DYNAMIC_BUFFER_DEFAULT.audio },
    video: { ...DYNAMIC_BUFFER_DEFAULT.video },
  }

  /** Set true once we have at least one successful evaluation — UI shows it. */
  private hasEvaluatedOnce = false

  /** Public read-only access for tests / debugging. */
  public getBuffers(): Record<'audio' | 'video', AdaptiveBuffer> {
    return this.buffers
  }

  private constructor() {
    this.startMonitoring()
  }

  public static getInstance(): DynamicBufferManager {
    if (!DynamicBufferManager.instance) {
      DynamicBufferManager.instance = new DynamicBufferManager()
    }
    return DynamicBufferManager.instance
  }

  /**
   * Force a baseline reset — called whenever a brand-new MediaConnection is
   * established. We start at the floor and let the network tell us how much
   * we actually need (instead of pre-loading 3 seconds "just in case").
   */
  public resetForNewCall() {
    this.buffers.audio = { ...DYNAMIC_BUFFER_DEFAULT.audio }
    this.buffers.video = { ...DYNAMIC_BUFFER_DEFAULT.video }
    this.lastStats.clear()
    this.hasEvaluatedOnce = false
  }

  /**
   * @deprecated Kept for backwards compat with tests / external callers.
   * The new model is network-driven, not quality-driven, so this just
   * returns the 1ms floor — the adaptive loop will grow from there if
   * the network actually needs more.
   */
  public static calculateBaseBufferForQuality(_width?: number, _height?: number, _fps: number = 30): number {
    return 1
  }

  public startMonitoring() {
    if (this.monitorInterval) return
    // Sample every 1.5s. WebRTC `getStats()` is async and a tight loop
    // (e.g. 250ms) wastes CPU without giving meaningfully different numbers
    // — jitter and packet-loss only shift on the order of hundreds of ms.
    this.monitorInterval = setInterval(async () => {
      await this.evaluateAndAdjustBuffer()
    }, 1500)
  }

  public stopMonitoring() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval)
      this.monitorInterval = null
    }
  }

  /**
   * Read all peer connections' RTCStats and adapt audio + video jitter
   * buffers to the LOWEST value that absorbs current network conditions.
   *
   * Algorithm (per kind, audio and video independently):
   *   1. Aggregate observed jitter (max across peers) and packet-loss
   *      ratio (max across peers, smoothed over the last sample window).
   *   2. Target = max(observedJitter * SAFETY, baseForQuality) + lossPenalty.
   *      - SAFETY = 2.5x covers the worst-case gap-arrival scenario; the
          previous hard-coded 3000ms was 60-100x the typical 30-50ms jitter.
   *      - lossPenalty scales with loss ratio (capped to ceiling).
   *   3. If current is below target: grow immediately (under-buffering
   *      causes stutter, which is more annoying than added delay).
   *   4. If current is above target AND we've had >=3 clean samples:
   *      relax by 15ms per clean sample (slow decay so we don't flap).
   *   5. Clamp to [floor, ceiling] and apply via MediaCallHandler.
   */
  public async evaluateAndAdjustBuffer(): Promise<{ audio: number; video: number }> {
    const store = useMediaStore.getState()
    if (store.liveBufferMode === 'manual') {
      return { audio: this.buffers.audio.currentMs, video: this.buffers.video.currentMs }
    }

    const peerManager = PeerManager.getInstance()
    const mediaCalls = peerManager.getMediaCalls()
    if (!mediaCalls || mediaCalls.size === 0) {
      // No active calls — keep the buffer at floor so the next call starts
      // with no latency penalty. No measurements exist, so report zeros.
      this.applyToStore(store, this.buffers.audio.currentMs, this.buffers.video.currentMs, 0, 0)
      return { audio: this.buffers.audio.currentMs, video: this.buffers.video.currentMs }
    }

    // Accumulators per kind (audio and video are tracked independently).
    let maxJitterAudioMs = 0
    let maxJitterVideoMs = 0
    let maxLossRatioAudio = 0
    let maxLossRatioVideo = 0
    let hasAudio = false
    let hasVideo = false
    let maxVideoFps = 0
    let maxVideoWidth = 0
    let maxVideoHeight = 0

    const now = Date.now()

    for (const [peerId, call] of mediaCalls.entries()) {
      const pc = (call as any).peerConnection as RTCPeerConnection
      if (!pc || !pc.getStats) continue

      try {
        const stats = await pc.getStats()
        stats.forEach((report) => {
          if (report.type !== 'inbound-rtp') return
          const kind: 'audio' | 'video' | undefined = (report as any).kind
          if (kind !== 'audio' && kind !== 'video') return

          const key = `${peerId}:${kind}`
          const prev = this.lastStats.get(key)

          const jitterSec = (report.jitter as number) || 0
          const jitterMs = jitterSec * 1000
          const packetsLost = (report.packetsLost as number) || 0
          const packetsReceived = (report.packetsReceived as number) || 0
          const framesDropped = (report.framesDropped as number) || 0
          const framesReceived =
            ((report.framesReceived as number) || 0) + ((report.framesDecoded as number) || 0)
          const fps = (report.framesPerSecond as number) || 0
          const width = (report.frameWidth as number) || 0
          const height = (report.frameHeight as number) || 0

          // Loss ratio over the LAST sample window (delta), not cumulative.
          // Cumulative loss is meaningless after 10 minutes — it just grows.
          let lossRatio = 0
          if (prev) {
            const deltaLost = Math.max(0, packetsLost - prev.packetsLost)
            const deltaRecv = Math.max(0, packetsReceived - prev.packetsReceived)
            const total = deltaLost + deltaRecv
            if (total > 0) lossRatio = deltaLost / total
          }

          if (kind === 'audio') {
            hasAudio = true
            if (jitterMs > maxJitterAudioMs) maxJitterAudioMs = jitterMs
            if (lossRatio > maxLossRatioAudio) maxLossRatioAudio = lossRatio
          } else {
            hasVideo = true
            if (jitterMs > maxJitterVideoMs) maxJitterVideoMs = jitterMs
            if (lossRatio > maxLossRatioVideo) maxLossRatioVideo = lossRatio
            if (fps > maxVideoFps) maxVideoFps = fps
            if (width > maxVideoWidth) maxVideoWidth = width
            if (height > maxVideoHeight) maxVideoHeight = height
          }

          this.lastStats.set(key, {
            framesDropped,
            framesReceived,
            packetsLost,
            packetsReceived,
            jitterSec,
            timestamp: now,
          })
        })
      } catch (err) {
        // Stats can throw on closed connections — safe to skip.
      }
    }

    // Adapt AUDIO buffer
    if (hasAudio) {
      this.adaptBuffer('audio', maxJitterAudioMs, maxLossRatioAudio, 0, 0, 0)
    } else {
      // No audio receivers: relax audio back to floor so it's ready for next call.
      this.buffers.audio.currentMs = this.buffers.audio.floorMs
      this.buffers.audio.lastTargetMs = this.buffers.audio.floorMs
      this.buffers.audio.cleanSamples = 0
    }

    // Adapt VIDEO buffer
    if (hasVideo) {
      // Frame budget: at 60fps a frame is 16.6ms; at 30fps it's 33ms.
      // We need at least one frame plus jitter headroom. The previous code
      // assumed 3 seconds here unconditionally.
      const frameMs = maxVideoFps > 0 ? 1000 / maxVideoFps : 16.6
      this.adaptBuffer('video', maxJitterVideoMs, maxLossRatioVideo, frameMs, maxVideoWidth, maxVideoHeight)
    } else {
      this.buffers.video.currentMs = this.buffers.video.floorMs
      this.buffers.video.lastTargetMs = this.buffers.video.floorMs
      this.buffers.video.cleanSamples = 0
    }

    const audioMs = this.buffers.audio.currentMs
    const videoMs = this.buffers.video.currentMs

    // Apply to every active receiver. We pass BOTH audio + video numbers so
    // each pipeline is independently capped — `applyReceiverBuffer` clamps
    // them to their own ceilings.
    MediaCallHandler.applyJitterBuffer(mediaCalls, videoMs, audioMs)

    // Persist via setAdaptiveBuffers (NO live-buffer event) so PeerManager
    // doesn't re-apply a video-only value on top and clobber `audioMs`.
    const peakJitter = Math.max(maxJitterAudioMs, maxJitterVideoMs)
    const peakLossPct = Math.max(maxLossRatioAudio, maxLossRatioVideo) * 100
    this.applyToStore(store, audioMs, videoMs, peakJitter, peakLossPct)
    this.hasEvaluatedOnce = true

    return { audio: audioMs, video: videoMs }
  }

  /**
   * Core adaptation loop for one media kind.
   *
   * Starts from the FLOOR (1ms) and grows only when network measurements
   * (jitter + packet loss) require it. On a clean LAN the buffer stays
   * near 1ms; on a jittery link it grows to whatever's needed to absorb
   * the gap arrivals.
   *
   * `jitterMs` is the max observed inter-arrival jitter across all peers of
   * this kind. `lossRatio` is the max delta-window packet-loss ratio.
   * `frameMs` is the video frame duration (audio passes 0).
   */
  private adaptBuffer(
    kind: 'audio' | 'video',
    jitterMs: number,
    lossRatio: number,
    frameMs: number,
    width: number,
    height: number
  ) {
    const buf = this.buffers[kind]

    // Target = safety headroom over observed jitter + frame + loss penalty.
    // SAFETY=2.5 because RFC 3550 jitter is a 1-sigma estimate; worst-case
    // packet can be 2-3 sigma late on a healthy connection.
    const SAFETY = 2.5
    const jitterTarget = jitterMs * SAFETY
    const frameTarget = frameMs > 0 ? frameMs * 1.5 : 0
    // Loss penalty: every 1% loss adds 30ms (linear, capped at 500ms).
    const lossPenalty = Math.min(500, Math.round(lossRatio * 100 * 30))
    // Add a tiny startup headroom (5ms) so the very first packet doesn't
    // land exactly at the 1ms floor on a just-opened connection; this gets
    // absorbed back toward 1ms after the first clean sample.
    const startupHeadroom = buf.cleanSamples === 0 ? 5 : 0
    const target = Math.round(
      Math.max(jitterTarget + frameTarget, buf.floorMs) + lossPenalty + startupHeadroom
    )

    // Clamp target to ceiling.
    const clampedTarget = Math.min(buf.ceilingMs, Math.max(buf.floorMs, target))

    // Decide whether to grow, hold, or relax.
    if (clampedTarget > buf.currentMs) {
      // Need more buffer — grow IMMEDIATELY (under-buffering = stutter).
      // On the very first sample we step directly to the target instead of
      // creeping, because there's no history to interpolate from.
      if (buf.cleanSamples === 0 && buf.currentMs === buf.floorMs) {
        buf.currentMs = clampedTarget
      } else {
        // Grow at most 50ms per sample to avoid oscillation.
        buf.currentMs = Math.min(clampedTarget, buf.currentMs + 50)
      }
      buf.cleanSamples = 0
    } else if (clampedTarget < buf.currentMs) {
      // Have headroom — wait for sustained clean network before relaxing.
      // Because the floor is 1ms we need MORE clean samples before relaxing,
      // so the buffer doesn't flap back down the instant the network hiccup
      // is over.
      const relaxThreshold = kind === 'audio' ? 8 : 6
      buf.cleanSamples++
      if (buf.cleanSamples >= relaxThreshold) {
        // Relax by 5ms per clean sample, but not below target. Hysteresis
        // via lastTargetMs prevents rapid flapping between floor and target.
        const next = Math.max(clampedTarget, buf.currentMs - 5)
        buf.currentMs = Math.max(next, Math.min(buf.currentMs, buf.lastTargetMs))
        if (buf.currentMs === clampedTarget) buf.lastTargetMs = clampedTarget
      }
    } else {
      // Exactly at target — clean sample, reset counter.
      buf.cleanSamples++
      // Aggressive relax when sitting at target for many samples — the
      // network has been clean, so nibble back toward the floor.
      const nibbleThreshold = kind === 'audio' ? 5 : 8
      if (buf.cleanSamples >= nibbleThreshold && buf.currentMs > buf.floorMs) {
        buf.currentMs = Math.max(buf.floorMs, buf.currentMs - 2)
      }
    }

    // Final clamp.
    buf.currentMs = Math.max(buf.floorMs, Math.min(buf.ceilingMs, Math.round(buf.currentMs)))
  }

  private applyToStore(
    store: ReturnType<typeof useMediaStore.getState>,
    audioMs: number,
    videoMs: number,
    jitterMs: number,
    lossPct: number
  ) {
    // Mirror into the legacy single-number field so the settings slider
    // keeps working — but via setAdaptiveBuffers (no event dispatch, so
    // PeerManager can't clobber the audio value we just applied).
    store.setAdaptiveBuffers(audioMs, videoMs, jitterMs, lossPct)
  }
}
