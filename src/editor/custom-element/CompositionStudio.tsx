import React from 'react'
import {
  Shield,
  Brush,
  RotateCcw,
  CheckSquare,
  Move,
  Eye,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from 'lucide-react'
import { CustomAssetType } from '../../types/customAsset'

export interface CompositeLayer {
  id: string
  clipId: string
  name: string
  dataUrl: string
  x: number
  y: number
  width: number
  height: number
  flipH: boolean
  opacity: number
}

interface Props {
  elementType: CustomAssetType
  tileWidth: number
  tileHeight: number
  setBoardSizeInTiles: (w: number, h: number) => void
  composeCanvasRef: React.RefObject<HTMLCanvasElement>
  composeTool: 'move' | 'collision'
  setComposeTool: (tool: 'move' | 'collision') => void
  composeZoom: number
  setComposeZoom: (z: number) => void
  showCollisionOverlay: boolean
  setShowCollisionOverlay: (show: boolean) => void
  collisionGrid: boolean[][]
  onSetAllCollision: (solid: boolean) => void
  onSetBottomHalfCollision: () => void
  onComposeMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void
  onComposeMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void
  onComposeMouseUp: () => void
}

export const CompositionStudio: React.FC<Props> = ({
  elementType,
  tileWidth,
  tileHeight,
  setBoardSizeInTiles,
  composeCanvasRef,
  composeTool,
  setComposeTool,
  composeZoom,
  setComposeZoom,
  showCollisionOverlay,
  setShowCollisionOverlay,
  collisionGrid,
  onSetAllCollision,
  onSetBottomHalfCollision,
  onComposeMouseDown,
  onComposeMouseMove,
  onComposeMouseUp,
}) => {
  return (
    <div className="flex-1 flex flex-col bg-[#12151d] rounded-2xl border border-[#2b2d31] overflow-hidden">
      {/* Top Toolbar: Tile Dimensions & Interactive Tools */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#2b2d31] bg-[#18191c]/80 shrink-0">
        {/* Typeable Tile Dimensions */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-300">Tamanho no Mapa:</span>
          <div className="flex items-center gap-2 bg-[#12151d] px-2.5 py-1 rounded-xl border border-[#2b2d31]">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-400 font-semibold">Largura:</span>
              <input
                type="number"
                min={1}
                max={10}
                value={tileWidth}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10)
                  if (!isNaN(val)) {
                    setBoardSizeInTiles(val, tileHeight)
                  }
                }}
                className="w-12 bg-[#18191c] border border-[#2b2d31] rounded-lg px-1.5 py-0.5 text-xs font-bold text-center text-white focus:outline-none focus:border-indigo-500"
              />
              <span className="text-[10px] text-slate-400 font-mono">({tileWidth * 32}px)</span>
            </div>

            <span className="text-slate-600 font-bold">×</span>

            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-400 font-semibold">Altura:</span>
              <input
                type="number"
                min={1}
                max={10}
                value={tileHeight}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10)
                  if (!isNaN(val)) {
                    setBoardSizeInTiles(tileWidth, val)
                  }
                }}
                className="w-12 bg-[#18191c] border border-[#2b2d31] rounded-lg px-1.5 py-0.5 text-xs font-bold text-center text-white focus:outline-none focus:border-indigo-500"
              />
              <span className="text-[10px] text-slate-400 font-mono">({tileHeight * 32}px)</span>
            </div>
          </div>
        </div>

        {/* Tools: Move Layers vs Paint Collision */}
        <div className="flex items-center gap-1.5">
          <div className="flex bg-[#12151d] p-1 rounded-xl border border-[#2b2d31]">
            <button
              type="button"
              onClick={() => setComposeTool('move')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                composeTool === 'move'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Move className="w-3.5 h-3.5" />
              <span>Mover Peças</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setComposeTool('collision')
                setShowCollisionOverlay(true)
              }}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                composeTool === 'collision'
                  ? 'bg-rose-600 text-white shadow animate-pulse'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Brush className="w-3.5 h-3.5" />
              <span>Pintar Colisão (Tiles)</span>
            </button>
          </div>

          {/* Zoom Controls — same pattern as the Crop tab toolbar */}
          <div className="flex items-center gap-1.5 bg-[#12151d] p-1 rounded-xl border border-[#2b2d31]">
            <button
              type="button"
              onClick={() => setComposeZoom(Math.max(1, composeZoom - 1))}
              className="p-1 rounded text-slate-300 hover:text-white hover:bg-[#2b2d31]"
              title="Reduzir Zoom"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono font-bold text-slate-300 px-1">
              {composeZoom}x
            </span>
            <button
              type="button"
              onClick={() => setComposeZoom(Math.min(6, composeZoom + 1))}
              className="p-1 rounded text-slate-300 hover:text-white hover:bg-[#2b2d31]"
              title="Aumentar Zoom"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setComposeZoom(2)}
              className="p-1 rounded text-slate-300 hover:text-white hover:bg-[#2b2d31]"
              title="Restaurar 2x (padrão)"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowCollisionOverlay(!showCollisionOverlay)}
            className={`p-1.5 rounded-xl border transition-colors ${
              showCollisionOverlay
                ? 'bg-rose-600/20 border-rose-500 text-rose-400'
                : 'bg-[#12151d] border-[#2b2d31] text-slate-400 hover:text-white'
            }`}
            title="Exibir/Ocultar grade de colisão vermelha"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Composition Canvas Stage */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-6 bg-[#0e1015] relative">
        <div className="relative border-2 border-indigo-500/50 rounded-2xl shadow-2xl overflow-hidden bg-[#18191c]/90">
          <canvas
            ref={composeCanvasRef}
            onMouseDown={onComposeMouseDown}
            onMouseMove={onComposeMouseMove}
            onMouseUp={onComposeMouseUp}
            className={`pixelated ${
              composeTool === 'collision' ? 'cursor-crosshair' : 'cursor-move'
            }`}
          />
        </div>
      </div>

      {/* Bottom Collision Tools (when Collision tool is active) */}
      {elementType === 'furniture' && composeTool === 'collision' && (
        <div className="p-3 bg-[#18191c] border-t border-[#2b2d31] flex items-center justify-between shrink-0 animate-in fade-in duration-150">
          <div className="flex items-center gap-2 text-xs text-rose-300">
            <Shield className="w-4 h-4 text-rose-400" />
            <span>
              Clique ou arraste nos blocos do quadro para pintar/limpar a barreira física onde os avatares não passam.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSetBottomHalfCollision}
              className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 transition-colors"
            >
              Base Inferior (Padrão)
            </button>
            <button
              type="button"
              onClick={() => onSetAllCollision(true)}
              className="px-3 py-1 rounded-xl bg-rose-600/30 hover:bg-rose-600/50 text-rose-300 border border-rose-500/40 text-xs font-bold transition-colors flex items-center gap-1"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Bloquear Tudo</span>
            </button>
            <button
              type="button"
              onClick={() => onSetAllCollision(false)}
              className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 border border-slate-700 transition-colors flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Limpar Tudo</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
