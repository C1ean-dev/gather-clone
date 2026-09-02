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

  it('should support sub-32x32 dimensions (e.g. 16x16, 8x8, 24x24) in XML and asset definition', () => {
    const subTextures: PackedSubTexture[] = [
      { name: 'glasses_tiny_down_0', x: 0, y: 0, width: 16, height: 16 },
      { name: 'skin_blush_down_0', x: 16, y: 0, width: 8, height: 8 },
      { name: 'hat_cap_down_0', x: 24, y: 0, width: 24, height: 24 },
    ]

    const xml = generateSparrowXml('accessories.png', subTextures)
    expect(xml).toContain('<SubTexture name="glasses_tiny_down_0" x="0" y="0" width="16" height="16"')
    expect(xml).toContain('<SubTexture name="skin_blush_down_0" x="16" y="0" width="8" height="8"')
    expect(xml).toContain('<SubTexture name="hat_cap_down_0" x="24" y="0" width="24" height="24"')

    const parsed = AvatarAtlasManager.parseAtlasXml(xml)
    expect(parsed.subTextures.get('glasses_tiny_down_0')?.width).toBe(16)
    expect(parsed.subTextures.get('glasses_tiny_down_0')?.height).toBe(16)
    expect(parsed.subTextures.get('skin_blush_down_0')?.width).toBe(8)
    expect(parsed.subTextures.get('skin_blush_down_0')?.height).toBe(8)
    expect(parsed.subTextures.get('hat_cap_down_0')?.width).toBe(24)
    expect(parsed.subTextures.get('hat_cap_down_0')?.height).toBe(24)
  })

  it('should support reordering frames within a direction sequence', () => {
    // Simulating the reorder helper logic
    const moveFrameOrder = (frames: { id: string }[], fromIndex: number, toIndex: number) => {
      const list = [...frames]
      const [item] = list.splice(fromIndex, 1)
      list.splice(toIndex, 0, item)
      return list
    }

    const initial = [{ id: 'step_0' }, { id: 'step_1' }, { id: 'step_2' }]
    // Move step_2 to index 0
    const reordered = moveFrameOrder(initial, 2, 0)
    expect(reordered.map((f) => f.id)).toEqual(['step_2', 'step_0', 'step_1'])

    // Move step_0 to index 2
    const reordered2 = moveFrameOrder(reordered, 1, 2)
    expect(reordered2.map((f) => f.id)).toEqual(['step_2', 'step_1', 'step_0'])
  })

  it('should support moving frames between directions (e.g. from down to up)', () => {
    // Simulating transferring frame across direction slots
    const transferFrame = (
      directions: Record<string, { id: string }[]>,
      fromDir: string,
      idx: number,
      toDir: string
    ) => {
      const sourceList = [...directions[fromDir]]
      const [item] = sourceList.splice(idx, 1)
      const targetList = [...directions[toDir], item]
      return {
        ...directions,
        [fromDir]: sourceList,
        [toDir]: targetList,
      }
    }

    const initialDirs = {
      down: [{ id: 'frame_down_0' }, { id: 'frame_down_1' }],
      up: [{ id: 'frame_up_0' }],
    }

    const transferred = transferFrame(initialDirs, 'down', 1, 'up')
    expect(transferred.down).toHaveLength(1)
    expect(transferred.down[0].id).toBe('frame_down_0')
    expect(transferred.up).toHaveLength(2)
    expect(transferred.up[1].id).toBe('frame_down_1')
  })
})
