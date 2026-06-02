import type { CSSProperties } from 'react'
import { PARTS } from '../content/parts'
import { usePerchState } from '../state/PerchState'
import { useViewport } from '../../../sdk/a11y/useViewport'

export function PartRail() {
  const phase = usePerchState(s => s.phase)
  const selectedId = usePerchState(s => s.selectedPartId)
  const viewed = usePerchState(s => s.viewedPartIds)
  const select = usePerchState(s => s.select)
  const { breakpoint } = useViewport()
  const isPhone = breakpoint === 'phone'
  if (phase === 'intro') return null

  const parts = PARTS.filter(p => p.phase === phase)
  const title = phase === 'external' ? 'Зовнішня будова' : 'Внутрішні органи'

  const railStyle: CSSProperties = {
    position: 'fixed', zIndex: 5, display: 'flex', gap: 8, fontFamily: '"Inter", system-ui, sans-serif',
    ...(isPhone
      ? { left: 12, right: 12, bottom: 12, flexDirection: 'row', overflowX: 'auto', padding: 4 }
      : { left: 18, top: 96, flexDirection: 'column', width: 210 }),
  }
  const chip = (active: boolean): CSSProperties => ({
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
    padding: '11px 13px', borderRadius: 12, cursor: 'pointer', flex: isPhone ? '0 0 auto' : undefined,
    background: active ? 'rgba(220,255,250,0.95)' : 'rgba(255,255,255,0.07)',
    color: active ? '#0a2420' : '#EAF6F4', border: `1px solid ${active ? 'transparent' : 'rgba(150,230,220,0.18)'}`,
    backdropFilter: 'blur(20px)', fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap',
  })
  const progress: CSSProperties = { color: '#9fc4c0', fontSize: 12, fontWeight: 600, letterSpacing: '0.04em', padding: isPhone ? '8px 6px' : '0 4px 6px', alignSelf: isPhone ? 'center' : 'flex-start' }

  return (
    <nav style={railStyle} aria-label={title}>
      {!isPhone && <div style={progress}>{title.toUpperCase()} · {viewed.length}/{PARTS.length}</div>}
      {parts.map(p => {
        const active = selectedId === p.id
        const isViewed = viewed.includes(p.id)
        return (
          <button key={p.id} type="button" onClick={() => select(p.id)} style={chip(active)} aria-pressed={active} aria-label={`${p.label}${isViewed ? ', вивчено' : ''}`}>
            <span>{p.label}</span>
            <span aria-hidden style={{ opacity: isViewed ? 1 : 0.25 }}>{isViewed ? '✓' : '○'}</span>
          </button>
        )
      })}
      {isPhone && <div style={progress}>{viewed.length}/{PARTS.length}</div>}
    </nav>
  )
}
