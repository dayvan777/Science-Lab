import { describe, it, expect } from 'vitest'
import { Particle } from '../particles'
import {
  step,
  collidePair,
  reflectAtWalls,
  totalKE,
  totalMomentum,
} from '../kinetics'

const DT = 1 / 60

function mkP(x: number, y: number, z: number, vx: number, vy: number, vz: number, mass = 1, radius = 0.01): Particle {
  return { kind: 'red', pos: { x, y, z }, vel: { x: vx, y: vy, z: vz }, mass, radius }
}

describe('step (integration)', () => {
  it('integrates pos += vel·dt for a single particle in free space', () => {
    const ps = [mkP(0, 0, 0, 0.1, 0.2, -0.3)]
    step(ps, { min: { x: -1, y: -1, z: -1 }, max: { x: 1, y: 1, z: 1 } }, null, DT)
    expect(ps[0].pos.x).toBeCloseTo(0.1 * DT, 8)
    expect(ps[0].pos.y).toBeCloseTo(0.2 * DT, 8)
    expect(ps[0].pos.z).toBeCloseTo(-0.3 * DT, 8)
  })
})

describe('collidePair (elastic)', () => {
  it('conserves kinetic energy on head-on collision (equal masses)', () => {
    const a = mkP(0, 0, 0, 1, 0, 0, 1, 0.05)
    const b = mkP(0.08, 0, 0, -1, 0, 0, 1, 0.05)
    const ke0 = totalKE([a, b])
    collidePair(a, b)
    const ke1 = totalKE([a, b])
    expect(ke1).toBeCloseTo(ke0, 6)
  })

  it('conserves momentum on elastic collision (equal masses)', () => {
    const a = mkP(0, 0, 0, 1, 0, 0, 1, 0.05)
    const b = mkP(0.08, 0, 0, -1, 0, 0, 1, 0.05)
    const p0 = totalMomentum([a, b])
    collidePair(a, b)
    const p1 = totalMomentum([a, b])
    expect(p1.x).toBeCloseTo(p0.x, 6)
    expect(p1.y).toBeCloseTo(p0.y, 6)
    expect(p1.z).toBeCloseTo(p0.z, 6)
  })

  it('conserves KE on unequal masses (big particle vs small)', () => {
    const big = mkP(0, 0, 0, 0, 0, 0, 30, 0.012)
    const sm = mkP(0.015, 0, 0, -2, 0, 0, 1, 0.005)
    const ke0 = totalKE([big, sm])
    collidePair(big, sm)
    const ke1 = totalKE([big, sm])
    expect(ke1).toBeCloseTo(ke0, 6)
  })

  it('does nothing if particles are not overlapping', () => {
    const a = mkP(0, 0, 0, 1, 0, 0, 1, 0.05)
    const b = mkP(0.5, 0, 0, -1, 0, 0, 1, 0.05)
    const before = { ax: a.vel.x, bx: b.vel.x }
    collidePair(a, b)
    expect(a.vel.x).toBe(before.ax)
    expect(b.vel.x).toBe(before.bx)
  })
})

describe('reflectAtWalls', () => {
  it('flips x velocity at min-x wall', () => {
    const p = mkP(-0.99, 0, 0, -1, 0.5, 0.5, 1, 0.05)
    reflectAtWalls(p, { min: { x: -1, y: -1, z: -1 }, max: { x: 1, y: 1, z: 1 } })
    expect(p.vel.x).toBeGreaterThan(0)
    expect(p.pos.x).toBeGreaterThan(-1) // pushed inside
  })

  it('flips y velocity at max-y wall', () => {
    const p = mkP(0, 0.99, 0, 0, 1, 0, 1, 0.05)
    reflectAtWalls(p, { min: { x: -1, y: -1, z: -1 }, max: { x: 1, y: 1, z: 1 } })
    expect(p.vel.y).toBeLessThan(0)
    expect(p.pos.y).toBeLessThan(1)
  })

  it('flips z velocity at max-z wall', () => {
    const p = mkP(0, 0, 0.99, 0, 0, 1, 1, 0.05)
    reflectAtWalls(p, { min: { x: -1, y: -1, z: -1 }, max: { x: 1, y: 1, z: 1 } })
    expect(p.vel.z).toBeLessThan(0)
  })
})

describe('step (integration + walls)', () => {
  it('keeps every particle inside the box after many steps', () => {
    const ps: Particle[] = []
    for (let i = 0; i < 50; i++) {
      ps.push(mkP(
        (i - 25) * 0.01, 0, 0,
        Math.sin(i) * 0.3, Math.cos(i) * 0.3, Math.cos(i * 1.3) * 0.3,
        1, 0.005,
      ))
    }
    const walls = { min: { x: -0.1, y: -0.1, z: -0.1 }, max: { x: 0.1, y: 0.1, z: 0.1 } }
    for (let f = 0; f < 600; f++) step(ps, walls, null, DT)
    for (const p of ps) {
      expect(p.pos.x).toBeGreaterThanOrEqual(walls.min.x - 1e-6)
      expect(p.pos.x).toBeLessThanOrEqual(walls.max.x + 1e-6)
      expect(p.pos.y).toBeGreaterThanOrEqual(walls.min.y - 1e-6)
      expect(p.pos.y).toBeLessThanOrEqual(walls.max.y + 1e-6)
      expect(p.pos.z).toBeGreaterThanOrEqual(walls.min.z - 1e-6)
      expect(p.pos.z).toBeLessThanOrEqual(walls.max.z + 1e-6)
    }
  })

  it('total kinetic energy stays approximately constant (no T scaling)', () => {
    const ps: Particle[] = []
    for (let i = 0; i < 30; i++) {
      ps.push(mkP(
        (i - 15) * 0.005, 0, 0,
        0.1 + (i % 3) * 0.05, 0, 0, 1, 0.003,
      ))
    }
    const walls = { min: { x: -0.1, y: -0.1, z: -0.1 }, max: { x: 0.1, y: 0.1, z: 0.1 } }
    const ke0 = totalKE(ps)
    for (let f = 0; f < 120; f++) step(ps, walls, null, DT)
    const ke1 = totalKE(ps)
    expect(ke1).toBeCloseTo(ke0, 4)
  })
})
