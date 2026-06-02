import { describe, it, expect } from 'vitest'
import { bodyProfile } from './shape'

describe('bodyProfile', () => {
  it('is thin at snout, thinner at tail, peaks behind the head', () => {
    expect(bodyProfile(0)).toBeCloseTo(0.42, 2)
    expect(bodyProfile(1)).toBeCloseTo(0.12, 2)
    expect(bodyProfile(0.34)).toBeGreaterThan(bodyProfile(0))
    expect(bodyProfile(0.34)).toBeGreaterThan(bodyProfile(1))
  })
  it('peaks in the front third and stays within (0,1]', () => {
    let max = 0, argmax = 0
    for (let i = 0; i <= 100; i++) {
      const t = i / 100, v = bodyProfile(t)
      expect(v).toBeGreaterThan(0)
      expect(v).toBeLessThanOrEqual(1 + 1e-9)
      if (v > max) { max = v; argmax = t }
    }
    expect(max).toBeCloseTo(1, 2)
    expect(argmax).toBeGreaterThan(0.25)
    expect(argmax).toBeLessThan(0.45)
  })
  it('clamps out-of-range input', () => {
    expect(bodyProfile(-1)).toBe(bodyProfile(0))
    expect(bodyProfile(2)).toBe(bodyProfile(1))
  })
})
