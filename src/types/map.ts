export type FloorType = 
  | 'habbo_parquet'
  | 'habbo_hc_carpet'
  | 'habbo_checker_red'
  | 'habbo_pool_water'
  | 'habbo_disco_dance'
  | 'habbo_executive_rug'
  | 'wood_light' 
  | 'wood_dark' 
  | 'carpet_blue' 
  | 'carpet_gray' 
  | 'carpet_purple' 
  | 'tile_white' 
  | 'tile_checker' 
  | 'grass' 
  | 'concrete'

export type WallType = 
  | 'habbo_hotel_gold'
  | 'habbo_brick_classic'
  | 'habbo_nightclub_dark'
  | 'brick_red' 
  | 'drywall_white' 
  | 'wood_panel' 
  | 'glass_modern' 
  | 'stone_dark'

export type FurnitureCategory = 'habbo' | 'walls_windows' | 'desks' | 'chairs' | 'tech' | 'lounge' | 'decor' | 'meeting'

export interface FurnitureDefinition {
  id: string
  name: string
  category: FurnitureCategory
  width: number // in tiles (1x1, 2x1, 3x2, etc.)
  height: number
  isObstacle: boolean
  spriteKey: string
  iconColor: string
}

export interface PlacedFurniture {
  id: string
  defId: string
  x: number // tile x
  y: number // tile y
  rotation?: 0 | 90 | 180 | 270
}

export interface PrivateZone {
  id: string
  name: string
  color: string // hex color or rgba
  x: number     // tile x start
  y: number     // tile y start
  width: number // tile width
  height: number // tile height
  description?: string
  maxCapacity?: number
}

export interface MapData {
  id: string
  name: string
  width: number  // tile columns (e.g. 40)
  height: number // tile rows (e.g. 30)
  tileSize: number // 32px
  spawnPoint: { x: number; y: number }
  floors: FloorType[][] // 2D array [y][x]
  walls: (WallType | null)[][] // 2D array [y][x]
  furniture: PlacedFurniture[]
  zones: PrivateZone[]
}

export type EditorTool = 
  | 'select' 
  | 'paint_floor' 
  | 'paint_wall' 
  | 'place_furniture' 
  | 'draw_zone' 
  | 'eraser'
