import { useLabSettings, type MaterialState, type TemperatureLevel, type TimeLapseYears, TIME_LAPSE_VALUES } from '../state/LabSettingsState'

const STATES: { id: MaterialState; label: string }[] = [
  { id: 'gas', label: 'Газ' }, { id: 'liquid', label: 'Рідина' }, { id: 'solid', label: 'Тверде' },
]
const TEMPS: { id: TemperatureLevel; label: string }[] = [
  { id: 'cold', label: 'Холодно' }, { id: 'normal', label: 'Кімнатна' },
  { id: 'warm', label: 'Тепло' }, { id: 'hot', label: 'Гаряче' },
]

const seg = (active: boolean): React.CSSProperties => ({
  flex: 1, padding: '8px 0', border: 'none', borderRadius: 8, fontSize: 12.5, fontWeight: 600,
  cursor: 'pointer', color: active ? '#fff' : '#1d1d1f',
  background: active ? '#0071e3' : 'rgba(0,0,0,0.05)',
})
const label: React.CSSProperties = { fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#86868b', fontWeight: 600, marginBottom: 6, display: 'block' }
const ctl: React.CSSProperties = { marginBottom: 14 }

export function ControlPanel() {
  const s = useLabSettings()
  const solid = s.materialState === 'solid'

  return (
    <div style={{ padding: 16, borderRadius: 16, background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(20px)', width: 260, color: '#1d1d1f', boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }}>
      <div style={ctl}>
        <span style={label}>Стан речовини</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {STATES.map(st => (
            <button key={st.id} style={seg(s.materialState === st.id)} onClick={() => s.setMaterialState(st.id)}>{st.label}</button>
          ))}
        </div>
      </div>

      <div style={ctl}>
        <span style={label}>Температура</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {TEMPS.map(t => (
            <button key={t.id} style={seg(s.temperatureLevel === t.id)} onClick={() => s.setTemperature(t.id)}>{t.label}</button>
          ))}
        </div>
      </div>

      <div style={ctl}>
        <span style={label}>Молекули</span>
        <Stepper colour="#e64a3b" name="червоних" value={s.redCount} onMinus={() => s.setRedCount(s.redCount - 5)} onPlus={() => s.setRedCount(s.redCount + 5)} />
        <Stepper colour="#0a84ff" name="синіх" value={s.blueCount} onMinus={() => s.setBlueCount(s.blueCount - 5)} onPlus={() => s.setBlueCount(s.blueCount + 5)} />
      </div>

      <div style={ctl}>
        <button style={{ ...seg(s.dividerRaised), width: '100%' }} onClick={() => s.setDividerRaised(!s.dividerRaised)}>
          Перегородка: {s.dividerRaised ? 'Піднята' : 'Опущена'}
        </button>
      </div>

      <button
        disabled={solid}
        onClick={() => s.addTracer()}
        style={{ width: '100%', padding: 11, border: 'none', borderRadius: 11, fontSize: 13, fontWeight: 700, marginBottom: 14, cursor: solid ? 'not-allowed' : 'pointer', color: '#fff', background: solid ? '#a0a0a8' : '#0071e3' }}
      >
        ＋ Тестова частинка
      </button>

      <div style={{ ...ctl, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13 }}>Показати молекули</span>
        <button onClick={() => s.toggleMolecules()} aria-pressed={s.showMolecules}
          style={{ padding: '6px 12px', borderRadius: 999, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: s.showMolecules ? '#fff' : '#1d1d1f', background: s.showMolecules ? '#34c759' : 'rgba(0,0,0,0.08)' }}>
          {s.showMolecules ? 'Увімк.' : 'Вимк.'}
        </button>
      </div>

      {solid && (
        <div style={ctl}>
          <span style={label}>Час (роки)</span>
          <div style={{ display: 'flex', gap: 4 }}>
            {TIME_LAPSE_VALUES.map((y: TimeLapseYears) => (
              <button key={y} style={seg(s.timeLapseYears === y)} onClick={() => s.setTimeLapse(y)}>{y}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Stepper({ colour, name, value, onMinus, onPlus }: { colour: string; name: string; value: number; onMinus: () => void; onPlus: () => void }) {
  const btn: React.CSSProperties = { width: 30, height: 30, borderRadius: 8, border: '1px solid rgba(0,0,0,0.1)', background: 'rgba(0,0,0,0.04)', fontSize: 16, fontWeight: 700, color: '#0071e3', cursor: 'pointer' }
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
        <span style={{ width: 11, height: 11, borderRadius: '50%', background: colour }} /> {name}
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button style={btn} aria-label={`Менше ${name}`} onClick={onMinus}>−</button>
        <b style={{ minWidth: 22, textAlign: 'center' }}>{value}</b>
        <button style={btn} aria-label={`Більше ${name}`} onClick={onPlus}>＋</button>
      </span>
    </div>
  )
}
