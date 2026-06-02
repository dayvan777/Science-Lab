import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, MeshPhysicalMaterial, Group, TubeGeometry, CatmullRomCurve3, Vector3 } from 'three'
import type { PartDef } from '../content/parts'
import { PARTS } from '../content/parts'
import { useReducedMotion } from '../../../sdk/a11y/useReducedMotion'
import { dampAlpha } from './anatomy'
import { PartShell, type PartVisualState, type PartRenderer } from './PartShell'

const ORGAN_PARTS = PARTS.filter(p => p.phase === 'internal')

/** A short coiled intestine tube, built once. */
const COIL_GEO = (() => {
  const pts = []
  for (let i = 0; i <= 28; i++) {
    const a = (i / 28) * Math.PI * 3.2
    pts.push(new Vector3(Math.cos(a) * 0.16, (i / 28 - 0.5) * 0.14, Math.sin(a) * 0.13))
  }
  return new TubeGeometry(new CatmullRomCurve3(pts), 48, 0.045, 8, false)
})()

function OrganMesh({ def, state }: { def: PartDef; state: PartVisualState }) {
  const reduced = useReducedMotion()
  const ref = useRef<Group>(null)
  const wet = def.id === 'swimBladder'
  const mat = useMemo(() => new MeshPhysicalMaterial({
    color: def.color, emissive: new Color(def.color), emissiveIntensity: 0,
    roughness: wet ? 0.18 : 0.5, clearcoat: wet ? 1 : 0.5, clearcoatRoughness: wet ? 0.1 : 0.4,
    transparent: true, opacity: 0.97,
  }), [def.color, wet])

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
          {[0, 1, 2, 3].map(i => (
            <mesh key={i} position={[0, -i * 0.085, 0]} rotation={[0, 0, -0.2]} material={mat}>
              <torusGeometry args={[0.15, 0.022, 8, 20, Math.PI * 1.1]} />
            </mesh>
          ))}
        </group>
      )
    case 'liver': // 3 lobes
      return (
        <group position={[p[0], p[1], p[2]]}>
          <mesh material={mat}><sphereGeometry args={[0.2, 18, 14]} /></mesh>
          <mesh position={[0.16, -0.04, 0.04]} material={mat}><sphereGeometry args={[0.14, 16, 12]} /></mesh>
          <mesh position={[-0.13, -0.05, -0.03]} material={mat}><sphereGeometry args={[0.12, 16, 12]} /></mesh>
        </group>
      )
    case 'swimBladder':
      return (
        <mesh position={p} scale={[2.3, 0.5, 0.6]} material={mat}>
          <sphereGeometry args={[0.3, 32, 22]} />
        </mesh>
      )
    case 'heart':
      return (
        <group position={[p[0], p[1], p[2]]}>
          <mesh material={mat}><sphereGeometry args={[0.15, 18, 14]} /></mesh>
          <mesh position={[0.06, 0.12, 0]} scale={[0.7, 0.9, 0.7]} material={mat}><sphereGeometry args={[0.1, 14, 12]} /></mesh>
        </group>
      )
    case 'stomach':
      return (
        <group position={[p[0], p[1], p[2]]} rotation={[0, 0, 0.5]}>
          <mesh scale={[1, 1.5, 0.85]} material={mat}><sphereGeometry args={[0.16, 18, 14]} /></mesh>
          <mesh position={[0.13, -0.16, 0]} scale={[0.7, 0.7, 0.7]} material={mat}><sphereGeometry args={[0.13, 14, 12]} /></mesh>
        </group>
      )
    case 'intestine':
      return <mesh position={p} geometry={COIL_GEO} material={mat} />
    case 'kidney':
      return <mesh position={p} scale={[3.2, 0.4, 0.34]} material={mat}><sphereGeometry args={[0.16, 18, 12]} /></mesh>
    default:
      return <mesh position={p} material={mat}><sphereGeometry args={[0.16, 16, 12]} /></mesh>
  }
}

const Renderer: PartRenderer = OrganMesh

export function Organs() {
  return <>{ORGAN_PARTS.map(def => <PartShell key={def.id} def={def} Renderer={Renderer} />)}</>
}
