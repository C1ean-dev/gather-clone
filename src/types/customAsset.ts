export type CustomAssetType = 'furniture' | 'floor' | 'wall' | 'avatar'

export interface CustomAssetLayer {
  id: string
  clipId: string
  name: string
  dataUrl: string
  x: number
  y: number
  width: number
  height: number
  flipH: boolean
  opacity: number
}

export interface CustomAsset {
  id: string
  name: string
  type: CustomAssetType
  category: string
  width: number // in tiles (1 to 10)
  height: number // in tiles (1 to 10)
  isObstacle: boolean // general flag for backward compatibility
  collisionGrid?: boolean[][] // 2D matrix [row][col] of tile collisions
  frames: string[] // base64 PNG dataURLs with alpha channel
  frameLayers?: CustomAssetLayer[][] // Separate layers preserved for each frame
  frameRateMs: number // default 160ms
  iconColor?: string
  createdAt: number
}
