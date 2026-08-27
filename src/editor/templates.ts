import { MapData, FloorType, WallType } from '../types/map'
import { TILE_SIZE } from '../engine/Constants'

/**
 * Espaço em Branco / Workspace Vazio para Edição Livre
 * 100% editável, limpo e transitável.
 */
export function createEmptyWorkspace(): MapData {
  const width = 68
  const height = 40

  const floors: FloorType[][] = []
  for (let y = 0; y < height; y++) {
    const row: FloorType[] = []
    for (let x = 0; x < width; x++) {
      row.push('habbo_parquet')
    }
    floors.push(row)
  }

  // Outer border walls
  const walls: (WallType | null)[][] = []
  for (let y = 0; y < height; y++) {
    const row: (WallType | null)[] = []
    for (let x = 0; x < width; x++) {
      if (y === 0 || y === height - 1 || x === 0 || x === width - 1) {
        row.push('habbo_hotel_gold')
      } else {
        row.push(null)
      }
    }
    walls.push(row)
  }

  return {
    id: 'empty_workspace',
    name: 'Espaço em Branco (Edição Livre)',
    width,
    height,
    tileSize: TILE_SIZE,
    spawnPoint: { x: 34, y: 20 },
    floors,
    walls,
    furniture: [],
    zones: [],
  }
}
