import { useMemo } from 'react'
import { createBaseballSeamTexture } from '../textures/seamTexture'
import { Draggable } from './Draggable'
import { Outlines } from '@react-three/drei'

const RADIUS = 0.0365
const MASS_GRAMS = 145

type Props = { position: [number, number, number]; active?: boolean; dimmed?: boolean }

export function Baseball({ position, active = false, dimmed = false }: Props) {
  const seamTexture = useMemo(() => createBaseballSeamTexture(), [])
  return (
    <Draggable position={position} mass={MASS_GRAMS} shape={{ type: 'ball', radius: RADIUS }} bodyId="baseball">
      <mesh scale={active ? 1.05 : 1.0}>
        <sphereGeometry args={[RADIUS, 16, 12]} />
        <meshStandardMaterial map={seamTexture} roughness={0.6} metalness={0} opacity={dimmed ? 0.4 : 1} transparent={dimmed} />
        {active && <Outlines thickness={4} color="#0071e3" />}
      </mesh>
    </Draggable>
  )
}
