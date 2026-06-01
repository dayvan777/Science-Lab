import { describe, it, expect, beforeEach } from 'vitest'
import { useParameciumState } from './ParameciumState'

const get = () => useParameciumState.getState()
beforeEach(() => get().reset())

describe('ParameciumState', () => {
  it('starts in intro, environment view, nothing selected/viewed', () => {
    expect(get().phase).toBe('intro')
    expect(get().viewMode).toBe('environment')
    expect(get().selectedOrganelleId).toBeNull()
    expect(get().viewedOrganelleIds).toEqual([])
  })

  it('start() → in-progress (still environment)', () => {
    get().start()
    expect(get().phase).toBe('in-progress')
    expect(get().viewMode).toBe('environment')
  })

  it('enterCell() switches to cell view; exitToEnvironment() returns and clears selection', () => {
    get().enterCell()
    expect(get().viewMode).toBe('cell')
    get().select('macronucleus')
    get().exitToEnvironment()
    expect(get().viewMode).toBe('environment')
    expect(get().selectedOrganelleId).toBeNull()
  })

  it('select() sets selection, records viewed, and forces cell view', () => {
    get().select('cilia')
    expect(get().selectedOrganelleId).toBe('cilia')
    expect(get().viewMode).toBe('cell')
    expect(get().viewedOrganelleIds).toEqual(['cilia'])
  })

  it('re-selecting dedupes; switching grows the viewed set', () => {
    get().select('cilia')
    get().deselect()
    get().select('cilia')
    get().select('oral')
    expect(get().viewedOrganelleIds).toEqual(['cilia', 'oral'])
    expect(get().selectedOrganelleId).toBe('oral')
  })

  it('deselect() clears selection but keeps view + viewed', () => {
    get().select('oral')
    get().deselect()
    expect(get().selectedOrganelleId).toBeNull()
    expect(get().viewMode).toBe('cell')
    expect(get().viewedOrganelleIds).toEqual(['oral'])
  })

  it('reset() restores the initial state', () => {
    get().start(); get().select('analPore'); get().reset()
    expect(get().phase).toBe('intro')
    expect(get().viewMode).toBe('environment')
    expect(get().selectedOrganelleId).toBeNull()
    expect(get().viewedOrganelleIds).toEqual([])
  })
})
