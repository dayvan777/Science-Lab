import { Particle, PARTICLE_DEFAULTS, randomVelocity } from './particles'

/**
 * Spawn N ink particles in a small cluster at (x, y, z) in world space,
 * then translate them into the kinetic engine's local frame (relative
 * to the beaker centre). Mutates `particles` in place.
 */
export function spawnInk(
  particles: Particle[],
  worldPos: { x: number; y: number; z: number },
  beakerCentre: [number, number, number],
  count = 30,
): void {
  const def = PARTICLE_DEFAULTS.ink
  for (let i = 0; i < count; i++) {
    particles.push({
      kind: 'ink',
      pos: {
        x: (worldPos.x - beakerCentre[0]) + (Math.random() - 0.5) * 0.01,
        y: (worldPos.y - beakerCentre[1]) + (Math.random() - 0.5) * 0.01,
        z: (worldPos.z - beakerCentre[2]) + (Math.random() - 0.5) * 0.01,
      },
      vel: randomVelocity(0.1),   // slow drop
      mass: def.mass,
      radius: def.radius,
    })
  }
}
