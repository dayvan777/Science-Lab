import { describe, it, expect } from 'vitest'
import { liquidMixed, latticeMixed, mixedness } from '../mixedness'
import type { Particle } from '../particles'

const ink = (y: number): Particle => ({ kind: 'ink', pos: { x: 0, y, z: 0 }, vel: { x: 0, y: 0, z: 0 }, mass: 1, radius: 0.004 })

describe('mixedness selectors', () => {
  it('liquidMixed: 0 with no ink, 0.5 when half the ink has risen', () => {
    expect(liquidMixed([])).toBe(0)
    expect(liquidMixed([ink(0.02), ink(0.02), ink(-0.09), ink(-0.09)])).toBeCloseTo(0.5)
  })

  it('latticeMixed: 0 at year 0, > 0 by year 1000', () => {
    expect(latticeMixed(0)).toBe(0)
    expect(latticeMixed(1000)).toBeGreaterThan(0)
  })

  it('mixedness dispatches by state', () => {
    expect(mixedness('liquid', [ink(0.02), ink(-0.09)], 1)).toBeCloseTo(0.5)
    expect(mixedness('solid', [], 1000)).toBeGreaterThan(0)
    expect(mixedness('gas', [], 1)).toBe(0) // no red/blue → fractionMixed 0
  })
})
