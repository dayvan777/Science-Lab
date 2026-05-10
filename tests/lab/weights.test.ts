import { describe, it, expect } from 'vitest'
import { WEIGHTS } from '../../src/labs/mass-measurement/objects/Weights'

/**
 * Walk every subset of the WEIGHTS inventory; record which gram-totals
 * are reachable. The lab's three target masses (5 g ping-pong,
 * 145 g baseball, 250 g metal ball) must all be exactly reachable.
 */
function reachableTotals(weights: ReadonlyArray<{ mass: number }>): Set<number> {
  let totals = new Set<number>([0])
  for (const w of weights) {
    const next = new Set<number>(totals)
    for (const t of totals) next.add(t + w.mass)
    totals = next
  }
  return totals
}

describe('Weights inventory', () => {
  it('exposes a non-empty WEIGHTS array', () => {
    expect(Array.isArray(WEIGHTS)).toBe(true)
    expect(WEIGHTS.length).toBeGreaterThan(0)
  })

  it('every weight has a positive integer mass in grams', () => {
    for (const w of WEIGHTS) {
      expect(Number.isInteger(w.mass)).toBe(true)
      expect(w.mass).toBeGreaterThan(0)
    }
  })

  it('can exactly balance the ping-pong ball (5 g)', () => {
    expect(reachableTotals(WEIGHTS).has(5)).toBe(true)
  })

  it('can exactly balance the baseball (145 g)', () => {
    expect(reachableTotals(WEIGHTS).has(145)).toBe(true)
  })

  it('can exactly balance the metal ball (250 g)', () => {
    expect(reachableTotals(WEIGHTS).has(250)).toBe(true)
  })
})
