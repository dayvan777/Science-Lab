import { useEffect, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { Vector3, ACESFilmicToneMapping } from 'three'
import { Environment } from '@react-three/drei'
import { CinematicLighting } from '../../../sdk/scene/CinematicLighting'
import { CameraRig } from '../../../sdk/scene/CameraRig'
import type { CameraPreset } from '../../../sdk/scene/CameraRig'
import { PostFX } from '../../../sdk/scene/PostFX'
import { Table } from '../../../sdk/scene/Table'
import { Button } from '../../../sdk/ui/Button'
import { SoundToggle } from '../../../sdk/ui/SoundToggle'
import { ZoomControls } from '../../../sdk/ui/ZoomControls'
import { useStepEngine, isStepComplete } from '../../../sdk/guided/StepEngine'
import { setActiveInstrument } from '../../../sdk/physics/snapTargets'
import { useViewport } from '../../../sdk/a11y/useViewport'
import { Coil, COIL_LENGTH, COIL_OUTER_RADIUS, COIL_TURNS } from '../instruments/Coil'
import { Galvanometer } from '../instruments/Galvanometer'
import { Bulb } from '../instruments/Bulb'
import { Wires } from '../instruments/Wires'
import { CoilStand } from '../instruments/CoilStand'
import { LabClutter } from '../instruments/LabClutter'
import { FieldLines } from '../instruments/FieldLines'
import { CurrentArrows } from '../instruments/CurrentArrows'
import { BarMagnet, BAR_MAGNET_BODY_ID } from '../objects/BarMagnet'
import { useLabState } from '../state/LabState'
import { useInductionReadings } from '../state/InductionReadings'
import { useLabSettings } from '../state/LabSettingsState'
import { SCENES } from '../content/scenes'
import { computeEMF, computeBulbBrightness, computeGalvanometerAngle, COIL_CENTER, INFLUENCE_RADIUS } from '../physics/induction'
import { HUD } from '../ui/HUD'
import { FieldToggleButton } from '../ui/FieldToggleButton'
import { findBodyByTag } from '../../../sdk/physics/bodyRegistry'

const COIL_WORLD: [number, number, number] = [COIL_CENTER.x, COIL_CENTER.y, COIL_CENTER.z]
const GALVANOMETER_WORLD: [number, number, number] = [0.30, 0.85, 0]
const BULB_WORLD: [number, number, number] = [0.55, 0.85, 0]
const MAGNET_TRAY_WORLD: [number, number, number] = [-0.40, 0.94, 0.30]

// Decorative clutter positions — chosen so they don't overlap any
// interactive object and don't intersect the camera's focus-coil framing.
const NOTEBOOK_WORLD: [number, number, number] = [-0.55, 0.86, 0.30]
const SPOOL_WORLD: [number, number, number] = [0.10, 0.86, -0.35]
const SPARE_MAGNET_WORLD: [number, number, number] = [0.55, 0.86, -0.30]

function sceneToPreset(idx: number): CameraPreset {
  return idx === 0 ? 'overview' : 'focus-coil'
}

/**
 * Reads magnet position + velocity each frame, computes EMF + bulb +
 * galvanometer, pushes into the readings store. Also handles the three
 * motion-aware step completions in-line (sceneId-dispatched). Mounts as a
 * <></> with useFrame side-effects only.
 */
function SceneController() {
  const advanceStep = useStepEngine(s => s.advanceStep)
  const currentSceneIdx = useLabState(s => s.currentSceneIndex)
  const currentStepIdx = useStepEngine(s => s.currentStepIndex)
  const setReadings = useInductionReadings(s => s.setReadings)
  // Accumulator-based timers — milliseconds spent in the relevant state.
  // Polish v2 swap: `nearAccumulatedMs` no longer resets when the magnet
  // momentarily leaves the influence radius, fixing the "sometimes the MC
  // question doesn't appear" bug.
  const nearAccumulatedMs = useRef(0)
  const stationaryAccumulatedMs = useRef(0)
  const wasInside = useRef(false)
  // PERF: scratch Vector3 refs reused every frame inside useFrame.
  // Module-level globals would also work; useRef scopes them to this
  // component so future contributors can't accidentally cross-mutate.
  const scratchPos = useRef(new Vector3())
  const scratchVel = useRef(new Vector3())

  // Reset trigger-state on scene change
  useEffect(() => {
    wasInside.current = false
    nearAccumulatedMs.current = 0
    stationaryAccumulatedMs.current = 0
  }, [currentSceneIdx, currentStepIdx])

  useFrame(({ clock }, delta) => {
    const body = findBodyByTag(BAR_MAGNET_BODY_ID)
    if (!body) return
    const t = body.translation()
    const v = body.linvel()
    scratchPos.current.set(t.x, t.y, t.z)
    scratchVel.current.set(v.x, v.y, v.z)
    const emf = computeEMF(scratchPos.current, scratchVel.current)
    setReadings({
      currentEMF: emf,
      bulbBrightness: computeBulbBrightness(emf),
      galvanometerAngle: computeGalvanometerAngle(emf),
      magnetSpeed: scratchVel.current.length(),
      magnetWorldZ: t.z,
    })

    // ---------- Step advance ----------
    const scene = SCENES[currentSceneIdx]
    if (!scene) return
    const step = scene[currentStepIdx]
    if (!step) return

    const distance = scratchPos.current.distanceTo(COIL_CENTER)
    const inside = distance <= INFLUENCE_RADIUS
    const nowMs = clock.getElapsedTime() * 1000
    const speed = scratchVel.current.length()
    const deltaMs = delta * 1000

    if (step.motionTrigger === 'magnet-near-coil') {
      // Polish v2: accumulate time inside; do NOT reset on momentary exit.
      // Triggers after 600 ms cumulative — far more reliable than the old
      // 1500 ms continuous check.
      if (inside) {
        nearAccumulatedMs.current += deltaMs
      }
      if (nearAccumulatedMs.current >= 600) {
        advanceStep()
        nearAccumulatedMs.current = 0
      }
    } else if (step.motionTrigger === 'magnet-leaving-coil') {
      // Polish v2: dropped the speed > 0.05 gate. Even slow withdrawal
      // now counts. Trigger fires once on the first frame after entering
      // and then leaving the influence radius.
      if (inside) {
        wasInside.current = true
      } else if (wasInside.current) {
        advanceStep()
        wasInside.current = false
      }
    } else if (step.motionTrigger === 'magnet-stationary-in-coil') {
      // Polish v2: speed gate widened 0.04 → 0.08 (absorbs Rapier jitter),
      // continuous threshold shortened 2000 → 1500 ms. Still resets on
      // motion OR exit — the pedagogy specifically asks the student to
      // place the magnet inside and leave it alone.
      if (inside && speed < 0.08) {
        stationaryAccumulatedMs.current += deltaMs
      } else {
        stationaryAccumulatedMs.current = 0
      }
      if (stationaryAccumulatedMs.current >= 1500) {
        advanceStep()
        stationaryAccumulatedMs.current = 0
      }
    }

    // ---------- SDK rule advance ----------
    // For steps without a motionTrigger, run the SDK's standard predicate.
    // This covers `dragging` (pickup-slow / pickup-fast), `mc-selected`
    // (every MC step), and `submitted`-as-fallback. Motion-trigger steps
    // already short-circuited above and we don't double-check them here.
    if (!step.motionTrigger) {
      const engineState = useStepEngine.getState()
      const ctx = {
        draggingBodyId: engineState.draggingBodyId,
        lastSnapTargetId: engineState.lastSnapTargetId,
        digitalScaleGrams: 0,
        dynamometerNewtons: 0,
        leverBalanceTilt: 0,
        leverLeftPanGrams: 0,
        leverRightPanGrams: 0,
        lastMCChoice: engineState.lastMCChoice,
        readingStableSinceMs: engineState.readingStableSinceMs,
        nowMs,
        inputFocused: engineState.inputFocused,
        submittedSinceMs: 0,  // 'submitted' rule handled by HUD's "Далі" button click via advanceStep() directly
      }
      if (isStepComplete(step.complete, ctx)) {
        advanceStep()
        // mc-selected: consume the choice so next MC step doesn't inherit it
        if (step.complete.kind === 'mc-selected') {
          engineState.setLastMCChoice(null)
        }
      }
    }
  })

  return null
}

export function LabScene() {
  const phase = useLabState(s => s.phase)
  const idx = useLabState(s => s.currentSceneIndex)
  const resetKey = useLabState(s => s.sessionId)
  const respawnObjects = useLabState(s => s.respawnObjects)
  const { breakpoint } = useViewport()
  const isPhone = breakpoint === 'phone'
  const preset: CameraPreset = sceneToPreset(idx)
  const fieldVisibleToggle = useLabSettings((s) => s.fieldVisible)
  // Field + current arrows are hidden during Scene 1 (intro) regardless of
  // the toggle — the student should see the bare equipment first. From
  // Scene 2 onward, the toggle takes effect.
  const fieldVisible = fieldVisibleToggle && idx > 0

  // Tell the snap-target system the active instrument is the coil — this
  // is a no-op since the magnet is free-form, but keeps the SDK happy.
  useEffect(() => {
    setActiveInstrument('coil')
    return () => { setActiveInstrument(null) }
  }, [])

  return (
    <>
      <Canvas
        camera={{ position: [0, 1.5, 2.0], fov: 50 }}
        dpr={[1, 1.5]}
        shadows
        gl={{ toneMapping: ACESFilmicToneMapping, toneMappingExposure: 0.55 }}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'radial-gradient(ellipse at center, #2a2a30 0%, #1a1a1e 50%, #0a0a0c 100%)',
        }}
      >
        <CinematicLighting />
        <CameraRig preset={preset} />
        <Environment preset="studio" background={false} resolution={64} />
        <Physics key={resetKey} gravity={[0, -9.81, 0]} timeStep={1 / 60}>
          <Table />
          <CoilStand coilWorld={COIL_WORLD} coilLength={COIL_LENGTH} coilOuterRadius={COIL_OUTER_RADIUS} />
          {/* No `active` prop — there's only one instrument in this lab, so the
              blue <Outlines> highlight from mass-measurement's pattern just looked
              like noise around the 16-turn copper helix. */}
          <Coil position={COIL_WORLD} />
          <CurrentArrows
            coilWorld={COIL_WORLD}
            coilLength={COIL_LENGTH}
            coilOuterRadius={COIL_OUTER_RADIUS}
            coilTurns={COIL_TURNS}
            visible={fieldVisible}
          />
          <Galvanometer position={GALVANOMETER_WORLD} />
          <Bulb position={BULB_WORLD} />
          <Wires
            coilWorld={COIL_WORLD}
            galvanometerWorld={GALVANOMETER_WORLD}
            bulbWorld={BULB_WORLD}
          />
          <LabClutter
            notebookWorld={NOTEBOOK_WORLD}
            spoolWorld={SPOOL_WORLD}
            spareMagnetWorld={SPARE_MAGNET_WORLD}
          />
          <BarMagnet position={MAGNET_TRAY_WORLD} enabled={phase === 'in-progress'} />
          <FieldLines magnetBodyId={BAR_MAGNET_BODY_ID} visible={fieldVisible} />
          <SceneController />
        </Physics>
        <PostFX />
      </Canvas>
      <HUD />
      <div
        style={
          isPhone
            ? { position: 'fixed', top: 110, right: 8, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 10 }
            : { position: 'fixed', bottom: 16, right: 16, display: 'flex', gap: 8, zIndex: 10 }
        }
      >
        <ZoomControls />
        <SoundToggle />
        <FieldToggleButton />
        <Button
          variant="secondary"
          onClick={() => respawnObjects()}
          aria-label="Скинути предмети"
          title="Скинути предмети"
        >
          {isPhone ? '↻' : '↻ Скинути предмети'}
        </Button>
      </div>
    </>
  )
}
