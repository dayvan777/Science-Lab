import { useEffect, useMemo } from 'react'
import { sound } from '../../sdk/audio/SoundManager'
import { LabScene } from './scene/LabScene'
import { useLabState } from './state/LabState'
import { IntroScreen } from './ui/IntroScreen'
import { RevealScene } from './ui/RevealScene'
import { DemoController } from './demo/DemoController'
import { DemoBadge } from './demo/DemoBadge'

export const massMeasurementDefinition = {
  id: 'mass-measurement',
  title: 'Вимірювання маси тіл',
}

const SOUND_CATALOG = {
  tick: '/audio/sdk/tick.mp3',
  ding: '/audio/sdk/ding.mp3',
  whoosh: '/audio/sdk/whoosh.mp3',
  success: '/audio/sdk/success.mp3',
  error: '/audio/sdk/error.mp3',
} as const

/** True when the URL has `?demo=1` — kicks off the auto-walkthrough. */
function useDemoMode(): boolean {
  return useMemo(() => {
    if (typeof window === 'undefined') return false
    const params = new URLSearchParams(window.location.search)
    return params.get('demo') === '1'
  }, [])
}

export function MassMeasurementLab() {
  const phase = useLabState(s => s.phase)
  const demoMode = useDemoMode()

  useEffect(() => {
    if (phase !== 'in-progress') return
    sound.preload(SOUND_CATALOG)
  }, [phase])

  return (
    <>
      {/* DemoController stays mounted across phase transitions so it can
          auto-start the lab from the intro screen when ?demo=1 is set. */}
      <DemoController enabled={demoMode} />
      {demoMode && <DemoBadge />}
      {phase === 'intro' && <IntroScreen />}
      {phase === 'finished' && <RevealScene />}
      {phase === 'in-progress' && <LabScene />}
    </>
  )
}
