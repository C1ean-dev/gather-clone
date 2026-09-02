import Peer, { MediaConnection } from 'peerjs'
import { Player } from '../types/game'
import { useGameStore } from '../store/useGameStore'
import { useMediaStore } from '../store/useMediaStore'

export class MediaCallHandler {
  /**
   * Check if local player and remote peer are in the same Private Zone and manage MediaCall
   */
  static checkZoneCallEligibility(
    remotePlayer: Player,
    peer: Peer | null,
    mediaCalls: Map<string, MediaConnection>,
    endMediaCallWithPeer: (peerId: string) => void
  ) {
    const localPlayer = useGameStore.getState().localPlayer
    const localStream = useMediaStore.getState().localStream

    const inSameZone =
      localPlayer.currentZoneId !== null &&
      localPlayer.currentZoneId !== undefined &&
      localPlayer.currentZoneId === remotePlayer.currentZoneId

    const existingCall = mediaCalls.get(remotePlayer.id)

    if (inSameZone) {
      if (!existingCall && peer && localStream) {
        console.log(`[Zone Call] Connecting audio/video with ${remotePlayer.name} in zone ${localPlayer.currentZoneId}`)
        const isSharing = useMediaStore.getState().isScreenSharing
        const screenStream = useMediaStore.getState().localScreenStream

        let streamToSend = localStream
        if (isSharing && screenStream && screenStream.getVideoTracks()[0]) {
          const combined = new MediaStream()
          localStream.getAudioTracks().forEach((t) => combined.addTrack(t))
          screenStream.getVideoTracks().forEach((t) => combined.addTrack(t))
          streamToSend = combined
        }

        const call = peer.call(remotePlayer.id, streamToSend)
        if (call) {
          // Configure receiver jitter buffer to eliminate stutter / frame dropping (up to 5.0s max)
          const applyBuffer = () => {
            const delayMs = useMediaStore.getState().liveBufferDelay || 3000
            const delaySec = Math.max(0.1, Math.min(5.0, delayMs / 1000))
            try {
              const pc = (call as any).peerConnection as RTCPeerConnection
              if (pc && pc.getReceivers) {
                pc.getReceivers().forEach((receiver) => {
                  try {
                    (receiver as any).playoutDelayHint = delaySec
                  } catch (e) {}
                  try {
                    if ('jitterBufferTarget' in receiver) {
                      (receiver as any).jitterBufferTarget = delayMs
                    }
                  } catch (e) {}
                })
              }
            } catch (e) {}
          }

          try {
            const pc = (call as any).peerConnection as RTCPeerConnection
            if (pc && pc.addEventListener) {
              pc.addEventListener('track', () => {
                setTimeout(applyBuffer, 50)
              })
            }
          } catch (e) {}

          call.on('stream', (remoteStream) => {
            applyBuffer()
            useMediaStore.getState().setPeerStream(remotePlayer.id, remoteStream)
          })
          call.on('close', () => {
            useMediaStore.getState().removePeerStream(remotePlayer.id)
          })
          call.on('error', () => {
            useMediaStore.getState().removePeerStream(remotePlayer.id)
          })
          mediaCalls.set(remotePlayer.id, call)
        }
      }
    } else {
      if (existingCall) {
        console.log(`[Zone Call] Leaving zone with ${remotePlayer.name}, terminating media call`)
        endMediaCallWithPeer(remotePlayer.id)
      }
    }
  }

  /**
   * Apply Jitter Buffer (playoutDelayHint & jitterBufferTarget) to all active peer connections (max 5.0s)
   * Smooths packet timing variance and prevents frozen / choppy live video
   */
  static applyJitterBuffer(mediaCalls: Map<string, MediaConnection>, bufferDelayMs: number = 3000) {
    const delaySec = Math.max(0.1, Math.min(5.0, bufferDelayMs / 1000))
    mediaCalls.forEach((call) => {
      try {
        const pc = (call as any).peerConnection as RTCPeerConnection
        if (pc && pc.getReceivers) {
          pc.getReceivers().forEach((receiver) => {
            try {
              (receiver as any).playoutDelayHint = delaySec
            } catch (e) {}
            try {
              if ('jitterBufferTarget' in receiver) {
                (receiver as any).jitterBufferTarget = bufferDelayMs
              }
            } catch (e) {}
          })
        }
      } catch (err) {
        console.warn('Error configuring receiver jitter buffer on call:', err)
      }
    })
  }

  /**
   * Replace active video track (Switching between Camera & Screen Share with High Bitrate)
   */
  static replaceVideoTrack(
    mediaCalls: Map<string, MediaConnection>,
    newTrack: MediaStreamTrack | null,
    isScreenShare: boolean = false,
    maxBitrate: number = 3_500_000,
    maxFramerate: number = 60
  ) {
    if (newTrack) {
      newTrack.enabled = true
      // 'motion' prioritizes fluid framerate delivery without stalling frames
      if (isScreenShare && 'contentHint' in newTrack) {
        newTrack.contentHint = 'motion'
      }
    }

    mediaCalls.forEach((call) => {
      try {
        const pc = (call as any).peerConnection as RTCPeerConnection
        if (pc) {
          const senders = pc.getSenders()
          let videoSender = senders.find((s) => s.track && s.track.kind === 'video')
          if (!videoSender) {
            videoSender = senders.find((s) => (s as any).kind === 'video' || (s as any).track?.kind === 'video')
          }
          if (!videoSender && pc.getTransceivers) {
            const videoTransceiver = pc.getTransceivers().find(
              (t) => (t.sender && t.sender.track?.kind === 'video') || (t.receiver && t.receiver.track?.kind === 'video')
            )
            if (videoTransceiver) {
              videoSender = videoTransceiver.sender
            }
          }

          if (videoSender) {
            videoSender
              .replaceTrack(newTrack)
              .then(() => {
                if (newTrack) {
                  try {
                    const params = videoSender.getParameters()
                    if (params && params.encodings && params.encodings.length > 0) {
                      params.encodings[0].maxBitrate = isScreenShare ? Math.min(maxBitrate, 3_500_000) : 1_800_000
                      params.encodings[0].maxFramerate = isScreenShare ? maxFramerate : 30
                      params.encodings[0].scaleResolutionDownBy = 1.0
                      ;(params.encodings[0] as any).networkPriority = 'high'
                      ;(params.encodings[0] as any).priority = 'high'
                      videoSender.setParameters(params).catch(() => {})
                    }
                  } catch (paramErr) {
                    // Ignore on unsupported browsers
                  }
                }
              })
              .catch((err) => console.warn('Could not replace video track on sender:', err))
          } else if (newTrack) {
            try {
              const localStream = useMediaStore.getState().localStream || new MediaStream()
              pc.addTrack(newTrack, localStream)
            } catch (addErr) {
              console.warn('Could not addTrack on PeerConnection:', addErr)
            }
          }
        }
      } catch (err) {
        console.warn('Error replacing video track:', err)
      }
    })
  }

  /**
   * Replace active audio track (When mixing system audio with microphone)
   */
  static replaceAudioTrack(mediaCalls: Map<string, MediaConnection>, newTrack: MediaStreamTrack | null) {
    mediaCalls.forEach((call) => {
      try {
        const pc = (call as any).peerConnection as RTCPeerConnection
        if (pc) {
          const senders = pc.getSenders()
          const audioSender = senders.find((s) => s.track && s.track.kind === 'audio')
          if (audioSender && newTrack) {
            audioSender.replaceTrack(newTrack).catch((err) => console.warn('Could not replace audio track:', err))
          }
        }
      } catch (err) {
        console.warn('Error replacing audio track:', err)
      }
    })
  }

  static endMediaCall(mediaCalls: Map<string, MediaConnection>, peerId: string) {
    const call = mediaCalls.get(peerId)
    if (call) {
      try {
        call.close()
      } catch (e) {}
      mediaCalls.delete(peerId)
    }
    useMediaStore.getState().removePeerStream(peerId)
  }

  static endAllMediaCalls(mediaCalls: Map<string, MediaConnection>) {
    mediaCalls.forEach((call, peerId) => {
      try {
        call.close()
      } catch (e) {}
      useMediaStore.getState().removePeerStream(peerId)
    })
    mediaCalls.clear()
    useMediaStore.getState().clearAllPeerStreams()
  }
}
