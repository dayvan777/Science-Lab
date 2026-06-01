import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { ORGANELLES } from '../content/organelles'
import { useParameciumState } from '../state/ParameciumState'
import { OrganelleRail } from './OrganelleRail'
import { InfoCard } from './InfoCard'

export function HUD() {
  const viewMode = useParameciumState(s => s.viewMode)
  const selectedId = useParameciumState(s => s.selectedOrganelleId)
  const viewed = useParameciumState(s => s.viewedOrganelleIds)
  const exit = useParameciumState(s => s.exitToEnvironment)
  const allViewed = viewed.length === ORGANELLES.length

  const pill: CSSProperties = {
    position: 'fixed', zIndex: 6, top: 18,
    color: 'rgba(234,246,244,0.8)', textDecoration: 'none', fontSize: 13,
    fontFamily: '"Inter", system-ui, sans-serif', fontWeight: 500, letterSpacing: '0.04em',
    padding: '8px 12px', borderRadius: 100, background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(150,230,220,0.16)', backdropFilter: 'blur(20px)', cursor: 'pointer',
  }
  const badge: CSSProperties = {
    position: 'fixed', zIndex: 6, top: 18, left: '50%', transform: 'translateX(-50%)',
    padding: '10px 18px', borderRadius: 100, background: 'rgba(95,227,208,0.16)',
    border: '1px solid rgba(95,227,208,0.4)', color: '#bdf4ea', fontSize: 13, fontWeight: 700,
    fontFamily: '"Inter", system-ui, sans-serif',
  }
  const credit: CSSProperties = {
    position: 'fixed', zIndex: 5, right: 14, bottom: 10, maxWidth: 220, textAlign: 'right',
    color: 'rgba(234,246,244,0.3)', fontSize: 10, lineHeight: 1.4,
    fontFamily: '"Inter", system-ui, sans-serif', pointerEvents: 'none',
  }

  return (
    <>
      {viewMode === 'cell'
        ? <button type="button" style={{ ...pill, left: 18 }} onClick={() => exit()} aria-label="Назад до краплини">← Краплина</button>
        : <Link to="/biology" style={{ ...pill, left: 18 }} aria-label="Назад до біології">← Біологія</Link>}
      {allViewed && !selectedId && <div style={badge}>Готово — ти вивчив усі частини 🎉</div>}
      <div style={credit}>Інфузорія-туфелька · процедурна 3D-модель · NOVA EVRIKA</div>
      <OrganelleRail />
      <InfoCard />
    </>
  )
}
