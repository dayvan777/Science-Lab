import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Mesh } from 'three'

type Props = { position: [number, number, number]; color?: string }

export function Arrow3D({ position, color = '#0071e3' }: Props) {
  const ref = useRef<Mesh>(null)
  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.getElapsedTime()
    ref.current.position.y = position[1] + 0.05 + Math.sin(t * 3) * 0.015
    const scale = 1 + Math.sin(t * 4) * 0.1
    ref.current.scale.setScalar(scale)
  })
  return (
    <group position={position}>
      <mesh ref={ref} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.025, 0.06, 4]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} transparent opacity={0.9} />
      </mesh>
    </group>
  )
}
