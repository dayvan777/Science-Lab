import { Draggable } from './Draggable'

const RADIUS = 0.04
const MASS_GRAMS = 180

type Props = { position: [number, number, number] }

export function Apple({ position }: Props) {
  return (
    <Draggable position={position} mass={MASS_GRAMS} shape={{ type: 'ball', radius: RADIUS }} bodyId="apple">
      <group>
        {/* Body — slight vertical squash */}
        <mesh scale={[1, 0.95, 1]}>
          <sphereGeometry args={[RADIUS, 16, 12]} />
          <meshStandardMaterial color="#c0392b" roughness={0.4} metalness={0} />
        </mesh>
        {/* Stem */}
        <mesh position={[0, RADIUS * 0.95, 0]}>
          <cylinderGeometry args={[0.002, 0.0025, 0.012, 6]} />
          <meshStandardMaterial color="#5a3a1a" roughness={0.8} />
        </mesh>
        {/* Single leaf */}
        <mesh position={[0.005, RADIUS * 0.95 + 0.005, 0]} rotation={[0, 0, Math.PI * 0.2]}>
          <coneGeometry args={[0.005, 0.012, 4]} />
          <meshStandardMaterial color="#27ae60" roughness={0.6} />
        </mesh>
      </group>
    </Draggable>
  )
}
