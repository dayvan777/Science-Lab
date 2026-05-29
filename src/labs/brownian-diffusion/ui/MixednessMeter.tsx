import { useLabState } from '../state/LabState'

export function MixednessMeter() {
  const pct = Math.max(0, Math.min(100, Math.round(useLabState(s => s.mixedness) * 100)))
  return (
    <div
      aria-label="Перемішаність"
      style={{
        padding: '12px 16px', borderRadius: 14,
        background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(20px)',
        boxShadow: '0 1px 2px rgba(0,0,0,0.06), 0 8px 30px rgba(0,0,0,0.10)',
        minWidth: 240,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <span style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#86868b', fontWeight: 600 }}>
          Перемішаність
        </span>
        <span data-testid="mixedness-pct" style={{ fontSize: 20, fontWeight: 700, color: '#0071e3' }}>{pct}%</span>
      </div>
      <div style={{ height: 10, borderRadius: 999, background: 'rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#34c759,#0071e3)', transition: 'width 200ms ease' }} />
      </div>
    </div>
  )
}
