import { describe, it, expect } from 'vitest'
import { interpolateLattice, SNAPSHOTS } from '../lattice'

describe('SNAPSHOTS', () => {
  it('has exactly 5 keyframes at years [0, 1, 10, 100, 1000]', () => {
    expect(SNAPSHOTS.map(s => s.years)).toEqual([0, 1, 10, 100, 1000])
  })

  it('all snapshots have the same total atom count', () => {
    const counts = SNAPSHOTS.map(s => s.atoms.length)
    const first = counts[0]
    for (const c of counts) expect(c).toBe(first)
  })

  it('atom count is split exactly half gold / half lead in the t=0 snapshot', () => {
    const t0 = SNAPSHOTS[0]
    const gold = t0.atoms.filter(a => a.kind === 'gold').length
    const lead = t0.atoms.filter(a => a.kind === 'lead').length
    expect(gold).toBe(lead)
  })
})

describe('interpolateLattice(years)', () => {
  it('returns the exact snapshot when years matches a keyframe', () => {
    const snap = interpolateLattice(100)
    const ref = SNAPSHOTS.find(s => s.years === 100)!
    expect(snap.atoms).toHaveLength(ref.atoms.length)
    expect(snap.atoms[0].pos).toEqual(ref.atoms[0].pos)
  })

  it('clamps to first snapshot for years < 0', () => {
    const snap = interpolateLattice(-5)
    expect(snap.atoms[0].pos).toEqual(SNAPSHOTS[0].atoms[0].pos)
  })

  it('clamps to last snapshot for years > max', () => {
    const snap = interpolateLattice(5000)
    expect(snap.atoms[0].pos).toEqual(SNAPSHOTS[SNAPSHOTS.length - 1].atoms[0].pos)
  })
})
