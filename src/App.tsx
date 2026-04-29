import { useLabState } from './lab/LabState'
import { IntroScreen } from './lab/IntroScreen'
import { LabScene } from './scene/LabScene'
import { SummaryScreen } from './lab/SummaryScreen'

export default function App() {
  const phase = useLabState(s => s.phase)
  if (phase === 'intro') return <IntroScreen />
  if (phase === 'finished') return <SummaryScreen />
  return <LabScene />
}
