import { useRef, useState, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, RapierRigidBody } from '@react-three/rapier'
import { Vector3, TubeGeometry, CatmullRomCurve3 } from 'three'
import { registerSnap } from '../../../sdk/physics/snapTargets'
import { getBodyMass, onDragStart } from '../../../sdk/physics/bodyRegistry'
import { Outlines, RoundedBox } from '@react-three/drei'
import { useReadings } from '../state/InstrumentReadings'
import {
  createDialTexture,
  DIAL_TEXTURE_H,
  DIAL_READING_TOP_PX,
  DIAL_READING_BOTTOM_PX,
} from '../textures/dialTexture'
import { springStep } from '../../../sdk/animation'

// Physics — real spring constant for force ↔ extension mapping.
// SPRING_K = 50 N/m  →  0–5 N maps to 0–10 cm of spring extension.
const G = 9.81
const SPRING_K = 50

// Visual oscillation — separate spring-damper for the hook's "wobble" feel
const VISUAL_STIFFNESS = 80
const VISUAL_DAMPING = 7

// Geometry — all in lever-local coords, in metres. Scaled +50 % vs v0.1.2
// so the dual-scale backplate has comfortable spacing and the device looks
// like a real classroom dynamometer.
const STAND_H = 0.6
const SPRING_TOP_Y = 0.55
const HOOK_REST_Y = 0.35
const HOOK_AT_FIVE_N = 0.25
const SPRING_NATURAL_LEN = SPRING_TOP_Y - HOOK_REST_Y  // 0.20 m

const SPRING_HELIX_RADIUS = 0.014
const SPRING_TUBE_RADIUS = 0.0018
const SPRING_COILS = 14

// Where the spring/scale axis sits, relative to the stand at x=0
const ARM_X_OFFSET = 0.05

// Mechanical pointer: rigid horizontal arm hanging off the spring's bottom,
// red triangle tip on the LEFT side that sweeps the backplate.
const POINTER_ARM_LEN = 0.05
const POINTER_ARM_THICKNESS = 0.003
const POINTER_TIP_LEN = 0.014
const POINTER_TIP_RADIUS = 0.005

// Pointer's vertical travel range — must equal HOOK_REST_Y − HOOK_AT_FIVE_N.
const POINTER_TRAVEL = HOOK_REST_Y - HOOK_AT_FIVE_N        // 0.10 m

// Backplate (dual-scale): physical plane extends slightly above and below
// the pointer's travel so the texture's "title" margin and bottom padding
// don't eat into the readable scale. Derived from the texture's reading-area
// fractions — single source of truth lives in `dialTexture.ts`.
const READING_TOP_FRAC    = DIAL_READING_TOP_PX / DIAL_TEXTURE_H              // ≈ 0.078
const READING_BOTTOM_FRAC = DIAL_READING_BOTTOM_PX / DIAL_TEXTURE_H           // ≈ 0.922
const READING_FRAC        = READING_BOTTOM_FRAC - READING_TOP_FRAC            // ≈ 0.844
const BACKPLATE_HEIGHT    = POINTER_TRAVEL / READING_FRAC                     // ≈ 0.1185 m

// Plate top edge sits above HOOK_REST_Y by the top-margin's physical height,
// so the texture's "0" label (at READING_TOP_FRAC of the canvas) lands
// exactly at HOOK_REST_Y. Similarly the texture's "5" label lands at
// HOOK_AT_FIVE_N.
const BACKPLATE_TOP_Y    = HOOK_REST_Y + BACKPLATE_HEIGHT * READING_TOP_FRAC  // ≈ 0.359
const BACKPLATE_BOTTOM_Y = BACKPLATE_TOP_Y - BACKPLATE_HEIGHT                 // ≈ 0.241
const BACKPLATE_CENTER_Y = (BACKPLATE_TOP_Y + BACKPLATE_BOTTOM_Y) / 2         // ≈ 0.300
const BACKPLATE_WIDTH    = 0.10
const BACKPLATE_X        = ARM_X_OFFSET - POINTER_ARM_LEN - 0.01              // tip lands 1 cm inside the plate's right edge

// Thin rigid rod from pointer down to the hook (so the hook hangs BELOW
// the backplate without being obstructed by the scale).
const ROD_BELOW_POINTER_LEN = 0.13
const ROD_RADIUS = 0.0015

type Props = { position: [number, number, number]; active?: boolean }

/**
 * Build a TubeGeometry that follows a helix curve. We construct it once at
 * the spring's natural length and then scale Y at runtime to follow the hook.
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
    // Hook hangs at the BOTTOM of the rod, which is below the pointer (= r.current).
    const hookY_world = position[1] + r.current - ROD_BELOW_POINTER_LEN
    hook.setNextKinematicTranslation({
      x: position[0] + ARM_X_OFFSET,
      y: hookY_world,
      z: position[2],
    })

    if (attached) {
      if (attached.bodyType() !== 2) attached.setBodyType(2 /* KinematicPositionBased */, true)
      attached.setNextKinematicTranslation({
        x: position[0] + ARM_X_OFFSET,
        y: hookY_world - 0.03,
        z: position[2],
      })
    }
  })

  useEffect(() => {
    // Snap target tracks the hook, which now hangs ROD_BELOW_POINTER_LEN
    // below `hookY` (where the spring's bottom and the pointer sit).
    const hookWorldPos = new Vector3(
      position[0] + ARM_X_OFFSET,
      position[1] + hookY - ROD_BELOW_POINTER_LEN,
      position[2],
    )
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
      {/* Vertical stand — anodized matte black */}
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

      {/* Top horizontal arm */}
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

      {/* Coiled spring */}
      <mesh
        geometry={springGeometry}
        position={[ARM_X_OFFSET, springYCenter, 0]}
        scale={[1, springScaleY, 1]}
        castShadow
      >
        <meshStandardMaterial color="#c8c8d0" metalness={0.9} roughness={0.18} envMapIntensity={1.2} />
      </mesh>

      {/* Backplate — the dual-scale board sits behind/beside the spring,
          flush with the pointer's full travel range. */}
      <mesh position={[BACKPLATE_X, BACKPLATE_CENTER_Y, 0]}>
        <planeGeometry args={[BACKPLATE_WIDTH, BACKPLATE_HEIGHT]} />
        <meshBasicMaterial map={scaleTexture} />
      </mesh>

      {/* Mechanical pointer group — rigidly tracks the spring's bottom (hookY).
          Contains: horizontal arm extending toward the backplate, a sharp red
          triangle tip at its left end, and a thin rod descending to the hook. */}
      <group position={[ARM_X_OFFSET, hookY, 0]}>
        {/* Horizontal arm: from the spring axis (x=0 in group-local) to the
            backplate's right edge. Length POINTER_ARM_LEN ≈ |BACKPLATE_X|. */}
        <mesh position={[-POINTER_ARM_LEN / 2, 0, 0]} castShadow>
          <boxGeometry args={[POINTER_ARM_LEN, POINTER_ARM_THICKNESS, 0.005]} />
          <meshStandardMaterial color="#9aa0a8" metalness={0.7} roughness={0.35} envMapIntensity={0.9} />
        </mesh>

        {/* Red triangular tip — apex points along +X (toward the spring axis),
            base 14 mm to the left. So the visible "arrow" points from the
            scale toward the spring; the apex sits on the right edge of the
            backplate plane (at z = +0.001 to avoid z-fighting). */}
        <mesh
          position={[-POINTER_ARM_LEN, 0, 0.001]}
          rotation={[0, 0, -Math.PI / 2]}
        >
          <coneGeometry args={[POINTER_TIP_RADIUS, POINTER_TIP_LEN, 3]} />
          <meshStandardMaterial
            color="#ff3b30"
            emissive="#ff3b30"
            emissiveIntensity={0.7}
            toneMapped={false}
          />
        </mesh>

        {/* Thin rigid rod from the pointer arm DOWN to the hook (the rod's top
            is at the arm, the hook ring sits at the bottom). */}
        <mesh position={[0, -ROD_BELOW_POINTER_LEN / 2, 0]} castShadow>
          <cylinderGeometry args={[ROD_RADIUS, ROD_RADIUS, ROD_BELOW_POINTER_LEN, 8]} />
          <meshStandardMaterial color="#9aa0a8" metalness={0.7} roughness={0.35} envMapIntensity={0.9} />
        </mesh>
      </group>

      {/* Hook (kinematic — physics body for snap target). Now hangs BELOW
          the backplate, at hookY − ROD_BELOW_POINTER_LEN. */}
      <RigidBody
        ref={hookRef}
        type="kinematicPosition"
        colliders={false}
        position={[
          position[0] + ARM_X_OFFSET,
          position[1] + hookY - ROD_BELOW_POINTER_LEN,
          position[2],
        ]}
      >
        {/* Hook ring */}
        <mesh castShadow>
          <torusGeometry args={[0.014, 0.0028, 12, 24]} />
          <meshStandardMaterial color="#c8c8d0" metalness={0.95} roughness={0.15} envMapIntensity={1.2} />
        </mesh>
        {/* Hook stem (small cylinder above ring connecting to the rod above) */}
        <mesh position={[0, 0.012, 0]} castShadow>
          <cylinderGeometry args={[0.0015, 0.0015, 0.024, 8]} />
          <meshStandardMaterial color="#c8c8d0" metalness={0.95} roughness={0.15} envMapIntensity={1.2} />
        </mesh>
      </RigidBody>
    </group>
  )
}
