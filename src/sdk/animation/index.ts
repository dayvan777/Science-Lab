/**
 * Linear interpolation: returns a value t-fraction of the way from a to b.
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/**
 * Clamp a value into [min, max].
 */
export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

/**
 * Cubic ease-out: starts fast, decelerates to target.
 * Use for snap animations — feels "magnetic".
 */
export function easeOutCubic(t: number): number {
  const u = 1 - t
  return 1 - u * u * u
}

/**
 * Symmetric cubic ease — slow start, fast middle, slow end.
 * Use for camera dollies.
 */
export function easeInOutCubic(t: number): number {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2
}

/**
 * Spring-damper integration step. Returns updated current and velocity.
 * Use for lever-balance beam, dynamometer hook — physical "wobble" then settle.
 *
 * Recommended params for a balance beam: stiffness=8, damping=2.5.
 */
export function springStep(args: {
  current: number
  velocity: number
  target: number
  stiffness: number
  damping: number
  dt: number
}): { current: number; velocity: number } {
  const { current, velocity, target, stiffness, damping, dt } = args
  const force = (target - current) * stiffness - velocity * damping
  const newVelocity = velocity + force * dt
  const newCurrent = current + newVelocity * dt
  return { current: newCurrent, velocity: newVelocity }
}
