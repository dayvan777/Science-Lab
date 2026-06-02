import { describe, it, expect } from 'vitest'
import { clamp01, flapAngle, cutProgressFromDrag } from './cut'

describe('clamp01', () => {
  it('clamps to [0,1]', () => {
    expect(clamp01(-2)).toBe(0)
    expect(clamp01(0.4)).toBe(0.4)
    expect(clamp01(3)).toBe(1)
  })
})

describe('flapAngle', () => {
  it('is 0 closed, max open, monotonic, eased', () => {
    expect(flapAngle(0)).toBe(0)
    expect(flapAngle(1, 2)).toBeCloseTo(2, 6)
    expect(flapAngle(-1)).toBe(0)
    expect(flapAngle(5, 2)).toBeCloseTo(2, 6)
    expect(flapAngle(0.25)).toBeLessThan(flapAngle(0.75))
  })
})

describe('cutProgressFromDrag', () => {
  it('maps + clamps, guards zero length', () => {
    expect(cutProgressFromDrag(0, 300)).toBe(0)
    expect(cutProgressFromDrag(150, 300)).toBeCloseTo(0.5, 6)
    expect(cutProgressFromDrag(900, 300)).toBe(1)
    expect(cutProgressFromDrag(50, 0)).toBe(0)
  })
})
