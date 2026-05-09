import { useRef, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { RapierRigidBody } from '@react-three/rapier'
import { Outlines, RoundedBox } from '@react-three/drei'
import { Vector3, Group } from 'three'
import { registerSnap } from '../../../sdk/physics/snapTargets'
import { getBodyMass, getBodyHalfHeight, onDragStart } from '../../../sdk/physics/bodyRegistry'
import { useReadings } from '../state/InstrumentReadings'

const STAND_H = 0.25
const BEAM_LEN = 0.45
const BEAM_T = 0.012
const PAN_R = 0.09           // bigger pans for clearer "place items here" affordance
const PAN_BOTTOM_R = PAN_R * 0.7
const PAN_DEPTH = 0.025      // deeper for visible bowl shape
const PAN_RIM_TUBE = 0.004   // thicker rim torus for visibility
const REFERENCE_MASS = 0.2   // 200g — full tilt at this difference

type Props = { position: [number, number, number]; active?: boolean }

export function LeverBalance({ position, active = false }: Props) {
  const beamRef = useRef<Group>(null)
  const [leftMassKg, setLeftMassKg] = useState(0)
  const [rightMassKg, setRightMassKg] = useState(0)
  const setLeverTilt = useReadings(s => s.setLeverTilt)
  const setLeverRightPanGrams = useReadings(s => s.setLeverRightPanGrams)

  // Track which bodies are on which pan as ORDERED arrays so we can stack them
  // visually (each new item rests on top of the previous instead of all clipping
  // at the same world position).
  const leftItems = useRef<RapierRigidBody[]>([])
  const rightItems = useRef<RapierRigidBody[]>([])

  function recompute() {
    let l = 0
    leftItems.current.forEach(b => { l += getBodyMass(b) })
    let r = 0
    rightItems.current.forEach(b => { r += getBodyMass(b) })
    setLeftMassKg(l)
    setRightMassKg(r)
  }

  // Subscribe to drag-start: when ANY body starts being dragged,
  // remove it from our pan tracking arrays so user can move objects between instruments.
  useEffect(() => {
    return onDragStart((body) => {
      let changed = false
      const li = leftItems.current.indexOf(body)
      if (li !== -1) { leftItems.current.splice(li, 1); changed = true }
      const ri = rightItems.current.indexOf(body)
      if (ri !== -1) { rightItems.current.splice(ri, 1); changed = true }
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

    const removeFrom = (arr: RapierRigidBody[], body: RapierRigidBody) => {
      const i = arr.indexOf(body)
      if (i !== -1) arr.splice(i, 1)
    }

    const unregLeft = registerSnap({
      id: `lever-left-${position[0]}`,
      instrumentId: 'lever-balance',
      position: leftPos,
      radius: 0.30,
      keepKinematic: true,
      onAttach: (body) => {
        removeFrom(rightItems.current, body)
        removeFrom(leftItems.current, body)
        leftItems.current.push(body)
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
        removeFrom(leftItems.current, body)
        removeFrom(rightItems.current, body)
        rightItems.current.push(body)
        body.setLinvel({ x: 0, y: 0, z: 0 }, true)
        body.setAngvel({ x: 0, y: 0, z: 0 }, true)
        recompute()
      },
    })

    return () => { unregLeft(); unregRight() }
  }, [position])

  // Animate beam tilt + stack snapped items on pans each frame
  useFrame((_, delta) => {
    // Heavier side goes DOWN. With beam rotation.z > 0, left pan goes down.
    const massDiff = leftMassKg - rightMassKg
    const targetTilt = Math.max(-0.25, Math.min(0.25, (massDiff / REFERENCE_MASS) * 0.25))

    if (beamRef.current) {
      const current = beamRef.current.rotation.z
      const next = current + (targetTilt - current) * Math.min(1, delta * 4)
      beamRef.current.rotation.z = next
      setLeverTilt(next)
    }

    // Position snapped items to follow their pans as the beam tilts.
    // Each pan's BASE world position is the pan-rim height; items stack upward
    // from there using their registered halfHeight values.
    const tiltZ = beamRef.current?.rotation.z ?? 0
    const cosT = Math.cos(tiltZ)
    const sinT = Math.sin(tiltZ)

    // Pan rim is at the TOP of the pan group, which sits at -PAN_DEPTH below
    // the beam center. Pan rim local-y = -PAN_DEPTH + PAN_DEPTH/2 = -PAN_DEPTH/2.
    // So pan rim absolute y at zero tilt = beam_y + (-PAN_DEPTH/2) = position[1] + STAND_H - PAN_DEPTH/2.
    const panRimBaseY = position[1] + STAND_H - PAN_DEPTH / 2
    const leftPanWorldX = position[0] - cosT * BEAM_LEN / 2
    const leftPanRimY = panRimBaseY - sinT * BEAM_LEN / 2
    const rightPanWorldX = position[0] + cosT * BEAM_LEN / 2
    const rightPanRimY = panRimBaseY + sinT * BEAM_LEN / 2

    let leftStackY = leftPanRimY
    leftItems.current.forEach(b => {
      const hh = getBodyHalfHeight(b)
      const centerY = leftStackY + hh
      try {
        b.setNextKinematicTranslation({ x: leftPanWorldX, y: centerY, z: position[2] })
      } catch (_) {}
      leftStackY = centerY + hh // top of this body becomes base for next
    })

    let rightStackY = rightPanRimY
    rightItems.current.forEach(b => {
      const hh = getBodyHalfHeight(b)
      const centerY = rightStackY + hh
      try {
        b.setNextKinematicTranslation({ x: rightPanWorldX, y: centerY, z: position[2] })
      } catch (_) {}
      rightStackY = centerY + hh
    })

    // Update HUD reading
    setLeverRightPanGrams(Math.round(rightMassKg * 1000))
  })

  return (
    <group position={position}>
      {/* Stand */}
      <RoundedBox args={[0.04, STAND_H, 0.04]} radius={0.005} smoothness={4} position={[0, STAND_H / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#3a3a3d" metalness={0.85} roughness={0.25} />
        {active && <Outlines thickness={3} color="#0071e3" />}
      </RoundedBox>

      {/* Pivot decoration */}
      <mesh position={[0, STAND_H, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.01, 0.01, 0.05, 16]} />
        <meshStandardMaterial color="#3a3a3d" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* Beam group — visual only, manually rotated */}
      <group ref={beamRef} position={[0, STAND_H, 0]}>
        <RoundedBox args={[BEAM_LEN, BEAM_T, 0.024]} radius={0.003} smoothness={4} castShadow receiveShadow>
          <meshStandardMaterial color="#aaa" metalness={0.7} roughness={0.3} />
        </RoundedBox>
        {/* Indicator arrow */}
        <mesh position={[0, -BEAM_T / 2 - 0.05, 0]}>
          <coneGeometry args={[0.006, 0.07, 4]} />
          <meshStandardMaterial color="#ff3b30" emissive="#ff3b30" emissiveIntensity={0.4} />
        </mesh>

        {/* Left pan — bowl-shaped (truncated cone) + raised rim */}
        <group position={[-BEAM_LEN / 2, -PAN_DEPTH, 0]}>
          <mesh castShadow receiveShadow>
            <cylinderGeometry args={[PAN_R, PAN_BOTTOM_R, PAN_DEPTH, 48]} />
            <meshStandardMaterial color="#a8aab2" metalness={0.85} roughness={0.25} envMapIntensity={1.0} />
          </mesh>
          {/* Bright rim torus on top edge — clear "this is a pan" affordance */}
          <mesh position={[0, PAN_DEPTH / 2, 0]} castShadow>
            <torusGeometry args={[PAN_R, PAN_RIM_TUBE, 12, 48]} />
            <meshStandardMaterial color="#d8dae0" metalness={0.95} roughness={0.12} envMapIntensity={1.2} />
          </mesh>
        </group>

        {/* Right pan — same shape */}
        <group position={[BEAM_LEN / 2, -PAN_DEPTH, 0]}>
          <mesh castShadow receiveShadow>
            <cylinderGeometry args={[PAN_R, PAN_BOTTOM_R, PAN_DEPTH, 48]} />
            <meshStandardMaterial color="#a8aab2" metalness={0.85} roughness={0.25} envMapIntensity={1.0} />
          </mesh>
          <mesh position={[0, PAN_DEPTH / 2, 0]} castShadow>
            <torusGeometry args={[PAN_R, PAN_RIM_TUBE, 12, 48]} />
            <meshStandardMaterial color="#d8dae0" metalness={0.95} roughness={0.12} envMapIntensity={1.2} />
          </mesh>
        </group>
      </group>
    </group>
  )
}
