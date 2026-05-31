import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { ORGANS } from '../content/organs'
import { useAnatomyState } from '../state/AnatomyState'
import { OrganRail } from './OrganRail'
import { OrganInfoCard } from './OrganInfoCard'

export function HUD() {
  const viewed = useAnatomyState(s => s.viewedOrganIds)
  const selectedId = useAnatomyState(s => s.selectedOrganId)
  const allViewed = viewed.length === ORGANS.length

  const backStyle: CSSProperties = {
    position: 'fixed', zIndex: 6, top: 18, left: 18,
    color: 'rgba(255,255,255,0.7)', textDecoration: 'none',
    fontSize: 13, fontFamily: '"Inter", system-ui, sans-serif', fontWeight: 500,
    letterSpacing: '0.05em', padding: '8px 12px', borderRadius: 100,
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)',
    backdropFilter: 'blur(20px)',
  }

  const badgeStyle: CSSProperties = {
    position: 'fixed', zIndex: 6, top: 18, left: '50%', transform: 'translateX(-50%)',
    padding: '10px 18px', borderRadius: 100,
    background: 'rgba(95, 227, 208, 0.16)', border: '1px solid rgba(95,227,208,0.4)',
    color: '#bdf4ea', fontSize: 13, fontWeight: 700,
    fontFamily: '"Inter", system-ui, sans-serif',
  }

  return (
    <>
      <Link to="/biology" style={backStyle} aria-label="Назад до біології">← Біологія</Link>
      {allViewed && !selectedId && <div style={badgeStyle}>Готово — ти вивчив усі органи 🎉</div>}
      <OrganRail />
      <OrganInfoCard />
    </>
  )
}
