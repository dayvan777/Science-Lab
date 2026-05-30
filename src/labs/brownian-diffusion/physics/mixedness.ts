import type { Particle } from './particles'
import { fractionMixed, BOX_HALF_Y } from './divider'
import { interpolateLattice } from './lattice'

/** Ink counts as "risen" once it clears the lower quarter of the box (= -BOX_HALF_Y/2). */
const INK_RISEN_Y = -BOX_HALF_Y / 2

/** Liquid: fraction of ink particles that have risen above the lower quarter. */
export function liquidMixed(particles: Particle[]): number {
  let ink = 0
  let risen = 0
  for (const p of particles) {
    if (p.kind !== 'ink') continue
    ink++
    if (p.pos.y > INK_RISEN_Y) risen++
  }
  return ink === 0 ? 0 : risen / ink
}

// latticeMixed is a pure function of the (discrete) year value, so its result is
// memoized — the solid-state meter polls it every frame but `years` only changes
// on user interaction, avoiding a 100-atom recompute per frame.
let lastYears = Number.NaN
let lastValue = 0

/** Solid: fraction of interpolated lattice atoms that have crossed to the wrong half. */
export function latticeMixed(years: number): number {
  if (years === lastYears) return lastValue
  const { atoms } = interpolateLattice(years)
  let crossed = 0
  for (const a of atoms) {
    if ((a.kind === 'gold' && a.pos.y < 0) || (a.kind === 'lead' && a.pos.y > 0)) crossed++
  }
  lastYears = years
  lastValue = atoms.length === 0 ? 0 : crossed / atoms.length
  return lastValue
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
