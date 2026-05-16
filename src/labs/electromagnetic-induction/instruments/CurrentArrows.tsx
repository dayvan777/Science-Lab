import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  Vector3,
  Color,
  Group,
  MeshStandardMaterial,
  Quaternion,
} from 'three'
import { useInductionReadings } from '../state/InductionReadings'
import { EMF_MAX } from '../physics/induction'

const ARROW_COUNT = 6
const CONE_RADIUS = 0.005
const CONE_HEIGHT = 0.012
const CONE_SEGMENTS = 6

const COLOR_POSITIVE = new Color('#0a84ff')
const COLOR_NEGATIVE = new Color('#ff7a60')

type Props = {
  /** World position of the coil's centre (matches LabScene's COIL_WORLD). */
  coilWorld: [number, number, number]
  /** Coil length along its X axis. */
  coilLength: number
  /** Coil outer radius. */
  coilOuterRadius: number
  /** Coil turns (helix wraps). */
  coilTurns: number
  /** When false, arrows fade to opacity 0. */
  visible: boolean
}

/**
 * Returns 6 transforms (position + quaternion) at evenly spaced points
 * along the coil's helix. Each transform's quaternion orients a
 * coneGeometry (default-pointing +y) along the helix's local tangent.
 *
 * The coil's helix sweeps linearly along x with sin/cos oscillation in
 * y-z (Phase 1 axis). Tangent at parameter t:
 *   dx/dt = coilLength
 *   dy/dt = cos(angle) · coilOuterRadius · 2π · coilTurns
 *   dz/dt = -sin(angle) · coilOuterRadius · 2π · coilTurns
 *
 * Cones placed at internal positions (t in [0.05, 0.95]) to avoid the
 * tube's open endpoints. The 6 t-values are spaced evenly across this
 * range.
 */
function computeArrowTransforms(coilLength: number, coilOuterRadius: number, coilTurns: number) {
  const transforms: { position: Vector3; quaternion: Quaternion }[] = []
  const tStart = 0.05
  const tEnd = 0.95
  const up = new Vector3(0, 1, 0)  // coneGeometry default-aligned axis

  for (let i = 0; i < ARROW_COUNT; i++) {
    const t = tStart + ((tEnd - tStart) * i) / (ARROW_COUNT - 1)
    const angle = t * coilTurns * Math.PI * 2
    const x = -coilLength / 2 + t * coilLength
    const y = Math.sin(angle) * coilOuterRadius
    const z = Math.cos(angle) * coilOuterRadius
    const dx = coilLength
    const dy = Math.cos(angle) * coilOuterRadius * 2 * Math.PI * coilTurns
    const dz = -Math.sin(angle) * coilOuterRadius * 2 * Math.PI * coilTurns
    const tangent = new Vector3(dx, dy, dz).normalize()
    const quaternion = new Quaternion().setFromUnitVectors(up, tangent)
    transforms.push({ position: new Vector3(x, y, z), quaternion })
  }
  return transforms
}

export function CurrentArrows({
  coilWorld,
  coilLength,
  coilOuterRadius,
  coilTurns,
  visible,
}: Props) {
  const groupRef = useRef<Group>(null)
  const meshRefs = useRef<Array<Group | null>>([])
  const flipQuat = useMemo(
    () => new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), Math.PI),
    [],
  )

  const transforms = useMemo(
    () => computeArrowTransforms(coilLength, coilOuterRadius, coilTurns),
    [coilLength, coilOuterRadius, coilTurns],
  )

  const material = useMemo(
    () =>
      new MeshStandardMaterial({
        color: COLOR_POSITIVE.clone(),
        emissive: COLOR_POSITIVE.clone(),
        emissiveIntensity: 0.6,
        transparent: true,
        opacity: 0,
        toneMapped: false,
      }),
    [],
  )

  useEffect(() => {
    return () => material.dispose()
  }, [material])

  useFrame((_, delta) => {
    const emf = useInductionReadings.getState().currentEMF
    const sign = emf >= 0 ? 1 : -1
    const visibleOpacityTarget = Math.min(1, Math.abs(emf) / EMF_MAX) * (visible ? 1 : 0)
    const step = Math.min(1, delta * 8)  // ~125 ms to converge

    material.opacity += (visibleOpacityTarget - material.opacity) * step

    // Colour lerp: red ↔ blue based on EMF sign.
    const targetColour = sign > 0 ? COLOR_POSITIVE : COLOR_NEGATIVE
    material.color.lerp(targetColour, step)
    material.emissive.lerp(targetColour, step)

    // Sign flip: rotate each cone 180° around its local x when EMF is negative.
    for (let i = 0; i < transforms.length; i++) {
      const ref = meshRefs.current[i]
      if (!ref) continue
      const baseQuat = transforms[i].quaternion
      if (sign > 0) {
        ref.quaternion.copy(baseQuat)
      } else {
        ref.quaternion.copy(baseQuat).multiply(flipQuat)
      }
    }
  })

  return (
    <group ref={groupRef} position={coilWorld}>
      {transforms.map((tr, i) => (
        <group
          key={i}
          ref={(g) => {
            meshRefs.current[i] = g
          }}
          position={tr.position}
        >
          <mesh material={material}>
            <coneGeometry args={[CONE_RADIUS, CONE_HEIGHT, CONE_SEGMENTS]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}
