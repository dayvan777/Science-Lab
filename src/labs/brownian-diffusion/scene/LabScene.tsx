import { useCallback, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { ACESFilmicToneMapping } from 'three'
import { Environment } from '@react-three/drei'
import { CinematicLighting } from '../../../sdk/scene/CinematicLighting'
import { CameraRig } from '../../../sdk/scene/CameraRig'
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
import { PinchZoomController } from '../../../sdk/scene/PinchZoomController'
import { useViewport } from '../../../sdk/a11y/useViewport'
import { HUD } from '../ui/HUD'
import { ControlPanel } from '../ui/ControlPanel'
import { MixednessMeter } from '../ui/MixednessMeter'
import { GlassBox, BOX_INTERIOR, BOX_HALF } from '../instruments/GlassBox'
import { ParticleField } from './ParticleField'
import { LatticeField } from './LatticeField'
import { SceneController } from './SceneController'
import { Particle, PARTICLE_DEFAULTS, randomVelocity } from '../physics/particles'
import { spawnInk } from '../physics/spawnInk'
import { dividerStateAt, BOX_HALF_Y } from '../physics/divider'
import { mixedness } from '../physics/mixedness'
import { useLabState } from '../state/LabState'
import { useLabSettings, type MaterialState, type TemperatureLevel } from '../state/LabSettingsState'
import { useStepEngine } from '../../../sdk/guided/StepEngine'
import { SCENES, type BdStep } from '../content/scenes'
import { evaluateStepAdvance } from './stepAdvance'

const BOX_WORLD: [number, number, number] = [0, 0.95, 0]
const CAPACITY = 150

const T_VELOCITY_SCALE: Record<TemperatureLevel, number> = { cold: 0.5, normal: 1.0, warm: 1.5, hot: 2.5 }

// Per-mission scene setup. Index = mission (currentSceneIndex).
const MISSION_STATE:   MaterialState[] = ['gas', 'gas', 'gas', 'liquid', 'solid', 'gas', 'gas']
const MISSION_DIVIDER: boolean[]       = [true,  true,  false, true,     true,    true,  true]
const MISSION_SHOWMOL: boolean[]       = [true,  false, true,  true,     true,    true,  true]
const isSegregated = (idx: number) => idx === 2

function makeParticles(state: MaterialState, red: number, blue: number, segregated: boolean): Particle[] {
  if (state === 'solid') return []
  const out: Particle[] = []
  const H = 0.09
  if (state === 'liquid') {
    const def = PARTICLE_DEFAULTS.water
    for (let i = 0; i < 40; i++) {
      out.push({
        kind: 'water',
        pos: { x: (Math.random() - 0.5) * 2 * H, y: -0.02 + (Math.random() - 0.5) * 0.12, z: (Math.random() - 0.5) * 2 * H },
        vel: randomVelocity(0.05), mass: def.mass, radius: def.radius,
      })
    }
    return out
  }
  const total = red + blue
  for (let i = 0; i < total; i++) {
    const kind: 'red' | 'blue' = i < red ? 'red' : 'blue'
    const def = PARTICLE_DEFAULTS[kind]
    const x = segregated
      ? (kind === 'red' ? -0.02 - Math.random() * 0.06 : 0.02 + Math.random() * 0.06)
      : (Math.random() - 0.5) * 2 * H
    out.push({
      kind,
      pos: { x, y: (Math.random() - 0.5) * 2 * H, z: (Math.random() - 0.5) * 2 * H },
      vel: randomVelocity(0.3), mass: def.mass, radius: def.radius,
    })
  }
  return out
}

export function LabScene() {
  const idx = useLabState(s => s.currentSceneIndex)
  const sessionId = useLabState(s => s.sessionId)
  const respawnObjects = useLabState(s => s.respawnObjects)
  const advanceStep = useStepEngine(s => s.advanceStep)
  const { breakpoint } = useViewport()
  const isMobile = breakpoint === 'phone' || breakpoint === 'tablet'

  const materialState = useLabSettings(s => s.materialState)
  const showMolecules = useLabSettings(s => s.showMolecules)
  const dividerRaised = useLabSettings(s => s.dividerRaised)
  const tracerActive = useLabSettings(s => s.tracerActive)
  const redCount = useLabSettings(s => s.redCount)
  const blueCount = useLabSettings(s => s.blueCount)
  const temperatureLevel = useLabSettings(s => s.temperatureLevel)

  const [sheetOpen, setSheetOpen] = useState(false)
  const [ready, setReady] = useState(false)
  const [renderKey, setRenderKey] = useState(0)

  const particlesRef = useRef<Particle[]>(makeParticles('gas', 20, 20, false))
  const tracerStartRef = useRef<{ x: number; y: number; z: number } | null>(null)

  // Mission entry: apply the mission's intended state (this triggers the re-seed effect).
  useEffect(() => {
    const s = useLabSettings.getState()
    s.setMaterialState(MISSION_STATE[idx] ?? 'gas')
    s.setDividerRaised(MISSION_DIVIDER[idx] ?? true)
    s.setMolecules(MISSION_SHOWMOL[idx] ?? true)
    s.setTracerActive(false)
  }, [idx, sessionId])

  // Re-seed the box whenever the medium or molecule counts change.
  useEffect(() => {
    particlesRef.current = makeParticles(materialState, redCount, blueCount, isSegregated(idx) && materialState === 'gas')
    tracerStartRef.current = null
    setRenderKey(k => k + 1)
  }, [materialState, redCount, blueCount, sessionId, idx])

  // Add a tracer (gas: amber Brownian grain; liquid: ink drop) on the rising edge of tracerActive.
  useEffect(() => {
    if (!tracerActive || tracerStartRef.current) return
    if (materialState === 'gas') {
      const def = PARTICLE_DEFAULTS.pollen
      const start = { x: 0, y: 0.06, z: 0 }
      particlesRef.current.push({ kind: 'pollen', pos: { ...start }, vel: randomVelocity(0.3), mass: def.mass, radius: def.radius })
      tracerStartRef.current = start
      setRenderKey(k => k + 1)
    } else if (materialState === 'liquid') {
      spawnInk(particlesRef.current, { x: BOX_WORLD[0], y: BOX_WORLD[1] + 0.06, z: BOX_WORLD[2] }, BOX_WORLD, 30)
      tracerStartRef.current = { x: 0, y: 0.06, z: 0 } // sentinel: already spawned
      setRenderKey(k => k + 1)
    }
  }, [tracerActive, materialState])

  const getDivider = useCallback(
    () => (materialState === 'gas' && !dividerRaised ? dividerStateAt(-BOX_HALF_Y) : null),
    [materialState, dividerRaised],
  )

  const velocityMultiplier = materialState === 'solid' ? 1 : T_VELOCITY_SCALE[temperatureLevel]
  const liquidDrag = materialState === 'liquid' ? 1.2 : 0

  const onTick = useCallback(() => {
    const engine = useStepEngine.getState()
    const step = SCENES[idx]?.steps[engine.currentStepIndex] as BdStep | undefined

    // MC auto-advance (the only auto-advance).
    const { advance, consumeMC } = evaluateStepAdvance(step, engine, performance.now())
    if (advance) { advanceStep(); if (consumeMC) engine.setLastMCChoice(null) }

    const set = useLabSettings.getState()
    const lab = useLabState.getState()
    const mx = mixedness(set.materialState, particlesRef.current, set.timeLapseYears)
    if (Math.abs(mx - lab.mixedness) >= 0.01) lab.setMixedness(mx)

    // Goal detection — set goalReached (HUD shows «Далі»); never auto-advances.
    if (!step || step.complete.kind !== 'submitted' || !step.motionTrigger || lab.goalReached) return
    const tracerDisp = () => {
      const s0 = tracerStartRef.current
      const p = particlesRef.current.find(pp => pp.kind === 'pollen')
      if (!s0 || !p) return 0
      const dx = p.pos.x - s0.x, dy = p.pos.y - s0.y, dz = p.pos.z - s0.z
      return Math.sqrt(dx * dx + dy * dy + dz * dz)
    }
    let reached = false
    switch (step.motionTrigger) {
      case 'molecules-shown':   reached = set.showMolecules; break
      case 'tracer-jiggled':    reached = tracerDisp() >= 0.05; break
      case 'gas-mixed':         reached = set.dividerRaised && mx >= 0.98; break
      case 'liquid-mixed':      reached = set.materialState === 'liquid' && set.tracerActive && mx >= 0.5; break
      case 'timelapse-reached': reached = set.materialState === 'solid' && set.timeLapseYears >= 100; break
      case 'temp-hot':          reached = set.temperatureLevel === 'hot'; break
    }
    if (reached) lab.setGoalReached(true)
  }, [idx, advanceStep])

  const utilities = (
    <Button variant="secondary" onClick={() => respawnObjects()} aria-label="Скинути" title="Скинути">↻ Скинути</Button>
  )

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
        <CameraRig preset="focus-box" />
        <PinchZoomController />
        <Environment preset="studio" background={false} resolution={64} />
        <Physics key={sessionId} gravity={[0, -9.81, 0]} timeStep={1 / 60}>
          <Table />
          <GlassBox position={BOX_WORLD} />
          {materialState !== 'solid' && (
            <ParticleField
              key={renderKey}
              particles={particlesRef}
              capacity={CAPACITY}
              position={BOX_WORLD}
              isVisible={(p) => (p.kind === 'pollen' ? true : materialState === 'gas' ? showMolecules : true)}
            />
          )}
          {materialState === 'solid' && <LatticeField position={BOX_WORLD} />}
          {materialState === 'gas' && !dividerRaised && (
            <mesh position={BOX_WORLD}>
              <boxGeometry args={[0.004, 2 * BOX_HALF, 2 * BOX_HALF]} />
              <meshStandardMaterial color="#cfd6e0" transparent opacity={0.5} roughness={0.4} metalness={0.3} />
            </mesh>
          )}
          <SceneController
            particles={particlesRef}
            walls={BOX_INTERIOR}
            getDivider={getDivider}
            onTick={onTick}
            liquidDrag={liquidDrag}
            velocityMultiplier={velocityMultiplier}
          />
        </Physics>
        <PostFX />
      </Canvas>
      <LoadingScreen done={ready} />
      <HUD />

      {isMobile ? (
        <>
          <div style={{ position: 'fixed', bottom: safeAreaBottom(16), right: 8, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 10 }}>
            <ZoomControls />
            <SheetTriggerButton onClick={() => setSheetOpen(true)} />
          </div>
          <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)}>
            <SheetSection label="Перемішаність"><MixednessMeter /></SheetSection>
            <SheetSection label="Керування"><ControlPanel /></SheetSection>
            <SheetSection label="Звук"><SoundToggle /></SheetSection>
            <div style={{ marginTop: 8 }}>{utilities}</div>
          </BottomSheet>
        </>
      ) : (
        <>
          <div style={{ position: 'fixed', top: '50%', right: 16, transform: 'translateY(-50%)', zIndex: 10 }}>
            <ControlPanel />
          </div>
          <div style={{ position: 'fixed', bottom: safeAreaBottom(16), left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}>
            <MixednessMeter />
          </div>
          <div style={{ position: 'fixed', bottom: safeAreaBottom(16), right: 16, display: 'flex', gap: 8, zIndex: 10 }}>
            <ZoomControls />
            <SoundToggle />
            {utilities}
          </div>
        </>
      )}
    </>
  )
}
