import { Vector3 } from 'three'
import { RapierRigidBody } from '@react-three/rapier'

export type SnapTarget = {
  id: string
  position: Vector3       // world position of the snap target center
  radius: number          // horizontal (X/Z) snap radius
  onAttach: (body: RapierRigidBody) => void
}

const targets = new Map<string, SnapTarget>()

export function registerSnap(target: SnapTarget) {
  targets.set(target.id, target)
  return () => { targets.delete(target.id) }
}

export function findSnapNear(pos: Vector3): SnapTarget | null {
  let best: { t: SnapTarget; d: number } | null = null
  for (const t of targets.values()) {
    const dx = pos.x - t.position.x
    const dz = pos.z - t.position.z
    const d = Math.sqrt(dx * dx + dz * dz)
    if (d <= t.radius && (!best || d < best.d)) {
      best = { t, d }
    }
  }
  return best?.t ?? null
}
