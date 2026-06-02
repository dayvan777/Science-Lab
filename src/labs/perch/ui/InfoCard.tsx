import type { CSSProperties } from 'react'
import { GlassPanel } from '../../../sdk/ui/GlassPanel'
import { Button } from '../../../sdk/ui/Button'
import { useViewport } from '../../../sdk/a11y/useViewport'
import { usePerchState } from '../state/PerchState'
import { getPart } from '../content/parts'

export function InfoCard() {
  const selectedId = usePerchState(s => s.selectedPartId)
  const deselect = usePerchState(s => s.deselect)
  const { breakpoint } = useViewport()
  const isPhone = breakpoint === 'phone'
  if (!selectedId) return null
  const p = getPart(selectedId)
  const wrap: CSSProperties = { position: 'fixed', zIndex: 6, ...(isPhone ? { left: 12, right: 12, bottom: 84 } : { right: 18, top: 96, width: 360 }) }
  return (
    <div style={wrap}>
      <GlassPanel variant="strong" style={{ padding: 22 }} role="dialog" aria-label={p.label}>
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 12, fontFamily: '"Inter", system-ui, sans-serif' }}>{p.label}</div>
        <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {p.facts.map((f, i) => <li key={i} style={{ fontSize: 14, lineHeight: 1.5, color: '#3a3a3f' }}>{f}</li>)}
        </ul>
        <div style={{ marginTop: 18 }}><Button variant="secondary" fullWidth onClick={deselect}>Закрити</Button></div>
      </GlassPanel>
    </div>
  )
}
