import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, MeshStandardMaterial } from 'three'
import type { PartDef } from '../content/parts'
import { PARTS } from '../content/parts'
import { useReducedMotion } from '../../../sdk/a11y/useReducedMotion'
import { dampAlpha } from './anatomy'
import { PartShell, type PartVisualState, type PartRenderer } from './PartShell'

const EXTERNAL_PARTS = PARTS.filter(p => p.phase === 'external')

/** A soft hotspot sphere at the part anchor: invisible until hovered/selected, then a colored glow. */
function Hotspot({ def, state }: { def: PartDef; state: PartVisualState }) {
  const reduced = useReducedMotion()
  const mat = useMemo(() => new MeshStandardMaterial({
    color: def.color, emissive: new Color(def.color), emissiveIntensity: 0,
    transparent: true, opacity: 0,
  }), [def.color])
  useFrame((_, dt) => {
    const a = reduced ? 1 : dampAlpha(dt, 8)
    const wantOpacity = state.selected ? 0.5 : (state.targetEmissive > 0 ? 0.3 : 0.0)
    mat.opacity += (wantOpacity - mat.opacity) * a
    mat.emissiveIntensity += (state.targetEmissive - mat.emissiveIntensity) * a
  })
  return (
    <mesh position={def.position} material={mat}>
      <sphereGeometry args={[0.32, 16, 12]} />
    </mesh>
  )
}

const Renderer: PartRenderer = Hotspot

export function ExternalParts() {
  return <>{EXTERNAL_PARTS.map(def => <PartShell key={def.id} def={def} Renderer={Renderer} />)}</>
}
