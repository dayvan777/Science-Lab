/**
 * A transparent glass cube on the lab table. Renders the 6 walls (5
 * if `openTop` is true) as thin transparent boxes with subtle blue
 * tint and edge highlights. The cube's INTERIOR (the AABB used by
 * the particle engine) is exposed as `BOX_INTERIOR` for callers.
 */
export const BOX_HALF = 0.10                    // metres — half-extent
export const BOX_INTERIOR = {                   // AABB for the engine
  min: { x: -BOX_HALF, y: -BOX_HALF, z: -BOX_HALF },
  max: { x:  BOX_HALF, y:  BOX_HALF, z:  BOX_HALF },
}

type Props = {
  /** Centre of the box, world-space. Y is centre, not base. */
  position: [number, number, number]
  /** If true, top wall is omitted (Scene 2 pollen drops in). */
  openTop?: boolean
}

const WALL_THICK = 0.003

export function GlassBox({ position, openTop = false }: Props) {
  return (
    <group position={position}>
      {/* Bottom */}
      <mesh position={[0, -BOX_HALF, 0]}>
        <boxGeometry args={[2 * BOX_HALF, WALL_THICK, 2 * BOX_HALF]} />
        <meshStandardMaterial color="#88c4ff" transparent opacity={0.18} roughness={0.1} metalness={0} />
      </mesh>
      {/* Top */}
      {!openTop && (
        <mesh position={[0, BOX_HALF, 0]}>
          <boxGeometry args={[2 * BOX_HALF, WALL_THICK, 2 * BOX_HALF]} />
          <meshStandardMaterial color="#88c4ff" transparent opacity={0.12} roughness={0.1} />
        </mesh>
      )}
      {/* Left / Right (x) */}
      <mesh position={[-BOX_HALF, 0, 0]}>
        <boxGeometry args={[WALL_THICK, 2 * BOX_HALF, 2 * BOX_HALF]} />
        <meshStandardMaterial color="#88c4ff" transparent opacity={0.16} roughness={0.1} />
      </mesh>
      <mesh position={[BOX_HALF, 0, 0]}>
        <boxGeometry args={[WALL_THICK, 2 * BOX_HALF, 2 * BOX_HALF]} />
        <meshStandardMaterial color="#88c4ff" transparent opacity={0.16} roughness={0.1} />
      </mesh>
      {/* Front / Back (z) */}
      <mesh position={[0, 0, -BOX_HALF]}>
        <boxGeometry args={[2 * BOX_HALF, 2 * BOX_HALF, WALL_THICK]} />
        <meshStandardMaterial color="#88c4ff" transparent opacity={0.16} roughness={0.1} />
      </mesh>
      <mesh position={[0, 0, BOX_HALF]}>
        <boxGeometry args={[2 * BOX_HALF, 2 * BOX_HALF, WALL_THICK]} />
        <meshStandardMaterial color="#88c4ff" transparent opacity={0.16} roughness={0.1} />
      </mesh>
    </group>
  )
}
