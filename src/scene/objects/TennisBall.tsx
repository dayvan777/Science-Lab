import { useMemo } from 'react'
import { createFeltTexture } from '../textures/feltTexture'
import { Draggable } from './Draggable'
import { Outlines } from '@react-three/drei'

const RADIUS = 0.0335
const MASS_GRAMS = 58

type Props = { position: [number, number, number]; active?: boolean; dimmed?: boolean }

export function TennisBall({ position, active = false, dimmed = false }: Props) {
  const feltTexture = useMemo(() => createFeltTexture(), [])
  return (
    <Draggable position={position} mass={MASS_GRAMS} shape={{ type: 'ball', radius: RADIUS }} bodyId="tennis-ball">
      <mesh scale={active ? 1.05 : 1.0}>
        <sphereGeometry args={[RADIUS, 16, 12]} />
        <meshStandardMaterial map={feltTexture} roughness={0.85} metalness={0} opacity={dimmed ? 0.4 : 1} transparent={dimmed} />
        {active && <Outlines thickness={4} color="#0071e3" />}
      </mesh>
    </Draggable>
  )
}
