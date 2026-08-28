import { describe, it, expect, beforeEach } from 'vitest'

// Mock global localStorage
const mockStorage: Record<string, string> = {}
const localStorageMock = {
  getItem: (key: string) => mockStorage[key] || null,
  setItem: (key: string, value: string) => {
    mockStorage[key] = value
  },
  removeItem: (key: string) => {
    delete mockStorage[key]
  },
  clear: () => {
    for (const key of Object.keys(mockStorage)) {
      delete mockStorage[key]
    }
  },
}

// Attach to global window
;(globalThis as any).window = {
  localStorage: localStorageMock,
}
;(globalThis as any).localStorage = localStorageMock

import { useGameStore } from '../store/useGameStore'
import { useMapStore } from '../store/useMapStore'

describe('Storage Persistence - Expected Behaviors', () => {
  beforeEach(() => {
    localStorageMock.clear()
  })

  it('should persist profile name and avatar changes to localStorage', () => {
    const { setLocalPlayer } = useGameStore.getState()
    
    setLocalPlayer({
      name: 'DevMaster',
      avatar: {
        ...useGameStore.getState().localPlayer.avatar,
        hairColor: '#e03131',
        topColor: '#3b82f6',
      },
    })

    const raw = localStorageMock.getItem('gather_v2_user_profile')
    expect(raw).toBeTruthy()
    const parsed = JSON.parse(raw!)
    expect(parsed.name).toBe('DevMaster')
    expect(parsed.avatar.hairColor).toBe('#e03131')
    expect(parsed.avatar.topColor).toBe('#3b82f6')
  })

  it('should persist status and emoji updates to localStorage', () => {
    const { setLocalStatus } = useGameStore.getState()
    
    setLocalStatus('focusing', 'Codando persistência...', '🚀')

    const raw = localStorageMock.getItem('gather_v2_user_profile')
    expect(raw).toBeTruthy()
    const parsed = JSON.parse(raw!)
    expect(parsed.status).toBe('focusing')
    expect(parsed.statusText).toBe('Codando persistência...')
    expect(parsed.statusEmoji).toBe('🚀')
  })

  it('should persist private zones and room edits to localStorage', () => {
    const { addOrUpdateZone } = useMapStore.getState()
    
    const newZone = {
      id: 'test-zone-1',
      name: 'Sala de Guerra',
      color: '#ef4444',
      x: 5,
      y: 5,
      width: 6,
      height: 6,
      description: 'Sala de reunião',
    }

    addOrUpdateZone(newZone)

    const raw = localStorageMock.getItem('gather_v2_custom_map')
    expect(raw).toBeTruthy()
    const parsed = JSON.parse(raw!)
    expect(parsed.zones.some((z: any) => z.name === 'Sala de Guerra')).toBe(true)
  })

  it('should persist furniture placement to localStorage', () => {
    const { addFurniture } = useMapStore.getState()
    
    const furn = {
      id: 'furn-test-1',
      defId: 'habbo_dragon_lamp',
      x: 10,
      y: 8,
    }

    addFurniture(furn)

    const raw = localStorageMock.getItem('gather_v2_custom_map')
    expect(raw).toBeTruthy()
    const parsed = JSON.parse(raw!)
    expect(parsed.furniture.some((f: any) => f.id === 'furn-test-1')).toBe(true)
  })

  it('should rename existing zones and persist the new name to localStorage', () => {
    const { addOrUpdateZone, renameZone } = useMapStore.getState()
    
    const zone = {
      id: 'test-zone-rename',
      name: 'Sala Antiga',
      color: '#20c997',
      x: 2,
      y: 2,
      width: 5,
      height: 5,
      description: '',
    }

    addOrUpdateZone(zone)
    renameZone('test-zone-rename', 'Sala Nova da Diretoria')

    const raw = localStorageMock.getItem('gather_v2_custom_map')
    expect(raw).toBeTruthy()
    const parsed = JSON.parse(raw!)
    const renamed = parsed.zones.find((z: any) => z.id === 'test-zone-rename')
    expect(renamed?.name).toBe('Sala Nova da Diretoria')
  })

  it('should persist created public community spaces to localStorage', () => {
    const customSpace = {
      id: 'pub-test-ai',
      name: '🤖 Laboratório de IA & Agentes',
      description: 'Discussão sobre LLMs e automação',
      category: 'tech' as const,
      onlineCount: 4,
      code: 'GATHER-PUBLIC-AI',
      color: '#3b82f6',
      tags: ['#ia', '#llm'],
    }

    const initialSpaces = [customSpace]
    localStorageMock.setItem('gather_v2_public_spaces', JSON.stringify(initialSpaces))

    const raw = localStorageMock.getItem('gather_v2_public_spaces')
    expect(raw).toBeTruthy()
    const parsed = JSON.parse(raw!)
    expect(parsed.length).toBe(1)
    expect(parsed[0].name).toBe('🤖 Laboratório de IA & Agentes')
    expect(parsed[0].code).toBe('GATHER-PUBLIC-AI')
  })
})

