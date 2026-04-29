import { describe, it, expect } from 'vitest'
import { newtonsToGrams, gramsToNewtons, withinTolerance } from '../../src/utils/units'

describe('newtonsToGrams', () => {
  it('converts 1 N to ~102 g (using g=9.8)', () => {
    expect(newtonsToGrams(1)).toBeCloseTo(102.04, 1)
  })
  it('converts 0 N to 0 g', () => {
    expect(newtonsToGrams(0)).toBe(0)
  })
})

describe('gramsToNewtons', () => {
  it('converts 1000 g to ~9.8 N', () => {
    expect(gramsToNewtons(1000)).toBeCloseTo(9.8, 2)
  })
})

describe('withinTolerance', () => {
  it('accepts value within ±10% of expected', () => {
    expect(withinTolerance(180, 180, 0.10)).toBe(true)
    expect(withinTolerance(170, 180, 0.10)).toBe(true)
    expect(withinTolerance(195, 180, 0.10)).toBe(true)
  })
  it('rejects value outside ±10%', () => {
    expect(withinTolerance(150, 180, 0.10)).toBe(false)
    expect(withinTolerance(220, 180, 0.10)).toBe(false)
  })
  it('handles zero expected (treats as exact match required)', () => {
    expect(withinTolerance(0, 0, 0.10)).toBe(true)
    expect(withinTolerance(1, 0, 0.10)).toBe(false)
  })
})
