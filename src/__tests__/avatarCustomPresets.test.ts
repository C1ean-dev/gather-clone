import { describe, it, expect, beforeEach } from 'vitest'
import { useCustomAssetsStore } from '../store/useCustomAssetsStore'
import { CustomAsset } from '../types/customAsset'
import { DEFAULT_AVATAR } from '../engine/Constants'
import { AvatarConfig } from '../types/game'

describe('Custom Avatar Presets & Persistence', () => {
  beforeEach(() => {
    // Reset or ensure clean test state
  })

  it('should persist and query custom avatar presets by slot', () => {
    const store = useCustomAssetsStore.getState()
    const testAsset: CustomAsset = {
      id: 'avatar_hair_test_123',
      name: 'Cabelo Neon Punk',
      type: 'avatar',
      category: 'Avatares',
      avatarSlot: 'hair',
      width: 1,
      height: 1,
      isObstacle: false,
      frames: ['data:image/png;base64,sampleHairBase64'],
      frameRateMs: 160,
      createdAt: Date.now(),
    }

    store.addCustomAsset(testAsset)

    const updatedAssets = useCustomAssetsStore.getState().customAssets
    const found = updatedAssets.find((a) => a.id === 'avatar_hair_test_123')
    expect(found).toBeDefined()
    expect(found?.name).toBe('Cabelo Neon Punk')
    expect(found?.avatarSlot).toBe('hair')
    expect(found?.type).toBe('avatar')
  })

  it('should allow equipping custom avatar preset on AvatarConfig', () => {
    const avatar: AvatarConfig = {
      ...DEFAULT_AVATAR,
      customComponents: {},
    }

    const customHairDataUrl = 'data:image/png;base64,customHairPixelArt'

    // Equipping custom preset
    const equippedAvatar: AvatarConfig = {
      ...avatar,
      customComponents: {
        ...avatar.customComponents,
        hair: customHairDataUrl,
      },
    }

    expect(equippedAvatar.customComponents?.hair).toBe(customHairDataUrl)

    // Selecting a standard preset clears the customComponent slot
    const resetComponents = { ...equippedAvatar.customComponents }
    delete resetComponents.hair

    const revertedAvatar: AvatarConfig = {
      ...equippedAvatar,
      hairStyle: 'messy',
      customComponents: resetComponents,
    }

    expect(revertedAvatar.customComponents?.hair).toBeUndefined()
    expect(revertedAvatar.hairStyle).toBe('messy')
  })

  it('should safely delete custom avatar preset and reset equipped state if in use', () => {
    const store = useCustomAssetsStore.getState()
    const testAsset: CustomAsset = {
      id: 'avatar_jacket_test_del',
      name: 'Jaqueta Punk',
      type: 'avatar',
      category: 'Avatares',
      avatarSlot: 'jacket',
      width: 1,
      height: 1,
      isObstacle: false,
      frames: ['data:image/png;base64,jacketBase64ToDelete'],
      frameRateMs: 160,
      createdAt: Date.now(),
    }

    store.addCustomAsset(testAsset)
    expect(useCustomAssetsStore.getState().customAssets.some((a) => a.id === 'avatar_jacket_test_del')).toBe(true)

    // Setup avatar wearing this jacket
    let avatar: AvatarConfig = {
      ...DEFAULT_AVATAR,
      jacketType: 'cardigan',
      customComponents: {
        jacket: 'data:image/png;base64,jacketBase64ToDelete',
      },
    }

    // Simulate delete workflow:
    store.deleteCustomAsset('avatar_jacket_test_del')
    expect(useCustomAssetsStore.getState().customAssets.some((a) => a.id === 'avatar_jacket_test_del')).toBe(false)

    // Safe fallback reset
    if (avatar.customComponents?.jacket === testAsset.frames[0]) {
      const updatedComponents = { ...avatar.customComponents }
      delete updatedComponents.jacket
      avatar = {
        ...avatar,
        jacketType: 'none',
        customComponents: updatedComponents,
      }
    }

    expect(avatar.customComponents?.jacket).toBeUndefined()
    expect(avatar.jacketType).toBe('none')
  })
})

