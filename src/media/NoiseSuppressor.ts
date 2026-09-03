import { SensitivityMode } from '../types/audio'

export class NoiseSuppressor {
  private audioCtx: AudioContext | null = null
  private sourceNode: MediaStreamAudioSourceNode | null = null
  private inputGainNode: GainNode | null = null
  private highpassFilter: BiquadFilterNode | null = null
  private notchFilter: BiquadFilterNode | null = null
  private compressor: DynamicsCompressorNode | null = null
  private gateGain: GainNode | null = null
  private analyser: AnalyserNode | null = null
  private destination: MediaStreamAudioDestinationNode | null = null
  private testGainNode: GainNode | null = null

  private animationFrameId: number | null = null
  private onLevelCallback: ((level: number, gateOpen: boolean, rawRms: number) => void) | null = null

  // Sensitivity & Gate Parameters
  private sensitivityMode: SensitivityMode = 'auto'
  private manualThresholdPercent: number = 20
  private currentThreshold: number = 0.015 // Current active RMS threshold
  private dynamicNoiseFloor: number = 0.005 // Auto tracker
  private isGateOpen: boolean = false
  private isSuppressionActive: boolean = true

  constructor() {}

  /**
   * Process an input raw microphone MediaStream and return a noise-suppressed stream
   */
  public processStream(
    inputStream: MediaStream,
    enableSuppression: boolean = true,
    initialInputVolume: number = 100,
    sensitivityMode: SensitivityMode = 'auto',
    manualThresholdPercent: number = 20,
    onAudioLevel?: (level: number, gateOpen: boolean, rawRms: number) => void
  ): MediaStream {
    try {
      this.dispose() // Clean up any previous context

      const audioTrack = inputStream.getAudioTracks()[0]
      if (!audioTrack) return inputStream

      this.onLevelCallback = onAudioLevel || null
      this.sensitivityMode = sensitivityMode
      this.manualThresholdPercent = manualThresholdPercent
      this.isSuppressionActive = enableSuppression

      // Create AudioContext
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      this.audioCtx = new AudioContextClass({ sampleRate: 48000 })

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {})
      }

      this.sourceNode = this.audioCtx.createMediaStreamSource(inputStream)
      this.destination = this.audioCtx.createMediaStreamDestination()

      // 1. Input Gain Node (Microphone software gain, 0% to 200%)
      this.inputGainNode = this.audioCtx.createGain()
      this.inputGainNode.gain.setValueAtTime(initialInputVolume / 100, this.audioCtx.currentTime)

      // 2. Highpass Filter (Cut out fan hum, desk rumble < 90Hz)
      this.highpassFilter = this.audioCtx.createBiquadFilter()
      this.highpassFilter.type = 'highpass'
      this.highpassFilter.frequency.setValueAtTime(90, this.audioCtx.currentTime)
      this.highpassFilter.Q.setValueAtTime(0.7, this.audioCtx.currentTime)

      // 3. High Shelf Filter (Slightly tame harsh high-frequency typing clicks > 6500Hz)
      this.notchFilter = this.audioCtx.createBiquadFilter()
      this.notchFilter.type = 'highshelf'
      this.notchFilter.frequency.setValueAtTime(6500, this.audioCtx.currentTime)
      this.notchFilter.gain.setValueAtTime(-4, this.audioCtx.currentTime)

      // 4. Dynamic Spectral Noise Gate
      this.gateGain = this.audioCtx.createGain()
      this.gateGain.gain.setValueAtTime(1.0, this.audioCtx.currentTime)

      // 5. Dynamics Compressor (Voice Leveler & Peak Limiter)
      this.compressor = this.audioCtx.createDynamicsCompressor()
      this.compressor.threshold.setValueAtTime(-24, this.audioCtx.currentTime)
      this.compressor.knee.setValueAtTime(12, this.audioCtx.currentTime)
      this.compressor.ratio.setValueAtTime(4, this.audioCtx.currentTime)
      this.compressor.attack.setValueAtTime(0.005, this.audioCtx.currentTime)
      this.compressor.release.setValueAtTime(0.18, this.audioCtx.currentTime)

      // 6. Analyser for volume metering and gate control
      this.analyser = this.audioCtx.createAnalyser()
      this.analyser.fftSize = 512
      this.analyser.smoothingTimeConstant = 0.2

      // 7. Test Loopback Gain (for "Testar Microfone" feature)
      this.testGainNode = this.audioCtx.createGain()
      this.testGainNode.gain.setValueAtTime(0, this.audioCtx.currentTime) // Muted by default

      // Connect graph:
      // Source -> InputGain -> Highpass -> Shelf -> GateGain -> Compressor -> Destination
      this.sourceNode.connect(this.inputGainNode)
      this.inputGainNode.connect(this.highpassFilter)
      this.highpassFilter.connect(this.notchFilter)
      this.notchFilter.connect(this.gateGain)
      this.gateGain.connect(this.compressor)
      this.compressor.connect(this.destination)

      // Connect Analyser in parallel after input gain to measure actual adjusted signal
      this.inputGainNode.connect(this.analyser)

      // Connect Test Loopback from Compressor to AudioContext output speakers/headphones
      this.compressor.connect(this.testGainNode)
      this.testGainNode.connect(this.audioCtx.destination)

      this.updateCalculatedThreshold()

      // Start Realtime Processing Loop
      this.startGateProcessing()

      // Preserve any video tracks from original stream
      const outputStream = this.destination.stream
      inputStream.getVideoTracks().forEach((vTrack) => {
        outputStream.addTrack(vTrack)
      })

      return outputStream
    } catch (err) {
      console.warn('Noise suppressor fallback to raw stream:', err)
      return inputStream
    }
  }

  private updateCalculatedThreshold() {
    if (this.sensitivityMode === 'manual') {
      // Map 0 - 100 slider to RMS range [0.002, 0.12]
      const minRMS = 0.002
      const maxRMS = 0.12
      this.currentThreshold = minRMS + (this.manualThresholdPercent / 100) * (maxRMS - minRMS)
    } else {
      // Auto mode: dynamic noise floor with baseline
      this.currentThreshold = Math.max(0.012, this.dynamicNoiseFloor * 2.2)
    }
  }

  private startGateProcessing() {
    if (!this.analyser || !this.audioCtx) return

    const buffer = new Float32Array(this.analyser.fftSize)

    const process = () => {
      if (!this.analyser || !this.audioCtx) return

      this.analyser.getFloatTimeDomainData(buffer)

      // Calculate RMS (Root Mean Square) energy
      let sum = 0
      for (let i = 0; i < buffer.length; i++) {
        sum += buffer[i] * buffer[i]
      }
      const rms = Math.sqrt(sum / buffer.length)

      // Auto tracker for ambient noise floor
      if (this.sensitivityMode === 'auto') {
        if (rms < this.dynamicNoiseFloor || this.dynamicNoiseFloor === 0) {
          this.dynamicNoiseFloor = this.dynamicNoiseFloor * 0.95 + rms * 0.05
        } else {
          this.dynamicNoiseFloor = this.dynamicNoiseFloor * 0.999 + rms * 0.001
        }
        this.updateCalculatedThreshold()
      }

      // Normalized level for UI VU Meter (0.0 to 1.0)
      const normalizedLevel = Math.min(1, rms * 6)

      // Gate Logic with hysteresis: open at 1.0× threshold, close at 0.6×.
      // Without this the gate flutters on borderline signals (open/close
      // every frame), which is heard as chatter/crackle over the voice.
      if (this.gateGain && this.isSuppressionActive) {
        const now = this.audioCtx.currentTime
        if (rms > this.currentThreshold) {
          // Voice detected: Open gate quickly
          if (!this.isGateOpen) {
            this.gateGain.gain.cancelScheduledValues(now)
            this.gateGain.gain.setTargetAtTime(1.0, now, 0.01) // 10ms fast attack
            this.isGateOpen = true
          }
        } else if (rms < this.currentThreshold * 0.6) {
          // Below threshold: Smoothly mute background noise
          if (this.isGateOpen) {
            this.gateGain.gain.cancelScheduledValues(now)
            this.gateGain.gain.setTargetAtTime(0.01, now, 0.15) // 150ms smooth release
            this.isGateOpen = false
          }
        }
        // Between 0.6× and 1.0×: hold current state (no flutter).
      } else {
        this.isGateOpen = true
      }

      // Notify callback for visual VU Meter & Speaker Aura
      if (this.onLevelCallback) {
        this.onLevelCallback(normalizedLevel, this.isGateOpen, rms)
      }

      this.animationFrameId = requestAnimationFrame(process)
    }

    process()
  }

  public setInputVolume(percentage: number) {
    if (!this.inputGainNode || !this.audioCtx) return
    const gainValue = Math.max(0, Math.min(2.0, percentage / 100))
    const now = this.audioCtx.currentTime
    this.inputGainNode.gain.cancelScheduledValues(now)
    this.inputGainNode.gain.setTargetAtTime(gainValue, now, 0.02)
  }

  public setSensitivity(mode: SensitivityMode, manualThresholdPercent: number) {
    this.sensitivityMode = mode
    this.manualThresholdPercent = manualThresholdPercent
    this.updateCalculatedThreshold()
  }

  public setSuppressionEnabled(enabled: boolean) {
    this.isSuppressionActive = enabled
    if (!this.gateGain || !this.audioCtx) return
    const now = this.audioCtx.currentTime
    if (!enabled) {
      this.gateGain.gain.cancelScheduledValues(now)
      this.gateGain.gain.setValueAtTime(1.0, now)
      this.isGateOpen = true
    }
  }

  public setTestLoopback(enabled: boolean) {
    if (!this.testGainNode || !this.audioCtx) return
    const now = this.audioCtx.currentTime
    this.testGainNode.gain.cancelScheduledValues(now)
    this.testGainNode.gain.setTargetAtTime(enabled ? 1.0 : 0.0, now, 0.05)
  }

  public getCurrentThreshold(): number {
    return this.currentThreshold
  }

  public dispose() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close().catch(() => {})
    }
    this.sourceNode = null
    this.inputGainNode = null
    this.highpassFilter = null
    this.notchFilter = null
    this.compressor = null
    this.gateGain = null
    this.analyser = null
    this.destination = null
    this.testGainNode = null
    this.audioCtx = null
  }
}
