import { describe, it, expect, beforeEach } from 'vitest'
import { useAnatomyState } from './AnatomyState'

const get = () => useAnatomyState.getState()

beforeEach(() => get().reset())

describe('AnatomyState', () => {
  it('starts in intro with nothing selected or viewed', () => {
    expect(get().phase).toBe('intro')
    expect(get().selectedOrganId).toBeNull()
    expect(get().viewedOrganIds).toEqual([])
  })

  it('start() moves to in-progress', () => {
    get().start()
    expect(get().phase).toBe('in-progress')
  })

  it('select() sets the selected organ and records it as viewed', () => {
    get().select('heart')
    expect(get().selectedOrganId).toBe('heart')
    expect(get().viewedOrganIds).toEqual(['heart'])
  })

  it('re-selecting the same organ does not duplicate it in viewed', () => {
    get().select('heart')
    get().deselect()
    get().select('heart')
    expect(get().viewedOrganIds).toEqual(['heart'])
  })

  it('selecting a different organ switches selection and grows the viewed set', () => {
    get().select('heart')
    get().select('brain')
    expect(get().selectedOrganId).toBe('brain')
    expect(get().viewedOrganIds).toEqual(['heart', 'brain'])
  })

  it('deselect() clears selection but keeps viewed history', () => {
    get().select('liver')
    get().deselect()
    expect(get().selectedOrganId).toBeNull()
    expect(get().viewedOrganIds).toEqual(['liver'])
  })

  it('reset() returns to the initial state', () => {
    get().start()
    get().select('lungs')
    get().reset()
    expect(get().phase).toBe('intro')
    expect(get().selectedOrganId).toBeNull()
    expect(get().viewedOrganIds).toEqual([])
  })
})
