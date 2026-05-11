import { Vector3 } from 'three'

/**
 * World position of the coil's centre. The lab's LabScene mounts the coil
 * at this point and the physics functions consume this constant directly.
 */
export const COIL_CENTER = new Vector3(-0.05, 0.95, 0)

/**
 * Coil axis — magnetic flux through the coil is the component of the
 * magnet's velocity along this direction. Coil's bore is oriented along z
 * so the student drags the magnet toward/away from the camera.
 */
export const COIL_AXIS = new Vector3(0, 0, 1)

/** Outside this radius, the magnet has no effect on the coil. */
export const INFLUENCE_RADIUS = 0.18

/** Tuning constant — converts m/s into galvanometer-scale units. */
const EMF_GAIN = 12.0

/** Galvanometer needle scale extends ±EMF_MAX. */
export const EMF_MAX = 5.0

/** |EMF| below this threshold → bulb stays dark. */
export const BULB_THRESHOLD = 1.5

/** |EMF| at this point → bulb at maximum brightness. */
export const BULB_MAX = 4.5

/**
 * EMF induced in the coil by the moving magnet, in arbitrary units
 * matched to the ±EMF_MAX galvanometer scale.
 *
 * Faraday's law in qualitative form: EMF ∝ rate of flux change. Here
 * we approximate rate of flux change as (velocity-along-axis) × proximity,
 * which captures the two effects we want to teach:
 *
 *   1. Stationary magnet (any position) → velAlongAxis = 0 → EMF = 0.
 *      Even at coil centre with proximity = 1, no motion means no current.
 *
 *   2. Magnet far from coil (distance > INFLUENCE_RADIUS) → proximity = 0
 *      → EMF = 0, regardless of how fast it moves.
 *
 *   3. Reversed motion direction → velAlongAxis sign flips → EMF sign
 *      flips → galvanometer needle deflects the other way (Lenz).
 */
export function computeEMF(magnetPos: Vector3, magnetVel: Vector3): number {
  const offset = new Vector3().subVectors(magnetPos, COIL_CENTER)
  const distance = offset.length()
  if (distance > INFLUENCE_RADIUS) return 0
  // Proximity factor: 1 at the centre, smoothly tapering to 0 at the edge
  const t = distance / INFLUENCE_RADIUS
  const proximity = 1 - t * t
  // Velocity component along coil axis (positive = entering from -z, negative = leaving)
  const velAlongAxis = magnetVel.dot(COIL_AXIS)
  const emf = EMF_GAIN * velAlongAxis * proximity
  return Math.max(-EMF_MAX, Math.min(EMF_MAX, emf))
}

/**
 * Bulb brightness 0..1 from the absolute EMF magnitude. Threshold below
 * which the bulb is dark — this is the pedagogical hook: slow motion ⇒
 * small EMF ⇒ below threshold ⇒ bulb dark, even though current is non-zero.
 */
export function computeBulbBrightness(emf: number): number {
  const abs = Math.abs(emf)
  if (abs <= BULB_THRESHOLD) return 0
  return Math.min(1, (abs - BULB_THRESHOLD) / (BULB_MAX - BULB_THRESHOLD))
}

/**
 * Galvanometer needle angle in radians. 0 = vertical (centred at "0").
 * Positive EMF → needle rotates clockwise toward "+5" on the right.
 * Negative EMF → counter-clockwise toward "-5" on the left.
 */
export function computeGalvanometerAngle(emf: number): number {
  const MAX_ANGLE = Math.PI / 3  // ±60° from vertical
  return (emf / EMF_MAX) * MAX_ANGLE
}
