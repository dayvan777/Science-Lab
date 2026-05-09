import { useRef, useState, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import { RapierRigidBody } from '@react-three/rapier'
import { Vector3 } from 'three'
import { Outlines, RoundedBox } from '@react-three/drei'
import { registerSnap } from '../../../sdk/physics/snapTargets'
import { getBodyMass, getBodyHalfHeight, onDragStart } from '../../../sdk/physics/bodyRegistry'
import { useReadings } from '../state/InstrumentReadings'
import { createLcdTexture, drawLcd } from '../textures/lcdTexture'
import { createBrandLabel } from '../textures/labelTexture'
import { lerp } from '../../../sdk/animation'

const PLATFORM_W = 0.20
const PLATFORM_D = 0.20
const PLATFORM_T = 0.02
const HOUSING_H = 0.04
const LCD_W = 0.12
const LCD_H = 0.04

type Props = { position: [number, number, number]; active?: boolean }

export function DigitalScale({ position, active = false }: Props) {
  const platformRef = useRef<RapierRigidBody>(null)
  const [reading, setReading] = useState(0)
  const [tareOffset, setTareOffset] = useState(0)
  const setDigitalScale = useReadings(s => s.setDigitalScale)

  // Track which bodies are snapped onto the platform (explicit tracking
  // is more reliable than contactPairsWith for kinematic-fixed pairs).
  const snappedItems = useRef<Set<RapierRigidBody>>(new Set())

  const lcdTexture = useMemo(() => createLcdTexture(), [])
  const brandTexture = useMemo(() => createBrandLabel('LAB SCALE'), [])

  // Update LCD texture when reading changes
  useEffect(() => {
    drawLcd(lcdTexture, reading)
  }, [reading, lcdTexture])

  // When user starts dragging a body, remove it from our tracking set
  useEffect(() => {
    return onDragStart((body) => {
      snappedItems.current.delete(body)
    })
  }, [])

  useFrame(() => {
    let totalMassKg = 0
    snappedItems.current.forEach(b => { totalMassKg += getBodyMass(b) })
    const targetGrams = Math.max(0, totalMassKg * 1000 - tareOffset)
    // Reading-tick: digits visibly tick toward target (~500ms settle), then snap when close.
    setReading(prev => {
      const next = lerp(prev, targetGrams, 0.15)
      return Math.abs(next - targetGrams) < 0.5 ? targetGrams : next
    })
    setDigitalScale(Math.round(targetGrams))
  })

  // Register snap target for the platform top
  useEffect(() => {
    // Actual platform top surface in world coords:
    const platformTopY = position[1] + HOUSING_H + PLATFORM_T
    // Snap-detection target sits slightly above so a body dropped close enough
    // is captured even when its center is above the platform.
    const snapPos = new Vector3(position[0], platformTopY + 0.05, position[2])
    return registerSnap({
      id: `digital-scale-${position[0]}-${position[1]}-${position[2]}`,
      instrumentId: 'digital-scale',
      position: snapPos,
      radius: 0.30,  // magnetic — was 0.12
      keepKinematic: true,
      onAttach: (body) => {
        // Place the body so its BOTTOM rests on the platform top + 1mm epsilon.
        // Use the body's registered halfHeight (radius for spheres, halfExtents.y
        // for cuboids) so the resting height matches the actual collider size.
        const halfHeight = getBodyHalfHeight(body)
        const restingY = platformTopY + halfHeight + 0.001
        body.setTranslation({ x: position[0], y: restingY, z: position[2] }, true)
        body.setLinvel({ x: 0, y: 0, z: 0 }, true)
        body.setAngvel({ x: 0, y: 0, z: 0 }, true)
        snappedItems.current.add(body)
      },
    })
  }, [position])

  const onTare = () => setTareOffset(prev => prev + reading)

  return (
    <group position={position}>
      {/* Housing — rounded box */}
      <RoundedBox args={[PLATFORM_W * 1.1, HOUSING_H, PLATFORM_D * 1.1]} radius={0.005} smoothness={4}
        position={[0, HOUSING_H / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial
          color="#222226"
          metalness={0.7}
          roughness={0.4}
          envMapIntensity={0.8}
        />
        {active && <Outlines thickness={3} color="#0071e3" />}
      </RoundedBox>

      {/* Brand label on front */}
      <mesh position={[0, HOUSING_H / 2 - 0.012, PLATFORM_D / 2 * 1.1 + 0.002]}>
        <planeGeometry args={[0.06, 0.012]} />
        <meshBasicMaterial map={brandTexture} transparent />
      </mesh>

      {/* Platform with collision */}
      <RigidBody
        ref={platformRef}
        type="fixed"
        colliders={false}
        position={[0, HOUSING_H + PLATFORM_T / 2, 0]}
      >
        <CuboidCollider args={[PLATFORM_W / 2, PLATFORM_T / 2, PLATFORM_D / 2]} />
        <mesh castShadow receiveShadow>
          <boxGeometry args={[PLATFORM_W, PLATFORM_T, PLATFORM_D]} />
          <meshStandardMaterial
            color="#9a9aa0"
            metalness={0.85}
            roughness={0.35}
            envMapIntensity={1.0}
          />
        </mesh>
      </RigidBody>

      {/* LCD display, facing forward so user can see the reading */}
      <mesh position={[0, HOUSING_H / 2, PLATFORM_D / 2 * 1.1 + 0.001]}>
        <planeGeometry args={[LCD_W, LCD_H]} />
        <meshBasicMaterial map={lcdTexture} />
      </mesh>

      {/* Tare button — glowing red sphere */}
      <mesh
        position={[LCD_W / 2 + 0.018, HOUSING_H / 2, PLATFORM_D / 2 * 1.1 + 0.001]}
        onClick={onTare}
      >
        <sphereGeometry args={[0.006, 12, 8]} />
        <meshStandardMaterial color="#ff3b30" emissive="#ff3b30" emissiveIntensity={0.3} roughness={0.3} />
      </mesh>
    </group>
  )
}
