export interface AudioDeviceInfo {
  deviceId: string
  label: string
  groupId?: string
}

export type SensitivityMode = 'auto' | 'manual'

export interface AudioSettings {
  selectedAudioInput: string
  selectedAudioOutput: string
  inputVolume: number // 0 to 200 (percentage, 100 is unity gain)
  outputVolume: number // 0 to 100 (percentage)
  sensitivityMode: SensitivityMode
  manualSensitivityThreshold: number // 0 to 100
  echoCancellation: boolean
  autoGainControl: boolean
  screenShareAudioVolume: number // 0 to 100 (percentage, default 50)
  duckingEnabled: boolean // Auto-reduce screen audio when speaking
}
