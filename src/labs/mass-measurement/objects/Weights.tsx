import { useMemo } from 'react'
import { createWeightLabel } from '../textures/weightLabel'
import { Draggable } from '../../../sdk/object/Draggable'

// Standard school lab weight set — 11 weights covering 1–1908 g in 1 g
// increments. Each weight has a unique `tag` (used as bodyId) so duplicate
// masses (e.g. two 20 g) can be distinguished by the physics layer.
// Sizes scaled for demo visibility on a 2.5 m table viewed from far.
export const WEIGHTS: ReadonlyArray<{
  mass: number     // grams
  radius: number   // metres
  height: number   // metres
  label: string    // visible label on the side of the cylinder
  tag: string      // unique identifier (bodyId)
}> = [
  { mass: 1000, radius: 0.054, height: 0.090, label: '1 кг',  tag: '1кг'    },
  { mass: 500,  radius: 0.047, height: 0.072, label: '500 г', tag: '500г'   },
  { mass: 200,  radius: 0.040, height: 0.058, label: '200 г', tag: '200г'   },
  { mass: 100,  radius: 0.034, height: 0.050, label: '100 г', tag: '100г'   },
  { mass: 50,   radius: 0.029, height: 0.040, label: '50 г',  tag: '50г'    },
  { mass: 20,   radius: 0.023, height: 0.032, label: '20 г',  tag: '20г-A'  },
  { mass: 20,   radius: 0.023, height: 0.032, label: '20 г',  tag: '20г-B'  },
  { mass: 10,   radius: 0.020, height: 0.025, label: '10 г',  tag: '10г'    },
  { mass: 5,    radius: 0.017, height: 0.020, label: '5 г',   tag: '5г'     },
  { mass: 2,    radius: 0.014, height: 0.016, label: '2 г',   tag: '2г'     },
  { mass: 1,    radius: 0.012, height: 0.014, label: '1 г',   tag: '1г'     },
]

type Props = {
  startPosition: [number, number, number]
  weightsEnabled?: boolean
  /** Axis along which the weights are laid out. Default 'x' (legacy). */
  spreadAxis?: 'x' | 'z'
  /** Distance between consecutive weight centers. Default 0.13. */
  spacing?: number
}

export function Weights({
  startPosition,
  weightsEnabled = true,
  spreadAxis = 'x',
  spacing = 0.13,
}: Props) {
  const [x0, y0, z0] = startPosition
  const labelTextures = useMemo(() => WEIGHTS.map(w => createWeightLabel(w.label)), [])

  return (
    <>
      {WEIGHTS.map((w, i) => {
        const x = spreadAxis === 'x' ? x0 + i * spacing : x0
        const z = spreadAxis === 'z' ? z0 + i * spacing : z0
        return (
          <Draggable
            key={w.tag}
            position={[x, y0 + w.height / 2, z]}
            mass={w.mass}
            shape={{ type: 'cuboid', halfExtents: [w.radius, w.height / 2, w.radius] }}
            bodyId={`weight-${w.tag}`}
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
