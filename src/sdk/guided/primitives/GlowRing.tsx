import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Mesh, MeshBasicMaterial } from 'three'

type Props = { position: [number, number, number]; radius?: number; color?: string }

export function GlowRing({ position, radius = 0.1, color = '#0071e3' }: Props) {
  const inner = useRef<Mesh>(null)
  const outer = useRef<Mesh>(null)
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (inner.current) {
      const m = inner.current.material as MeshBasicMaterial
      m.opacity = 0.5 + Math.sin(t * 2) * 0.2
    }
    if (outer.current) {
      const phase = (t * 0.5) % 1
      outer.current.scale.setScalar(1 + phase * 0.5)
      const m = outer.current.material as MeshBasicMaterial
      m.opacity = 0.5 * (1 - phase)
    }
  })
  return (
    <group position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh ref={inner}>
        <ringGeometry args={[radius * 0.85, radius, 48]} />
        <meshBasicMaterial color={color} transparent opacity={0.5} />
      </mesh>
      <mesh ref={outer}>
        <ringGeometry args={[radius * 0.85, radius, 48]} />
        <meshBasicMaterial color={color} transparent opacity={0.4} />
      </mesh>
    </group>
  )
}
