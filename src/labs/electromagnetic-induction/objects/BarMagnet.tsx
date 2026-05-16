import { Draggable } from '../../../sdk/object/Draggable'

export const MAGNET_HALF_LENGTH = 0.045  // total length 9 cm
export const MAGNET_HALF_DEPTH = 0.012   // square cross-section 24 mm side
export const MAGNET_MASS_GRAMS = 80      // arbitrary — not used by EM-induction physics
export const BAR_MAGNET_BODY_ID = 'bar-magnet'

type Props = { position: [number, number, number]; enabled?: boolean }

/**
 * Classic bar magnet — N pole red (#ff3b30), S pole blue (#0a84ff).
 * Draggable. Physics shape is a cuboid sized to match the visual mesh.
 */
export function BarMagnet({ position, enabled = true }: Props) {
  return (
    <Draggable
      position={position}
      mass={MAGNET_MASS_GRAMS}
      shape={{
        type: 'cuboid',
        halfExtents: [MAGNET_HALF_LENGTH, MAGNET_HALF_DEPTH, MAGNET_HALF_DEPTH],
      }}
      bodyId={BAR_MAGNET_BODY_ID}
      enabled={enabled}
      dragHeight={0.95}
    >
      {/* N pole (red) — left half (-x) */}
      <mesh position={[-MAGNET_HALF_LENGTH / 2, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[MAGNET_HALF_LENGTH, MAGNET_HALF_DEPTH * 2, MAGNET_HALF_DEPTH * 2]} />
        <meshStandardMaterial color="#ff3b30" metalness={0.6} roughness={0.4} envMapIntensity={0.5} />
      </mesh>
      {/* S pole (blue) — right half (+x) */}
      <mesh position={[MAGNET_HALF_LENGTH / 2, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[MAGNET_HALF_LENGTH, MAGNET_HALF_DEPTH * 2, MAGNET_HALF_DEPTH * 2]} />
        <meshStandardMaterial color="#0a84ff" metalness={0.6} roughness={0.4} envMapIntensity={0.5} />
      </mesh>
      {/* Tiny "N" / "S" letters on top face for clarity */}
      <mesh position={[-MAGNET_HALF_LENGTH / 2, MAGNET_HALF_DEPTH + 0.0005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[MAGNET_HALF_LENGTH * 0.6, MAGNET_HALF_DEPTH * 1.4]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.85} />
      </mesh>
      <mesh position={[MAGNET_HALF_LENGTH / 2, MAGNET_HALF_DEPTH + 0.0005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[MAGNET_HALF_LENGTH * 0.6, MAGNET_HALF_DEPTH * 1.4]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.85} />
      </mesh>
    </Draggable>
  )
}
