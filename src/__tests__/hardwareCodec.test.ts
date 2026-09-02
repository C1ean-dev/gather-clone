import { describe, it, expect, vi, afterEach } from 'vitest'
import { prioritizeH264HardwareCodec } from '../media/hardwareCodec'

describe('WebRTC Hardware Codec Acceleration (H.264 Priority)', () => {
  afterEach(() => {
    delete (globalThis as any).RTCRtpSender
    delete (globalThis as any).RTCRtpReceiver
  })

  it('should safely do nothing if peerConnection is null or missing transceivers', () => {
    expect(() => prioritizeH264HardwareCodec(null)).not.toThrow()
    expect(() => prioritizeH264HardwareCodec({} as any)).not.toThrow()
  })

  it('should sort H264 codecs to the front and call setCodecPreferences on video transceivers', () => {
    const mockCodecs = [
      { mimeType: 'video/VP8', clockRate: 90000 },
      { mimeType: 'video/VP9', clockRate: 90000 },
      { mimeType: 'video/H264', clockRate: 90000, sdpFmtpLine: 'profile-level-id=42e01f' },
      { mimeType: 'video/AV1', clockRate: 90000 },
    ]

    const setCodecPreferencesMock = vi.fn()

    const mockTransceiver = {
      sender: { track: { kind: 'video' } },
      receiver: { track: { kind: 'video' } },
      setCodecPreferences: setCodecPreferencesMock,
    }

    const mockPc = {
      getTransceivers: vi.fn().mockReturnValue([mockTransceiver]),
    } as unknown as RTCPeerConnection

    // Mock global RTCRtpReceiver.getCapabilities
    ;(globalThis as any).RTCRtpReceiver = {
      getCapabilities: vi.fn().mockReturnValue({
        codecs: mockCodecs,
      }),
    }

    prioritizeH264HardwareCodec(mockPc)

    expect(setCodecPreferencesMock).toHaveBeenCalledTimes(1)
    const passedCodecs = setCodecPreferencesMock.mock.calls[0][0]

    // Verify H264 is at index 0 (first in preference list)
    expect(passedCodecs[0].mimeType).toBe('video/H264')
    expect(passedCodecs.length).toBe(4)
  })

  it('should strictly only apply setCodecPreferences to video transceivers and ignore audio transceivers', () => {
    const mockCodecs = [
      { mimeType: 'video/VP8', clockRate: 90000 },
      { mimeType: 'video/H264', clockRate: 90000 },
    ]

    const audioMock = vi.fn()
    const videoMock = vi.fn()

    const audioTransceiver = {
      receiver: { track: { kind: 'audio' } },
      setCodecPreferences: audioMock,
    }
    const videoTransceiver = {
      receiver: { track: { kind: 'video' } },
      setCodecPreferences: videoMock,
    }

    const mockPc = {
      getTransceivers: vi.fn().mockReturnValue([audioTransceiver, videoTransceiver]),
    } as unknown as RTCPeerConnection

    ;(globalThis as any).RTCRtpReceiver = {
      getCapabilities: vi.fn().mockReturnValue({ codecs: mockCodecs }),
    }

    prioritizeH264HardwareCodec(mockPc)

    expect(audioMock).not.toHaveBeenCalled()
    expect(videoMock).toHaveBeenCalledTimes(1)
  })
})
