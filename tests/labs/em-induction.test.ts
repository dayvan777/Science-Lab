import { describe, it, expect } from 'vitest'
import { Vector3 } from 'three'
import {
  computeEMF,
  computeBulbBrightness,
  computeGalvanometerAngle,
  COIL_CENTER,
  EMF_MAX,
  BULB_THRESHOLD,
  DEFAULT_COIL_TURNS,
} from '../../src/labs/electromagnetic-induction/physics/induction'

describe('computeEMF', () => {
  it('stationary magnet inside the coil produces zero EMF', () => {
    const pos = COIL_CENTER.clone()
    const vel = new Vector3(0, 0, 0)
    expect(computeEMF(pos, vel, DEFAULT_COIL_TURNS, 1.0)).toBe(0)
  })

  it('magnet far away produces zero EMF regardless of speed', () => {
    const pos = COIL_CENTER.clone().add(new Vector3(0, 0, 1.0))  // 1 m down-axis
    const vel = new Vector3(0, 0, 10)  // very fast
    expect(computeEMF(pos, vel, DEFAULT_COIL_TURNS, 1.0)).toBe(0)
  })

  it('positive x-velocity inside coil → positive EMF', () => {
    const pos = COIL_CENTER.clone()
    const vel = new Vector3(0.5, 0, 0)
    const emf = computeEMF(pos, vel, DEFAULT_COIL_TURNS, 1.0)
    expect(emf).toBeGreaterThan(0)
  })

  it('negative x-velocity inside coil → negative EMF (Lenz)', () => {
    const pos = COIL_CENTER.clone()
    const vel = new Vector3(-0.5, 0, 0)
    const emf = computeEMF(pos, vel, DEFAULT_COIL_TURNS, 1.0)
    expect(emf).toBeLessThan(0)
  })

  it('EMF clamps at ±EMF_MAX even for very fast motion', () => {
    const pos = COIL_CENTER.clone()
    const fast = new Vector3(100, 0, 0)
    expect(computeEMF(pos, fast, DEFAULT_COIL_TURNS, 1.0)).toBe(EMF_MAX)
    expect(computeEMF(pos, new Vector3(-100, 0, 0), DEFAULT_COIL_TURNS, 1.0)).toBe(-EMF_MAX)
  })

  it('more turns → proportionally more EMF (Faraday: EMF ∝ N)', () => {
    const pos = COIL_CENTER.clone()
    // Use a moderate velocity that won't hit the EMF_MAX clamp at 20 turns
    const vel = new Vector3(0.1, 0, 0)
    const emfFew = computeEMF(pos, vel, 5, 1.0)
    const emfMany = computeEMF(pos, vel, 20, 1.0)
    // 20 turns / 5 turns = 4× scaling
    expect(emfMany).toBeCloseTo(emfFew * 4, 4)
  })

  it('stronger magnet → proportionally more EMF', () => {
    const pos = COIL_CENTER.clone()
    const vel = new Vector3(0.1, 0, 0)
    const emfNormal = computeEMF(pos, vel, DEFAULT_COIL_TURNS, 1.0)
    const emfStrong = computeEMF(pos, vel, DEFAULT_COIL_TURNS, 1.5)
    const emfWeak = computeEMF(pos, vel, DEFAULT_COIL_TURNS, 0.5)
    expect(emfStrong).toBeCloseTo(emfNormal * 1.5, 4)
    expect(emfWeak).toBeCloseTo(emfNormal * 0.5, 4)
  })
})

describe('computeBulbBrightness', () => {
  it('|EMF| below threshold → bulb dark (0)', () => {
    expect(computeBulbBrightness(0)).toBe(0)
    expect(computeBulbBrightness(BULB_THRESHOLD - 0.01)).toBe(0)
    expect(computeBulbBrightness(-(BULB_THRESHOLD - 0.01))).toBe(0)
  })

  it('|EMF| above threshold → linear ramp up to 1', () => {
    expect(computeBulbBrightness(BULB_THRESHOLD + 0.01)).toBeGreaterThan(0)
    expect(computeBulbBrightness(EMF_MAX)).toBeCloseTo(1, 1)
    expect(computeBulbBrightness(-EMF_MAX)).toBeCloseTo(1, 1)
  })
})

describe('computeGalvanometerAngle', () => {
  it('zero EMF → zero angle', () => {
    expect(computeGalvanometerAngle(0)).toBe(0)
  })

  it('full positive EMF → +60° (π/3 radians)', () => {
    expect(computeGalvanometerAngle(EMF_MAX)).toBeCloseTo(Math.PI / 3, 4)
  })

  it('full negative EMF → -60°', () => {
    expect(computeGalvanometerAngle(-EMF_MAX)).toBeCloseTo(-Math.PI / 3, 4)
  })
})
