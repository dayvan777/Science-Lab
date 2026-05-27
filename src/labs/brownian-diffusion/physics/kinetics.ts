import { Particle, Vec3 } from './particles'

export type AABB = { min: Vec3; max: Vec3 }
export type DividerState = { x: number; openHeightY: number } | null

/**
 * Advance every particle by one timestep:
 *   1. integrate pos += vel * dt
 *   2. pair-wise elastic collisions (O(n²))
 *   3. wall reflections
 *   4. optional divider as inner wall
 *
 * `dt` is clamped externally to ≤ 1/60 by the caller (LabScene useFrame).
 */
export function step(
  particles: Particle[],
  walls: AABB,
  divider: DividerState,
  dt: number,
  liquidDrag: number = 0,   // 0 = no drag (gas); >0 = liquid mode
): void {
  // 1. Integrate
  for (const p of particles) {
    p.pos.x += p.vel.x * dt
    p.pos.y += p.vel.y * dt
    p.pos.z += p.vel.z * dt
  }

  // 1.5. Liquid drag (only if liquidDrag > 0)
  if (liquidDrag > 0) {
    const factor = Math.max(0, 1 - liquidDrag * dt)
    for (const p of particles) {
      p.vel.x *= factor
      p.vel.y *= factor
      p.vel.z *= factor
    }
  }

  // 2. Pair collisions — O(n²)
  const n = particles.length
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      collidePair(particles[i], particles[j])
    }
  }

  // 3. Walls
  for (const p of particles) reflectAtWalls(p, walls)

  // 4. Divider (if active and not fully open)
  if (divider) {
    for (const p of particles) reflectAtDivider(p, divider)
  }
}

/**
 * Elastic collision between two spheres. Mutates both particles in place.
 * Does nothing if the spheres are not overlapping (distance >= sum of radii).
 */
export function collidePair(a: Particle, b: Particle): void {
  const dx = b.pos.x - a.pos.x
  const dy = b.pos.y - a.pos.y
  const dz = b.pos.z - a.pos.z
  const r = a.radius + b.radius
  const distSq = dx * dx + dy * dy + dz * dz
  if (distSq >= r * r || distSq === 0) return

  const dist = Math.sqrt(distSq)
  const nx = dx / dist
  const ny = dy / dist
  const nz = dz / dist

  const dvx = b.vel.x - a.vel.x
  const dvy = b.vel.y - a.vel.y
  const dvz = b.vel.z - a.vel.z
  const vRelN = dvx * nx + dvy * ny + dvz * nz

  if (vRelN >= 0) return  // already separating or stationary; skip impulse + correction

  const j = (2 * vRelN) / (1 / a.mass + 1 / b.mass)

  a.vel.x += (j / a.mass) * nx
  a.vel.y += (j / a.mass) * ny
  a.vel.z += (j / a.mass) * nz
  b.vel.x -= (j / b.mass) * nx
  b.vel.y -= (j / b.mass) * ny
  b.vel.z -= (j / b.mass) * nz

  const overlap = r - dist
  const totalM = a.mass + b.mass
  a.pos.x -= nx * overlap * (b.mass / totalM)
  a.pos.y -= ny * overlap * (b.mass / totalM)
  a.pos.z -= nz * overlap * (b.mass / totalM)
  b.pos.x += nx * overlap * (a.mass / totalM)
  b.pos.y += ny * overlap * (a.mass / totalM)
  b.pos.z += nz * overlap * (a.mass / totalM)
}

export function reflectAtWalls(p: Particle, w: AABB): void {
  if (p.pos.x - p.radius < w.min.x) { p.pos.x = w.min.x + p.radius; if (p.vel.x < 0) p.vel.x = -p.vel.x }
  if (p.pos.x + p.radius > w.max.x) { p.pos.x = w.max.x - p.radius; if (p.vel.x > 0) p.vel.x = -p.vel.x }
  if (p.pos.y - p.radius < w.min.y) { p.pos.y = w.min.y + p.radius; if (p.vel.y < 0) p.vel.y = -p.vel.y }
  if (p.pos.y + p.radius > w.max.y) { p.pos.y = w.max.y - p.radius; if (p.vel.y > 0) p.vel.y = -p.vel.y }
  if (p.pos.z - p.radius < w.min.z) { p.pos.z = w.min.z + p.radius; if (p.vel.z < 0) p.vel.z = -p.vel.z }
  if (p.pos.z + p.radius > w.max.z) { p.pos.z = w.max.z - p.radius; if (p.vel.z > 0) p.vel.z = -p.vel.z }
}

/**
 * Divider at x = d.x acts as a wall ONLY for particles whose y is at or
 * below openHeightY. Convention: y-up; particles above openHeightY are
 * unblocked. The `<=`/`>=` boundary on x handles the float-rare case
 * where positional correction parks a particle exactly on the plane.
 */
function reflectAtDivider(p: Particle, d: NonNullable<DividerState>): void {
  if (p.pos.y > d.openHeightY) return
  // Approach from left side (centre at or left of plane, moving right, leading edge crossing)
  if (p.pos.x + p.radius > d.x && p.vel.x > 0 && p.pos.x <= d.x) {
    p.pos.x = d.x - p.radius
    p.vel.x = -p.vel.x
  }
  // Approach from right side (centre at or right of plane, moving left, leading edge crossing)
  else if (p.pos.x - p.radius < d.x && p.vel.x < 0 && p.pos.x >= d.x) {
    p.pos.x = d.x + p.radius
    p.vel.x = -p.vel.x
  }
}

export function totalKE(particles: Particle[]): number {
  let ke = 0
  for (const p of particles) {
    ke += 0.5 * p.mass * (p.vel.x ** 2 + p.vel.y ** 2 + p.vel.z ** 2)
  }
  return ke
}

export function totalMomentum(particles: Particle[]): Vec3 {
  let x = 0, y = 0, z = 0
  for (const p of particles) {
    x += p.mass * p.vel.x
    y += p.mass * p.vel.y
    z += p.mass * p.vel.z
  }
  return { x, y, z }
}
