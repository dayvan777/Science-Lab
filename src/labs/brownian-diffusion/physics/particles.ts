/**
 * Particle types and initial-state factories for the brownian-diffusion lab.
 *
 * Each kind has a colour, mass, and radius. Velocity scaling lives in
 * kinetics.ts (depends on temperature setting).
 */

export type ParticleKind =
  | 'red'    // gas A (warm hue)
  | 'blue'   // gas B (cool hue)
  | 'water'  // liquid solvent
  | 'ink'    // liquid solute (purple)
  | 'pollen' // big Brownian particle (one only)

export type Vec3 = { x: number; y: number; z: number }

export type Particle = {
  kind: ParticleKind
  pos: Vec3
  vel: Vec3
  mass: number    // toy units, dimensionless
  radius: number  // metres (toy scale)
}

export const PARTICLE_DEFAULTS: Record<ParticleKind, { mass: number; radius: number; color: [number, number, number] }> = {
  red:    { mass: 1,  radius: 0.005, color: [0.90, 0.29, 0.23] }, // #e64a3b
  blue:   { mass: 1,  radius: 0.005, color: [0.04, 0.52, 1.00] }, // #0a84ff
  water:  { mass: 1,  radius: 0.004, color: [0.53, 0.77, 1.00] }, // #88c4ff
  ink:    { mass: 1,  radius: 0.004, color: [0.48, 0.24, 0.95] }, // #7a3df2
  pollen: { mass: 30, radius: 0.012, color: [0.90, 0.29, 0.23] }, // big red
}

/**
 * Generate a random unit-direction velocity, scaled by `speed`.
 * Deterministic when given a seeded RNG.
 */
export function randomVelocity(speed: number, rand: () => number = Math.random): Vec3 {
  // Marsaglia method for uniform-on-sphere
  let x: number, y: number, z: number, s: number
  do {
    x = 2 * rand() - 1
    y = 2 * rand() - 1
    z = 2 * rand() - 1
    s = x * x + y * y + z * z
  } while (s >= 1 || s === 0)
  const f = speed / Math.sqrt(s)
  return { x: x * f, y: y * f, z: z * f }
}

export function clonePos(p: Vec3): Vec3 { return { x: p.x, y: p.y, z: p.z } }
