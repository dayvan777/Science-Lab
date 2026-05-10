import { useEffect, useRef } from 'react'
import { Vector3 } from 'three'
import { RapierRigidBody } from '@react-three/rapier'
import { RigidBodyType } from '@dimforge/rapier3d-compat'
import {
  findBodyByTag,
  findBodiesByPrefix,
  getBodyMass,
} from '../../../sdk/physics/bodyRegistry'
import {
  findSnapByInstrument,
  listSnapsByInstrument,
  snapProgress,
} from '../../../sdk/physics/snapTargets'
import { useLabState } from '../state/LabState'
import { tasks } from '../content/tasks'

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

/** Walk a kinematic body to a target Vector3 over `durationMs` (easeOutCubic). */
function tweenKinematic(body: RapierRigidBody, to: Vector3, durationMs: number): Promise<void> {
  return new Promise(resolve => {
    try { body.setBodyType(RigidBodyType.KinematicPositionBased, true) } catch {}
    const t0 = performance.now()
    const start = body.translation()
    const fromX = start.x, fromY = start.y, fromZ = start.z
    const step = () => {
      const elapsed = performance.now() - t0
      const u = snapProgress(elapsed, durationMs)
      try {
        body.setNextKinematicTranslation({
          x: fromX + (to.x - fromX) * u,
          y: fromY + (to.y - fromY) * u,
          z: fromZ + (to.z - fromZ) * u,
        })
      } catch { return resolve() }
      if (u >= 1) return resolve()
      requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  })
}

/**
 * Programmatic auto-walkthrough — drives the lab through all 9 measurements
 * without any user input. Mounts only when the URL has `?demo=1`.
 *
 * Sequence per task:
 *   1. find body by tag (e.g. 'tennis-ball')
 *   2. find snap target by instrument (e.g. 'digital-scale')
 *   3. tween body to snap pos
 *   4. fire snap.onAttach to register the body with the instrument
 *   5. for lever-balance, also drop counter-weights on the right pan
 *   6. wait for the reading to stabilize
 *   7. call setMeasurement(taskId, expectedValue)
 *   8. wait between-task pause
 */
export function DemoController({ enabled }: { enabled: boolean }) {
  const phase = useLabState(s => s.phase)
  const setMeasurement = useLabState(s => s.setMeasurement)
  const startLab = useLabState(s => s.start)
  const ranRef = useRef(false)
  const cancelRef = useRef(false)

  // 1. Auto-start the lab if user is still on the intro screen.
  useEffect(() => {
    if (!enabled) return
    if (phase === 'intro') {
      const t = setTimeout(() => startLab(), 400)
      return () => clearTimeout(t)
    }
  }, [enabled, phase, startLab])

  // 2. Run the walkthrough once when phase becomes in-progress.
  useEffect(() => {
    if (!enabled || phase !== 'in-progress' || ranRef.current) return
    ranRef.current = true
    cancelRef.current = false

    ;(async () => {
      // Wait for the intro flythrough (3s) + a beat for first physics frames
      await sleep(3500)
      if (cancelRef.current) return

      for (const task of tasks) {
        if (cancelRef.current) return

        const body = findBodyByTag(task.objectId)
        if (!body) { await sleep(800); continue }

        // Lever balance has two pans (left + right). Object goes LEFT, weights RIGHT.
        const snap = task.instrumentId === 'lever-balance'
          ? listSnapsByInstrument('lever-balance').find(s => s.id.startsWith('lever-left-')) ?? null
          : findSnapByInstrument(task.instrumentId)
        if (!snap) { await sleep(800); continue }

        // Tween object to the snap target
        await tweenKinematic(body, snap.position.clone(), 600)
        if (cancelRef.current) return
        try { snap.onAttach(body) } catch {}

        // Lever balance — drop weights on the right pan to balance the beam
        if (task.instrumentId === 'lever-balance') {
          await sleep(500)
          await balanceLeverWithWeights(task.expectedValue)
          if (cancelRef.current) return
        }

        // Wait for the reading to settle
        await sleep(task.instrumentId === 'lever-balance' ? 2200 : 1600)
        if (cancelRef.current) return

        // Auto-fill the journal entry with the canonical expected value
        setMeasurement(task.id, task.expectedValue)

        // Brief pause before the next task (lets milestone overlay play
        // between objects on t3→t4 and t6→t7)
        await sleep(task.id === 't3' || task.id === 't6' ? 4500 : 1400)
      }
    })()

    return () => { cancelRef.current = true }
  }, [enabled, phase, setMeasurement])

  return null
}

/**
 * Drop weights on the lever balance's right pan totalling `targetGrams`.
 * Greedy largest-first selection.
 */
async function balanceLeverWithWeights(targetGrams: number): Promise<void> {
  const rightSnap = listSnapsByInstrument('lever-balance').find(s => s.id.startsWith('lever-right-'))
  if (!rightSnap) return

  const weightBodies = findBodiesByPrefix('weight-')
  const candidates: { body: RapierRigidBody; grams: number }[] = weightBodies
    .map(body => ({ body, grams: Math.round(getBodyMass(body) * 1000) }))
    .filter(c => c.grams > 0)
    .sort((a, b) => b.grams - a.grams)

  let remaining = Math.round(targetGrams)
  for (const { body, grams } of candidates) {
    if (remaining <= 0) break
    // Skip if this weight would overshoot by a lot (>5g) — let smaller ones fit
    if (grams > remaining + 5) continue
    await tweenKinematic(body, rightSnap.position.clone(), 500)
    try { rightSnap.onAttach(body) } catch {}
    remaining -= grams
    await sleep(450)
  }
}
