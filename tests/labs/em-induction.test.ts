import { describe, it, expect } from 'vitest'
import { Vector3 } from 'three'
import {
  computeEMF,
  computeBulbBrightness,
  computeGalvanometerAngle,
  COIL_CENTER,
  EMF_MAX,
  BULB_THRESHOLD,
} from '../../src/labs/electromagnetic-induction/physics/induction'

describe('computeEMF', () => {
  it('stationary magnet inside the coil produces zero EMF', () => {
    const pos = COIL_CENTER.clone()
    const vel = new Vector3(0, 0, 0)
    expect(computeEMF(pos, vel)).toBe(0)
  })

  it('magnet far away produces zero EMF regardless of speed', () => {
    const pos = COIL_CENTER.clone().add(new Vector3(0, 0, 1.0))  // 1 m down-axis
    const vel = new Vector3(0, 0, 10)  // very fast
    expect(computeEMF(pos, vel)).toBe(0)
  })

  it('positive z-velocity inside coil → positive EMF', () => {
    const pos = COIL_CENTER.clone()
    const vel = new Vector3(0, 0, 0.5)
    const emf = computeEMF(pos, vel)
    expect(emf).toBeGreaterThan(0)
  })

  it('negative z-velocity inside coil → negative EMF (Lenz)', () => {
    const pos = COIL_CENTER.clone()
    const vel = new Vector3(0, 0, -0.5)
    const emf = computeEMF(pos, vel)
    expect(emf).toBeLessThan(0)
  })

  it('EMF clamps at ±EMF_MAX even for very fast motion', () => {
    const pos = COIL_CENTER.clone()
    const fast = new Vector3(0, 0, 100)
    expect(computeEMF(pos, fast)).toBe(EMF_MAX)
    expect(computeEMF(pos, new Vector3(0, 0, -100))).toBe(-EMF_MAX)
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
