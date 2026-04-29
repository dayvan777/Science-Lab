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
import { DigitalScale } from './instruments/DigitalScale'

export function LabScene() {
  const [preset, setPreset] = useState<CameraPreset>('overview')

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
          <DigitalScale position={[0.6, 0.85, 0]} />
        </Physics>
      </Canvas>
      <div style={{ position: 'fixed', bottom: 16, right: 16, display: 'flex', gap: 8, zIndex: 10 }}>
        <Button variant="secondary" onClick={() => setPreset('overview')}>Скинути</Button>
        <Button variant="secondary" onClick={() => setPreset('digital-scale')}>Наблизити</Button>
      </div>
    </>
  )
}
