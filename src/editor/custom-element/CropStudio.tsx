import React, { useState, useCallback } from 'react'
import {
  Upload,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Grid,
  Scissors,
  CheckSquare,
} from 'lucide-react'

export interface CroppedClip {
  id: string
  name: string
  dataUrl: string
  width: number
  height: number
}

interface Props {
  sourceImage: HTMLImageElement | null
  sourceImageSrc: string
  zoom: number
  setZoom: (z: number) => void
  snapToGrid: boolean
  setSnapToGrid: (snap: boolean) => void
  selection: { x: number; y: number; w: number; h: number }
  setSelection: React.Dispatch<React.SetStateAction<{ x: number; y: number; w: number; h: number }>>
  isEyedropperActive: boolean
  mainCanvasRef: React.RefObject<HTMLCanvasElement>
  fileInputRef: React.RefObject<HTMLInputElement>
  onUploadImage: (e: React.ChangeEvent<HTMLInputElement>) => void
  onDropFile: (file: File) => void
  onCanvasMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void
  onCanvasMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void
  onCanvasMouseUp: () => void
  onCropAndSaveClip: () => void
}

export const CropStudio: React.FC<Props> = ({
  sourceImage,
  sourceImageSrc,
  zoom,
  setZoom,
  snapToGrid,
  setSnapToGrid,
  selection,
  setSelection,
  isEyedropperActive,
  mainCanvasRef,
  fileInputRef,
  onUploadImage,
  onDropFile,
  onCanvasMouseDown,
  onCanvasMouseMove,
  onCanvasMouseUp,
  onCropAndSaveClip,
}) => {
  // Track drag-and-drop hover state so the placeholder gives visual feedback
  // and the canvas wrapper can highlight when the user drags a file over it.
  const [isDragOverFile, setIsDragOverFile] = useState(false)

  // React passes a synthetic event whose dataTransfer is typed DataTransfer.
  // We use the standard HTML5 drag/drop contract: preventDefault on dragover
  // tells the browser this element accepts the drop (otherwise the cursor
  // shows "not-allowed" and the drop never fires).
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (Array.from(e.dataTransfer.types).includes('Files')) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'copy'
      if (!isDragOverFile) setIsDragOverFile(true)
    }
  }, [isDragOverFile])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    // Only clear when the cursor actually leaves the wrapper (not when it
    // crosses into a child element).
    if (e.currentTarget === e.target) {
      setIsDragOverFile(false)
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDragOverFile(false)
      const file = e.dataTransfer.files?.[0]
      if (file) onDropFile(file)
    },
    [onDropFile]
  )

  return (
    <div className="flex-1 flex flex-col bg-[#12151d] rounded-2xl border border-[#2b2d31] overflow-hidden">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#2b2d31] bg-[#18191c]/80 shrink-0">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow transition-all flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Importar Imagem / Spritesheet</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={onUploadImage}
            className="hidden"
          />

          {sourceImage && (
            <span className="text-[11px] font-mono text-slate-400">
              {sourceImage.width}x{sourceImage.height}px
            </span>
          )}
        </div>

        {/* Zoom & Grid Controls */}
        <div className="flex items-center gap-1.5 bg-[#12151d] p-1 rounded-xl border border-[#2b2d31]">
          <button
            type="button"
            onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
            className="p-1 rounded text-slate-300 hover:text-white hover:bg-[#2b2d31]"
            title="Reduzir Zoom"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[10px] font-mono font-bold text-slate-300 px-1">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoom(Math.min(4, zoom + 0.25))}
            className="p-1 rounded text-slate-300 hover:text-white hover:bg-[#2b2d31]"
            title="Aumentar Zoom"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoom(1)}
            className="p-1 rounded text-slate-300 hover:text-white hover:bg-[#2b2d31]"
            title="Restaurar 100%"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-3.5 bg-[#2b2d31] mx-0.5" />

          <button
            type="button"
            onClick={() => setSnapToGrid(!snapToGrid)}
            className={`p-1 rounded text-[10px] font-bold flex items-center gap-1 transition-colors ${
              snapToGrid ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
            title="Alinhar seleção na grade de 32x32 tiles"
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Grade 32px</span>
          </button>
        </div>
      </div>

      {/* Main Image Canvas Stage — always a drop target so the user can drop a
          file whether or not an image is already loaded. */}
      <div
        className="flex-1 overflow-auto flex items-center justify-center p-4 relative bg-[#0e1015]"
        onDragOver={handleDragOver}
        onDragEnter={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {sourceImageSrc ? (
          <div
            className={`relative border-2 rounded-lg shadow-2xl overflow-hidden bg-[#18191c] transition-colors ${
              isDragOverFile
                ? 'border-indigo-400 ring-2 ring-indigo-400/40'
                : 'border-[#2b2d31]'
            }`}
          >
            <canvas
              ref={mainCanvasRef}
              onMouseDown={onCanvasMouseDown}
              onMouseMove={onCanvasMouseMove}
              onMouseUp={onCanvasMouseUp}
              className={`pixelated ${isEyedropperActive ? 'cursor-crosshair' : 'cursor-default'} ${
                isDragOverFile ? 'opacity-60' : ''
              }`}
            />
            {isDragOverFile && (
              <div className="absolute inset-0 flex items-center justify-center bg-indigo-500/15 pointer-events-none">
                <div className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-lg">
                  Solte para substituir a imagem
                </div>
              </div>
            )}
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-3xl p-10 text-center cursor-pointer space-y-3 transition-colors ${
              isDragOverFile
                ? 'border-indigo-400 bg-indigo-500/10'
                : 'border-slate-700 hover:border-indigo-500 bg-[#18191c]/50'
            }`}
          >
            <div
              className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center transition-colors ${
                isDragOverFile
                  ? 'bg-indigo-500/30 border border-indigo-400 text-indigo-200'
                  : 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-400'
              }`}
            >
              <Upload className="w-7 h-7" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-200">
                {isDragOverFile
                  ? 'Solte a imagem aqui'
                  : 'Arraste uma imagem ou clique para selecionar'}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Suporta PNG, JPEG, Spritesheets de jogos, LPC assets e GIFs
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Selection Info & Action Bar */}
      {sourceImageSrc && (
        <div className="p-3 bg-[#18191c] border-t border-[#2b2d31] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 text-xs text-slate-300">
            <span className="flex items-center gap-1.5">
              <CheckSquare className="w-4 h-4 text-indigo-400" />
              <span>Seleção Atual:</span>
              <strong className="font-mono text-white">
                {selection.w}x{selection.h}px
              </strong>
            </span>
            <span className="text-slate-500">•</span>
            <span>
              Posição:{' '}
              <span className="font-mono text-slate-400">
                ({selection.x}, {selection.y})
              </span>
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCropAndSaveClip}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition-all active:scale-95"
            >
              <Scissors className="w-4 h-4" />
              <span>Recortar & Salvar</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
