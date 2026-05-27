import { Button } from '../../../sdk/ui/Button'
import { useLabSettings } from '../state/LabSettingsState'

export function ShowMoleculesToggle() {
  const showMolecules = useLabSettings(s => s.showMolecules)
  const toggle = useLabSettings(s => s.toggleMolecules)
  return (
    <Button
      variant={showMolecules ? 'primary' : 'secondary'}
      onClick={() => toggle()}
      aria-label={showMolecules ? 'Сховати молекули' : 'Показати причину'}
      title={showMolecules ? 'Сховати молекули' : 'Показати причину'}
    >
      {showMolecules ? '👁 Сховати молекули' : '✨ Показати причину'}
    </Button>
  )
}
