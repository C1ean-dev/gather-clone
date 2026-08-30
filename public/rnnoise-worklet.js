/* eslint-disable */
/**
 * RNNoise AudioWorklet processor.
 *
 * RNNoise (https://github.com/xiph/rnnoise) is a recurrent neural network
 * trained to suppress noise in 48 kHz mono speech. It expects frames of
 * exactly 480 samples (10 ms at 48 kHz) and writes the cleaned frame back
 * into the same buffer in-place.
 *
 * Communication with the main thread (via this.port):
 *   - Main -> worklet: { type: 'bypass', enabled: boolean }
 *   - Worklet -> main: { type: 'ready' } when WASM + state are initialised
 *   - Worklet -> main: { type: 'error', message } on init failure
 *   - Worklet -> main: { type: 'vad', probability } at ~10 Hz for the UI VU
 *
 * The processor is registered as 'rnnoise-worklet' so the main thread can
 * instantiate it via `new AudioWorkletNode(ctx, 'rnnoise-worklet')`.
 */

const FRAME_SIZE = 480 // 10 ms @ 48 kHz — RNNoise's hard requirement.
const FRAME_BYTES = FRAME_SIZE * 4 // float32

class RnnoiseWorkletProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    this.module = null
    this.statePtr = 0
    this.inputPtr = 0
    this.outputPtr = 0
    this.bypass = false
    this.vadAccum = 0
    this.vadFrames = 0
    this.lastVadEmit = 0
    this.sampleRateWarned = false

    this.port.onmessage = (e) => {
      const data = e.data
      if (!data) return
      if (data.type === 'bypass') {
        this.bypass = !!data.enabled
      }
    }

    this._init()
  }

  async _init() {
    try {
      // The wrapper script is served from /public/rnnoise.wasm-loader.js
      // and exposes `createRNNWasmModule` on the global scope.
      self.importScripts('/rnnoise.wasm-loader.js')
      const factory = self.createRNNWasmModule
      if (typeof factory !== 'function') {
        throw new Error('createRNNWasmModule is not on globalThis')
      }
      this.module = await factory({
        locateFile: (p) => (p.endsWith('.wasm') ? '/rnnoise.wasm' : p),
      })

      const modelSize = this.module._rnnoise_get_frame_size()
      if (modelSize && modelSize !== FRAME_SIZE) {
        console.warn('[rnnoise-worklet] unexpected frame size', modelSize)
      }

      this.statePtr = this.module._rnnoise_create(0)
      if (!this.statePtr) throw new Error('rnnoise_create returned 0')
      this.inputPtr = this.module._malloc(FRAME_BYTES)
      this.outputPtr = this.module._malloc(FRAME_BYTES)
      this.port.postMessage({ type: 'ready' })
    } catch (err) {
      this.port.postMessage({
        type: 'error',
        message: (err && err.message) || String(err),
      })
    }
  }

  _emitVad(probability) {
    const now = currentTime
    if (now - this.lastVadEmit < 0.1) return
    this.lastVadEmit = now
    this.port.postMessage({ type: 'vad', probability })
  }

  process(inputs, outputs) {
    const input = inputs[0] && inputs[0][0]
    const output = outputs[0] && outputs[0][0]
    if (!input || !output) return true

    // Until WASM is ready, or when bypass is on, pass audio through
    // unchanged so the user is never muted by a slow load.
    if (!this.module || !this.statePtr || this.bypass) {
      output.set(input)
      return true
    }

    if (sampleRate !== 48000) {
      if (!this.sampleRateWarned) {
        console.warn(
          '[rnnoise-worklet] expected 48kHz, got',
          sampleRate,
          '— passing through'
        )
        this.sampleRateWarned = true
      }
      output.set(input)
      return true
    }

    const heap = this.module.HEAPF32
    if (!heap) {
      output.set(input)
      return true
    }

    const total = input.length
    let offset = 0

    while (offset + FRAME_SIZE <= total) {
      // Copy 480 samples into the WASM input buffer.
      for (let i = 0; i < FRAME_SIZE; i++) {
        heap[this.inputPtr / 4 + i] = input[offset + i]
      }
      // process_frame returns VAD probability packed into the low 8 bits.
      const vadBits = this.module._rnnoise_process_frame(
        this.statePtr,
        this.outputPtr,
        this.inputPtr
      )
      // Read cleaned samples back out.
      for (let i = 0; i < FRAME_SIZE; i++) {
        output[offset + i] = heap[this.outputPtr / 4 + i]
      }
      this.vadAccum += (vadBits & 0xff) / 255
      this.vadFrames++
      if (this.vadFrames >= 5) {
        this._emitVad(this.vadAccum / this.vadFrames)
        this.vadAccum = 0
        this.vadFrames = 0
      }
      offset += FRAME_SIZE
    }

    // Any leftover samples (partial last frame) get passed through.
    if (offset < total) {
      output.set(input.subarray(offset), offset)
    }

    return true
  }
}

try {
  registerProcessor('rnnoise-worklet', RnnoiseWorkletProcessor)
} catch (err) {
  // AudioWorkletGlobalScope.registerProcessor throws if called twice (HMR).
  // The previously-registered copy stays active; safe to ignore in dev.
}