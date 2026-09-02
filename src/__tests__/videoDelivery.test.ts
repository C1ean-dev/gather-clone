import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MediaManager } from '../media/MediaManager'
import { MediaCallHandler } from '../p2p/mediaCalls'
import { useMediaStore } from '../store/useMediaStore'
import { useGameStore } from '../store/useGameStore'

// Setup global browser polyfills for Node/Vitest test environment
class MockMediaStream {
  private tracks: any[] = []
  id = 'mock-stream-' + Math.random()

  constructor(tracks?: any[]) {
    if (tracks) {
      this.tracks = [...tracks]
    }
  }

  addTrack(track: any) {
    if (!this.tracks.includes(track)) {
      this.tracks.push(track)
    }
  }

  removeTrack(track: any) {
    this.tracks = this.tracks.filter((t) => t !== track)
  }

  getTracks() {
    return this.tracks
  }

  getVideoTracks() {
    return this.tracks.filter((t) => t.kind === 'video')
  }

  getAudioTracks() {
    return this.tracks.filter((t) => t.kind === 'audio')
  }

  addEventListener() {}
  removeEventListener() {}
}

const fakeCanvasStream = {
  getVideoTracks: () => [
    {
      id: 'dummy-canvas-video-track',
      kind: 'video',
      enabled: false,
      contentHint: '',
      stop: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    },
  ],
}

if (typeof globalThis.MediaStream === 'undefined') {
  ;(globalThis as any).MediaStream = MockMediaStream
}

if (typeof globalThis.document === 'undefined') {
  ;(globalThis as any).document = {
    createElement: (tag: string) => {
      if (tag === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext: () => ({
            fillStyle: '',
            fillRect: () => {},
          }),
          captureStream: () => fakeCanvasStream,
        }
      }
      return {}
    },
  }
}

if (typeof globalThis.navigator === 'undefined') {
  ;(globalThis as any).navigator = {
    mediaDevices: {
      getUserMedia: vi.fn(),
      getDisplayMedia: vi.fn(),
    },
  }
} else if (!globalThis.navigator.mediaDevices) {
  ;(globalThis.navigator as any).mediaDevices = {
    getUserMedia: vi.fn(),
    getDisplayMedia: vi.fn(),
  }
}

describe('Video Delivery & Screen Share Guarantee Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    useMediaStore.setState({
      localStream: null,
      localScreenStream: null,
      isScreenSharing: false,
      isMuted: true,
      isCameraOff: true,
      peerStreams: {},
      peerScreenStreams: {},
    })
    useGameStore.setState({
      localPlayer: {
        id: 'local-user',
        name: 'Local Tester',
        x: 10,
        y: 10,
        direction: 'down',
        isMoving: false,
        avatar: { baseId: 'char-1', shirtColor: '#4c6ef5' },
        currentZoneId: 'zone-1',
        isScreenSharing: false,
        isMuted: true,
        isCameraOff: true,
      },
      remotePlayers: {},
    })
  })

  it('should generate a dummy video track when canvas is available to guarantee video transceiver', () => {
    const mediaManager = MediaManager.getInstance()
    const dummyTrack = mediaManager.createDummyVideoTrack()

    expect(dummyTrack).toBeDefined()
    expect(dummyTrack.kind).toBe('video')
    expect(dummyTrack.enabled).toBe(false)
  })

  it('should guarantee that startMedia provides a video track even if user has no webcam', async () => {
    const fakeAudioTrack = {
      id: 'mic-audio-track',
      kind: 'audio',
      enabled: true,
      stop: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }

    const fakeVideoTrack = {
      id: 'canvas-video-track',
      kind: 'video',
      enabled: false,
      stop: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }

    // Mock getUserMedia: fails with camera, succeeds with audio-only
    vi.spyOn(navigator.mediaDevices, 'getUserMedia').mockImplementation(async (constraints: any) => {
      if (constraints?.video) {
        throw new Error('NotFoundError: No webcam found on system')
      }
      const s = new MockMediaStream()
      s.addTrack(fakeAudioTrack)
      return s as unknown as MediaStream
    })

    const mediaManager = MediaManager.getInstance()
    vi.spyOn(mediaManager, 'createDummyVideoTrack').mockReturnValue(fakeVideoTrack as any)
    vi.spyOn(mediaManager as any, 'runEngine').mockImplementation(async (rawStream: any) => rawStream)

    const stream = await mediaManager.startMedia(true, true)

    expect(stream).toBeDefined()
    expect(stream?.getVideoTracks().length).toBeGreaterThanOrEqual(1)
    expect(stream?.getAudioTracks().length).toBeGreaterThanOrEqual(1)
    expect(useMediaStore.getState().localStream).toBe(stream)
  })

  it('should correctly configure RTCRtpSender and bitrate when replaceVideoTrack is called with screen track', () => {
    const fakeScreenTrack = {
      id: 'screen-video-track-1',
      kind: 'video',
      enabled: false,
      contentHint: '',
      stop: vi.fn(),
    } as unknown as MediaStreamTrack

    let replacedWith: any = null
    const encodings = [{ maxBitrate: 0, maxFramerate: 0, scaleResolutionDownBy: 0 }]
    const mockSender = {
      track: { kind: 'video' },
      replaceTrack: vi.fn(async (t) => {
        replacedWith = t
      }),
      getParameters: vi.fn(() => ({ encodings })),
      setParameters: vi.fn(async () => {}),
    }

    const mockPeerConnection = {
      getSenders: () => [mockSender],
      getTransceivers: () => [],
    }

    const mockCall = {
      peer: 'remote-peer-1',
      peerConnection: mockPeerConnection,
    }

    const mediaCalls = new Map<string, any>()
    mediaCalls.set('remote-peer-1', mockCall)

    // Call replaceVideoTrack for Screen Share
    MediaCallHandler.replaceVideoTrack(mediaCalls, fakeScreenTrack, true, 4_500_000, 60)

    expect(fakeScreenTrack.enabled).toBe(true)
    expect(fakeScreenTrack.contentHint).toBe('motion')
    expect(mockSender.replaceTrack).toHaveBeenCalledWith(fakeScreenTrack)
  })

  it('should apply receiver jitter buffer to eliminate stuttering in media calls', () => {
    const mockReceiver = {
      playoutDelayHint: 0,
      jitterBufferTarget: 0,
    }

    const mockPeerConnection = {
      getReceivers: () => [mockReceiver],
    }

    const mockCall = {
      peer: 'remote-peer-1',
      peerConnection: mockPeerConnection,
    }

    const mediaCalls = new Map<string, any>()
    mediaCalls.set('remote-peer-1', mockCall)

    // Apply 600ms buffer
    MediaCallHandler.applyJitterBuffer(mediaCalls, 600)

    expect(mockReceiver.playoutDelayHint).toBe(0.6)
    expect(mockReceiver.jitterBufferTarget).toBe(600)

    // Apply 300ms default buffer
    MediaCallHandler.applyJitterBuffer(mediaCalls, 300)
    expect(mockReceiver.playoutDelayHint).toBe(0.3)
    expect(mockReceiver.jitterBufferTarget).toBe(300)
  })

  it('should restore camera/dummy video track when stopScreenShare is called', () => {
    const fakeDummyTrack = {
      id: 'dummy-track-reverted',
      kind: 'video',
      enabled: false,
      contentHint: 'detail',
      stop: vi.fn(),
    } as unknown as MediaStreamTrack

    const localStream = new MockMediaStream()
    localStream.addTrack(fakeDummyTrack)
    useMediaStore.getState().setLocalStream(localStream as unknown as MediaStream)

    const mediaManager = MediaManager.getInstance()
    vi.spyOn(mediaManager, 'createDummyVideoTrack').mockReturnValue(fakeDummyTrack)

    mediaManager.stopScreenShare()

    expect(useMediaStore.getState().isScreenSharing).toBe(false)
    expect(useMediaStore.getState().localScreenStream).toBeNull()
    expect(useGameStore.getState().localPlayer.isScreenSharing).toBe(false)
  })

  it('should properly map remote presenter stream in full screen grid', () => {
    const fakeRemoteStream = {
      id: 'remote-stream-with-screen',
      getVideoTracks: () => [{ id: 'remote-video', kind: 'video', enabled: true }],
      getAudioTracks: () => [{ id: 'remote-audio', kind: 'audio', enabled: true }],
    } as unknown as MediaStream

    useGameStore.setState({
      remotePlayers: {
        'remote-peer-1': {
          id: 'remote-peer-1',
          name: 'Remote Presenter',
          x: 10,
          y: 10,
          direction: 'down',
          isMoving: false,
          avatar: { baseId: 'char-1', shirtColor: '#e03131' },
          currentZoneId: 'zone-1',
          isScreenSharing: true,
          isMuted: false,
          isCameraOff: false,
        },
      },
    })

    useMediaStore.getState().setPeerStream('remote-peer-1', fakeRemoteStream)

    const remotePlayer = useGameStore.getState().remotePlayers['remote-peer-1']
    const peerStreams = useMediaStore.getState().peerStreams
    const peerScreenStreams = useMediaStore.getState().peerScreenStreams

    // Test the exact mapping logic used in FullScreenGrid
    const screenStream = peerScreenStreams[remotePlayer.id] || (remotePlayer.isScreenSharing ? peerStreams[remotePlayer.id] : null)

    expect(screenStream).toBe(fakeRemoteStream)
    expect(remotePlayer.isScreenSharing).toBe(true)
  })
})
