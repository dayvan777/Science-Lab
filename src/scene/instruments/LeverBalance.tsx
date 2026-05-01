import { useRef, RefObject, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  RigidBody,
  RapierRigidBody,
  CuboidCollider,
  useRevoluteJoint,
  useFixedJoint,
  useRapier,
} from '@react-three/rapier'
import { Outlines } from '@react-three/drei'
import { Vector3 } from 'three'
import { RigidBodyType } from '@dimforge/rapier3d-compat'
import { registerSnap } from '../../physics/snapTargets'
import { useReadings } from '../../lab/InstrumentReadings'

const STAND_H = 0.25
const BEAM_LEN = 0.45
const BEAM_T = 0.012
const PAN_R = 0.07
const PAN_DEPTH = 0.015

type Props = { position: [number, number, number]; active?: boolean }

export function LeverBalance({ position, active = false }: Props) {
  const frameCounter = useRef(0)
  const standRef = useRef<RapierRigidBody>(null) as RefObject<RapierRigidBody>
  const beamRef = useRef<RapierRigidBody>(null) as RefObject<RapierRigidBody>
  const leftPanRef = useRef<RapierRigidBody>(null) as RefObject<RapierRigidBody>
  const rightPanRef = useRef<RapierRigidBody>(null) as RefObject<RapierRigidBody>

  const { world } = useRapier()
  const setLeverTilt = useReadings(s => s.setLeverTilt)
  const setLeverRightPanGrams = useReadings(s => s.setLeverRightPanGrams)

  // Revolute joint: stand top ↔ beam center, axis along Z (beam tilts in XY plane)
  // RevoluteJointParams = [body1Anchor: Vector3, body2Anchor: Vector3, axis: Vector3]
  useRevoluteJoint(standRef, beamRef, [
    [0, STAND_H, 0],  // anchor on stand body (top of stand)
    [0, 0, 0],        // anchor on beam body (beam center)
    [0, 0, 1],        // rotation axis: Z
  ])

  // Fixed joints: beam ends ↔ pans
  // FixedJointParams = [body1Anchor: Vector3, body1LocalFrame: Quaternion, body2Anchor: Vector3, body2LocalFrame: Quaternion]
  useFixedJoint(beamRef, leftPanRef, [
    [-BEAM_LEN / 2, -BEAM_T / 2, 0], // anchor on beam at left end, bottom
    [0, 0, 0, 1],                      // identity quaternion for beam frame
    [0, PAN_DEPTH / 2, 0],            // anchor on pan top-center
    [0, 0, 0, 1],                      // identity quaternion for pan frame
  ])

  useFixedJoint(beamRef, rightPanRef, [
    [BEAM_LEN / 2, -BEAM_T / 2, 0],  // anchor on beam at right end, bottom
    [0, 0, 0, 1],                      // identity quaternion for beam frame
    [0, PAN_DEPTH / 2, 0],            // anchor on pan top-center
    [0, 0, 0, 1],                      // identity quaternion for pan frame
  ])

  // Register snap targets for left and right pans (rest positions)
  useEffect(() => {
    const leftPos = new Vector3(position[0] - BEAM_LEN / 2, position[1] + STAND_H + 0.02, position[2])
    const rightPos = new Vector3(position[0] + BEAM_LEN / 2, position[1] + STAND_H + 0.02, position[2])

    const unregLeft = registerSnap({
      id: `lever-left-${position[0]}-${position[1]}-${position[2]}`,
      position: leftPos,
      radius: 0.08,
      onAttach: (body) => {
        body.setBodyType(0 /* Dynamic */, true)
        body.setTranslation({ x: leftPos.x, y: leftPos.y, z: leftPos.z }, true)
        body.setLinvel({ x: 0, y: 0, z: 0 }, true)
        body.setAngvel({ x: 0, y: 0, z: 0 }, true)
      },
    })

    const unregRight = registerSnap({
      id: `lever-right-${position[0]}-${position[1]}-${position[2]}`,
      position: rightPos,
      radius: 0.08,
      onAttach: (body) => {
        body.setBodyType(0 /* Dynamic */, true)
        body.setTranslation({ x: rightPos.x, y: rightPos.y, z: rightPos.z }, true)
        body.setLinvel({ x: 0, y: 0, z: 0 }, true)
        body.setAngvel({ x: 0, y: 0, z: 0 }, true)
      },
    })

    return () => { unregLeft(); unregRight() }
  }, [position])

  // Live readings: beam tilt and right-pan mass
  useFrame(() => {
    frameCounter.current++
    if (frameCounter.current % 6 !== 0) return
    const beam = beamRef.current
    if (beam) {
      const rot = beam.rotation()
      // For small angles: tilt ≈ 2 * asin(clamp(rot.z))
      const tilt = 2 * Math.asin(Math.min(1, Math.max(-1, rot.z)))
      setLeverTilt(tilt)
    }

    const rightPan = rightPanRef.current
    if (rightPan) {
      let totalKg = 0
      try {
        const collider = rightPan.collider(0)
        world.contactPairsWith(collider, (other) => {
          const body = other.parent()
          if (!body || body.handle === rightPan.handle) return
          if (body.bodyType() === RigidBodyType.Dynamic) {
            totalKg += body.mass()
          }
        })
      } catch (_) { /* ignore if collider not ready */ }
      setLeverRightPanGrams(Math.max(0, Math.round(totalKg * 1000)))
    }
  })

  return (
    <group position={position}>
      {/* Stand — fixed to world */}
      <RigidBody ref={standRef} type="fixed" colliders="cuboid">
        <mesh position={[0, STAND_H / 2, 0]}>
          <boxGeometry args={[0.04, STAND_H, 0.04]} />
          <meshStandardMaterial color="#444" metalness={0.4} roughness={0.4} />
          {active && <Outlines thickness={3} color="#f4d03f" />}
        </mesh>
      </RigidBody>

      {/* Beam — dynamic, pivots around center via revolute joint */}
      <RigidBody
        ref={beamRef}
        type="dynamic"
        colliders={false}
        position={[0, STAND_H, 0]}
        mass={0.05}
      >
        <CuboidCollider args={[BEAM_LEN / 2, BEAM_T / 2, 0.012]} />
        <mesh>
          <boxGeometry args={[BEAM_LEN, BEAM_T, 0.024]} />
          <meshStandardMaterial color="#555" metalness={0.5} roughness={0.3} />
        </mesh>
        {/* Indicator needle pointing down from center */}
        <mesh position={[0, -BEAM_T / 2 - 0.04, 0]}>
          <boxGeometry args={[0.005, 0.06, 0.005]} />
          <meshStandardMaterial color="#e74c3c" />
        </mesh>
      </RigidBody>

      {/* Left pan — dynamic, attached to left beam end */}
      <RigidBody
        ref={leftPanRef}
        type="dynamic"
        colliders={false}
        position={[-BEAM_LEN / 2, STAND_H - PAN_DEPTH, 0]}
        mass={0.02}
      >
        <CuboidCollider args={[PAN_R, PAN_DEPTH / 2, PAN_R]} />
        <mesh>
          <cylinderGeometry args={[PAN_R, PAN_R * 0.9, PAN_DEPTH, 12]} />
          <meshStandardMaterial color="#666" metalness={0.6} roughness={0.4} />
        </mesh>
      </RigidBody>

      {/* Right pan — dynamic, attached to right beam end */}
      <RigidBody
        ref={rightPanRef}
        type="dynamic"
        colliders={false}
        position={[BEAM_LEN / 2, STAND_H - PAN_DEPTH, 0]}
        mass={0.02}
      >
        <CuboidCollider args={[PAN_R, PAN_DEPTH / 2, PAN_R]} />
        <mesh>
          <cylinderGeometry args={[PAN_R, PAN_R * 0.9, PAN_DEPTH, 12]} />
          <meshStandardMaterial color="#666" metalness={0.6} roughness={0.4} />
        </mesh>
      </RigidBody>
    </group>
  )
}
