export class NoiseSuppressor {
  private audioCtx: AudioContext | null = null
  private sourceNode: MediaStreamAudioSourceNode | null = null
  private highpassFilter: BiquadFilterNode | null = null
  private notchFilter: BiquadFilterNode | null = null
  private compressor: DynamicsCompressorNode | null = null
  private gateGain: GainNode | null = null
  private analyser: AnalyserNode | null = null
  private destination: MediaStreamAudioDestinationNode | null = null
  private animationFrameId: number | null = null
  private onLevelCallback: ((level: number) => void) | null = null

  // Gate Parameters
  private noiseThreshold = 0.015 // RMS threshold
  private isGateOpen = false

  constructor() {}

  /**
   * Process an input raw microphone MediaStream and return a noise-suppressed stream
   */
  public processStream(
    inputStream: MediaStream,
    enableSuppression: boolean = true,
    onAudioLevel?: (level: number) => void
  ): MediaStream {
    try {
      const audioTrack = inputStream.getAudioTracks()[0]
      if (!audioTrack) return inputStream

      this.onLevelCallback = onAudioLevel || null

      // Create AudioContext if not active
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      this.audioCtx = new AudioContextClass({ sampleRate: 48000 })

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume()
      }

      this.sourceNode = this.audioCtx.createMediaStreamSource(inputStream)
      this.destination = this.audioCtx.createMediaStreamDestination()

      if (!enableSuppression) {
        // Direct pass-through
        this.sourceNode.connect(this.destination)
        this.setupAnalyser(this.sourceNode)
        return this.destination.stream
      }

      // 1. Highpass Filter (Cut out fan hum, desk rumble < 90Hz)
      this.highpassFilter = this.audioCtx.createBiquadFilter()
      this.highpassFilter.type = 'highpass'
      this.highpassFilter.frequency.setValueAtTime(90, this.audioCtx.currentTime)
      this.highpassFilter.Q.setValueAtTime(0.7, this.audioCtx.currentTime)

      // 2. High Shelf Filter (Slightly tame harsh high-frequency typing clicks > 6500Hz)
      this.notchFilter = this.audioCtx.createBiquadFilter()
      this.notchFilter.type = 'highshelf'
      this.notchFilter.frequency.setValueAtTime(6500, this.audioCtx.currentTime)
      this.notchFilter.gain.setValueAtTime(-4, this.audioCtx.currentTime)

      // 3. Dynamic Spectral Noise Gate
      this.gateGain = this.audioCtx.createGain()
      this.gateGain.gain.setValueAtTime(1.0, this.audioCtx.currentTime)

      // 4. Dynamics Compressor (Voice Leveler)
      this.compressor = this.audioCtx.createDynamicsCompressor()
      this.compressor.threshold.setValueAtTime(-24, this.audioCtx.currentTime)
      this.compressor.knee.setValueAtTime(12, this.audioCtx.currentTime)
      this.compressor.ratio.setValueAtTime(4, this.audioCtx.currentTime)
      this.compressor.attack.setValueAtTime(0.005, this.audioCtx.currentTime)
      this.compressor.release.setValueAtTime(0.2, this.audioCtx.currentTime)

      // 5. Analyser for volume metering and gate control
      this.analyser = this.audioCtx.createAnalyser()
      this.analyser.fftSize = 512
      this.analyser.smoothingTimeConstant = 0.3

      // Connect graph: Source -> Highpass -> Shelf -> Gate -> Compressor -> Destination
      this.sourceNode.connect(this.highpassFilter)
      this.highpassFilter.connect(this.notchFilter)
      this.notchFilter.connect(this.gateGain)
      this.gateGain.connect(this.compressor)
      this.compressor.connect(this.destination)

      // Connect analyser in parallel
      this.notchFilter.connect(this.analyser)

      // Start Realtime Gate & Metering Loop
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

  private setupAnalyser(node: AudioNode) {
    if (!this.audioCtx) return
    this.analyser = this.audioCtx.createAnalyser()
    this.analyser.fftSize = 512
    node.connect(this.analyser)
    this.startGateProcessing()
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

      // Notify level for UI aura ring
      if (this.onLevelCallback) {
        const normalized = Math.min(1, rms * 5)
        this.onLevelCallback(normalized)
      }

      // Gate Logic
      if (this.gateGain) {
        const now = this.audioCtx.currentTime
        if (rms > this.noiseThreshold) {
          // Voice detected: Open gate smoothly
          if (!this.isGateOpen) {
            this.gateGain.gain.cancelScheduledValues(now)
            this.gateGain.gain.setTargetAtTime(1.0, now, 0.01) // 10ms fast attack
            this.isGateOpen = true
          }
        } else {
          // Below threshold: Smoothly mute background noise
          if (this.isGateOpen) {
            this.gateGain.gain.cancelScheduledValues(now)
            this.gateGain.gain.setTargetAtTime(0.02, now, 0.15) // 150ms gentle release
            this.isGateOpen = false
          }
        }
      }

      this.animationFrameId = requestAnimationFrame(process)
    }

    process()
  }

  public setSuppressionEnabled(enabled: boolean) {
    if (!this.gateGain || !this.audioCtx) return
    const now = this.audioCtx.currentTime
    if (!enabled) {
      this.gateGain.gain.cancelScheduledValues(now)
      this.gateGain.gain.setValueAtTime(1.0, now)
    }
  }

  public dispose() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
    }
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close().catch(() => {})
    }
    this.sourceNode = null
    this.highpassFilter = null
    this.notchFilter = null
    this.compressor = null
    this.gateGain = null
    this.analyser = null
    this.destination = null
    this.audioCtx = null
  }
}
