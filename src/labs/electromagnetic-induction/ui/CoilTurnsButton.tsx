import { Button } from '../../../sdk/ui/Button'
import { sound } from '../../../sdk/audio/SoundManager'
import { useLabSettings } from '../state/LabSettingsState'

/**
 * Bottom-right HUD pill that cycles the coil's turn count
 * (3 → 5 → 10 → 20). Plays a tick sound on every click. Reads + writes
 * the persisted `useLabSettings.coilTurns` field.
 */
export function CoilTurnsButton() {
  const coilTurns = useLabSettings((s) => s.coilTurns)
  const cycleCoilTurns = useLabSettings((s) => s.cycleCoilTurns)

  const handleClick = () => {
    sound.play('tick')
    cycleCoilTurns()
  }

  const label = `Кількість витків котушки: ${coilTurns}`

  return (
    <Button
      variant="secondary"
      onClick={handleClick}
      aria-label={label}
      title={label}
    >
      {`Витки: ${coilTurns}`}
    </Button>
  )
}
