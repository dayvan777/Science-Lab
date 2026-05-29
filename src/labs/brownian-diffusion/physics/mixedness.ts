import type { Particle } from './particles'
import { fractionMixed } from './divider'
import { interpolateLattice } from './lattice'

/** Liquid: fraction of ink particles that have risen above the lower quarter (y > -0.05). */
export function liquidMixed(particles: Particle[]): number {
  const ink = particles.filter(p => p.kind === 'ink')
  if (ink.length === 0) return 0
  return ink.filter(p => p.pos.y > -0.05).length / ink.length
}

/** Solid: fraction of interpolated lattice atoms that have crossed to the wrong half. */
export function latticeMixed(years: number): number {
  const { atoms } = interpolateLattice(years)
  if (atoms.length === 0) return 0
  const crossed = atoms.filter(a =>
    (a.kind === 'gold' && a.pos.y < 0) || (a.kind === 'lead' && a.pos.y > 0),
  ).length
  return crossed / atoms.length
}

/** Dispatch the 0..1 mixedness for the current material state. */
export function mixedness(
  state: 'gas' | 'liquid' | 'solid',
  particles: Particle[],
  years: number,
): number {
  switch (state) {
    case 'gas':    return fractionMixed(particles)
    case 'liquid': return liquidMixed(particles)
    case 'solid':  return latticeMixed(years)
  }
}
