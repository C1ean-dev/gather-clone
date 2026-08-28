import { app, BrowserWindow, ipcMain, desktopCapturer, session, shell } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import https from 'https'
import http from 'http'
import { spawn } from 'child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let mainWindow: BrowserWindow | null = null

const GITHUB_REPO = 'C1ean-dev/gather-clone'
const CURRENT_VERSION = app.getVersion() || '1.0.0'

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'Gather V2 Clone',
    backgroundColor: '#0c0e14',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
    autoHideMenuBar: true,
  })

  // Grant media permissions automatically
  session.defaultSession.setPermissionCheckHandler(() => {
    return true
  })

  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(true)
  })

  // Handle getDisplayMedia natively in Electron
  session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
    desktopCapturer.getSources({ types: ['screen', 'window'] }).then((sources) => {
      if (sources && sources.length > 0) {
        callback({ video: sources[0] })
      }
    })
  })

  // Enable F12 or Ctrl+Shift+I for DevTools
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i')) {
      mainWindow?.webContents.toggleDevTools()
    }
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

// Compare semantic versions (e.g., "v1.0.2" vs "1.0.0")
function isNewerVersion(latestTag: string, currentVer: string): boolean {
  const clean = (v: string) => v.replace(/^v/i, '').trim().split('.').map(Number)
  const l = clean(latestTag)
  const c = clean(currentVer)
  for (let i = 0; i < Math.max(l.length, c.length); i++) {
    const lNum = isNaN(l[i]) ? 0 : l[i]
    const cNum = isNaN(c[i]) ? 0 : c[i]
    if (lNum > cNum) return true
    if (lNum < cNum) return false
  }
  return false
}

// 1. IPC handler for Screen Sharing sources
ipcMain.handle('get-sources', async () => {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen', 'window'],
      thumbnailSize: { width: 400, height: 225 },
      fetchWindowIcons: true,
    })
    return sources.map((source) => ({
      id: source.id,
      name: source.name,
      thumbnail: source.thumbnail.toDataURL(),
      appIcon: source.appIcon ? source.appIcon.toDataURL() : null,
    }))
  } catch (err) {
    console.error('Error fetching desktop sources:', err)
    return []
  }
})

// 2. IPC handler for checking GitHub Releases
ipcMain.handle('check-update', async () => {
  const currentVersion = app.getVersion() || '1.0.0'
  try {
    const url = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'gather-v2-clone-updater',
        Accept: 'application/vnd.github.v3+json',
      },
    })

    if (!res.ok) {
      return {
        hasUpdate: false,
        currentVersion,
        latestVersion: currentVersion,
        releaseNotes: '',
        downloadUrl: null,
        releaseUrl: `https://github.com/${GITHUB_REPO}/releases`,
      }
    }

    const data = await res.json()
    const latestTag = data.tag_name || ''
    const hasUpdate = isNewerVersion(latestTag, currentVersion)

    // Find executable installer asset (.exe)
    let downloadUrl: string | null = null
    if (Array.isArray(data.assets)) {
      const exeAsset = data.assets.find(
        (a: any) => a.name && a.name.endsWith('.exe') && !a.name.includes('blockmap')
      )
      if (exeAsset && exeAsset.browser_download_url) {
        downloadUrl = exeAsset.browser_download_url
      }
    }

    return {
      hasUpdate,
      currentVersion,
      latestVersion: latestTag,
      releaseName: data.name || latestTag,
      releaseNotes: data.body || '',
      downloadUrl,
      releaseUrl: data.html_url || `https://github.com/${GITHUB_REPO}/releases`,
    }
  } catch (err) {
    console.error('Error checking for updates:', err)
    return {
      hasUpdate: false,
      currentVersion,
      latestVersion: currentVersion,
      releaseNotes: '',
      downloadUrl: null,
      releaseUrl: `https://github.com/${GITHUB_REPO}/releases`,
    }
  }
})

// Helper to follow HTTP/HTTPS redirects when downloading assets
function downloadFileWithRedirects(
  fileUrl: string,
  destPath: string,
  onProgress: (percent: number, downloaded: number, total: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const makeRequest = (currentUrl: string) => {
      const client = currentUrl.startsWith('https') ? https : http
      client
        .get(
          currentUrl,
          {
            headers: {
              'User-Agent': 'gather-v2-clone-updater',
            },
          },
          (response) => {
            // Handle redirects (301, 302, 307, 308)
            if (
              response.statusCode &&
              response.statusCode >= 300 &&
              response.statusCode < 400 &&
              response.headers.location
            ) {
              return makeRequest(response.headers.location)
            }

            if (response.statusCode !== 200) {
              return reject(new Error(`Failed to download file, status code: ${response.statusCode}`))
            }

            const total = parseInt(response.headers['content-length'] || '0', 10)
            let downloaded = 0

            const fileStream = fs.createWriteStream(destPath)

            response.on('data', (chunk) => {
              downloaded += chunk.length
              const percent = total > 0 ? Math.floor((downloaded / total) * 100) : 0
              onProgress(percent, downloaded, total)
            })

            response.pipe(fileStream)

            fileStream.on('finish', () => {
              fileStream.close(() => resolve())
            })

            fileStream.on('error', (err) => {
              fs.unlink(destPath, () => reject(err))
            })
          }
        )
        .on('error', (err) => {
          reject(err)
        })
    }

    makeRequest(fileUrl)
  })
}

// 3. IPC handler to Download and Run the new installer
ipcMain.handle('download-and-install-update', async (event, downloadUrl: string) => {
  try {
    if (!downloadUrl) {
      throw new Error('No download URL provided')
    }

    const tempDir = app.getPath('temp')
    const installerPath = path.join(tempDir, 'GatherClone-Update-Setup.exe')

    await downloadFileWithRedirects(downloadUrl, installerPath, (percent, downloaded, total) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update-download-progress', { percent, downloaded, total })
      }
    })

    // Execute downloaded installer and close current application
    setTimeout(() => {
      try {
        const subprocess = spawn(installerPath, [], {
          detached: true,
          stdio: 'ignore',
        })
        subprocess.unref()
        app.quit()
      } catch (err) {
        // Fallback: open via shell
        shell.openPath(installerPath)
        app.quit()
      }
    }, 1000)

    return true
  } catch (err) {
    console.error('Error downloading and installing update:', err)
    return false
  }
})

// 4. IPC handler to open URL externally
ipcMain.handle('open-external', async (event, url: string) => {
  if (url) {
    await shell.openExternal(url)
  }
})

function getDataDirectory(): string {
  // In development, write directly to the project's src/data folder
  const projectSrcData = path.join(process.cwd(), 'src', 'data')
  if (fs.existsSync(path.join(process.cwd(), 'src'))) {
    if (!fs.existsSync(projectSrcData)) {
      fs.mkdirSync(projectSrcData, { recursive: true })
    }
    return projectSrcData
  }
  // In production package, use userData directory
  const userDataDir = path.join(app.getPath('userData'), 'data')
  if (!fs.existsSync(userDataDir)) {
    fs.mkdirSync(userDataDir, { recursive: true })
  }
  return userDataDir
}

// 5. IPC handlers to save and load native project assets
ipcMain.handle('save-native-assets', async (_event, data: { categories: string[]; assets: any[] }) => {
  try {
    const dataDir = getDataDirectory()
    const filePath = path.join(dataDir, 'nativeAssets.json')
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
    console.log('[NativeAssets] Saved to', filePath)
    return true
  } catch (err) {
    console.error('[NativeAssets] Save error:', err)
    return false
  }
})

ipcMain.handle('load-native-assets', async () => {
  try {
    const dataDir = getDataDirectory()
    const filePath = path.join(dataDir, 'nativeAssets.json')
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8')
      return JSON.parse(raw)
    }
  } catch (err) {
    console.error('[NativeAssets] Load error:', err)
  }
  return null
})

// 6. IPC handlers to save and load native spaces
ipcMain.handle('save-native-spaces', async (_event, spaces: any[]) => {
  try {
    const dataDir = getDataDirectory()
    const filePath = path.join(dataDir, 'nativeSpaces.json')
    fs.writeFileSync(filePath, JSON.stringify(spaces, null, 2), 'utf-8')
    console.log('[NativeSpaces] Saved to', filePath)
    return true
  } catch (err) {
    console.error('[NativeSpaces] Save error:', err)
    return false
  }
})

ipcMain.handle('load-native-spaces', async () => {
  try {
    const dataDir = getDataDirectory()
    const filePath = path.join(dataDir, 'nativeSpaces.json')
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8')
      return JSON.parse(raw)
    }
  } catch (err) {
    console.error('[NativeSpaces] Load error:', err)
  }
  return null
})

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
