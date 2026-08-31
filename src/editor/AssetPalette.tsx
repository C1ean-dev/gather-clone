import React, { useState, useMemo } from 'react'
import {
  Layers,
  Plus,
  X,
  Armchair,
  LayoutGrid,
  Square,
} from 'lucide-react'
import { useMapStore } from '../store/useMapStore'
import { useCustomAssetsStore } from '../store/useCustomAssetsStore'
import { WallType, FloorType } from '../types/map'
import { FURNITURE_CATALOG } from '../engine/Constants'
import { createEmptyWorkspace } from './templates'
import { PeerManager } from '../p2p/PeerManager'
import { ActiveItemSummary } from './palette/ActiveItemSummary'
import { FurnitureTab } from './palette/tabs/FurnitureTab'
import { FloorsTab } from './palette/tabs/FloorsTab'
import { ZonesTab } from './palette/tabs/ZonesTab'
import { PaletteFooterActions } from './palette/PaletteFooterActions'
import { ConfirmModal } from '../components/ConfirmModal'

export const AssetPalette: React.FC = () => {
  const {
    isEditorOpen,
    setEditorOpen,
    activeTool,
    setActiveTool,
    selectedFurnitureDefId,
    setSelectedFurnitureDefId,
    selectedFloor,
    setSelectedFloor,
    selectedWall,
    setSelectedWall,
    mapData,
    zoneDraft,
    setZoneDraft,
    removeZone,
  } = useMapStore()

  const {
    customAssets,
    customCategories,
    addCategory,
    setCustomModalOpen,
    deleteCustomAsset,
    openEditModal,
    getAllCategories,
  } = useCustomAssetsStore()

  const categories = getAllCategories()
  const [activeTab, setActiveTab] = useState<'furniture' | 'floors' | 'zones'>('furniture')
  const [furnitureCategory, setFurnitureCategory] = useState<string>(() => categories[0] || 'Forja Antiga')

  const baseFloors: { id: FloorType | string; name: string; isCustom?: boolean }[] = [
    { id: 'habbo_parquet', name: 'Piso Padrão (Madeira)' },
  ]
  const customFloors = customAssets
    .filter((a) => a.type === 'floor')
    .map((a) => ({ id: a.id, name: `✨ ${a.name}`, isCustom: true }))
  const floors = [...customFloors, ...baseFloors]

  const baseWalls: { id: WallType | string; name: string; isCustom?: boolean }[] = [
    { id: 'drywall_white', name: 'Parede Padrão (Drywall)' },
  ]
  const customWalls = customAssets
    .filter((a) => a.type === 'wall')
    .map((a) => ({ id: a.id, name: `✨ ${a.name}`, isCustom: true }))
  const walls = [...customWalls, ...baseWalls]

  const customFurnitureDefs = customAssets
    .filter((a) => a.type === 'furniture')
    .map((a) => ({
      id: a.id,
      name: a.name,
      category: a.category || 'Geral',
      width: a.width,
      height: a.height,
      isObstacle: a.isObstacle,
      spriteKey: a.id,
      iconColor: a.iconColor || '#e03131',
      isCustom: true,
    }))
  const allFurniture = [...customFurnitureDefs, ...FURNITURE_CATALOG]

  const filteredFurniture = useMemo(() => {
    if (furnitureCategory === 'Todos') return allFurniture
    if (furnitureCategory === 'Customizados') return allFurniture.filter((f) => (f as any).isCustom)
    return allFurniture.filter((f) => f.category === furnitureCategory)
  }, [allFurniture, furnitureCategory])

  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false)

  if (!isEditorOpen) return null

  const handleDeleteZone = (id: string) => {
    removeZone(id)
    PeerManager.getInstance().broadcast({
      type: 'MAP_EDIT',
      senderId: 'local',
      payload: { action: 'remove_zone', data: { id } },
      timestamp: Date.now(),
    })
  }

  const handleConfirmReset = () => {
    setIsResetConfirmOpen(false)
    const emptyMap = createEmptyWorkspace()
    useMapStore.getState().setMapData(emptyMap)
    PeerManager.getInstance().broadcast({
      type: 'MAP_SYNC',
      senderId: 'host',
      payload: { mapData: emptyMap },
      timestamp: Date.now(),
    })
  }

  const handleResetWorkspace = () => {
    setIsResetConfirmOpen(true)
  }

  const currentFloor = floors.find((f) => f.id === selectedFloor)
  const currentWall = walls.find((w) => w.id === selectedWall)
  const currentFurniture = allFurniture.find((f) => f.id === selectedFurnitureDefId)

  return (
    <>
      <div className="absolute top-16 right-4 w-92 bg-[#1b202c]/95 backdrop-blur-md border border-[#2a3142] rounded-2xl shadow-2xl z-40 overflow-hidden flex flex-col max-h-[calc(100vh-120px)] animate-in fade-in slide-in-from-right-4 duration-200 select-none">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a3142] bg-[#12151d]/70">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-400" />
            <span className="font-bold text-sm text-slate-100">Editor de Espaço</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCustomModalOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white font-bold text-xs shadow-md transition-all border border-white/10"
              title="Adicionar e recortar novos elementos personalizados com transparência"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Criar Elemento</span>
            </button>
            <button
              onClick={() => setEditorOpen(false)}
              className="p-1 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ACTIVE SELECTED OBJECT CARD */}
        <ActiveItemSummary
          activeTool={activeTool}
          zoneDraft={zoneDraft}
          currentFloor={currentFloor}
          currentWall={currentWall}
          currentFurniture={currentFurniture}
          selectedFloor={selectedFloor}
          selectedWall={selectedWall}
          selectedFurnitureDefId={selectedFurnitureDefId}
        />

        {/* Tabs */}
        <div className="grid grid-cols-3 p-1.5 gap-1 bg-[#12151d]/40 border-b border-[#2a3142]">
          <button
            onClick={() => {
              setActiveTab('furniture')
              setActiveTool('place_furniture')
            }}
            className={`flex flex-col items-center py-2 px-1 rounded-xl text-xs font-medium transition-all ${
              activeTab === 'furniture'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Armchair className="w-4 h-4 mb-1" />
            Mobília
          </button>

          <button
            onClick={() => {
              setActiveTab('floors')
              setActiveTool('paint_floor')
            }}
            className={`flex flex-col items-center py-2 px-1 rounded-xl text-xs font-medium transition-all ${
              activeTab === 'floors'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <LayoutGrid className="w-4 h-4 mb-1" />
            Pisos
          </button>

          <button
            onClick={() => {
              setActiveTab('zones')
              setActiveTool('draw_zone')
            }}
            className={`flex flex-col items-center py-2 px-1 rounded-xl text-xs font-medium transition-all ${
              activeTab === 'zones'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Square className="w-4 h-4 mb-1" />
            Zonas & Paredes
          </button>
        </div>

        {/* Content Area */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'furniture' && (
            <FurnitureTab
              categories={categories}
              furnitureCategory={furnitureCategory}
              setFurnitureCategory={setFurnitureCategory}
              addCategory={addCategory}
              allFurniture={allFurniture}
              filteredFurniture={filteredFurniture}
              selectedFurnitureDefId={selectedFurnitureDefId}
              setSelectedFurnitureDefId={setSelectedFurnitureDefId}
              activeTool={activeTool}
              setActiveTool={setActiveTool}
              openEditModal={openEditModal}
              deleteCustomAsset={deleteCustomAsset}
            />
          )}

          {activeTab === 'floors' && (
            <FloorsTab
              floors={floors}
              selectedFloor={selectedFloor}
              setSelectedFloor={setSelectedFloor}
              activeTool={activeTool}
              setActiveTool={setActiveTool}
              openEditModal={openEditModal}
              deleteCustomAsset={deleteCustomAsset}
            />
          )}

          {activeTab === 'zones' && (
            <ZonesTab
              activeTool={activeTool}
              setActiveTool={setActiveTool}
              zoneDraft={zoneDraft}
              setZoneDraft={setZoneDraft}
              walls={walls}
              mapData={mapData}
              handleDeleteZone={handleDeleteZone}
              openEditModal={openEditModal}
              deleteCustomAsset={deleteCustomAsset}
            />
          )}
        </div>

        {/* Footer Tools: Borracha e Limpar Espaço */}
        <PaletteFooterActions
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          onResetWorkspace={handleResetWorkspace}
        />
      </div>

      {/* Confirm Reset Space Modal */}
      <ConfirmModal
        isOpen={isResetConfirmOpen}
        title="Limpar Espaço de Trabalho"
        message="Tem certeza que deseja limpar todo o mapa e começar um espaço em branco? Esta ação apagará todas as mobílias e divisórias atuais."
        confirmText="Limpar Tudo"
        confirmVariant="danger"
        onConfirm={handleConfirmReset}
        onCancel={() => setIsResetConfirmOpen(false)}
      />
    </>
  )
}
