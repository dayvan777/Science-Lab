import { useRef, useCallback, RefObject } from 'react'
import { ThreeEvent, useThree } from '@react-three/fiber'
import { Vector3 } from 'three'
import { RapierRigidBody } from '@react-three/rapier'
import { RigidBodyType } from '@dimforge/rapier3d-compat'
import { findSnapNear } from './snapTargets'
import { useStepEngine } from '../../guided/StepEngine'

const DRAG_HEIGHT = 1.0
const SMOOTHING = 0.3

type Props = { rigidBody: RefObject<RapierRigidBody | null>; bodyId?: string }

export function useDrag({ rigidBody, bodyId }: Props) {
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
    const t = -(camera.position.y - DRAG_HEIGHT) / dir.y
    return camera.position.clone().add(dir.multiplyScalar(t))
  }, [camera, gl])

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
    if (rigidBody.current) {
      // Restore solid collider before resolving snap/drop
      const n = rigidBody.current.numColliders()
      for (let i = 0; i < n; i++) {
        rigidBody.current.collider(i).setSensor(false)
      }
      const t = rigidBody.current.translation()
      const snap = findSnapNear(new Vector3(t.x, t.y, t.z), bodyId)
      if (snap) {
        setLastSnap(snap.id)
        snap.onAttach(rigidBody.current)
        // If keepKinematic, body stays kinematic after snap (anchored to snap point)
        if (!snap.keepKinematic) {
          rigidBody.current.setBodyType(RigidBodyType.Dynamic, true)
        }
      } else {
        rigidBody.current.setBodyType(RigidBodyType.Dynamic, true)
      }
    }
    ;(ev.target as Element).releasePointerCapture(ev.pointerId)
  }

  return { onPointerDown, onPointerMove, onPointerUp }
}
