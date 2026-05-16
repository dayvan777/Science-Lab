import { RoundedBox } from '@react-three/drei'

/**
 * Two small wooden blocks at the coil's x-extents. The coil — now
 * oriented along world X (Phase 1 axis rotation) — visually rests on
 * them, hiding the air gap that would otherwise leave the coil floating
 * 6 cm above the table.
 *
 * Geometry (lab-local, in metres):
 *   - Stand height: 0.06 m (= coil_center.y 0.95 − coil_outer_r 0.04 − table_top 0.85)
 *   - Stand width (x):  0.025 (narrow — just peeks beyond the coil ends)
 *   - Stand depth (z):  0.05  (deeper into the scene — thin slab look)
 *   - Offset beyond coil ends: 0.005 m (5 mm peek)
 *
 * Material: dark walnut #2a1c10 to match the lab-clutter notebook and
 * read clearly as wood against the polished-metal galvanometer.
 */

export const STAND_HEIGHT = 0.06
const STAND_WIDTH = 0.025  // along x — narrow
const STAND_DEPTH = 0.05   // along z — deeper into the scene
const STAND_OFFSET_X = 0.005

type Props = {
  /** World position of the coil's centre (matches LabScene's COIL_WORLD). */
  coilWorld: [number, number, number]
  /** Coil's length along x (imported from Coil.tsx in the caller). */
  coilLength: number
  /** Coil's outer radius (imported from Coil.tsx) — determines stand top y. */
  coilOuterRadius: number
}

export function CoilStand({ coilWorld, coilLength, coilOuterRadius }: Props) {
  const [cx, cy, cz] = coilWorld
  // Stand top y = coil bottom y. Stand center y = stand_top − height/2.
  const standTopY = cy - coilOuterRadius
  const standCenterY = standTopY - STAND_HEIGHT / 2

  return (
    <group>
      <RoundedBox
        args={[STAND_WIDTH, STAND_HEIGHT, STAND_DEPTH]}
        radius={0.003}
        smoothness={4}
        position={[cx - coilLength / 2 - STAND_OFFSET_X, standCenterY, cz]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color="#2a1c10" roughness={0.75} envMapIntensity={0.25} />
      </RoundedBox>
      <RoundedBox
        args={[STAND_WIDTH, STAND_HEIGHT, STAND_DEPTH]}
        radius={0.003}
        smoothness={4}
        position={[cx + coilLength / 2 + STAND_OFFSET_X, standCenterY, cz]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color="#2a1c10" roughness={0.75} envMapIntensity={0.25} />
      </RoundedBox>
    </group>
  )
}
