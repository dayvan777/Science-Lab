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
import { Button } from '../../../sdk/ui/Button'
import { SoundToggle } from '../../../sdk/ui/SoundToggle'
import { ZoomControls } from '../../../sdk/ui/ZoomControls'
import { BottomSheet } from '../../../sdk/ui/BottomSheet'
import { SheetTriggerButton } from '../../../sdk/ui/SheetTriggerButton'
import { SheetSection } from '../../../sdk/ui/SheetSection'
import { LoadingScreen } from '../../../sdk/ui/LoadingScreen'
import { safeAreaBottom } from '../../../sdk/a11y/safeArea'
import { HUD } from '../ui/HUD'
import { ShowMoleculesToggle } from '../ui/ShowMoleculesToggle'
import { TemperatureButton } from '../ui/TemperatureButton'
import { PinchZoomController } from '../../../sdk/scene/PinchZoomController'
import { useViewport } from '../../../sdk/a11y/useViewport'
import { GlassBox, BOX_INTERIOR } from '../instruments/GlassBox'
import { PollenParticle } from '../instruments/PollenParticle'
import { PollenTrail } from '../instruments/PollenTrail'
import { Divider } from '../instruments/Divider'
import { Beaker, beakerWalls } from '../instruments/Beaker'
import { InkDropper } from '../instruments/InkDropper'
import { spawnInk } from '../physics/spawnInk'
import { SolidBlocks } from '../instruments/SolidBlocks'
import { TimeLapseSlider } from '../ui/TimeLapseSlider'
import { ParticleField } from './ParticleField'
import { SceneController } from './SceneController'
import { Particle, PARTICLE_DEFAULTS, randomVelocity } from '../physics/particles'
import { useLabState } from '../state/LabState'
import { useLabSettings } from '../state/LabSettingsState'
import type { TemperatureLevel } from '../state/LabSettingsState'
import { useStepEngine } from '../../../sdk/guided/StepEngine'
import { findBodyByTag } from '../../../sdk/physics/bodyRegistry'
import { dividerStateAt, fractionMixed } from '../physics/divider'

const T_VELOCITY_SCALE: Record<TemperatureLevel, number> = {
  cold:   0.5,
  normal: 1.0,
  warm:   1.5,
  hot:    2.5,
}

const BOX_WORLD: [number, number, number] = [0, 0.95, 0]
const POLLEN_TRAY_WORLD: [number, number, number] = [-0.40, 0.94, 0.30]
const BEAKER_WORLD: [number, number, number] = [0.40, 0.85, 0]
const INK_TRAY_WORLD: [number, number, number] = [0.40, 0.94, 0.30]
const SOLID_BLOCKS_WORLD: [number, number, number] = [-0.40, 0.86, 0]

function makeInitialParticles(mode: 'mixed' | 'segregated' = 'mixed'): Particle[] {
  const out: Particle[] = []
  const HALF = 0.09
  const total = mode === 'segregated' ? 80 : 60   // scenes 3/6 use 80, scene 1/2 use 60
  for (let i = 0; i < total; i++) {
    const kind: 'red' | 'blue' = i < total / 2 ? 'red' : 'blue'
    const def = PARTICLE_DEFAULTS[kind]
    let x: number
    if (mode === 'segregated') {
      // red on left (x < 0), blue on right (x > 0)
      x = kind === 'red'
        ? -0.04 - Math.random() * 0.05
        :  0.04 + Math.random() * 0.05
    } else {
      x = (Math.random() - 0.5) * 2 * HALF
    }
    out.push({
      kind,
      pos: {
        x,
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

function makeWaterParticles(): Particle[] {
  const out: Particle[] = []
  const def = PARTICLE_DEFAULTS.water
  for (let i = 0; i < 30; i++) {
    out.push({
      kind: 'water',
      pos: {
        x: (Math.random() - 0.5) * 0.08,
        y: -0.04 + Math.random() * 0.07,
        z: (Math.random() - 0.5) * 0.08,
      },
      vel: randomVelocity(0.05),
      mass: def.mass,
      radius: def.radius,
    })
  }
  return out
}

function sceneToPreset(idx: number): CameraPreset {
  switch (idx) {
    case 0: return 'overview'      // mol theory — overview intro
    case 1: return 'focus-box'     // brownian
    case 2: return 'focus-box'     // gas
    case 3: return 'focus-beaker'  // liquid
    case 4: return 'focus-solids'  // solid
    case 5: return 'focus-box'     // temperature (back to box)
    default: return 'overview'
  }
}

// Half-extent of the glass box in world units — pollen must be within
// this distance from BOX_WORLD centre on all three axes to count as "inside".
const BOX_HALF_EXTENT = 0.10

export function LabScene() {
  const idx = useLabState(s => s.currentSceneIndex)
  const sessionId = useLabState(s => s.sessionId)
  const respawnObjects = useLabState(s => s.respawnObjects)
  const { breakpoint } = useViewport()
  const isMobile = breakpoint === 'phone' || breakpoint === 'tablet'
  const [sheetOpen, setSheetOpen] = useState(false)
  const [ready, setReady] = useState(false)
  const preset: CameraPreset = sceneToPreset(idx)
  const particlesRef = useRef<Particle[]>(makeInitialParticles())

  // showMolecules: read from lab settings to drive ParticleField visibility.
  const showMolecules = useLabSettings(s => s.showMolecules)

  // temperatureLevel: drives velocityMultiplier for scene 6.
  const temperatureLevel = useLabSettings(s => s.temperatureLevel)
  const velocityMultiplier = idx === 5 ? T_VELOCITY_SCALE[temperatureLevel] : 1.0

  // advanceStep: mirrors EM's SceneController exactly — same hook, same call.
  const advanceStep = useStepEngine(s => s.advanceStep)

  // Pollen dwell tracking for the pollen-observed motion trigger.
  const pollenDwellRef = useRef(0)
  const pollenObservedFiredRef = useRef(false)

  // Scene 3: divider handle Y and gases-mixed trigger state.
  const dividerHandleY = useRef(BOX_WORLD[1] - 0.10)  // start fully closed (handle at box base)
  const gasesMixedFiredRef = useRef(false)

  // Scene 4: ink spawned + liquid-mixed trigger state.
  const inkSpawnedRef = useRef(false)
  const liquidMixedFiredRef = useRef(false)

  // Scene 5: time-lapse-reached trigger state.
  const timeLapseFiredRef = useRef(false)

  // Scene 6: temp-reached-hot trigger state.
  const tempReachedHotRef = useRef(false)

  useEffect(() => {
    particlesRef.current = makeInitialParticles()
  }, [sessionId])

  // Reset pollen-dwell state whenever the scene or step changes.
  // On entry to scene 3 (idx === 2), re-seed particles in segregated mode + reset divider.
  const currentStepIdx = useStepEngine(s => s.currentStepIndex)
  useEffect(() => {
    pollenDwellRef.current = 0
    pollenObservedFiredRef.current = false
    if (idx === 2) {
      particlesRef.current = makeInitialParticles('segregated')
      dividerHandleY.current = BOX_WORLD[1] - 0.10
      gasesMixedFiredRef.current = false
    }
    if (idx === 3) {
      particlesRef.current = makeWaterParticles()
      inkSpawnedRef.current = false
      liquidMixedFiredRef.current = false
    }
    if (idx === 4) {
      particlesRef.current = []   // scene 5 has no kinetic particles
      timeLapseFiredRef.current = false
    }
    if (idx === 5) {
      particlesRef.current = makeInitialParticles('mixed')
      tempReachedHotRef.current = false
    }
  }, [idx, currentStepIdx])

  // getDivider: returns the current DividerState for scene 3, or null for all other scenes.
  // Called each frame by SceneController so the kinetic engine respects the divider wall.
  const getDivider = useCallback(() => {
    if (idx !== 2) return null
    const body = findBodyByTag('divider')
    if (body) dividerHandleY.current = body.translation().y
    return dividerStateAt(dividerHandleY.current - BOX_WORLD[1])
  }, [idx])

  // onTick: called by SceneController each frame after the physics step.
  // Mirrors EM's in-useFrame motion-trigger pattern, but extracted as a
  // callback so it can reference React state without being inside useFrame.
  const onTick = useCallback((dt: number) => {
    // Scene 2 (idx 1): pollen-observed trigger.
    if (idx === 1) {
      if (!pollenObservedFiredRef.current) {
        const body = findBodyByTag('pollen')
        if (body) {
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
        }
      }
    }

    // Scene 3 (idx 2): gases-mixed trigger.
    if (idx === 2 && !gasesMixedFiredRef.current) {
      const f = fractionMixed(particlesRef.current)
      if (f >= 0.6) {
        gasesMixedFiredRef.current = true
        advanceStep()
      }
    }

    // Scene 4 (idx 3): liquid-mixed-partial trigger.
    if (idx === 3 && inkSpawnedRef.current && !liquidMixedFiredRef.current) {
      const inkPs = particlesRef.current.filter(p => p.kind === 'ink')
      if (inkPs.length > 0) {
        const aboveQuarter = inkPs.filter(p => p.pos.y > -0.05).length
        if (aboveQuarter / inkPs.length > 0.5) {
          liquidMixedFiredRef.current = true
          advanceStep()
        }
      }
    }

    // Scene 5 (idx 4): time-lapse-reached trigger.
    if (idx === 4 && !timeLapseFiredRef.current) {
      const y = useLabSettings.getState().timeLapseYears
      if (y >= 100) {
        timeLapseFiredRef.current = true
        advanceStep()
      }
    }

    // Scene 6 (idx 5): temp-reached-hot trigger.
    if (idx === 5 && !tempReachedHotRef.current) {
      const level = useLabSettings.getState().temperatureLevel
      if (level === 'hot') {
        tempReachedHotRef.current = true
        advanceStep()
      }
    }
  }, [idx, advanceStep])

  const currentWalls = idx === 3 ? beakerWalls(BEAKER_WORLD) : BOX_INTERIOR
  const liquidDrag = idx === 3 ? 1.2 : 0

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
          <GlassBox position={BOX_WORLD} openTop={idx === 1} />
          <ParticleField
            particles={particlesRef}
            capacity={120}
            position={idx === 3 ? BEAKER_WORLD : BOX_WORLD}
            isVisible={(_p) => idx !== 1 || showMolecules}
          />
          <SceneController
            particles={particlesRef}
            walls={currentWalls}
            getDivider={getDivider}
            onTick={onTick}
            liquidDrag={liquidDrag}
            velocityMultiplier={velocityMultiplier}
          />
          {idx === 1 && (
            <>
              <PollenParticle trayPosition={POLLEN_TRAY_WORLD} enabled={true} />
              <PollenTrail enabled={true} />
            </>
          )}
          {idx === 2 && (
            <Divider
              boxCentre={BOX_WORLD}
              enabled={true}
            />
          )}
          {idx === 3 && (
            <>
              <Beaker position={BEAKER_WORLD} />
              <InkDropper
                trayPosition={INK_TRAY_WORLD}
                enabled={!inkSpawnedRef.current}
                onRelease={(worldPos) => {
                  const dx = worldPos.x - BEAKER_WORLD[0]
                  const dz = worldPos.z - BEAKER_WORLD[2]
                  const horizDist = Math.sqrt(dx * dx + dz * dz)
                  const beakerTop = BEAKER_WORLD[1] + 0.03
                  if (horizDist < 0.07 && worldPos.y > beakerTop) {
                    spawnInk(particlesRef.current, worldPos, BEAKER_WORLD, 30)
                    inkSpawnedRef.current = true
                  }
                }}
              />
            </>
          )}
          {idx === 4 && <SolidBlocks position={SOLID_BLOCKS_WORLD} />}
        </Physics>
        <PostFX />
      </Canvas>
      <LoadingScreen done={ready} />
      <HUD />
      {isMobile ? (
        <>
          <div
            style={{
              position: 'fixed',
              bottom: safeAreaBottom(16),
              right: 8,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              zIndex: 10,
            }}
          >
            <ZoomControls />
            <SheetTriggerButton onClick={() => setSheetOpen(true)} />
          </div>

          <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)}>
            {idx === 1 && (
              <SheetSection label="Показати молекули">
                <ShowMoleculesToggle />
              </SheetSection>
            )}
            {idx === 4 && (
              <SheetSection label="Час (роки)">
                <TimeLapseSlider />
              </SheetSection>
            )}
            {idx === 5 && (
              <SheetSection label="Температура">
                <TemperatureButton />
              </SheetSection>
            )}
            <SheetSection label="Звук">
              <SoundToggle />
            </SheetSection>
            <div style={{ marginTop: 8 }}>
              <Button
                variant="secondary"
                onClick={() => respawnObjects()}
                aria-label="Скинути предмети"
                title="Скинути предмети"
              >
                ↻ Скинути предмети
              </Button>
            </div>
          </BottomSheet>
        </>
      ) : (
        <div
          style={{
            position: 'fixed',
            bottom: safeAreaBottom(16),
            right: 16,
            display: 'flex',
            gap: 8,
            zIndex: 10,
          }}
        >
          <ZoomControls />
          <SoundToggle />
          {idx === 1 && <ShowMoleculesToggle />}
          {idx === 4 && <TimeLapseSlider />}
          {idx === 5 && <TemperatureButton />}
          <Button
            variant="secondary"
            onClick={() => respawnObjects()}
            aria-label="Скинути предмети"
            title="Скинути предмети"
          >
            ↻ Скинути предмети
          </Button>
        </div>
      )}
    </>
  )
}
