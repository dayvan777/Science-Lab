import { Button } from '../../../sdk/ui/Button'
import { sound } from '../../../sdk/audio/SoundManager'
import { useVisualState } from '../state/VisualState'

/**
 * Bottom-right HUD pill that toggles the visibility of the field lines
 * and current arrows. Plays a tick sound on every toggle. Reads + writes
 * the persisted `useVisualState.fieldVisible` flag.
 *
 * Icons: ⊟ when field is visible (suggests "collapse / hide"),
 *        ⊞ when hidden (suggests "expand / show"). Same convention as
 *        the existing CollapsibleGlassPanel.
 */
export function FieldToggleButton() {
  const fieldVisible = useVisualState((s) => s.fieldVisible)
  const setFieldVisible = useVisualState((s) => s.setFieldVisible)

  const handleClick = () => {
    sound.play('tick')
    setFieldVisible(!fieldVisible)
  }

  const label = fieldVisible ? 'Сховати магнітне поле' : 'Показати магнітне поле'

  return (
    <Button
      variant="secondary"
      onClick={handleClick}
      aria-label={label}
      title={label}
    >
      {fieldVisible ? '⊟ Поле' : '⊞ Поле'}
    </Button>
  )
}
