import { Button } from '../../../sdk/ui/Button'
import { useLabSettings } from '../state/LabSettingsState'

/**
 * Scene-2 toggle that reveals the (otherwise invisible) gas molecules
 * bombarding the pollen. While the molecules are still hidden the button
 * gently pulses to draw the student's attention to it (spec §16 risk
 * mitigation — kids might not realise the reveal is available). The pulse
 * is disabled under prefers-reduced-motion.
 */
export function ShowMoleculesToggle() {
  const showMolecules = useLabSettings(s => s.showMolecules)
  const toggle = useLabSettings(s => s.toggleMolecules)
  return (
    <>
      <style>{`
        @keyframes bdMoleculePulse {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 0 rgba(255, 200, 70, 0)); }
          50% { transform: scale(1.06); filter: drop-shadow(0 0 10px rgba(255, 200, 70, 0.6)); }
        }
        .bd-molecule-pulse { animation: bdMoleculePulse 1.6s ease-in-out infinite; display: inline-block; }
        @media (prefers-reduced-motion: reduce) {
          .bd-molecule-pulse { animation: none; }
        }
      `}</style>
      <div className={showMolecules ? undefined : 'bd-molecule-pulse'}>
        <Button
          variant={showMolecules ? 'primary' : 'secondary'}
          onClick={() => toggle()}
          aria-label={showMolecules ? 'Сховати молекули' : 'Показати причину'}
          title={showMolecules ? 'Сховати молекули' : 'Показати причину'}
        >
          {showMolecules ? '👁 Сховати молекули' : '✨ Показати причину'}
        </Button>
      </div>
    </>
  )
}
