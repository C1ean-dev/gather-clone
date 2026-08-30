/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * RnnoiseProcessor — orchestrates the RNNoise neural denoiser on the main
 * thread. It owns:
 *
 *   - The AudioContext that the worklet runs in.
 *   - The AudioWorkletNode that calls into the WASM module.
 *   - A pre-worklet gain node for input volume (so the existing UI
 *     "input volume" slider keeps working).
 *   - A post-worklet gain + analyser + test loopback for the VU meter and
 *     "Testar Microfone" feature.
 *
 * The pipeline mirrors `NoiseSuppressor` so the rest of the app does not
 * care which engine is in use.
 */
export class RnnoiseProcessor {
  private audioCtx: AudioContext | null = null
  private sourceNode: MediaStreamAudioSourceNode | null = null
  private inputGainNode: GainNode | null = null
  private highpassFilter: BiquadFilterNode | null = null
  private highShelfFilter: BiquadFilterNode | null = null
  private workletNode: AudioWorkletNode | null = null
  private postGain: GainNode | null = null
  private analyser: AnalyserNode | null = null
  private destination: MediaStreamAudioDestinationNode | null = null
  private testGainNode: GainNode | null = null
  private animationFrameId: number | null = null
  private onLevelCallback:
    | ((level: number, gateOpen: boolean, rawRms: number) => void)
    | null = null
  private isSuppressionActive = true
  private workletReady = false
  private workletError: string | null = null
  private lastVad = 0

  constructor() {}

  public async processStream(
    inputStream: MediaStream,
    enableSuppression: boolean = true,
    initialInputVolume: number = 100,
    _sensitivityMode: 'auto' | 'manual' = 'auto',
    _manualThresholdPercent: number = 20,
    onAudioLevel?: (level: number, gateOpen: boolean, rawRms: number) => void
  ): Promise<MediaStream> {
    try {
      this.dispose()

      const audioTrack = inputStream.getAudioTracks()[0]
      if (!audioTrack) return inputStream

      this.onLevelCallback = onAudioLevel || null
      this.isSuppressionActive = enableSuppression

      const AudioContextClass =
        window.AudioContext || (window as any).webkitAudioContext
      this.audioCtx = new AudioContextClass({ sampleRate: 48000 })
      if (this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume().catch(() => {})
      }

      // Make sure the worklet module is registered. If the file failed to
      // fetch we surface the error immediately so MediaManager can fall
      // back to the soft DSP.
      try {
        await this.audioCtx.audioWorklet.addModule('/rnnoise-worklet.js')
      } catch (err) {
        throw new Error(
          `audioWorklet.addModule failed: ${
            (err as Error)?.message ?? String(err)
          }`
        )
      }

      this.sourceNode = this.audioCtx.createMediaStreamSource(inputStream)
      this.destination = this.audioCtx.createMediaStreamDestination()

      this.inputGainNode = this.audioCtx.createGain()
      this.inputGainNode.gain.setValueAtTime(
        initialInputVolume / 100,
        this.audioCtx.currentTime
      )

      this.highpassFilter = this.audioCtx.createBiquadFilter()
      this.highpassFilter.type = 'highpass'
      this.highpassFilter.frequency.setValueAtTime(90, this.audioCtx.currentTime)
      this.highpassFilter.Q.setValueAtTime(0.7, this.audioCtx.currentTime)

      this.highShelfFilter = this.audioCtx.createBiquadFilter()
      this.highShelfFilter.type = 'highshelf'
      this.highShelfFilter.frequency.setValueAtTime(6500, this.audioCtx.currentTime)
      this.highShelfFilter.gain.setValueAtTime(-4, this.audioCtx.currentTime)

      this.postGain = this.audioCtx.createGain()
      this.postGain.gain.setValueAtTime(1.0, this.audioCtx.currentTime)

      this.analyser = this.audioCtx.createAnalyser()
      this.analyser.fftSize = 512
      this.analyser.smoothingTimeConstant = 0.2

      this.testGainNode = this.audioCtx.createGain()
      this.testGainNode.gain.setValueAtTime(0, this.audioCtx.currentTime)

      this.workletNode = new AudioWorkletNode(this.audioCtx, 'rnnoise-worklet', {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [1],
        channelCount: 1,
        channelCountMode: 'explicit',
      })

      // Wire the worklet lifecycle messages.
      this.workletNode.port.onmessage = (e: MessageEvent) => {
        const data = e.data
        if (!data) return
        if (data.type === 'ready') {
          this.workletReady = true
          this.workletError = null
        } else if (data.type === 'error') {
          this.workletReady = false
          this.workletError = data.message ?? 'unknown worklet error'
          console.warn('[rnnoise] worklet reported error:', this.workletError)
        } else if (data.type === 'vad') {
          this.lastVad = typeof data.probability === 'number' ? data.probability : 0
        }
      }

      // Initial bypass state mirrors the suppression toggle.
      this.workletNode.port.postMessage({
        type: 'bypass',
        enabled: !enableSuppression,
      })

      // Graph:
      //   source -> inputGain -> HP -> shelf -> worklet -> postGain -> dest
      //   postGain -> analyser (tap for VU meter)
      //   postGain -> testGain -> ctx.destination (loopback for mic test)
      this.sourceNode.connect(this.inputGainNode)
      this.inputGainNode.connect(this.highpassFilter)
      this.highpassFilter.connect(this.highShelfFilter)
      this.highShelfFilter.connect(this.workletNode)
      this.workletNode.connect(this.postGain)
      this.postGain.connect(this.destination)
      this.postGain.connect(this.analyser)
      this.postGain.connect(this.testGainNode)
      this.testGainNode.connect(this.audioCtx.destination)

      this.startLevelLoop()

      const outputStream = this.destination.stream
      inputStream.getVideoTracks().forEach((vTrack) => outputStream.addTrack(vTrack))
      return outputStream
    } catch (err) {
      console.warn('[rnnoise] processStream failed:', err)
      // Hard fallback: hand back the raw stream so the caller can decide
      // whether to swap engines.
      return inputStream
    }
  }

  private startLevelLoop() {
    if (!this.analyser || !this.audioCtx) return
    const buffer = new Float32Array(this.analyser.fftSize)

    const tick = () => {
      if (!this.analyser || !this.audioCtx) return
      this.analyser.getFloatTimeDomainData(buffer)
      let sum = 0
      for (let i = 0; i < buffer.length; i++) {
        sum += buffer[i] * buffer[i]
      }
      const rms = Math.sqrt(sum / buffer.length)
      const level = Math.min(1, rms * 6)
      // "gateOpen" semantics are emulated by the neural VAD probability so
      // the UI VU meter lights up while the user is speaking.
      const gateOpen =
        this.workletReady && this.lastVad > 0.35 ? true : level > 0.05
      if (this.onLevelCallback) {
        this.onLevelCallback(level, gateOpen, rms)
      }
      this.animationFrameId = requestAnimationFrame(tick)
    }
    tick()
  }

  public setInputVolume(percentage: number) {
    if (!this.inputGainNode || !this.audioCtx) return
    const v = Math.max(0, Math.min(2.0, percentage / 100))
    const now = this.audioCtx.currentTime
    this.inputGainNode.gain.cancelScheduledValues(now)
    this.inputGainNode.gain.setTargetAtTime(v, now, 0.02)
  }

  /** Sensitivity knobs are unused for RNNoise — kept for API parity. */
  public setSensitivity(_mode: 'auto' | 'manual', _percent: number) {}

  public setSuppressionEnabled(enabled: boolean) {
    this.isSuppressionActive = enabled
    if (!this.workletNode) return
    this.workletNode.port.postMessage({ type: 'bypass', enabled: !enabled })
  }

  public setTestLoopback(enabled: boolean) {
    if (!this.testGainNode || !this.audioCtx) return
    const now = this.audioCtx.currentTime
    this.testGainNode.gain.cancelScheduledValues(now)
    this.testGainNode.gain.setTargetAtTime(enabled ? 1.0 : 0.0, now, 0.05)
  }

  public getCurrentThreshold(): number {
    // RNNoise has no RMS threshold — expose the VAD probability for the UI.
    return this.lastVad
  }

  public isReady(): boolean {
    return this.workletReady
  }

  public getLastError(): string | null {
    return this.workletError
  }

  public dispose() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
    try {
      this.workletNode?.port.close()
    } catch {}
    this.workletNode?.disconnect()
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close().catch(() => {})
    }
    this.sourceNode = null
    this.inputGainNode = null
    this.highpassFilter = null
    this.highShelfFilter = null
    this.workletNode = null
    this.postGain = null
    this.analyser = null
    this.destination = null
    this.testGainNode = null
    this.audioCtx = null
    this.workletReady = false
    this.lastVad = 0
  }
}