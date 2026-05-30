import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment, useGLTF, Center, Bounds, ContactShadows } from '@react-three/drei'
import { ACESFilmicToneMapping } from 'three'

/**
 * QUALITY-CALIBRATION SPIKE — not the final lab.
 *
 * Loads a real Public-Domain heart GLB (NIH 3D, entry 3DPX-022787) in the live
 * R3F engine with proper lighting + environment + orbit, so we can judge the
 * ACTUAL achievable 3D quality (vs the flat HTML mockups). Route: /biology/heart.
 */
function HeartModel() {
  const { scene } = useGLTF('/models/heart.glb')
  return <primitive object={scene} />
}

export function HeartSlice() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'radial-gradient(ellipse at 50% 45%, #2a2a30 0%, #16171c 55%, #0a0a0c 100%)',
      }}
    >
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [0, 0.4, 4], fov: 40 }}
        gl={{ toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1.0 }}
      >
        <ambientLight intensity={0.35} />
        <directionalLight position={[4, 6, 4]} intensity={1.4} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
        <directionalLight position={[-4, 2, -2]} intensity={0.45} color="#bcd3ff" />
        <Suspense fallback={null}>
          <Bounds fit clip observe margin={1.25}>
            <Center>
              <HeartModel />
            </Center>
          </Bounds>
          <Environment preset="studio" environmentIntensity={0.7} />
        </Suspense>
        <ContactShadows position={[0, -1.4, 0]} opacity={0.45} blur={2.4} scale={6} far={3} />
        <OrbitControls makeDefault enableDamping autoRotate autoRotateSpeed={0.7} minDistance={1} maxDistance={9} />
      </Canvas>

      <div
        style={{
          position: 'fixed',
          top: 18,
          left: 18,
          maxWidth: 380,
          color: '#ECECF1',
          fontFamily: 'Inter, system-ui, sans-serif',
          pointerEvents: 'none',
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 700 }}>Серце · справжня 3D-модель</div>
        <div style={{ fontSize: 13, color: '#9AA3B2', marginTop: 5, lineHeight: 1.5 }}>
          Зріз для оцінки якості. Модель: NIH 3D (Public Domain). Тягни — обертай, колесо — зум.
          Це реальний рушій лаби, а не HTML-макет.
        </div>
      </div>
    </div>
  )
}

useGLTF.preload('/models/heart.glb')
