import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, Color, MeshStandardMaterial, Vector3, Quaternion } from 'three'
import { useParameciumState } from '../../state/ParameciumState'
import { useReducedMotion } from '../../../../sdk/a11y/useReducedMotion'
import { dampAlpha, A, B, C } from '../life'
import { fibSphere, fireEnvelope } from './motion'

const UP = new Vector3(0, 1, 0)

/** Dots just under the pellicle; on select, a subset fires threads outward. */
export function Trichocysts() {
  const selectedId = useParameciumState(s => s.selectedOrganelleId)
  const reduced = useReducedMotion()
  const on = selectedId === 'trichocysts'

  const points = useMemo(() => fibSphere(60).map(([x, y, z]) => ({
    pos: new Vector3(x * 1.42, y * 0.71, z * 0.57),
    nrm: new Vector3(x / A, y / B, z / C).normalize(),
  })), [])
  const darts = useMemo(() => points.filter((_, i) => i % 4 === 0), [points])

  const dotMat = useMemo(() => new MeshStandardMaterial({
    color: '#dfeaf2', emissive: new Color('#5FE3D0'), emissiveIntensity: 0, transparent: true, opacity: 0.45,
  }), [])
  const dartMat = useMemo(() => new MeshStandardMaterial({
    color: '#eafffb', emissive: new Color('#5FE3D0'), emissiveIntensity: 0.5, transparent: true, opacity: 0.85,
  }), [])
  const dartRefs = useRef<Group[]>([])
  const startRef = useRef<number | null>(null)

  useFrame((s, dt) => {
    const a = reduced ? 1 : dampAlpha(dt, 8)
    dotMat.emissiveIntensity += ((on ? 0.8 : 0) - dotMat.emissiveIntensity) * a
    dotMat.opacity += ((on ? 0.95 : 0.45) - dotMat.opacity) * a
    if (!on || reduced) { startRef.current = null; dartRefs.current.forEach(d => { if (d) d.scale.y = 0 }); return }
    if (startRef.current === null) startRef.current = s.clock.elapsedTime
    const localT = s.clock.elapsedTime - startRef.current
    dartRefs.current.forEach((d, i) => { if (d) d.scale.y = fireEnvelope((localT + i * 0.03) % 2.4, 1.2) })
  })

  return (
    <group>
      {points.map((pt, i) => (
        <mesh key={'dot' + i} position={pt.pos.toArray()} material={dotMat}>
          <sphereGeometry args={[0.03, 8, 8]} />
        </mesh>
      ))}
      {darts.map((pt, i) => (
        <group key={'dart' + i} position={pt.pos.toArray()} quaternion={new Quaternion().setFromUnitVectors(UP, pt.nrm)} ref={(el) => { if (el) dartRefs.current[i] = el }} scale={[1, 0, 1]}>
          <mesh material={dartMat} position={[0, 0.25, 0]}>
            <cylinderGeometry args={[0.006, 0.002, 0.5, 4]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}
