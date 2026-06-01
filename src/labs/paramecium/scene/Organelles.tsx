import { useMemo, useRef, useState } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { useFrame } from '@react-three/fiber'
import { useCursor } from '@react-three/drei'
import { Group, Color, MeshStandardMaterial } from 'three'
import { ORGANELLES, type OrganelleDef, type OrganelleId } from '../content/organelles'
import { useParameciumState } from '../state/ParameciumState'
import { useReducedMotion } from '../../../sdk/a11y/useReducedMotion'

const POINT_ORGANELLES = ORGANELLES.filter(o => o.kind !== 'layer')

function OrganelleGroup({ def }: { def: OrganelleDef }) {
  const selectedId = useParameciumState(s => s.selectedOrganelleId)
  const select = useParameciumState(s => s.select)
  const viewMode = useParameciumState(s => s.viewMode)
  const reduced = useReducedMotion()
  const [hovered, setHovered] = useState(false)
  useCursor(hovered && viewMode === 'cell')

  const ref = useRef<Group>(null)
  const isSelected = selectedId === def.id
  const anySelected = selectedId !== null
  const mat = useMemo(() => new MeshStandardMaterial({
    color: def.color, roughness: 0.5, transparent: true, opacity: 0.9,
    emissive: new Color(def.color), emissiveIntensity: 0,
  }), [def.color])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    mat.emissiveIntensity = isSelected ? 0.5 : (hovered && !anySelected && viewMode === 'cell' ? 0.25 : 0)
    mat.opacity = anySelected && !isSelected ? 0.25 : 0.9
    const g = ref.current
    if (g) {
      const pulse = def.id === 'contractileVacuoles' && !reduced ? 1 + Math.sin(t * 2) * 0.08
        : isSelected && !reduced ? 1 + Math.sin(t * 4) * 0.05 : 1
      g.scale.setScalar(pulse)
    }
  })

  const onOver = (e: ThreeEvent<PointerEvent>) => { if (viewMode === 'cell') { e.stopPropagation(); setHovered(true) } }
  const onOut = () => setHovered(false)
  const onDown = (e: ThreeEvent<PointerEvent>) => { if (viewMode === 'cell') { e.stopPropagation(); select(def.id) } }

  return (
    <group ref={ref}>
      {(def.positions ?? []).map((p, i) => (
        <mesh key={i} position={p} scale={def.scale} material={mat} onPointerOver={onOver} onPointerOut={onOut} onPointerDown={onDown}>
          {def.kind === 'funnel'
            ? <coneGeometry args={[def.radius ?? 0.18, 0.4, 20, 1, true]} />
            : <sphereGeometry args={[def.radius ?? 0.12, 24, 20]} />}
        </mesh>
      ))}
    </group>
  )
}

/** Sparse dots just under the pellicle; glow when trichocysts are selected. */
function Trichocysts() {
  const selectedId = useParameciumState(s => s.selectedOrganelleId)
  const on = selectedId === 'trichocysts'
  const dots = useMemo(() => {
    const out: [number, number, number][] = []
    const golden = Math.PI * (3 - Math.sqrt(5))
    for (let i = 0; i < 60; i++) {
      const y = 1 - (i / 59) * 2, r = Math.sqrt(Math.max(0, 1 - y * y)), th = golden * i
      out.push([Math.cos(th) * r * 1.42, y * 0.71, Math.sin(th) * r * 0.57])
    }
    return out
  }, [])
  return (
    <group>
      {dots.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.03, 8, 8]} />
          <meshStandardMaterial color="#dfeaf2" emissive={on ? '#5FE3D0' : '#000000'} emissiveIntensity={on ? 0.8 : 0} transparent opacity={on ? 0.95 : 0.45} />
        </mesh>
      ))}
    </group>
  )
}

export function Organelles() {
  return (
    <>
      {POINT_ORGANELLES.map(def => <OrganelleGroup key={def.id} def={def} />)}
      <Trichocysts />
    </>
  )
}

// re-export so Cell can highlight layer organelles by id without importing content twice
export type { OrganelleId }
