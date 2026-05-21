import { useEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { Vector3 } from 'three'
import { useCameraStore } from './cameraStore'
import { TABLE_TOP_Y } from './Table'
import { dragBus } from '../physics/dragBus'

const MIN_PINCH_TRAVEL_PX = 6

type PointerSample = { x: number; y: number }

/**
 * Two-finger pinch handler. Mount once per lab inside <Canvas>.
 *
 *   - Pinch in (fingers closer) → zoomMul grows → camera retreats.
 *   - Pinch out (fingers spread) → zoomMul shrinks → camera approaches.
 *   - The initial midpoint between the two fingers is projected onto the
 *     table-top plane and set as the camera's freeFocusPoint, so the
 *     camera both zooms and re-centres on what the student is pinching.
 *
 * Drag is mutually exclusive: when a pinch is *committed* (distance
 * change exceeds MIN_PINCH_TRAVEL_PX), every active drag is cancelled
 * via dragBus so the lab object stays put instead of following the
 * camera fly-in.
 *
 * Mouse and pen pointers are ignored (pointerType !== 'touch'); the
 * existing ZoomControls cover desktop.
 *
 * Returns null — pure side-effect component.
 */
export function PinchZoomController() {
  const { camera, gl } = useThree()
  const pointers = useRef(new Map<number, PointerSample>())
  const trackedIds = useRef<[number, number] | null>(null)
  const initialMidpoint = useRef<PointerSample | null>(null)
  const initialDistance = useRef<number>(0)
  const initialZoom = useRef<number>(1)
  const committed = useRef(false)

  useEffect(() => {
    function intersectTable(clientX: number, clientY: number): Vector3 {
      const rect = gl.domElement.getBoundingClientRect()
      const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1
      const ndcY = -((clientY - rect.top) / rect.height) * 2 + 1
      const point = new Vector3(ndcX, ndcY, 0.5).unproject(camera)
      const dir = point.sub(camera.position).normalize()
      const t = -(camera.position.y - TABLE_TOP_Y) / dir.y
      return camera.position.clone().add(dir.multiplyScalar(t))
    }

    function distanceOf(): number {
      if (!trackedIds.current) return 0
      const [id1, id2] = trackedIds.current
      const a = pointers.current.get(id1)
      const b = pointers.current.get(id2)
      if (!a || !b) return 0
      return Math.hypot(a.x - b.x, a.y - b.y)
    }

    function midpointOf(): PointerSample | null {
      if (!trackedIds.current) return null
      const [id1, id2] = trackedIds.current
      const a = pointers.current.get(id1)
      const b = pointers.current.get(id2)
      if (!a || !b) return null
      return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
    }

    function resetGesture() {
      trackedIds.current = null
      initialMidpoint.current = null
      initialDistance.current = 0
      committed.current = false
    }

    function onDown(e: PointerEvent) {
      if (e.pointerType !== 'touch') return
      // Already tracking two pointers → ignore third+ touch.
      if (trackedIds.current !== null) return
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (pointers.current.size === 2) {
        const [id1, id2] = Array.from(pointers.current.keys())
        trackedIds.current = [id1, id2]
        initialMidpoint.current = midpointOf()
        initialDistance.current = distanceOf()
        initialZoom.current = useCameraStore.getState().zoomMul
        committed.current = false
        // Don't cancel drag yet — wait until the gesture actually pinches.
      }
    }

    function onMove(e: PointerEvent) {
      if (e.pointerType !== 'touch') return
      if (!pointers.current.has(e.pointerId)) return
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (!trackedIds.current) return
      // Only react if BOTH tracked pointers are still tracked.
      const [id1, id2] = trackedIds.current
      if (!pointers.current.has(id1) || !pointers.current.has(id2)) return
      const d = distanceOf()
      if (d === 0 || initialDistance.current === 0) return
      const delta = Math.abs(d - initialDistance.current)
      if (!committed.current) {
        if (delta < MIN_PINCH_TRAVEL_PX) return
        // First time the threshold is crossed — commit: cancel drags and
        // set the focal point at the INITIAL midpoint (so the focal point
        // doesn't drift as the user keeps moving fingers).
        committed.current = true
        dragBus.cancelAll()
        if (initialMidpoint.current) {
          const focal = intersectTable(initialMidpoint.current.x, initialMidpoint.current.y)
          useCameraStore.getState().setFreeFocusPoint(focal)
        }
      }
      // Pinch out (d > d0) → camera should zoom IN (zoomMul shrinks).
      const newZoom = initialZoom.current * (initialDistance.current / d)
      useCameraStore.getState().setZoomMul(newZoom)
    }

    function onUp(e: PointerEvent) {
      if (e.pointerType !== 'touch') return
      pointers.current.delete(e.pointerId)
      if (trackedIds.current) {
        const [id1, id2] = trackedIds.current
        if (e.pointerId === id1 || e.pointerId === id2) {
          // One tracked pointer lifted → end this gesture.
          resetGesture()
        }
      }
    }

    window.addEventListener('pointerdown', onDown, { passive: true })
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerup', onUp, { passive: true })
    window.addEventListener('pointercancel', onUp, { passive: true })

    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      pointers.current.clear()
      resetGesture()
    }
  }, [camera, gl])

  return null
}
