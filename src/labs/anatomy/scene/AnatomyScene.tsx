import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment, ContactShadows, Loader, useGLTF } from '@react-three/drei'
import { ACESFilmicToneMapping } from 'three'
import { Body } from './Body'
import { Organ } from './Organ'
import { Kidneys } from './Kidneys'
import { ORGANS, getOrgan } from '../content/organs'
import { useAnatomyState } from '../state/AnatomyState'
import { HUD } from '../ui/HUD'

const kidneys = getOrgan('kidneys')

export function AnatomyScene() {
  const deselect = useAnatomyState(s => s.deselect)
  const selectedId = useAnatomyState(s => s.selectedOrganId)

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'radial-gradient(ellipse at 50% 42%, #2a2d34 0%, #16171c 55%, #0a0a0c 100%)',
    }}>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [0, 0.45, 2.55], fov: 42 }}
        gl={{ toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
        onPointerMissed={() => deselect()}
      >
        <ambientLight intensity={0.35} />
        <directionalLight
          position={[4, 6, 5]} intensity={1.5} castShadow
          shadow-mapSize-width={1024} shadow-mapSize-height={1024}
        />
        <directionalLight position={[-5, 3, -3]} intensity={0.5} color="#bcd3ff" />
        <Suspense fallback={null}>
          <group>
            <Body url="/models/body-skin.glb" />
            {ORGANS.filter(o => o.id !== 'kidneys').map(o => (
              <Organ key={o.id} id={o.id} url={o.file} color={o.color} />
            ))}
            <Kidneys url={kidneys.file} color={kidneys.color} />
          </group>
          <Environment preset="studio" environmentIntensity={0.6} />
        </Suspense>
        <ContactShadows position={[0, -0.93, 0]} opacity={0.4} blur={2.6} scale={3} far={2} />
        <OrbitControls
          makeDefault
          enableDamping
          target={[0, 0.45, 0]}
          autoRotate={selectedId === null}
          autoRotateSpeed={0.4}
          minDistance={0.8}
          maxDistance={6}
        />
      </Canvas>
      <HUD />
      <Loader />
    </div>
  )
}

ORGANS.forEach(o => useGLTF.preload(o.file))
useGLTF.preload('/models/body-skin.glb')
