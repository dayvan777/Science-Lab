import { Suspense, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment, ContactShadows, Loader, useGLTF } from '@react-three/drei'
import { ACESFilmicToneMapping, DoubleSide, MeshStandardMaterial, Mesh, type Object3D } from 'three'

/**
 * ASSEMBLY-CALIBRATION SPIKE — not the final lab.
 *
 * Loads all 6 HRA Male GLBs (NIH 3D, CC-BY, Visible Human Male) in ONE group
 * WITHOUT re-centering, proving they auto-register into an anatomically correct
 * body, with the skin rendered as a semi-transparent shell. Validates the visual
 * of the "translucent body + organs inside" design before the full spec. Route:
 * /biology/spike.
 */

const ORGANS = [
  { url: '/models/brain.glb', color: '#d9b6ac' },
  { url: '/models/heart.glb', color: '#c0392b' },
  { url: '/models/lungs.glb', color: '#e3909e' },
  { url: '/models/liver.glb', color: '#7c4a3a' },
  { url: '/models/kidney.glb', color: '#b35f4c' },
] as const

function Organ({ url, color }: { url: string; color: string }) {
  const { scene } = useGLTF(url)
  useMemo(() => {
    scene.traverse((o: Object3D) => {
      const m = o as Mesh
      if (m.isMesh) {
        m.material = new MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.05 })
        m.castShadow = true
      }
    })
  }, [scene, color])
  return <primitive object={scene} />
}

function Body({ url }: { url: string }) {
  const { scene } = useGLTF(url)
  useMemo(() => {
    scene.traverse((o: Object3D) => {
      const m = o as Mesh
      if (m.isMesh) {
        m.material = new MeshStandardMaterial({
          color: '#9fc6e0',
          transparent: true,
          opacity: 0.13,
          roughness: 0.3,
          metalness: 0,
          side: DoubleSide,
          depthWrite: false,
        })
        m.renderOrder = 3
      }
    })
  }, [scene])
  return <primitive object={scene} />
}

export function AnatomySpike() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'radial-gradient(ellipse at 50% 42%, #2a2d34 0%, #16171c 55%, #0a0a0c 100%)',
      }}
    >
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [0, 0.4, 2.6], fov: 42 }}
        gl={{ toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
      >
        <ambientLight intensity={0.35} />
        <directionalLight
          position={[4, 6, 5]}
          intensity={1.5}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <directionalLight position={[-5, 3, -3]} intensity={0.5} color="#bcd3ff" />
        <Suspense fallback={null}>
          <group>
            <Body url="/models/body-skin.glb" />
            {ORGANS.map((o) => (
              <Organ key={o.url} url={o.url} color={o.color} />
            ))}
          </group>
          <Environment preset="studio" environmentIntensity={0.6} />
        </Suspense>
        <ContactShadows position={[0, -0.93, 0]} opacity={0.4} blur={2.6} scale={3} far={2} />
        <OrbitControls
          makeDefault
          enableDamping
          target={[0, 0.4, 0]}
          autoRotate
          autoRotateSpeed={0.6}
          minDistance={0.8}
          maxDistance={6}
        />
      </Canvas>

      <div
        style={{
          position: 'fixed',
          top: 18,
          left: 18,
          maxWidth: 400,
          color: '#ECECF1',
          fontFamily: 'Inter, system-ui, sans-serif',
          pointerEvents: 'none',
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 700 }}>Анатомія · збірка тіла + 5 органів</div>
        <div style={{ fontSize: 13, color: '#9AA3B2', marginTop: 5, lineHeight: 1.5 }}>
          Напівпрозоре тіло, органи самі стали на анатомічні місця (HRA, Visible Human Male). Це
          перевірка збірки — не фінальна лаба. Тягни — обертай, колесо — зум.
        </div>
      </div>

      <Loader />
    </div>
  )
}

ORGANS.forEach((o) => useGLTF.preload(o.url))
useGLTF.preload('/models/body-skin.glb')
