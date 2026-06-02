import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, Mesh, MeshStandardMaterial } from 'three'
import type { OrganelleDef } from '../../content/organelles'
import { useReducedMotion } from '../../../../sdk/a11y/useReducedMotion'
import { dampAlpha } from '../life'
import type { OrganelleVisualState } from './OrganelleShell'

export function AnalPore({ def, state }: { def: OrganelleDef; state: OrganelleVisualState }) {
  const reduced = useReducedMotion()
  const p = def.positions?.[0] ?? [0, 0, 0]
  const r = def.radius ?? 0.08
  const remnantRef = useRef<Mesh>(null)
  const startRef = useRef<number | null>(null)

  const mat = useMemo(() => new MeshStandardMaterial({
    color: def.color, emissive: new Color(def.color), emissiveIntensity: 0,
    roughness: 0.6, transparent: true, opacity: 0.95,
  }), [def.color])

  useFrame((s, dt) => {
    const a = reduced ? 1 : dampAlpha(dt, 8)
    mat.emissiveIntensity += (state.targetEmissive - mat.emissiveIntensity) * a
    mat.opacity += (state.targetOpacity - mat.opacity) * a
    const rm = remnantRef.current
    if (!rm) return
    if (!state.selected || reduced) { startRef.current = null; rm.visible = false; return }
    if (startRef.current === null) startRef.current = s.clock.elapsedTime
    const q = ((s.clock.elapsedTime - startRef.current) / 2.6) % 1
    rm.visible = q < 0.85
    rm.position.set(p[0] + q * 0.5, p[1] - q * 0.1, p[2])
    ;(rm.material as MeshStandardMaterial).opacity = 0.8 * (1 - q)
  })

  return (
    <group>
      <mesh position={p} material={mat}><sphereGeometry args={[r, 14, 12]} /></mesh>
      <mesh ref={remnantRef} visible={false}>
        <sphereGeometry args={[0.035, 8, 6]} />
        <meshStandardMaterial color="#6b7a4a" roughness={0.7} transparent opacity={0.8} />
      </mesh>
    </group>
  )
}
