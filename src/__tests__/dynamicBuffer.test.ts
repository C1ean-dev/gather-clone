import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DynamicBufferManager } from '../services/DynamicBufferManager'
import { useMediaStore } from '../store/useMediaStore'

describe('DynamicBufferManager (Adaptive Jitter Buffer up to 5s)', () => {
  beforeEach(() => {
    useMediaStore.setState({
      liveBufferMode: 'dynamic',
      liveBufferDelay: 3000,
    })
  })

  it('should calculate 3000ms buffer for 1080p 60fps to guarantee smooth playback', () => {
    // 1080p @ 60fps
    const buffer1080p60 = DynamicBufferManager.calculateBaseBufferForQuality(1920, 1080, 60)
    expect(buffer1080p60).toBe(3000)

    // 1080p @ 30fps
    const buffer1080p30 = DynamicBufferManager.calculateBaseBufferForQuality(1920, 1080, 30)
    expect(buffer1080p30).toBe(2000)

    // 720p @ 60fps
    const buffer720p60 = DynamicBufferManager.calculateBaseBufferForQuality(1280, 720, 60)
    expect(buffer720p60).toBe(1800)

    // 720p @ 30fps
    const buffer720p30 = DynamicBufferManager.calculateBaseBufferForQuality(1280, 720, 30)
    expect(buffer720p30).toBe(1200)

    // 480p SD
    const buffer480p = DynamicBufferManager.calculateBaseBufferForQuality(854, 480, 30)
    expect(buffer480p).toBe(800)
  })

  it('should enforce maximum buffer limit of 5000ms (5 seconds)', () => {
    const { setLiveBufferDelay } = useMediaStore.getState()

    // Try to set higher than 5000ms
    setLiveBufferDelay(8000)
    expect(useMediaStore.getState().liveBufferDelay).toBe(5000)

    // Try to set lower than 200ms
    setLiveBufferDelay(50)
    expect(useMediaStore.getState().liveBufferDelay).toBe(200)
  })

  it('should toggle between dynamic and manual buffer modes', () => {
    const { setLiveBufferMode, setLiveBufferDelay } = useMediaStore.getState()

    expect(useMediaStore.getState().liveBufferMode).toBe('dynamic')

    setLiveBufferMode('manual')
    expect(useMediaStore.getState().liveBufferMode).toBe('manual')

    setLiveBufferDelay(4000)
    expect(useMediaStore.getState().liveBufferDelay).toBe(4000)

    setLiveBufferMode('dynamic')
    expect(useMediaStore.getState().liveBufferMode).toBe('dynamic')
  })
})
