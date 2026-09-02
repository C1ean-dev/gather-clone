import { TILE_SIZE, FURNITURE_CATALOG } from '../Constants'
import { PixelArtRenderer } from '../PixelArtRenderer'
import { AvatarRenderer } from '../AvatarRenderer'
import { PetRenderer } from '../pet/PetRenderer'
import { PetManager, PetState } from '../pet/PetManager'
import { Player, PetConfig } from '../../types/game'
import { useGameStore } from '../../store/useGameStore'
import { useMapStore } from '../../store/useMapStore'
import { useCustomAssetsStore } from '../../store/useCustomAssetsStore'
import { useSettingsStore } from '../../store/useSettingsStore'
import { CameraManager } from '../camera/CameraManager'

export class WorldRenderer {
  static render(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    camera: CameraManager,
    hoverTile: { x: number; y: number } | null,
    zoneDragStart: { x: number; y: number } | null,
    zoneDragCurrent: { x: number; y: number } | null,
    currentTime: number,
    fps: number,
    destination?: { x: number; y: number } | null
  ) {
    const mapStore = useMapStore.getState()
    const map = mapStore.mapData
    const isEditorOpen = mapStore.isEditorOpen
    const activeTool = mapStore.activeTool
    const zoneDraft = mapStore.zoneDraft
    const localPlayer = useGameStore.getState().localPlayer
    const remotePlayers = useGameStore.getState().remotePlayers
    const reactions = useGameStore.getState().reactions

    // Clear background
    ctx.fillStyle = '#0c0e14'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Ensure camera values are sane
    if (isNaN(camera.zoom) || camera.zoom <= 0) camera.zoom = 1.0
    if (isNaN(camera.x)) camera.x = 34 * TILE_SIZE
    if (isNaN(camera.y)) camera.y = 20 * TILE_SIZE

    ctx.save()
    ctx.imageSmoothingEnabled = false

    try {
      // Center camera on player
      const viewWidth = canvas.width / camera.zoom
      const viewHeight = canvas.height / camera.zoom

      ctx.scale(camera.zoom, camera.zoom)
      ctx.imageSmoothingEnabled = false
      ctx.translate(
        viewWidth / 2 - camera.x,
        viewHeight / 2 - camera.y
      )

      // 1. Draw Floors (Optimized with Viewport Culling for high FPS)
      const mapH = map.height || 40
      const mapW = map.width || 68
      const enableCulling = useSettingsStore.getState().enableCulling

      let startX = 0
      let endX = mapW
      let startY = 0
      let endY = mapH

      if (enableCulling) {
        const camMinX = camera.x - viewWidth / 2
        const camMaxX = camera.x + viewWidth / 2
        const camMinY = camera.y - viewHeight / 2
        const camMaxY = camera.y + viewHeight / 2

        startX = Math.max(0, Math.floor(camMinX / TILE_SIZE) - 1)
        endX = Math.min(mapW, Math.ceil(camMaxX / TILE_SIZE) + 1)
        startY = Math.max(0, Math.floor(camMinY / TILE_SIZE) - 1)
        endY = Math.min(mapH, Math.ceil(camMaxY / TILE_SIZE) + 1)
      }

      // Base solid underlay to guarantee zero subpixel background bleed across entire visible area
      ctx.fillStyle = '#f6e7d2'
      ctx.fillRect(
        startX * TILE_SIZE,
        startY * TILE_SIZE,
        (endX - startX) * TILE_SIZE + 2,
        (endY - startY) * TILE_SIZE + 2
      )

      for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
          const floor = map.floors?.[y]?.[x] || 'habbo_parquet'
          PixelArtRenderer.drawFloor(ctx, floor, x * TILE_SIZE, y * TILE_SIZE)
        }
      }

      // 2. Draw Gather Room Architecture (1:1 Exact Photo Replica)
      for (const zone of map.zones || []) {
        PixelArtRenderer.drawGatherRoom(ctx, zone, map.zones || [])
      }

      // 3. Draw Zone Header Badges & Dashed Overlays (Only in Editor Mode)
      if (isEditorOpen) {
        for (const zone of map.zones || []) {
          const isCurrent = localPlayer.currentZoneId === zone.id
          PixelArtRenderer.drawPrivateZone(ctx, zone, isCurrent)
        }
      }

      // 4. Draw Placed Furniture & Wall Windows
      for (const item of map.furniture || []) {
        PixelArtRenderer.drawFurniture(ctx, item)
      }

      // 4b. Draw Click-to-Move Path Destination Indicator
      if (destination && !isEditorOpen) {
        ctx.save()
        const destX = destination.x * TILE_SIZE + 16
        const destY = destination.y * TILE_SIZE + 16
        const pulse = (Math.sin(currentTime / 160) + 1) / 2
        const ringRadius = 7 + pulse * 5

        // Outer glowing pulse ring
        ctx.strokeStyle = `rgba(99, 102, 241, ${0.4 + pulse * 0.45})`
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(destX, destY, ringRadius, 0, Math.PI * 2)
        ctx.stroke()

        // Inner solid core
        ctx.fillStyle = '#6366f1'
        ctx.beginPath()
        ctx.arc(destX, destY, 3, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }

      // 4c. Draw Selected Furniture Highlight (in Editor Mode)
      if (isEditorOpen && mapStore.selectedPlacedFurnitureId) {
        const selFurn = (map.furniture || []).find((f) => f.id === mapStore.selectedPlacedFurnitureId)
        if (selFurn) {
          const customAsset = useCustomAssetsStore.getState().getAssetById(selFurn.defId)
          const def = customAsset || FURNITURE_CATALOG.find((f) => f.id === selFurn.defId)
          const fw = (def?.width || 1) * TILE_SIZE
          const fh = (def?.height || 1) * TILE_SIZE
          const fx = selFurn.x * TILE_SIZE
          const fy = selFurn.y * TILE_SIZE

          ctx.save()
          const pulse = (Math.sin(currentTime / 180) + 1) / 2
          ctx.strokeStyle = `rgba(99, 102, 241, ${0.8 + pulse * 0.2})`
          ctx.lineWidth = 2.5
          ctx.setLineDash([6, 3])
          ctx.strokeRect(fx - 1, fy - 1, fw + 2, fh + 2)

          // Corner handles
          ctx.setLineDash([])
          ctx.fillStyle = '#ffffff'
          const handleSz = 5
          ctx.fillRect(fx - handleSz / 2, fy - handleSz / 2, handleSz, handleSz)
          ctx.fillRect(fx + fw - handleSz / 2, fy - handleSz / 2, handleSz, handleSz)
          ctx.fillRect(fx - handleSz / 2, fy + fh - handleSz / 2, handleSz, handleSz)
          ctx.fillRect(fx + fw - handleSz / 2, fy + fh - handleSz / 2, handleSz, handleSz)
          ctx.restore()
        }
      }

      // 5. Sort and Draw Players & Companion Pets by Y-depth
      type RenderableEntity =
        | { kind: 'player'; y: number; player: Player; isLocal: boolean }
        | { kind: 'pet'; y: number; pet: PetState; petConfig: PetConfig }

      const allEntities: RenderableEntity[] = [
        { kind: 'player', y: localPlayer.y, player: localPlayer, isLocal: true },
        ...Object.values(remotePlayers).map((p) => ({
          kind: 'player' as const,
          y: p.y,
          player: p,
          isLocal: false,
        })),
      ]

      const petManager = PetManager.getInstance()
      const allActivePlayers = [localPlayer, ...Object.values(remotePlayers)]
      for (const p of allActivePlayers) {
        if (p.avatar?.pet && p.avatar.pet.type !== 'none') {
          const pet = petManager.getPet(p.id)
          if (pet) {
            allEntities.push({
              kind: 'pet',
              y: pet.y,
              pet,
              petConfig: p.avatar.pet,
            })
          }
        }
      }

      allEntities.sort((a, b) => a.y - b.y)

      const showNameTags = useSettingsStore.getState().showNameTags ?? true

      for (const entity of allEntities) {
        if (entity.kind === 'player') {
          AvatarRenderer.drawPlayer(ctx, entity.player, entity.isLocal, currentTime, TILE_SIZE, showNameTags)
        } else {
          PetRenderer.drawPet(ctx, entity.pet, entity.petConfig, currentTime, showNameTags)
        }
      }

      // 6. Draw Floating Reactions
      for (const r of reactions) {
        const age = currentTime - r.createdAt
        if (age < 3000) {
          const floatY = r.y * TILE_SIZE - (age / 1000) * 20
          ctx.font = '20px serif'
          ctx.fillText(r.emoji, r.x * TILE_SIZE + 6, floatY)
        }
      }

      // 7. Draw Live Drag-to-Draw Zone Preview
      if (isEditorOpen && activeTool === 'draw_zone' && zoneDragStart && zoneDragCurrent) {
        const minX = Math.min(zoneDragStart.x, zoneDragCurrent.x)
        const maxX = Math.max(zoneDragStart.x, zoneDragCurrent.x)
        const minY = Math.min(zoneDragStart.y, zoneDragCurrent.y)
        const maxY = Math.max(zoneDragStart.y, zoneDragCurrent.y)

        const w = (maxX - minX + 1) * TILE_SIZE
        const h = (maxY - minY + 1) * TILE_SIZE
        const px = minX * TILE_SIZE
        const py = minY * TILE_SIZE

        const isOverlapping = map.zones.some((z) => {
          const zMaxX = z.x + z.width - 1
          const zMaxY = z.y + z.height - 1
          const overlapX = Math.min(maxX, zMaxX) - Math.max(minX, z.x)
          const overlapY = Math.min(maxY, zMaxY) - Math.max(minY, z.y)
          return overlapX >= 1 && overlapY >= 1
        })

        ctx.save()
        // Fill
        ctx.fillStyle = isOverlapping
          ? 'rgba(239, 68, 68, 0.35)'
          : zoneDraft.color
          ? `${zoneDraft.color}35`
          : 'rgba(76, 110, 245, 0.25)'
        ctx.fillRect(px, py, w, h)

        // Dashed border
        ctx.strokeStyle = isOverlapping ? '#ef4444' : zoneDraft.color || '#4c6ef5'
        ctx.lineWidth = 3
        ctx.setLineDash([8, 4])
        ctx.strokeRect(px + 1.5, py + 1.5, w - 3, h - 3)

        // Dimension badge
        ctx.setLineDash([])
        const badgeText = isOverlapping
          ? `🚫 SOBREPOSIÇÃO NÃO PERMITIDA (${maxX - minX + 1}x${maxY - minY + 1})`
          : `${zoneDraft.name} (${maxX - minX + 1}x${maxY - minY + 1} tiles)`
        ctx.font = 'bold 11px sans-serif'
        const textWidth = ctx.measureText(badgeText).width

        ctx.fillStyle = isOverlapping ? '#dc2626' : zoneDraft.color || '#4c6ef5'
        ctx.beginPath()
        ctx.roundRect(px + 4, py - 20, textWidth + 14, 18, 5)
        ctx.fill()

        ctx.fillStyle = '#ffffff'
        ctx.fillText(badgeText, px + 11, py - 6)
        ctx.restore()
      }
      // Draw Editor Hover Tile Preview with Asset Dimensions
      else if (isEditorOpen && hoverTile) {
        ctx.save()
        const tx = hoverTile.x
        const ty = hoverTile.y

        if (activeTool === 'place_furniture') {
          const customAsset = useCustomAssetsStore.getState().getAssetById(mapStore.selectedFurnitureDefId)
          const furnDef = customAsset || FURNITURE_CATALOG.find((f) => f.id === mapStore.selectedFurnitureDefId)
          const w = (furnDef?.width || 1) * TILE_SIZE
          const h = (furnDef?.height || 1) * TILE_SIZE

          // Semi-transparent ghost furniture preview
          ctx.fillStyle = furnDef?.iconColor ? `${furnDef.iconColor}44` : 'rgba(76, 110, 245, 0.3)'
          ctx.fillRect(tx * TILE_SIZE, ty * TILE_SIZE, w, h)
          ctx.strokeStyle = furnDef?.iconColor || '#4c6ef5'
          ctx.lineWidth = 2
          ctx.strokeRect(tx * TILE_SIZE + 0.5, ty * TILE_SIZE + 0.5, w - 1, h - 1)
        } else if (activeTool === 'paint_floor') {
          // Floor paint only works inside zones. When the cursor is
          // over a zone, highlight the whole zone footprint so the
          // user can see what will be filled. When the cursor is
          // outside any zone, show a small "forbidden" outline so
          // the user knows why nothing will happen on click.
          const zones = (mapStore as any).mapData?.zones as
            | { id: string; x: number; y: number; width: number; height: number }[]
            | undefined
          let insideZone: { x: number; y: number; width: number; height: number } | null = null
          if (zones) {
            let best: { x: number; y: number; width: number; height: number } | null = null
            let bestArea = Number.POSITIVE_INFINITY
            for (const z of zones) {
              if (tx < z.x || tx >= z.x + z.width) continue
              if (ty < z.y || ty >= z.y + z.height) continue
              const area = z.width * z.height
              if (area < bestArea) {
                best = z
                bestArea = area
              }
            }
            insideZone = best
          }
          if (insideZone) {
            ctx.fillStyle = 'rgba(32, 201, 151, 0.18)'
            ctx.fillRect(
              insideZone.x * TILE_SIZE,
              insideZone.y * TILE_SIZE,
              insideZone.width * TILE_SIZE,
              insideZone.height * TILE_SIZE
            )
            ctx.strokeStyle = '#20c997'
            ctx.lineWidth = 2
            ctx.strokeRect(
              insideZone.x * TILE_SIZE + 0.5,
              insideZone.y * TILE_SIZE + 0.5,
              insideZone.width * TILE_SIZE - 1,
              insideZone.height * TILE_SIZE - 1
            )
          } else {
            // Forbidden — paint is a no-op outside zones.
            ctx.strokeStyle = '#fa5252'
            ctx.lineWidth = 2
            ctx.strokeRect(
              tx * TILE_SIZE + 0.5,
              ty * TILE_SIZE + 0.5,
              TILE_SIZE - 1,
              TILE_SIZE - 1
            )
            // Diagonal slash to make the "no entry" read clear.
            ctx.beginPath()
            ctx.moveTo(tx * TILE_SIZE + 4, ty * TILE_SIZE + 4)
            ctx.lineTo(tx * TILE_SIZE + TILE_SIZE - 5, ty * TILE_SIZE + TILE_SIZE - 5)
            ctx.moveTo(tx * TILE_SIZE + TILE_SIZE - 5, ty * TILE_SIZE + 4)
            ctx.lineTo(tx * TILE_SIZE + 4, ty * TILE_SIZE + TILE_SIZE - 5)
            ctx.stroke()
          }
        } else if (activeTool === 'paint_wall') {
          ctx.fillStyle = 'rgba(232, 212, 162, 0.4)'
          ctx.fillRect(tx * TILE_SIZE, ty * TILE_SIZE, TILE_SIZE, TILE_SIZE)
          ctx.strokeStyle = '#fab005'
          ctx.lineWidth = 2
          ctx.strokeRect(tx * TILE_SIZE + 0.5, ty * TILE_SIZE + 0.5, TILE_SIZE - 1, TILE_SIZE - 1)
        } else if (activeTool === 'eraser') {
          ctx.fillStyle = 'rgba(224, 49, 49, 0.3)'
          ctx.fillRect(tx * TILE_SIZE, ty * TILE_SIZE, TILE_SIZE, TILE_SIZE)
          ctx.strokeStyle = '#fa5252'
          ctx.lineWidth = 2
          ctx.strokeRect(tx * TILE_SIZE + 0.5, ty * TILE_SIZE + 0.5, TILE_SIZE - 1, TILE_SIZE - 1)
        } else {
          ctx.strokeStyle = '#20c997'
          ctx.lineWidth = 2
          ctx.strokeRect(tx * TILE_SIZE + 0.5, ty * TILE_SIZE + 0.5, TILE_SIZE - 1, TILE_SIZE - 1)
        }
        ctx.restore()
      }
    } catch (e) {
      console.error('Error in CanvasEngine render:', e)
    } finally {
      ctx.restore()
    }

    // 8. On-Screen FPS Counter HUD Overlay
    if (useSettingsStore.getState().showFpsCounter) {
      ctx.save()
      const fpsText = `${fps} FPS`
      ctx.font = 'bold 12px monospace'
      const textMetrics = ctx.measureText(fpsText)
      const badgeW = textMetrics.width + 18
      const badgeH = 24
      const bx = canvas.width - badgeW - 14
      const by = 14

      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)'
      ctx.beginPath()
      ctx.roundRect(bx, by, badgeW, badgeH, 6)
      ctx.fill()
      ctx.strokeStyle = fps >= 50 ? '#22c55e' : fps >= 25 ? '#eab308' : '#ef4444'
      ctx.lineWidth = 1.5
      ctx.stroke()

      ctx.fillStyle = fps >= 50 ? '#4ade80' : fps >= 25 ? '#fde047' : '#f87171'
      ctx.fillText(fpsText, bx + 9, by + 16)
      ctx.restore()
    }
  }
}
