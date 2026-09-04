import React, { useEffect, useRef } from 'react'
import { Radio, MicOff, Maximize, Pin, Maximize2, Volume2, Volume1, VolumeX } from 'lucide-react'
import { useMediaStore } from '../../store/useMediaStore'

export interface ParticipantData {
  id: string
  name: string
  stream: MediaStream | null
  screenStream?: MediaStream | null
  isMuted?: boolean
  isCameraOff?: boolean
  isLocal?: boolean
  isScreenSharing?: boolean
  isSpeaking?: boolean
  shirtColor?: string
  statusEmoji?: string
}

interface Props {
  user: ParticipantData
  isFocused?: boolean
  isSidebar?: boolean
  onFocus?: () => void
  onOpenLiveFullscreen?: (user: ParticipantData) => void
}

export const GridParticipantTile: React.FC<Props> = ({
  user,
  isFocused = false,
  isSidebar = false,
  onFocus,
  onOpenLiveFullscreen,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const isLive = Boolean(user.screenStream || user.isScreenSharing)
  const activeStream = user.screenStream || user.stream

  // Granular selectors: the media store updates on every VU-meter tick and
  // every peer-stream change — subscribing whole-store would re-render every
  // tile on each tick. Select only the volume/output slices this tile needs.
  const participantVolumes = useMediaStore((s) => s.participantVolumes)
  const setParticipantVolume = useMediaStore((s) => s.setParticipantVolume)
  const liveStreamVolume = useMediaStore((s) => s.liveStreamVolume)
  const setLiveStreamVolume = useMediaStore((s) => s.setLiveStreamVolume)
  const outputVolume = useMediaStore((s) => s.outputVolume)
  const selectedAudioOutput = useMediaStore((s) => s.selectedAudioOutput)

  const rawVolume =
    participantVolumes[user.id] !== undefined
      ? participantVolumes[user.id]
      : user.name && participantVolumes[user.name] !== undefined
      ? participantVolumes[user.name]
      : isLive && liveStreamVolume !== undefined
      ? liveStreamVolume
      : 100

  // Apply viewer's volume preference & audio output sink
  useEffect(() => {
    if (videoRef.current && !user.isLocal) {
      const effectiveVol = Math.max(0, Math.min(1, (outputVolume / 100) * (rawVolume / 100)))
      videoRef.current.volume = effectiveVol
      if (typeof (videoRef.current as any).setSinkId === 'function' && selectedAudioOutput) {
        ;(videoRef.current as any)
          .setSinkId(selectedAudioOutput === 'default' ? '' : selectedAudioOutput)
          .catch(() => {})
      }
    }
  }, [rawVolume, outputVolume, selectedAudioOutput, user.isLocal])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !activeStream) return

    // Imperative muted (NOT just the muted={} JSX prop): React sets the
    // `muted` *attribute* but Chromium reads the IDL *property* — without
    // this line the local preview is NOT muted and the user hears their own
    // DSP-processed voice ~30-80ms late ("delay"/echo na chamada).
    video.muted = !!user.isLocal
    video.srcObject = activeStream
    const playPromise = video.play()
    if (playPromise !== undefined) {
      playPromise.catch(() => {})
    }

    const handleTrackEvent = () => {
      if (video.srcObject !== activeStream) {
        video.srcObject = activeStream
      }
      video.play().catch(() => {})
    }

    activeStream.addEventListener('addtrack', handleTrackEvent)
    activeStream.addEventListener('removetrack', handleTrackEvent)

    const tracks = activeStream.getVideoTracks()
    tracks.forEach((t) => {
      t.addEventListener('unmute', handleTrackEvent)
    })

    return () => {
      activeStream.removeEventListener('addtrack', handleTrackEvent)
      activeStream.removeEventListener('removetrack', handleTrackEvent)
      tracks.forEach((t) => {
        t.removeEventListener('unmute', handleTrackEvent)
      })
    }
  }, [activeStream, isLive, user.isLocal])

  const handleFullscreenClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onOpenLiveFullscreen) {
      onOpenLiveFullscreen(user)
    }
  }

  // Compact Sidebar Thumbnail
  if (isSidebar) {
    return (
      <div
        onClick={onFocus}
        className={`group relative w-full aspect-video bg-[#12151d] rounded-2xl overflow-hidden border-2 transition-all flex items-center justify-center cursor-pointer shadow-md shrink-0 select-none ${
          user.isSpeaking
            ? 'border-emerald-500 ring-2 ring-emerald-500/30'
            : isFocused
            ? 'border-indigo-500 ring-2 ring-indigo-500/40'
            : 'border-[#2a3142] hover:border-slate-500'
        }`}
      >
        {isLive ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={user.isLocal}
            onLoadedMetadata={() => videoRef.current?.play().catch(() => {})}
            onCanPlay={() => videoRef.current?.play().catch(() => {})}
            className="w-full h-full object-cover bg-black"
          />
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted={user.isLocal}
              onLoadedMetadata={() => videoRef.current?.play().catch(() => {})}
              onCanPlay={() => videoRef.current?.play().catch(() => {})}
              className={`w-full h-full object-cover ${user.isCameraOff ? 'hidden' : 'block'} ${
                user.isLocal ? '-scale-x-100' : ''
              }`}
            />
            {user.isCameraOff && (
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-md border border-white/20"
                style={{ backgroundColor: user.shirtColor || '#4c6ef5' }}
              >
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
          </>
        )}

        {/* Live Badge if sharing in sidebar */}
        {isLive && (
          <div className="absolute top-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 bg-rose-600 text-white rounded-md text-[8px] font-bold shadow animate-pulse">
            <Radio className="w-2.5 h-2.5" />
            <span>AO VIVO</span>
          </div>
        )}

        {/* Small Bottom Name Tag */}
        <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between px-2 py-0.5 bg-black/70 backdrop-blur-md rounded-lg text-[10px] text-white">
          <span className="truncate font-semibold">
            {isLive ? `Tela (${user.name})` : user.isLocal ? `${user.name} (Você)` : user.name}
          </span>
          <div className="flex items-center gap-1 shrink-0">
            {!user.isLocal && rawVolume === 0 && (
              <span title="Você mutou este áudio" className="flex items-center">
                <VolumeX className="w-2.5 h-2.5 text-rose-400" />
              </span>
            )}
            {user.isMuted && !isLive && <MicOff className="w-2.5 h-2.5 text-rose-400 shrink-0" />}
          </div>
        </div>
      </div>
    )
  }

  // Large Main / Grid Tile
  return (
    <div
      onClick={onFocus}
      onDoubleClick={handleFullscreenClick}
      className={`group relative w-full h-full bg-[#12151d] rounded-3xl overflow-hidden border-2 transition-all flex items-center justify-center shadow-2xl cursor-pointer select-none ${
        user.isSpeaking
          ? 'border-emerald-500 shadow-emerald-500/20 shadow-lg ring-2 ring-emerald-500/30'
          : isFocused
          ? 'border-indigo-500 ring-2 ring-indigo-500/30'
          : 'border-[#2a3142] hover:border-slate-500'
      }`}
    >
      {/* Screen Share or Video Content */}
      {isLive ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={user.isLocal}
          onLoadedMetadata={() => videoRef.current?.play().catch(() => {})}
          onCanPlay={() => videoRef.current?.play().catch(() => {})}
          className="w-full h-full object-contain bg-black"
        />
      ) : (
        <>
          {/* Main Camera Video */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={user.isLocal}
            onLoadedMetadata={() => videoRef.current?.play().catch(() => {})}
            onCanPlay={() => videoRef.current?.play().catch(() => {})}
            className={`w-full h-full object-cover ${user.isCameraOff ? 'hidden' : 'block'} ${
              user.isLocal ? '-scale-x-100' : ''
            }`}
          />

          {/* Camera Off Avatar Screen */}
          {user.isCameraOff && (
            <div className="flex flex-col items-center gap-3">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-extrabold text-white shadow-2xl border-2 border-white/20"
                style={{ backgroundColor: user.shirtColor || '#4c6ef5' }}
              >
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="text-sm font-semibold text-slate-300 flex items-center gap-1.5">
                <span>{user.name}</span>
                {user.statusEmoji && <span>{user.statusEmoji}</span>}
              </div>
            </div>
          )}
        </>
      )}

      {/* Top Badges: LIVE indicator + Action Buttons */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
        {isLive ? (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-rose-600/95 text-white rounded-xl text-xs font-bold shadow-lg flex-shrink-0 animate-pulse pointer-events-auto">
            <Radio className="w-3.5 h-3.5" />
            <span>TRANSMISSÃO AO VIVO DE TELA</span>
          </div>
        ) : (
          <div />
        )}

        {/* Action buttons on hover */}
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto">
          {/* Viewer Volume Control for Remote User */}
          {!user.isLocal && (
            <div
              className="relative group/vol flex items-center bg-black/80 hover:bg-black/95 rounded-xl border border-white/15 px-2 py-1.5 backdrop-blur-md shadow-md gap-1.5"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  const nextVol = rawVolume === 0 ? 100 : 0
                  setParticipantVolume(user.id, nextVol)
                  if (user.name) setParticipantVolume(user.name, nextVol)
                  if (isLive) setLiveStreamVolume(nextVol)
                }}
                className="p-0.5 rounded text-slate-300 hover:text-white transition-colors"
                title={rawVolume === 0 ? 'Desmutar este participante' : 'Mutar este participante'}
              >
                {rawVolume === 0 ? (
                  <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                ) : rawVolume < 50 ? (
                  <Volume1 className="w-3.5 h-3.5 text-indigo-400" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                )}
              </button>

              {/* Slider expands smoothly on hover */}
              <div className="w-0 group-hover/vol:w-28 transition-all duration-200 overflow-hidden flex items-center gap-1.5">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={rawVolume}
                  onChange={(e) => {
                    const val = Number(e.target.value)
                    setParticipantVolume(user.id, val)
                    if (user.name) setParticipantVolume(user.name, val)
                    if (isLive) setLiveStreamVolume(val)
                  }}
                  className="w-16 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400"
                  title={`Volume: ${rawVolume}%`}
                />
                <span className="text-[10px] font-mono text-slate-200 min-w-[28px]">
                  {rawVolume}%
                </span>
              </div>
            </div>
          )}

          <button
            onClick={handleFullscreenClick}
            className="px-3 py-1.5 rounded-xl bg-black/80 hover:bg-indigo-600 text-white backdrop-blur-md transition-all shadow-md flex items-center gap-1.5 text-xs font-bold"
            title="Expandir Live em Tela Cheia do Monitor"
          >
            <Maximize className="w-4 h-4" />
            <span>Tela Cheia</span>
          </button>

          {onFocus && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onFocus()
              }}
              className={`p-2 rounded-xl backdrop-blur-md transition-colors shadow-md ${
                isFocused ? 'bg-indigo-600 text-white' : 'bg-black/80 hover:bg-slate-700 text-white'
              }`}
              title={isFocused ? 'Desafixar' : 'Fixar / Destacar'}
            >
              <Pin className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Bottom Name Pill */}
      <div className="absolute bottom-3 left-3 pointer-events-none z-10">
        <div className="bg-black/80 backdrop-blur-md px-3.5 py-1.5 rounded-xl flex items-center gap-2 border border-white/10 text-xs font-semibold text-white pointer-events-auto">
          <span>{isLive ? `Tela de ${user.name}` : user.isLocal ? `${user.name} (Você)` : user.name}</span>
          {!user.isLocal && rawVolume === 0 && (
            <span className="flex items-center gap-1 text-[10px] text-rose-400 bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-800/40">
              <VolumeX className="w-3 h-3" />
              <span>Mutado para você</span>
            </span>
          )}
          {user.isMuted && !isLive && <MicOff className="w-3.5 h-3.5 text-rose-400" />}
        </div>
      </div>
    </div>
  )
}
