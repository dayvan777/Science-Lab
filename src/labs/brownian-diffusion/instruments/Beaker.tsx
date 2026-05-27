export const BEAKER_RADIUS = 0.06    // metres
export const BEAKER_HEIGHT = 0.14
export const WATER_LEVEL = 0.10      // metres above base (i.e., water fills lower 10cm)

type Props = {
  /** Base centre (table top). */
  position: [number, number, number]
}

export function Beaker({ position }: Props) {
  const [x, y, z] = position
  return (
    <group position={[x, y, z]}>
      {/* Outer glass shell */}
      <mesh>
        <cylinderGeometry args={[BEAKER_RADIUS, BEAKER_RADIUS * 0.9, BEAKER_HEIGHT, 32, 1, true]} />
        <meshStandardMaterial
          color="#88c4ff"
          transparent
          opacity={0.18}
          roughness={0.1}
          side={2 /* DoubleSide */}
        />
      </mesh>
      {/* Bottom disc */}
      <mesh position={[0, -BEAKER_HEIGHT / 2 + 0.002, 0]}>
        <cylinderGeometry args={[BEAKER_RADIUS * 0.9, BEAKER_RADIUS * 0.9, 0.004, 32]} />
        <meshStandardMaterial color="#88c4ff" transparent opacity={0.25} roughness={0.15} />
      </mesh>
      {/* Water — short cylinder at lower part */}
      <mesh position={[0, -BEAKER_HEIGHT / 2 + WATER_LEVEL / 2 + 0.002, 0]}>
        <cylinderGeometry args={[BEAKER_RADIUS * 0.88, BEAKER_RADIUS * 0.88, WATER_LEVEL, 32]} />
        <meshStandardMaterial
          color="#88c4ff"
          transparent
          opacity={0.30}
          roughness={0.25}
          metalness={0}
        />
      </mesh>
    </group>
  )
}

/**
 * AABB-shaped wall bound for the kinetic engine. Approximates the cylinder
 * with its inscribed square — particles can't reach the corners but it's
 * close enough at this scale (and avoids cylindrical collision math).
 */
export function beakerWalls(position: [number, number, number]) {
  const r = BEAKER_RADIUS * 0.85
  const yBase = position[1] - BEAKER_HEIGHT / 2 + 0.005
  return {
    min: { x: position[0] - r, y: yBase, z: position[2] - r },
    max: { x: position[0] + r, y: position[1] - BEAKER_HEIGHT / 2 + WATER_LEVEL, z: position[2] + r },
  }
}
