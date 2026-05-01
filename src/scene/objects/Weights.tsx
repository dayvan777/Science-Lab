import { Draggable } from './Draggable'

const WEIGHTS = [
  { mass: 1000, radius: 0.035, height: 0.05, color: '#444', label: '1кг' },
  { mass: 500,  radius: 0.030, height: 0.040, color: '#555', label: '500г' },
  { mass: 200,  radius: 0.024, height: 0.032, color: '#666', label: '200г' },
  { mass: 100,  radius: 0.020, height: 0.028, color: '#777', label: '100г' },
  { mass: 50,   radius: 0.016, height: 0.022, color: '#888', label: '50г' },
  { mass: 20,   radius: 0.012, height: 0.018, color: '#999', label: '20г' },
  { mass: 10,   radius: 0.010, height: 0.014, color: '#aaa', label: '10г' },
]

type Props = { startPosition: [number, number, number] }

export function Weights({ startPosition }: Props) {
  const [x0, y0, z0] = startPosition
  return (
    <>
      {WEIGHTS.map((w, i) => {
        const x = x0 + (i - 3) * 0.05
        return (
          <Draggable
            key={w.label}
            position={[x, y0 + w.height / 2, z0]}
            mass={w.mass}
            shape={{ type: 'cuboid', halfExtents: [w.radius, w.height / 2, w.radius] }}
          >
            <mesh castShadow>
              <cylinderGeometry args={[w.radius, w.radius * 0.95, w.height, 16]} />
              <meshStandardMaterial color={w.color} metalness={0.7} roughness={0.45} envMapIntensity={1.2} />
            </mesh>
          </Draggable>
        )
      })}
    </>
  )
}
