import { LabScene } from './scene/LabScene'
import { useLabState } from './state/LabState'
import { IntroScreen } from './ui/IntroScreen'
import { SummaryScreen } from './ui/SummaryScreen'

export const massMeasurementDefinition = {
  id: 'mass-measurement',
  title: 'Вимірювання маси тіл',
}

export function MassMeasurementLab() {
  const phase = useLabState(s => s.phase)
  if (phase === 'intro') return <IntroScreen />
  if (phase === 'finished') return <SummaryScreen />
  return <LabScene />
}
