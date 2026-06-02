import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, MeshStandardMaterial } from 'three'
import type { OrganelleDef } from '../../content/organelles'
import { useReducedMotion } from '../../../../sdk/a11y/useReducedMotion'
import { dampAlpha } from '../life'
import { fibSphere } from './motion'
import type { OrganelleVisualState } from './OrganelleShell'

export function Macronucleus({ def, state }: { def: OrganelleDef; state: OrganelleVisualState }) {
  const reduced = useReducedMotion()
  const p = def.positions?.[0] ?? [0, 0, 0]
  const sc = def.scale ?? [1, 1, 1]
  const r = def.radius ?? 0.3

  const mat = useMemo(() => new MeshStandardMaterial({
    color: def.color, emissive: new Color(def.color), emissiveIntensity: 0,
    roughness: 0.45, transparent: true, opacity: 0.95,
  }), [def.color])
  const speckMat = useMemo(() => new MeshStandardMaterial({ color: '#b9853c', roughness: 0.7, transparent: true, opacity: 0.5 }), [])
  const specks = useMemo(() => fibSphere(44).map(([x, y, z], i) => {
    const rr = 0.45 + 0.5 * (((i * 7) % 10) / 10)
    return [x * rr, y * rr, z * rr] as [number, number, number]
  }), [])

  useFrame((_, dt) => {
    const a = reduced ? 1 : dampAlpha(dt, 8)
    mat.emissiveIntensity += (state.targetEmissive - mat.emissiveIntensity) * a
    mat.opacity += (state.targetOpacity - mat.opacity) * a
  })

  return (
    <group position={p} scale={sc}>
      <mesh material={mat}><sphereGeometry args={[r, 32, 24]} /></mesh>
      {specks.map((spk, k) => (
        <mesh key={k} position={[spk[0] * r, spk[1] * r, spk[2] * r]} material={speckMat}>
          <sphereGeometry args={[r * 0.07, 6, 6]} />
        </mesh>
      ))}
    </group>
  )
}
