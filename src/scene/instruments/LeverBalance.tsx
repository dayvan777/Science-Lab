import { useRef, RefObject } from 'react'
import {
  RigidBody,
  RapierRigidBody,
  CuboidCollider,
  useRevoluteJoint,
  useFixedJoint,
} from '@react-three/rapier'

const STAND_H = 0.25
const BEAM_LEN = 0.45
const BEAM_T = 0.012
const PAN_R = 0.07
const PAN_DEPTH = 0.015

type Props = { position: [number, number, number] }

export function LeverBalance({ position }: Props) {
  const standRef = useRef<RapierRigidBody>(null) as RefObject<RapierRigidBody>
  const beamRef = useRef<RapierRigidBody>(null) as RefObject<RapierRigidBody>
  const leftPanRef = useRef<RapierRigidBody>(null) as RefObject<RapierRigidBody>
  const rightPanRef = useRef<RapierRigidBody>(null) as RefObject<RapierRigidBody>

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

  return (
    <group position={position}>
      {/* Stand — fixed to world */}
      <RigidBody ref={standRef} type="fixed" colliders="cuboid">
        <mesh castShadow position={[0, STAND_H / 2, 0]}>
          <boxGeometry args={[0.04, STAND_H, 0.04]} />
          <meshStandardMaterial color="#444" metalness={0.4} roughness={0.4} />
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
        <mesh castShadow>
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
        <mesh castShadow>
          <cylinderGeometry args={[PAN_R, PAN_R * 0.9, PAN_DEPTH, 24]} />
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
        <mesh castShadow>
          <cylinderGeometry args={[PAN_R, PAN_R * 0.9, PAN_DEPTH, 24]} />
          <meshStandardMaterial color="#666" metalness={0.6} roughness={0.4} />
        </mesh>
      </RigidBody>
    </group>
  )
}
