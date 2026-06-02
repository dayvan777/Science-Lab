import { PARTS } from '../content/parts'
import { usePerchState } from '../state/PerchState'
import { PartLabel } from './PartLabel'

/** Always-on labels for the current phase's parts; the selected one is full-strength. */
export function Labels() {
  const phase = usePerchState(s => s.phase)
  const selected = usePerchState(s => s.selectedPartId)
  if (phase === 'intro') return null
  const parts = PARTS.filter(p => p.phase === phase)
  return <>{parts.map(p => <PartLabel key={p.id} def={p} ambient={p.id !== selected} />)}</>
}
