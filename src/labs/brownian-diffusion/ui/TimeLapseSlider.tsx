import { useLabSettings, TIME_LAPSE_VALUES, TimeLapseYears } from '../state/LabSettingsState'
import { Button } from '../../../sdk/ui/Button'

export function TimeLapseSlider() {
  const years = useLabSettings(s => s.timeLapseYears)
  const setTimeLapse = useLabSettings(s => s.setTimeLapse)

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      background: 'rgba(0,0,0,0.5)',
      padding: '8px 12px',
      borderRadius: 12,
      backdropFilter: 'blur(8px)',
      color: '#fff',
      fontFamily: '"Inter", system-ui, sans-serif',
    }}>
      <div style={{ fontSize: 11, opacity: 0.7, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        Час: {years === 1 ? '1 рік' : `${years} років`}
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        {TIME_LAPSE_VALUES.map((y: TimeLapseYears) => (
          <Button
            key={y}
            variant={years === y ? 'primary' : 'secondary'}
            onClick={() => setTimeLapse(y)}
            aria-label={`${y}`}
          >
            {y}
          </Button>
        ))}
      </div>
    </div>
  )
}
