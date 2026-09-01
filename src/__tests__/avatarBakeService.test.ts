import { describe, it, expect, beforeEach } from 'vitest'
import { bakeAvatarPreset, cropContentDataUrl } from '../engine/avatar/avatarBakeService'
import { AvatarAtlasManager } from '../engine/avatar/AvatarAtlasManager'

describe('avatarBakeService - Bake on Demand', () => {
  beforeEach(() => {
    AvatarAtlasManager.clearCache()
  })

  it('should bake procedural presets into a 32x32 transparent dataUrl', () => {
    const dataUrl = bakeAvatarPreset('hair', 'long_bangs', { hairColor: '#e03131' })
    expect(dataUrl).toBeDefined()
    expect(typeof dataUrl).toBe('string')
    expect(dataUrl.startsWith('data:image/png')).toBe(true)
  })

  it('should bake clothing presets with custom color', () => {
    const topDataUrl = bakeAvatarPreset('top', 'kimono', { topColor: '#4c6ef5' })
    expect(topDataUrl).toBeDefined()
    expect(topDataUrl.startsWith('data:image/png')).toBe(true)

    const glassesDataUrl = bakeAvatarPreset('glasses', 'round', { glassesColor: '#343a40' })
    expect(glassesDataUrl).toBeDefined()
    expect(glassesDataUrl.startsWith('data:image/png')).toBe(true)
  })

  it('should bake from AvatarAtlasManager when atlas subtexture exists', () => {
    const hairXml = `
      <TextureAtlas imagePath="hair.png">
        <SubTexture name="hair_messy_down_0" x="0" y="0" width="32" height="32"/>
      </TextureAtlas>
    `
    AvatarAtlasManager.registerAtlasXml('hair', hairXml)

    const dataUrl = bakeAvatarPreset('hair', 'messy')
    expect(dataUrl).toBeDefined()
    expect(dataUrl.startsWith('data:image/png')).toBe(true)
  })

  it('should return empty/null for none or invalid presets', () => {
    const dataUrl = bakeAvatarPreset('hair', 'none')
    expect(dataUrl).toBe('')
  })

  it('should crop empty space and return close-up dataUrl', async () => {
    const rawDataUrl = 'data:image/png;base64,sample'
    const cropped = await cropContentDataUrl(rawDataUrl)
    expect(cropped).toBeDefined()
  })
})
