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
import { Coil } from '../instruments/Coil'
import { Galvanometer } from '../instruments/Galvanometer'
import { Bulb } from '../instruments/Bulb'
import { BarMagnet, BAR_MAGNET_BODY_ID } from '../objects/BarMagnet'
import { useLabState } from '../state/LabState'
import { useInductionReadings } from '../state/InductionReadings'
import { SCENES } from '../content/scenes'
import { computeEMF, computeBulbBrightness, computeGalvanometerAngle, COIL_CENTER, INFLUENCE_RADIUS } from '../physics/induction'
import { HUD } from '../ui/HUD'
import { findBodyByTag } from '../../../sdk/physics/bodyRegistry'

const COIL_WORLD: [number, number, number] = [COIL_CENTER.x, COIL_CENTER.y, COIL_CENTER.z]
const GALVANOMETER_WORLD: [number, number, number] = [0.30, 0.85, 0]
const BULB_WORLD: [number, number, number] = [0.55, 0.85, 0]
const MAGNET_TRAY_WORLD: [number, number, number] = [-0.40, 0.94, 0.30]

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
  const wasInside = useRef(false)
  const stationarySinceMs = useRef<number | null>(null)
  const nearSinceMs = useRef<number | null>(null)

  // Reset trigger-state on scene change
  useEffect(() => {
    wasInside.current = false
    stationarySinceMs.current = null
    nearSinceMs.current = null
  }, [currentSceneIdx, currentStepIdx])

  useFrame(({ clock }) => {
    const body = findBodyByTag(BAR_MAGNET_BODY_ID)
    if (!body) return
    const t = body.translation()
    const v = body.linvel()
    const pos = new Vector3(t.x, t.y, t.z)
    const vel = new Vector3(v.x, v.y, v.z)
    const emf = computeEMF(pos, vel)
    setReadings({
      currentEMF: emf,
      bulbBrightness: computeBulbBrightness(emf),
      galvanometerAngle: computeGalvanometerAngle(emf),
      magnetSpeed: vel.length(),
      magnetWorldZ: t.z,
    })

    // ---------- Step advance ----------
    const scene = SCENES[currentSceneIdx]
    if (!scene) return
    const step = scene[currentStepIdx]
    if (!step) return

    const distance = pos.distanceTo(COIL_CENTER)
    const inside = distance <= INFLUENCE_RADIUS
    const nowMs = clock.getElapsedTime() * 1000
    const speed = vel.length()

    if (step.motionTrigger === 'magnet-near-coil') {
      // Magnet has been inside the influence radius for >= 1500 ms
      if (inside) {
        if (nearSinceMs.current === null) nearSinceMs.current = nowMs
        if (nowMs - nearSinceMs.current >= 1500) {
          advanceStep()
          nearSinceMs.current = null
        }
      } else {
        nearSinceMs.current = null
      }
    } else if (step.motionTrigger === 'magnet-leaving-coil') {
      // Magnet must first have been inside, then leaves (distance > influence)
      if (inside) wasInside.current = true
      else if (wasInside.current && !inside && speed > 0.05) {
        advanceStep()
        wasInside.current = false
      }
    } else if (step.motionTrigger === 'magnet-stationary-in-coil') {
      // Inside coil AND speed nearly zero for >= 2000 ms
      if (inside && speed < 0.04) {
        if (stationarySinceMs.current === null) stationarySinceMs.current = nowMs
        if (nowMs - stationarySinceMs.current >= 2000) {
          advanceStep()
          stationarySinceMs.current = null
        }
      } else {
        stationarySinceMs.current = null
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
          <Coil position={COIL_WORLD} active={true} />
          <Galvanometer position={GALVANOMETER_WORLD} />
          <Bulb position={BULB_WORLD} />
          <BarMagnet position={MAGNET_TRAY_WORLD} enabled={phase === 'in-progress'} />
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
