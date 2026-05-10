import { useMemo } from 'react'
import { createBaseballSeamTexture } from '../textures/seamTexture'
import { Draggable } from '../../../sdk/object/Draggable'

export const RADIUS = 0.075  // 2x real for demo visibility
const MASS_GRAMS = 145

type Props = { position: [number, number, number]; enabled?: boolean }

export function Baseball({ position, enabled = true }: Props) {
  const seamTexture = useMemo(() => createBaseballSeamTexture(), [])
  return (
    <Draggable position={position} mass={MASS_GRAMS} shape={{ type: 'ball', radius: RADIUS }} bodyId="baseball" enabled={enabled}>
      <mesh castShadow receiveShadow>
        <sphereGeometry args={[RADIUS, 32, 24]} />
        <meshStandardMaterial
          map={seamTexture}
          color="#f5ebd6"
          roughness={0.55}
          metalness={0}
          envMapIntensity={0.5}
        />
      </mesh>
    </Draggable>
  )
}
