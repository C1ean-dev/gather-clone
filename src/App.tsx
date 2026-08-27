import React, { useState, useEffect } from 'react'
import { TopNavBar } from './components/TopNavBar'
import { MapViewport } from './components/MapViewport'
import { AssetPalette } from './editor/AssetPalette'
import { MiniCallOverlay } from './components/MiniCallOverlay'
import { FullScreenGrid } from './components/FullScreenGrid'
import { ChatDrawer } from './components/ChatDrawer'
import { AvatarCustomizerModal } from './components/AvatarCustomizerModal'
import { LobbyModal } from './components/LobbyModal'
import { AudioSettingsModal } from './components/AudioSettingsModal'
import { useGameStore } from './store/useGameStore'
import { useMediaStore } from './store/useMediaStore'
import { useChatStore } from './store/useChatStore'
import { useMapStore } from './store/useMapStore'

export const App: React.FC = () => {
  const [inLobby, setInLobby] = useState(true)
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false)

  const { isConnected } = useGameStore()
  const { toggleMute, toggleCamera } = useMediaStore()
  const { toggleChat } = useChatStore()
  const { toggleEditor } = useMapStore()

  // Global Keyboard Shortcuts (M for Mic, V for Video, C for Chat)
  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return
      }

      if (e.key.toLowerCase() === 'm') {
        toggleMute()
      } else if (e.key.toLowerCase() === 'v') {
        toggleCamera()
      } else if (e.key.toLowerCase() === 'c') {
        toggleChat()
      } else if (e.key.toLowerCase() === 'e') {
        toggleEditor()
      }
    }

    window.addEventListener('keydown', handleGlobalShortcuts)
    return () => window.removeEventListener('keydown', handleGlobalShortcuts)
  }, [toggleMute, toggleCamera, toggleChat, toggleEditor])

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0c0e14] text-slate-100 overflow-hidden font-sans select-none">
      {/* Top Bar */}
      <TopNavBar onOpenAvatarModal={() => setIsAvatarModalOpen(true)} />

      {/* Main 2D Virtual Space */}
      <main className="relative flex-1 w-full overflow-hidden flex">
        <MapViewport />
        <AssetPalette />
        <ChatDrawer />
        <MiniCallOverlay />
      </main>

      {/* Full-Screen Conference Grid (Gather V2 Grid View) */}
      <FullScreenGrid />

      {/* Audio & Video Settings Modal */}
      <AudioSettingsModal />

      {/* Avatar Customizer Modal */}
      <AvatarCustomizerModal
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
      />

      {/* Start Lobby Screen */}
      {inLobby && (
        <LobbyModal
          onJoined={() => setInLobby(false)}
          onOpenAvatarCustomizer={() => setIsAvatarModalOpen(true)}
        />
      )}
    </div>
  )
}
export default App
