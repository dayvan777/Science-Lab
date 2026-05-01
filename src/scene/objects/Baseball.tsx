import { Draggable } from './Draggable'

const RADIUS = 0.0365
const MASS_GRAMS = 145

type Props = { position: [number, number, number] }

export function Baseball({ position }: Props) {
  return (
    <Draggable position={position} mass={MASS_GRAMS} shape={{ type: 'ball', radius: RADIUS }}>
      <mesh castShadow>
        <sphereGeometry args={[RADIUS, 24, 16]} />
        <meshStandardMaterial color="#f5f5f0" roughness={0.6} metalness={0} />
      </mesh>
    </Draggable>
  )
}
