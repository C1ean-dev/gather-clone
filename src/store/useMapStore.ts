import { create } from 'zustand'
import { MapData, FloorType, WallType, PlacedFurniture, PrivateZone, EditorTool } from '../types/map'
import { createHabboHotelLobby, createHabboRooftopPool, createModernTechOffice } from '../editor/templates'

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

  // Editing Actions
  setFloorTile: (x: number, y: number, floor: FloorType) => void
  setWallTile: (x: number, y: number, wall: WallType | null) => void
  addFurniture: (furniture: PlacedFurniture) => void
  removeFurnitureAt: (tileX: number, tileY: number) => void
  addOrUpdateZone: (zone: PrivateZone) => void
  removeZone: (id: string) => void
  loadTemplate: (templateId: 'habbo_hotel_lobby' | 'habbo_rooftop_pool' | 'modern_tech_hq') => void
}

export const useMapStore = create<MapStore>((set, get) => ({
  // Default Initial Map is the nostalgic Habbo Hotel Lobby!
  mapData: createHabboHotelLobby(),

  setMapData: (mapData) => set({ mapData }),

  isEditorOpen: false,
  toggleEditor: () => set((s) => ({ isEditorOpen: !s.isEditorOpen })),
  setEditorOpen: (open) => set({ isEditorOpen: open }),

  activeTool: 'select',
  setActiveTool: (tool) => set({ activeTool: tool }),

  selectedFloor: 'habbo_parquet',
  setSelectedFloor: (floor) => set({ selectedFloor: floor, activeTool: 'paint_floor' }),

  selectedWall: 'habbo_hotel_gold',
  setSelectedWall: (wall) => set({ selectedWall: wall, activeTool: 'paint_wall' }),

  selectedFurnitureDefId: 'habbo_sofa_hc',
  setSelectedFurnitureDefId: (defId) => set({ selectedFurnitureDefId: defId, activeTool: 'place_furniture' }),

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

  addOrUpdateZone: (zone) =>
    set((state) => ({
      mapData: {
        ...state.mapData,
        zones: [...state.mapData.zones.filter((z) => z.id !== zone.id), zone],
      },
    })),

  removeZone: (id) =>
    set((state) => ({
      mapData: {
        ...state.mapData,
        zones: state.mapData.zones.filter((z) => z.id !== id),
      },
    })),

  loadTemplate: (templateId) => {
    if (templateId === 'habbo_rooftop_pool') {
      set({ mapData: createHabboRooftopPool() })
    } else if (templateId === 'modern_tech_hq') {
      set({ mapData: createModernTechOffice() })
    } else {
      set({ mapData: createHabboHotelLobby() })
    }
  },
}))
