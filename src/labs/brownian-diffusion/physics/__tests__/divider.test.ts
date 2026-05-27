import { describe, it, expect } from 'vitest'
import { Particle } from '../particles'
import { dividerStateAt, fractionMixed, BOX_HALF_Y } from '../divider'

describe('dividerStateAt(handleY)', () => {
  it('returns wall plane x=0 and openHeightY at default base y', () => {
    const d = dividerStateAt(-BOX_HALF_Y) // handle at bottom = fully closed
    expect(d?.x).toBe(0)
    expect(d?.openHeightY).toBeCloseTo(BOX_HALF_Y, 6)
  })

  it('progressively opens as handle rises', () => {
    const closed = dividerStateAt(-BOX_HALF_Y)
    const half = dividerStateAt(0)
    const open = dividerStateAt(BOX_HALF_Y + 0.05)
    expect(closed?.openHeightY).toBeGreaterThan(half?.openHeightY ?? -Infinity)
    expect(open).toBeNull() // handle above box top → no divider
  })
})

describe('fractionMixed', () => {
  function mkPs(redOnRight: number, blueOnLeft: number): Particle[] {
    const out: Particle[] = []
    for (let i = 0; i < 10; i++) {
      const onRight = i < redOnRight
      out.push({
        kind: 'red',
        pos: { x: onRight ? 0.05 : -0.05, y: 0, z: 0 },
        vel: { x: 0, y: 0, z: 0 },
        mass: 1,
        radius: 0.005,
      })
    }
    for (let i = 0; i < 10; i++) {
      const onLeft = i < blueOnLeft
      out.push({
        kind: 'blue',
        pos: { x: onLeft ? -0.05 : 0.05, y: 0, z: 0 },
        vel: { x: 0, y: 0, z: 0 },
        mass: 1,
        radius: 0.005,
      })
    }
    return out
  }

  it('returns 0 when fully segregated', () => {
    expect(fractionMixed(mkPs(0, 0))).toBeCloseTo(0, 6)
  })

  it('returns 1 when 50/50 in each half', () => {
    expect(fractionMixed(mkPs(5, 5))).toBeCloseTo(1, 6)
  })

  it('returns 0.5 for half-mixed', () => {
    expect(fractionMixed(mkPs(3, 3))).toBeCloseTo(0.6, 1)
  })
})
