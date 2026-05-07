import { Draggable } from './Draggable'
import { Outlines } from '@react-three/drei'

const RADIUS = 0.04
const MASS_GRAMS = 180

type Props = { position: [number, number, number]; active?: boolean; dimmed?: boolean }

export function Apple({ position, active = false, dimmed = false }: Props) {
  return (
    <Draggable position={position} mass={MASS_GRAMS} shape={{ type: 'ball', radius: RADIUS }} bodyId="apple">
      <group scale={active ? 1.05 : 1.0}>
        {/* Body — slight vertical squash */}
        <mesh scale={[1, 0.95, 1]}>
          <sphereGeometry args={[RADIUS, 16, 12]} />
          <meshStandardMaterial color="#c0392b" roughness={0.4} metalness={0} opacity={dimmed ? 0.4 : 1} transparent={dimmed} />
          {active && <Outlines thickness={4} color="#0071e3" />}
        </mesh>
        {/* Stem */}
        <mesh position={[0, RADIUS * 0.95, 0]}>
          <cylinderGeometry args={[0.002, 0.0025, 0.012, 6]} />
          <meshStandardMaterial color="#5a3a1a" roughness={0.8} opacity={dimmed ? 0.4 : 1} transparent={dimmed} />
        </mesh>
        {/* Single leaf */}
        <mesh position={[0.005, RADIUS * 0.95 + 0.005, 0]} rotation={[0, 0, Math.PI * 0.2]}>
          <coneGeometry args={[0.005, 0.012, 4]} />
          <meshStandardMaterial color="#27ae60" roughness={0.6} opacity={dimmed ? 0.4 : 1} transparent={dimmed} />
        </mesh>
      </group>
    </Draggable>
  )
}
