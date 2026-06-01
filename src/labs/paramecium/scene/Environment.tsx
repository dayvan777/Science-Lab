import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Points, BufferGeometry, Float32BufferAttribute } from 'three'
import { useReducedMotion } from '../../../sdk/a11y/useReducedMotion'

function Particles() {
  const ref = useRef<Points>(null)
  const reduced = useReducedMotion()
  const geo = useMemo(() => {
    const N = 260, arr: number[] = []
    for (let i = 0; i < N; i++) arr.push((Math.random() - 0.5) * 15, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 9)
    const g = new BufferGeometry()
    g.setAttribute('position', new Float32BufferAttribute(arr, 3))
    return g
  }, [])
  useFrame((_, dt) => { if (ref.current && !reduced) ref.current.rotation.y += dt * 0.02 })
  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial color="#bfeee8" size={0.05} sizeAttenuation transparent opacity={0.5} depthWrite={false} />
    </points>
  )
}

/** A faint background microbe silhouette for a sense of life. */
function Microbe({ position }: { position: [number, number, number] }) {
  return (
    <mesh position={position} rotation={[0, 0, 0.5]} scale={[1, 0.5, 0.5]}>
      <sphereGeometry args={[1, 16, 12]} />
      <meshBasicMaterial color="#7fb8b2" wireframe transparent opacity={0.12} />
    </mesh>
  )
}

export function Environment() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[4, 6, 5]} intensity={1.2} />
      <directionalLight position={[-5, -2, -3]} intensity={0.4} color="#9fd8ff" />
      <fog attach="fog" args={['#0a1c26', 8, 20]} />
      <Particles />
      <Microbe position={[-6, 2, -4]} />
      <Microbe position={[7, -2.5, -5]} />
    </>
  )
}
