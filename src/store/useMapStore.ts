import { create } from 'zustand'
import { MapData, FloorType, WallType, PlacedFurniture, PrivateZone, EditorTool } from '../types/map'
import { createEmptyWorkspace } from '../editor/templates'
import { generateWallsAndDoorsForZones, snapAndAlignZone } from '../editor/zoneWallGenerator'

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
  zoneDraft: { name: string; color: string }
  setZoneDraft: (draft: { name: string; color: string }) => void

  // Editing Actions
  setFloorTile: (x: number, y: number, floor: FloorType) => void
  setWallTile: (x: number, y: number, wall: WallType | null) => void
  addFurniture: (furniture: PlacedFurniture) => void
  removeFurnitureAt: (tileX: number, tileY: number) => void
  addOrUpdateZone: (zone: PrivateZone) => void
  removeZone: (id: string) => void
  resetEmptyWorkspace: () => void
}

export const useMapStore = create<MapStore>((set, get) => ({
  // Default Map: Empty Workspace for Custom Editing
  mapData: createEmptyWorkspace(),

  setMapData: (mapData) => set({ mapData }),

  isEditorOpen: false,
  toggleEditor: () => set((s) => ({ isEditorOpen: !s.isEditorOpen })),
  setEditorOpen: (open) => set({ isEditorOpen: open }),

  activeTool: 'place_furniture',
  setActiveTool: (tool) => set({ activeTool: tool }),

  selectedFloor: 'habbo_parquet',
  setSelectedFloor: (floor) => set({ selectedFloor: floor, activeTool: 'paint_floor' }),

  selectedWall: 'habbo_hotel_gold',
  setSelectedWall: (wall) => set({ selectedWall: wall, activeTool: 'paint_wall' }),

  selectedFurnitureDefId: 'window_grid_large',
  setSelectedFurnitureDefId: (defId) => set({ selectedFurnitureDefId: defId, activeTool: 'place_furniture' }),

  zoneDraft: {
    name: 'Nova Mesa Privada',
    color: '#4c6ef5',
  },
  setZoneDraft: (zoneDraft) => set({ zoneDraft }),

  setFloorTile: (x, y, floor) =>
    set((state) => {
      if (y < 0 || y >= state.mapData.height || x < 0 || x >= state.mapData.width) return state
      const floors = state.mapData.floors.map((row, rIdx) =>
        rIdx === y ? row.map((col, cIdx) => (cIdx === x ? floor : col)) : row
      )
      return { mapData: { ...state.mapData, floors } }
    }),

  setWallTile: (x, y, wall) =>
    set((state) => {
      if (y < 0 || y >= state.mapData.height || x < 0 || x >= state.mapData.width) return state
      const walls = state.mapData.walls.map((row, rIdx) =>
        rIdx === y ? row.map((col, cIdx) => (cIdx === x ? wall : col)) : row
      )
      return { mapData: { ...state.mapData, walls } }
    }),

  addFurniture: (furniture) =>
    set((state) => ({
      mapData: {
        ...state.mapData,
        furniture: [...state.mapData.furniture.filter((f) => f.id !== furniture.id), furniture],
      },
    })),

  removeFurnitureAt: (tileX, tileY) =>
    set((state) => ({
      mapData: {
        ...state.mapData,
        furniture: state.mapData.furniture.filter((f) => f.x !== tileX || f.y !== tileY),
      },
    })),

  // Automatically snap and enclose zones with clean walls and smart doorways
  addOrUpdateZone: (zone) =>
    set((state) => {
      const alignedZone = snapAndAlignZone(
        zone,
        state.mapData.zones,
        state.mapData.width,
        state.mapData.height
      )

      const updatedZones = [...state.mapData.zones.filter((z) => z.id !== alignedZone.id), alignedZone]
      const updatedWalls = generateWallsAndDoorsForZones(
        updatedZones,
        state.mapData.width,
        state.mapData.height,
        state.selectedWall || 'habbo_hotel_gold'
      )

      return {
        mapData: {
          ...state.mapData,
          zones: updatedZones,
          walls: updatedWalls,
        },
      }
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

      return {
        mapData: {
          ...state.mapData,
          zones: updatedZones,
          walls: updatedWalls,
        },
      }
    }),

  resetEmptyWorkspace: () => {
    set({ mapData: createEmptyWorkspace() })
  },
}))
