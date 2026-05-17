import { Button } from '../../../sdk/ui/Button'
import { sound } from '../../../sdk/audio/SoundManager'
import { useCameraStore } from '../../../sdk/scene/cameraStore'

/**
 * Bottom-right HUD pill, visible only when the user has manually focused
 * on an instrument. Tap to clear the focus and return to the scene's
 * default camera preset. Plays a tick sound on click.
 */
export function FocusResetButton() {
  const focusTarget = useCameraStore(s => s.focusTarget)
  const setFocusTarget = useCameraStore(s => s.setFocusTarget)

  if (focusTarget === null) return null

  const handleClick = () => {
    sound.play('tick')
    setFocusTarget(null)
  }

  const label = 'Загальний вигляд'

  return (
    <Button
      variant="secondary"
      onClick={handleClick}
      aria-label={label}
      title={label}
    >
      🌄 Все
    </Button>
  )
}
