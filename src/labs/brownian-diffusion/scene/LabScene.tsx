import { useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { ACESFilmicToneMapping } from 'three'
import { Environment } from '@react-three/drei'
import { CinematicLighting } from '../../../sdk/scene/CinematicLighting'
import { CameraRig } from '../../../sdk/scene/CameraRig'
import type { CameraPreset } from '../../../sdk/scene/CameraRig'
import { PostFX } from '../../../sdk/scene/PostFX'
import { Table } from '../../../sdk/scene/Table'
import { CANVAS_BASE_STYLE } from '../../../sdk/scene/canvasStyle'
import { LoadingScreen } from '../../../sdk/ui/LoadingScreen'
import { HUD } from '../ui/HUD'
import { PinchZoomController } from '../../../sdk/scene/PinchZoomController'
import { useViewport } from '../../../sdk/a11y/useViewport'
import { GlassBox, BOX_INTERIOR } from '../instruments/GlassBox'
import { PollenParticle } from '../instruments/PollenParticle'
import { ParticleField } from './ParticleField'
import { SceneController } from './SceneController'
import { Particle, PARTICLE_DEFAULTS, randomVelocity } from '../physics/particles'
import { useLabState } from '../state/LabState'

const BOX_WORLD: [number, number, number] = [0, 0.95, 0]
const POLLEN_TRAY_WORLD: [number, number, number] = [-0.40, 0.94, 0.30]

function makeInitialParticles(): Particle[] {
  const out: Particle[] = []
  const HALF = 0.09
  for (let i = 0; i < 60; i++) {
    const kind: 'red' | 'blue' = i < 30 ? 'red' : 'blue'
    const def = PARTICLE_DEFAULTS[kind]
    out.push({
      kind,
      pos: {
        x: (Math.random() - 0.5) * 2 * HALF,
        y: (Math.random() - 0.5) * 2 * HALF,
        z: (Math.random() - 0.5) * 2 * HALF,
      },
      vel: randomVelocity(0.3),
      mass: def.mass,
      radius: def.radius,
    })
  }
  return out
}

function sceneToPreset(idx: number): CameraPreset {
  // Slice 3: every scene uses focus-coil placeholder; Slice 10 wires per-scene presets.
  return idx === 0 ? 'overview' : 'focus-coil'
}

export function LabScene() {
  const idx = useLabState(s => s.currentSceneIndex)
  const sessionId = useLabState(s => s.sessionId)
  const { breakpoint } = useViewport()
  void breakpoint // wired in Slice 10
  const [ready, setReady] = useState(false)
  const preset: CameraPreset = sceneToPreset(idx)
  const particlesRef = useRef<Particle[]>(makeInitialParticles())

  useEffect(() => {
    particlesRef.current = makeInitialParticles()
  }, [sessionId])

  return (
    <>
      <Canvas
        camera={{ position: [0, 1.5, 2.0], fov: 50 }}
        dpr={[1, 1.5]}
        shadows
        gl={{ toneMapping: ACESFilmicToneMapping, toneMappingExposure: 0.55 }}
        style={{ ...CANVAS_BASE_STYLE, background: 'radial-gradient(ellipse at center, #2a2a30 0%, #1a1a1e 50%, #0a0a0c 100%)' }}
        onCreated={() => setReady(true)}
      >
        <CinematicLighting />
        <CameraRig preset={preset} />
        <PinchZoomController />
        <Environment preset="studio" background={false} resolution={64} />
        <Physics key={sessionId} gravity={[0, -9.81, 0]} timeStep={1 / 60}>
          <Table />
          <GlassBox position={BOX_WORLD} />
          <ParticleField particles={particlesRef} capacity={60} position={BOX_WORLD} />
          <SceneController particles={particlesRef} walls={BOX_INTERIOR} />
          {idx === 1 && (
            <PollenParticle trayPosition={POLLEN_TRAY_WORLD} enabled={true} />
          )}
        </Physics>
        <PostFX />
      </Canvas>
      <LoadingScreen done={ready} />
      <HUD />
    </>
  )
}
