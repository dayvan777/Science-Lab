import { PARTS } from '../content/parts'
import { usePerchState } from '../state/PerchState'
import { PartLabel } from './PartLabel'

/** Always-on labels for the current phase's parts; the selected one is full-strength. */
export function Labels() {
  const phase = usePerchState(s => s.phase)
  const selected = usePerchState(s => s.selectedPartId)
  if (phase === 'intro') return null
  const parts = PARTS.filter(p => p.phase === phase)
  return <>{parts.map(p => {
    // Internal organs: always-on (ambient, selected brightens). External: only the selected one —
    // 9 persistent pills crowd the head/flank and read as clutter.
    if (phase === 'external' && p.id !== selected) return null
    return <PartLabel key={p.id} def={p} ambient={p.id !== selected} />
  })}</>
}
