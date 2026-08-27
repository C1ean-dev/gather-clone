import React, { useEffect, useRef } from 'react'
import { PixelArtRenderer } from '../engine/PixelArtRenderer'
import { FURNITURE_CATALOG, TILE_SIZE } from '../engine/Constants'
import { FloorType, WallType, PlacedFurniture } from '../types/map'

interface PixelArtThumbnailProps {
  type: 'furniture' | 'floor' | 'wall'
  id: string
  size?: number
  className?: string
}

export const PixelArtThumbnail: React.FC<PixelArtThumbnailProps> = ({
  type,
  id,
  size = 48,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (type === 'furniture') {
      const def = FURNITURE_CATALOG.find((f) => f.id === id)
      if (!def) return

      const furnWidthPx = def.width * TILE_SIZE
      const furnHeightPx = def.height * TILE_SIZE

      // Scale to fit within thumbnail box (padding 4px)
      const maxDim = Math.max(furnWidthPx, furnHeightPx)
      const availableSize = size - 8
      const scale = availableSize / maxDim

      ctx.save()
      // Center in canvas
      const offsetX = (size - furnWidthPx * scale) / 2
      const offsetY = (size - furnHeightPx * scale) / 2

      ctx.translate(offsetX, offsetY)
      ctx.scale(scale, scale)

      const mockFurn: PlacedFurniture = {
        id: 'thumb',
        defId: def.id,
        x: 0,
        y: 0,
      }

      PixelArtRenderer.drawFurniture(ctx, mockFurn)
      ctx.restore()
    } else if (type === 'floor') {
      ctx.save()
      PixelArtRenderer.drawFloor(ctx, id as FloorType, 0, 0, size)
      ctx.restore()
    } else if (type === 'wall') {
      ctx.save()
      PixelArtRenderer.drawWall(ctx, id as WallType, 0, 0, size)
      ctx.restore()
    }
  }, [type, id, size])

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className={`pixelated block rounded-lg shrink-0 ${className}`}
      style={{
        imageRendering: 'pixelated',
        width: `${size}px`,
        height: `${size}px`,
      }}
    />
  )
}
