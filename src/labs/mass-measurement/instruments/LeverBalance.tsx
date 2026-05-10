import { useRef, useState, useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { RapierRigidBody } from '@react-three/rapier'
import { RoundedBox } from '@react-three/drei'
import { Vector3, Group, Quaternion, MeshStandardMaterial } from 'three'
import { registerSnap } from '../../../sdk/physics/snapTargets'
import { getBodyMass, getBodyHalfHeight, onDragStart } from '../../../sdk/physics/bodyRegistry'
import { useReadings } from '../state/InstrumentReadings'

// Reference: classic lab analytical balance — wide base with feet, vertical
// column, horizontal beam at top, two A-frame wire hangers descending from
// beam ends, round metal pans hanging at bottom.

// Base + column (the "stand") — geometry is in lever-local coords (origin = table top).
// Sized so the tallest object (baseball at 2*R=0.15m) fits between pan rim and beam
// with clearance, AND the lowest pan position at max tilt clears the table top.
const BASE_W = 0.20
const BASE_H = 0.04
const BASE_D = 0.11
const FOOT_R = 0.012
const FOOT_H = 0.012
const COL_W = 0.05
const COL_H = 0.36                          // raised again so baseball clears beam with margin
const PIVOT_HEIGHT_LOCAL = BASE_H + COL_H   // beam-pivot y in lever-local coords (= 0.40)

// Beam — long enough that the bigger pans don't overlap visually
const BEAM_LEN = 0.66
const BEAM_T = 0.014
const BEAM_DEPTH = 0.024

// Hanger — V-shape: two diagonal rods from each beam tip down to opposite
// edges of the pan rim. Long enough that the rods are NEARLY VERTICAL,
// so they sit outside the baseball's volume at all heights.
const HANGER_H = 0.26
const ROD_RADIUS = 0.0025

// Pan — round metal dish with bright chrome rim. PAN_R is intentionally
// generous so the V-rod spread keeps clear of an inscribed sphere of
// the largest object (baseball, R=0.075).
const PAN_R = 0.14
const PAN_BOTTOM_R = PAN_R * 0.75
const PAN_DEPTH = 0.034

const REFERENCE_MASS = 0.2  // 200g — full tilt at this difference (visual only)

// A pair of pans is considered BALANCED when both hold something AND the
// total masses match within this gram tolerance. Used both to snap the
// beam's visual tilt to exactly 0 and to flip the indicator colour from
// red → green so the student gets an unambiguous "yes, balanced" signal.
// Same number is mirrored in the step-engine predicate's toleranceGrams.
const BALANCE_TOLERANCE_G = 0.5

const RED   = '#ff3b30'
const GREEN = '#34c759'

type Props = { position: [number, number, number]; active?: boolean }

/**
 * Helper: a thin cylindrical rod between two points (in beam-local coords).
 * Three.js cylinder default axis is +Y; we compute a quaternion to align it
 * with the (to - from) direction.
 */
function Rod({ from, to, color = '#cccdd2' }: {
  from: [number, number, number]
  to: [number, number, number]
  color?: string
}) {
  const { position, quaternion, length } = useMemo(() => {
    const fromV = new Vector3(...from)
    const toV = new Vector3(...to)
    const dir = new Vector3().subVectors(toV, fromV)
    const len = dir.length()
    const mid = new Vector3().addVectors(fromV, toV).multiplyScalar(0.5)
    const yAxis = new Vector3(0, 1, 0)
    const q = new Quaternion().setFromUnitVectors(yAxis, dir.clone().normalize())
    return { position: mid.toArray() as [number, number, number], quaternion: q, length: len }
  }, [from, to])
  return (
    <mesh position={position} quaternion={quaternion} castShadow>
      <cylinderGeometry args={[ROD_RADIUS, ROD_RADIUS, length, 8]} />
      <meshStandardMaterial color={color} metalness={0.7} roughness={0.4} envMapIntensity={0.45} />
    </mesh>
  )
}

export function LeverBalance({ position, active = false }: Props) {
  const beamRef = useRef<Group>(null)
  const [leftMassKg, setLeftMassKg] = useState(0)
  const [rightMassKg, setRightMassKg] = useState(0)
  const setLeverTilt = useReadings(s => s.setLeverTilt)
  const setLeverLeftPanGrams = useReadings(s => s.setLeverLeftPanGrams)
  const setLeverRightPanGrams = useReadings(s => s.setLeverRightPanGrams)

  // Refs to the indicator materials so we can recolour without re-rendering
  // (cone arrow on the beam + static reference tick on the column).
  const coneMatRef = useRef<MeshStandardMaterial>(null)
  const tickMatRef = useRef<MeshStandardMaterial>(null)

  // Track which bodies are on which pan as ORDERED arrays — items stack
  // visually (each new one rests on top of the previous, not clipping at one point).
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

  // Snap target: lever-local pan-rim point at zero tilt is (±BEAM_LEN/2, PIVOT_HEIGHT_LOCAL - HANGER_H, 0).
  useEffect(() => {
    const leftPos = new Vector3(
      position[0] - BEAM_LEN / 2,
      position[1] + PIVOT_HEIGHT_LOCAL - HANGER_H + 0.04,
      position[2]
    )
    const rightPos = new Vector3(
      position[0] + BEAM_LEN / 2,
      position[1] + PIVOT_HEIGHT_LOCAL - HANGER_H + 0.04,
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

  // Animate beam tilt + stack snapped items on pans each frame.
  // Items are positioned at the pan rim (which moves with beam tilt) plus
  // accumulated half-heights for stacking.
  useFrame((_, delta) => {
    const massDiff = leftMassKg - rightMassKg
    const massDiffG = Math.abs(massDiff) * 1000
    const isBalanced =
      leftMassKg > 0 && rightMassKg > 0 && massDiffG <= BALANCE_TOLERANCE_G

    // When balanced, snap target tilt to exactly 0 — gives the student a
    // clean "settles level" cue. Otherwise tilt is proportional to massDiff.
    const targetTilt = isBalanced
      ? 0
      : Math.max(-0.25, Math.min(0.25, (massDiff / REFERENCE_MASS) * 0.25))

    if (beamRef.current) {
      const current = beamRef.current.rotation.z
      // Faster lerp toward 0 when balanced (snappier "click into place" feel).
      const lerpRate = isBalanced ? delta * 8 : delta * 4
      const next = current + (targetTilt - current) * Math.min(1, lerpRate)
      beamRef.current.rotation.z = next
      setLeverTilt(next)
    }

    // Recolour indicator + tick: red/white when off, green when balanced.
    // Mutating the existing Three.js Color objects avoids any re-render.
    if (coneMatRef.current) {
      coneMatRef.current.color.set(isBalanced ? GREEN : RED)
      coneMatRef.current.emissive.set(isBalanced ? GREEN : RED)
      coneMatRef.current.emissiveIntensity = isBalanced ? 1.0 : 0.6
    }
    if (tickMatRef.current) {
      tickMatRef.current.color.set(isBalanced ? GREEN : '#ffffff')
      tickMatRef.current.emissive.set(isBalanced ? GREEN : '#ffffff')
      tickMatRef.current.emissiveIntensity = isBalanced ? 1.5 : 0.5
    }

    const tiltZ = beamRef.current?.rotation.z ?? 0
    const cosT = Math.cos(tiltZ)
    const sinT = Math.sin(tiltZ)

    // Pan rim points in beam-local coords (relative to beam pivot at (0,0)):
    //   right local: (BEAM_LEN/2, -HANGER_H)
    //   left local:  (-BEAM_LEN/2, -HANGER_H)
    // After rotation by tilt θ, world coords:
    //   x_w = cosT * x_l - sinT * y_l + position[0]
    //   y_w = sinT * x_l + cosT * y_l + position[1] + PIVOT_HEIGHT_LOCAL
    const rightX = position[0] + cosT * (BEAM_LEN / 2) - sinT * (-HANGER_H)
    const rightRimY = position[1] + PIVOT_HEIGHT_LOCAL + sinT * (BEAM_LEN / 2) + cosT * (-HANGER_H)
    const leftX = position[0] + cosT * (-BEAM_LEN / 2) - sinT * (-HANGER_H)
    const leftRimY = position[1] + PIVOT_HEIGHT_LOCAL + sinT * (-BEAM_LEN / 2) + cosT * (-HANGER_H)

    let leftStackY = leftRimY
    leftItems.current.forEach(b => {
      const hh = getBodyHalfHeight(b)
      const centerY = leftStackY + hh
      try {
        b.setNextKinematicTranslation({ x: leftX, y: centerY, z: position[2] })
      } catch (_) {}
      leftStackY = centerY + hh
    })

    let rightStackY = rightRimY
    rightItems.current.forEach(b => {
      const hh = getBodyHalfHeight(b)
      const centerY = rightStackY + hh
      try {
        b.setNextKinematicTranslation({ x: rightX, y: centerY, z: position[2] })
      } catch (_) {}
      rightStackY = centerY + hh
    })

    setLeverLeftPanGrams(Math.round(leftMassKg * 1000))
    setLeverRightPanGrams(Math.round(rightMassKg * 1000))
  })

  // Geometry for the hanger V — one per side.
  // Beam tip is at (±BEAM_LEN/2, 0, 0). Each side has TWO rods that descend
  // from the beam tip to two diametrically-opposed points on the pan rim.
  // Attaching exactly at the rim (offset = PAN_R) gives the classic
  // wireframe-triangle look from the reference image.
  const PAN_ATTACH_OFFSET = PAN_R * 0.95

  return (
    <group position={position}>
      {/* Base block */}
      <RoundedBox args={[BASE_W, BASE_H, BASE_D]} radius={0.005} smoothness={4}
        position={[0, BASE_H / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#2a2a30" metalness={0.55} roughness={0.55} envMapIntensity={0.4} />
      </RoundedBox>
      {/* 4 small rounded feet under the base */}
      {[
        [-BASE_W / 2 + 0.018, -BASE_D / 2 + 0.018],
        [ BASE_W / 2 - 0.018, -BASE_D / 2 + 0.018],
        [-BASE_W / 2 + 0.018,  BASE_D / 2 - 0.018],
        [ BASE_W / 2 - 0.018,  BASE_D / 2 - 0.018],
      ].map(([fx, fz], i) => (
        <mesh key={`foot-${i}`} position={[fx, FOOT_H / 2, fz]} castShadow>
          <cylinderGeometry args={[FOOT_R, FOOT_R * 1.1, FOOT_H, 16]} />
          <meshStandardMaterial color="#1f1f24" metalness={0.6} roughness={0.5} />
        </mesh>
      ))}
      {/* Vertical column */}
      <RoundedBox args={[COL_W, COL_H, COL_W]} radius={0.005} smoothness={4}
        position={[0, BASE_H + COL_H / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#2a2a30" metalness={0.6} roughness={0.5} envMapIntensity={0.4} />
      </RoundedBox>
      {/* Static equilibrium reference tick — when the beam is level, the
          cone above aligns with this tick. White when off-balance, GREEN
          (and brighter) when |left − right| ≤ BALANCE_TOLERANCE_G — gives
          the student an unambiguous physical confirmation. */}
      <mesh position={[0, PIVOT_HEIGHT_LOCAL - 0.06, COL_W / 2 + 0.001]}>
        <boxGeometry args={[0.003, 0.030, 0.003]} />
        <meshStandardMaterial ref={tickMatRef} color="#ffffff" emissive="#ffffff" emissiveIntensity={0.5} />
      </mesh>
      {/* Pivot ornament at column top */}
      <mesh position={[0, PIVOT_HEIGHT_LOCAL, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.012, 0.012, 0.06, 16]} />
        <meshStandardMaterial color="#9aa0a8" metalness={0.75} roughness={0.3} envMapIntensity={0.5} />
      </mesh>

      {/* Beam group — pivots around lever-local origin (0, PIVOT_HEIGHT_LOCAL, 0) */}
      <group ref={beamRef} position={[0, PIVOT_HEIGHT_LOCAL, 0]}>
        {/* Beam horizontal bar */}
        <RoundedBox args={[BEAM_LEN, BEAM_T, BEAM_DEPTH]} radius={0.003} smoothness={4} castShadow receiveShadow>
          <meshStandardMaterial color="#878a92" metalness={0.65} roughness={0.45} envMapIntensity={0.45} />
        </RoundedBox>
        {/* Indicator arrow — large cone pointing down from beam centre.
            Rotates with the beam; alignment with the static tick below
            indicates equilibrium. RED while the beam is off-balance,
            switches to GREEN (and brighter) when masses match. */}
        <mesh position={[0, -BEAM_T / 2 - 0.075, 0]}>
          <coneGeometry args={[0.010, 0.110, 4]} />
          <meshStandardMaterial ref={coneMatRef} color="#ff3b30" emissive="#ff3b30" emissiveIntensity={0.6} />
        </mesh>

        {/* LEFT side — V hanger (two diagonal rods) + pan */}
        {/* Rod from beam-tip down to pan-rim left attach point */}
        <Rod
          from={[-BEAM_LEN / 2, -BEAM_T / 2, 0]}
          to={[-BEAM_LEN / 2 - PAN_ATTACH_OFFSET, -HANGER_H, 0]}
        />
        <Rod
          from={[-BEAM_LEN / 2, -BEAM_T / 2, 0]}
          to={[-BEAM_LEN / 2 + PAN_ATTACH_OFFSET, -HANGER_H, 0]}
        />
        {/* Left pan — bowl. Position center at (-BEAM_LEN/2, -HANGER_H - PAN_DEPTH/2, 0) */}
        <group position={[-BEAM_LEN / 2, -HANGER_H - PAN_DEPTH / 2, 0]}>
          <mesh castShadow receiveShadow>
            <cylinderGeometry args={[PAN_R, PAN_BOTTOM_R, PAN_DEPTH, 48]} />
            <meshStandardMaterial color="#878a92" metalness={0.65} roughness={0.5} envMapIntensity={0.45} />
          </mesh>
          {/* Active drop-target halo — thin glowing blue torus precisely at the
              pan's TOP RIM. Replaces the previous <Outlines>-on-cone effect,
              which produced a stray second ring above the pan because Outlines
              drew the back-side silhouette of the entire truncated cone (top
              radius != bottom radius → two visible rings). */}
          {active && leftItems.current.length === 0 && (
            <mesh position={[0, PAN_DEPTH / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[PAN_R, 0.004, 12, 64]} />
              <meshStandardMaterial
                color="#0a84ff"
                emissive="#0a84ff"
                emissiveIntensity={1.6}
                toneMapped={false}
              />
            </mesh>
          )}
        </group>

        {/* RIGHT side — symmetric */}
        <Rod
          from={[ BEAM_LEN / 2, -BEAM_T / 2, 0]}
          to={[ BEAM_LEN / 2 - PAN_ATTACH_OFFSET, -HANGER_H, 0]}
        />
        <Rod
          from={[ BEAM_LEN / 2, -BEAM_T / 2, 0]}
          to={[ BEAM_LEN / 2 + PAN_ATTACH_OFFSET, -HANGER_H, 0]}
        />
        <group position={[ BEAM_LEN / 2, -HANGER_H - PAN_DEPTH / 2, 0]}>
          <mesh castShadow receiveShadow>
            <cylinderGeometry args={[PAN_R, PAN_BOTTOM_R, PAN_DEPTH, 48]} />
            <meshStandardMaterial color="#878a92" metalness={0.65} roughness={0.5} envMapIntensity={0.45} />
          </mesh>
        </group>
      </group>
    </group>
  )
}
