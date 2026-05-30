import { Edges } from '@react-three/drei'

/**
 * A transparent glass cube on the lab table. Renders the 6 walls (5 if
 * `openTop`) as thin transparent boxes with subtle blue tint, plus a crisp
 * edge outline so the cube's extent reads at a glance. The cube's INTERIOR
 * (the AABB used by the particle engine) is exposed as `BOX_INTERIOR`.
 */
export const BOX_HALF = 0.10
export const BOX_INTERIOR = {
  min: { x: -BOX_HALF, y: -BOX_HALF, z: -BOX_HALF },
  max: { x:  BOX_HALF, y:  BOX_HALF, z:  BOX_HALF },
}

type Props = {
  /** Centre of the box, world-space. Y is centre, not base. */
  position: [number, number, number]
  /** If true, top wall is omitted. */
  openTop?: boolean
}

const WALL_THICK = 0.003
// Higher than the old 0.1 so the studio environment stops mirroring into a
// hard specular hotspot on the glass.
const WALL_ROUGH = 0.35

export function GlassBox({ position, openTop = false }: Props) {
  return (
    <group position={position}>
      {/* Bottom */}
      <mesh position={[0, -BOX_HALF, 0]}>
        <boxGeometry args={[2 * BOX_HALF, WALL_THICK, 2 * BOX_HALF]} />
        <meshStandardMaterial color="#88c4ff" transparent opacity={0.12} roughness={WALL_ROUGH} metalness={0} />
      </mesh>
      {/* Top */}
      {!openTop && (
        <mesh position={[0, BOX_HALF, 0]}>
          <boxGeometry args={[2 * BOX_HALF, WALL_THICK, 2 * BOX_HALF]} />
          <meshStandardMaterial color="#88c4ff" transparent opacity={0.08} roughness={WALL_ROUGH} />
        </mesh>
      )}
      {/* Left / Right (x) */}
      <mesh position={[-BOX_HALF, 0, 0]}>
        <boxGeometry args={[WALL_THICK, 2 * BOX_HALF, 2 * BOX_HALF]} />
        <meshStandardMaterial color="#88c4ff" transparent opacity={0.10} roughness={WALL_ROUGH} />
      </mesh>
      <mesh position={[BOX_HALF, 0, 0]}>
        <boxGeometry args={[WALL_THICK, 2 * BOX_HALF, 2 * BOX_HALF]} />
        <meshStandardMaterial color="#88c4ff" transparent opacity={0.10} roughness={WALL_ROUGH} />
      </mesh>
      {/* Front / Back (z) */}
      <mesh position={[0, 0, -BOX_HALF]}>
        <boxGeometry args={[2 * BOX_HALF, 2 * BOX_HALF, WALL_THICK]} />
        <meshStandardMaterial color="#88c4ff" transparent opacity={0.10} roughness={WALL_ROUGH} />
      </mesh>
      <mesh position={[0, 0, BOX_HALF]}>
        <boxGeometry args={[2 * BOX_HALF, 2 * BOX_HALF, WALL_THICK]} />
        <meshStandardMaterial color="#88c4ff" transparent opacity={0.10} roughness={WALL_ROUGH} />
      </mesh>
      {/* Crisp edge outline — makes the cube extent + molecule scale obvious */}
      <mesh>
        <boxGeometry args={[2 * BOX_HALF, 2 * BOX_HALF, 2 * BOX_HALF]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        <Edges threshold={15} color="#9ec5ff" />
      </mesh>
    </group>
  )
}
