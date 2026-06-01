import type { CSSProperties } from 'react'
import { ORGANELLES } from '../content/organelles'
import { useParameciumState } from '../state/ParameciumState'
import { useViewport } from '../../../sdk/a11y/useViewport'

export function OrganelleRail() {
  const viewMode = useParameciumState(s => s.viewMode)
  const selectedId = useParameciumState(s => s.selectedOrganelleId)
  const viewed = useParameciumState(s => s.viewedOrganelleIds)
  const select = useParameciumState(s => s.select)
  const { breakpoint } = useViewport()
  const isPhone = breakpoint === 'phone'

  if (viewMode !== 'cell') return null

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
  const progress: CSSProperties = {
    color: '#9fc4c0', fontSize: 12, fontWeight: 600, letterSpacing: '0.04em',
    padding: isPhone ? '8px 6px' : '0 4px 6px', alignSelf: isPhone ? 'center' : 'flex-start',
  }

  return (
    <nav style={railStyle} aria-label="Органели">
      {!isPhone && <div style={progress}>ВИВЧЕНО {viewed.length}/{ORGANELLES.length}</div>}
      {ORGANELLES.map(o => {
        const active = selectedId === o.id
        const isViewed = viewed.includes(o.id)
        return (
          <button key={o.id} type="button" onClick={() => select(o.id)} style={chip(active)} aria-pressed={active}
            aria-label={`Органела: ${o.label}${isViewed ? ', вивчено' : ''}`}>
            <span>{o.label}</span>
            <span aria-hidden style={{ opacity: isViewed ? 1 : 0.25 }}>{isViewed ? '✓' : '○'}</span>
          </button>
        )
      })}
      {isPhone && <div style={progress}>{viewed.length}/{ORGANELLES.length}</div>}
    </nav>
  )
}
