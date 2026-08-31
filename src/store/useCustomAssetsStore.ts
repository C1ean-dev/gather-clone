import { create } from 'zustand'
import { CustomAsset } from '../types/customAsset'
import { FurnitureDefinition } from '../types/map'
import { PeerManager } from '../p2p/PeerManager'
import nativeAssetsData from '../data/nativeAssets.json'

const ASSETS_STORAGE_KEY = 'gather_v2_custom_user_assets'
const CATEGORIES_STORAGE_KEY = 'gather_v2_custom_categories'

const DEFAULT_CATEGORIES = ['Geral', 'Forja Antiga', 'Escritório', 'Medieval', 'Decoração']

// In-memory HTMLImageElement cache for fast canvas rendering
const imageCache: Map<string, HTMLImageElement> = new Map()

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
  })
  return merged
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
  setCustomModalOpen: (open: boolean) => void
  setEditingAssetId: (id: string | null) => void
  openCreateModal: () => void
  openEditModal: (id: string) => void
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
  setCustomModalOpen: (open) => set({ isCustomModalOpen: open, editingAssetId: open ? get().editingAssetId : null }),
  setEditingAssetId: (id) => set({ editingAssetId: id }),
  openCreateModal: () => set({ isCustomModalOpen: true, editingAssetId: null }),
  openEditModal: (id) => set({ isCustomModalOpen: true, editingAssetId: id }),

  addCustomAsset: (asset) => {
    // Cache frames
    asset.frames.forEach(getCustomAssetImage)
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
    return get().customAssets.find((a) => a.id === id)
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
