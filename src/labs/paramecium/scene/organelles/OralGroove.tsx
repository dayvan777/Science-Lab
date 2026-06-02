import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, Mesh, MeshStandardMaterial, DoubleSide } from 'three'
import type { OrganelleDef } from '../../content/organelles'
import { useReducedMotion } from '../../../../sdk/a11y/useReducedMotion'
import { dampAlpha } from '../life'
import { smoothstep } from './motion'
import type { OrganelleVisualState } from './OrganelleShell'

export function OralGroove({ def, state }: { def: OrganelleDef; state: OrganelleVisualState }) {
  const reduced = useReducedMotion()
  const p = def.positions?.[0] ?? [0, 0, 0]
  const r = def.radius ?? 0.18
  const preyRef = useRef<Mesh>(null)
  const budRef = useRef<Mesh>(null)
  const startRef = useRef<number | null>(null)

  const mat = useMemo(() => new MeshStandardMaterial({
    color: def.color, emissive: new Color(def.color), emissiveIntensity: 0,
    roughness: 0.5, transparent: true, opacity: 0.95, side: DoubleSide,
  }), [def.color])

  useFrame((s, dt) => {
    const a = reduced ? 1 : dampAlpha(dt, 8)
    mat.emissiveIntensity += (state.targetEmissive - mat.emissiveIntensity) * a
    mat.opacity += (state.targetOpacity - mat.opacity) * a
    const prey = preyRef.current, bud = budRef.current
    if (!prey || !bud) return
    if (!state.selected || reduced) { startRef.current = null; prey.visible = false; bud.visible = false; return }
    if (startRef.current === null) startRef.current = s.clock.elapsedTime
    const q = ((s.clock.elapsedTime - startRef.current) / 3) % 1
    prey.visible = q < 0.8
    const k = Math.min(1, q / 0.8)
    prey.position.set(p[0] - 0.5 + 0.5 * k, p[1] - 0.35 + 0.35 * k, p[2] + 0.25 - 0.25 * k)
    const bq = q > 0.78 ? smoothstep(0.78, 0.95, q) : 0
    bud.visible = bq > 0.01
    bud.scale.setScalar(0.12 * bq)
  })

  return (
    <group>
      <mesh position={p} rotation={[Math.PI, 0, 0]} material={mat}>
        <coneGeometry args={[r, 0.45, 22, 1, true]} />
      </mesh>
      <mesh ref={preyRef} visible={false}>
        <sphereGeometry args={[0.045, 10, 8]} />
        <meshStandardMaterial color="#3f5a23" roughness={0.7} />
      </mesh>
      <mesh ref={budRef} position={[p[0] + 0.15, p[1] + 0.2, p[2] - 0.1]} visible={false}>
        <sphereGeometry args={[1, 16, 12]} />
        <meshStandardMaterial color="#a7c46a" roughness={0.5} transparent opacity={0.9} />
      </mesh>
    </group>
  )
}
