import { Vector3 } from 'three'
import { RapierRigidBody } from '@react-three/rapier'

export type SnapTarget = {
  id: string
  position: Vector3
  radius: number
  onAttach: (body: RapierRigidBody) => void
}

const targets = new Map<string, SnapTarget>()

export function registerSnap(target: SnapTarget) {
  targets.set(target.id, target)
  return () => { targets.delete(target.id) }
}

export function findSnapNear(pos: Vector3): SnapTarget | null {
  for (const t of targets.values()) {
    if (pos.distanceTo(t.position) <= t.radius) return t
  }
  return null
}
