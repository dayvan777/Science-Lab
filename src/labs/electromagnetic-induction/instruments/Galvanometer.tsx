import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import type { Mesh } from 'three'
import { useInductionReadings } from '../state/InductionReadings'
import { createGalvanometerDialTexture } from '../textures/galvanometerDial'
import { springStep } from '../../../sdk/animation'
import { useTapDetector } from '../../../sdk/object/useTapDetector'
import { useCameraStore } from '../../../sdk/scene/cameraStore'

const HOUSING_W = 0.16
const HOUSING_H = 0.18
const HOUSING_D = 0.06
const FACE_W = 0.13
const FACE_H = 0.13
const NEEDLE_LEN = 0.05
const NEEDLE_PIVOT_Y_LOCAL = -FACE_H / 2 + 0.005  // near the bottom of the face

const NEEDLE_STIFFNESS = 70
const NEEDLE_DAMPING = 8

type Props = { position: [number, number, number] }

export function Galvanometer({ position }: Props) {
  const dialTexture = useMemo(() => createGalvanometerDialTexture(), [])
  const needleRef = useRef<Mesh>(null)
  const displayedAngle = useRef(0)
  const velocity = useRef(0)

  useEffect(() => {
    return () => { dialTexture.dispose() }
  }, [dialTexture])

  const setFocusTarget = useCameraStore(s => s.setFocusTarget)
  const tap = useTapDetector(() => setFocusTarget('galv'))

  useFrame((_, delta) => {
    // PERF: read from store via getState() instead of selector — avoids
    // a Zustand subscription that would re-render this component every
    // frame when readings change (~60Hz). The component renders once at
    // mount; per-frame updates are applied directly to the needle's
    // rotation ref. If you need a value that DRIVES a re-render
    // (e.g. an isComplete flag), put it in LabState, not InductionReadings.
    const targetAngle = useInductionReadings.getState().galvanometerAngle
    const r = springStep({
      current: displayedAngle.current,
      velocity: velocity.current,
      target: targetAngle,
      stiffness: NEEDLE_STIFFNESS,
      damping: NEEDLE_DAMPING,
      dt: Math.min(delta, 0.033),
    })
    displayedAngle.current = r.current
    velocity.current = r.velocity
    if (needleRef.current) {
      needleRef.current.rotation.z = -r.current
    }
  })

  return (
    <group position={position} {...tap}>
      {/* Black housing */}
      <RoundedBox
        args={[HOUSING_W, HOUSING_H, HOUSING_D]}
        radius={0.008}
        smoothness={4}
        position={[0, HOUSING_H / 2, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color="#1a1a1d" metalness={0.55} roughness={0.40} envMapIntensity={0.5} />
      </RoundedBox>

      {/* Front face plane with the dial texture */}
      <mesh position={[0, HOUSING_H / 2, HOUSING_D / 2 + 0.001]}>
        <planeGeometry args={[FACE_W, FACE_H]} />
        <meshBasicMaterial map={dialTexture} />
      </mesh>

      {/* Needle — thin red box rotating around its base */}
      <group position={[0, HOUSING_H / 2 + NEEDLE_PIVOT_Y_LOCAL, HOUSING_D / 2 + 0.002]}>
        <mesh ref={needleRef} position={[0, NEEDLE_LEN / 2, 0]}>
          <boxGeometry args={[0.0028, NEEDLE_LEN, 0.002]} />
          <meshStandardMaterial color="#ff3b30" emissive="#ff3b30" emissiveIntensity={0.7} toneMapped={false} />
        </mesh>
      </group>

      {/* Two terminal posts on the front bottom (for wires to attach visually) */}
      <mesh position={[-FACE_W * 0.30, 0.012, HOUSING_D / 2 + 0.005]} castShadow>
        <cylinderGeometry args={[0.0045, 0.0045, 0.012, 16]} />
        <meshStandardMaterial color="#c8c8d0" metalness={0.95} roughness={0.15} envMapIntensity={1.2} />
      </mesh>
      <mesh position={[FACE_W * 0.30, 0.012, HOUSING_D / 2 + 0.005]} castShadow>
        <cylinderGeometry args={[0.0045, 0.0045, 0.012, 16]} />
        <meshStandardMaterial color="#c8c8d0" metalness={0.95} roughness={0.15} envMapIntensity={1.2} />
      </mesh>
    </group>
  )
}
