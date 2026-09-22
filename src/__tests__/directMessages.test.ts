import { describe, it, expect, beforeEach } from 'vitest'
import { useChatStore, getDmChannelId } from '../store/useChatStore'
import { useGameStore } from '../store/useGameStore'
import { ChatMessage } from '../types/chat'

describe('Direct Messages & Friend Chat Selection', () => {
  beforeEach(() => {
    // Reset game store with local player
    useGameStore.setState({
      localPlayer: {
        id: 'player-alice',
        name: 'Alice',
        x: 10,
        y: 10,
        direction: 'down',
        isMoving: false,
        avatar: { skin: '#ffd1a4', hair: '#000', hairStyle: 'short', shirtColor: '#4c6ef5', pantsColor: '#1a1f2c' },
      },
      remotePlayers: {
        'player-bob': {
          id: 'player-bob',
          name: 'Bob',
          x: 12,
          y: 10,
          direction: 'left',
          isMoving: false,
          avatar: { skin: '#ffd1a4', hair: '#000', hairStyle: 'short', shirtColor: '#e03131', pantsColor: '#1a1f2c' },
        },
      },
    })

    // Reset chat store
    useChatStore.setState({
      channels: [
        { id: 'general', name: 'general', type: 'general', unreadCount: 0 },
        { id: 'social', name: 'social', type: 'social', unreadCount: 0 },
        { id: 'current-zone', name: 'zona-atual', type: 'zone', unreadCount: 0 },
      ],
      messages: [],
      activeChannelId: 'general',
      isChatOpen: false,
    })
  })

  it('generates symmetric channel IDs regardless of user order', () => {
    const id1 = getDmChannelId('player-alice', 'player-bob')
    const id2 = getDmChannelId('player-bob', 'player-alice')
    expect(id1).toBe(id2)
    expect(id1).toBe('dm-player-alice-player-bob')
  })

  it('opens a direct message channel with a friend when clicked', () => {
    const { openDirectMessage } = useChatStore.getState()

    openDirectMessage({ id: 'player-bob', name: 'Bob' })

    const state = useChatStore.getState()
    const expectedChannelId = getDmChannelId('player-alice', 'player-bob')

    expect(state.activeChannelId).toBe(expectedChannelId)
    expect(state.isChatOpen).toBe(true)

    const dmChannel = state.channels.find((c) => c.id === expectedChannelId)
    expect(dmChannel).toBeDefined()
    expect(dmChannel?.name).toBe('Bob')
    expect(dmChannel?.type).toBe('dm')
    expect(dmChannel?.recipientId).toBe('player-bob')
    expect(dmChannel?.unreadCount).toBe(0)
  })

  it('dynamically registers channel and counts unread messages when incoming DM arrives', () => {
    const expectedChannelId = getDmChannelId('player-alice', 'player-bob')

    const incomingMsg: ChatMessage = {
      id: 'msg-incoming-1',
      senderId: 'player-bob',
      senderName: 'Bob',
      channelId: expectedChannelId,
      recipientId: 'player-alice',
      content: 'E aí Alice! Tudo certo?',
      timestamp: Date.now(),
    }

    useChatStore.getState().addMessage(incomingMsg)

    const state = useChatStore.getState()
    const dmChannel = state.channels.find((c) => c.id === expectedChannelId)

    expect(dmChannel).toBeDefined()
    expect(dmChannel?.type).toBe('dm')
    expect(dmChannel?.name).toBe('Bob')
    expect(dmChannel?.recipientId).toBe('player-bob')
    expect(dmChannel?.unreadCount).toBe(1)

    // Now Alice opens the direct message
    state.openDirectMessage({ id: 'player-bob', name: 'Bob' })
    const updatedState = useChatStore.getState()
    const activeDm = updatedState.channels.find((c) => c.id === expectedChannelId)
    expect(activeDm?.unreadCount).toBe(0)
    expect(updatedState.activeChannelId).toBe(expectedChannelId)
  })

  it('preserves existing channels while switching between General and Direct Messages', () => {
    const { openDirectMessage, setActiveChannel } = useChatStore.getState()

    openDirectMessage({ id: 'player-bob', name: 'Bob' })
    expect(useChatStore.getState().activeChannelId).toBe('dm-player-alice-player-bob')

    // Switch back to General
    setActiveChannel('general')
    expect(useChatStore.getState().activeChannelId).toBe('general')

    // Switch back to Bob's DM
    openDirectMessage({ id: 'player-bob', name: 'Bob' })
    expect(useChatStore.getState().activeChannelId).toBe('dm-player-alice-player-bob')
  })
})
