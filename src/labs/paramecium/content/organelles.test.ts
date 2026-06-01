import { describe, it, expect } from 'vitest'
import { ORGANELLES, ORGANELLE_IDS } from './organelles'

describe('ORGANELLES data', () => {
  it('has the nine expected organelles in order', () => {
    expect(ORGANELLES).toHaveLength(9)
    expect(ORGANELLE_IDS).toEqual([
      'cilia', 'pellicle', 'oral', 'foodVacuoles', 'contractileVacuoles',
      'macronucleus', 'micronucleus', 'trichocysts', 'analPore',
    ])
  })

  it('has unique ids and hex colours and ≥1 non-empty fact each', () => {
    expect(new Set(ORGANELLES.map(o => o.id)).size).toBe(9)
    for (const o of ORGANELLES) {
      expect(o.color).toMatch(/^#[0-9a-fA-F]{6}$/)
      expect(o.label.length).toBeGreaterThan(0)
      expect(o.facts.length).toBeGreaterThanOrEqual(1)
      for (const f of o.facts) expect(f.trim().length).toBeGreaterThan(0)
    }
  })

  it('non-layer organelles have at least one position; layer organelles have none', () => {
    for (const o of ORGANELLES) {
      if (o.kind === 'layer') expect(o.positions).toBeUndefined()
      else expect(o.positions && o.positions.length).toBeGreaterThan(0)
    }
  })
})
