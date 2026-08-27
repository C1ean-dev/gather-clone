import React, { useEffect, useRef } from 'react'
import { Plus, Minus, Maximize, Compass, Info } from 'lucide-react'
import { CanvasEngine } from '../engine/CanvasEngine'
import { useMapStore } from '../store/useMapStore'
import { useGameStore } from '../store/useGameStore'
import { PeerManager } from '../p2p/PeerManager'
import { PlacedFurniture } from '../types/map'

export const MapViewport: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const engineRef = useRef<CanvasEngine | null>(null)

  const {
    isEditorOpen,
    activeTool,
    selectedFloor,
    selectedWall,
    selectedFurnitureDefId,
    setFloorTile,
    setWallTile,
    addFurniture,
    removeFurnitureAt,
    mapData,
  } = useMapStore()

  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const engine = new CanvasEngine(canvas)
    engineRef.current = engine

    const handleResize = () => {
      canvas.width = canvas.parentElement?.clientWidth || window.innerWidth
      canvas.height = canvas.parentElement?.clientHeight || window.innerHeight - 56
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    engine.start()

    return () => {
      window.removeEventListener('resize', handleResize)
      engine.dispose()
    }
  }, [])

  // Handle Canvas Mouse Clicks & Editor Interactions
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!engineRef.current || !canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    const tile = engineRef.current.screenToTile(mouseX, mouseY)

    if (isEditorOpen) {
      if (activeTool === 'paint_floor') {
        setFloorTile(tile.x, tile.y, selectedFloor)
        PeerManager.getInstance().sendMapEdit('set_floor', { x: tile.x, y: tile.y, floor: selectedFloor })
      } else if (activeTool === 'paint_wall') {
        setWallTile(tile.x, tile.y, selectedWall)
        PeerManager.getInstance().sendMapEdit('set_wall', { x: tile.x, y: tile.y, wall: selectedWall })
      } else if (activeTool === 'place_furniture') {
        const newFurn: PlacedFurniture = {
          id: 'furn-' + Math.random().toString(36).substring(2, 8),
          defId: selectedFurnitureDefId,
          x: tile.x,
          y: tile.y,
        }
        addFurniture(newFurn)
        PeerManager.getInstance().sendMapEdit('add_furniture', { furniture: newFurn })
      } else if (activeTool === 'eraser') {
        removeFurnitureAt(tile.x, tile.y)
        setWallTile(tile.x, tile.y, null)
        PeerManager.getInstance().sendMapEdit('remove_furniture', { x: tile.x, y: tile.y })
        PeerManager.getInstance().sendMapEdit('set_wall', { x: tile.x, y: tile.y, wall: null })
      }
    } else {
      // Regular mode: Click to move
      engineRef.current.setClickTarget(tile.x, tile.y)
    }
  }

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!engineRef.current || !canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    const tile = engineRef.current.screenToTile(mouseX, mouseY)
    engineRef.current.hoverTile = tile
  }

  const handleZoom = (delta: number) => {
    if (!engineRef.current) return
    engineRef.current.camera.zoom = Math.max(0.8, Math.min(2.5, engineRef.current.camera.zoom + delta))
  }

  return (
    <div className="relative flex-1 w-full h-[calc(100vh-56px)] overflow-hidden bg-[#0c0e14]">
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        className="w-full h-full cursor-crosshair pixelated block"
      />

      {/* Floating Info & Shortcuts Badge (Bottom-Right) */}
      <div className="absolute bottom-4 right-4 flex flex-col items-end gap-2 pointer-events-none select-none">
        {/* Controls Pills */}
        <div className="bg-[#1b202c]/90 backdrop-blur-md border border-[#2a3142] rounded-2xl p-2.5 shadow-xl pointer-events-auto flex items-center gap-3 text-xs text-slate-300">
          <div className="flex items-center gap-1.5 font-medium">
            <kbd className="bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded text-[10px] text-slate-200">W</kbd>
            <kbd className="bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded text-[10px] text-slate-200">A</kbd>
            <kbd className="bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded text-[10px] text-slate-200">S</kbd>
            <kbd className="bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded text-[10px] text-slate-200">D</kbd>
            <span className="text-slate-400">ou Clique para Mover</span>
          </div>

          <div className="h-4 w-px bg-slate-700" />

          {/* Zoom Buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleZoom(0.2)}
              className="p-1 rounded-lg hover:bg-slate-700 text-slate-300 transition-colors"
              title="Aumentar Zoom"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleZoom(-0.2)}
              className="p-1 rounded-lg hover:bg-slate-700 text-slate-300 transition-colors"
              title="Diminuir Zoom"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
