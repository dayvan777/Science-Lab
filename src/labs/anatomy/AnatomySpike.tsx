import { Suspense, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment, ContactShadows, Loader, useGLTF } from '@react-three/drei'
import { ACESFilmicToneMapping, DoubleSide, MeshPhysicalMaterial, Mesh, type Object3D } from 'three'

/**
 * ASSEMBLY-CALIBRATION SPIKE — not the final lab.
 *
 * Loads the 6 HRA Male GLBs (NIH 3D, CC-BY, Visible Human Male) in ONE group
 * WITHOUT re-centering, so they auto-register into an anatomically correct body.
 * The skin is a semi-transparent shell; the single (right) kidney is mirrored to
 * a pair. Validates the "translucent body + organs inside" visual before the full
 * spec. Route: /biology/spike.
 */

const ORGANS = [
  { url: '/models/brain.glb', color: '#cbb4ad' },
  { url: '/models/lungs.glb', color: '#cf8a92' },
  { url: '/models/heart.glb', color: '#a8392f' },
  { url: '/models/liver.glb', color: '#6f4034' },
] as const

const KIDNEY = { url: '/models/kidney.glb', color: '#9c5446' }

function paintOrgan(root: Object3D, color: string) {
  root.traverse((o: Object3D) => {
    const m = o as Mesh
    if (m.isMesh) {
      m.material = new MeshPhysicalMaterial({
        color,
        roughness: 0.55,
        metalness: 0,
        clearcoat: 0.35,
        clearcoatRoughness: 0.45,
      })
      m.castShadow = true
    }
  })
}

function Organ({ url, color }: { url: string; color: string }) {
  const { scene } = useGLTF(url)
  useMemo(() => paintOrgan(scene, color), [scene, color])
  return <primitive object={scene} />
}

/** Right kidney at its registered position + a mirrored copy → an anatomical pair. */
function KidneyPair({ url, color }: { url: string; color: string }) {
  const { scene } = useGLTF(url)
  const right = useMemo(() => {
    const s = scene.clone(true)
    paintOrgan(s, color)
    return s
  }, [scene, color])
  const left = useMemo(() => {
    const s = scene.clone(true)
    paintOrgan(s, color)
    return s
  }, [scene, color])
  return (
    <>
      <primitive object={right} />
      <group scale={[-1, 1, 1]}>
        <primitive object={left} />
      </group>
    </>
  )
}

function Body({ url }: { url: string }) {
  const { scene } = useGLTF(url)
  useMemo(() => {
    scene.traverse((o: Object3D) => {
      const m = o as Mesh
      if (m.isMesh) {
        m.material = new MeshPhysicalMaterial({
          color: '#a8c2d4',
          transparent: true,
          opacity: 0.2,
          roughness: 0.35,
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
        camera={{ position: [0, 0.45, 2.55], fov: 42 }}
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
            <KidneyPair url={KIDNEY.url} color={KIDNEY.color} />
          </group>
          <Environment preset="studio" environmentIntensity={0.6} />
        </Suspense>
        <ContactShadows position={[0, -0.93, 0]} opacity={0.4} blur={2.6} scale={3} far={2} />
        <OrbitControls
          makeDefault
          enableDamping
          target={[0, 0.45, 0]}
          autoRotate
          autoRotateSpeed={0.45}
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
        <div style={{ fontSize: 18, fontWeight: 700 }}>Анатомія · збірка тіла + органи (v2)</div>
        <div style={{ fontSize: 13, color: '#9AA3B2', marginTop: 5, lineHeight: 1.5 }}>
          Пара нирок, вологі матеріали, тіло щільніше, старт із фронту. Органи стоять на
          анатомічних місцях (HRA, Visible Human Male). Тягни — обертай, колесо — зум.
        </div>
      </div>

      <Loader />
    </div>
  )
}

ORGANS.forEach((o) => useGLTF.preload(o.url))
useGLTF.preload(KIDNEY.url)
useGLTF.preload('/models/body-skin.glb')
