import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { PointLight, MeshStandardMaterial } from 'three'
import { useInductionReadings } from '../state/InductionReadings'
import { useTapDetector } from '../../../sdk/object/useTapDetector'
import { useCameraStore } from '../../../sdk/scene/cameraStore'

const BULB_GLASS_R = 0.025
const BASE_HEIGHT = 0.020
const MAX_LIGHT_INTENSITY = 1.8                  // peak point-light intensity (dimmed from 2.5)
const EMISSIVE_SCALE = 2.0                       // peak emissive intensity on the glass material
const TIME_CONSTANT_MS = 150                     // thermal inertia (≈ real incandescent filament)
const STIFFNESS = 1000 / TIME_CONSTANT_MS        // per-second decay coefficient (= 6.67)

type Props = { position: [number, number, number] }

export function Bulb({ position }: Props) {
  const lightRef = useRef<PointLight>(null)
  const glassMatRef = useRef<MeshStandardMaterial>(null)
  // Smoothed brightness — exponentially lerps toward the store's instantaneous
  // bulbBrightness with a 150ms time constant. Frame-rate-independent.
  const smoothBrightness = useRef(0)

  const setFocusTarget = useCameraStore(s => s.setFocusTarget)
  const tap = useTapDetector(() => setFocusTarget('bulb'))

  // Update light + emissive every frame via refs — avoids React re-render churn.
  // PERF: read from store via getState() instead of selector — same reasoning
  // as Galvanometer.tsx. Per-frame state changes don't trigger this component
  // to reconcile.
  useFrame((_, delta) => {
    const target = useInductionReadings.getState().bulbBrightness
    const step = Math.min(1, delta * STIFFNESS)
    smoothBrightness.current += (target - smoothBrightness.current) * step
    if (lightRef.current) {
      lightRef.current.intensity = smoothBrightness.current * MAX_LIGHT_INTENSITY
    }
    if (glassMatRef.current) {
      glassMatRef.current.emissiveIntensity = smoothBrightness.current * EMISSIVE_SCALE
    }
  })

  return (
    <group position={position} {...tap}>
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
