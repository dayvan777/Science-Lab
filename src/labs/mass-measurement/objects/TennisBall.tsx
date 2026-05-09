import { Draggable } from '../../../sdk/object/Draggable'

// Ping-pong ball — small, light, plain white plastic.
// Internal bodyId stays "tennis-ball" so the Step DSL completion rules
// (bodyPattern: 'tennis-ball') and journal slots keep working.
const RADIUS = 0.04
const MASS_GRAMS = 5

type Props = { position: [number, number, number]; enabled?: boolean }

export function TennisBall({ position, enabled = true }: Props) {
  return (
    <Draggable position={position} mass={MASS_GRAMS} shape={{ type: 'ball', radius: RADIUS }} bodyId="tennis-ball" enabled={enabled}>
      <mesh castShadow receiveShadow>
        <sphereGeometry args={[RADIUS, 24, 16]} />
        <meshStandardMaterial
          color="#f5f5f5"
          metalness={0}
          roughness={0.45}
          envMapIntensity={0.4}
        />
      </mesh>
    </Draggable>
  )
}
