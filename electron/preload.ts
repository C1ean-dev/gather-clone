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
  isElectron: boolean
  checkForUpdates: () => Promise<UpdateInfo>
  downloadAndInstallUpdate: (downloadUrl: string) => Promise<boolean>
  onUpdateProgress: (callback: (progress: UpdateProgress) => void) => () => void
  openExternal: (url: string) => Promise<void>
}

contextBridge.exposeInMainWorld('electronAPI', {
  getSources: () => ipcRenderer.invoke('get-sources'),
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
})
