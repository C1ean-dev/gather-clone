/**
 * Hardware Codec Optimization for WebRTC
 * Prioritizes H.264 over VP8/VP9 on VIDEO transceivers so Windows offloads video encoding
 * directly to GPU dedicated hardware ASICs (NVIDIA NVENC, AMD AMF/VCN, Intel QuickSync).
 */
export function prioritizeH264HardwareCodec(pc?: RTCPeerConnection | null) {
  if (!pc || typeof pc.getTransceivers !== 'function') return

  const globalScope = typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : null
  if (!globalScope) return

  // Per W3C WebRTC 1.0 specification, setCodecPreferences must use capabilities from RTCRtpReceiver
  const rtcReceiver = (globalScope as any).RTCRtpReceiver || (globalScope as any).RTCRtpSender
  if (!rtcReceiver || typeof rtcReceiver.getCapabilities !== 'function') return

  try {
    const capabilities = rtcReceiver.getCapabilities('video')
    if (!capabilities || !capabilities.codecs || capabilities.codecs.length === 0) return

    // Find H.264 codecs in receiver capabilities
    const h264Codecs = capabilities.codecs.filter(
      (c: any) => c.mimeType && c.mimeType.toLowerCase() === 'video/h264'
    )
    if (h264Codecs.length === 0) return

    const otherCodecs = capabilities.codecs.filter(
      (c: any) => !c.mimeType || c.mimeType.toLowerCase() !== 'video/h264'
    )

    // Sorted list containing all valid video capabilities, with H.264 first
    const sortedCodecs = [...h264Codecs, ...otherCodecs]

    pc.getTransceivers().forEach((transceiver) => {
      // CRITICAL: NEVER apply video codecs to audio transceivers!
      const isVideo =
        transceiver.receiver?.track?.kind === 'video' ||
        transceiver.sender?.track?.kind === 'video' ||
        (transceiver as any).kind === 'video'

      if (!isVideo) return

      if (typeof transceiver.setCodecPreferences === 'function') {
        try {
          transceiver.setCodecPreferences(sortedCodecs)
        } catch {
          // Safe to ignore if transceiver has already locked negotiation
        }
      }
    })
  } catch (err) {
    console.warn('[HardwareCodec] Error setting H.264 preference:', err)
  }
}
