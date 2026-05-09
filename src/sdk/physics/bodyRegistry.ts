import { RapierRigidBody } from '@react-three/rapier'

/**
 * Global registry of bodies → metadata (mass, vertical half-height).
 * Allows reading mass and stacking dimensions even for kinematic bodies
 * (which don't expose mass via body.mass()).
 *
 * Also broadcasts drag-start so snap targets can release bodies that are
 * being grabbed.
 */

type BodyMeta = {
  /** Mass in kilograms. */
  massKg: number
  /** Half the vertical extent of the body's collider (radius for spheres,
   *  halfExtents.y for cuboids). Used by stacking layouts. */
  halfHeight: number
}

const meta = new Map<RapierRigidBody, BodyMeta>()
const dragStartCallbacks = new Set<(body: RapierRigidBody) => void>()

export function registerBody(
  body: RapierRigidBody,
  massKg: number,
  halfHeight: number,
) {
  meta.set(body, { massKg, halfHeight })
  return () => { meta.delete(body) }
}

export function getBodyMass(body: RapierRigidBody): number {
  return meta.get(body)?.massKg ?? 0
}

export function getBodyHalfHeight(body: RapierRigidBody): number {
  return meta.get(body)?.halfHeight ?? 0
}

export function onDragStart(callback: (body: RapierRigidBody) => void) {
  dragStartCallbacks.add(callback)
  return () => { dragStartCallbacks.delete(callback) }
}

export function notifyDragStart(body: RapierRigidBody) {
  dragStartCallbacks.forEach(cb => cb(body))
}
