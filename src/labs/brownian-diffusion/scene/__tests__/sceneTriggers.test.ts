import { describe, it, expect } from 'vitest'

/**
 * Pure spatial bounds check — the same logic used by LabScene's onTick
 * handler to decide whether the pollen is inside the glass box.
 */
function isInsideBox(
  pos: { x: number; y: number; z: number },
  boxCentre: [number, number, number],
  halfExtent: number,
): boolean {
  return (
    Math.abs(pos.x - boxCentre[0]) < halfExtent &&
    Math.abs(pos.y - boxCentre[1]) < halfExtent &&
    Math.abs(pos.z - boxCentre[2]) < halfExtent
  )
}

describe('pollen-in-box detection', () => {
  it('detects point at exact centre', () => {
    expect(isInsideBox({ x: 0, y: 0.95, z: 0 }, [0, 0.95, 0], 0.10)).toBe(true)
  })

  it('rejects point outside on x axis', () => {
    expect(isInsideBox({ x: 0.20, y: 0.95, z: 0 }, [0, 0.95, 0], 0.10)).toBe(false)
  })

  it('detects point just inside the boundary', () => {
    expect(isInsideBox({ x: 0.09, y: 0.95, z: 0 }, [0, 0.95, 0], 0.10)).toBe(true)
  })

  it('rejects point exactly on the boundary (strict less-than)', () => {
    expect(isInsideBox({ x: 0.10, y: 0.95, z: 0 }, [0, 0.95, 0], 0.10)).toBe(false)
  })

  it('rejects point outside on y axis', () => {
    expect(isInsideBox({ x: 0, y: 1.20, z: 0 }, [0, 0.95, 0], 0.10)).toBe(false)
  })

  it('rejects point outside on z axis', () => {
    expect(isInsideBox({ x: 0, y: 0.95, z: -0.15 }, [0, 0.95, 0], 0.10)).toBe(false)
  })
})
