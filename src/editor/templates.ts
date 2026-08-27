import { MapData, FloorType, WallType, PlacedFurniture, PrivateZone } from '../types/map'
import { TILE_SIZE } from '../engine/Constants'

/**
 * Iconic Habbo Hotel Lobby & Classic Reception
 */
export function createHabboHotelLobby(): MapData {
  const width = 36
  const height = 24

  // Initialize floor array with Habbo Parquet, HC Carpet, and Red Checkerboard
  const floors: FloorType[][] = []
  for (let y = 0; y < height; y++) {
    const row: FloorType[] = []
    for (let x = 0; x < width; x++) {
      if (x < 14 && y < 12) {
        // Habbo Club (HC) VIP Lounge
        row.push('habbo_hc_carpet')
      } else if (x >= 14 && x < 26 && y < 12) {
        // Main Reception Desk & Saguão
        row.push('habbo_parquet')
      } else if (x >= 26 && y < 12) {
        // Executive Habbo Meeting Room
        row.push('habbo_executive_rug')
      } else if (y >= 12 && y < 18) {
        // Central Hallway & Teleport Zone
        row.push('habbo_parquet')
      } else {
        // Habbo Bar & Game Cafe
        row.push('habbo_checker_red')
      }
    }
    floors.push(row)
  }

  // Initialize walls with Habbo Gold Hotel wallpaper and Classic Bricks
  const walls: (WallType | null)[][] = []
  for (let y = 0; y < height; y++) {
    const row: (WallType | null)[] = []
    for (let x = 0; x < width; x++) {
      // Outer borders
      if (y === 0 || y === height - 1 || x === 0 || x === width - 1) {
        row.push('habbo_hotel_gold')
      }
      // HC Lounge divider with doorway
      else if (x === 14 && y < 12 && y !== 6 && y !== 7) {
        row.push('habbo_hotel_gold')
      }
      // Executive Room divider with doorway
      else if (x === 26 && y < 12 && y !== 6 && y !== 7) {
        row.push('habbo_hotel_gold')
      }
      // Bar divider
      else if (y === 12 && (x < 10 || x > 26)) {
        row.push('habbo_brick_classic')
      } else {
        row.push(null)
      }
    }
    walls.push(row)
  }

  // Placed Iconic Habbo Furni & Rares
  const furniture: PlacedFurniture[] = [
    // 1. Reception Desk (Center Saguão)
    { id: 'hb1', defId: 'habbo_bar_counter', x: 19, y: 3 },
    { id: 'hb2', defId: 'habbo_duck_yellow', x: 18, y: 3 },
    { id: 'hb3', defId: 'habbo_plant_yucca', x: 15, y: 2 },
    { id: 'hb4', defId: 'habbo_plant_yucca', x: 24, y: 2 },
    { id: 'hb5', defId: 'habbo_teleport_door', x: 20, y: 1 },

    // 2. Habbo Club (HC) VIP Lounge (Left)
    { id: 'hb6', defId: 'habbo_sofa_hc', x: 3, y: 3 },
    { id: 'hb7', defId: 'habbo_sofa_hc', x: 3, y: 7 },
    { id: 'hb8', defId: 'habbo_dragon_lamp', x: 2, y: 2 },
    { id: 'hb9', defId: 'habbo_dragon_lamp', x: 2, y: 9 },
    { id: 'hb10', defId: 'habbo_tv_retro', x: 8, y: 2 },
    { id: 'hb11', defId: 'habbo_plant_yucca', x: 12, y: 2 },

    // 3. Executive Meeting Room (Right)
    { id: 'hb12', defId: 'habbo_executive_desk', x: 28, y: 4 },
    { id: 'hb13', defId: 'chair_office_black', x: 29, y: 6 },
    { id: 'hb14', defId: 'habbo_sofa_hc', x: 28, y: 8 },
    { id: 'hb15', defId: 'bookshelf_wood', x: 33, y: 2 },
    { id: 'hb16', defId: 'habbo_dragon_lamp', x: 34, y: 2 },

    // 4. Habbo Bar, Cafe & DJ (Bottom)
    { id: 'hb17', defId: 'habbo_bar_counter', x: 4, y: 14 },
    { id: 'hb18', defId: 'habbo_drink_vending', x: 2, y: 14 },
    { id: 'hb19', defId: 'habbo_sofa_plasto', x: 10, y: 14 },
    { id: 'hb20', defId: 'habbo_sofa_plasto', x: 10, y: 18 },
    { id: 'hb21', defId: 'habbo_dj_deck', x: 18, y: 14 },
    { id: 'hb22', defId: 'ping_pong_table', x: 26, y: 14 },
    { id: 'hb23', defId: 'coffee_machine_station', x: 32, y: 14 },
    { id: 'hb24', defId: 'habbo_duck_yellow', x: 30, y: 19 },
  ]

  // Private Call Zones
  const zones: PrivateZone[] = [
    {
      id: 'zone-reception',
      name: 'Recepção Principal',
      color: '#fab005',
      x: 16,
      y: 2,
      width: 9,
      height: 8,
      description: 'Balcão de boas-vindas do Habbo Hotel',
    },
    {
      id: 'zone-hc-vip',
      name: 'Habbo Club VIP Lounge',
      color: '#2f9e44',
      x: 2,
      y: 2,
      width: 11,
      height: 9,
      description: 'Sala exclusiva com sofás HC e Dragões Raros',
    },
    {
      id: 'zone-exec-room',
      name: 'Suíte Executiva',
      color: '#e03131',
      x: 27,
      y: 2,
      width: 8,
      height: 9,
      description: 'Reuniões executivas e calls de time',
    },
    {
      id: 'zone-habbo-bar',
      name: 'Habbo Bar & Lounge',
      color: '#339af0',
      x: 2,
      y: 13,
      width: 12,
      height: 7,
      description: 'Bate-papo informal com bebidas e música',
    },
    {
      id: 'zone-habbo-dj',
      name: 'Pista de Som & DJ',
      color: '#be4bdb',
      x: 16,
      y: 13,
      width: 7,
      height: 7,
      description: 'Área com cabine de DJ',
    },
    {
      id: 'zone-games',
      name: 'Salão de Jogos',
      color: '#ff922b',
      x: 25,
      y: 13,
      width: 9,
      height: 7,
      description: 'Jogos de ping pong e recreação',
    },
  ]

  return {
    id: 'habbo_hotel_lobby',
    name: 'Habbo Hotel - Recepção Clássica',
    width,
    height,
    tileSize: TILE_SIZE,
    spawnPoint: { x: 20, y: 10 },
    floors,
    walls,
    furniture,
    zones,
  }
}

/**
 * Habbo Hotel Rooftop & Swimming Pool
 */
export function createHabboRooftopPool(): MapData {
  const width = 32
  const height = 22

  const floors: FloorType[][] = []
  for (let y = 0; y < height; y++) {
    const row: FloorType[] = []
    for (let x = 0; x < width; x++) {
      if (x >= 4 && x < 18 && y >= 4 && y < 14) {
        // Pool Water
        row.push('habbo_pool_water')
      } else if (y < 15) {
        // Poolside Tiles
        row.push('tile_white')
      } else {
        // Disco Club Dance Floor
        row.push('habbo_disco_dance')
      }
    }
    floors.push(row)
  }

  const walls: (WallType | null)[][] = []
  for (let y = 0; y < height; y++) {
    const row: (WallType | null)[] = []
    for (let x = 0; x < width; x++) {
      if (y === 0 || y === height - 1 || x === 0 || x === width - 1) {
        row.push('habbo_nightclub_dark')
      } else if (y === 15 && (x < 10 || x > 22)) {
        row.push('habbo_hotel_gold')
      } else {
        row.push(null)
      }
    }
    walls.push(row)
  }

  const furniture: PlacedFurniture[] = [
    // Poolside Loungers
    { id: 'p1', defId: 'habbo_pool_lounger', x: 20, y: 4 },
    { id: 'p2', defId: 'habbo_pool_lounger', x: 23, y: 4 },
    { id: 'p3', defId: 'habbo_duck_yellow', x: 10, y: 8 },
    { id: 'p4', defId: 'habbo_duck_yellow', x: 14, y: 6 },
    { id: 'p5', defId: 'habbo_plant_yucca', x: 2, y: 2 },
    { id: 'p6', defId: 'habbo_plant_yucca', x: 28, y: 2 },

    // Nightclub DJ Stage
    { id: 'p7', defId: 'habbo_dj_deck', x: 14, y: 17 },
    { id: 'p8', defId: 'habbo_dragon_lamp', x: 12, y: 17 },
    { id: 'p9', defId: 'habbo_dragon_lamp', x: 18, y: 17 },
    { id: 'p10', defId: 'habbo_bar_counter', x: 4, y: 17 },
    { id: 'p11', defId: 'habbo_drink_vending', x: 2, y: 17 },
    { id: 'p12', defId: 'habbo_sofa_hc', x: 24, y: 17 },
  ]

  const zones: PrivateZone[] = [
    {
      id: 'zone-pool',
      name: 'Piscina Pública Habbo',
      color: '#22b8cf',
      x: 3,
      y: 3,
      width: 16,
      height: 11,
    },
    {
      id: 'zone-deck',
      name: 'Deck & Espreguiçadeiras',
      color: '#fab005',
      x: 20,
      y: 3,
      width: 10,
      height: 10,
    },
    {
      id: 'zone-club',
      name: 'Clube Massiva & DJ',
      color: '#be4bdb',
      x: 2,
      y: 16,
      width: 28,
      height: 5,
    },
  ]

  return {
    id: 'habbo_rooftop_pool',
    name: 'Habbo Hotel - Piscina & Rooftop Club',
    width,
    height,
    tileSize: TILE_SIZE,
    spawnPoint: { x: 16, y: 15 },
    floors,
    walls,
    furniture,
    zones,
  }
}

export function createModernTechOffice(): MapData {
  const width = 36
  const height = 24

  const floors: FloorType[][] = []
  for (let y = 0; y < height; y++) {
    const row: FloorType[] = []
    for (let x = 0; x < width; x++) {
      if (x < 12 && y < 11) {
        row.push('wood_light')
      } else if (x >= 12 && x < 24 && y < 11) {
        row.push('carpet_blue')
      } else if (x >= 24 && y < 11) {
        row.push('carpet_purple')
      } else if (y >= 11 && y < 18) {
        row.push('wood_dark')
      } else {
        row.push('tile_checker')
      }
    }
    floors.push(row)
  }

  const walls: (WallType | null)[][] = []
  for (let y = 0; y < height; y++) {
    const row: (WallType | null)[] = []
    for (let x = 0; x < width; x++) {
      if (y === 0 || y === height - 1 || x === 0 || x === width - 1) {
        row.push('brick_red')
      } else if (x === 24 && y < 11 && y !== 5 && y !== 6) {
        row.push('glass_modern')
      } else if (y === 11 && (x < 10 || x > 26)) {
        row.push('drywall_white')
      } else {
        row.push(null)
      }
    }
    walls.push(row)
  }

  const furniture: PlacedFurniture[] = [
    { id: 'f1', defId: 'desk_gamer_triple', x: 14, y: 3 },
    { id: 'f2', defId: 'chair_gamer_red', x: 15, y: 5 },
    { id: 'f3', defId: 'desk_mac_dual', x: 18, y: 3 },
    { id: 'f4', defId: 'chair_office_black', x: 19, y: 5 },
    { id: 'f5', defId: 'desk_pc_single', x: 14, y: 7 },
    { id: 'f6', defId: 'chair_office_black', x: 15, y: 6 },
    { id: 'f7', defId: 'desk_pc_single', x: 18, y: 7 },
    { id: 'f8', defId: 'chair_office_black', x: 19, y: 6 },
    { id: 'f9', defId: 'desk_mac_dual', x: 3, y: 3 },
    { id: 'f10', defId: 'chair_office_black', x: 4, y: 5 },
    { id: 'f11', defId: 'desk_mac_dual', x: 7, y: 3 },
    { id: 'f12', defId: 'chair_office_black', x: 8, y: 5 },
    { id: 'f13', defId: 'whiteboard_stand', x: 4, y: 8 },
    { id: 'f14', defId: 'plant_pot_large', x: 2, y: 2 },
    { id: 'f15', defId: 'table_meeting_large', x: 26, y: 4 },
    { id: 'f16', defId: 'chair_office_black', x: 26, y: 3 },
    { id: 'f17', defId: 'chair_office_black', x: 28, y: 3 },
    { id: 'f18', defId: 'chair_office_black', x: 26, y: 6 },
    { id: 'f19', defId: 'chair_office_black', x: 28, y: 6 },
    { id: 'f20', defId: 'tv_presentation', x: 28, y: 1 },
    { id: 'f21', defId: 'plant_pot_large', x: 33, y: 2 },
    { id: 'f22', defId: 'sofa_orange_3seat', x: 5, y: 14 },
    { id: 'f23', defId: 'coffee_table_round', x: 5, y: 16 },
    { id: 'f24', defId: 'beanbag_purple', x: 9, y: 15 },
    { id: 'f25', defId: 'ping_pong_table', x: 16, y: 14 },
    { id: 'f26', defId: 'coffee_machine_station', x: 25, y: 13 },
    { id: 'f27', defId: 'water_cooler', x: 28, y: 13 },
    { id: 'f28', defId: 'bookshelf_wood', x: 31, y: 13 },
  ]

  const zones: PrivateZone[] = [
    {
      id: 'zone-product',
      name: 'Product & Tech',
      color: '#4c6ef5',
      x: 13,
      y: 2,
      width: 9,
      height: 8,
    },
    {
      id: 'zone-design',
      name: 'Design Team',
      color: '#fab005',
      x: 2,
      y: 2,
      width: 9,
      height: 8,
    },
    {
      id: 'zone-meeting-a',
      name: 'Sala de Reunião Alpha',
      color: '#be4bdb',
      x: 25,
      y: 2,
      width: 10,
      height: 8,
    },
    {
      id: 'zone-lounge',
      name: 'Lounge & Café',
      color: '#20c997',
      x: 3,
      y: 13,
      width: 9,
      height: 6,
    },
    {
      id: 'zone-games',
      name: 'Área de Jogos',
      color: '#ff6b6b',
      x: 15,
      y: 13,
      width: 6,
      height: 5,
    },
  ]

  return {
    id: 'modern_tech_hq',
    name: 'Tech Startup HQ',
    width,
    height,
    tileSize: TILE_SIZE,
    spawnPoint: { x: 18, y: 11 },
    floors,
    walls,
    furniture,
    zones,
  }
}
