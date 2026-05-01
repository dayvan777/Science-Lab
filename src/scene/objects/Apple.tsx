import { Draggable } from './Draggable'

const RADIUS = 0.04
const MASS_GRAMS = 180

type Props = { position: [number, number, number] }

export function Apple({ position }: Props) {
  return (
    <Draggable position={position} mass={MASS_GRAMS} shape={{ type: 'ball', radius: RADIUS }}>
      <mesh>
        <sphereGeometry args={[RADIUS, 16, 12]} />
        <meshStandardMaterial color="#c0392b" roughness={0.5} />
      </mesh>
    </Draggable>
  )
}
