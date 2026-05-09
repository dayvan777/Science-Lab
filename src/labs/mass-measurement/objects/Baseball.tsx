import { useMemo } from 'react'
import { createBaseballSeamTexture } from '../textures/seamTexture'
import { Draggable } from '../../../sdk/object/Draggable'

const RADIUS = 0.075  // 2x real for demo visibility
const MASS_GRAMS = 145

type Props = { position: [number, number, number]; enabled?: boolean }

export function Baseball({ position, enabled = true }: Props) {
  const seamTexture = useMemo(() => createBaseballSeamTexture(), [])
  return (
    <Draggable position={position} mass={MASS_GRAMS} shape={{ type: 'ball', radius: RADIUS }} bodyId="baseball" enabled={enabled}>
      <mesh>
        <sphereGeometry args={[RADIUS, 16, 12]} />
        <meshStandardMaterial map={seamTexture} roughness={0.6} metalness={0} />
      </mesh>
    </Draggable>
  )
}
