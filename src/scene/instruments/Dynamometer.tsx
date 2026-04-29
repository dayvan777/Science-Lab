import { useRef, useState, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, RapierRigidBody, BallCollider } from '@react-three/rapier'
import { CanvasTexture } from 'three'

const G = 9.81
const SPRING_K = 50  // N/m — gives 0–10 cm range for 0–5 N
const STAND_H = 0.4
const SPRING_TOP_Y = 0.4
const HOOK_REST_Y = 0.2
const SNAP_RADIUS = 0.05

type Props = { position: [number, number, number] }

export function Dynamometer({ position }: Props) {
  const hookRef = useRef<RapierRigidBody>(null)
  const [attached, setAttached] = useState<RapierRigidBody | null>(null)
  const [hookY, setHookY] = useState(SPRING_TOP_Y - HOOK_REST_Y)

  // Scale texture (drawn once)
  const scaleTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 256
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#f5f5f5'
    ctx.fillRect(0, 0, 64, 256)
    ctx.fillStyle = '#000'
    ctx.font = 'bold 14px sans-serif'
    ctx.textAlign = 'right'
    for (let i = 0; i <= 5; i++) {
      const y = 30 + i * 40
      ctx.fillText(`${i} N`, 50, y)
      ctx.fillRect(8, y - 3, 18, 2)
    }
    return new CanvasTexture(canvas)
  }, [])

  useEffect(() => {
    return () => { scaleTexture.dispose() }
  }, [scaleTexture])

  useFrame(() => {
    const hook = hookRef.current
    if (!hook) return
    const F = attached ? attached.mass() * G : 0
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

  const handleSnap = (body: RapierRigidBody) => {
    if (attached) return
    setAttached(body)
  }

  return (
    <group position={position}>
      {/* Vertical stand */}
      <mesh castShadow position={[0, STAND_H / 2, 0]}>
        <boxGeometry args={[0.04, STAND_H, 0.04]} />
        <meshStandardMaterial color="#333" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Top horizontal arm */}
      <mesh castShadow position={[0.05, STAND_H + 0.01, 0]}>
        <boxGeometry args={[0.14, 0.02, 0.04]} />
        <meshStandardMaterial color="#333" metalness={0.5} roughness={0.4} />
      </mesh>
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
        <BallCollider
          args={[0.012]}
          sensor
          onIntersectionEnter={({ other }) => {
            const body = other.rigidBody
            if (!body || attached) return
            // Only attach dynamic bodies
            if (body.bodyType() !== 0 /* Dynamic */) return
            // Check distance to hook position
            const t = body.translation()
            const dx = t.x - (position[0] + 0.05)
            const dy = t.y - (position[1] + hookY)
            const dz = t.z - position[2]
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
            if (dist < SNAP_RADIUS) handleSnap(body)
          }}
        />
        <mesh castShadow>
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
