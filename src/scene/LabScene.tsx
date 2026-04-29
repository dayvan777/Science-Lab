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

export function LabScene() {
  const [preset, setPreset] = useState<CameraPreset>('overview')
  const phase = useLabState(s => s.phase)
  const idx = useLabState(s => s.currentTaskIndex)
  const activeInstrument = phase === 'in-progress' ? tasks[idx]?.instrumentId : null

  return (
    <>
      <Canvas
        camera={{ position: [0, 1.5, 2.0], fov: 50 }}
        shadows
        style={{ position: 'fixed', inset: 0, background: '#2a2a2a' }}
      >
        <Lighting />
        <CameraRig preset={preset} />
        <Physics gravity={[0, -9.81, 0]}>
          <Table />
          <TennisBall position={[-0.3, 1.2, 0]} />
          <Apple position={[0, 1.2, 0]} />
          <Baseball position={[0.3, 1.2, 0]} />
          <DigitalScale position={[0.6, 0.85, 0]} active={activeInstrument === 'digital-scale'} />
          <Dynamometer position={[-0.5, 0.85, 0]} active={activeInstrument === 'dynamometer'} />
          <LeverBalance position={[0, 0.85, 0]} active={activeInstrument === 'lever-balance'} />
          <Weights startPosition={[0.5, 0.86, 0.45]} />
        </Physics>
      </Canvas>
      <HUD />
      <div style={{ position: 'fixed', bottom: 16, right: 16, display: 'flex', gap: 8, zIndex: 10 }}>
        <Button variant="secondary" onClick={() => setPreset('overview')}>Скинути</Button>
        <Button variant="secondary" onClick={() => setPreset('digital-scale')}>Наблизити</Button>
      </div>
    </>
  )
}
