import { describe, it, expect } from 'vitest'
import { DEFAULT_AVATAR } from '../engine/Constants'
import { AvatarRenderer } from '../engine/AvatarRenderer'
import { Player } from '../types/game'

describe('Avatar Customizer & Pixel Art Renderer - Expected Behaviors', () => {
  it('should have complete DEFAULT_AVATAR with all neutral Gather layers', () => {
    expect(DEFAULT_AVATAR.skinTone).toBe('#ffd1a4')
    expect(DEFAULT_AVATAR.skinDetail).toBe('smooth')
    expect(DEFAULT_AVATAR.eyeType).toBe('normal')
    expect(DEFAULT_AVATAR.hairStyle).toBe('none')
    expect(DEFAULT_AVATAR.topType).toBe('none')
    expect(DEFAULT_AVATAR.bottomType).toBe('none')
    expect(DEFAULT_AVATAR.shoesType).toBe('none')
    expect(DEFAULT_AVATAR.hatType).toBe('none')
    expect(DEFAULT_AVATAR.glassesType).toBe('none')
    expect(DEFAULT_AVATAR.otherType).toBe('none')
  })

  it('should render avatar to a 2D canvas context without errors in all 4 directions', () => {
    const mockCtx = {
      save: () => {},
      restore: () => {},
      beginPath: () => {},
      closePath: () => {},
      fill: () => {},
      stroke: () => {},
      ellipse: () => {},
      arc: () => {},
      moveTo: () => {},
      lineTo: () => {},
      fillRect: () => {},
      strokeRect: () => {},
      roundRect: () => {},
      fillText: () => {},
      measureText: () => ({ width: 40 }),
    } as unknown as CanvasRenderingContext2D

    const fakePlayer: Player = {
      id: 'test-player',
      name: 'clean',
      x: 10,
      y: 10,
      direction: 'down',
      isMoving: true,
      avatar: { ...DEFAULT_AVATAR },
      status: 'available',
      lastUpdated: Date.now(),
    }

    // Direction DOWN
    expect(() => AvatarRenderer.drawPlayer(mockCtx, fakePlayer, true, 100)).not.toThrow()

    // Direction UP
    fakePlayer.direction = 'up'
    expect(() => AvatarRenderer.drawPlayer(mockCtx, fakePlayer, true, 200)).not.toThrow()

    // Direction LEFT
    fakePlayer.direction = 'left'
    expect(() => AvatarRenderer.drawPlayer(mockCtx, fakePlayer, true, 300)).not.toThrow()

    // Direction RIGHT
    fakePlayer.direction = 'right'
    expect(() => AvatarRenderer.drawPlayer(mockCtx, fakePlayer, true, 400)).not.toThrow()
  })

  it('should support rendering different hairstyles and accessories cleanly', () => {
    const mockCtx = {
      save: () => {},
      restore: () => {},
      beginPath: () => {},
      closePath: () => {},
      fill: () => {},
      stroke: () => {},
      ellipse: () => {},
      arc: () => {},
      moveTo: () => {},
      lineTo: () => {},
      fillRect: () => {},
      strokeRect: () => {},
      roundRect: () => {},
      fillText: () => {},
      measureText: () => ({ width: 40 }),
    } as unknown as CanvasRenderingContext2D

    const fakePlayer: Player = {
      id: 'test-player-2',
      name: 'Aravon',
      x: 5,
      y: 5,
      direction: 'down',
      isMoving: false,
      avatar: {
        ...DEFAULT_AVATAR,
        skinDetail: 'freckles',
        hairStyle: 'long_bangs',
        hairColor: '#9c36b5',
        hatType: 'ribbon_bow',
        glassesType: 'round',
        jacketType: 'cardigan',
        facialHair: 'full_beard',
      },
      status: 'available',
      lastUpdated: Date.now(),
    }

    expect(() => AvatarRenderer.drawPlayer(mockCtx, fakePlayer, false, 0)).not.toThrow()
  })
})
