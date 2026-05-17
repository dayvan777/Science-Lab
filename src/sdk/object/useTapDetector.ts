import { useRef } from 'react'
import type { ThreeEvent } from '@react-three/fiber'

const TAP_MOVE_THRESHOLD_PX = 8
const TAP_MAX_DURATION_MS = 250

/**
 * Detects a tap (quick stationary pointer-down → pointer-up) on a mesh
 * or group. Returns `onPointerDown` and `onPointerUp` handlers to spread
 * onto the target.
 *
 * Used by non-draggable EM-induction instruments (Coil, Bulb,
 * Galvanometer) so the student can tap any of them to focus the camera.
 * Same tap heuristic as `useDrag` (8 px / 250 ms).
 */
export function useTapDetector(onTap: () => void) {
  const startTime = useRef<number | null>(null)
  const startX = useRef(0)
  const startY = useRef(0)

  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    startTime.current = performance.now()
    startX.current = e.nativeEvent.clientX
    startY.current = e.nativeEvent.clientY
  }

  const onPointerUp = (e: ThreeEvent<PointerEvent>) => {
    const t = startTime.current
    if (t === null) return
    const dt = performance.now() - t
    const dx = Math.abs(e.nativeEvent.clientX - startX.current)
    const dy = Math.abs(e.nativeEvent.clientY - startY.current)
    startTime.current = null
    if (dt < TAP_MAX_DURATION_MS && dx < TAP_MOVE_THRESHOLD_PX && dy < TAP_MOVE_THRESHOLD_PX) {
      onTap()
    }
  }

  return { onPointerDown, onPointerUp }
}
