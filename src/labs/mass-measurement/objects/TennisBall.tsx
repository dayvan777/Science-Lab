import { useMemo } from 'react'
import { createFeltTexture } from '../textures/feltTexture'
import { Draggable } from '../../../sdk/object/Draggable'

const RADIUS = 0.07  // 2x real (was 0.0335) — for visibility on demo
const MASS_GRAMS = 58

type Props = { position: [number, number, number]; enabled?: boolean }

export function TennisBall({ position, enabled = true }: Props) {
  const feltTexture = useMemo(() => createFeltTexture(), [])
  return (
    <Draggable position={position} mass={MASS_GRAMS} shape={{ type: 'ball', radius: RADIUS }} bodyId="tennis-ball" enabled={enabled}>
      <mesh castShadow receiveShadow>
        <sphereGeometry args={[RADIUS, 16, 12]} />
        <meshStandardMaterial
          map={feltTexture}
          metalness={0}
          roughness={0.85}
          envMapIntensity={0.6}
        />
      </mesh>
    </Draggable>
  )
}
