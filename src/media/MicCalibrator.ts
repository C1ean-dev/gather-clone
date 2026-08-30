/**
 * MicCalibrator — measures ambient noise floor for ~3 seconds and
 * recommends the best engine + sensitivity for the user's environment.
 *
 * The calibration is intentionally lightweight: it spins up its own
 * AudioContext + AnalyserNode, reads RMS samples every animation frame
 * for the requested duration, and derives three numbers:
 *
 *   - noiseFloorDb  : median RMS in dBFS during silence (lower = quieter room)
 *   - peakRmsDb     : loudest frame (so we can detect that the user spoke)
 *   - snrDb         : peakRmsDb - noiseFloorDb (signal-to-noise estimate)
 *
 * From those it picks:
 *
 *   - 'rnnoise' when the room is loud (noise floor > -45 dBFS, SNR < 22 dB).
 *     Neural denoiser dramatically outperforms DSP in noisy environments.
 *   - 'soft'   when the room is medium (-60 to -45 dBFS).
 *   - 'classic' when the room is quiet (< -60 dBFS) — no point burning CPU.
 *
 * It also suggests a sensitivity threshold percent in [10..35] mapped to
 * the existing 'manual' slider so the DSP engines don't false-trigger on
 * a noisy baseline.
 */
export interface CalibrationResult {
  noiseFloorDb: number
  peakRmsDb: number
  snrDb: number
  recommendedMode: 'classic' | 'soft' | 'rnnoise'
  recommendedSensitivity: number // 0..100, fed to manualThresholdPercent
  durationMs: number // how long we actually measured (may be less if aborted)
}

export interface CalibrationProgress {
  elapsedMs: number
  totalMs: number
  currentRmsDb: number
  done: boolean
  result: CalibrationResult | null
}

const DEFAULT_DURATION_MS = 5000
const ANALYSER_FFT = 1024

export class MicCalibrator {
  private audioCtx: AudioContext | null = null
  private source: MediaStreamAudioSourceNode | null = null
  private analyser: AnalyserNode | null = null
  private stream: MediaStream | null = null
  private aborted = false

  /**
   * Run the calibration against the given raw mic stream. Reports progress
   * via the optional callback (roughly every animation frame) and resolves
   * with the final CalibrationResult.
   */
  public async calibrate(
    inputStream: MediaStream,
    durationMs: number = DEFAULT_DURATION_MS,
    onProgress?: (p: CalibrationProgress) => void
  ): Promise<CalibrationResult> {
    this.dispose()
    this.aborted = false

    const audioTrack = inputStream.getAudioTracks()[0]
    if (!audioTrack) {
      throw new Error('No audio track in the provided stream')
    }

    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext
    this.audioCtx = new AudioContextClass({ sampleRate: 48000 })
    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume().catch(() => {})
    }
    // Re-wrap the input stream so disposing it doesn't kill the user's mic.
    this.stream = new MediaStream([audioTrack])
    this.source = this.audioCtx.createMediaStreamSource(this.stream)
    this.analyser = this.audioCtx.createAnalyser()
    this.analyser.fftSize = ANALYSER_FFT
    this.analyser.smoothingTimeConstant = 0.1
    this.source.connect(this.analyser)

    const buffer = new Float32Array(this.analyser.fftSize)
    const samples: number[] = []
    const start = performance.now()
    let peakRms = 0

    return new Promise<CalibrationResult>((resolve) => {
      const tick = () => {
        if (this.aborted || !this.analyser) {
          const result = this.buildResult(samples, peakRms, performance.now() - start)
          this.dispose()
          resolve(result)
          return
        }

        this.analyser.getFloatTimeDomainData(buffer)
        let sum = 0
        for (let i = 0; i < buffer.length; i++) sum += buffer[i] * buffer[i]
        const rms = Math.sqrt(sum / buffer.length)
        samples.push(rms)
        if (rms > peakRms) peakRms = rms

        const elapsed = performance.now() - start
        const currentDb = rms > 0 ? 20 * Math.log10(rms) : -120

        if (onProgress) {
          onProgress({
            elapsedMs: elapsed,
            totalMs: durationMs,
            currentRmsDb: currentDb,
            done: elapsed >= durationMs,
            result: null,
          })
        }

        if (elapsed >= durationMs) {
          const result = this.buildResult(samples, peakRms, elapsed)
          this.dispose()
          if (onProgress) {
            onProgress({
              elapsedMs: elapsed,
              totalMs: durationMs,
              currentRmsDb: currentDb,
              done: true,
              result,
            })
          }
          resolve(result)
          return
        }
        requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    })
  }

  public abort() {
    this.aborted = true
  }

  /**
   * Derive the recommendation from the collected RMS samples.
   *
   * The noise floor is approximated by the *median* of the lower-half of
   * samples (assumes the user was mostly quiet during the 3s window). If
   * they spoke loudly during calibration we still get a usable estimate
   * because the median ignores spikes.
   */
  private buildResult(
    samples: number[],
    peakRms: number,
    elapsedMs: number
  ): CalibrationResult {
    if (samples.length === 0) {
      return {
        noiseFloorDb: -100,
        peakRmsDb: -100,
        snrDb: 0,
        recommendedMode: 'classic',
        recommendedSensitivity: 20,
        durationMs: elapsedMs,
      }
    }

    // Lower-half median = robust noise floor estimate.
    const sorted = [...samples].sort((a, b) => a - b)
    const lowerHalf = sorted.slice(0, Math.max(1, Math.floor(sorted.length / 2)))
    const median = lowerHalf[Math.floor(lowerHalf.length / 2)] || 0.0001
    const noiseFloorDb = median > 0 ? 20 * Math.log10(median) : -120
    const peakRmsDb = peakRms > 0 ? 20 * Math.log10(peakRms) : -120
    const snrDb = Math.max(0, peakRmsDb - noiseFloorDb)

    let recommendedMode: 'classic' | 'soft' | 'rnnoise'
    if (noiseFloorDb > -45) {
      // Loud room: vent, traffic, keyboard.
      recommendedMode = 'rnnoise'
    } else if (noiseFloorDb > -60) {
      // Medium room: gentle hum.
      recommendedMode = 'soft'
    } else {
      // Quiet room: home / headset in a closed space.
      recommendedMode = 'classic'
    }

    // Map noise floor to sensitivity slider. Higher noise → higher
    // threshold so voice isn't mistakenly gated.
    const sensitivity = Math.round(
      Math.max(10, Math.min(35, (noiseFloorDb + 90) * 0.8))
    )

    return {
      noiseFloorDb,
      peakRmsDb,
      snrDb,
      recommendedMode,
      recommendedSensitivity: Number.isFinite(sensitivity) ? sensitivity : 20,
      durationMs: elapsedMs,
    }
  }

  public dispose() {
    try {
      this.source?.disconnect()
    } catch {}
    try {
      this.analyser?.disconnect()
    } catch {}
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close().catch(() => {})
    }
    this.source = null
    this.analyser = null
    this.stream = null
    this.audioCtx = null
  }
}