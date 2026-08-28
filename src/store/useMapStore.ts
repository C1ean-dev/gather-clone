import { create } from 'zustand'
import { MapData, FloorType, WallType, PlacedFurniture, PrivateZone, EditorTool } from '../types/map'
import { createEmptyWorkspace, createBlacksmithWorkshopTemplate } from '../editor/templates'
import { generateWallsAndDoorsForZones, snapAndAlignZone } from '../editor/zoneWallGenerator'

const MAP_STORAGE_KEY = 'gather_v2_custom_map'

const loadSavedMap = (): MapData | null => {
  try {
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      const raw = window.localStorage.getItem(MAP_STORAGE_KEY)
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
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      window.localStorage.setItem(MAP_STORAGE_KEY, JSON.stringify(mapData))
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

  // Zone Draft (for click-and-drag drawing)
  zoneDraft: { name: string; color: string; hasWalls: boolean; wallType: WallType | string }
  setZoneDraft: (draft: { name: string; color: string; hasWalls: boolean; wallType: WallType | string }) => void

  // Editing Actions
  setFloorTile: (x: number, y: number, floor: FloorType) => void
  setWallTile: (x: number, y: number, wall: WallType | null) => void
  addFurniture: (furniture: PlacedFurniture) => void
  removeFurnitureAt: (tileX: number, tileY: number) => void
  addOrUpdateZone: (zone: PrivateZone) => void
  updateZone: (id: string, partial: Partial<PrivateZone>) => void
  renameZone: (id: string, newName: string) => void
  removeZone: (id: string) => void
  resetEmptyWorkspace: () => void
  loadBlacksmithTemplate: () => void
}

export const useMapStore = create<MapStore>((set, get) => ({
  // Default Map: Loaded from localStorage or Empty Workspace
  mapData: initialMap,

  setMapData: (mapData) => {
    saveMap(mapData)
    set({ mapData })
  },

  isEditorOpen: false,
  toggleEditor: () => set((s) => ({ isEditorOpen: !s.isEditorOpen })),
  setEditorOpen: (open) => set({ isEditorOpen: open }),

  activeTool: 'place_furniture',
  setActiveTool: (tool) => set({ activeTool: tool }),

  selectedFloor: 'habbo_parquet',
  setSelectedFloor: (floor) => set({ selectedFloor: floor, activeTool: 'paint_floor' }),

  selectedWall: 'drywall_white',
  setSelectedWall: (wall) => set({ selectedWall: wall, activeTool: 'paint_wall' }),

  selectedFurnitureDefId: 'window_grid_large',
  setSelectedFurnitureDefId: (defId) => set({ selectedFurnitureDefId: defId, activeTool: 'place_furniture' }),

  zoneDraft: {
    name: 'Nova Sala Privada',
    color: '#4c6ef5',
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

  removeFurnitureAt: (tileX, tileY) =>
    set((state) => {
      const updatedMap = {
        ...state.mapData,
        furniture: state.mapData.furniture.filter((f) => f.x !== tileX || f.y !== tileY),
      }
      saveMap(updatedMap)
      return { mapData: updatedMap }
    }),

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
