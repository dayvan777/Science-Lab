import { useMemo } from 'react'
import { createFeltTexture } from '../textures/feltTexture'
import { Draggable } from './Draggable'

const RADIUS = 0.07  // 2x real (was 0.0335) — for visibility on demo
const MASS_GRAMS = 58

type Props = { position: [number, number, number]; enabled?: boolean }

export function TennisBall({ position, enabled = true }: Props) {
  const feltTexture = useMemo(() => createFeltTexture(), [])
  return (
    <Draggable position={position} mass={MASS_GRAMS} shape={{ type: 'ball', radius: RADIUS }} bodyId="tennis-ball" enabled={enabled}>
      <mesh>
        <sphereGeometry args={[RADIUS, 16, 12]} />
        <meshStandardMaterial map={feltTexture} roughness={0.85} metalness={0} />
      </mesh>
    </Draggable>
  )
}
