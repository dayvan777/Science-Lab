import { useLabState } from './lab/LabState'
import { IntroScreen } from './lab/IntroScreen'

export default function App() {
  const phase = useLabState(s => s.phase)
  if (phase === 'intro') return <IntroScreen />
  // LabScene and SummaryScreen wired in later tasks
  return <div style={{ padding: 32, color: '#fff' }}>Phase: {phase} (not yet wired)</div>
}
