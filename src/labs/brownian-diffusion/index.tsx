import { useNavigate } from 'react-router-dom'
import { LabScene } from './scene/LabScene'
import { useLabState } from './state/LabState'
import { IntroScreen } from './ui/IntroScreen'
import { RevealScene } from './ui/RevealScene'
import { isWebGLAvailable } from '../../sdk/scene/webgl'
import { WebGLUnsupported } from '../../sdk/ui/WebGLUnsupported'

export const brownianDiffusionLabDefinition = {
  id: 'brownian-diffusion',
  title: 'Броунівський рух та дифузія',
}

export function BrownianDiffusionLab() {
  const phase = useLabState(s => s.phase)
  const navigate = useNavigate()
  const webglOk = isWebGLAvailable()

  return (
    <>
      {phase === 'intro' && <IntroScreen />}
      {phase === 'finished' && <RevealScene />}
      {phase === 'in-progress' && (webglOk
        ? <LabScene />
        : <WebGLUnsupported onHome={() => navigate('/')} />
      )}
    </>
  )
}
