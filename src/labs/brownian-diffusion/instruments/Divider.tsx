/**
 * Divider — a kinematic amber wall that students drag vertically to open
 * the box partition. The drag handle protrudes above the box top.
 *
 * SDK note: `Draggable` only supports horizontal (XZ-plane) drag via
 * `useDrag`. For the vertical (Y-axis) drag needed here we implement the
 * pointer interaction directly against a vertical XY-plane at z=boxCentre[2].
 * The RigidBody is registered with bodyRegistry (bodyId='divider') so that
 * Slice-6.3 wiring can call `findBodyByTag('divider')` to read the current
 * Y position and compute `dividerStateAt(handleY)`.
 *
 * Y-axis constraint: enforced here — X is always locked to boxCentre[0],
 * Z always locked to boxCentre[2]. Only Y changes during drag.
 */
import { useRef, useEffect, useCallback } from 'react'
import { RigidBody, CuboidCollider, RapierRigidBody } from '@react-three/rapier'
import { useThree } from '@react-three/fiber'
import { Vector3, Camera, WebGLRenderer } from 'three'
import type { ThreeEvent } from '@react-three/fiber'
import { registerBody } from '../../../sdk/physics/bodyRegistry'
import { dragBus } from '../../../sdk/physics/dragBus'
import { useStepEngine } from '../../../sdk/guided/StepEngine'
import { BOX_HALF_Y } from '../physics/divider'

const WALL_THICK = 0.004
const WALL_W = 0.18  // depth (z extent) — matches box interior 2*0.10 = 0.20 with slight clearance
const WALL_H = 0.18  // height (y extent) — matches box interior

/** Drag-plane z is fixed at box centre z — we intersect the vertical XY-plane. */
function intersectVerticalXYPlane(
  ev: ThreeEvent<PointerEvent>,
  camera: Camera,
  gl: WebGLRenderer,
  planeZ: number,
): Vector3 | null {
  const native = ev.nativeEvent
  const rect = gl.domElement.getBoundingClientRect()
  const ndcX = ((native.clientX - rect.left) / rect.width) * 2 - 1
  const ndcY = -((native.clientY - rect.top) / rect.height) * 2 + 1
  const ndc = new Vector3(ndcX, ndcY, 0.5).unproject(camera)
  const dir = ndc.sub(camera.position).normalize()
  // Intersect with plane z = planeZ → t = (planeZ - camera.z) / dir.z
  if (Math.abs(dir.z) < 1e-8) return null
  const t = (planeZ - camera.position.z) / dir.z
  return camera.position.clone().add(dir.multiplyScalar(t))
}

type Props = {
  /** Centre position of the box in world space. */
  boxCentre: [number, number, number]
  enabled: boolean
}

export function Divider({ boxCentre, enabled }: Props) {
  const ref = useRef<RapierRigidBody>(null)
  const { camera, gl } = useThree()

  // Drag state
  const isDragging = useRef(false)
  const pointerId = useRef<number | null>(null)
  const currentY = useRef(boxCentre[1])
  const dragOffsetY = useRef(0) // world-Y under pointer at drag start minus body Y

  // Register body in bodyRegistry so findBodyByTag('divider') works for Slice 6.3.
  useEffect(() => {
    let cancelled = false
    let unregister: (() => void) | null = null
    const halfH = WALL_H / 2
    const massKg = 0.5 / 1000
    const tryRegister = () => {
      if (cancelled) return
      if (ref.current) {
        unregister = registerBody(ref.current, massKg, halfH, 'divider')
      } else {
        requestAnimationFrame(tryRegister)
      }
    }
    tryRegister()
    return () => {
      cancelled = true
      unregister?.()
    }
  }, [])

  // Cancel any in-flight divider drag when a pinch gesture begins.
  // Mirrors the dragBus.onCancel pattern from sdk/physics/useDrag.ts.
  useEffect(() => {
    return dragBus.onCancel(() => {
      if (!isDragging.current) return
      const pid = pointerId.current
      isDragging.current = false
      pointerId.current = null
      useStepEngine.getState().setDragging(null)
      // Release pointer capture so the browser doesn't keep routing events here.
      if (pid !== null) {
        try {
          gl.domElement.releasePointerCapture(pid)
        } catch {
          // Element may no longer hold capture — safe to ignore.
        }
      }
    })
  }, [gl])

  const applyPosition = useCallback((y: number) => {
    if (!ref.current) return
    currentY.current = y
    ref.current.setNextKinematicTranslation({
      x: boxCentre[0],
      y,
      z: boxCentre[2],
    })
  }, [boxCentre])

  const onPointerDown = (ev: ThreeEvent<PointerEvent>) => {
    if (!enabled) return
    if (ev.pointerType === 'mouse' && ev.nativeEvent.buttons === 0) return
    ev.stopPropagation()
    isDragging.current = true
    pointerId.current = ev.pointerId
    useStepEngine.getState().setDragging('divider')
    ;(ev.target as Element).setPointerCapture(ev.pointerId)
    // Record the Y offset so the handle doesn't jump on first move.
    const hit = intersectVerticalXYPlane(ev, camera, gl, boxCentre[2])
    if (hit) {
      dragOffsetY.current = currentY.current - hit.y
    }
  }

  const onPointerMove = (ev: ThreeEvent<PointerEvent>) => {
    if (!isDragging.current || ev.pointerId !== pointerId.current) return
    const hit = intersectVerticalXYPlane(ev, camera, gl, boxCentre[2])
    if (!hit) return
    // Only Y changes; clamp so the handle cannot go below the box floor.
    const rawY = hit.y + dragOffsetY.current
    const minY = boxCentre[1] - BOX_HALF_Y         // flush with box floor
    const maxY = boxCentre[1] + BOX_HALF_Y + 0.12  // ~12 cm above box top (fully removed)
    applyPosition(Math.max(minY, Math.min(maxY, rawY)))
  }

  const onPointerUp = (ev: ThreeEvent<PointerEvent>) => {
    if (ev.pointerId !== pointerId.current) return
    isDragging.current = false
    pointerId.current = null
    useStepEngine.getState().setDragging(null)
    ;(ev.target as Element).releasePointerCapture(ev.pointerId)
  }

  // Initial Y: wall starts at box centre Y (fully inserted).
  const initY = boxCentre[1]

  return (
    <RigidBody
      ref={ref}
      colliders={false}
      position={[boxCentre[0], initY, boxCentre[2]]}
      type="kinematicPosition"
    >
      <CuboidCollider
        args={[WALL_THICK / 2, WALL_H / 2, WALL_W / 2]}
        sensor
      />

      {/* Interactive group — pointer events applied to the drag handle */}
      <group
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        {/* Vertical amber wall */}
        <mesh>
          <boxGeometry args={[WALL_THICK, WALL_H, WALL_W]} />
          <meshStandardMaterial
            color="#ffce4d"
            transparent
            opacity={0.55}
            roughness={0.3}
          />
        </mesh>

        {/* Cylindrical drag handle protruding above the box top */}
        <mesh position={[0, BOX_HALF_Y + 0.04, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.06, 16]} />
          <meshStandardMaterial color="#ff9b3d" roughness={0.4} />
        </mesh>

        {/* Slightly larger invisible hit target on the handle for easier grabbing */}
        <mesh position={[0, BOX_HALF_Y + 0.04, 0]} visible={false}>
          <cylinderGeometry args={[0.025, 0.025, 0.08, 8]} />
          <meshStandardMaterial />
        </mesh>
      </group>
    </RigidBody>
  )
}
