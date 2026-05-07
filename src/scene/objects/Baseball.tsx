import { useMemo } from 'react'
import { createBaseballSeamTexture } from '../textures/seamTexture'
import { Draggable } from './Draggable'

const RADIUS = 0.0365
const MASS_GRAMS = 145

type Props = { position: [number, number, number] }

export function Baseball({ position }: Props) {
  const seamTexture = useMemo(() => createBaseballSeamTexture(), [])
  return (
    <Draggable position={position} mass={MASS_GRAMS} shape={{ type: 'ball', radius: RADIUS }} bodyId="baseball">
      <mesh>
        <sphereGeometry args={[RADIUS, 16, 12]} />
        <meshStandardMaterial map={seamTexture} roughness={0.6} metalness={0} />
      </mesh>
    </Draggable>
  )
}
