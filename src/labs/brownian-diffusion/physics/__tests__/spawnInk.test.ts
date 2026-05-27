import { describe, it, expect } from 'vitest'
import { Particle } from '../particles'
import { spawnInk } from '../spawnInk'

describe('spawnInk', () => {
  it('appends count particles of kind=ink near the release point', () => {
    const ps: Particle[] = []
    spawnInk(ps, { x: 0.40, y: 0.90, z: 0 }, [0.40, 0.85, 0], 10)
    expect(ps).toHaveLength(10)
    expect(ps.every(p => p.kind === 'ink')).toBe(true)
    // Local pos should be roughly (0, 0.05, 0)
    expect(Math.abs(ps[0].pos.x)).toBeLessThan(0.02)
    expect(ps[0].pos.y).toBeCloseTo(0.05, 1)
  })
})
