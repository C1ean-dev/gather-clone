import Peer, { MediaConnection } from 'peerjs'
import { Player } from '../types/game'
import { useGameStore } from '../store/useGameStore'
import { useMediaStore } from '../store/useMediaStore'
import { prioritizeH264HardwareCodec } from '../media/hardwareCodec'
import { DynamicBufferManager } from '../services/DynamicBufferManager'
import { diagLog, summarizeStream } from '../utils/diagnosticLogger'

/**
 * ICE candidate pool — pre-gathered candidates before the call is established.
 * This collapses ~500ms-2s of ICE gathering latency that otherwise happens
 * WHILE the first audio/video packets are being encoded, producing the
 * "robotic / 2-3s behind" voice the user reports.
 */
const ICE_POOL_SIZE = 4

/**
 * Max time we'll wait for ICE to reach 'connected' before giving up and
 * attaching tracks anyway. Anything past this is worse than the delay we'd
 * save by waiting. 1200ms covers the p95 of direct (host/srflx) NAT
 * binding on broadband; slower than that almost always means relay or
 * failure, where waiting longer doesn't help voice latency.
 */
export const ICE_CONNECT_TIMEOUT_MS = 1200

export type CallDirection = 'in' | 'out'

/**
 * Deterministic glare resolution for the zone-call mesh.
 *
 * Both peers dial each other on zone entry, so every pair briefly holds TWO
 * connections (A→B and B→A). Two live connections mean double uplink, two
 * remote streams per peer, and a srcObject swap that aborts the tile's
 * pending play() (AbortError → black tile + silence). Both sides run this
 * rule and converge on ONE call: the smaller peer id's OUTGOING call wins.
 */
export function resolveCallGlare(
  myId: string,
  remoteId: string,
  existingDir: CallDirection | undefined
): 'drop-incoming' | 'replace-with-incoming' {
  if (!existingDir) return 'replace-with-incoming'
  if (existingDir === 'out') {
    return myId < remoteId ? 'drop-incoming' : 'replace-with-incoming'
  }
  // Stale incoming from a previous round — always take the fresh one.
  return 'replace-with-incoming'
}

const shortTrackId = (id: string | undefined): string | null => {
  if (!id) return null
  return id.length <= 10 ? id : `${id.slice(0, 6)}…${id.slice(-4)}`
}

/**
 * Shared WebRTC transport config for every PeerJS instance and every
 * post-creation setConfiguration call.
 *
 * STUN-only was the previous setup: behind a symmetric NAT or a corporate
 * firewall, srflx candidates never pair, ICE spins for 10-20s and the user
 * perceives it as "call delay" (or an eternal "connecting…" badge). The
 * metered openrelay TURN is LAST in the list, so it costs nothing on direct
 * paths — ICE tries host → srflx → relay in order and only pays relay
 * latency (+20-60ms) when direct would have been silence.
 */
export const SHARED_RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' },
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
  iceTransportPolicy: 'all',
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require',
  iceCandidatePoolSize: ICE_POOL_SIZE,
}

export class MediaCallHandler {
  /**
   * Voice receivers must stay conversational: cap their playout delay at
   * 200ms no matter how large the (video-oriented) adaptive buffer grows.
   * A 2–3s delay on audio makes people talk over each other ("call lag").
   *
   * Video receivers are capped at 500ms (was 5s) — the previous 3s default
   * added 3 full seconds of end-to-end latency to every conversation that
   * had a video stream attached.
   */
  /**
   * Voice receivers must stay conversational. The adaptive engine caps audio
   * at 500ms on truly bad networks (jitter > ~150ms sustained); on clean
   * networks it sits at 1ms. Both numbers below mirror the adaptive audio
   * ceiling in DynamicBufferManager — they must stay in sync or the two
   * layers fight (one grows what the other clamps).
   */
  public static readonly VOICE_MAX_PLAYOUT_DELAY_SEC = 0.5
  public static readonly VOICE_MAX_JITTER_BUFFER_MS = 500
  public static readonly VIDEO_MAX_PLAYOUT_DELAY_SEC = 1.5
  public static readonly VIDEO_MAX_JITTER_BUFFER_MS = 1500
  /**
   * Default used by Phase 2 if no DynamicBufferManager evaluation has run yet.
   * Starts at 1ms — the adaptive engine grows this within ~1.5s if the
   * network actually needs more headroom. The previous 100ms default was
   * still adding latency on every fresh call.
   */
  public static readonly DEFAULT_LIVE_BUFFER_MS = 1

  /**
   * Apply playout delay to every receiver of a PeerConnection. Audio and
   * video are clamped INDEPENDENTLY to their own ceilings so the (slow)
   * video jitter buffer can never accidentally delay the (fast) audio path.
   *
   * Each kind has its own FLOOR of 1ms (playoutDelayHint in seconds = 0.001)
   * so the DynamicBufferManager can start from zero and grow organically.
   *
   * DynamicBufferManager computes audio + video numbers independently and
   * calls this with both numbers.
   */
  static applyReceiverBuffer(
    pc: RTCPeerConnection,
    videoDelayMs: number,
    audioDelayMs?: number
  ) {
    // When the caller doesn't pass an explicit audio value, use the
    // adaptive engine's CURRENT audio buffer instead of a hard-coded
    // default — a fixed 200ms here used to add 200ms of voice latency on
    // every call even when the network was clean enough for 1ms.
    let safeAudioMs = audioDelayMs
    if (safeAudioMs === undefined) {
      try {
        safeAudioMs = DynamicBufferManager.getInstance().getBuffers().audio.currentMs
      } catch {
        safeAudioMs = Math.min(videoDelayMs, MediaCallHandler.VOICE_MAX_JITTER_BUFFER_MS)
      }
    }
    const safeVideoMs = Math.min(videoDelayMs, MediaCallHandler.VIDEO_MAX_JITTER_BUFFER_MS)
    // 1ms floor — let the browser decide what's optimal below this.
    const audioDelaySec = Math.max(0.001, Math.min(MediaCallHandler.VOICE_MAX_PLAYOUT_DELAY_SEC, safeAudioMs / 1000))
    const videoDelaySec = Math.max(0.001, Math.min(MediaCallHandler.VIDEO_MAX_PLAYOUT_DELAY_SEC, safeVideoMs / 1000))
    try {
      if (pc && pc.getReceivers) {
        pc.getReceivers().forEach((receiver) => {
          const isAudio = (receiver as any).track?.kind === 'audio'
          const delaySec = isAudio ? audioDelaySec : videoDelaySec
          const jitterMs = isAudio ? safeAudioMs : safeVideoMs
          try {
            ;(receiver as any).playoutDelayHint = delaySec
          } catch (e) {}
          try {
            if ('jitterBufferTarget' in receiver) {
              ;(receiver as any).jitterBufferTarget = jitterMs
            }
          } catch (e) {}
        })
      }
    } catch (e) {}
  }

  /**
   * Build the stream we will SEND once the call is established.
   * Extracted so the two-phase connect (negotiate first, attach tracks second)
   * can call it after ICE is ready.
   */
  private static buildOutboundStream(): MediaStream {
    const isSharing = useMediaStore.getState().isScreenSharing
    const screenStream = useMediaStore.getState().localScreenStream
    const localStream = useMediaStore.getState().localStream

    if (isSharing && screenStream && screenStream.getVideoTracks()[0]) {
      const combined = new MediaStream()
      if (localStream) {
        localStream.getAudioTracks().forEach((t) => combined.addTrack(t))
      }
      screenStream.getVideoTracks().forEach((t) => combined.addTrack(t))
      return combined
    }
    return localStream || new MediaStream()
  }

  /**
   * Bound the outbound video encoder WITHOUT touching track assignment.
   *
   * Why no addTrack/replaceTrack/addTransceiver here: PeerJS v1 never listens
   * to `negotiationneeded` after the initial offer/answer, so any track
   * change made directly on the RTCPeerConnection is never signaled — the
   * remote side keeps seeing BLACK video (this exact bug shipped once as a
   * "two-phase connect"). All track assignment MUST go through
   * peer.call()/call.answer()/replaceVideoTrack() (replaceTrack on an
   * existing sender needs no renegotiation and is safe).
   *
   * Without maxBitrate the browser default can spike to 2.5Mbps+ per peer,
   * and in a mesh that saturates a home uplink → bufferbloat → delay for
   * EVERYONE. degradationPreference 'maintain-framerate' tells the
   * congestion controller to shed pixels (resolution) instead of time
   * (latency) — the call gets blurrier under load, never laggier.
   */
  static applyEncoderCaps(pc: RTCPeerConnection, maxBitrate: number = 1_200_000, maxFramerate: number = 30) {
    if (!pc || typeof pc.getSenders !== 'function') return
    try {
      pc.getSenders().forEach((sender) => {
        if (!sender.track || sender.track.kind !== 'video') return
        try {
          const params = sender.getParameters()
          if (params && params.encodings && params.encodings.length > 0) {
            params.encodings[0].maxBitrate = maxBitrate
            params.encodings[0].maxFramerate = maxFramerate
            params.encodings[0].scaleResolutionDownBy = 1.0
            ;(params.encodings[0] as any).networkPriority = 'high'
            ;(params.encodings[0] as any).priority = 'high'
            ;(params as any).degradationPreference = 'maintain-framerate'
            sender.setParameters(params).catch(() => {})
          }
        } catch (e) {}
      })
    } catch (e) {}

    try {
      prioritizeH264HardwareCodec(pc)
    } catch (e) {}
  }

  /**
   * Snapshot of what each PeerConnection is actually SENDING: sender track
   * state plus outbound-rtp counters (bytesSent/framesSent). This is what
   * proves whether a black tile is a SENDER problem (bytesSent flat while
   * the local track looks live) or a receiver/tile problem (bytesSent
   * growing). Transitions only — never per-frame.
   */
  static logSenderSnapshot(mediaCalls: Map<string, MediaConnection>, reason: string) {
    mediaCalls.forEach((call, peerId) => {
      try {
        const pc = (call as unknown as { peerConnection?: RTCPeerConnection }).peerConnection
        if (!pc || typeof pc.getSenders !== 'function') return
        let senders: unknown[] = []
        try {
          senders = pc.getSenders().map((s) => ({
            kind: s.track?.kind ?? null,
            enabled: s.track ? !!s.track.enabled : null,
            ready: s.track ? s.track.readyState : null,
            id: shortTrackId(s.track?.id),
          }))
        } catch {
          // Unreadable connection — nothing trustworthy to report.
          return
        }
        // Transport + direction: the decisive datum for "senders live but
        // bytesSent flat". currentDirection=recvonly => negotiated away our
        // send path; sendrecv+connected+flat => encoders/sources starved.
        let transport: unknown = null
        try {
          const tpc = pc as RTCPeerConnection
          transport = {
            ice: (tpc as any).iceConnectionState ?? null,
            conn: (tpc as any).connectionState ?? null,
            sig: (tpc as any).signalingState ?? null,
            transceivers:
              typeof tpc.getTransceivers === 'function'
                ? tpc.getTransceivers().map((t: any) => ({
                    kind: t.receiver?.track?.kind ?? t.sender?.track?.kind ?? t.kind ?? null,
                    dir: t.direction ?? null,
                    cur: t.currentDirection ?? null,
                  }))
                : null,
          }
        } catch {}
        diagLog('p2p', 'sender-state', { toPeer: peerId, reason, senders, transport })
        try {
          pc.getStats().then(
            (stats) => {
              const outbound: Record<string, unknown> = {}
              try {
                stats.forEach((r: any) => {
                  if (r && r.type === 'outbound-rtp' && !r.isRemote && (r.kind === 'audio' || r.kind === 'video')) {
                    outbound[r.kind] = {
                      bytesSent: r.bytesSent ?? null,
                      packetsSent: r.packetsSent ?? null,
                      framesSent: r.framesSent ?? null,
                    }
                  }
                })
              } catch {}
              diagLog('p2p', 'sender-stats', { toPeer: peerId, reason, outbound })
            },
            () => {}
          )
        } catch {}
      } catch {}
    })
  }

  /**
   * Watch inbound tracks of a call: logs per-track arrival and every
   * mute/unmute/ended transition. This is what shows "live preta" causes on
   * the RECEIVER side — replaceTrack on the sender never fires a new
   * 'stream' event, so without this the receiver log goes silent exactly
   * when the picture should appear.
   */
  static watchRemoteTracks(pc: RTCPeerConnection | null | undefined, peerId: string, side: 'in' | 'out') {
    if (!pc || typeof pc.addEventListener !== 'function') return
    try {
      pc.addEventListener('track', (evt) => {
        try {
          const track = (evt as RTCTrackEvent).track as MediaStreamTrack | undefined
          if (!track || (track as any).__diagWatched) return
          ;(track as any).__diagWatched = true
          diagLog('p2p', 'call.remote-track', {
            fromPeer: peerId,
            side,
            kind: track.kind,
            muted: track.muted,
            ready: track.readyState,
            id: shortTrackId(track.id),
          })
          const onState = () => {
            try {
              diagLog('p2p', 'call.remote-track-state', {
                fromPeer: peerId,
                side,
                kind: track.kind,
                muted: track.muted,
                ready: track.readyState,
                id: shortTrackId(track.id),
              })
            } catch {}
          }
          track.addEventListener('mute', onState)
          track.addEventListener('unmute', onState)
          track.addEventListener('ended', onState)
        } catch {}
      })
    } catch {}
  }

  /**
   * Check if local player and remote peer are in the same Private Zone and manage MediaCall.
   *
   * The call is dialed WITH the real audio/video stream in a single PeerJS
   * negotiation (peer.call → offer → answer). A previous "two-phase"
   * attempt dialed with an EMPTY stream and attached tracks later via
   * pc.addTransceiver — but PeerJS never handles `negotiationneeded` after
   * the initial handshake, so the re-offer was never signaled and the
   * remote side saw BLACK video. Never bypass PeerJS signaling again.
   *
   * Low delay still holds because every other layer starts minimal:
   * adaptive jitter buffers seed at 1ms/1ms, ICE candidates are pre-gathered
   * (iceCandidatePoolSize), TURN exists as fallback, and encoder bitrate is
   * capped so the uplink never bloats.
   *
   * While the handshake runs, the remote player's `callState` is
   * 'connecting' so the UI shows a "connecting…" badge; it flips to
   * 'connected' on ICE-connected or first remote track, and to 'failed' if
   * ICE definitively fails.
   */
  static checkZoneCallEligibility(
    remotePlayer: Player,
    peer: Peer | null,
    mediaCalls: Map<string, MediaConnection>,
    endMediaCallWithPeer: (peerId: string) => void,
    onCallConnected?: (peerId: string) => void
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
        console.log(`[Zone Call] Dialing ${remotePlayer.name} in zone ${localPlayer.currentZoneId}`)

        useGameStore.getState().setCallState(remotePlayer.id, 'connecting')

        // Dial WITH the real stream — single negotiation, fully PeerJS-driven.
        const streamToSend = MediaCallHandler.buildOutboundStream()
        diagLog('p2p', 'call.dial', {
          toPeer: remotePlayer.id,
          toName: remotePlayer.name,
          zone: localPlayer.currentZoneId,
          tracks: summarizeStream(streamToSend),
        })
        const call = peer.call(remotePlayer.id, streamToSend)
        if (!call) {
          useGameStore.getState().setCallState(remotePlayer.id, 'failed')
          diagLog('p2p', 'call.dial-nocall', { toPeer: remotePlayer.id })
          return
        }
        // Role tag for glare resolution (see resolveCallGlare).
        ;(call as unknown as { __dir?: CallDirection }).__dir = 'out'

        const pc = (call as any).peerConnection as RTCPeerConnection
        if (pc) {
          try {
            prioritizeH264HardwareCodec(pc)
            if (pc.addEventListener) {
              pc.addEventListener('negotiationneeded', () => {
                prioritizeH264HardwareCodec(pc)
              })
            }
          } catch (e) {}

          try {
            if (typeof (pc as any).setConfiguration === 'function') {
              ;(pc as any).setConfiguration(SHARED_RTC_CONFIG)
            }
          } catch (e) {}
          // Inbound track arrival + mute/unmute transitions (receiver-side
          // visibility for "why is the tile black" — 'stream' alone is not
          // enough since replaceTrack never re-fires it).
          MediaCallHandler.watchRemoteTracks(pc, remotePlayer.id, 'out')
        }

        // Seed from the adaptive engine (just reset to 1ms/1ms below), NOT
        // from the stale store value — liveBufferDelay may still hold a high
        // number from a previous bad network, which would front-load this
        // brand-new call with latency it doesn't need.
        const applyBuffer = () => {
          const bufs = DynamicBufferManager.getInstance().getBuffers()
          MediaCallHandler.applyReceiverBuffer(pc, bufs.video.currentMs, bufs.audio.currentMs)
        }

        try {
          if (pc && pc.addEventListener) {
            pc.addEventListener('track', () => {
              setTimeout(applyBuffer, 50)
            })
          }
        } catch (e) {}

        // Seed adaptive buffer state for this brand-new connection so it
        // starts at the floor (1ms audio, 1ms video) and only grows if
        // the network actually shows jitter / loss.
        DynamicBufferManager.getInstance().resetForNewCall()

        let settled = false
        let iceTimeout: any = null
        const markConnected = (reason: string) => {
          if (settled) return
          settled = true
          if (iceTimeout) {
            clearTimeout(iceTimeout)
            iceTimeout = null
          }
          console.log(`[Zone Call] Connected with ${remotePlayer.name} (${reason})`)
          diagLog('p2p', 'call.outgoing-connected', { withPeer: remotePlayer.id, reason })
          // Prove the sender side is actually transmitting (bytesSent).
          MediaCallHandler.logSenderSnapshot(mediaCalls, 'outgoing-connected')
          if (pc) MediaCallHandler.applyEncoderCaps(pc)
          applyBuffer()
          useGameStore.getState().setCallState(remotePlayer.id, 'connected')
          onCallConnected?.(remotePlayer.id)
        }
        const markFailed = (reason: string) => {
          if (settled) return
          settled = true
          if (iceTimeout) {
            clearTimeout(iceTimeout)
            iceTimeout = null
          }
          console.warn(`[Zone Call] Failed with ${remotePlayer.name} (${reason})`)
          diagLog('p2p', 'call.outgoing-failed', {
            withPeer: remotePlayer.id,
            reason,
            iceState: (pc as RTCPeerConnection | null)?.iceConnectionState,
          })
          useGameStore.getState().setCallState(remotePlayer.id, 'failed')
        }

        if (pc && pc.addEventListener) {
          pc.addEventListener('iceconnectionstatechange', () => {
            const s = pc.iceConnectionState
            if (s === 'connected' || s === 'completed') {
              markConnected('ice=' + s)
            } else if (s === 'failed') {
              markFailed('ice=failed')
            }
          })
          pc.addEventListener('connectionstatechange', () => {
            const s = pc.connectionState
            if (s === 'connected') {
              markConnected('pc=connected')
            } else if (s === 'failed') {
              markFailed('pc=failed')
            }
          })
        }

        // Safety net for the race where ICE connected BEFORE our listeners
        // were attached (practically impossible, but free to check): only
        // settle when the transport is provably up — never fake 'connected'.
        iceTimeout = setTimeout(() => {
          try {
            const s = pc?.iceConnectionState
            if (s === 'connected' || s === 'completed') markConnected('late-ice=' + s)
          } catch (e) {}
        }, ICE_CONNECT_TIMEOUT_MS)

        call.on('stream', (remoteStream) => {
          // A losing glare duplicate can still fire after being replaced:
          // only the map's current call may drive the tile and the state.
          if (mediaCalls.get(remotePlayer.id) !== call) {
            diagLog('p2p', 'call.remote-stream-stale', { fromPeer: remotePlayer.id })
            return
          }
          // First remote track = media provably flowing end-to-end.
          markConnected('remote-stream')
          applyBuffer()
          diagLog('p2p', 'call.remote-stream', {
            fromPeer: remotePlayer.id,
            tracks: summarizeStream(remoteStream),
          })
          useMediaStore.getState().setPeerStream(remotePlayer.id, remoteStream)
        })
        call.on('close', () => {
          if (iceTimeout) clearTimeout(iceTimeout)
          diagLog('p2p', 'call.closed', {
            withPeer: remotePlayer.id,
            current: mediaCalls.get(remotePlayer.id) === call,
          })
          if (mediaCalls.get(remotePlayer.id) === call) {
            useGameStore.getState().setCallState(remotePlayer.id, 'idle')
            useMediaStore.getState().removePeerStream(remotePlayer.id)
          }
        })
        call.on('error', () => {
          if (iceTimeout) clearTimeout(iceTimeout)
          diagLog('p2p', 'call.error', {
            withPeer: remotePlayer.id,
            current: mediaCalls.get(remotePlayer.id) === call,
          })
          if (mediaCalls.get(remotePlayer.id) === call) {
            useGameStore.getState().setCallState(remotePlayer.id, 'failed')
            useMediaStore.getState().removePeerStream(remotePlayer.id)
          }
        })
        mediaCalls.set(remotePlayer.id, call)
      } else if (!existingCall) {
        // Same zone, should be calling, but can't: no peer yet or no local
        // media. This silent skip is a classic "nobody hears nobody" cause.
        diagLog('p2p', 'call.dial-skipped', {
          withPeer: remotePlayer.id,
          hasPeer: !!peer,
          hasLocalStream: !!localStream,
          localTracks: summarizeStream(localStream),
        })
      }
    } else {
      if (existingCall) {
        console.log(`[Zone Call] Leaving zone with ${remotePlayer.name}, terminating media call`)
        diagLog('p2p', 'call.terminated-left-zone', { withPeer: remotePlayer.id })
        useGameStore.getState().setCallState(remotePlayer.id, 'idle')
        endMediaCallWithPeer(remotePlayer.id)
      }
    }
  }

  /**
   * Apply Jitter Buffer to all active peer connections. `videoDelayMs` and
   * `audioDelayMs` are passed through `applyReceiverBuffer` which clamps
   * each to its own ceiling (video 1500ms, audio 500ms). If `audioDelayMs`
   * is omitted, the adaptive engine's current audio value is used.
   */
  static applyJitterBuffer(
    mediaCalls: Map<string, MediaConnection>,
    videoDelayMs: number = MediaCallHandler.DEFAULT_LIVE_BUFFER_MS,
    audioDelayMs?: number
  ) {
    mediaCalls.forEach((call) => {
      try {
        const pc = (call as any).peerConnection as RTCPeerConnection
        if (pc) MediaCallHandler.applyReceiverBuffer(pc, videoDelayMs, audioDelayMs)
      } catch (err) {
        console.warn('Error configuring receiver jitter buffer on call:', err)
      }
    })
  }

  /**
   * Replace active video track (Switching between Camera & Screen Share).
   *
   * Bitrate policy (mesh uplink protection): camera capped at 1.2Mbps/30fps,
   * screenshare at 2.5Mbps/30fps. The old defaults (1.8/3.5Mbps @ 60fps)
   * saturated home uplinks with 3+ peers → router bufferbloat → delay for
   * everyone on the call. degradationPreference 'maintain-framerate' makes
   * congestion shed pixels instead of adding latency.
   */
  static replaceVideoTrack(
    mediaCalls: Map<string, MediaConnection>,
    newTrack: MediaStreamTrack | null,
    isScreenShare: boolean = false,
    maxBitrate: number = 2_500_000,
    maxFramerate: number = 30
  ) {
    if (newTrack) {
      newTrack.enabled = true
      if (isScreenShare && 'contentHint' in newTrack) {
        newTrack.contentHint = 'motion'
      }
    }

    mediaCalls.forEach((call, peerId) => {
      try {
        const pc = (call as any).peerConnection as RTCPeerConnection
        if (pc) {
          prioritizeH264HardwareCodec(pc)
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
                diagLog('p2p', 'call.replace-ok', {
                  withPeer: peerId,
                  kind: 'video',
                  screen: isScreenShare,
                  trackEnabled: newTrack ? !!newTrack.enabled : null,
                })
                if (newTrack) {
                  try {
                    const params = videoSender.getParameters()
                    if (params && params.encodings && params.encodings.length > 0) {
                      params.encodings[0].maxBitrate = isScreenShare ? Math.min(maxBitrate, 2_500_000) : 1_200_000
                      params.encodings[0].maxFramerate = isScreenShare ? Math.min(maxFramerate, 30) : 30
                      params.encodings[0].scaleResolutionDownBy = 1.0
                      ;(params.encodings[0] as any).networkPriority = 'high'
                      ;(params.encodings[0] as any).priority = 'high'
                      ;(params as any).degradationPreference = 'maintain-framerate'
                      videoSender.setParameters(params).catch(() => {})
                    }
                  } catch (paramErr) {}
                }
              })
              .catch((err) => {
                diagLog('p2p', 'call.replace-failed', {
                  withPeer: peerId,
                  kind: 'video',
                  screen: isScreenShare,
                  error: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
                })
                console.warn('Could not replace video track on sender:', err)
              })
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
    useGameStore.getState().setCallState(peerId, 'idle')
  }

  static endAllMediaCalls(mediaCalls: Map<string, MediaConnection>) {
    const peerIds: string[] = []
    mediaCalls.forEach((call, peerId) => {
      try {
        call.close()
      } catch (e) {}
      peerIds.push(peerId)
      useMediaStore.getState().removePeerStream(peerId)
    })
    mediaCalls.clear()
    useMediaStore.getState().clearAllPeerStreams()
    peerIds.forEach((pid) => useGameStore.getState().setCallState(pid, 'idle'))
  }
}
