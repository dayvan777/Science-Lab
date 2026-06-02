import { describe, it, expect } from 'vitest'
import { PARTS, PART_IDS, getPart } from './parts'

describe('perch parts', () => {
  it('has 16 parts: 9 external + 7 internal', () => {
    expect(PARTS).toHaveLength(16)
    expect(PARTS.filter(p => p.phase === 'external')).toHaveLength(9)
    expect(PARTS.filter(p => p.phase === 'internal')).toHaveLength(7)
  })
  it('ids are unique and every part has ≥1 fact + a label', () => {
    expect(new Set(PART_IDS).size).toBe(16)
    for (const p of PARTS) {
      expect(p.label.length).toBeGreaterThan(0)
      expect(p.facts.length).toBeGreaterThan(0)
    }
  })
  it('getPart returns the def or throws', () => {
    expect(getPart('heart').label).toBe('Серце')
    expect(() => getPart('nope' as never)).toThrow()
  })
})
