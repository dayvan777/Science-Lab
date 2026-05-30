import { useCallback, useEffect, useRef, useState, type ElementRef } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { ACESFilmicToneMapping, MOUSE, TOUCH, PerspectiveCamera } from 'three'
import { Environment, OrbitControls } from '@react-three/drei'
import { CinematicLighting } from '../../../sdk/scene/CinematicLighting'
import { PostFX } from '../../../sdk/scene/PostFX'
import { Table } from '../../../sdk/scene/Table'
import { CANVAS_BASE_STYLE } from '../../../sdk/scene/canvasStyle'
import { Button } from '../../../sdk/ui/Button'
import { SoundToggle } from '../../../sdk/ui/SoundToggle'
import { BottomSheet } from '../../../sdk/ui/BottomSheet'
import { SheetTriggerButton } from '../../../sdk/ui/SheetTriggerButton'
import { SheetSection } from '../../../sdk/ui/SheetSection'
import { LoadingScreen } from '../../../sdk/ui/LoadingScreen'
import { safeAreaBottom } from '../../../sdk/a11y/safeArea'
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

const BOX_WORLD: [number, number, number] = [0, 0.95, 0]
const CAPACITY = 150

const T_VELOCITY_SCALE: Record<TemperatureLevel, number> = { cold: 0.5, normal: 1.0, warm: 1.5, hot: 2.5 }

// Per-mission scene setup — one record per mission (index = currentSceneIndex),
// co-located so adding/removing a mission can't drift across parallel arrays.
type MissionSetup = { state: MaterialState; dividerRaised: boolean; showMolecules: boolean; segregated: boolean }
const MISSION_CONFIG: MissionSetup[] = [
  { state: 'gas',    dividerRaised: true,  showMolecules: true,  segregated: false }, // 1 Молекули не сплять
  { state: 'gas',    dividerRaised: true,  showMolecules: false, segregated: false }, // 2 Броунівський рух
  { state: 'gas',    dividerRaised: false, showMolecules: true,  segregated: true  }, // 3 Дифузія в газі
  { state: 'liquid', dividerRaised: true,  showMolecules: true,  segregated: false }, // 4 Дифузія в рідині
  { state: 'solid',  dividerRaised: true,  showMolecules: true,  segregated: false }, // 5 Дифузія у твердому
  { state: 'gas',    dividerRaised: true,  showMolecules: true,  segregated: false }, // 6 Температура вирішує
  { state: 'gas',    dividerRaised: true,  showMolecules: true,  segregated: false }, // 7 Вільна пісочниця
]
const DEFAULT_SETUP: MissionSetup = { state: 'gas', dividerRaised: true, showMolecules: true, segregated: false }

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

function fovForBreakpoint(bp: string): number {
  return bp === 'phone' ? 62 : bp === 'tablet' ? 56 : 50
}

/** In-canvas: keep the perspective FOV right for the current breakpoint. */
function CameraFov({ fov }: { fov: number }) {
  const { camera } = useThree()
  useEffect(() => {
    if (camera instanceof PerspectiveCamera && camera.fov !== fov) {
      camera.fov = fov
      camera.updateProjectionMatrix()
    }
  }, [camera, fov])
  return null
}

type OrbitRef = ElementRef<typeof OrbitControls>

/** Dolly the orbit camera by scaling its distance to the target, clamped to min/max. */
function dollyOrbit(orbit: OrbitRef | null, factor: number): void {
  if (!orbit) return
  const cam = orbit.object
  const offset = cam.position.clone().sub(orbit.target)
  const dist = Math.min(orbit.maxDistance, Math.max(orbit.minDistance, offset.length() * factor))
  offset.setLength(dist)
  cam.position.copy(orbit.target).add(offset)
  orbit.update()
}

/** +/- zoom buttons for the orbit camera (mirrors the SDK ZoomControls look). */
function OrbitZoom({ orbitRef, isPhone }: { orbitRef: React.RefObject<OrbitRef | null>; isPhone: boolean }) {
  const btn: React.CSSProperties = {
    background: 'rgba(20,20,24,0.72)', backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.08)', color: '#f5f5f7', borderRadius: 8,
    width: isPhone ? 48 : 40, height: isPhone ? 48 : 40, fontSize: isPhone ? 22 : 18, cursor: 'pointer',
  }
  return (
    <>
      <button style={btn} title="Наблизити" aria-label="Наблизити камеру" onClick={() => dollyOrbit(orbitRef.current, 0.85)}>+</button>
      <button style={btn} title="Віддалити" aria-label="Віддалити камеру" onClick={() => dollyOrbit(orbitRef.current, 1.18)}>−</button>
    </>
  )
}

export function LabScene() {
  const idx = useLabState(s => s.currentSceneIndex)
  const sessionId = useLabState(s => s.sessionId)
  const respawnObjects = useLabState(s => s.respawnObjects)
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

  const orbitRef = useRef<OrbitRef>(null)
  const fov = fovForBreakpoint(breakpoint)

  // Centre the orbit camera on the box once mounted.
  useEffect(() => {
    const o = orbitRef.current
    if (o) { o.target.set(BOX_WORLD[0], BOX_WORLD[1], BOX_WORLD[2]); o.update() }
  }, [])

  const particlesRef = useRef<Particle[]>(makeParticles('gas', 20, 20, false))
  const tracerStartRef = useRef<{ x: number; y: number; z: number } | null>(null)

  // Mission entry: apply the mission's intended state (this triggers the re-seed effect).
  useEffect(() => {
    const cfg = MISSION_CONFIG[idx] ?? DEFAULT_SETUP
    const s = useLabSettings.getState()
    s.setMaterialState(cfg.state)
    s.setDividerRaised(cfg.dividerRaised)
    s.setMolecules(cfg.showMolecules)
    s.setTracerActive(false)
  }, [idx, sessionId])

  // Re-seed the box whenever the medium or molecule counts change.
  useEffect(() => {
    const segregated = (MISSION_CONFIG[idx] ?? DEFAULT_SETUP).segregated
    particlesRef.current = makeParticles(materialState, redCount, blueCount, segregated && materialState === 'gas')
    tracerStartRef.current = null
    useLabSettings.getState().setTracerActive(false)
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

  const onTick = useCallback((_dt: number) => {
    const engine = useStepEngine.getState()
    const step = SCENES[idx]?.steps[engine.currentStepIndex] as BdStep | undefined

    const set = useLabSettings.getState()
    const lab = useLabState.getState()
    const mx = mixedness(set.materialState, particlesRef.current, set.timeLapseYears)
    if (Math.abs(mx - lab.mixedness) >= 0.01) lab.setMixedness(mx)

    // Goal detection — set goalReached (HUD shows «Далі»); never auto-advances.
    if (!step || step.complete.kind !== 'submitted' || !step.motionTrigger || lab.goalReached) return
    let reached = false
    switch (step.motionTrigger) {
      case 'tracer-jiggled': {
        const s0 = tracerStartRef.current
        const p = particlesRef.current.find(pp => pp.kind === 'pollen')
        const disp = !s0 || !p ? 0 : Math.hypot(p.pos.x - s0.x, p.pos.y - s0.y, p.pos.z - s0.z)
        reached = disp >= 0.05
        break
      }
      case 'gas-mixed':         reached = set.dividerRaised && mx >= 0.98; break
      case 'liquid-mixed':      reached = set.materialState === 'liquid' && set.tracerActive && mx >= 0.5; break
      case 'timelapse-reached': reached = set.materialState === 'solid' && set.timeLapseYears >= 100; break
      case 'temp-hot':          reached = set.temperatureLevel === 'hot'; break
    }
    if (reached) lab.setGoalReached(true)
  }, [idx])

  const isPhone = breakpoint === 'phone'

  const utilities = (
    <Button variant="secondary" onClick={() => respawnObjects()} aria-label="Скинути" title="Скинути">↻ Скинути</Button>
  )

  return (
    <>
      <Canvas
        camera={{ position: [0.55, 1.4, 0.95], fov: 50 }}
        dpr={[1, 1.5]}
        shadows
        gl={{ toneMapping: ACESFilmicToneMapping, toneMappingExposure: 0.45 }}
        style={{ ...CANVAS_BASE_STYLE, background: 'radial-gradient(ellipse at center, #2a2a30 0%, #1a1a1e 50%, #0a0a0c 100%)' }}
        onCreated={() => setReady(true)}
      >
        <CinematicLighting />
        <OrbitControls
          ref={orbitRef}
          makeDefault
          enableDamping
          enablePan={false}
          minDistance={0.35}
          maxDistance={1.6}
          minPolarAngle={Math.PI * 0.12}
          maxPolarAngle={Math.PI * 0.52}
          mouseButtons={{ LEFT: MOUSE.ROTATE, MIDDLE: MOUSE.ROTATE, RIGHT: MOUSE.PAN }}
          touches={{ ONE: TOUCH.ROTATE, TWO: TOUCH.DOLLY_PAN }}
        />
        <CameraFov fov={fov} />
        <Environment preset="studio" background={false} resolution={64} environmentIntensity={0.4} />
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
        <PostFX bloomIntensity={0.1} bloomThreshold={0.96} />
      </Canvas>
      <LoadingScreen done={ready} />
      <HUD />

      {isMobile ? (
        <>
          <div style={{ position: 'fixed', bottom: safeAreaBottom(16), right: 8, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 10 }}>
            <OrbitZoom orbitRef={orbitRef} isPhone={isPhone} />
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
            <OrbitZoom orbitRef={orbitRef} isPhone={isPhone} />
            <SoundToggle />
            {utilities}
          </div>
        </>
      )}
    </>
  )
}
