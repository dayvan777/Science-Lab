import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Vector3 } from 'three'
import { useStepEngine, isStepComplete } from '../../../sdk/guided/StepEngine'
import { findBodyByTag } from '../../../sdk/physics/bodyRegistry'
import { useLabState } from '../state/LabState'
import { useInductionReadings } from '../state/InductionReadings'
import { useLabSettings } from '../state/LabSettingsState'
import { SCENES } from '../content/scenes'
import { computeEMF, computeBulbBrightness, computeGalvanometerAngle, COIL_CENTER, INFLUENCE_RADIUS } from '../physics/induction'

/**
 * Reads magnet position + velocity each frame, computes EMF + bulb +
 * galvanometer, pushes into the readings store. Also handles the three
 * motion-aware step completions in-line (sceneId-dispatched). Mounts as a
 * <></> with useFrame side-effects only.
 */
export function SceneController() {
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

  // Sync activeMagnet to whichever magnet is currently being dragged.
  // Belt-and-suspenders with BarMagnet's onTap dispatch — handles the case
  // where the student starts a drag without first tapping.
  const draggingBodyId = useStepEngine(s => s.draggingBodyId)
  useEffect(() => {
    if (draggingBodyId === 'bar-magnet-long') {
      useLabSettings.getState().setActiveMagnet('long')
    } else if (draggingBodyId === 'bar-magnet-short') {
      useLabSettings.getState().setActiveMagnet('short')
    }
  }, [draggingBodyId])

  useFrame(({ clock }, delta) => {
    const activeBodyId =
      useLabSettings.getState().activeMagnet === 'long'
        ? 'bar-magnet-long'
        : 'bar-magnet-short'
    const body = findBodyByTag(activeBodyId)
    if (!body) return
    const t = body.translation()
    const v = body.linvel()
    scratchPos.current.set(t.x, t.y, t.z)
    scratchVel.current.set(v.x, v.y, v.z)
    const settings = useLabSettings.getState()
    const strengthMul =
      settings.magnetStrength === 'weak' ? 0.5
      : settings.magnetStrength === 'strong' ? 1.5
      : 1.0
    const emf = computeEMF(scratchPos.current, scratchVel.current, settings.coilTurns, strengthMul)
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
    const step = scene.steps[currentStepIdx]
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
