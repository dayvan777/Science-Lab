import { useNavigate } from 'react-router-dom'
import { AnatomyScene } from './scene/AnatomyScene'
import { useAnatomyState } from './state/AnatomyState'
import { IntroScreen } from './ui/IntroScreen'
import { isWebGLAvailable } from '../../sdk/scene/webgl'
import { WebGLUnsupported } from '../../sdk/ui/WebGLUnsupported'

export const anatomyLabDefinition = {
  id: 'anatomy',
  title: 'Внутрішні органи людини',
}

export function AnatomyLab() {
  const phase = useAnatomyState(s => s.phase)
  const navigate = useNavigate()
  const webglOk = isWebGLAvailable()

  return (
    <>
      {phase === 'intro' && <IntroScreen />}
      {phase === 'in-progress' && (webglOk
        ? <AnatomyScene />
        : <WebGLUnsupported onHome={() => navigate('/')} />
      )}
    </>
  )
}
