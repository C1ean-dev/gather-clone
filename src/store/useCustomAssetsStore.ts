import { create } from 'zustand'
import { CustomAsset } from '../types/customAsset'
import { FurnitureDefinition } from '../types/map'
import { PeerManager } from '../p2p/PeerManager'
import nativeAssetsData from '../data/nativeAssets.json'
import { Direction } from '../types/game'
import { bakeLayersToDataUrl } from '../utils/imageResize'

const ASSETS_STORAGE_KEY = 'gather_v2_custom_user_assets'
const CATEGORIES_STORAGE_KEY = 'gather_v2_custom_categories'

const DEFAULT_CATEGORIES = ['Geral', 'Forja Antiga', 'Escritório', 'Medieval', 'Decoração', 'Avatares']

// In-memory HTMLImageElement cache for fast canvas rendering
const imageCache: Map<string, HTMLImageElement> = new Map()

// O(1) id → asset lookup for hot render/collision paths.
// Rebuilt whenever the asset array identity changes; getAssetById keeps it
// in sync as a fallback so external mutations can't leave it stale.
let assetByIdCache = new Map<string, CustomAsset>()
let assetByIdCacheSource: CustomAsset[] | null = null

function syncAssetByIdCache(assets: CustomAsset[]) {
  if (assetByIdCacheSource === assets) return
  assetByIdCache = new Map(assets.map((a) => [a.id, a]))
  assetByIdCacheSource = assets
}

export function getCachedAssetById(id: string): CustomAsset | undefined {
  const assets = useCustomAssetsStore.getState().customAssets
  syncAssetByIdCache(assets)
  return assetByIdCache.get(id)
}

export function getCustomAssetImage(dataUrl: string): HTMLImageElement | null {
  if (typeof Image === 'undefined') return null
  if (imageCache.has(dataUrl)) {
    return imageCache.get(dataUrl)!
  }
  const img = new Image()
  img.src = dataUrl
  imageCache.set(dataUrl, img)
  return img
}

const syncToNativeFile = (assets: CustomAsset[], categories: string[]) => {
  try {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.saveNativeAssets) {
      ;(window as any).electronAPI.saveNativeAssets({ categories, assets })
    }
  } catch (err) {
    console.error('Failed to sync native assets to file:', err)
  }
}

const loadSavedCustomAssets = (): CustomAsset[] => {
  const nativeAssets: CustomAsset[] = (nativeAssetsData?.assets as CustomAsset[]) || []
  let savedAssets: CustomAsset[] = []
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(ASSETS_STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          savedAssets = parsed
        }
      }
    }
  } catch (e) {
    console.error('Failed to load custom assets:', e)
  }

  // Merge native and saved assets (saved assets take precedence)
  const map = new Map<string, CustomAsset>()
  nativeAssets.forEach((a) => map.set(a.id, a))
  savedAssets.forEach((a) => map.set(a.id, a))
  const merged = Array.from(map.values())

  merged.forEach((asset: CustomAsset) => {
    if (Array.isArray(asset.frames)) {
      asset.frames.forEach(getCustomAssetImage)
    }
    if (asset.directionalFrames) {
      Object.values(asset.directionalFrames).forEach((frames) => {
        if (Array.isArray(frames)) {
          frames.forEach((f) => f && getCustomAssetImage(f))
        } else if (typeof frames === 'string' && frames.length > 0) {
          getCustomAssetImage(frames)
        }
      })
    }
  })
  return merged
}

export async function repairMissingDirectionalFrames(assets: CustomAsset[]): Promise<boolean> {
  if (typeof document === 'undefined') return false
  let hasChanges = false
  for (const asset of assets) {
    if (asset.type !== 'furniture' || !asset.directionalFrameLayers) continue

    const dirs: Direction[] = ['down', 'left', 'up', 'right']
    let assetChanged = false
    const dirFrames: Partial<Record<Direction, string | string[]>> = { ...(asset.directionalFrames || {}) }

    for (const d of dirs) {
      const layersList = asset.directionalFrameLayers[d]
      if (layersList && layersList.length > 0 && layersList[0].length > 0) {
        const existing = dirFrames[d]
        const hasValid =
          existing &&
          (Array.isArray(existing)
            ? existing.length > 0 && typeof existing[0] === 'string' && existing[0].length > 0
            : typeof existing === 'string' && existing.length > 0)

        if (!hasValid) {
          const dim = asset.directionalDimensions?.[d]
          const pW = dim?.pixelWidth || (dim?.width ? dim.width * 32 : (asset.pixelWidth || asset.width * 32))
          const pH = dim?.pixelHeight || (dim?.height ? dim.height * 32 : (asset.pixelHeight || asset.height * 32))

          try {
            const baked = await bakeLayersToDataUrl(pW, pH, layersList[0])
            if (baked) {
              dirFrames[d] = [baked]
              getCustomAssetImage(baked)
              assetChanged = true
            }
          } catch (e) {
            console.error('Failed to auto-bake missing directional frame:', d, e)
          }
        }
      }
    }

    if (assetChanged) {
      asset.directionalFrames = dirFrames
      hasChanges = true
    }

    if (asset.directionalDimensions?.down) {
      if (asset.width !== asset.directionalDimensions.down.width || asset.height !== asset.directionalDimensions.down.height) {
        asset.width = asset.directionalDimensions.down.width
        asset.height = asset.directionalDimensions.down.height
        if (asset.directionalDimensions.down.pixelWidth) {
          asset.pixelWidth = asset.directionalDimensions.down.pixelWidth
        }
        if (asset.directionalDimensions.down.pixelHeight) {
          asset.pixelHeight = asset.directionalDimensions.down.pixelHeight
        }
        hasChanges = true
      }
    }
  }

  return hasChanges
}

const saveCustomAssets = (assets: CustomAsset[]) => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(ASSETS_STORAGE_KEY, JSON.stringify(assets))
    }
  } catch (e) {
    console.error('Failed to save custom assets:', e)
  }
}

const loadSavedCategories = (): string[] => {
  const nativeCats: string[] = (nativeAssetsData?.categories as string[]) || DEFAULT_CATEGORIES
  let savedCats: string[] = []
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(CATEGORIES_STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed) && parsed.length > 0) {
          savedCats = parsed
        }
      }
    }
  } catch (e) {
    console.error('Failed to load custom categories:', e)
  }
  return Array.from(new Set([...DEFAULT_CATEGORIES, ...nativeCats, ...savedCats]))
}

const saveCategories = (cats: string[]) => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(cats))
    }
  } catch (e) {
    console.error('Failed to save custom categories:', e)
  }
}

interface CustomAssetsState {
  customAssets: CustomAsset[]
  customCategories: string[]
  isCustomModalOpen: boolean
  editingAssetId: string | null
  initialStudioMode: 'crop' | 'compose'
  setCustomModalOpen: (open: boolean) => void
  setEditingAssetId: (id: string | null) => void
  openCreateModal: (mode?: 'crop' | 'compose') => void
  openEditModal: (id: string, mode?: 'crop' | 'compose') => void
  addCustomAsset: (asset: CustomAsset) => void
  updateCustomAsset: (id: string, asset: Partial<CustomAsset>) => void
  deleteCustomAsset: (id: string) => void
  syncRemoteCustomAssets: (incomingAssets: CustomAsset[], incomingCategories?: string[]) => void
  syncRemoteAssetAddOrUpdate: (asset: CustomAsset) => void
  syncRemoteAssetDelete: (id: string) => void
  addCategory: (categoryName: string) => void
  deleteCategory: (categoryName: string) => void
  getAssetById: (id: string) => CustomAsset | undefined
  getAllCategories: () => string[]
  getFurnitureCatalog: (baseCatalog: FurnitureDefinition[]) => FurnitureDefinition[]
}

export const useCustomAssetsStore = create<CustomAssetsState>((set, get) => ({
  customAssets: loadSavedCustomAssets(),
  customCategories: loadSavedCategories(),
  isCustomModalOpen: false,
  editingAssetId: null,
  initialStudioMode: 'crop',
  setCustomModalOpen: (open) =>
    set({
      isCustomModalOpen: open,
      editingAssetId: open ? get().editingAssetId : null,
    }),
  setEditingAssetId: (id) => set({ editingAssetId: id }),
  openCreateModal: (mode = 'crop') =>
    set({ isCustomModalOpen: true, editingAssetId: null, initialStudioMode: mode }),
  openEditModal: (id, mode = 'compose') =>
    set({ isCustomModalOpen: true, editingAssetId: id, initialStudioMode: mode }),

  addCustomAsset: (asset) => {
    // Cache frames
    if (Array.isArray(asset.frames)) {
      asset.frames.forEach(getCustomAssetImage)
    }
    if (asset.directionalFrames) {
      Object.values(asset.directionalFrames).forEach((frames) => {
        if (Array.isArray(frames)) {
          frames.forEach((f) => f && getCustomAssetImage(f))
        } else if (typeof frames === 'string' && frames.length > 0) {
          getCustomAssetImage(frames)
        }
      })
    }
    const updated = [...get().customAssets.filter((a) => a.id !== asset.id), asset]
    saveCustomAssets(updated)

    // Automatically ensure the category is saved in the category list
    let newCats = get().customCategories
    if (asset.category && !newCats.includes(asset.category)) {
      newCats = [...newCats, asset.category]
      saveCategories(newCats)
    }

    set({ customAssets: updated, customCategories: newCats })
    syncToNativeFile(updated, newCats)

    // Broadcast new custom asset across P2P mesh
    PeerManager.getInstance().sendCustomAssetAddOrUpdate(asset)
  },

  updateCustomAsset: (id, partial) => {
    let fullAsset: CustomAsset | null = null
    const updated = get().customAssets.map((a) => {
      if (a.id === id) {
        const res = { ...a, ...partial }
        if (partial.frames) {
          partial.frames.forEach(getCustomAssetImage)
        }
        if (partial.directionalFrames) {
          Object.values(partial.directionalFrames).forEach((frames) => {
            if (Array.isArray(frames)) {
              frames.forEach((f) => f && getCustomAssetImage(f))
            } else if (typeof frames === 'string' && frames.length > 0) {
              getCustomAssetImage(frames)
            }
          })
        }
        fullAsset = res
        return res
      }
      return a
    })
    saveCustomAssets(updated)
    set({ customAssets: updated })
    syncToNativeFile(updated, get().customCategories)

    // Broadcast updated custom asset across P2P mesh
    if (fullAsset) {
      PeerManager.getInstance().sendCustomAssetAddOrUpdate(fullAsset)
    }
  },

  deleteCustomAsset: (id) => {
    const updated = get().customAssets.filter((a) => a.id !== id)
    saveCustomAssets(updated)
    set({ customAssets: updated })
    syncToNativeFile(updated, get().customCategories)

    // Broadcast asset deletion across P2P mesh
    PeerManager.getInstance().sendCustomAssetDelete(id)
  },

  syncRemoteCustomAssets: (incomingAssets, incomingCategories) => {
    if (!Array.isArray(incomingAssets)) return

    // Preload image frames for all incoming assets
    incomingAssets.forEach((asset) => {
      if (Array.isArray(asset.frames)) {
        asset.frames.forEach(getCustomAssetImage)
      }
    })

    // Merge incoming assets with existing assets (overwriting matching IDs, preserving others)
    const current = get().customAssets
    const incomingMap = new Map(incomingAssets.map((a) => [a.id, a]))
    const merged = current.map((a) => incomingMap.get(a.id) || a)
    incomingAssets.forEach((a) => {
      if (!current.some((c) => c.id === a.id)) {
        merged.push(a)
      }
    })

    saveCustomAssets(merged)

    // Merge categories
    let updatedCats = get().customCategories
    if (Array.isArray(incomingCategories)) {
      const mergedCats = Array.from(new Set([...updatedCats, ...incomingCategories]))
      saveCategories(mergedCats)
      updatedCats = mergedCats
    }

    set({ customAssets: merged, customCategories: updatedCats })
  },

  syncRemoteAssetAddOrUpdate: (asset) => {
    if (!asset || !asset.id) return
    if (Array.isArray(asset.frames)) {
      asset.frames.forEach(getCustomAssetImage)
    }
    const current = get().customAssets
    const exists = current.some((a) => a.id === asset.id)
    const updated = exists ? current.map((a) => (a.id === asset.id ? asset : a)) : [...current, asset]
    saveCustomAssets(updated)

    let updatedCats = get().customCategories
    if (asset.category && !updatedCats.includes(asset.category)) {
      updatedCats = [...updatedCats, asset.category]
      saveCategories(updatedCats)
    }

    set({ customAssets: updated, customCategories: updatedCats })
  },

  syncRemoteAssetDelete: (id) => {
    const updated = get().customAssets.filter((a) => a.id !== id)
    saveCustomAssets(updated)
    set({ customAssets: updated })
  },

  addCategory: (categoryName) => {
    const trimmed = categoryName.trim()
    if (!trimmed) return
    if (!get().customCategories.includes(trimmed)) {
      const updated = [...get().customCategories, trimmed]
      saveCategories(updated)
      set({ customCategories: updated })
      syncToNativeFile(get().customAssets, updated)
    }
  },

  deleteCategory: (categoryName) => {
    const updated = get().customCategories.filter((c) => c !== categoryName)
    saveCategories(updated)
    set({ customCategories: updated })
    syncToNativeFile(get().customAssets, updated)
  },

  getAllCategories: () => {
    const fromAssets = get().customAssets.map((a) => a.category).filter(Boolean)
    const setCats = new Set([...get().customCategories, ...fromAssets])
    return Array.from(setCats)
  },

  getAssetById: (id) => {
    const assets = get().customAssets
    syncAssetByIdCache(assets)
    const hit = assetByIdCache.get(id)
    if (hit) return hit
    // Fallback (shouldn't happen): linear scan then re-sync.
    return assets.find((a) => a.id === id)
  },

  getFurnitureCatalog: (baseCatalog) => {
    const customFurns: FurnitureDefinition[] = get()
      .customAssets.filter((a) => a.type === 'furniture')
      .map((a) => ({
        id: a.id,
        name: a.name,
        category: (a.category as any) || 'Geral',
        width: a.width,
        height: a.height,
        isObstacle: a.isObstacle,
        spriteKey: a.id,
        iconColor: a.iconColor || '#e03131',
      }))

    return [...baseCatalog, ...customFurns]
  },
}))

if (typeof window !== 'undefined') {
  setTimeout(() => {
    repairMissingDirectionalFrames(useCustomAssetsStore.getState().customAssets).then((changed) => {
      if (changed) {
        const updated = [...useCustomAssetsStore.getState().customAssets]
        useCustomAssetsStore.setState({ customAssets: updated })
        saveCustomAssets(updated)
      }
    })
  }, 100)
}
