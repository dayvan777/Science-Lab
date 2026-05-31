import type { CSSProperties } from 'react'
import { ORGANS } from '../content/organs'
import { useAnatomyState } from '../state/AnatomyState'
import { useViewport } from '../../../sdk/a11y/useViewport'

export function OrganRail() {
  const selectedId = useAnatomyState(s => s.selectedOrganId)
  const viewed = useAnatomyState(s => s.viewedOrganIds)
  const select = useAnatomyState(s => s.select)
  const { breakpoint } = useViewport()
  const isPhone = breakpoint === 'phone'

  const railStyle: CSSProperties = {
    position: 'fixed',
    zIndex: 5,
    display: 'flex',
    gap: 8,
    fontFamily: '"Inter", system-ui, sans-serif',
    ...(isPhone
      ? { left: 12, right: 12, bottom: 12, flexDirection: 'row', overflowX: 'auto', padding: 4 }
      : { left: 18, top: 96, flexDirection: 'column', width: 188 }),
  }

  const chip = (active: boolean): CSSProperties => ({
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
    padding: '12px 14px', borderRadius: 12, cursor: 'pointer',
    flex: isPhone ? '0 0 auto' : undefined,
    background: active ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.07)',
    color: active ? '#16171c' : '#ECECF1',
    border: `1px solid ${active ? 'transparent' : 'rgba(255,255,255,0.12)'}`,
    backdropFilter: 'blur(20px)',
    fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap',
    transition: 'background 180ms ease, color 180ms ease',
  })

  const progressStyle: CSSProperties = {
    color: '#9AA3B2', fontSize: 12, fontWeight: 600, letterSpacing: '0.04em',
    padding: isPhone ? '8px 6px' : '0 4px 6px',
    alignSelf: isPhone ? 'center' : 'flex-start',
  }

  return (
    <nav style={railStyle} aria-label="Органи">
      {!isPhone && <div style={progressStyle}>ВИВЧЕНО {viewed.length}/{ORGANS.length}</div>}
      {ORGANS.map(o => {
        const active = selectedId === o.id
        const isViewed = viewed.includes(o.id)
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => select(o.id)}
            style={chip(active)}
            aria-pressed={active}
            aria-label={`Орган: ${o.label}${isViewed ? ', вивчено' : ''}`}
          >
            <span>{o.label}</span>
            <span aria-hidden style={{ opacity: isViewed ? 1 : 0.25 }}>{isViewed ? '✓' : '○'}</span>
          </button>
        )
      })}
      {isPhone && <div style={progressStyle}>{viewed.length}/{ORGANS.length}</div>}
    </nav>
  )
}
