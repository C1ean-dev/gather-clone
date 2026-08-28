import React, { useEffect, useRef } from 'react'
import { Plus, Minus, Maximize2, Sparkles } from 'lucide-react'
import { CanvasEngine } from '../engine/CanvasEngine'
import { useMapStore } from '../store/useMapStore'
import { PeerManager } from '../p2p/PeerManager'
import { PlacedFurniture, PrivateZone } from '../types/map'

export const MapViewport: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const engineRef = useRef<CanvasEngine | null>(null)

  const {
    isEditorOpen,
    activeTool,
    selectedFloor,
    selectedWall,
    selectedFurnitureDefId,
    zoneDraft,
    setFloorTile,
    setWallTile,
    addFurniture,
    removeFurnitureAt,
    addOrUpdateZone,
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
      engine.fitToScreen(0.95)
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    engine.start()

    // Auto-fit on initial render
    setTimeout(() => {
      engine.fitToScreen(0.95)
    }, 50)

    return () => {
      window.removeEventListener('resize', handleResize)
      engine.dispose()
    }
  }, [])

  const isMouseDownRef = useRef(false)
  const lastPaintedTileRef = useRef<string | null>(null)

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      isMouseDownRef.current = false
      lastPaintedTileRef.current = null
    }
    window.addEventListener('mouseup', handleGlobalMouseUp)
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp)
    }
  }, [])

  // Auto-fit when mapData template changes
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.fitToScreen(0.95)
    }
  }, [mapData.width, mapData.height])

  // Handle Canvas Mouse Clicks & Editor Interactions
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!engineRef.current || !canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const scaleX = canvasRef.current.width / (rect.width || 1)
    const scaleY = canvasRef.current.height / (rect.height || 1)
    const mouseX = (e.clientX - rect.left) * scaleX
    const mouseY = (e.clientY - rect.top) * scaleY

    const tile = engineRef.current.screenToTile(mouseX, mouseY)

    isMouseDownRef.current = true
    lastPaintedTileRef.current = `${tile.x},${tile.y}`

    if (isEditorOpen) {
      if (activeTool === 'draw_zone') {
        engineRef.current.zoneDragStart = tile
        engineRef.current.zoneDragCurrent = tile
      } else if (activeTool === 'paint_floor') {
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
    const scaleX = canvasRef.current.width / (rect.width || 1)
    const scaleY = canvasRef.current.height / (rect.height || 1)
    const mouseX = (e.clientX - rect.left) * scaleX
    const mouseY = (e.clientY - rect.top) * scaleY

    const tile = engineRef.current.screenToTile(mouseX, mouseY)
    engineRef.current.hoverTile = tile

    // Continuous drag painting when mouse button is held down
    if (isEditorOpen && isMouseDownRef.current) {
      const tileKey = `${tile.x},${tile.y}`
      if (lastPaintedTileRef.current !== tileKey) {
        lastPaintedTileRef.current = tileKey
        if (activeTool === 'paint_floor') {
          setFloorTile(tile.x, tile.y, selectedFloor)
          PeerManager.getInstance().sendMapEdit('set_floor', { x: tile.x, y: tile.y, floor: selectedFloor })
        } else if (activeTool === 'paint_wall') {
          setWallTile(tile.x, tile.y, selectedWall)
          PeerManager.getInstance().sendMapEdit('set_wall', { x: tile.x, y: tile.y, wall: selectedWall })
        } else if (activeTool === 'eraser') {
          removeFurnitureAt(tile.x, tile.y)
          setWallTile(tile.x, tile.y, null)
          PeerManager.getInstance().sendMapEdit('remove_furniture', { x: tile.x, y: tile.y })
          PeerManager.getInstance().sendMapEdit('set_wall', { x: tile.x, y: tile.y, wall: null })
        }
      }
    }

    // Update drag preview if drawing zone
    if (isEditorOpen && activeTool === 'draw_zone' && engineRef.current.zoneDragStart) {
      engineRef.current.zoneDragCurrent = tile
    }
  }

  const handleCanvasMouseUp = () => {
    isMouseDownRef.current = false
    lastPaintedTileRef.current = null

    if (!engineRef.current) return

    // Finalize drag-to-draw zone
    if (isEditorOpen && activeTool === 'draw_zone' && engineRef.current.zoneDragStart && engineRef.current.zoneDragCurrent) {
      const start = engineRef.current.zoneDragStart
      const current = engineRef.current.zoneDragCurrent

      let minX = Math.min(start.x, current.x)
      let maxX = Math.max(start.x, current.x)
      let minY = Math.min(start.y, current.y)
      let maxY = Math.max(start.y, current.y)

      // Magnetic alignment with existing zones to prevent gaps or interior overlaps
      for (const z of mapData.zones) {
        const zRight = z.x + z.width
        const zBottom = z.y + z.height

        // Snap adjacent right (starts right where existing zone ends)
        if (Math.abs(minX - zRight) <= 1) minX = zRight
        // Snap adjacent left (ends right where existing zone starts)
        if (Math.abs((maxX + 1) - z.x) <= 1) maxX = z.x - 1

        // Snap Y alignment
        if (Math.abs(minY - z.y) <= 1) minY = z.y
        if (Math.abs(maxY - (zBottom - 1)) <= 1) maxY = zBottom - 1
        // Snap adjacent bottom
        if (Math.abs(minY - zBottom) <= 1) minY = zBottom
      }

      const width = maxX - minX + 1
      const height = maxY - minY + 1

      // Allow touching/shared walls, but forbid interior area intersections
      const hasOverlap = mapData.zones.some((z) => {
        const zMaxX = z.x + z.width - 1
        const zMaxY = z.y + z.height - 1
        const overlapX = Math.min(maxX, zMaxX) - Math.max(minX, z.x)
        const overlapY = Math.min(maxY, zMaxY) - Math.max(minY, z.y)
        return overlapX >= 1 && overlapY >= 1
      })

      if (width >= 2 && height >= 2 && !hasOverlap) {
        const newZone: PrivateZone = {
          id: 'zone-' + Math.random().toString(36).substring(2, 7),
          name: zoneDraft.name.trim() || 'Nova Sala Privada',
          color: zoneDraft.color || '#4c6ef5',
          x: minX,
          y: minY,
          width,
          height,
          hasWalls: zoneDraft.hasWalls !== false,
          wallType: zoneDraft.wallType || 'drywall_white',
          description: 'Zona de chamada privada demarcada com mouse',
        }

        addOrUpdateZone(newZone)
        PeerManager.getInstance().broadcast({
          type: 'MAP_SYNC',
          senderId: 'host',
          payload: { mapData: useMapStore.getState().mapData },
          timestamp: Date.now(),
        })
      }

      engineRef.current.zoneDragStart = null
      engineRef.current.zoneDragCurrent = null
    }
  }

  const handleZoom = (delta: number) => {
    if (!engineRef.current) return
    engineRef.current.camera.zoom = Math.max(0.4, Math.min(4.0, Number((engineRef.current.camera.zoom + delta).toFixed(2))))
  }

  const handleWheel = (e: React.WheelEvent) => {
    if (!engineRef.current) return
    // Smooth zoom in / out with mouse scroll
    const delta = e.deltaY < 0 ? 0.15 : -0.15
    handleZoom(delta)
  }

  const handleFitScreen = () => {
    if (!engineRef.current) return
    engineRef.current.fitToScreen(0.95)
  }

  return (
    <div
      onWheel={handleWheel}
      className="relative flex-1 w-full h-[calc(100vh-56px)] overflow-hidden bg-[#0c0e14]"
    >
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={handleCanvasMouseUp}
        onWheel={handleWheel}
        className="w-full h-full cursor-crosshair pixelated block"
      />

      {/* Drawing Zone Active Floating Banner */}
      {isEditorOpen && activeTool === 'draw_zone' && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-indigo-600/90 backdrop-blur-md border border-indigo-400/40 text-white px-4 py-2 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-semibold animate-pulse select-none z-30">
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>Clique e arraste no mapa para demarcar a zona privada</span>
        </div>
      )}

      {/* Floating Info & Shortcuts Badge (Bottom-Right) */}
      <div className="absolute bottom-4 right-4 flex flex-col items-end gap-2 pointer-events-none select-none">
        <div className="bg-[#1b202c]/90 backdrop-blur-md border border-[#2a3142] rounded-2xl p-2.5 shadow-xl pointer-events-auto flex items-center gap-3 text-xs text-slate-300">
          <div className="flex items-center gap-1.5 font-medium">
            <kbd className="bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded text-[10px] text-slate-200">W</kbd>
            <kbd className="bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded text-[10px] text-slate-200">A</kbd>
            <kbd className="bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded text-[10px] text-slate-200">S</kbd>
            <kbd className="bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded text-[10px] text-slate-200">D</kbd>
            <span className="text-slate-400">ou Clique</span>
          </div>

          <div className="h-4 w-px bg-slate-700" />

          {/* Zoom Buttons & Fit Screen */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleZoom(0.2)}
              className="p-1 rounded-lg hover:bg-slate-700 text-slate-300 transition-colors"
              title="Aumentar Zoom (+)"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleZoom(-0.2)}
              className="p-1 rounded-lg hover:bg-slate-700 text-slate-300 transition-colors"
              title="Diminuir Zoom (-)"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleFitScreen}
              className="p-1 rounded-lg hover:bg-indigo-600/30 text-indigo-400 hover:text-indigo-200 transition-colors"
              title="Enquadrar Mapa na Tela"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
