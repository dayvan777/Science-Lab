import { useNavigate } from 'react-router-dom'
import { ParameciumScene } from './scene/ParameciumScene'
import { useParameciumState } from './state/ParameciumState'
import { IntroScreen } from './ui/IntroScreen'
import { isWebGLAvailable } from '../../sdk/scene/webgl'
import { WebGLUnsupported } from '../../sdk/ui/WebGLUnsupported'

export const parameciumLabDefinition = {
  id: 'paramecium',
  title: 'Інфузорія-туфелька',
}

export function ParameciumLab() {
  const phase = useParameciumState(s => s.phase)
  const navigate = useNavigate()
  const webglOk = isWebGLAvailable()

  return (
    <>
      {phase === 'intro' && <IntroScreen />}
      {phase === 'in-progress' && (webglOk
        ? <ParameciumScene />
        : <WebGLUnsupported onHome={() => navigate('/')} />
      )}
    </>
  )
}
