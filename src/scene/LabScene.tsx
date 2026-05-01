import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { Lighting } from './Lighting'
import { CameraRig, CameraPreset } from './CameraRig'
import { StudioBackdrop } from './StudioBackdrop'
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
// import { PostProcessing } from './PostProcessing'  // Disabled — too heavy for typical hardware. Re-enable in Task 29 (adaptive quality).

export function LabScene() {
  const [preset, setPreset] = useState<CameraPreset>('overview')
  const phase = useLabState(s => s.phase)
  const idx = useLabState(s => s.currentTaskIndex)
  const resetKey = useLabState(s => s.sessionId)
  const activeInstrument = phase === 'in-progress' ? tasks[idx]?.instrumentId : null

  return (
    <>
      <Canvas
        camera={{ position: [0, 1.5, 2.0], fov: 50 }}
        dpr={[1, 1.5]}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'linear-gradient(180deg, #fafafa 0%, #e8e8ed 50%, #cdcdd2 100%)',
        }}
      >
        <Lighting />
        <CameraRig preset={preset} />
        <Physics key={resetKey} gravity={[0, -9.81, 0]}>
          <StudioBackdrop />
          {/* Objects spawn in left zone — clear of instruments */}
          <TennisBall position={[-1.05, 0.1, 0]} />
          <Apple position={[-1.05, 0.1, 0.18]} />
          <Baseball position={[-1.05, 0.1, -0.18]} />
          {/* Instruments spread across the floor, away from object spawn */}
          <Dynamometer position={[-0.55, 0, 0]} active={activeInstrument === 'dynamometer'} />
          <LeverBalance position={[0.05, 0, 0]} active={activeInstrument === 'lever-balance'} />
          <DigitalScale position={[0.75, 0, 0]} active={activeInstrument === 'digital-scale'} />
          {/* Weights in front of lever balance for easy reach */}
          <Weights startPosition={[0.05, 0.01, 0.4]} />
        </Physics>
        {/* <PostProcessing /> — disabled for performance, re-enable per-device in Task 29 */}
      </Canvas>
      <HUD />
      <div style={{ position: 'fixed', bottom: 16, right: 16, display: 'flex', gap: 8, zIndex: 10 }}>
        <Button variant="secondary" onClick={() => setPreset('overview')}>Скинути</Button>
        <Button variant="secondary" onClick={() => setPreset('digital-scale')}>Наблизити</Button>
      </div>
    </>
  )
}
