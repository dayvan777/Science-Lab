import { RigidBody } from '@react-three/rapier'

const TABLE_WIDTH = 2.5
const TABLE_DEPTH = 1.2
const TABLE_HEIGHT = 0.85
const TOP_THICKNESS = 0.05

export const TABLE_TOP_Y = TABLE_HEIGHT // public constant for object placement

export function Table() {
  return (
    <RigidBody type="fixed" colliders="cuboid">
      {/* Tabletop */}
      <mesh
        castShadow
        receiveShadow
        position={[0, TABLE_HEIGHT - TOP_THICKNESS / 2, 0]}
      >
        <boxGeometry args={[TABLE_WIDTH, TOP_THICKNESS, TABLE_DEPTH]} />
        <meshStandardMaterial color="#8b5a2b" roughness={0.7} />
      </mesh>
      {/* 4 legs (visual only, single collider above is enough) */}
      {[
        [-1.15, 0.35, -0.5],
        [1.15, 0.35, -0.5],
        [-1.15, 0.35, 0.5],
        [1.15, 0.35, 0.5],
      ].map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]} castShadow receiveShadow>
          <boxGeometry args={[0.06, 0.7, 0.06]} />
          <meshStandardMaterial color="#5a3a1a" roughness={0.8} />
        </mesh>
      ))}
    </RigidBody>
  )
}
