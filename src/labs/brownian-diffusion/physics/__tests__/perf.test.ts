import { describe, it, expect } from 'vitest'
import { Particle, randomVelocity, PARTICLE_DEFAULTS } from '../particles'
import { step, AABB } from '../kinetics'

const COUNT = 150
const FRAMES = 600   // 10 seconds at 60fps
const BOX: AABB = { min: { x: -0.1, y: -0.1, z: -0.1 }, max: { x: 0.1, y: 0.1, z: 0.1 } }

function makeParticles(n: number): Particle[] {
  const out: Particle[] = []
  let seed = 1234567
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280
    return seed / 233280
  }
  for (let i = 0; i < n; i++) {
    const kind = i < n / 2 ? 'red' : 'blue'
    const def = PARTICLE_DEFAULTS[kind]
    out.push({
      kind,
      pos: { x: (rand() - 0.5) * 0.18, y: (rand() - 0.5) * 0.18, z: (rand() - 0.5) * 0.18 },
      vel: randomVelocity(0.3, rand),
      mass: def.mass,
      radius: def.radius,
    })
  }
  return out
}

describe('kinetic engine performance (programmatic gate)', () => {
  it('runs 150 particles × 600 frames in under 1500ms (1ms/frame headroom)', () => {
    const ps = makeParticles(COUNT)
    const t0 = performance.now()
    for (let f = 0; f < FRAMES; f++) {
      step(ps, BOX, null, 1 / 60)
    }
    const elapsed = performance.now() - t0
    // 1500ms / 600 frames = 2.5ms/frame. Real frame budget is 16.67ms.
    // We want the engine alone (no rendering) to fit comfortably in that.
    expect(elapsed).toBeLessThan(1500)
  })
})
