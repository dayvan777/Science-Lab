import { Vector3 } from 'three'
import { RapierRigidBody } from '@react-three/rapier'

export type SnapTarget = {
  id: string
  instrumentId: 'digital-scale' | 'lever-balance' | 'dynamometer'
  position: Vector3       // world position of the snap target center
  radius: number          // horizontal (X/Z) snap radius
  onAttach: (body: RapierRigidBody) => void
  keepKinematic?: boolean // if true, body stays kinematic after snap (anchored to snap point)
}

const targets = new Map<string, SnapTarget>()
let activeInstrumentId: string | null = null

export function setActiveInstrument(id: string | null) {
  activeInstrumentId = id
}

export function registerSnap(target: SnapTarget) {
  targets.set(target.id, target)
  return () => { targets.delete(target.id) }
}

export function findSnapNear(pos: Vector3, draggedBodyId?: string): SnapTarget | null {
  let best: { t: SnapTarget; d: number } | null = null
  for (const t of targets.values()) {
    // Skip if not the active instrument
    if (activeInstrumentId !== null && t.instrumentId !== activeInstrumentId) {
      // Allow weights to snap to lever-balance even if active instrument is lever-balance
      // (weights are always usable when lever-balance task is active)
      const isWeight = draggedBodyId?.startsWith('weight-') ?? false
      if (!(isWeight && t.instrumentId === 'lever-balance')) {
        continue
      }
    }
    const dx = pos.x - t.position.x
    const dz = pos.z - t.position.z
    const d = Math.sqrt(dx * dx + dz * dz)
    if (d <= t.radius && (!best || d < best.d)) {
      best = { t, d }
    }
  }
  return best?.t ?? null
}
