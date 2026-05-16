import { Button } from '../../../sdk/ui/Button'
import { sound } from '../../../sdk/audio/SoundManager'
import { useLabSettings, type MagnetStrength } from '../state/LabSettingsState'

const PILL_LABEL: Record<MagnetStrength, string> = {
  weak: 'Слаб.',
  normal: 'Звич.',
  strong: 'Сильн.',
}

const ARIA_LABEL: Record<MagnetStrength, string> = {
  weak: 'Слабкий магніт',
  normal: 'Звичайний магніт',
  strong: 'Сильний магніт',
}

/**
 * Bottom-right HUD pill that cycles the magnet's strength
 * (weak → normal → strong). Plays a tick sound on every click. Reads +
 * writes the persisted `useLabSettings.magnetStrength` field.
 */
export function MagnetStrengthButton() {
  const magnetStrength = useLabSettings((s) => s.magnetStrength)
  const cycleMagnetStrength = useLabSettings((s) => s.cycleMagnetStrength)

  const handleClick = () => {
    sound.play('tick')
    cycleMagnetStrength()
  }

  return (
    <Button
      variant="secondary"
      onClick={handleClick}
      aria-label={ARIA_LABEL[magnetStrength]}
      title={ARIA_LABEL[magnetStrength]}
    >
      {`Магніт: ${PILL_LABEL[magnetStrength]}`}
    </Button>
  )
}
