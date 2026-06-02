import { useState, type ComponentType } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { useCursor } from '@react-three/drei'
import type { OrganelleDef } from '../../content/organelles'
import { useParameciumState } from '../../state/ParameciumState'

export type OrganelleVisualState = {
  selected: boolean
  dimmed: boolean
  targetEmissive: number
  targetOpacity: number
}
export type OrganelleRenderer = ComponentType<{ def: OrganelleDef; state: OrganelleVisualState }>

/** Owns hover/select/cursor + the dim/highlight policy; hands `state` to a renderer. */
export function OrganelleShell({ def, Renderer }: { def: OrganelleDef; Renderer: OrganelleRenderer }) {
  const selectedId = useParameciumState(s => s.selectedOrganelleId)
  const select = useParameciumState(s => s.select)
  const viewMode = useParameciumState(s => s.viewMode)
  const [hovered, setHovered] = useState(false)
  useCursor(hovered && viewMode === 'cell')

  const isSelected = selectedId === def.id
  const anySelected = selectedId !== null
  const highlighted = hovered && !anySelected && viewMode === 'cell'
  const state: OrganelleVisualState = {
    selected: isSelected,
    dimmed: anySelected && !isSelected,
    targetEmissive: isSelected ? 0.55 : highlighted ? 0.28 : 0,
    targetOpacity: anySelected && !isSelected ? 0.22 : 0.95,
  }

  const onOver = (e: ThreeEvent<PointerEvent>) => { if (viewMode === 'cell') { e.stopPropagation(); setHovered(true) } }
  const onOut = () => setHovered(false)
  const onDown = (e: ThreeEvent<PointerEvent>) => { if (viewMode === 'cell') { e.stopPropagation(); select(def.id) } }

  return (
    <group onPointerOver={onOver} onPointerOut={onOut} onPointerDown={onDown}>
      <Renderer def={def} state={state} />
    </group>
  )
}
