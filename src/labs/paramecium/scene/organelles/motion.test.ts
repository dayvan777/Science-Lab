import { describe, it, expect } from 'vitest'
import { Color } from 'three'
import { smoothstep, pumpScale, cyclosisPos, digestColor, fibSphere } from './motion'
import { A, B, C } from '../life'

describe('smoothstep', () => {
  it('clamps and eases', () => {
    expect(smoothstep(0, 1, -1)).toBe(0)
    expect(smoothstep(0, 1, 2)).toBe(1)
    expect(smoothstep(0, 1, 0.5)).toBeCloseTo(0.5, 5)
  })
})

describe('pumpScale', () => {
  const P = 3.4
  it('rests near base at u=0 and is periodic', () => {
    expect(pumpScale(0, P)).toBeCloseTo(0.7, 5)
    expect(pumpScale(1.1, P)).toBeCloseTo(pumpScale(1.1 + P, P), 5)
  })
  it('peaks at the fill/contract boundary and bottoms after contraction', () => {
    expect(pumpScale(0.72 * P, P)).toBeCloseTo(1.15, 4)
    expect(pumpScale(0.86 * P, P)).toBeCloseTo(0.6, 4)
  })
  it('stays within bounds across the cycle', () => {
    for (let i = 0; i < 200; i++) {
      const v = pumpScale((i / 200) * P, P)
      expect(v).toBeGreaterThanOrEqual(0.6 - 1e-6)
      expect(v).toBeLessThanOrEqual(1.15 + 1e-6)
    }
  })
  it('phase shifts equal time shifts', () => {
    expect(pumpScale(0.3, P, 0.5)).toBeCloseTo(pumpScale(0.3 + 0.5 * P, P, 0), 5)
  })
})

describe('cyclosisPos', () => {
  it('returns a 3-tuple and is periodic', () => {
    const a = cyclosisPos(1, 0, 4)
    expect(a).toHaveLength(3)
    const b = cyclosisPos(1 + 18, 0, 4)
    a.forEach((v, k) => expect(v).toBeCloseTo(b[k], 5))
  })
  it('stays inside the cell ellipsoid', () => {
    for (let i = 0; i < 120; i++) {
      const [x, y, z] = cyclosisPos(i * 0.37, i % 4, 4)
      expect((x / A) ** 2 + (y / B) ** 2 + (z / C) ** 2).toBeLessThan(1)
    }
  })
  it('separates vacuoles by index', () => {
    expect(cyclosisPos(0, 0, 4)[0]).not.toBeCloseTo(cyclosisPos(0, 1, 4)[0], 3)
  })
})

describe('digestColor', () => {
  it('runs fresh→digested and clamps', () => {
    expect(digestColor(0).getHexString()).toBe(new Color('#a7c46a').getHexString())
    expect(digestColor(1).getHexString()).toBe(new Color('#5f4a2c').getHexString())
    expect(digestColor(-5).getHexString()).toBe(new Color('#a7c46a').getHexString())
    expect(digestColor(5).getHexString()).toBe(new Color('#5f4a2c').getHexString())
  })
  it('midpoint sits between the endpoints', () => {
    const fresh = new Color('#a7c46a'), dig = new Color('#5f4a2c'), m = digestColor(0.5)
    expect(m.r).toBeLessThan(fresh.r)
    expect(m.r).toBeGreaterThan(dig.r)
  })
})

describe('fibSphere', () => {
  it('returns n unit-length points', () => {
    const pts = fibSphere(30)
    expect(pts).toHaveLength(30)
    for (const [x, y, z] of pts) expect(Math.hypot(x, y, z)).toBeCloseTo(1, 6)
  })
  it('handles n=1', () => {
    expect(fibSphere(1)).toHaveLength(1)
  })
})
