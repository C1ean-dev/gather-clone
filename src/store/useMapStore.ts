import { create } from 'zustand'
import { MapData, FloorType, WallType, PlacedFurniture, PrivateZone, EditorTool } from '../types/map'
import { createEmptyWorkspace, createBlacksmithWorkshopTemplate } from '../editor/templates'
import { generateWallsAndDoorsForZones, snapAndAlignZone } from '../editor/zoneWallGenerator'
import { getNextAvailableZoneColor, FURNITURE_CATALOG } from '../engine/Constants'
import { useSavedSpacesStore } from './useSavedSpacesStore'
import { useGameStore } from './useGameStore'
import { useCustomAssetsStore } from './useCustomAssetsStore'
import { PeerManager } from '../p2p/PeerManager'

const MAP_STORAGE_KEY = 'gather_v2_custom_map'

const getStorage = () => {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage
  }
  if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
    return (globalThis as any).localStorage
  }
  return null
}

const loadSavedMap = (): MapData | null => {
  try {
    const storage = getStorage()
    if (storage) {
      const raw = storage.getItem(MAP_STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (
          parsed &&
          Array.isArray(parsed.floors) &&
          parsed.floors.length > 0 &&
          Array.isArray(parsed.floors[0]) &&
          parsed.floors[0].length > 0
        ) {
          if (parsed.id === 'blacksmith_workshop') {
            return createEmptyWorkspace()
          }
          const defaultEmpty = createEmptyWorkspace()
          return {
            id: parsed.id || 'custom_map',
            name: parsed.name || 'Espaço de Trabalho',
            width: parsed.width || parsed.floors[0].length || 68,
            height: parsed.height || parsed.floors.length || 40,
            tileSize: parsed.tileSize || 32,
            spawnPoint: parsed.spawnPoint || { x: 34, y: 20 },
            floors: parsed.floors,
            walls: Array.isArray(parsed.walls) && parsed.walls.length > 0 ? parsed.walls : defaultEmpty.walls,
            furniture: Array.isArray(parsed.furniture) ? parsed.furniture : [],
            zones: Array.isArray(parsed.zones) ? parsed.zones : [],
          }
        }
      }
    }
  } catch (e) {
    // Ignore in non-browser env
  }
  return null
}

const saveMap = (mapData: MapData) => {
  try {
    const storage = getStorage()
    if (storage) {
      storage.setItem(MAP_STORAGE_KEY, JSON.stringify(mapData))
    }
  } catch (e) {
    // Ignore in non-browser env
  }
}

const initialMap = loadSavedMap() || createEmptyWorkspace()

interface MapStore {
  mapData: MapData
  setMapData: (map: MapData) => void

  // Editor State
  isEditorOpen: boolean
  toggleEditor: () => void
  setEditorOpen: (open: boolean) => void
  activeTool: EditorTool
  setActiveTool: (tool: EditorTool) => void

  // Selected brush items
  selectedFloor: FloorType
  setSelectedFloor: (floor: FloorType) => void
  selectedWall: WallType
  setSelectedWall: (wall: WallType) => void
  selectedFurnitureDefId: string
  setSelectedFurnitureDefId: (defId: string) => void

  // Interactive Furniture Selection & Context Actions
  selectedPlacedFurnitureId: string | null
  setSelectedPlacedFurnitureId: (id: string | null) => void
  isMovingFurniture: boolean
  setIsMovingFurniture: (moving: boolean) => void
  updateFurniture: (id: string, partial: Partial<PlacedFurniture>) => void
  removeFurnitureById: (id: string) => void

  // Zone Draft (for click-and-drag drawing)
  zoneDraft: { name: string; color: string; hasWalls: boolean; wallType: WallType | string }
  setZoneDraft: (draft: { name: string; color: string; hasWalls: boolean; wallType: WallType | string }) => void

  // Editing Actions
  setFloorTile: (x: number, y: number, floor: FloorType) => void
  setWallTile: (x: number, y: number, wall: WallType | null) => void
  addFurniture: (furniture: PlacedFurniture) => void
  removeFurnitureAt: (tileX: number, tileY: number) => boolean
  removeZoneAt: (tileX: number, tileY: number) => boolean
  addOrUpdateZone: (zone: PrivateZone) => void
  updateZone: (id: string, partial: Partial<PrivateZone>) => void
  renameZone: (id: string, newName: string) => void
  removeZone: (id: string) => void
  resetEmptyWorkspace: () => void
  loadBlacksmithTemplate: () => void
}

export const autoSaveCurrentSpace = () => {
  try {
    const currentMap = useMapStore.getState().mapData
    saveMap(currentMap)

    const { activeSpaceId, saveCurrentMapToSpace, createSavedSpace } = useSavedSpacesStore.getState()
    const roomName = useGameStore.getState().roomName

    if (activeSpaceId) {
      saveCurrentMapToSpace(activeSpaceId, currentMap)
    } else {
      createSavedSpace(roomName || currentMap.name || 'Meu Espaço', currentMap)
    }
  } catch (err) {
    console.error('[AutoSave] Failed to auto-save space:', err)
  }
}

export const useMapStore = create<MapStore>((set, get) => ({
  // Default Map: Loaded from localStorage or Empty Workspace
  mapData: initialMap,

  setMapData: (mapData) => {
    saveMap(mapData)
    set({ mapData })
  },

  isEditorOpen: false,
  toggleEditor: () => {
    const wasOpen = get().isEditorOpen
    if (wasOpen) {
      autoSaveCurrentSpace()
    }
    set({ isEditorOpen: !wasOpen })
  },
  setEditorOpen: (open) => {
    const wasOpen = get().isEditorOpen
    if (wasOpen && !open) {
      autoSaveCurrentSpace()
    }
    set({ isEditorOpen: open })
  },

  activeTool: 'place_furniture',
  setActiveTool: (tool) => set({ activeTool: tool }),

  selectedFloor: 'habbo_parquet',
  setSelectedFloor: (floor) => set({ selectedFloor: floor, activeTool: 'paint_floor' }),

  selectedWall: 'drywall_white',
  setSelectedWall: (wall) => set({ selectedWall: wall, activeTool: 'paint_wall' }),

  selectedFurnitureDefId: 'window_grid_large',
  setSelectedFurnitureDefId: (defId) => set({ selectedFurnitureDefId: defId, activeTool: 'place_furniture' }),

  selectedPlacedFurnitureId: null,
  setSelectedPlacedFurnitureId: (id) => set({ selectedPlacedFurnitureId: id, isMovingFurniture: false }),

  isMovingFurniture: false,
  setIsMovingFurniture: (moving) => set({ isMovingFurniture: moving }),

  updateFurniture: (id, partial) =>
    set((state) => {
      const updatedFurniture = state.mapData.furniture.map((f) =>
        f.id === id ? { ...f, ...partial } : f
      )
      const updatedMap = {
        ...state.mapData,
        furniture: updatedFurniture,
      }
      saveMap(updatedMap)
      return { mapData: updatedMap }
    }),

  removeFurnitureById: (id) =>
    set((state) => {
      const updatedFurniture = state.mapData.furniture.filter((f) => f.id !== id)
      const updatedMap = {
        ...state.mapData,
        furniture: updatedFurniture,
      }
      saveMap(updatedMap)
      return {
        mapData: updatedMap,
        selectedPlacedFurnitureId: state.selectedPlacedFurnitureId === id ? null : state.selectedPlacedFurnitureId,
        isMovingFurniture: false,
      }
    }),

  zoneDraft: {
    name: 'Nova Sala Privada',
    color: getNextAvailableZoneColor(initialMap.zones || []),
    hasWalls: true,
    wallType: 'drywall_white',
  },
  setZoneDraft: (zoneDraft) => set({ zoneDraft }),

  setFloorTile: (x, y, floor) =>
    set((state) => {
      if (y < 0 || y >= state.mapData.height || x < 0 || x >= state.mapData.width) return state
      const floors = state.mapData.floors.map((row, rIdx) =>
        rIdx === y ? row.map((col, cIdx) => (cIdx === x ? floor : col)) : row
      )
      const updatedMap = { ...state.mapData, floors }
      saveMap(updatedMap)
      return { mapData: updatedMap }
    }),

  setWallTile: (x, y, wall) =>
    set((state) => {
      if (y < 0 || y >= state.mapData.height || x < 0 || x >= state.mapData.width) return state
      const walls = state.mapData.walls.map((row, rIdx) =>
        rIdx === y ? row.map((col, cIdx) => (cIdx === x ? wall : col)) : row
      )
      const updatedMap = { ...state.mapData, walls }
      saveMap(updatedMap)
      return { mapData: updatedMap }
    }),

  addFurniture: (furniture) =>
    set((state) => {
      const updatedMap = {
        ...state.mapData,
        furniture: [...state.mapData.furniture.filter((f) => f.id !== furniture.id), furniture],
      }
      saveMap(updatedMap)
      return { mapData: updatedMap }
    }),

  removeFurnitureAt: (tileX, tileY) => {
    let removedAny = false
    set((state) => {
      const customAssets = useCustomAssetsStore.getState().customAssets
      const remainingFurniture = state.mapData.furniture.filter((f) => {
        const custom = customAssets.find((a) => a.id === f.defId)
        const def = custom || FURNITURE_CATALOG.find((cat) => cat.id === f.defId)
        const w = def?.width || 1
        const h = def?.height || 1
        const isInside = tileX >= f.x && tileX < f.x + w && tileY >= f.y && tileY < f.y + h
        if (isInside) {
          removedAny = true
          return false
        }
        return true
      })

      if (removedAny) {
        const updatedMap = {
          ...state.mapData,
          furniture: remainingFurniture,
        }
        saveMap(updatedMap)
        return { mapData: updatedMap }
      }
      return state
    })
    return removedAny
  },

  removeZoneAt: (tileX, tileY) => {
    const zones = get().mapData.zones
    const targetZone = zones.find((z) => {
      return tileX >= z.x && tileX < z.x + z.width && tileY >= z.y && tileY < z.y + z.height
    })
    if (targetZone) {
      get().removeZone(targetZone.id)
      PeerManager.getInstance().sendMapEdit('remove_zone', { id: targetZone.id })
      return true
    }
    return false
  },

  // Automatically snap and enclose zones with clean walls and smart doorways
  addOrUpdateZone: (zone) =>
    set((state) => {
      const alignedZone = snapAndAlignZone(
        zone,
        state.mapData.zones,
        state.mapData.width,
        state.mapData.height
      )

      // Allow touching/shared walls, but forbid interior area intersections
      const hasOverlap = state.mapData.zones.some((z) => {
        if (z.id === alignedZone.id) return false
        const aMaxX = alignedZone.x + alignedZone.width - 1
        const aMaxY = alignedZone.y + alignedZone.height - 1
        const bMaxX = z.x + z.width - 1
        const bMaxY = z.y + z.height - 1
        const overlapX = Math.min(aMaxX, bMaxX) - Math.max(alignedZone.x, z.x)
        const overlapY = Math.min(aMaxY, bMaxY) - Math.max(alignedZone.y, z.y)
        return overlapX >= 1 && overlapY >= 1
      })

      if (hasOverlap) {
        return state
      }

      const updatedZones = [...state.mapData.zones.filter((z) => z.id !== alignedZone.id), alignedZone]
      const updatedWalls = generateWallsAndDoorsForZones(
        updatedZones,
        state.mapData.width,
        state.mapData.height,
        state.selectedWall || 'habbo_hotel_gold'
      )

      const updatedMap = {
        ...state.mapData,
        zones: updatedZones,
        walls: updatedWalls,
      }
      saveMap(updatedMap)
      return { mapData: updatedMap }
    }),

  updateZone: (id, partial) =>
    set((state) => {
      const updatedZones = state.mapData.zones.map((z) =>
        z.id === id ? { ...z, ...partial } : z
      )
      const updatedMap = {
        ...state.mapData,
        zones: updatedZones,
      }
      saveMap(updatedMap)
      return { mapData: updatedMap }
    }),

  renameZone: (id, newName) =>
    set((state) => {
      const updatedZones = state.mapData.zones.map((z) =>
        z.id === id ? { ...z, name: newName.trim() || z.name } : z
      )
      const updatedMap = {
        ...state.mapData,
        zones: updatedZones,
      }
      saveMap(updatedMap)
      return { mapData: updatedMap }
    }),

  removeZone: (id) =>
    set((state) => {
      const updatedZones = state.mapData.zones.filter((z) => z.id !== id)
      const updatedWalls = generateWallsAndDoorsForZones(
        updatedZones,
        state.mapData.width,
        state.mapData.height,
        state.selectedWall || 'habbo_hotel_gold'
      )

      const updatedMap = {
        ...state.mapData,
        zones: updatedZones,
        walls: updatedWalls,
      }
      saveMap(updatedMap)
      return { mapData: updatedMap }
    }),

  resetEmptyWorkspace: () => {
    const fresh = createEmptyWorkspace()
    saveMap(fresh)
    set({ mapData: fresh })
  },

  loadBlacksmithTemplate: () => {
    const forge = createBlacksmithWorkshopTemplate()
    saveMap(forge)
    set({ mapData: forge })
  },
}))
