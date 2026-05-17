import { useRef, useCallback, RefObject } from 'react'
import { ThreeEvent, useThree } from '@react-three/fiber'
import { Vector3 } from 'three'
import { RapierRigidBody } from '@react-three/rapier'
import { RigidBodyType } from '@dimforge/rapier3d-compat'
import { findSnapNear, snapProgress } from './snapTargets'
import { useStepEngine } from '../../sdk/guided/StepEngine'
import { clamp } from '../animation'

const SMOOTHING = 0.3
// Drag bounds — keep dragged objects within the table footprint so the user
// cannot accidentally drop something off the edge and lose it. Default values
// match the mass-measurement lab table (2.5m × 1.2m). For multi-lab use later,
// these can become a hook prop or context-driven config.
const DRAG_MIN_X = -1.15
const DRAG_MAX_X = 1.15
const DRAG_MIN_Z = -0.5
const DRAG_MAX_Z = 0.5

/**
 * Optional drag-time constraint. When passed via `dragCorridor`, the
 * drag handler forces the target z to `center.z` whenever the target's
 * x falls within `±halfLength` of `center.x`. Used by EM-induction's
 * bar magnet so it can only enter the coil through the bore axis.
 *
 * Generic enough to reuse for any future "thread through a tube"
 * interaction; opt-in via the optional `dragCorridor` prop.
 */
export type DragCorridor = {
  /** World position of the corridor's centre. */
  center: Vector3
  /** Half-length of the corridor along the world x-axis. */
  halfLength: number
}

function animateMagneticSnap(
  body: RapierRigidBody,
  from: Vector3,
  to: Vector3,
  durationMs: number,
  done: () => void,
): void {
  const start = performance.now()
  const step = () => {
    const elapsed = performance.now() - start
    const u = snapProgress(elapsed, durationMs)
    const x = from.x + (to.x - from.x) * u
    const y = from.y + (to.y - from.y) * u
    const z = from.z + (to.z - from.z) * u
    try {
      body.setNextKinematicTranslation({ x, y, z })
    } catch {
      return // body destroyed
    }
    if (u >= 1) {
      try { done() } catch {}
      return
    }
    requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

type Props = {
  rigidBody: RefObject<RapierRigidBody | null>
  bodyId?: string
  /** Y-plane the dragged body slides on during drag. Default 1.0 — floats
   *  objects above the table for visibility. Labs whose interaction needs
   *  the dragged body to align with another object's geometry (e.g. the
   *  EM-induction bar magnet passing through the coil's bore at y=0.95)
   *  pass an explicit value. */
  dragHeight?: number
  /** Optional corridor that constrains drag z when the object enters
   *  the corridor's x-extent. Used in EM-induction so the bar magnet
   *  can only enter the coil through its bore axis. */
  dragCorridor?: DragCorridor
}

export function useDrag({ rigidBody, bodyId, dragHeight = 1.0, dragCorridor }: Props) {
  const { camera, gl } = useThree()
  const target = useRef(new Vector3())
  const isDragging = useRef(false)
  const pointerId = useRef<number | null>(null)
  const setLastSnap = useStepEngine.getState().setLastSnap

  const intersectPlane = useCallback((ev: ThreeEvent<PointerEvent>) => {
    const native = ev.nativeEvent
    const rect = gl.domElement.getBoundingClientRect()
    const x = ((native.clientX - rect.left) / rect.width) * 2 - 1
    const y = -((native.clientY - rect.top) / rect.height) * 2 + 1
    const ndc = new Vector3(x, y, 0.5).unproject(camera)
    const dir = ndc.sub(camera.position).normalize()
    const t = -(camera.position.y - dragHeight) / dir.y
    return camera.position.clone().add(dir.multiplyScalar(t))
  }, [camera, gl, dragHeight])

  const onPointerDown = (ev: ThreeEvent<PointerEvent>) => {
    // Filter: for mouse pointers, require an actual button press (prevents hover-induced drags)
    if (ev.pointerType === 'mouse' && (ev as unknown as { buttons: number }).buttons === 0) return
    if (!rigidBody.current) return
    ev.stopPropagation()
    isDragging.current = true
    pointerId.current = ev.pointerId
    rigidBody.current.setBodyType(RigidBodyType.KinematicPositionBased, true)
    rigidBody.current.setAngvel({ x: 0, y: 0, z: 0 }, true)
    // Make collider a sensor during drag so dragged body passes through other objects
    // without launching them (kinematic→dynamic collisions otherwise apply huge impulses).
    const n = rigidBody.current.numColliders()
    for (let i = 0; i < n; i++) {
      rigidBody.current.collider(i).setSensor(true)
    }
    target.current.copy(intersectPlane(ev))
    ;(ev.target as Element).setPointerCapture(ev.pointerId)
  }

  const onPointerMove = (ev: ThreeEvent<PointerEvent>) => {
    if (!isDragging.current || ev.pointerId !== pointerId.current) return
    const next = intersectPlane(ev)
    target.current.lerp(next, SMOOTHING)
    // Clamp drag position to within table bounds — prevents user from
    // dragging objects off the edge where they'd fall and become unreachable.
    target.current.x = clamp(target.current.x, DRAG_MIN_X, DRAG_MAX_X)
    target.current.z = clamp(target.current.z, DRAG_MIN_Z, DRAG_MAX_Z)
    // Drag-corridor constraint — when enabled by the consumer, forces z
    // to the corridor's axis while inside the corridor's x-extent. Used
    // in EM-induction so the bar magnet can only enter the coil through
    // its bore axis, never clipping through the helical wire mesh.
    if (dragCorridor) {
      const dx = target.current.x - dragCorridor.center.x
      if (Math.abs(dx) < dragCorridor.halfLength) {
        target.current.z = dragCorridor.center.z
      }
    }
    if (rigidBody.current) {
      rigidBody.current.setNextKinematicTranslation({
        x: target.current.x,
        y: target.current.y,
        z: target.current.z,
      })
    }
  }

  const onPointerUp = (ev: ThreeEvent<PointerEvent>) => {
    if (ev.pointerId !== pointerId.current) return
    isDragging.current = false
    pointerId.current = null
    ;(ev.target as Element).releasePointerCapture(ev.pointerId)
    if (!rigidBody.current) return
    // Restore solid collider before resolving snap/drop
    const n = rigidBody.current.numColliders()
    for (let i = 0; i < n; i++) {
      rigidBody.current.collider(i).setSensor(false)
    }
    const t = rigidBody.current.translation()
    const dropPos = new Vector3(t.x, t.y, t.z)
    const snap = findSnapNear(dropPos, bodyId)
    if (!snap) {
      rigidBody.current.setBodyType(RigidBodyType.Dynamic, true)
      return
    }
    // Magnetic-pull tween: kinematic body walked from dropPos to snap.position over 300ms.
    setLastSnap(snap.id)
    animateMagneticSnap(rigidBody.current, dropPos, snap.position, 300, () => {
      if (!rigidBody.current) return
      snap.onAttach(rigidBody.current)
      if (!snap.keepKinematic) {
        rigidBody.current.setBodyType(RigidBodyType.Dynamic, true)
      }
    })
  }

  return { onPointerDown, onPointerMove, onPointerUp }
}
