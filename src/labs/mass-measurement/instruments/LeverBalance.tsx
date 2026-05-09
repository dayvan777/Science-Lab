import { useRef, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { RapierRigidBody } from '@react-three/rapier'
import { Outlines, RoundedBox } from '@react-three/drei'
import { Vector3, Group } from 'three'
import { registerSnap } from '../../../sdk/physics/snapTargets'
import { getBodyMass, onDragStart } from '../../../sdk/physics/bodyRegistry'
import { useReadings } from '../../../lab/InstrumentReadings'

const STAND_H = 0.25
const BEAM_LEN = 0.45
const BEAM_T = 0.012
const PAN_R = 0.07
const PAN_DEPTH = 0.015
const REFERENCE_MASS = 0.2  // 200g — full tilt at this difference

type Props = { position: [number, number, number]; active?: boolean }

export function LeverBalance({ position, active = false }: Props) {
  const beamRef = useRef<Group>(null)
  const [leftMassKg, setLeftMassKg] = useState(0)
  const [rightMassKg, setRightMassKg] = useState(0)
  const setLeverTilt = useReadings(s => s.setLeverTilt)
  const setLeverRightPanGrams = useReadings(s => s.setLeverRightPanGrams)

  // Track which bodies are on which pan
  const leftItems = useRef<Set<RapierRigidBody>>(new Set())
  const rightItems = useRef<Set<RapierRigidBody>>(new Set())

  function recompute() {
    let l = 0
    leftItems.current.forEach(b => { l += getBodyMass(b) })
    let r = 0
    rightItems.current.forEach(b => { r += getBodyMass(b) })
    setLeftMassKg(l)
    setRightMassKg(r)
  }

  // Subscribe to drag-start: when ANY body starts being dragged,
  // remove it from our pan tracking sets so user can move objects between instruments.
  useEffect(() => {
    return onDragStart((body) => {
      let changed = false
      if (leftItems.current.delete(body)) changed = true
      if (rightItems.current.delete(body)) changed = true
      if (changed) recompute()
    })
  }, [])

  // Register snap targets for left and right pans
  useEffect(() => {
    const leftPos = new Vector3(
      position[0] - BEAM_LEN / 2,
      position[1] + STAND_H + 0.05,
      position[2]
    )
    const rightPos = new Vector3(
      position[0] + BEAM_LEN / 2,
      position[1] + STAND_H + 0.05,
      position[2]
    )

    const unregLeft = registerSnap({
      id: `lever-left-${position[0]}`,
      instrumentId: 'lever-balance',
      position: leftPos,
      radius: 0.30,
      keepKinematic: true,
      onAttach: (body) => {
        // Remove from right if it was there
        rightItems.current.delete(body)
        leftItems.current.add(body)
        body.setLinvel({ x: 0, y: 0, z: 0 }, true)
        body.setAngvel({ x: 0, y: 0, z: 0 }, true)
        recompute()
      },
    })

    const unregRight = registerSnap({
      id: `lever-right-${position[0]}`,
      instrumentId: 'lever-balance',
      position: rightPos,
      radius: 0.30,
      keepKinematic: true,
      onAttach: (body) => {
        leftItems.current.delete(body)
        rightItems.current.add(body)
        body.setLinvel({ x: 0, y: 0, z: 0 }, true)
        body.setAngvel({ x: 0, y: 0, z: 0 }, true)
        recompute()
      },
    })

    return () => { unregLeft(); unregRight() }
  }, [position])

  // Animate beam tilt + position snapped items on pans each frame
  useFrame((_, delta) => {
    // Heavier side goes DOWN. With beam group rotation.z > 0, left pan goes down.
    // So when leftMass > rightMass (object on left), tilt should be POSITIVE.
    const massDiff = leftMassKg - rightMassKg
    const targetTilt = Math.max(-0.25, Math.min(0.25, (massDiff / REFERENCE_MASS) * 0.25))

    if (beamRef.current) {
      const current = beamRef.current.rotation.z
      const next = current + (targetTilt - current) * Math.min(1, delta * 4)
      beamRef.current.rotation.z = next
      setLeverTilt(next)
    }

    // Position snapped items to follow their pans as beam tilts
    const tiltZ = beamRef.current?.rotation.z ?? 0
    const cosT = Math.cos(tiltZ)
    const sinT = Math.sin(tiltZ)

    const leftPanWorldX = position[0] - cosT * BEAM_LEN / 2
    const leftPanWorldY = position[1] + STAND_H - sinT * BEAM_LEN / 2 + 0.02
    const rightPanWorldX = position[0] + cosT * BEAM_LEN / 2
    const rightPanWorldY = position[1] + STAND_H + sinT * BEAM_LEN / 2 + 0.02

    leftItems.current.forEach(b => {
      try {
        b.setNextKinematicTranslation({ x: leftPanWorldX, y: leftPanWorldY, z: position[2] })
      } catch (_) {}
    })
    rightItems.current.forEach(b => {
      try {
        b.setNextKinematicTranslation({ x: rightPanWorldX, y: rightPanWorldY, z: position[2] })
      } catch (_) {}
    })

    // Update HUD reading
    setLeverRightPanGrams(Math.round(rightMassKg * 1000))
  })

  return (
    <group position={position}>
      {/* Stand */}
      <RoundedBox args={[0.04, STAND_H, 0.04]} radius={0.005} smoothness={4} position={[0, STAND_H / 2, 0]}>
        <meshStandardMaterial color="#3a3a3d" metalness={0.85} roughness={0.25} />
        {active && <Outlines thickness={3} color="#0071e3" />}
      </RoundedBox>

      {/* Pivot decoration */}
      <mesh position={[0, STAND_H, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.01, 0.01, 0.05, 16]} />
        <meshStandardMaterial color="#3a3a3d" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* Beam group — visual only, manually rotated */}
      <group ref={beamRef} position={[0, STAND_H, 0]}>
        <RoundedBox args={[BEAM_LEN, BEAM_T, 0.024]} radius={0.003} smoothness={4}>
          <meshStandardMaterial color="#aaa" metalness={0.7} roughness={0.3} />
        </RoundedBox>
        {/* Indicator arrow */}
        <mesh position={[0, -BEAM_T / 2 - 0.05, 0]}>
          <coneGeometry args={[0.006, 0.07, 4]} />
          <meshStandardMaterial color="#ff3b30" />
        </mesh>
        {/* Left pan */}
        <group position={[-BEAM_LEN / 2, -PAN_DEPTH, 0]}>
          <mesh>
            <cylinderGeometry args={[PAN_R, PAN_R * 0.85, PAN_DEPTH * 0.6, 32]} />
            <meshStandardMaterial color="#888" metalness={0.6} roughness={0.4} />
          </mesh>
          <mesh position={[0, PAN_DEPTH * 0.3, 0]}>
            <torusGeometry args={[PAN_R * 0.95, 0.003, 8, 32]} />
            <meshStandardMaterial color="#aaa" metalness={0.8} roughness={0.2} />
          </mesh>
        </group>
        {/* Right pan */}
        <group position={[BEAM_LEN / 2, -PAN_DEPTH, 0]}>
          <mesh>
            <cylinderGeometry args={[PAN_R, PAN_R * 0.85, PAN_DEPTH * 0.6, 32]} />
            <meshStandardMaterial color="#888" metalness={0.6} roughness={0.4} />
          </mesh>
          <mesh position={[0, PAN_DEPTH * 0.3, 0]}>
            <torusGeometry args={[PAN_R * 0.95, 0.003, 8, 32]} />
            <meshStandardMaterial color="#aaa" metalness={0.8} roughness={0.2} />
          </mesh>
        </group>
      </group>
    </group>
  )
}
