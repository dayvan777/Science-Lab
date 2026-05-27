import { Vec3 } from './particles'

export type AtomKind = 'gold' | 'lead'

export type LatticeAtom = {
  kind: AtomKind
  pos: Vec3
}

export type LatticeSnapshot = {
  years: number
  atoms: LatticeAtom[]
}

/**
 * Build a regular grid of atoms over the top half (gold) and bottom half (lead).
 * Lattice is a 5×4×5 grid (100 atoms total: 50 gold + 50 lead).
 */
function buildBaseSnapshot(): LatticeAtom[] {
  const atoms: LatticeAtom[] = []
  const SPACING = 0.012
  for (let xi = -2; xi <= 2; xi++) {
    for (let zi = -2; zi <= 2; zi++) {
      // gold (top half, yi = 1..2)
      for (let yi = 1; yi <= 2; yi++) {
        atoms.push({
          kind: 'gold',
          pos: { x: xi * SPACING, y: yi * SPACING, z: zi * SPACING },
        })
      }
      // lead (bottom half, yi = -2..-1)
      for (let yi = -2; yi <= -1; yi++) {
        atoms.push({
          kind: 'lead',
          pos: { x: xi * SPACING, y: yi * SPACING, z: zi * SPACING },
        })
      }
    }
  }
  return atoms
}

/**
 * Take a base snapshot and migrate `goldDown` gold atoms into lead positions,
 * and `leadUp` lead atoms into gold positions. Doesn't remove originals —
 * those positions stay; just changes kind so the boundary "blurs" visually.
 * Deterministic via a fixed pseudo-random seed.
 */
function buildEvolved(baseSnapshot: LatticeAtom[], goldDown: number, leadUp: number, seed: number): LatticeAtom[] {
  const out = baseSnapshot.map(a => ({ kind: a.kind, pos: { ...a.pos } }))
  let s = seed
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280 }

  const goldNearBoundary = out
    .map((a, i) => ({ a, i }))
    .filter(({ a }) => a.kind === 'gold' && a.pos.y === 0.012)
  const leadNearBoundary = out
    .map((a, i) => ({ a, i }))
    .filter(({ a }) => a.kind === 'lead' && a.pos.y === -0.012)

  for (let n = 0; n < goldDown; n++) {
    const pick = goldNearBoundary[Math.floor(rnd() * goldNearBoundary.length)]
    out[pick.i] = { kind: 'gold', pos: { ...pick.a.pos, y: -0.012 + (rnd() - 0.5) * 0.004 } }
  }
  for (let n = 0; n < leadUp; n++) {
    const pick = leadNearBoundary[Math.floor(rnd() * leadNearBoundary.length)]
    out[pick.i] = { kind: 'lead', pos: { ...pick.a.pos, y: 0.012 + (rnd() - 0.5) * 0.004 } }
  }
  return out
}

const BASE = buildBaseSnapshot()

export const SNAPSHOTS: LatticeSnapshot[] = [
  { years: 0,    atoms: BASE.map(a => ({ kind: a.kind, pos: { ...a.pos } })) },
  { years: 1,    atoms: buildEvolved(BASE, 1, 0, 13) },
  { years: 10,   atoms: buildEvolved(BASE, 3, 1, 91) },
  { years: 100,  atoms: buildEvolved(BASE, 8, 3, 1037) },
  { years: 1000, atoms: buildEvolved(BASE, 18, 8, 7919) },
]

/**
 * Position-lerp between the two snapshots that bracket `years`. Clamps to
 * the endpoints outside the range. KIND of each atom is taken from the
 * later snapshot (kind transitions are discrete; lerp is positional only).
 */
export function interpolateLattice(years: number): LatticeSnapshot {
  if (years <= SNAPSHOTS[0].years) return SNAPSHOTS[0]
  if (years >= SNAPSHOTS[SNAPSHOTS.length - 1].years) return SNAPSHOTS[SNAPSHOTS.length - 1]

  let i = 0
  while (SNAPSHOTS[i + 1].years <= years) i++
  const a = SNAPSHOTS[i]
  const b = SNAPSHOTS[i + 1]
  const t = (years - a.years) / (b.years - a.years)

  const atoms: LatticeAtom[] = []
  for (let k = 0; k < a.atoms.length; k++) {
    const A = a.atoms[k]
    const B = b.atoms[k]
    atoms.push({
      kind: B.kind,
      pos: {
        x: A.pos.x + (B.pos.x - A.pos.x) * t,
        y: A.pos.y + (B.pos.y - A.pos.y) * t,
        z: A.pos.z + (B.pos.z - A.pos.z) * t,
      },
    })
  }
  return { years, atoms }
}
