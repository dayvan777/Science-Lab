import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, Color, MeshStandardMaterial } from 'three'
import type { OrganelleDef } from '../../content/organelles'
import { useReducedMotion } from '../../../../sdk/a11y/useReducedMotion'
import { dampAlpha } from '../life'
import { cyclosisPos, digestColor } from './motion'
import type { OrganelleVisualState } from './OrganelleShell'

const SPECKS: [number, number, number][] = [[-0.32, -0.18, 0.1], [0.26, 0.12, -0.05], [0.02, 0.36, 0.15]]

export function FoodVacuoles({ def, state }: { def: OrganelleDef; state: OrganelleVisualState }) {
  const reduced = useReducedMotion()
  const positions = def.positions ?? []
  const count = positions.length
  const r = def.radius ?? 0.13
  const groups = useRef<Group[]>([])

  const mats = useMemo(
    () => positions.map(() => new MeshStandardMaterial({
      color: def.color, emissive: new Color(def.color), emissiveIntensity: 0,
      roughness: 0.5, transparent: true, opacity: 0.95,
    })),
    [count, def.color], // eslint-disable-line react-hooks/exhaustive-deps
  )
  const speckMat = useMemo(() => new MeshStandardMaterial({ color: '#3f5a23', roughness: 0.7 }), [])

  useFrame((s, dt) => {
    const a = reduced ? 1 : dampAlpha(dt, 8)
    const t = s.clock.elapsedTime
    mats.forEach((m, i) => {
      m.emissiveIntensity += (state.targetEmissive - m.emissiveIntensity) * a
      m.opacity += (state.targetOpacity - m.opacity) * a
      const prog = reduced ? i / Math.max(1, count) : ((t / 18 + i / Math.max(1, count)) % 1)
      m.color.copy(digestColor(prog))
      const g = groups.current[i]
      if (!g) return
      const pos = reduced ? positions[i] : cyclosisPos(t, i, count)
      g.position.set(pos[0], pos[1], pos[2])
    })
  })

  return (
    <>
      {positions.map((p, i) => (
        <group key={i} position={p} ref={(el) => { if (el) groups.current[i] = el }}>
          <mesh material={mats[i]}><sphereGeometry args={[r, 20, 16]} /></mesh>
          {SPECKS.map((sp, k) => (
            <mesh key={k} position={[sp[0] * r, sp[1] * r, sp[2] * r]} scale={[r * 0.22, r * 0.11, r * 0.11]} material={speckMat}>
              <sphereGeometry args={[1, 8, 6]} />
            </mesh>
          ))}
        </group>
      ))}
    </>
  )
}
