/**
 * InkDropper — a glass pipette the student drags over the beaker and releases
 * to drop ink into the water.
 *
 * Drop detection: subscribes to the full StepEngine store via
 * `useStepEngine.subscribe((newState, oldState) => {...})`.
 * When draggingBodyId transitions from 'dropper' → null (drag end), reads
 * the dropper's current world position from the body registry and fires
 * `onRelease(worldPos)`. The parent (LabScene, Task 7.4) decides whether to
 * spawn ink based on proximity to the beaker.
 *
 * Zustand v5 note: the selector-form subscribe(selector, listener) does NOT
 * fire callbacks. Only the full-state form subscribe((newState, oldState) => {...})
 * works correctly — both new and old state are provided, enabling prev-vs-next
 * comparison without an external ref.
 */
import { useEffect } from 'react'
import { Draggable } from '../../../sdk/object/Draggable'
import { useStepEngine } from '../../../sdk/guided/StepEngine'
import { findBodyByTag } from '../../../sdk/physics/bodyRegistry'

const DROPPER_LEN = 0.06

type Props = {
  /** World position when idle (the tray). */
  trayPosition: [number, number, number]
  /** Pointer events are blocked when false. */
  enabled: boolean
  /**
   * Called the moment the student releases the dropper.
   * Receives the dropper's current world position so the parent can
   * decide whether to spawn ink (if above the beaker).
   */
  onRelease?: (worldPos: { x: number; y: number; z: number }) => void
}

export function InkDropper({ trayPosition, enabled, onRelease }: Props) {
  useEffect(() => {
    // Full-state subscribe — Zustand v5 provides (newState, oldState).
    const unsubscribe = useStepEngine.subscribe((newState, oldState) => {
      const wasDragging = oldState.draggingBodyId === 'dropper'
      const isDragging  = newState.draggingBodyId === 'dropper'
      // Transition: dropper released
      if (wasDragging && !isDragging) {
        const body = findBodyByTag('dropper')
        if (body && onRelease) {
          const t = body.translation()
          onRelease({ x: t.x, y: t.y, z: t.z })
        }
      }
    })
    return unsubscribe
  }, [onRelease])

  return (
    <Draggable
      bodyId="dropper"
      position={trayPosition}
      mass={0.1}
      shape={{ type: 'cuboid', halfExtents: [0.012, DROPPER_LEN / 2, 0.012] }}
      enabled={enabled}
    >
      <group>
        {/* Glass tube */}
        <mesh position={[0, DROPPER_LEN / 2, 0]}>
          <cylinderGeometry args={[0.008, 0.008, DROPPER_LEN, 16]} />
          <meshStandardMaterial color="#cdeaff" transparent opacity={0.6} roughness={0.2} />
        </mesh>
        {/* Rubber bulb on top */}
        <mesh position={[0, DROPPER_LEN + 0.012, 0]}>
          <sphereGeometry args={[0.014, 16, 12]} />
          <meshStandardMaterial color="#3a2a55" roughness={0.7} />
        </mesh>
        {/* Tip — purple ink droplet hint */}
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.006, 12, 10]} />
          <meshStandardMaterial color="#7a3df2" emissive="#5a25d2" emissiveIntensity={0.3} />
        </mesh>
      </group>
    </Draggable>
  )
}
