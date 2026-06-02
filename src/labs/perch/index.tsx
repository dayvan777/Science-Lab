import { useNavigate } from 'react-router-dom'
import { PerchScene } from './scene/PerchScene'
import { usePerchState } from './state/PerchState'
import { IntroScreen } from './ui/IntroScreen'
import { isWebGLAvailable } from '../../sdk/scene/webgl'
import { WebGLUnsupported } from '../../sdk/ui/WebGLUnsupported'

export const perchLabDefinition = {
  id: 'perch',
  title: 'Будова річкового окуня',
}

export function PerchLab() {
  const phase = usePerchState(s => s.phase)
  const navigate = useNavigate()
  const webglOk = isWebGLAvailable()
  return (
    <>
      {phase === 'intro' && <IntroScreen />}
      {phase !== 'intro' && (webglOk ? <PerchScene /> : <WebGLUnsupported onHome={() => navigate('/')} />)}
    </>
  )
}
