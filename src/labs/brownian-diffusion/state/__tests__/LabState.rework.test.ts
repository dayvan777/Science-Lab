import { describe, it, expect, beforeEach } from 'vitest'
import { useLabState } from '../LabState'

describe('LabState rework fields', () => {
  beforeEach(() => useLabState.getState().reset())

  it('goalReached defaults false and is settable', () => {
    expect(useLabState.getState().goalReached).toBe(false)
    useLabState.getState().setGoalReached(true)
    expect(useLabState.getState().goalReached).toBe(true)
  })

  it('mixedness defaults 0 and is settable', () => {
    expect(useLabState.getState().mixedness).toBe(0)
    useLabState.getState().setMixedness(0.42)
    expect(useLabState.getState().mixedness).toBeCloseTo(0.42)
  })

  it('advanceScene clears goalReached', () => {
    useLabState.getState().setGoalReached(true)
    useLabState.getState().advanceScene()
    expect(useLabState.getState().goalReached).toBe(false)
  })
})
