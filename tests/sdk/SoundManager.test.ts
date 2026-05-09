import { describe, it, expect, beforeEach } from 'vitest'
import { SoundManager } from '../../src/sdk/audio/SoundManager'

describe('SoundManager', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('starts unmuted by default', () => {
    const sm = new SoundManager()
    expect(sm.isMuted()).toBe(false)
  })

  it('toggleMute flips state', () => {
    const sm = new SoundManager()
    sm.toggleMute()
    expect(sm.isMuted()).toBe(true)
    sm.toggleMute()
    expect(sm.isMuted()).toBe(false)
  })

  it('persists mute state to localStorage', () => {
    const sm1 = new SoundManager()
    sm1.toggleMute()
    const sm2 = new SoundManager()
    expect(sm2.isMuted()).toBe(true)
  })

  it('setVolume clamps to [0, 1]', () => {
    const sm = new SoundManager()
    sm.setVolume(-0.5)
    expect(sm.getVolume()).toBe(0)
    sm.setVolume(1.5)
    expect(sm.getVolume()).toBe(1)
    sm.setVolume(0.5)
    expect(sm.getVolume()).toBe(0.5)
  })

  it('play is a no-op when no buffer is loaded for the id (does not throw)', () => {
    const sm = new SoundManager()
    expect(() => sm.play('tick')).not.toThrow()
  })

  it('play is a no-op when muted (does not throw)', () => {
    const sm = new SoundManager()
    sm.toggleMute()
    expect(() => sm.play('tick')).not.toThrow()
  })
})
