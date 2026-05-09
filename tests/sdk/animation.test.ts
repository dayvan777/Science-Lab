import { describe, it, expect } from 'vitest'
import { lerp, clamp, easeOutCubic, easeInOutCubic, springStep } from '../../src/sdk/animation/index'

describe('lerp', () => {
  it('returns start when t=0', () => {
    expect(lerp(10, 20, 0)).toBe(10)
  })
  it('returns end when t=1', () => {
    expect(lerp(10, 20, 1)).toBe(20)
  })
  it('returns midpoint when t=0.5', () => {
    expect(lerp(10, 20, 0.5)).toBe(15)
  })
})

describe('clamp', () => {
  it('returns value when in range', () => {
    expect(clamp(5, 0, 10)).toBe(5)
  })
  it('clamps to min', () => {
    expect(clamp(-3, 0, 10)).toBe(0)
  })
  it('clamps to max', () => {
    expect(clamp(15, 0, 10)).toBe(10)
  })
})

describe('easeOutCubic', () => {
  it('returns 0 at t=0', () => {
    expect(easeOutCubic(0)).toBe(0)
  })
  it('returns 1 at t=1', () => {
    expect(easeOutCubic(1)).toBe(1)
  })
  it('is past 0.5 at t=0.5 (front-loaded)', () => {
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5)
  })
})

describe('easeInOutCubic', () => {
  it('returns 0 at t=0', () => {
    expect(easeInOutCubic(0)).toBe(0)
  })
  it('returns 1 at t=1', () => {
    expect(easeInOutCubic(1)).toBe(1)
  })
  it('returns 0.5 at t=0.5 (symmetric)', () => {
    expect(easeInOutCubic(0.5)).toBe(0.5)
  })
})

describe('springStep', () => {
  it('does not move when at target with zero velocity', () => {
    const result = springStep({ current: 5, velocity: 0, target: 5, stiffness: 8, damping: 2.5, dt: 0.016 })
    expect(result.current).toBeCloseTo(5, 5)
    expect(result.velocity).toBeCloseTo(0, 5)
  })

  it('moves toward target', () => {
    const result = springStep({ current: 0, velocity: 0, target: 10, stiffness: 8, damping: 2.5, dt: 0.016 })
    expect(result.current).toBeGreaterThan(0)
    expect(result.current).toBeLessThan(10)
    expect(result.velocity).toBeGreaterThan(0)
  })

  it('eventually settles within tolerance', () => {
    let s = { current: 0, velocity: 0 }
    for (let i = 0; i < 1000; i++) {
      const r = springStep({ ...s, target: 10, stiffness: 8, damping: 2.5, dt: 0.016 })
      s = { current: r.current, velocity: r.velocity }
    }
    expect(Math.abs(s.current - 10)).toBeLessThan(0.01)
    expect(Math.abs(s.velocity)).toBeLessThan(0.01)
  })
})
