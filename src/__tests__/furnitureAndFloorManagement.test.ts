import { describe, it, expect, beforeEach } from 'vitest'
import { useCustomAssetsStore } from '../store/useCustomAssetsStore'
import { useMapStore } from '../store/useMapStore'
import { CustomAsset } from '../types/customAsset'
import { createEmptyWorkspace } from '../editor/templates'

describe('Furniture & Floor Management (Edit and Delete)', () => {
  beforeEach(() => {
    useCustomAssetsStore.setState({
      customAssets: [],
      customCategories: ['Geral', 'Forja Antiga', 'Pisos Personalizados'],
      isCustomModalOpen: false,
      editingAssetId: null,
    })
    const baseMap = createEmptyWorkspace()
    useMapStore.setState({
      mapData: baseMap,
      selectedFurnitureDefId: '',
      selectedFloor: 'habbo_parquet',
    })
  })

  it('should allow adding, editing and deleting furniture', () => {
    const assetStore = useCustomAssetsStore.getState()
    const mapStore = useMapStore.getState()

    // 1. Add furniture
    const furnAsset: CustomAsset = {
      id: 'furn_throne_001',
      name: 'Trono Real',
      type: 'furniture',
      category: 'Forja Antiga',
      width: 2,
      height: 2,
      isObstacle: true,
      frames: ['data:image/png;base64,mockThrone'],
      createdAt: Date.now(),
    }
    assetStore.addCustomAsset(furnAsset)

    expect(useCustomAssetsStore.getState().getAssetById('furn_throne_001')).toBeDefined()
    expect(useCustomAssetsStore.getState().getAssetById('furn_throne_001')?.name).toBe('Trono Real')

    // 2. Place on map
    mapStore.addFurniture({
      id: 'placed_1',
      defId: 'furn_throne_001',
      x: 5,
      y: 5,
      width: 2,
      height: 2,
      isObstacle: true,
    })
    expect(useMapStore.getState().mapData.furniture.some((f) => f.defId === 'furn_throne_001')).toBe(true)

    // 3. Edit furniture
    assetStore.updateCustomAsset('furn_throne_001', {
      name: 'Trono Dourado Renovado',
      width: 3,
      height: 3,
    })
    const updated = useCustomAssetsStore.getState().getAssetById('furn_throne_001')
    expect(updated?.name).toBe('Trono Dourado Renovado')
    expect(updated?.width).toBe(3)

    // 4. Delete furniture and remove instances from map
    assetStore.deleteCustomAsset('furn_throne_001')
    useMapStore.getState().removeFurnitureByDefId('furn_throne_001')

    expect(useCustomAssetsStore.getState().getAssetById('furn_throne_001')).toBeUndefined()
    expect(useMapStore.getState().mapData.furniture.some((f) => f.defId === 'furn_throne_001')).toBe(false)
  })

  it('should allow adding, editing and deleting floors and safely restore default floor on map', () => {
    const assetStore = useCustomAssetsStore.getState()
    const mapStore = useMapStore.getState()

    // 1. Add custom floor
    const floorAsset: CustomAsset = {
      id: 'floor_lava_tiles',
      name: 'Piso de Lava',
      type: 'floor',
      category: 'Pisos Personalizados',
      width: 1,
      height: 1,
      isObstacle: false,
      frames: ['data:image/png;base64,mockLava'],
      createdAt: Date.now(),
    }
    assetStore.addCustomAsset(floorAsset)
    expect(useCustomAssetsStore.getState().getAssetById('floor_lava_tiles')).toBeDefined()

    // 2. Set custom floor tiles on map
    mapStore.setFloorTile(0, 0, 'floor_lava_tiles' as any)
    mapStore.setFloorTile(0, 1, 'floor_lava_tiles' as any)
    expect(useMapStore.getState().mapData.floors[0][0]).toBe('floor_lava_tiles')
    expect(useMapStore.getState().mapData.floors[1][0]).toBe('floor_lava_tiles')

    // 3. Edit floor properties
    assetStore.updateCustomAsset('floor_lava_tiles', {
      name: 'Piso de Magma Ardente',
    })
    expect(useCustomAssetsStore.getState().getAssetById('floor_lava_tiles')?.name).toBe('Piso de Magma Ardente')

    // 4. Delete custom floor and replace on map with default 'habbo_parquet'
    assetStore.deleteCustomAsset('floor_lava_tiles')
    useMapStore.getState().replaceFloorGlobally('floor_lava_tiles', 'habbo_parquet')

    expect(useCustomAssetsStore.getState().getAssetById('floor_lava_tiles')).toBeUndefined()
    // Verify tiles were safely replaced with default floor
    expect(useMapStore.getState().mapData.floors[0][0]).toBe('habbo_parquet')
    expect(useMapStore.getState().mapData.floors[1][0]).toBe('habbo_parquet')
  })
})
