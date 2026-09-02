import { useMediaStore } from '../store/useMediaStore'
import { MediaCallHandler } from '../p2p/mediaCalls'
import { PeerManager } from '../p2p/PeerManager'

export interface QualityProfile {
  resolution: '480p' | '720p' | '1080p'
  fps: number
}

export class DynamicBufferManager {
  private static instance: DynamicBufferManager | null = null
  private monitorInterval: any = null
  private lastStats: Map<string, { framesDropped: number; framesReceived: number; timestamp: number }> = new Map()
  private cleanIntervalsCount: number = 0

  // Clamped limits: min 200ms, max 5000ms (5.0s)
  public static readonly MIN_BUFFER_MS = 200
  public static readonly MAX_BUFFER_MS = 5000

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
   * Calculates the required buffer based on the target quality profile
   * e.g., 1080p 60fps requires ~3000ms (3.0s) to guarantee fluid delivery without stutter
   */
  public static calculateBaseBufferForQuality(width?: number, height?: number, fps: number = 30): number {
    const totalPixels = (width || 1920) * (height || 1080)

    if (totalPixels >= 1920 * 1080 * 0.85) {
      // 1080p Full HD
      return fps >= 50 ? 3000 : 2000
    } else if (totalPixels >= 1280 * 720 * 0.85) {
      // 720p HD
      return fps >= 50 ? 1800 : 1200
    } else {
      // 480p SD
      return fps >= 50 ? 1200 : 800
    }
  }

  public startMonitoring() {
    if (this.monitorInterval) return

    this.monitorInterval = setInterval(async () => {
      await this.evaluateAndAdjustBuffer()
    }, 2000)
  }

  public stopMonitoring() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval)
      this.monitorInterval = null
    }
  }

  /**
   * Analyzes real-time WebRTC stats and adaptively adjusts playoutDelayHint up to 5000ms
   */
  public async evaluateAndAdjustBuffer(): Promise<number> {
    const store = useMediaStore.getState()
    if (store.liveBufferMode === 'manual') {
      return store.liveBufferDelay
    }

    const peerManager = PeerManager.getInstance()
    const mediaCalls = peerManager.getMediaCalls()
    if (!mediaCalls || mediaCalls.size === 0) {
      return store.liveBufferDelay
    }

    let detectedWidth = 1920
    let detectedHeight = 1080
    let detectedFps = 60
    let highestJitterMs = 0
    let maxDropRate = 0
    let hasVideoReceiver = false

    const now = Date.now()

    for (const [peerId, call] of mediaCalls.entries()) {
      const pc = (call as any).peerConnection as RTCPeerConnection
      if (!pc || !pc.getStats) continue

      try {
        const stats = await pc.getStats()
        stats.forEach((report) => {
          if (report.type === 'inbound-rtp' && report.kind === 'video') {
            hasVideoReceiver = true
            const framesDropped = report.framesDropped || 0
            const framesReceived = (report.framesReceived || 0) + (report.framesDecoded || 0)
            const jitterSec = report.jitter || 0
            const jitterMs = jitterSec * 1000

            if (jitterMs > highestJitterMs) {
              highestJitterMs = jitterMs
            }

            if (report.frameWidth && report.frameHeight) {
              detectedWidth = report.frameWidth
              detectedHeight = report.frameHeight
            }
            if (report.framesPerSecond) {
              detectedFps = Math.round(report.framesPerSecond)
            }

            const prev = this.lastStats.get(peerId)
            if (prev) {
              const deltaDropped = framesDropped - prev.framesDropped
              const deltaReceived = framesReceived - prev.framesReceived
              if (deltaReceived > 0 && deltaDropped > 0) {
                const dropRate = deltaDropped / (deltaReceived + deltaDropped)
                if (dropRate > maxDropRate) {
                  maxDropRate = dropRate
                }
              }
            }

            this.lastStats.set(peerId, { framesDropped, framesReceived, timestamp: now })
          }
        })
      } catch (err) {
        // Ignore stats errors on closed connections
      }
    }

    if (!hasVideoReceiver) {
      return store.liveBufferDelay
    }

    // 1. Calculate baseline buffer based on expected quality (e.g. 1080p60 => 3000ms)
    const baseBuffer = DynamicBufferManager.calculateBaseBufferForQuality(detectedWidth, detectedHeight, detectedFps)

    let currentBuffer = store.liveBufferDelay || baseBuffer
    let status = 'Fluido (1080p 60fps)'

    // 2. Dynamic adaptation based on packet drops and jitter
    if (maxDropRate > 0.06) {
      // Severe packet drop: aggressively boost buffer by +600ms
      currentBuffer = Math.min(DynamicBufferManager.MAX_BUFFER_MS, currentBuffer + 600)
      this.cleanIntervalsCount = 0
      status = `Adaptativo (+Quedas: ${Math.round(maxDropRate * 100)}%)`
    } else if (maxDropRate > 0.02) {
      // Moderate packet drop: boost buffer by +300ms
      currentBuffer = Math.min(DynamicBufferManager.MAX_BUFFER_MS, currentBuffer + 300)
      this.cleanIntervalsCount = 0
      status = `Adaptativo (+Oscilação)`
    } else if (highestJitterMs > 45) {
      // Network jitter spike
      const jitterBoost = Math.round(highestJitterMs * 4)
      currentBuffer = Math.min(DynamicBufferManager.MAX_BUFFER_MS, Math.max(baseBuffer + jitterBoost, currentBuffer))
      this.cleanIntervalsCount = 0
      status = `Adaptativo (+Jitter: ${Math.round(highestJitterMs)}ms)`
    } else {
      // Clean connection: smoothly relax towards base buffer
      this.cleanIntervalsCount++
      if (this.cleanIntervalsCount >= 3 && currentBuffer > baseBuffer) {
        currentBuffer = Math.max(baseBuffer, currentBuffer - 150)
      }
      status = `Ideal (${detectedWidth}x${detectedHeight} @ ${detectedFps}fps)`
    }

    // Guarantee limits: 200ms to 5000ms (5.0s max)
    const finalBuffer = Math.max(
      DynamicBufferManager.MIN_BUFFER_MS,
      Math.min(DynamicBufferManager.MAX_BUFFER_MS, Math.round(currentBuffer))
    )

    // Apply to WebRTC receivers
    if (finalBuffer !== store.liveBufferDelay) {
      store.setLiveBufferDelay(finalBuffer)
      MediaCallHandler.applyJitterBuffer(mediaCalls, finalBuffer)
    }

    store.setDynamicBufferMetrics({
      calculatedMs: finalBuffer,
      jitterMs: Math.round(highestJitterMs),
      frameDropRate: Math.round(maxDropRate * 100),
      statusText: status,
    })

    return finalBuffer
  }
}
