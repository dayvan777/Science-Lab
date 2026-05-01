import { Draggable } from './Draggable'

const RADIUS = 0.0335
const MASS_GRAMS = 58

type Props = { position: [number, number, number] }

export function TennisBall({ position }: Props) {
  return (
    <Draggable position={position} mass={MASS_GRAMS} shape={{ type: 'ball', radius: RADIUS }}>
      <mesh>
        <sphereGeometry args={[RADIUS, 16, 12]} />
        <meshStandardMaterial color="#d8e043" roughness={0.85} />
      </mesh>
    </Draggable>
  )
}
