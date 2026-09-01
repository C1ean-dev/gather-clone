import { describe, it, expect, beforeEach } from 'vitest'
import { generateSparrowXml, PackedSubTexture } from '../engine/avatar/avatarAtlasExporter'
import { AvatarAtlasManager } from '../engine/avatar/AvatarAtlasManager'
import { useCustomAssetsStore } from '../store/useCustomAssetsStore'
import { CustomAsset } from '../types/customAsset'

describe('avatarSpritesheetSlicer - Interactive Slicer and XML Generator', () => {
  beforeEach(() => {
    useCustomAssetsStore.setState({ customAssets: [] })
    AvatarAtlasManager.clearCache()
  })

  it('should generate valid Sparrow XML from sliced tile coordinates', () => {
    const subTextures: PackedSubTexture[] = [
      { name: 'hair_afro_down_0', x: 0, y: 0, width: 32, height: 32 },
      { name: 'hair_afro_up_0', x: 32, y: 0, width: 32, height: 32 },
      { name: 'hair_afro_left_0', x: 64, y: 0, width: 32, height: 32 },
      { name: 'hair_afro_right_0', x: 96, y: 0, width: 32, height: 32 },
    ]

    const xml = generateSparrowXml('hair_custom_sheet.png', subTextures)
    expect(xml).toContain('<TextureAtlas imagePath="hair_custom_sheet.png">')
    expect(xml).toContain('<SubTexture name="hair_afro_down_0" x="0" y="0" width="32" height="32"')
    expect(xml).toContain('<SubTexture name="hair_afro_up_0" x="32" y="0" width="32" height="32"')
    expect(xml).toContain('<SubTexture name="hair_afro_left_0" x="64" y="0" width="32" height="32"')
    expect(xml).toContain('<SubTexture name="hair_afro_right_0" x="96" y="0" width="32" height="32"')
    expect(xml).toContain('</TextureAtlas>')

    // Verify it is directly parseable by AvatarAtlasManager
    const parsed = AvatarAtlasManager.parseAtlasXml(xml)
    expect(parsed.imagePath).toBe('hair_custom_sheet.png')
    expect(parsed.subTextures.size).toBe(4)
    expect(parsed.subTextures.get('hair_afro_down_0')).toEqual({
      name: 'hair_afro_down_0',
      x: 0,
      y: 0,
      width: 32,
      height: 32,
      frameX: undefined,
      frameY: undefined,
      frameWidth: undefined,
      frameHeight: undefined,
    })
  })

  it('should store sliced presets with 4 directional frames in useCustomAssetsStore', () => {
    const asset: CustomAsset = {
      id: 'avatar_hair_sliced_test',
      name: 'Afro Sliced',
      type: 'avatar',
      category: 'Avatares',
      avatarSlot: 'hair',
      width: 1,
      height: 1,
      isObstacle: false,
      frames: ['data:down', 'data:up', 'data:left', 'data:right'],
      directionalFrames: {
        down: 'data:down',
        up: 'data:up',
        left: 'data:left',
        right: 'data:right',
      },
      frameRateMs: 160,
      createdAt: Date.now(),
    }

    useCustomAssetsStore.getState().addCustomAsset(asset)
    const stored = useCustomAssetsStore.getState().customAssets
    expect(stored).toHaveLength(1)
    expect(stored[0].directionalFrames?.down).toBe('data:down')
    expect(stored[0].directionalFrames?.up).toBe('data:up')
    expect(stored[0].directionalFrames?.left).toBe('data:left')
    expect(stored[0].directionalFrames?.right).toBe('data:right')
  })
})
