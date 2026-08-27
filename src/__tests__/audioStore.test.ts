import { describe, it, expect, beforeEach } from 'vitest'
import { useMediaStore } from '../store/useMediaStore'

describe('Audio & Media Store - Expected Behaviors', () => {
  beforeEach(() => {
    // Reset store state before each test
    useMediaStore.setState({
      selectedAudioInput: 'default',
      selectedAudioOutput: 'default',
      inputVolume: 100,
      outputVolume: 100,
      sensitivityMode: 'auto',
      manualSensitivityThreshold: 20,
      echoCancellation: true,
      autoGainControl: true,
      isNoiseSuppressionEnabled: true,
      screenShareAudioVolume: 50,
      duckingEnabled: true,
      isMuted: false,
      isCameraOff: false,
      isScreenSharing: false,
      isGridCallOpen: false,
      isSettingsModalOpen: false,
      localAudioLevel: 0,
      isGateOpen: false,
      isTestingMic: false,
      peerStreams: {},
      peerScreenStreams: {},
    })
  })

  it('should initialize with expected default audio settings', () => {
    const state = useMediaStore.getState()
    expect(state.inputVolume).toBe(100)
    expect(state.outputVolume).toBe(100)
    expect(state.sensitivityMode).toBe('auto')
    expect(state.manualSensitivityThreshold).toBe(20)
    expect(state.echoCancellation).toBe(true)
    expect(state.autoGainControl).toBe(true)
    expect(state.isNoiseSuppressionEnabled).toBe(true)
    expect(state.screenShareAudioVolume).toBe(50)
    expect(state.duckingEnabled).toBe(true)
  })

  it('should update input volume (microphone gain) correctly', () => {
    const { setInputVolume } = useMediaStore.getState()
    setInputVolume(150)
    expect(useMediaStore.getState().inputVolume).toBe(150)

    setInputVolume(0)
    expect(useMediaStore.getState().inputVolume).toBe(0)

    setInputVolume(200)
    expect(useMediaStore.getState().inputVolume).toBe(200)
  })

  it('should update output volume (master remote audio) correctly', () => {
    const { setOutputVolume } = useMediaStore.getState()
    setOutputVolume(75)
    expect(useMediaStore.getState().outputVolume).toBe(75)

    setOutputVolume(0)
    expect(useMediaStore.getState().outputVolume).toBe(0)
  })

  it('should switch between automatic and manual sensitivity modes', () => {
    const { setSensitivityMode, setManualSensitivityThreshold } = useMediaStore.getState()
    
    // Switch to manual mode
    setSensitivityMode('manual')
    expect(useMediaStore.getState().sensitivityMode).toBe('manual')

    // Adjust threshold
    setManualSensitivityThreshold(45)
    expect(useMediaStore.getState().manualSensitivityThreshold).toBe(45)

    // Switch back to auto mode
    setSensitivityMode('auto')
    expect(useMediaStore.getState().sensitivityMode).toBe('auto')
  })

  it('should toggle microphone mute state', () => {
    const { toggleMute } = useMediaStore.getState()
    expect(useMediaStore.getState().isMuted).toBe(false)

    toggleMute()
    expect(useMediaStore.getState().isMuted).toBe(true)

    toggleMute()
    expect(useMediaStore.getState().isMuted).toBe(false)
  })

  it('should toggle camera state', () => {
    const { toggleCamera } = useMediaStore.getState()
    expect(useMediaStore.getState().isCameraOff).toBe(false)

    toggleCamera()
    expect(useMediaStore.getState().isCameraOff).toBe(true)

    toggleCamera()
    expect(useMediaStore.getState().isCameraOff).toBe(false)
  })

  it('should toggle noise suppression DSP filter', () => {
    const { toggleNoiseSuppression } = useMediaStore.getState()
    expect(useMediaStore.getState().isNoiseSuppressionEnabled).toBe(true)

    toggleNoiseSuppression()
    expect(useMediaStore.getState().isNoiseSuppressionEnabled).toBe(false)

    toggleNoiseSuppression()
    expect(useMediaStore.getState().isNoiseSuppressionEnabled).toBe(true)
  })

  it('should update screen share audio volume and anti-echo voice ducking toggle', () => {
    const { setScreenShareAudioVolume, setDuckingEnabled } = useMediaStore.getState()
    
    setScreenShareAudioVolume(65)
    expect(useMediaStore.getState().screenShareAudioVolume).toBe(65)

    setDuckingEnabled(false)
    expect(useMediaStore.getState().duckingEnabled).toBe(false)

    setDuckingEnabled(true)
    expect(useMediaStore.getState().duckingEnabled).toBe(true)
  })

  it('should update real-time local audio level and gate open status', () => {
    const { setLocalAudioLevel } = useMediaStore.getState()
    
    setLocalAudioLevel(0.42, true)
    expect(useMediaStore.getState().localAudioLevel).toBe(0.42)
    expect(useMediaStore.getState().isGateOpen).toBe(true)

    setLocalAudioLevel(0.01, false)
    expect(useMediaStore.getState().localAudioLevel).toBe(0.01)
    expect(useMediaStore.getState().isGateOpen).toBe(false)
  })

  it('should handle microphone test mode toggle', () => {
    const { setIsTestingMic } = useMediaStore.getState()
    expect(useMediaStore.getState().isTestingMic).toBe(false)

    setIsTestingMic(true)
    expect(useMediaStore.getState().isTestingMic).toBe(true)

    setIsTestingMic(false)
    expect(useMediaStore.getState().isTestingMic).toBe(false)
  })

  it('should open and close audio settings modal', () => {
    const { setSettingsModalOpen } = useMediaStore.getState()
    expect(useMediaStore.getState().isSettingsModalOpen).toBe(false)

    setSettingsModalOpen(true)
    expect(useMediaStore.getState().isSettingsModalOpen).toBe(true)

    setSettingsModalOpen(false)
    expect(useMediaStore.getState().isSettingsModalOpen).toBe(false)
  })

  it('should manage remote peer streams properly', () => {
    const { setPeerStream, removePeerStream, clearAllPeerStreams } = useMediaStore.getState()
    const fakeStreamA = {} as MediaStream
    const fakeStreamB = {} as MediaStream

    setPeerStream('peer-1', fakeStreamA)
    setPeerStream('peer-2', fakeStreamB)

    expect(useMediaStore.getState().peerStreams['peer-1']).toBe(fakeStreamA)
    expect(useMediaStore.getState().peerStreams['peer-2']).toBe(fakeStreamB)

    removePeerStream('peer-1')
    expect(useMediaStore.getState().peerStreams['peer-1']).toBeUndefined()
    expect(useMediaStore.getState().peerStreams['peer-2']).toBe(fakeStreamB)

    clearAllPeerStreams()
    expect(Object.keys(useMediaStore.getState().peerStreams).length).toBe(0)
  })
})
