import { Draggable } from '../../../sdk/object/Draggable'

// Metal ball — small chrome sphere, dense.
// Internal bodyId stays "apple" so the Step DSL completion rules
// (bodyPattern: 'apple') and journal slots keep working.
export const RADIUS = 0.045
const MASS_GRAMS = 250

type Props = { position: [number, number, number]; enabled?: boolean }

export function Apple({ position, enabled = true }: Props) {
  return (
    <Draggable position={position} mass={MASS_GRAMS} shape={{ type: 'ball', radius: RADIUS }} bodyId="apple" enabled={enabled}>
      <mesh castShadow receiveShadow>
        <sphereGeometry args={[RADIUS, 32, 24]} />
        <meshStandardMaterial
          color="#a8a8b0"
          metalness={0.95}
          roughness={0.15}
          envMapIntensity={1.2}
        />
      </mesh>
    </Draggable>
  )
}
