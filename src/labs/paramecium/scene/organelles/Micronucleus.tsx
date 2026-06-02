import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, MeshStandardMaterial } from 'three'
import type { OrganelleDef } from '../../content/organelles'
import { useReducedMotion } from '../../../../sdk/a11y/useReducedMotion'
import { dampAlpha } from '../life'
import type { OrganelleVisualState } from './OrganelleShell'

export function Micronucleus({ def, state }: { def: OrganelleDef; state: OrganelleVisualState }) {
  const reduced = useReducedMotion()
  const p = def.positions?.[0] ?? [0, 0, 0]
  const r = def.radius ?? 0.1
  const mat = useMemo(() => new MeshStandardMaterial({
    color: def.color, emissive: new Color(def.color), emissiveIntensity: 0,
    roughness: 0.4, transparent: true, opacity: 0.95,
  }), [def.color])

  useFrame((_, dt) => {
    const a = reduced ? 1 : dampAlpha(dt, 8)
    mat.emissiveIntensity += (state.targetEmissive - mat.emissiveIntensity) * a
    mat.opacity += (state.targetOpacity - mat.opacity) * a
  })

  return (
    <group position={p}>
      <mesh material={mat}><sphereGeometry args={[r, 20, 16]} /></mesh>
      <mesh position={[-r * 0.25, r * 0.25, r * 0.25]}>
        <sphereGeometry args={[r * 0.34, 10, 8]} />
        <meshStandardMaterial color="#f3dcb4" roughness={0.5} transparent opacity={0.7} />
      </mesh>
    </group>
  )
}
