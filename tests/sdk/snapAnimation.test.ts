import { describe, it, expect } from 'vitest'
import { snapProgress } from '../../src/sdk/physics/snapTargets'

describe('snapProgress', () => {
  it('returns 0 at elapsed=0', () => {
    expect(snapProgress(0, 300)).toBe(0)
  })

  it('returns 1 when elapsed >= duration', () => {
    expect(snapProgress(300, 300)).toBe(1)
    expect(snapProgress(500, 300)).toBe(1)
  })

  it('eases out (front-loaded) — value past 0.5 at midpoint', () => {
    expect(snapProgress(150, 300)).toBeGreaterThan(0.5)
  })
})
