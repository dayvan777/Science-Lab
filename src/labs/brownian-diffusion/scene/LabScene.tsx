import { useCallback, useEffect, useRef, useState } from 'react'
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
import { ShowMoleculesToggle } from '../ui/ShowMoleculesToggle'
import { PinchZoomController } from '../../../sdk/scene/PinchZoomController'
import { useViewport } from '../../../sdk/a11y/useViewport'
import { GlassBox, BOX_INTERIOR } from '../instruments/GlassBox'
import { PollenParticle } from '../instruments/PollenParticle'
import { PollenTrail } from '../instruments/PollenTrail'
import { ParticleField } from './ParticleField'
import { SceneController } from './SceneController'
import { Particle, PARTICLE_DEFAULTS, randomVelocity } from '../physics/particles'
import { useLabState } from '../state/LabState'
import { useLabSettings } from '../state/LabSettingsState'
import { useStepEngine } from '../../../sdk/guided/StepEngine'
import { findBodyByTag } from '../../../sdk/physics/bodyRegistry'

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

// Half-extent of the glass box in world units — pollen must be within
// this distance from BOX_WORLD centre on all three axes to count as "inside".
const BOX_HALF_EXTENT = 0.10

export function LabScene() {
  const idx = useLabState(s => s.currentSceneIndex)
  const sessionId = useLabState(s => s.sessionId)
  const { breakpoint } = useViewport()
  void breakpoint // wired in Slice 10
  const [ready, setReady] = useState(false)
  const preset: CameraPreset = sceneToPreset(idx)
  const particlesRef = useRef<Particle[]>(makeInitialParticles())

  // showMolecules: read from lab settings to drive ParticleField visibility.
  const showMolecules = useLabSettings(s => s.showMolecules)

  // advanceStep: mirrors EM's SceneController exactly — same hook, same call.
  const advanceStep = useStepEngine(s => s.advanceStep)

  // Pollen dwell tracking for the pollen-observed motion trigger.
  const pollenDwellRef = useRef(0)
  const pollenObservedFiredRef = useRef(false)

  useEffect(() => {
    particlesRef.current = makeInitialParticles()
  }, [sessionId])

  // Reset pollen-dwell state whenever the scene or step changes.
  const currentStepIdx = useStepEngine(s => s.currentStepIndex)
  useEffect(() => {
    pollenDwellRef.current = 0
    pollenObservedFiredRef.current = false
  }, [idx, currentStepIdx])

  // onTick: called by SceneController each frame after the physics step.
  // Mirrors EM's in-useFrame motion-trigger pattern, but extracted as a
  // callback so it can reference React state without being inside useFrame.
  const onTick = useCallback((dt: number) => {
    if (idx !== 1) return
    if (pollenObservedFiredRef.current) return
    const body = findBodyByTag('pollen')
    if (!body) return
    const t = body.translation()
    const localX = t.x - BOX_WORLD[0]
    const localY = t.y - BOX_WORLD[1]
    const localZ = t.z - BOX_WORLD[2]
    const inside =
      Math.abs(localX) < BOX_HALF_EXTENT &&
      Math.abs(localY) < BOX_HALF_EXTENT &&
      Math.abs(localZ) < BOX_HALF_EXTENT
    if (inside) {
      pollenDwellRef.current += dt
    } else {
      pollenDwellRef.current = 0
    }
    if (pollenDwellRef.current >= 4.0) {
      pollenObservedFiredRef.current = true
      advanceStep()
    }
  }, [idx, advanceStep])

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
          <ParticleField
            particles={particlesRef}
            capacity={60}
            position={BOX_WORLD}
            isVisible={(_p) => idx !== 1 || showMolecules}
          />
          <SceneController
            particles={particlesRef}
            walls={BOX_INTERIOR}
            onTick={onTick}
          />
          {idx === 1 && (
            <>
              <PollenParticle trayPosition={POLLEN_TRAY_WORLD} enabled={true} />
              <PollenTrail enabled={true} />
            </>
          )}
        </Physics>
        <PostFX />
      </Canvas>
      <LoadingScreen done={ready} />
      <HUD />
      {idx === 1 && (
        <div style={{ position: 'fixed', bottom: 80, right: 16, zIndex: 10 }}>
          <ShowMoleculesToggle />
        </div>
      )}
    </>
  )
}
