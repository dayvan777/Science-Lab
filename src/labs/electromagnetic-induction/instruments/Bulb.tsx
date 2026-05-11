import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { PointLight, MeshStandardMaterial } from 'three'
import { useInductionReadings } from '../state/InductionReadings'

const BULB_GLASS_R = 0.025
const BASE_HEIGHT = 0.020
const MAX_LIGHT_INTENSITY = 2.5

type Props = { position: [number, number, number] }

export function Bulb({ position }: Props) {
  const brightness = useInductionReadings(s => s.bulbBrightness)
  const lightRef = useRef<PointLight>(null)
  const glassMatRef = useRef<MeshStandardMaterial>(null)

  // Update light + emissive every frame via refs — avoids React re-render churn.
  useFrame(() => {
    if (lightRef.current) {
      lightRef.current.intensity = brightness * MAX_LIGHT_INTENSITY
    }
    if (glassMatRef.current) {
      glassMatRef.current.emissiveIntensity = brightness * 2.5
    }
  })

  return (
    <group position={position}>
      {/* Brass base */}
      <mesh position={[0, BASE_HEIGHT / 2, 0]} castShadow>
        <cylinderGeometry args={[BULB_GLASS_R * 0.55, BULB_GLASS_R * 0.7, BASE_HEIGHT, 24]} />
        <meshStandardMaterial color="#c8a050" metalness={0.85} roughness={0.30} envMapIntensity={1.0} />
      </mesh>
      {/* Frosted glass sphere */}
      <mesh position={[0, BASE_HEIGHT + BULB_GLASS_R, 0]} castShadow>
        <sphereGeometry args={[BULB_GLASS_R, 24, 16]} />
        <meshStandardMaterial
          ref={glassMatRef}
          color="#fff7d8"
          emissive="#ffe890"
          emissiveIntensity={0}
          metalness={0}
          roughness={0.35}
          transparent
          opacity={0.92}
        />
      </mesh>
      {/* Point light inside the bulb */}
      <pointLight
        ref={lightRef}
        position={[0, BASE_HEIGHT + BULB_GLASS_R, 0]}
        color="#ffe890"
        intensity={0}
        distance={1.2}
        decay={2}
      />
    </group>
  )
}
