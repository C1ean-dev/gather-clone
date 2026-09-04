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

export interface IElectronAPI {
  getSources: () => Promise<Array<{ id: string; name: string; thumbnail: string; appIcon: string | null }>>
  setScreenSource: (sourceId: string | null, withAudio?: boolean) => Promise<boolean>
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
  setScreenSource: (sourceId: string | null, withAudio: boolean = true) =>
    ipcRenderer.invoke('set-screen-source', { sourceId, withAudio }),
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
