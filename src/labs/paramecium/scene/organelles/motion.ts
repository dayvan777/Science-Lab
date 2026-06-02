import { Color } from 'three'

/** Smooth Hermite step: 0 below edge0, 1 above edge1, eased between. */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  if (edge0 === edge1) return x < edge0 ? 0 : 1
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

const PUMP_BASE = 0.7, PUMP_MAX = 1.15, PUMP_MIN = 0.6

/**
 * Contractile-vacuole scale over time: slow fill → fast contraction → recover.
 * Returns a scale multiplier in [PUMP_MIN, PUMP_MAX]. `phase` in turns (0..1).
 */
export function pumpScale(t: number, period = 3.4, phase = 0): number {
  const u = (((t / period + phase) % 1) + 1) % 1
  if (u < 0.72) return PUMP_BASE + (PUMP_MAX - PUMP_BASE) * smoothstep(0, 0.72, u)
  if (u < 0.86) return PUMP_MAX + (PUMP_MIN - PUMP_MAX) * smoothstep(0.72, 0.86, u)
  return PUMP_MIN + (PUMP_BASE - PUMP_MIN) * smoothstep(0.86, 1, u)
}

/**
 * Food-vacuole position on a tilted ring inside the cytoplasm (cyclosis).
 * Cell-local frame; bounded to stay inside the (A,B,C) ellipsoid.
 */
export function cyclosisPos(t: number, i: number, count: number, period = 18): [number, number, number] {
  const frac = (((t / period + i / Math.max(1, count)) % 1) + 1) % 1
  const a = frac * Math.PI * 2
  const rx = 0.7, ry = 0.34, tilt = 0.4
  const cx = 0.05, cy = -0.05, cz = 0
  const py0 = ry * Math.sin(a)
  return [cx + rx * Math.cos(a), cy + py0 * Math.cos(tilt), cz + py0 * Math.sin(tilt)]
}

const FRESH = new Color('#a7c46a')
const DIGESTED = new Color('#5f4a2c')

/** Food colour by digestion progress: fresh green (0) → digested brown (1). */
export function digestColor(progress: number): Color {
  const p = Math.min(1, Math.max(0, progress))
  return new Color().copy(FRESH).lerp(DIGESTED, p)
}

/** n roughly-even unit points on a sphere (fibonacci spiral). */
export function fibSphere(n: number): [number, number, number][] {
  const out: [number, number, number][] = []
  const golden = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < n; i++) {
    const y = n === 1 ? 0 : 1 - (i / (n - 1)) * 2
    const r = Math.sqrt(Math.max(0, 1 - y * y))
    const th = golden * i
    out.push([Math.cos(th) * r, y, Math.sin(th) * r])
  }
  return out
}
