import { useRef, useState, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider, useRapier } from '@react-three/rapier'
import { RapierRigidBody } from '@react-three/rapier'
import { CanvasTexture, Vector3 } from 'three'
import { RigidBodyType } from '@dimforge/rapier3d-compat'
import { Outlines } from '@react-three/drei'
import { registerSnap } from '../../physics/snapTargets'
import { useReadings } from '../../lab/InstrumentReadings'

const PLATFORM_W = 0.20
const PLATFORM_D = 0.20
const PLATFORM_T = 0.02
const HOUSING_H = 0.04
const LCD_W = 0.12
const LCD_H = 0.04

type Props = { position: [number, number, number]; active?: boolean }

export function DigitalScale({ position, active = false }: Props) {
  const platformRef = useRef<RapierRigidBody>(null)
  const { world } = useRapier()
  const [reading, setReading] = useState(0)
  const [tareOffset, setTareOffset] = useState(0)
  const setDigitalScale = useReadings(s => s.setDigitalScale)

  const lcdTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 96
    return new CanvasTexture(canvas)
  }, [])

  // Update LCD texture when reading changes
  useEffect(() => {
    const ctx = (lcdTexture.image as HTMLCanvasElement).getContext('2d')!
    ctx.fillStyle = '#a0c0a0'
    ctx.fillRect(0, 0, 256, 96)
    ctx.fillStyle = '#1a1a1a'
    ctx.font = 'bold 56px monospace'
    ctx.textAlign = 'right'
    ctx.fillText(`${Math.round(reading)} g`, 240, 70)
    lcdTexture.needsUpdate = true
  }, [reading, lcdTexture])

  useFrame(() => {
    const platform = platformRef.current
    if (!platform) return

    let totalMassKg = 0

    // Get the platform's collider — rapier RigidBody.collider(i) returns the i-th collider
    const platformCollider = platform.collider(0)

    // world.contactPairsWith is available on the rapier World object:
    // it iterates all colliders currently in contact with platformCollider
    world.contactPairsWith(platformCollider, (otherCollider) => {
      const body = otherCollider.parent()
      if (!body) return
      if (body.handle === platform.handle) return
      if (body.bodyType() === RigidBodyType.Dynamic) {
        totalMassKg += body.mass()
      }
    })

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
      position: snapPos,
      radius: 0.12,
      onAttach: (body) => {
        body.setBodyType(0 /* Dynamic */, true)
        body.setTranslation({ x: snapPos.x, y: snapPos.y + 0.02, z: snapPos.z }, true)
        body.setLinvel({ x: 0, y: 0, z: 0 }, true)
        body.setAngvel({ x: 0, y: 0, z: 0 }, true)
      },
    })
  }, [position])

  const onTare = () => setTareOffset(prev => prev + reading)

  return (
    <group position={position}>
      {/* Housing */}
      <mesh castShadow position={[0, HOUSING_H / 2, 0]}>
        <boxGeometry args={[PLATFORM_W * 1.1, HOUSING_H, PLATFORM_D * 1.1]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.4} metalness={0.2} />
        {active && <Outlines thickness={3} color="#f4d03f" />}
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
          <meshStandardMaterial color="#888" metalness={0.6} roughness={0.3} />
        </mesh>
      </RigidBody>

      {/* LCD display, facing forward so user can see the reading */}
      <mesh position={[0, HOUSING_H / 2, PLATFORM_D / 2 * 1.1 + 0.001]}>
        <planeGeometry args={[LCD_W, LCD_H]} />
        <meshBasicMaterial map={lcdTexture} />
      </mesh>

      {/* Tare button (visual + clickable) */}
      <mesh
        position={[LCD_W / 2 + 0.015, HOUSING_H / 2, PLATFORM_D / 2 * 1.1 + 0.001]}
        onClick={onTare}
      >
        <boxGeometry args={[0.012, 0.012, 0.005]} />
        <meshStandardMaterial color="#e74c3c" />
      </mesh>
    </group>
  )
}
