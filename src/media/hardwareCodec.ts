/**
 * Hardware Codec Optimization for WebRTC
 * Prioritizes H.264 over VP8/VP9 so Windows offloads video encoding directly to
 * GPU dedicated hardware ASICs (NVIDIA NVENC, AMD AMF/VCN, Intel QuickSync)
 */
export function prioritizeH264HardwareCodec(pc?: RTCPeerConnection | null) {
  if (!pc || typeof pc.getTransceivers !== 'function') return

  const globalScope = typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : null
  if (!globalScope) return

  const rtcSender = (globalScope as any).RTCRtpSender
  if (!rtcSender || typeof rtcSender.getCapabilities !== 'function') return

  try {
    const capabilities = rtcSender.getCapabilities('video')
    if (!capabilities || !capabilities.codecs || capabilities.codecs.length === 0) return

    // Find H.264 codecs (hardware accelerated by GPU)
    const h264Codecs = capabilities.codecs.filter(
      (c: any) => c.mimeType && c.mimeType.toLowerCase() === 'video/h264'
    )
    const otherCodecs = capabilities.codecs.filter(
      (c: any) => !c.mimeType || c.mimeType.toLowerCase() !== 'video/h264'
    )

    if (h264Codecs.length > 0) {
      // Place H.264 at the very beginning of the negotiated codecs list
      const sortedCodecs = [...h264Codecs, ...otherCodecs]

      pc.getTransceivers().forEach((transceiver) => {
        if (typeof transceiver.setCodecPreferences === 'function') {
          try {
            transceiver.setCodecPreferences(sortedCodecs)
          } catch (e) {
            // Safe to ignore if transceiver has already finalized negotiation
          }
        }
      })
    }
  } catch (err) {
    console.warn('[HardwareCodec] Error setting H.264 preference:', err)
  }
}
