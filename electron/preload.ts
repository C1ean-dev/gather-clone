import { contextBridge, ipcRenderer } from 'electron'

export interface IElectronAPI {
  getSources: () => Promise<Array<{ id: string; name: string; thumbnail: string }>>
  isElectron: boolean
}

contextBridge.exposeInMainWorld('electronAPI', {
  getSources: () => ipcRenderer.invoke('get-sources'),
  isElectron: true,
})
