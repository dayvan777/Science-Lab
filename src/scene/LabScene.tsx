import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { Lighting } from './Lighting'
import { CameraRig, CameraPreset } from './CameraRig'
import { Table } from './Table'
import { TennisBall } from './objects/TennisBall'
import { Apple } from './objects/Apple'
import { Baseball } from './objects/Baseball'
import { Button } from '../ui/Button'
import { HUD } from '../lab/HUD'
import { DigitalScale } from './instruments/DigitalScale'
import { Dynamometer } from './instruments/Dynamometer'
import { LeverBalance } from './instruments/LeverBalance'
import { Weights } from './objects/Weights'
import { useLabState } from '../lab/LabState'
import { tasks } from '../lab/tasks'
import { GuidedOverlay } from '../guided/GuidedOverlay'
import { useGuidance, SkipGuidanceToggle } from '../guided/SkipGuidanceToggle'

export function LabScene() {
  const [preset, setPreset] = useState<CameraPreset>('overview')
  const phase = useLabState(s => s.phase)
  const idx = useLabState(s => s.currentTaskIndex)
  const resetKey = useLabState(s => s.sessionId)
  const activeInstrument = phase === 'in-progress' ? tasks[idx]?.instrumentId : null
  const currentTask = phase === 'in-progress' ? tasks[idx] : null
  const activeObjectId = currentTask?.objectId ?? null
  const guidanceOn = useGuidance(s => s.enabled)

  return (
    <>
      <Canvas
        camera={{ position: [0, 1.4, 1.5], fov: 45 }}
        dpr={[1, 1.5]}
        style={{ position: 'fixed', inset: 0, background: '#2a2a2a' }}
      >
        <Lighting />
        <CameraRig preset={preset} />
        <Physics key={resetKey} gravity={[0, -9.81, 0]} timeStep={1/60}>
          <Table />
          {/* Objects spread across left zone — clear of instruments */}
          <TennisBall position={[-1.05, 1.0, -0.20]}
            active={activeObjectId === 'tennis-ball'}
            dimmed={activeObjectId !== null && activeObjectId !== 'tennis-ball'}
          />
          <Apple position={[-1.05, 1.0, 0]}
            active={activeObjectId === 'apple'}
            dimmed={activeObjectId !== null && activeObjectId !== 'apple'}
          />
          <Baseball position={[-1.05, 1.0, 0.20]}
            active={activeObjectId === 'baseball'}
            dimmed={activeObjectId !== null && activeObjectId !== 'baseball'}
          />
          {/* Instruments spread across the table, away from object spawn */}
          <Dynamometer position={[-0.55, 0.85, 0]} active={activeInstrument === 'dynamometer'}
            dimmed={activeInstrument !== null && activeInstrument !== 'dynamometer'}
          />
          <LeverBalance position={[0.05, 0.85, 0]} active={activeInstrument === 'lever-balance'}
            dimmed={activeInstrument !== null && activeInstrument !== 'lever-balance'}
          />
          <DigitalScale position={[0.75, 0.85, 0]} active={activeInstrument === 'digital-scale'}
            dimmed={activeInstrument !== null && activeInstrument !== 'digital-scale'}
          />
          {/* Weights in front of lever balance for easy reach */}
          <Weights startPosition={[0.05, 0.86, 0.4]} />
          {guidanceOn && <GuidedOverlay />}
        </Physics>
      </Canvas>
      <HUD />
      <SkipGuidanceToggle />
      <div style={{ position: 'fixed', bottom: 16, right: 16, display: 'flex', gap: 8, zIndex: 10 }}>
        <Button variant="secondary" onClick={() => setPreset('overview')}>Скинути</Button>
        <Button variant="secondary" onClick={() => setPreset('digital-scale')}>Наблизити</Button>
      </div>
    </>
  )
}
