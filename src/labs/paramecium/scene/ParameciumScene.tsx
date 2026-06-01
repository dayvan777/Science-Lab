import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment as DreiEnvironment, Loader } from '@react-three/drei'
import { ACESFilmicToneMapping } from 'three'
import { Environment } from './Environment'
import { Cell } from './Cell'
import { useParameciumState } from '../state/ParameciumState'
import { useReducedMotion } from '../../../sdk/a11y/useReducedMotion'
import { HUD } from '../ui/HUD'

export function ParameciumScene() {
  const viewMode = useParameciumState(s => s.viewMode)
  const reduced = useReducedMotion()
  const envMode = viewMode === 'environment'

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(ellipse at 50% 35%, #11383d 0%, #0a1c26 55%, #06121a 100%)' }}>
      <Canvas dpr={[1, 2]} camera={{ position: [0, 0.5, 5.5], fov: 45 }} gl={{ toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1.1 }}>
        <Suspense fallback={null}>
          <Environment />
          <Cell />
          <DreiEnvironment preset="city" environmentIntensity={0.4} />
        </Suspense>
        <OrbitControls
          makeDefault enableDamping target={[0, 0, 0]}
          autoRotate={envMode && !reduced} autoRotateSpeed={0.45}
          minDistance={2} maxDistance={11}
        />
      </Canvas>
      <HUD />
      <Loader />
    </div>
  )
}
