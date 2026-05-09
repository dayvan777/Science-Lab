import { useRef, useState, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, RapierRigidBody } from '@react-three/rapier'
import { Vector3, TubeGeometry, CatmullRomCurve3 } from 'three'
import { registerSnap } from '../../../sdk/physics/snapTargets'
import { getBodyMass, onDragStart } from '../../../sdk/physics/bodyRegistry'
import { Outlines, RoundedBox } from '@react-three/drei'
import { useReadings } from '../state/InstrumentReadings'
import { createDialTexture } from '../textures/dialTexture'
import { springStep } from '../../../sdk/animation'

// Physics — real spring constant for force ↔ extension mapping
const G = 9.81
const SPRING_K = 50  // N/m — gives 0–10 cm range for 0–5 N

// Visual oscillation — separate spring-damper for the hook's "wobble" feel
const VISUAL_STIFFNESS = 80
const VISUAL_DAMPING = 7

// Geometry
const STAND_H = 0.4
const SPRING_TOP_Y = 0.4
const HOOK_REST_Y = 0.2
const SPRING_NATURAL_LEN = SPRING_TOP_Y - HOOK_REST_Y // 0.20m at rest

const SPRING_HELIX_RADIUS = 0.014
const SPRING_TUBE_RADIUS = 0.0018
const SPRING_COILS = 14
const ARM_X_OFFSET = 0.05  // how far the arm reaches from the stand

type Props = { position: [number, number, number]; active?: boolean }

/**
 * Build a TubeGeometry that follows a helix curve. We construct it once at the
 * spring's natural length and then scale Y at runtime to follow the hook.
 */
function buildSpringGeometry(): TubeGeometry {
  const points: Vector3[] = []
  const SEGMENTS = 96
  const length = SPRING_NATURAL_LEN
  for (let i = 0; i <= SEGMENTS; i++) {
    const t = i / SEGMENTS
    const angle = t * SPRING_COILS * Math.PI * 2
    // y starts at +length/2 (top) and ends at -length/2 (bottom)
    const y = length / 2 - t * length
    points.push(new Vector3(
      Math.cos(angle) * SPRING_HELIX_RADIUS,
      y,
      Math.sin(angle) * SPRING_HELIX_RADIUS,
    ))
  }
  const curve = new CatmullRomCurve3(points)
  return new TubeGeometry(curve, SEGMENTS * 2, SPRING_TUBE_RADIUS, 6, false)
}

export function Dynamometer({ position, active = false }: Props) {
  const hookRef = useRef<RapierRigidBody>(null)
  const [attached, setAttached] = useState<RapierRigidBody | null>(null)
  const [hookY, setHookY] = useState(HOOK_REST_Y)
  const hookVelocity = useRef(0)
  const setDynamometer = useReadings(s => s.setDynamometer)

  // Scale texture (drawn once)
  const scaleTexture = useMemo(() => createDialTexture(), [])
  const springGeometry = useMemo(() => buildSpringGeometry(), [])

  useEffect(() => {
    return () => {
      scaleTexture.dispose()
      springGeometry.dispose()
    }
  }, [scaleTexture, springGeometry])

  useFrame((_, delta) => {
    const hook = hookRef.current
    if (!hook) return
    const attachedMass = attached ? getBodyMass(attached) : 0
    const F = attachedMass * G
    setDynamometer(F)
    // Target hook Y — physical equilibrium under the current load
    const targetY = HOOK_REST_Y - F / SPRING_K
    // Spring-damper integration for visible oscillation when load changes
    const r = springStep({
      current: hookY,
      velocity: hookVelocity.current,
      target: targetY,
      stiffness: VISUAL_STIFFNESS,
      damping: VISUAL_DAMPING,
      dt: Math.min(delta, 0.033), // cap dt to avoid blow-up on tab refocus
    })
    hookVelocity.current = r.velocity
    setHookY(r.current)
    hook.setNextKinematicTranslation({
      x: position[0] + ARM_X_OFFSET,
      y: position[1] + r.current,
      z: position[2],
    })

    if (attached) {
      if (attached.bodyType() !== 2) attached.setBodyType(2 /* KinematicPositionBased */, true)
      attached.setNextKinematicTranslation({
        x: position[0] + ARM_X_OFFSET,
        y: position[1] + r.current - 0.03,
        z: position[2],
      })
    }
  })

  useEffect(() => {
    const hookWorldPos = new Vector3(position[0] + ARM_X_OFFSET, position[1] + hookY, position[2])
    const unregister = registerSnap({
      id: 'dynamometer-hook',
      instrumentId: 'dynamometer',
      position: hookWorldPos,
      radius: 0.20,
      keepKinematic: true,
      onAttach: (body) => setAttached(body),
    })
    return unregister
  }, [position, hookY])

  // Release attached body when user starts dragging it
  useEffect(() => {
    return onDragStart((body) => {
      setAttached(prev => prev === body ? null : prev)
    })
  }, [])

  // Visual spring length and y-center
  const currentSpringLen = Math.max(0.04, SPRING_TOP_Y - hookY)
  const springYCenter = (SPRING_TOP_Y + hookY) / 2
  const springScaleY = currentSpringLen / SPRING_NATURAL_LEN

  return (
    <group position={position}>
      {/* Vertical stand — anodized matte black, matches the digital scale housing */}
      <RoundedBox
        args={[0.04, STAND_H, 0.04]}
        radius={0.005}
        smoothness={4}
        position={[0, STAND_H / 2, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color="#222226" metalness={0.7} roughness={0.4} envMapIntensity={0.8} />
        {active && <Outlines thickness={3} color="#0071e3" />}
      </RoundedBox>

      {/* Top horizontal arm — same anodized finish */}
      <RoundedBox
        args={[0.16, 0.025, 0.04]}
        radius={0.005}
        smoothness={4}
        position={[ARM_X_OFFSET, STAND_H + 0.012, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color="#222226" metalness={0.7} roughness={0.4} envMapIntensity={0.8} />
      </RoundedBox>

      {/* Anchor cap where the spring attaches to the arm */}
      <mesh position={[ARM_X_OFFSET, STAND_H, 0]} castShadow>
        <cylinderGeometry args={[0.012, 0.012, 0.008, 16]} />
        <meshStandardMaterial color="#9aa0a8" metalness={0.95} roughness={0.15} envMapIntensity={1.2} />
      </mesh>

      {/* Coiled spring — TubeGeometry of a helix, scaled vertically to fit current length */}
      <mesh
        geometry={springGeometry}
        position={[ARM_X_OFFSET, springYCenter, 0]}
        scale={[1, springScaleY, 1]}
        castShadow
      >
        <meshStandardMaterial color="#c8c8d0" metalness={0.9} roughness={0.18} envMapIntensity={1.2} />
      </mesh>

      {/* Hook (kinematic — physics body for snap target) */}
      <RigidBody
        ref={hookRef}
        type="kinematicPosition"
        colliders={false}
        position={[position[0] + ARM_X_OFFSET, position[1] + hookY, position[2]]}
      >
        {/* Hook ring */}
        <mesh castShadow>
          <torusGeometry args={[0.014, 0.0028, 12, 24]} />
          <meshStandardMaterial color="#c8c8d0" metalness={0.95} roughness={0.15} envMapIntensity={1.2} />
        </mesh>
        {/* Hook stem (small cylinder above ring connecting to spring bottom) */}
        <mesh position={[0, 0.012, 0]} castShadow>
          <cylinderGeometry args={[0.0015, 0.0015, 0.024, 8]} />
          <meshStandardMaterial color="#c8c8d0" metalness={0.95} roughness={0.15} envMapIntensity={1.2} />
        </mesh>
      </RigidBody>

      {/* Scale plate (procedural 0-5 N dial) */}
      <mesh position={[-0.04, STAND_H * 0.6, 0]}>
        <planeGeometry args={[0.06, 0.24]} />
        <meshBasicMaterial map={scaleTexture} />
      </mesh>
    </group>
  )
}
