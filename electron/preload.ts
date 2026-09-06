import { contextBridge, ipcRenderer } from 'electron'

export interface UpdateInfo {
  hasUpdate: boolean
  currentVersion: string
  latestVersion: string
  releaseName: string
  releaseNotes: string
  downloadUrl: string | null
  releaseUrl: string
}

export interface UpdateProgress {
  percent: number
  downloaded: number
  total: number
}

export interface ProcessAudioCaptureResult {
  ok: boolean
  error?: string
}

export interface ProcessAudioCaptureInfo {
  supported: boolean
  osRelease: string
  helperPath: string
  helperExists: boolean
  error?: string
}

export interface IElectronAPI {
  getSources: () => Promise<Array<{ id: string; name: string; thumbnail: string; appIcon: string | null }>>
  setScreenSource: (sourceId: string | null, withAudio?: boolean, captureMethod?: string) => Promise<boolean>
  startProcessAudioCapture: (sourceId: string) => Promise<ProcessAudioCaptureResult>
  getProcessAudioCaptureInfo: () => Promise<ProcessAudioCaptureInfo>
  stopProcessAudioCapture: () => Promise<boolean>
  onProcessAudioData: (callback: (data: Uint8Array) => void) => () => void
  onProcessAudioStatus: (callback: (event: { status: 'started' | 'stopped' | 'error'; detail?: string }) => void) => () => void
  isElectron: boolean
  checkForUpdates: () => Promise<UpdateInfo>
  downloadAndInstallUpdate: (downloadUrl: string) => Promise<boolean>
  onUpdateProgress: (callback: (progress: UpdateProgress) => void) => () => void
  openExternal: (url: string) => Promise<void>
  saveNativeAssets: (data: { categories: string[]; assets: any[] }) => Promise<boolean>
  loadNativeAssets: () => Promise<{ categories: string[]; assets: any[] } | null>
  saveNativeSpaces: (spaces: any[]) => Promise<boolean>
  loadNativeSpaces: () => Promise<any[] | null>
  checkFirewallStatus: () => Promise<{ isAllowed: boolean }>
  requestFirewallAccess: () => Promise<{ success: boolean; error?: string }>
  setFullScreen: (flag: boolean) => Promise<boolean>
  isFullScreen: () => Promise<boolean>
  diagnosticLogBatch: (entries: unknown[]) => Promise<{ ok: boolean; path: string | null }>
  openLogsFolder: () => Promise<string | null>
}

contextBridge.exposeInMainWorld('electronAPI', {
  getSources: () => ipcRenderer.invoke('get-sources'),
  setScreenSource: (sourceId: string | null, withAudio: boolean = true, captureMethod = 'auto') =>
    ipcRenderer.invoke('set-screen-source', { sourceId, withAudio, captureMethod }),
  startProcessAudioCapture: (sourceId: string) => ipcRenderer.invoke('start-process-audio-capture', sourceId),
  getProcessAudioCaptureInfo: () => ipcRenderer.invoke('get-process-audio-capture-info'),
  stopProcessAudioCapture: () => ipcRenderer.invoke('stop-process-audio-capture'),
  onProcessAudioData: (callback: (data: Uint8Array) => void) => {
    const handler = (_event: unknown, data: Uint8Array | { data?: number[] } | number[]) => {
      // Electron normally transfers Node Buffers as Uint8Array. Keep a
      // defensive conversion for older Electron/structured-clone versions
      // that deserialize a Buffer as { data: number[] }.
      if (data instanceof Uint8Array) {
        callback(new Uint8Array(data))
      } else if (Array.isArray(data)) {
        callback(Uint8Array.from(data))
      } else if (data && Array.isArray(data.data)) {
        callback(Uint8Array.from(data.data))
      }
    }
    ipcRenderer.on('process-audio-data', handler)
    return () => ipcRenderer.removeListener('process-audio-data', handler)
  },
  onProcessAudioStatus: (callback: (event: { status: 'started' | 'stopped' | 'error'; detail?: string }) => void) => {
    const handler = (_event: unknown, event: { status: 'started' | 'stopped' | 'error'; detail?: string }) => callback(event)
    ipcRenderer.on('process-audio-status', handler)
    return () => ipcRenderer.removeListener('process-audio-status', handler)
  },
  isElectron: true,
  checkForUpdates: () => ipcRenderer.invoke('check-update'),
  downloadAndInstallUpdate: (downloadUrl: string) => ipcRenderer.invoke('download-and-install-update', downloadUrl),
  onUpdateProgress: (callback: (progress: UpdateProgress) => void) => {
    const handler = (_event: any, data: UpdateProgress) => callback(data)
    ipcRenderer.on('update-download-progress', handler)
    return () => {
      ipcRenderer.removeListener('update-download-progress', handler)
    }
  },
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  saveNativeAssets: (data: { categories: string[]; assets: any[] }) => ipcRenderer.invoke('save-native-assets', data),
  loadNativeAssets: () => ipcRenderer.invoke('load-native-assets'),
  saveNativeSpaces: (spaces: any[]) => ipcRenderer.invoke('save-native-spaces', spaces),
  loadNativeSpaces: () => ipcRenderer.invoke('load-native-spaces'),
  checkFirewallStatus: () => ipcRenderer.invoke('check-firewall-status'),
  requestFirewallAccess: () => ipcRenderer.invoke('request-firewall-access'),
  setFullScreen: (flag: boolean) => ipcRenderer.invoke('set-fullscreen', flag),
  isFullScreen: () => ipcRenderer.invoke('is-fullscreen'),
  diagnosticLogBatch: (entries: unknown[]) => ipcRenderer.invoke('diagnostic-log-batch', entries),
  openLogsFolder: () => ipcRenderer.invoke('open-logs-folder'),
})
