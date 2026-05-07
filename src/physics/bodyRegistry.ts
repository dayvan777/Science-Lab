import { RapierRigidBody } from '@react-three/rapier'

/**
 * Global registry of bodies → mass. Allows reading mass even for kinematic bodies.
 * Also broadcasts drag-start so snap targets can release bodies that are being grabbed.
 */

const massMap = new Map<RapierRigidBody, number>()
const dragStartCallbacks = new Set<(body: RapierRigidBody) => void>()

export function registerBody(body: RapierRigidBody, massKg: number) {
  massMap.set(body, massKg)
  return () => { massMap.delete(body) }
}

export function getBodyMass(body: RapierRigidBody): number {
  return massMap.get(body) ?? 0
}

export function onDragStart(callback: (body: RapierRigidBody) => void) {
  dragStartCallbacks.add(callback)
  return () => { dragStartCallbacks.delete(callback) }
}

export function notifyDragStart(body: RapierRigidBody) {
  dragStartCallbacks.forEach(cb => cb(body))
}
