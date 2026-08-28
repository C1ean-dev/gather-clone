import { describe, it, expect, beforeEach, vi } from 'vitest'
import { isNewerVersion, UpdateService, CURRENT_APP_VERSION } from '../services/updateService'

describe('Update Service & Version Checker', () => {
  it('should accurately compare semver versions', () => {
    expect(isNewerVersion('v1.0.1', '1.0.0')).toBe(true)
    expect(isNewerVersion('v1.1.0', '1.0.9')).toBe(true)
    expect(isNewerVersion('v2.0.0', '1.9.9')).toBe(true)
    expect(isNewerVersion('v1.0.0', '1.0.0')).toBe(false)
    expect(isNewerVersion('v0.9.9', '1.0.0')).toBe(false)
  })

  it('should detect update when GitHub release tag is higher than current app version', async () => {
    const mockRelease = {
      tag_name: 'v1.0.5',
      name: 'Release v1.0.5',
      body: 'Bug fixes and performance improvements',
      html_url: 'https://github.com/C1ean-dev/gather-clone/releases/tag/v1.0.5',
      assets: [
        {
          name: 'Gather-Clone-Setup-1.0.5.exe',
          browser_download_url: 'https://github.com/C1ean-dev/gather-clone/releases/download/v1.0.5/Gather-Clone-Setup.exe',
        },
      ],
    }

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockRelease,
    } as any)

    const updateInfo = await UpdateService.checkForUpdates()

    expect(updateInfo.hasUpdate).toBe(true)
    expect(updateInfo.latestVersion).toBe('v1.0.5')
    expect(updateInfo.downloadUrl).toBe(
      'https://github.com/C1ean-dev/gather-clone/releases/download/v1.0.5/Gather-Clone-Setup.exe'
    )
    expect(updateInfo.releaseNotes).toBe('Bug fixes and performance improvements')
  })

  it('should report no update when current version is already up to date', async () => {
    const mockRelease = {
      tag_name: 'v1.0.0',
      name: 'Release v1.0.0',
      body: 'Initial release',
      html_url: 'https://github.com/C1ean-dev/gather-clone/releases/tag/v1.0.0',
      assets: [],
    }

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockRelease,
    } as any)

    const updateInfo = await UpdateService.checkForUpdates()

    expect(updateInfo.hasUpdate).toBe(false)
  })
})
