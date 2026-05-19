import { Button } from '../../../sdk/ui/Button'
import { sound } from '../../../sdk/audio/SoundManager'
import { useCameraStore } from '../../../sdk/scene/cameraStore'

/**
 * Bottom-right HUD pill, visible only when the user has manually focused
 * (on an instrument OR on an arbitrary table point). Tap to clear both
 * focus sources and return to the scene's default camera preset. Plays
 * a tick sound on click.
 */
export function FocusResetButton() {
  const focusTarget = useCameraStore(s => s.focusTarget)
  const freeFocusPoint = useCameraStore(s => s.freeFocusPoint)
  const setFocusTarget = useCameraStore(s => s.setFocusTarget)
  const setFreeFocusPoint = useCameraStore(s => s.setFreeFocusPoint)

  if (focusTarget === null && freeFocusPoint === null) return null

  const handleClick = () => {
    sound.play('tick')
    setFocusTarget(null)
    setFreeFocusPoint(null)
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
