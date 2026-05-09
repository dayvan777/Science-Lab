import { useEffect } from 'react'
import { sound } from '../../sdk/audio/SoundManager'
import { LabScene } from './scene/LabScene'
import { useLabState } from './state/LabState'
import { IntroScreen } from './ui/IntroScreen'
import { RevealScene } from './ui/RevealScene'

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

export function MassMeasurementLab() {
  const phase = useLabState(s => s.phase)

  useEffect(() => {
    if (phase !== 'in-progress') return
    sound.preload(SOUND_CATALOG)
  }, [phase])

  if (phase === 'intro') return <IntroScreen />
  if (phase === 'finished') return <RevealScene />
  return <LabScene />
}
