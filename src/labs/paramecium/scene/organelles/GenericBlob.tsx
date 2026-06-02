import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, Color, MeshStandardMaterial } from 'three'
import type { OrganelleDef } from '../../content/organelles'
import { useReducedMotion } from '../../../../sdk/a11y/useReducedMotion'
import { dampAlpha } from '../life'
import type { OrganelleVisualState } from './OrganelleShell'

export function GenericBlob({ def, state }: { def: OrganelleDef; state: OrganelleVisualState }) {
  const reduced = useReducedMotion()
  const ref = useRef<Group>(null)
  const mat = useMemo(() => new MeshStandardMaterial({
    color: def.color, roughness: 0.5, transparent: true, opacity: 0.9,
    emissive: new Color(def.color), emissiveIntensity: 0,
  }), [def.color])

  useFrame((s, dt) => {
    const a = reduced ? 1 : dampAlpha(dt, 8)
    mat.emissiveIntensity += (state.targetEmissive - mat.emissiveIntensity) * a
    mat.opacity += (state.targetOpacity - mat.opacity) * a
    const g = ref.current
    if (g) g.scale.setScalar(state.selected && !reduced ? 1 + Math.sin(s.clock.elapsedTime * 4) * 0.05 : 1)
  })

  return (
    <group ref={ref}>
      {(def.positions ?? []).map((p, i) => (
        <mesh key={i} position={p} scale={def.scale} material={mat}>
          {def.kind === 'funnel'
            ? <coneGeometry args={[def.radius ?? 0.18, 0.4, 20, 1, true]} />
            : <sphereGeometry args={[def.radius ?? 0.12, 24, 20]} />}
        </mesh>
      ))}
    </group>
  )
}
