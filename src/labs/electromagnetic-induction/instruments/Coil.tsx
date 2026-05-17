import { useMemo, useEffect } from 'react'
import { Vector3, TubeGeometry, CatmullRomCurve3 } from 'three'
import { Outlines } from '@react-three/drei'
import { registerSnap } from '../../../sdk/physics/snapTargets'

export const COIL_OUTER_RADIUS = 0.04   // 4 cm
export const COIL_TUBE_RADIUS = 0.0035  // copper wire thickness
export const COIL_LENGTH = 0.12         // 12 cm long along x
export const DEFAULT_COIL_TURNS = 10
export const COIL_SNAP_RADIUS = 0.10

type Props = {
  /** World position of the coil's CENTRE. */
  position: [number, number, number]
  /** Number of helix wraps. Drives geometry rebuild. */
  turns: number
  /** True when this lab is the active instrument — toggles highlight. */
  active?: boolean
}

function buildCoilGeometry(turns: number): TubeGeometry {
  const SEGMENTS = 96
  const points: Vector3[] = []
  for (let i = 0; i <= SEGMENTS; i++) {
    const t = i / SEGMENTS
    const angle = t * turns * Math.PI * 2
    const x = -COIL_LENGTH / 2 + t * COIL_LENGTH
    points.push(new Vector3(
      x,
      Math.sin(angle) * COIL_OUTER_RADIUS,
      Math.cos(angle) * COIL_OUTER_RADIUS,
    ))
  }
  const curve = new CatmullRomCurve3(points)
  return new TubeGeometry(curve, SEGMENTS * 2, COIL_TUBE_RADIUS, 6, false)
}

export function Coil({ position, turns, active = false }: Props) {
  const geometry = useMemo(() => buildCoilGeometry(turns), [turns])

  useEffect(() => {
    return () => { geometry.dispose() }
  }, [geometry])

  useEffect(() => {
    const unregister = registerSnap({
      id: 'coil-center',
      instrumentId: 'coil',
      position: new Vector3(...position),
      radius: COIL_SNAP_RADIUS,
      keepKinematic: true,
      onAttach: () => { /* magnet stays kinematic at bore centre after snap. */ },
    })
    return unregister
  }, [position])

  return (
    <group position={position}>
      <mesh geometry={geometry}>
        <meshStandardMaterial
          color="#b67333"
          metalness={0.85}
          roughness={0.25}
          envMapIntensity={1.0}
        />
        {active && <Outlines thickness={3} color="#0a84ff" />}
      </mesh>
    </group>
  )
}
