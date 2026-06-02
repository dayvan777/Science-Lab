import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment as DreiEnvironment, Loader } from '@react-three/drei'
import { ACESFilmicToneMapping } from 'three'
import { Tray } from './Tray'
import { PerchBody } from './PerchBody'
import { Scalpel } from './Scalpel'

export function PerchScene() {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(ellipse at 50% 40%, #123a42 0%, #0a212b 55%, #06121a 100%)' }}>
      <Canvas shadows dpr={[1, 2]} camera={{ position: [0.5, 2.2, 5.2], fov: 45 }} gl={{ toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1.05 }}>
        <Suspense fallback={null}>
          <Tray />
          <PerchBody />
          <Scalpel />
          <DreiEnvironment preset="city" environmentIntensity={0.35} />
        </Suspense>
        <OrbitControls makeDefault enableDamping target={[0, 0, 0]} autoRotate={false} minDistance={3} maxDistance={11} maxPolarAngle={Math.PI * 0.52} />
      </Canvas>
      <Loader />
    </div>
  )
}
