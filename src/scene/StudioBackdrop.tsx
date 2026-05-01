import { RigidBody } from '@react-three/rapier'

const FLOOR_Y = 0
const FLOOR_SIZE = 20

export function StudioBackdrop() {
  return (
    <RigidBody type="fixed" colliders="cuboid" position={[0, FLOOR_Y - 0.05, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[FLOOR_SIZE, FLOOR_SIZE]} />
        <meshStandardMaterial color="#cdcdd2" roughness={0.7} metalness={0} />
      </mesh>
    </RigidBody>
  )
}
