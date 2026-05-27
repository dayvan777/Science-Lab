import { Button } from '../../../sdk/ui/Button'
import { useLabSettings, TemperatureLevel } from '../state/LabSettingsState'

const LABEL: Record<TemperatureLevel, string> = {
  cold:   '❄ Холодно',
  normal: 'Норма',
  warm:   '☀ Тепло',
  hot:    '🔥 Гаряче',
}

export function TemperatureButton() {
  const level = useLabSettings(s => s.temperatureLevel)
  const cycle = useLabSettings(s => s.cycleTemperature)
  return (
    <Button
      variant={level === 'normal' ? 'secondary' : 'primary'}
      onClick={() => cycle()}
      aria-label={`Температура: ${LABEL[level]}`}
      title={`Температура · ${LABEL[level]}`}
    >
      {LABEL[level]}
    </Button>
  )
}
