import { RapierRigidBody } from '@react-three/rapier'

/**
 * Global registry of bodies → metadata (mass, vertical half-height, optional tag).
 * Allows reading mass and stacking dimensions even for kinematic bodies
 * (which don't expose mass via body.mass()).
 *
 * Also broadcasts drag-start so snap targets can release bodies that are
 * being grabbed.
 *
 * The `bodyId` tag (e.g. 'tennis-ball', 'apple', 'weight-100 г') lets
 * external systems (demo mode, scripted walk-throughs, debug tools) look
 * up specific bodies without holding refs.
 */

type BodyMeta = {
  /** Mass in kilograms. */
  massKg: number
  /** Half the vertical extent of the body's collider (radius for spheres,
   *  halfExtents.y for cuboids). Used by stacking layouts. */
  halfHeight: number
  /** Optional tag matching the bodyId prop on Draggable. */
  bodyId?: string
}

const meta = new Map<RapierRigidBody, BodyMeta>()
const dragStartCallbacks = new Set<(body: RapierRigidBody) => void>()

export function registerBody(
  body: RapierRigidBody,
  massKg: number,
  halfHeight: number,
  bodyId?: string,
) {
  meta.set(body, { massKg, halfHeight, bodyId })
  return () => { meta.delete(body) }
}

export function getBodyMass(body: RapierRigidBody): number {
  return meta.get(body)?.massKg ?? 0
}

export function getBodyHalfHeight(body: RapierRigidBody): number {
  return meta.get(body)?.halfHeight ?? 0
}

/**
 * Find the FIRST registered body whose bodyId matches the given tag.
 * Returns null if no body matches. Iteration order is insertion order
 * (Map preserves it).
 */
export function findBodyByTag(tag: string): RapierRigidBody | null {
  for (const [body, m] of meta.entries()) {
    if (m.bodyId === tag) return body
  }
  return null
}

/**
 * Find ALL registered bodies whose bodyId starts with the given prefix.
 * Useful for groups (e.g. all weights via 'weight-' prefix).
 */
export function findBodiesByPrefix(prefix: string): RapierRigidBody[] {
  const out: RapierRigidBody[] = []
  for (const [body, m] of meta.entries()) {
    if (m.bodyId?.startsWith(prefix)) out.push(body)
  }
  return out
}

export function onDragStart(callback: (body: RapierRigidBody) => void) {
  dragStartCallbacks.add(callback)
  return () => { dragStartCallbacks.delete(callback) }
}

export function notifyDragStart(body: RapierRigidBody) {
  dragStartCallbacks.forEach(cb => cb(body))
}
