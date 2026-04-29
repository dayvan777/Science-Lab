import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Lighting } from './Lighting'
import { CameraRig, CameraPreset } from './CameraRig'
import { Button } from '../ui/Button'

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
        <mesh castShadow position={[0, 0.5, 0]}>
          <boxGeometry args={[0.3, 0.3, 0.3]} />
          <meshStandardMaterial color="orange" />
        </mesh>
        <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[5, 5]} />
          <meshStandardMaterial color="#404040" />
        </mesh>
      </Canvas>
      <div style={{ position: 'fixed', bottom: 16, right: 16, display: 'flex', gap: 8, zIndex: 10 }}>
        <Button variant="secondary" onClick={() => setPreset('overview')}>Скинути</Button>
        <Button variant="secondary" onClick={() => setPreset('digital-scale')}>Наблизити</Button>
      </div>
    </>
  )
}
