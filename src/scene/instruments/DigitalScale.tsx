import { useRef, useState, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import { RapierRigidBody } from '@react-three/rapier'
import { Vector3 } from 'three'
import { Outlines, RoundedBox } from '@react-three/drei'
import { registerSnap } from '../../sdk/physics/snapTargets'
import { getBodyMass, onDragStart } from '../../sdk/physics/bodyRegistry'
import { useReadings } from '../../lab/InstrumentReadings'
import { createLcdTexture, drawLcd } from '../textures/lcdTexture'
import { createBrandLabel } from '../textures/labelTexture'

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

    const grams = totalMassKg * 1000 - tareOffset
    // Smooth the reading slightly to reduce flicker as objects settle
    setReading(prev => prev * 0.7 + Math.max(0, grams) * 0.3)
    setDigitalScale(Math.max(0, Math.round(grams)))
  })

  // Register snap target for platform top
  useEffect(() => {
    const platformTopY = position[1] + HOUSING_H + PLATFORM_T + 0.05
    const snapPos = new Vector3(position[0], platformTopY, position[2])
    return registerSnap({
      id: `digital-scale-${position[0]}-${position[1]}-${position[2]}`,
      instrumentId: 'digital-scale',
      position: snapPos,
      radius: 0.30,  // magnetic — was 0.12
      keepKinematic: true,
      onAttach: (body) => {
        // Keep KINEMATIC — body anchored, won't bounce when others land
        body.setTranslation({ x: snapPos.x, y: snapPos.y + 0.02, z: snapPos.z }, true)
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
        position={[0, HOUSING_H / 2, 0]}>
        <meshStandardMaterial color="#3a3a3d" metalness={0.85} roughness={0.25} />
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
        <mesh>
          <boxGeometry args={[PLATFORM_W, PLATFORM_T, PLATFORM_D]} />
          <meshStandardMaterial color="#888" metalness={0.6} roughness={0.3} />
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
