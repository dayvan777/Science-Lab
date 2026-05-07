import { useMemo } from 'react'
import { createWeightLabel } from '../textures/weightLabel'
import { Draggable } from './Draggable'

const WEIGHTS = [
  { mass: 1000, radius: 0.030, height: 0.05, label: '1 кг' },
  { mass: 500,  radius: 0.026, height: 0.040, label: '500 г' },
  { mass: 200,  radius: 0.022, height: 0.032, label: '200 г' },
  { mass: 100,  radius: 0.019, height: 0.028, label: '100 г' },
  { mass: 50,   radius: 0.016, height: 0.022, label: '50 г' },
  { mass: 20,   radius: 0.013, height: 0.018, label: '20 г' },
  { mass: 10,   radius: 0.011, height: 0.014, label: '10 г' },
]

type Props = { startPosition: [number, number, number] }

export function Weights({ startPosition }: Props) {
  const [x0, y0, z0] = startPosition
  const labelTextures = useMemo(() => WEIGHTS.map(w => createWeightLabel(w.label)), [])

  return (
    <>
      {WEIGHTS.map((w, i) => {
        const x = x0 + (i - 3) * 0.06
        return (
          <Draggable
            key={w.label}
            position={[x, y0 + w.height / 2, z0]}
            mass={w.mass}
            shape={{ type: 'cuboid', halfExtents: [w.radius, w.height / 2, w.radius] }}
            bodyId={`weight-${w.label}`}
          >
            {/* Body — slight conical taper for premium look */}
            <mesh>
              <cylinderGeometry args={[w.radius * 0.95, w.radius, w.height * 0.85, 24]} />
              <meshStandardMaterial color="#5a5a5d" metalness={0.7} roughness={0.45} />
            </mesh>
            {/* Top knob */}
            <mesh position={[0, w.height * 0.45, 0]}>
              <cylinderGeometry args={[w.radius * 0.4, w.radius * 0.6, w.height * 0.15, 16]} />
              <meshStandardMaterial color="#5a5a5d" metalness={0.7} roughness={0.45} />
            </mesh>
            {/* Label on side */}
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
