import { RigidBody, CuboidCollider } from '@react-three/rapier'

const TABLE_WIDTH = 2.5
const TABLE_DEPTH = 1.2
const TABLE_HEIGHT = 0.85
const TOP_THICKNESS = 0.05
const LEG_THICKNESS = 0.06
// Legs reach all the way up to the bottom of the tabletop.
// Tabletop bottom = TABLE_HEIGHT - TOP_THICKNESS = 0.80
const LEG_HEIGHT = TABLE_HEIGHT - TOP_THICKNESS // 0.80
const LEG_CENTER_Y = LEG_HEIGHT / 2 // 0.40

export const TABLE_TOP_Y = TABLE_HEIGHT // public constant for object placement
export const TABLE_HALF_WIDTH = TABLE_WIDTH / 2
export const TABLE_HALF_DEPTH = TABLE_DEPTH / 2

const LEG_POSITIONS: [number, number, number][] = [
  [-1.15, LEG_CENTER_Y, -0.5],
  [1.15, LEG_CENTER_Y, -0.5],
  [-1.15, LEG_CENTER_Y, 0.5],
  [1.15, LEG_CENTER_Y, 0.5],
]

export function Table() {
  return (
    <RigidBody type="fixed" colliders={false}>
      {/* Explicit CuboidCollider for the tabletop — registers immediately,
          unlike colliders="cuboid" which is computed from mesh bounds and
          can have a 1-2 frame delay during which dynamic bodies fall through. */}
      <CuboidCollider
        args={[TABLE_WIDTH / 2, TOP_THICKNESS / 2, TABLE_DEPTH / 2]}
        position={[0, TABLE_HEIGHT - TOP_THICKNESS / 2, 0]}
      />
      {/* Tabletop visual */}
      <mesh
        castShadow
        receiveShadow
        position={[0, TABLE_HEIGHT - TOP_THICKNESS / 2, 0]}
      >
        <boxGeometry args={[TABLE_WIDTH, TOP_THICKNESS, TABLE_DEPTH]} />
        <meshStandardMaterial color="#3a2614" roughness={0.85} envMapIntensity={0.3} />
      </mesh>
      {/* Legs — explicit colliders + visual meshes */}
      {LEG_POSITIONS.map(([x, y, z], i) => (
        <CuboidCollider
          key={`coll-${i}`}
          args={[LEG_THICKNESS / 2, LEG_HEIGHT / 2, LEG_THICKNESS / 2]}
          position={[x, y, z]}
        />
      ))}
      {LEG_POSITIONS.map(([x, y, z], i) => (
        <mesh key={`mesh-${i}`} position={[x, y, z]} castShadow receiveShadow>
          <boxGeometry args={[LEG_THICKNESS, LEG_HEIGHT, LEG_THICKNESS]} />
          <meshStandardMaterial color="#1f140a" roughness={0.9} envMapIntensity={0.2} />
        </mesh>
      ))}
    </RigidBody>
  )
}
