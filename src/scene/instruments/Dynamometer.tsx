import { useRef, useState, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, RapierRigidBody } from '@react-three/rapier'
import { Vector3 } from 'three'
import { registerSnap } from '../../physics/snapTargets'
import { Outlines, RoundedBox } from '@react-three/drei'
import { useReadings } from '../../lab/InstrumentReadings'
import { createDialTexture } from '../textures/dialTexture'

const G = 9.81
const SPRING_K = 50  // N/m — gives 0–10 cm range for 0–5 N
const STAND_H = 0.4
const SPRING_TOP_Y = 0.4
const HOOK_REST_Y = 0.2

type Props = { position: [number, number, number]; active?: boolean; dimmed?: boolean }

export function Dynamometer({ position, active = false, dimmed = false }: Props) {
  const hookRef = useRef<RapierRigidBody>(null)
  const [attached, setAttached] = useState<RapierRigidBody | null>(null)
  const [hookY, setHookY] = useState(SPRING_TOP_Y - HOOK_REST_Y)
  const setDynamometer = useReadings(s => s.setDynamometer)

  // Scale texture (drawn once)
  const scaleTexture = useMemo(() => createDialTexture(), [])

  useEffect(() => {
    return () => { scaleTexture.dispose() }
  }, [scaleTexture])

  useFrame(() => {
    const hook = hookRef.current
    if (!hook) return
    const F = attached ? attached.mass() * G : 0
    setDynamometer(F)
    const newY = SPRING_TOP_Y - HOOK_REST_Y - F / SPRING_K
    setHookY(newY)
    hook.setNextKinematicTranslation({
      x: position[0] + 0.05,
      y: position[1] + newY,
      z: position[2],
    })

    if (attached) {
      // Make attached body kinematic too, position just below hook
      if (attached.bodyType() !== 2) attached.setBodyType(2 /* KinematicPositionBased */, true)
      attached.setNextKinematicTranslation({
        x: position[0] + 0.05,
        y: position[1] + newY - 0.025, // hang slightly below hook
        z: position[2],
      })
    }
  })

  useEffect(() => {
    const hookWorldPos = new Vector3(position[0] + 0.05, position[1] + hookY, position[2])
    const unregister = registerSnap({
      id: 'dynamometer-hook',
      position: hookWorldPos,
      radius: 0.06,
      onAttach: (body) => setAttached(body),
    })
    return unregister
  }, [position, hookY])

  return (
    <group position={position}>
      {/* Vertical stand — rounded box */}
      <RoundedBox args={[0.04, STAND_H, 0.04]} radius={0.005} smoothness={4} position={[0, STAND_H / 2, 0]}>
        <meshStandardMaterial color="#3a3a3d" metalness={0.85} roughness={0.25} opacity={dimmed ? 0.5 : 1} transparent={dimmed} />
        {active && <Outlines thickness={3} color="#0071e3" />}
      </RoundedBox>
      {/* Top horizontal arm — rounded box */}
      <RoundedBox args={[0.16, 0.025, 0.04]} radius={0.005} smoothness={4} position={[0.05, STAND_H + 0.012, 0]}>
        <meshStandardMaterial color="#3a3a3d" metalness={0.85} roughness={0.25} />
      </RoundedBox>
      {/* Spring (visual) — cylinder length follows extension */}
      <mesh position={[0.05, (SPRING_TOP_Y + hookY) / 2, 0]}>
        <cylinderGeometry args={[0.008, 0.008, Math.max(0.02, SPRING_TOP_Y - hookY), 8]} />
        <meshStandardMaterial color="#aaa" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Hook (kinematic) */}
      <RigidBody
        ref={hookRef}
        type="kinematicPosition"
        colliders={false}
        position={[position[0] + 0.05, position[1] + hookY, position[2]]}
      >
        <mesh>
          <torusGeometry args={[0.012, 0.003, 8, 16]} />
          <meshStandardMaterial color="#888" metalness={0.7} />
        </mesh>
      </RigidBody>
      {/* Scale plate (showing 0-5 N) */}
      <mesh position={[-0.04, STAND_H * 0.6, 0]}>
        <planeGeometry args={[0.06, 0.24]} />
        <meshBasicMaterial map={scaleTexture} />
      </mesh>
    </group>
  )
}
