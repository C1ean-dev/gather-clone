import React, { useEffect, useRef } from 'react'
import { Sparkles } from 'lucide-react'
import { CanvasEngine } from '../engine/CanvasEngine'
import { getNextAvailableZoneColor, FURNITURE_CATALOG } from '../engine/Constants'
import { useMapStore } from '../store/useMapStore'
import { useGameStore } from '../store/useGameStore'
import { useCustomAssetsStore } from '../store/useCustomAssetsStore'
import { PeerManager } from '../p2p/PeerManager'
import { PlacedFurniture, PrivateZone } from '../types/map'
import { MapControlsWidget } from './MapControlsWidget'
import { SimplifiedMapView } from './SimplifiedMapView'
import { FurnitureContextMenu } from '../editor/FurnitureContextMenu'

export const MapViewport: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const engineRef = useRef<CanvasEngine | null>(null)

  const { mapViewMode, setMapViewMode, isManualSimplified } = useGameStore()
  const {
    isEditorOpen,
    activeTool,
    selectedFloor,
    selectedWall,
    selectedFurnitureDefId,
    selectedPlacedFurnitureId,
    setSelectedPlacedFurnitureId,
    isMovingFurniture,
    setIsMovingFurniture,
    updateFurniture,
    zoneDraft,
    setWallTile,
    addFurniture,
    removeFurnitureAt,
    removeZoneAt,
    addOrUpdateZone,
    paintFloorInZone,
    findZoneAt,
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

  // Re-adjust camera and resize canvas when switching back to Immersive mode
  useEffect(() => {
    if (mapViewMode === 'immersive' && engineRef.current && canvasRef.current) {
      const canvas = canvasRef.current
      canvas.width = canvas.parentElement?.clientWidth || window.innerWidth
      canvas.height = canvas.parentElement?.clientHeight || window.innerHeight - 56
      const local = useGameStore.getState().localPlayer
      engineRef.current.camera.x = (local?.x ?? 34) * 32
      engineRef.current.camera.y = (local?.y ?? 20) * 32
      engineRef.current.fitToScreen(0.95)
    }
  }, [mapViewMode])

  // Apply a floor to the zone the user just clicked. The user can't
  // paint a single cell — clicking inside a zone repaints the whole
  // zone footprint. If the click is outside any zone, the action is
  // a no-op (the cursor preview shows a "forbidden" outline so the
  // user knows why nothing happened).
  const applyFloorToZoneAt = (tileX: number, tileY: number, floor: string) => {
    const zone = findZoneAt(tileX, tileY)
    if (!zone) return false
    paintFloorInZone(zone.id, floor as any)
    PeerManager.getInstance().sendMapEdit('paint_floor_in_zone', {
      zoneId: zone.id,
      floor,
    })
    return true
  }

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
      // 1. Moving an existing selected furniture
      if (isMovingFurniture && selectedPlacedFurnitureId) {
        updateFurniture(selectedPlacedFurnitureId, { x: tile.x, y: tile.y })
        const updatedFurn = mapData.furniture.find((f) => f.id === selectedPlacedFurnitureId)
        if (updatedFurn) {
          PeerManager.getInstance().sendMapEdit('add_furniture', {
            furniture: { ...updatedFurn, x: tile.x, y: tile.y },
          })
        }
        setIsMovingFurniture(false)
        return
      }

      // 2. Check if user clicked directly on an existing furniture
      const customAssets = useCustomAssetsStore.getState().customAssets
      const clickedFurn = mapData.furniture.find((f) => {
        const custom = customAssets.find((a) => a.id === f.defId)
        const def = custom || FURNITURE_CATALOG.find((cat) => cat.id === f.defId)
        const w = def?.width || 1
        const h = def?.height || 1
        return tile.x >= f.x && tile.x < f.x + w && tile.y >= f.y && tile.y < f.y + h
      })

      // If clicked on furniture and not painting floors/walls or drawing zone:
      if (clickedFurn && activeTool !== 'paint_floor' && activeTool !== 'paint_wall' && activeTool !== 'draw_zone') {
        if (activeTool === 'eraser') {
          removeFurnitureAt(tile.x, tile.y)
          PeerManager.getInstance().sendMapEdit('remove_furniture', { x: tile.x, y: tile.y })
        } else {
          // Select furniture and open contextual menu
          setSelectedPlacedFurnitureId(clickedFurn.id)
        }
        return
      }

      // If clicked on empty space and not moving, deselect furniture
      if (!clickedFurn && selectedPlacedFurnitureId && activeTool !== 'eraser') {
        setSelectedPlacedFurnitureId(null)
      }

      if (activeTool === 'draw_zone') {
        engineRef.current.zoneDragStart = tile
        engineRef.current.zoneDragCurrent = tile
      } else if (activeTool === 'paint_floor') {
        // Floor paint only works inside zones. If the click is
        // outside any zone, do nothing — the cursor preview
        // already shows the "forbidden" outline so the user gets
        // visual feedback for why nothing changed.
        applyFloorToZoneAt(tile.x, tile.y, selectedFloor)
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
        const hadFurniture = removeFurnitureAt(tile.x, tile.y)
        setWallTile(tile.x, tile.y, null)
        // Eraser on a floor inside a zone: revert the whole zone to
        // the default floor (same behaviour as before, but applied
        // to the whole zone, not a single cell).
        const zone = findZoneAt(tile.x, tile.y)
        if (zone) {
          paintFloorInZone(zone.id, 'habbo_parquet')
          PeerManager.getInstance().sendMapEdit('paint_floor_in_zone', {
            zoneId: zone.id,
            floor: 'habbo_parquet',
          })
        }
        PeerManager.getInstance().sendMapEdit('remove_furniture', { x: tile.x, y: tile.y })
        PeerManager.getInstance().sendMapEdit('set_wall', { x: tile.x, y: tile.y, wall: null })
        if (!hadFurniture) {
          removeZoneAt(tile.x, tile.y)
        }
      }
    } else {
      // Regular mode: Click to move
      engineRef.current.setClickTarget(tile.x, tile.y)
    }
  }

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
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
          // Floor paint only works inside zones; outside a zone
          // the click is a no-op.
          applyFloorToZoneAt(tile.x, tile.y, selectedFloor)
        } else if (activeTool === 'paint_wall') {
          setWallTile(tile.x, tile.y, selectedWall)
          PeerManager.getInstance().sendMapEdit('set_wall', { x: tile.x, y: tile.y, wall: selectedWall })
        } else if (activeTool === 'eraser') {
          const hadFurniture = removeFurnitureAt(tile.x, tile.y)
          setWallTile(tile.x, tile.y, null)
          const zone = findZoneAt(tile.x, tile.y)
          if (zone) {
            paintFloorInZone(zone.id, 'habbo_parquet')
            PeerManager.getInstance().sendMapEdit('paint_floor_in_zone', {
              zoneId: zone.id,
              floor: 'habbo_parquet',
            })
          }
          PeerManager.getInstance().sendMapEdit('remove_furniture', { x: tile.x, y: tile.y })
          PeerManager.getInstance().sendMapEdit('set_wall', { x: tile.x, y: tile.y, wall: null })
          if (!hadFurniture) {
            removeZoneAt(tile.x, tile.y)
          }
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
        const uniqueColor = getNextAvailableZoneColor(mapData.zones || [])
        const newZone: PrivateZone = {
          id: 'zone-' + Math.random().toString(36).substring(2, 7),
          name: zoneDraft.name.trim() || 'Nova Sala Privada',
          color: uniqueColor,
          x: minX,
          y: minY,
          width,
          height,
          hasWalls: zoneDraft.hasWalls !== false,
          wallType: zoneDraft.wallType || 'drywall_white',
          description: 'Zona de chamada privada demarcada com mouse',
        }

        addOrUpdateZone(newZone)

        // Automatically update the draft color for the next zone to create
        const nextZones = [...(mapData.zones || []), newZone]
        useMapStore.getState().setZoneDraft({
          ...zoneDraft,
          color: getNextAvailableZoneColor(nextZones),
        })

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
    // Se estiver no modo simplificado:
    if (mapViewMode === 'simplified') {
      // Se adicionar zoom (delta > 0) e NÃO foi ativado manualmente pelo botão:
      if (delta > 0 && !isManualSimplified) {
        if (engineRef.current) {
          engineRef.current.camera.zoom = 0.6
        }
        setMapViewMode('immersive', false)
      }
      return
    }

    if (!engineRef.current) return
    const newZoom = Math.max(0.4, Math.min(4.0, Number((engineRef.current.camera.zoom + delta).toFixed(2))))
    engineRef.current.camera.zoom = newZoom

    // Quando o usuário der zoom no mínimo (<= 0.4), altera de imersivo para simplificado (automático via zoom)
    if (newZoom <= 0.4 && mapViewMode === 'immersive') {
      setMapViewMode('simplified', false)
    }
  }

  const handleWheel = (e: React.WheelEvent) => {
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
      {/* 2D Canvas Engine (Always mounted to preserve rendering context) */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={handleCanvasMouseUp}
        onWheel={handleWheel}
        className={`w-full h-full cursor-crosshair pixelated ${
          mapViewMode === 'simplified' ? 'hidden' : 'block'
        }`}
      />

      {/* Drawing Zone Active Floating Banner */}
      {isEditorOpen && activeTool === 'draw_zone' && mapViewMode !== 'simplified' && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-indigo-600/90 backdrop-blur-md border border-indigo-400/40 text-white px-4 py-2 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-semibold animate-pulse select-none z-30">
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>Clique e arraste no mapa para demarcar a zona privada</span>
        </div>
      )}

      {/* Floor paint active banner — reminds the user that the click
          will fill the WHOLE zone, not a single cell. */}
      {isEditorOpen && activeTool === 'paint_floor' && mapViewMode !== 'simplified' && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-emerald-600/90 backdrop-blur-md border border-emerald-400/40 text-white px-4 py-2 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-semibold select-none z-30">
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>Clique dentro de uma zona para preencher ela inteira com o piso selecionado</span>
        </div>
      )}

      {/* Simplified Vector Map View */}
      {mapViewMode === 'simplified' && <SimplifiedMapView />}

      {/* Furniture Contextual Action Menu (Move / Color / Delete) */}
      <FurnitureContextMenu />

      {/* Floating Bottom-Right Map Controls Widget (Modes + Zoom) */}
      <div className="absolute bottom-4 right-4 z-40">
        <MapControlsWidget
          onZoomIn={() => handleZoom(0.2)}
          onZoomOut={() => handleZoom(-0.2)}
          onFitScreen={handleFitScreen}
        />
      </div>
    </div>
  )
}
