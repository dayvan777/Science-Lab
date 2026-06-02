import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, Color, MeshStandardMaterial, Vector3, Quaternion } from 'three'
import type { OrganelleDef } from '../../content/organelles'
import { useReducedMotion } from '../../../../sdk/a11y/useReducedMotion'
import { dampAlpha } from '../life'
import { pumpScale, fibSphere } from './motion'
import type { OrganelleVisualState } from './OrganelleShell'

const UP = new Vector3(0, 1, 0)

export function ContractileVacuoles({ def, state }: { def: OrganelleDef; state: OrganelleVisualState }) {
  const reduced = useReducedMotion()
  const positions = def.positions ?? []
  const r = def.radius ?? 0.18
  const groups = useRef<Group[]>([])

  const mat = useMemo(() => new MeshStandardMaterial({
    color: def.color, emissive: new Color(def.color), emissiveIntensity: 0,
    roughness: 0.3, metalness: 0, transparent: true, opacity: 0.95,
  }), [def.color])
  const canalMat = useMemo(() => new MeshStandardMaterial({
    color: '#6fb0e0', emissive: new Color('#6fb0e0'), emissiveIntensity: 0,
    roughness: 0.5, transparent: true, opacity: 0.8,
  }), [])
  const canals = useMemo(() => fibSphere(7).map(([x, y, z]) => {
    const d = new Vector3(x, y, z)
    return { pos: d.clone().multiplyScalar(r * 0.9), quat: new Quaternion().setFromUnitVectors(UP, d) }
  }), [r])

  useFrame((s, dt) => {
    const a = reduced ? 1 : dampAlpha(dt, 8)
    mat.emissiveIntensity += (state.targetEmissive - mat.emissiveIntensity) * a
    mat.opacity += (state.targetOpacity - mat.opacity) * a
    canalMat.emissiveIntensity += (state.targetEmissive * 0.6 - canalMat.emissiveIntensity) * a
    canalMat.opacity += (Math.min(state.targetOpacity, 0.8) - canalMat.opacity) * a
    const t = s.clock.elapsedTime
    positions.forEach((_, i) => {
      const g = groups.current[i]
      if (g) g.scale.setScalar(reduced ? 0.85 : pumpScale(t, 3.4, i * 0.5))
    })
  })

  return (
    <>
      {positions.map((p, i) => (
        <group key={i} position={p} ref={(el) => { if (el) groups.current[i] = el }}>
          <mesh material={mat}><sphereGeometry args={[r, 24, 18]} /></mesh>
          {canals.map((c, k) => (
            <mesh key={k} position={c.pos.toArray()} quaternion={c.quat} material={canalMat}>
              <cylinderGeometry args={[0.012, 0.012, r * 1.7, 6]} />
            </mesh>
          ))}
          <mesh position={[-r * 0.3, r * 0.32, r * 0.3]} material={mat}>
            <sphereGeometry args={[r * 0.32, 12, 10]} />
          </mesh>
        </group>
      ))}
    </>
  )
}
