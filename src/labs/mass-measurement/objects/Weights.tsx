import { useMemo } from 'react'
import { createWeightLabel } from '../textures/weightLabel'
import { Draggable } from '../../../sdk/object/Draggable'

// Sizes 1.8x real for demo visibility on a 2.5m table viewed from far
const WEIGHTS = [
  { mass: 1000, radius: 0.054, height: 0.090, label: '1 кг' },
  { mass: 500,  radius: 0.047, height: 0.072, label: '500 г' },
  { mass: 200,  radius: 0.040, height: 0.058, label: '200 г' },
  { mass: 100,  radius: 0.034, height: 0.050, label: '100 г' },
  { mass: 50,   radius: 0.029, height: 0.040, label: '50 г' },
  { mass: 20,   radius: 0.023, height: 0.032, label: '20 г' },
  { mass: 10,   radius: 0.020, height: 0.025, label: '10 г' },
]

type Props = { startPosition: [number, number, number]; weightsEnabled?: boolean }

export function Weights({ startPosition, weightsEnabled = true }: Props) {
  const [x0, y0, z0] = startPosition
  const labelTextures = useMemo(() => WEIGHTS.map(w => createWeightLabel(w.label)), [])

  return (
    <>
      {WEIGHTS.map((w, i) => {
        const x = x0 + i * 0.13  // weights 0..6 spread to the right of x0
        return (
          <Draggable
            key={w.label}
            position={[x, y0 + w.height / 2, z0]}
            mass={w.mass}
            shape={{ type: 'cuboid', halfExtents: [w.radius, w.height / 2, w.radius] }}
            bodyId={`weight-${w.label}`}
            enabled={weightsEnabled}
          >
            {/* Body — slight conical taper for premium look (dark steel) */}
            <mesh castShadow receiveShadow>
              <cylinderGeometry args={[w.radius * 0.95, w.radius, w.height * 0.85, 32]} />
              <meshStandardMaterial color="#3a3a40" metalness={0.85} roughness={0.35} envMapIntensity={1.0} />
            </mesh>
            {/* Top knob — slightly polished */}
            <mesh position={[0, w.height * 0.45, 0]} castShadow>
              <cylinderGeometry args={[w.radius * 0.4, w.radius * 0.6, w.height * 0.15, 24]} />
              <meshStandardMaterial color="#46464c" metalness={0.9} roughness={0.25} envMapIntensity={1.1} />
            </mesh>
            {/* Label on side — slightly emissive so the value reads under any lighting */}
            <mesh position={[0, 0, w.radius + 0.001]}>
              <planeGeometry args={[w.radius * 1.4, w.height * 0.5]} />
              <meshBasicMaterial map={labelTextures[i]} transparent />
            </mesh>
          </Draggable>
        )
      })}
    </>
  )
}
