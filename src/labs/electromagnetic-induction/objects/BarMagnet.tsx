import { Draggable } from '../../../sdk/object/Draggable'
import { COIL_CENTER } from '../physics/induction'
import { COIL_LENGTH } from '../instruments/Coil'
import { useCameraStore } from '../../../sdk/scene/cameraStore'
import { useLabSettings, type ActiveMagnet } from '../state/LabSettingsState'

export const LONG_MAGNET_HALF_LENGTH = 0.09    // total length 18 cm
export const SHORT_MAGNET_HALF_LENGTH = 0.045  // total length 9 cm
export const MAGNET_HALF_DEPTH = 0.012         // square cross-section 24 mm side
export const MAGNET_MASS_GRAMS = 80            // arbitrary — not used by EM-induction physics

type Props = {
  position: [number, number, number]
  enabled?: boolean
  /** Half-length along x. Long magnet uses LONG_MAGNET_HALF_LENGTH (0.09);
   *  short magnet uses SHORT_MAGNET_HALF_LENGTH (0.045). */
  halfLength: number
  /** Physics body identifier. Use 'bar-magnet-long' or 'bar-magnet-short'
   *  so SceneController can pick the right body for EMF computation. */
  bodyId: string
  /** Which magnet variant this instance is. Dispatched to setActiveMagnet
   *  when the user taps or starts dragging it. */
  magnetSize: ActiveMagnet
}

/**
 * Classic bar magnet — N pole red (#ff3b30), S pole blue (#0a84ff).
 * Draggable. Physics shape is a cuboid sized to match the visual mesh.
 *
 * Two instances are mounted in LabScene: a long one (18 cm) and a short
 * one (9 cm). Only one is "active" at a time per useLabSettings; tapping
 * or dragging a magnet selects it.
 */
export function BarMagnet({ position, enabled = true, halfLength, bodyId, magnetSize }: Props) {
  const setFocusTarget = useCameraStore(s => s.setFocusTarget)
  const setActiveMagnet = useLabSettings(s => s.setActiveMagnet)

  // Corridor activation: when the magnet's centre is within ±corridorHalfLength
  // of the coil's centre along x, drag z is forced to bore axis. Per-magnet
  // because the corridor extent depends on the magnet's length.
  const corridorHalfLength = COIL_LENGTH / 2 + halfLength

  const handleTap = () => {
    setActiveMagnet(magnetSize)
    setFocusTarget('magnet')
  }

  return (
    <Draggable
      position={position}
      mass={MAGNET_MASS_GRAMS}
      shape={{
        type: 'cuboid',
        halfExtents: [halfLength, MAGNET_HALF_DEPTH, MAGNET_HALF_DEPTH],
      }}
      bodyId={bodyId}
      enabled={enabled}
      dragHeight={0.95}
      dragCorridor={{ center: COIL_CENTER, halfLength: corridorHalfLength }}
      onTap={handleTap}
    >
      {/* N pole (red) — left half (-x) */}
      <mesh position={[-halfLength / 2, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[halfLength, MAGNET_HALF_DEPTH * 2, MAGNET_HALF_DEPTH * 2]} />
        <meshStandardMaterial color="#ff3b30" metalness={0.6} roughness={0.4} envMapIntensity={0.5} />
      </mesh>
      {/* S pole (blue) — right half (+x) */}
      <mesh position={[halfLength / 2, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[halfLength, MAGNET_HALF_DEPTH * 2, MAGNET_HALF_DEPTH * 2]} />
        <meshStandardMaterial color="#0a84ff" metalness={0.6} roughness={0.4} envMapIntensity={0.5} />
      </mesh>
      {/* Tiny "N" / "S" letters on top face for clarity */}
      <mesh position={[-halfLength / 2, MAGNET_HALF_DEPTH + 0.0005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[halfLength * 0.6, MAGNET_HALF_DEPTH * 1.4]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.85} />
      </mesh>
      <mesh position={[halfLength / 2, MAGNET_HALF_DEPTH + 0.0005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[halfLength * 0.6, MAGNET_HALF_DEPTH * 1.4]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.85} />
      </mesh>
    </Draggable>
  )
}
