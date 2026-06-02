import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, MeshStandardMaterial, Group } from 'three'
import type { PartDef } from '../content/parts'
import { PARTS } from '../content/parts'
import { useReducedMotion } from '../../../sdk/a11y/useReducedMotion'
import { dampAlpha } from './anatomy'
import { PartShell, type PartVisualState, type PartRenderer } from './PartShell'

const ORGAN_PARTS = PARTS.filter(p => p.phase === 'internal')

/** Per-organ procedural shape, keyed by id. All share the lerped emissive/opacity from `state`. */
function OrganMesh({ def, state }: { def: PartDef; state: PartVisualState }) {
  const reduced = useReducedMotion()
  const ref = useRef<Group>(null)
  const mat = useMemo(() => new MeshStandardMaterial({
    color: def.color, emissive: new Color(def.color), emissiveIntensity: 0,
    roughness: def.id === 'swimBladder' ? 0.3 : 0.55, metalness: def.id === 'swimBladder' ? 0.1 : 0,
    transparent: true, opacity: 0.97,
  }), [def.color, def.id])

  useFrame((s, dt) => {
    const a = reduced ? 1 : dampAlpha(dt, 8)
    mat.emissiveIntensity += (state.targetEmissive - mat.emissiveIntensity) * a
    mat.opacity += (state.targetOpacity - mat.opacity) * a
    if (ref.current && def.id === 'gills') ref.current.rotation.z = reduced ? 0 : Math.sin(s.clock.elapsedTime * 1.5) * 0.06
  })

  const p = def.position
  switch (def.id) {
    case 'gills':
      return (
        <group ref={ref} position={[p[0], p[1], p[2]]}>
          {[0, 1, 2].map(i => (
            <mesh key={i} position={[0, -i * 0.12, 0]} material={mat}>
              <torusGeometry args={[0.16, 0.03, 8, 16, Math.PI]} />
            </mesh>
          ))}
        </group>
      )
    case 'heart':
      return <mesh position={p} material={mat}><sphereGeometry args={[0.17, 18, 14]} /></mesh>
    case 'liver':
      return <mesh position={p} scale={[1.5, 0.9, 0.8]} material={mat}><sphereGeometry args={[0.22, 18, 14]} /></mesh>
    case 'swimBladder':
      return <mesh position={p} scale={[2.4, 0.7, 0.7]} material={mat}><sphereGeometry args={[0.3, 26, 18]} /></mesh>
    case 'stomach':
      return <mesh position={p} scale={[1.2, 1.4, 0.8]} material={mat}><sphereGeometry args={[0.2, 16, 14]} /></mesh>
    case 'intestine':
      return (
        <mesh position={p} material={mat}>
          <torusKnotGeometry args={[0.16, 0.05, 64, 8, 2, 3]} />
        </mesh>
      )
    case 'kidney':
      return <mesh position={p} scale={[3.2, 0.5, 0.4]} material={mat}><sphereGeometry args={[0.16, 18, 12]} /></mesh>
    default:
      return <mesh position={p} material={mat}><sphereGeometry args={[0.16, 16, 12]} /></mesh>
  }
}

const Renderer: PartRenderer = OrganMesh

export function Organs() {
  return <>{ORGAN_PARTS.map(def => <PartShell key={def.id} def={def} Renderer={Renderer} />)}</>
}
