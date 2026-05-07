import { useMemo } from 'react'
import { createFeltTexture } from '../textures/feltTexture'
import { Draggable } from './Draggable'

const RADIUS = 0.0335
const MASS_GRAMS = 58

type Props = { position: [number, number, number] }

export function TennisBall({ position }: Props) {
  const feltTexture = useMemo(() => createFeltTexture(), [])
  return (
    <Draggable position={position} mass={MASS_GRAMS} shape={{ type: 'ball', radius: RADIUS }} bodyId="tennis-ball">
      <mesh>
        <sphereGeometry args={[RADIUS, 16, 12]} />
        <meshStandardMaterial map={feltTexture} roughness={0.85} metalness={0} />
      </mesh>
    </Draggable>
  )
}
