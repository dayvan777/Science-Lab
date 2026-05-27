import { describe, it, expect } from 'vitest'
import { Matrix4 } from 'three'
import { Particle } from '../../physics/particles'
import { writeParticleMatrix } from '../ParticleField'

describe('writeParticleMatrix', () => {
  it('encodes position and radius-scale correctly', () => {
    const p: Particle = {
      kind: 'red',
      pos: { x: 0.05, y: -0.03, z: 0.01 },
      vel: { x: 0, y: 0, z: 0 },
      mass: 1,
      radius: 0.005,
    }
    const m = new Matrix4()
    writeParticleMatrix(m, p)
    // Translation should match position exactly
    expect(m.elements[12]).toBeCloseTo(0.05, 8)
    expect(m.elements[13]).toBeCloseTo(-0.03, 8)
    expect(m.elements[14]).toBeCloseTo(0.01, 8)
    // Scale should equal radius (unit sphere geometry × radius)
    expect(m.elements[0]).toBeCloseTo(0.005, 8) // sx
    expect(m.elements[5]).toBeCloseTo(0.005, 8) // sy
    expect(m.elements[10]).toBeCloseTo(0.005, 8) // sz
  })
})
