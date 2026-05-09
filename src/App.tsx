import { useLabState } from './labs/mass-measurement/state/LabState'
import { IntroScreen } from './labs/mass-measurement/ui/IntroScreen'
import { LabScene } from './scene/LabScene'
import { SummaryScreen } from './labs/mass-measurement/ui/SummaryScreen'

export default function App() {
  const phase = useLabState(s => s.phase)
  if (phase === 'intro') return <IntroScreen />
  if (phase === 'finished') return <SummaryScreen />
  return <LabScene />
}
