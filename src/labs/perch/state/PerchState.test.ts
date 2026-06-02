import { describe, it, expect, beforeEach } from 'vitest'
import { usePerchState } from './PerchState'

const get = () => usePerchState.getState()
beforeEach(() => get().reset())

describe('PerchState', () => {
  it('starts in intro, no cut, nothing selected/viewed', () => {
    expect(get().phase).toBe('intro')
    expect(get().cutProgress).toBe(0)
    expect(get().selectedPartId).toBeNull()
    expect(get().viewedPartIds).toEqual([])
  })

  it('start() → external', () => {
    get().start()
    expect(get().phase).toBe('external')
  })

  it('setCut clamps and promotes to internal at full cut', () => {
    get().start()
    get().setCut(0.5)
    expect(get().cutProgress).toBe(0.5)
    expect(get().phase).toBe('external')
    get().setCut(2)
    expect(get().cutProgress).toBe(1)
    expect(get().phase).toBe('internal')
  })

  it('suture() closes the flap, returns to external, clears selection', () => {
    get().start(); get().setCut(1); get().select('heart')
    get().suture()
    expect(get().cutProgress).toBe(0)
    expect(get().phase).toBe('external')
    expect(get().selectedPartId).toBeNull()
  })

  it('select() records viewed (dedup); deselect keeps viewed', () => {
    get().select('gills'); get().deselect(); get().select('gills'); get().select('liver')
    expect(get().viewedPartIds).toEqual(['gills', 'liver'])
    expect(get().selectedPartId).toBe('liver')
    get().deselect()
    expect(get().selectedPartId).toBeNull()
    expect(get().viewedPartIds).toEqual(['gills', 'liver'])
  })

  it('reset restores initial state', () => {
    get().start(); get().setCut(1); get().select('kidney'); get().reset()
    expect(get().phase).toBe('intro')
    expect(get().cutProgress).toBe(0)
    expect(get().viewedPartIds).toEqual([])
  })
})
