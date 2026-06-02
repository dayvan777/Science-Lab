import { useState, type ComponentType } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { useCursor } from '@react-three/drei'
import type { PartDef } from '../content/parts'
import { usePerchState } from '../state/PerchState'

export type PartVisualState = { selected: boolean; dimmed: boolean; targetEmissive: number; targetOpacity: number }
export type PartRenderer = ComponentType<{ def: PartDef; state: PartVisualState }>

/** Hover/select/cursor + dim/highlight policy, gated so a part is interactive only in its phase. */
export function PartShell({ def, Renderer }: { def: PartDef; Renderer: PartRenderer }) {
  const phase = usePerchState(s => s.phase)
  const selectedId = usePerchState(s => s.selectedPartId)
  const select = usePerchState(s => s.select)
  const [hovered, setHovered] = useState(false)
  const active = def.phase === phase
  useCursor(hovered && active)

  const isSelected = selectedId === def.id
  const anySelected = selectedId !== null
  const highlighted = hovered && active && !anySelected
  const state: PartVisualState = {
    selected: isSelected,
    dimmed: anySelected && !isSelected,
    targetEmissive: isSelected ? 0.55 : highlighted ? 0.28 : 0,
    targetOpacity: anySelected && !isSelected ? 0.25 : (active ? 0.97 : 0.85),
  }

  const onOver = (e: ThreeEvent<PointerEvent>) => { if (active) { e.stopPropagation(); setHovered(true) } }
  const onOut = () => setHovered(false)
  const onDown = (e: ThreeEvent<PointerEvent>) => { if (active) { e.stopPropagation(); select(def.id) } }

  return (
    <group onPointerOver={onOver} onPointerOut={onOut} onPointerDown={onDown}>
      <Renderer def={def} state={state} />
    </group>
  )
}
