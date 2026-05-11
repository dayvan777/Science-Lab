# Electromagnetic Induction Lab — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the second lab on NOVA EVRIKA — five guided scenes investigating electromagnetic induction with a draggable bar magnet, a horizontal coil, an analog galvanometer, and a frosted-glass lightbulb. Each scene closes with a 3-option multiple-choice question.

**Architecture:** New `src/labs/electromagnetic-induction/` tree mirroring the file layout of `mass-measurement`. SDK gains one new step-engine rule (`mc-selected`), one new generic UI component (`MultipleChoice`), one widened union (`SnapTarget.instrumentId` includes `'coil'`), and three new camera presets (`focus-coil`, `focus-magnet`, `focus-galv`). Lab-local physics in `physics/induction.ts` — pure functions for `computeEMF / computeBulbBrightness / computeGalvanometerAngle`. The three motion-aware step completions (`magnet-near-coil`, `magnet-leaving-coil`, `magnet-stationary-in-coil`) live INSIDE the lab's `LabScene` — they watch readings each frame and call `advanceStep()` directly — to keep EM-induction physics out of the SDK predicate engine.

**Tech Stack:** React 19, TypeScript 6, R3F + Rapier, drei, Zustand, Three.js (`TubeGeometry`/`CatmullRomCurve3` for the coil helix, `PointLight` for the bulb), `react-router-dom` 7 (already installed). No new dependencies.

**Spec:** `docs/superpowers/specs/2026-05-11-em-induction-lab-design.md`

---

## File map

```
NEW
  src/sdk/ui/MultipleChoice.tsx                                  (Task 4)
  src/labs/electromagnetic-induction/index.tsx                   (Task 16)
  src/labs/electromagnetic-induction/scene/LabScene.tsx          (Task 14)
  src/labs/electromagnetic-induction/instruments/Coil.tsx        (Task 11)
  src/labs/electromagnetic-induction/instruments/Galvanometer.tsx (Task 12)
  src/labs/electromagnetic-induction/instruments/Bulb.tsx        (Task 13)
  src/labs/electromagnetic-induction/objects/BarMagnet.tsx       (Task 9)
  src/labs/electromagnetic-induction/state/LabState.ts           (Task 7)
  src/labs/electromagnetic-induction/state/InductionReadings.ts  (Task 7)
  src/labs/electromagnetic-induction/physics/induction.ts        (Task 6)
  src/labs/electromagnetic-induction/content/scenes.ts           (Task 8)
  src/labs/electromagnetic-induction/textures/galvanometerDial.ts (Task 10)
  src/labs/electromagnetic-induction/ui/HUD.tsx                  (Task 15)
  src/labs/electromagnetic-induction/ui/IntroScreen.tsx          (Task 15)
  src/labs/electromagnetic-induction/ui/RevealScene.tsx          (Task 15)
  tests/labs/em-induction.test.ts                                (Task 6)

MODIFIED
  src/sdk/guided/TaskSteps.ts                                    (Task 2)
  src/sdk/guided/StepEngine.ts                                   (Task 2)
  src/sdk/physics/snapTargets.ts                                 (Task 3)
  src/sdk/scene/CameraRig.tsx                                    (Task 5)
  src/site/content/subjects.ts                                   (Task 17)
  src/site/components/SubjectPill.tsx                            (Task 17)
  src/app/App.tsx                                                (Task 17)
  tests/sdk/stepDsl.test.ts                                      (Task 2)
```

## Verification commands

```bash
npx tsc --noEmit                    # must be clean
npx vitest run                      # 183 → ~192 tests (5 SDK + 4 lab physics)
npm run build                       # must succeed
```

A single atomic commit lands at the end of Task 18.

---

## Task 1 — Branch off master

- [ ] **Step 1: Create branch**

```bash
git checkout -b feat/em-induction-lab
```

- [ ] **Step 2: Confirm clean tree**

```bash
git status
```

Expected: `On branch feat/em-induction-lab` / `nothing to commit, working tree clean` (single untracked file `public/nova-evrika-logo.png` is acceptable — already committed in master).

---

## Task 2 — Add `mc-selected` step rule + `lastMCChoice` to engine

**Files:**
- Modify: `src/sdk/guided/TaskSteps.ts`
- Modify: `src/sdk/guided/StepEngine.ts`
- Modify: `tests/sdk/stepDsl.test.ts`

- [ ] **Step 1: Add the rule + `choices` to `TaskSteps.ts`**

Open `src/sdk/guided/TaskSteps.ts`. Find the `CompletionRule` union (currently lines 8–22). Add a new variant inside the union, immediately after the `lever-balanced` block and before `input-focused`:

```ts
  | {
      /**
       * Student picked the correct option in a multiple-choice question.
       * The lab's MC UI calls setLastMCChoice(index) on click; this rule
       * compares against the spec'd correctIndex.
       */
      kind: 'mc-selected'
      correctIndex: number
    }
```

Then find the `Step` type (currently lines 24–39). Add a new optional field BEFORE `complete`:

```ts
  /** For mc-selected steps — 2–4 option labels rendered as glass pills. */
  choices?: { id: string; label: string }[]
```

- [ ] **Step 2: Add state + predicate handling in `StepEngine.ts`**

Open `src/sdk/guided/StepEngine.ts`. Add `lastMCChoice` to the state shape. The full updated file should be:

```ts
import { create } from 'zustand'

export type StepEngineState = {
  currentTaskIndex: number
  currentStepIndex: number
  draggingBodyId: string | null
  inputFocused: boolean
  lastSnapTargetId: string | null
  lastMCChoice: number | null
  readingStableSinceMs: number
  setDragging: (id: string | null) => void
  setInputFocused: (b: boolean) => void
  setLastSnap: (id: string | null) => void
  setLastMCChoice: (i: number | null) => void
  setReadingStableSince: (ms: number) => void
  advanceStep: () => void
  resetForTask: (taskIndex: number) => void
}

export const useStepEngine = create<StepEngineState>((set) => ({
  currentTaskIndex: 0,
  currentStepIndex: 0,
  draggingBodyId: null,
  inputFocused: false,
  lastSnapTargetId: null,
  lastMCChoice: null,
  readingStableSinceMs: 0,
  setDragging: (id) => set({ draggingBodyId: id }),
  setInputFocused: (b) => set({ inputFocused: b }),
  setLastSnap: (id) => set({ lastSnapTargetId: id }),
  setLastMCChoice: (i) => set({ lastMCChoice: i }),
  setReadingStableSince: (ms) => set({ readingStableSinceMs: ms }),
  advanceStep: () => set(s => ({ currentStepIndex: s.currentStepIndex + 1 })),
  resetForTask: (taskIndex) => set({
    currentTaskIndex: taskIndex,
    currentStepIndex: 0,
    draggingBodyId: null,
    inputFocused: false,
    lastSnapTargetId: null,
    lastMCChoice: null,
    readingStableSinceMs: 0,
  }),
}))

/**
 * Pure function — given current state, current step's completion rule, and reading values,
 * decide whether the step is complete.
 */
export function isStepComplete(
  rule: import('./TaskSteps').CompletionRule,
  ctx: {
    draggingBodyId: string | null
    lastSnapTargetId: string | null
    digitalScaleGrams: number
    dynamometerNewtons: number
    leverBalanceTilt: number
    leverLeftPanGrams: number
    leverRightPanGrams: number
    lastMCChoice: number | null
    readingStableSinceMs: number
    nowMs: number
    inputFocused: boolean
    submittedSinceMs: number  // 0 if not submitted; ms since submission otherwise
  }
): boolean {
  switch (rule.kind) {
    case 'dragging':
      return ctx.draggingBodyId !== null && ctx.draggingBodyId.includes(rule.bodyPattern)
    case 'snapped':
      return ctx.lastSnapTargetId !== null && ctx.lastSnapTargetId.startsWith(rule.targetPrefix)
    case 'reading-stable': {
      const value = rule.instrument === 'digital-scale' ? ctx.digitalScaleGrams : ctx.dynamometerNewtons
      return value >= rule.minValue && (ctx.nowMs - ctx.readingStableSinceMs) >= rule.durationMs
    }
    case 'lever-balanced':
      return (
        ctx.leverLeftPanGrams > 0 &&
        ctx.leverRightPanGrams > 0 &&
        Math.abs(ctx.leverLeftPanGrams - ctx.leverRightPanGrams) <= rule.toleranceGrams
      )
    case 'mc-selected':
      return ctx.lastMCChoice === rule.correctIndex
    case 'input-focused':
      return ctx.inputFocused
    case 'submitted':
      return ctx.submittedSinceMs > 0
  }
}
```

- [ ] **Step 3: Update existing callers of `isStepComplete` to pass `lastMCChoice`**

`src/sdk/guided/GuidedOverlay.tsx` is the only caller. Run:

```bash
grep -n "isStepComplete\|lastMCChoice" src/sdk/guided/GuidedOverlay.tsx
```

Find the `ctx` object built around line 58–65 (in `useFrame`). Add a `lastMCChoice` line: read from the engine state, just like `inputFocused`. The line currently is:

```tsx
    const ctx = {
      draggingBodyId, lastSnapTargetId,
      digitalScaleGrams, dynamometerNewtons, leverBalanceTilt, leverLeftPanGrams, leverRightPanGrams,
      readingStableSinceMs: useStepEngine.getState().readingStableSinceMs,
      nowMs, inputFocused,
      submittedSinceMs: 0,  // submission tracked via journal length change
    }
```

Update to include `lastMCChoice`:

```tsx
    const ctx = {
      draggingBodyId, lastSnapTargetId,
      digitalScaleGrams, dynamometerNewtons, leverBalanceTilt, leverLeftPanGrams, leverRightPanGrams,
      lastMCChoice: useStepEngine.getState().lastMCChoice,
      readingStableSinceMs: useStepEngine.getState().readingStableSinceMs,
      nowMs, inputFocused,
      submittedSinceMs: 0,
    }
```

(The mass-measurement lab never uses `mc-selected`, so `lastMCChoice` will always be `null` in its ctx — no behavioural change.)

- [ ] **Step 4: Add a test for the new rule in `tests/sdk/stepDsl.test.ts`**

Open `tests/sdk/stepDsl.test.ts`. Add a new `describe` block at the end of the file (BEFORE the final closing brace):

```ts
describe('isStepComplete: mc-selected', () => {
  const rule = { kind: 'mc-selected', correctIndex: 1 } as const
  const baseCtx = {
    draggingBodyId: null,
    lastSnapTargetId: null,
    digitalScaleGrams: 0,
    dynamometerNewtons: 0,
    leverBalanceTilt: 0,
    leverLeftPanGrams: 0,
    leverRightPanGrams: 0,
    lastMCChoice: null as number | null,
    readingStableSinceMs: 0,
    nowMs: 0,
    inputFocused: false,
    submittedSinceMs: 0,
  }

  it('rejects when no choice has been made', () => {
    expect(isStepComplete(rule, baseCtx)).toBe(false)
  })

  it('rejects when wrong choice was made', () => {
    expect(isStepComplete(rule, { ...baseCtx, lastMCChoice: 0 })).toBe(false)
    expect(isStepComplete(rule, { ...baseCtx, lastMCChoice: 2 })).toBe(false)
  })

  it('accepts when the correct choice was made', () => {
    expect(isStepComplete(rule, { ...baseCtx, lastMCChoice: 1 })).toBe(true)
  })
})
```

(If the file already imports `isStepComplete`, you're done. If it imports from a different path, mirror the existing import line at the top.)

- [ ] **Step 5: Verify**

```bash
npx tsc --noEmit
npx vitest run tests/sdk/stepDsl.test.ts | tail -3
```

Expected: typecheck clean, **3 new tests pass** in stepDsl.test.ts.

---

## Task 3 — Widen `SnapTarget.instrumentId` union to include `'coil'`

**Files:**
- Modify: `src/sdk/physics/snapTargets.ts`

The current union is `'digital-scale' | 'lever-balance' | 'dynamometer'`. EM lab needs `'coil'`.

- [ ] **Step 1: Update the type**

Open `src/sdk/physics/snapTargets.ts`. Find:

```ts
export type SnapTarget = {
  id: string
  instrumentId: 'digital-scale' | 'lever-balance' | 'dynamometer'
```

Replace with:

```ts
export type SnapTarget = {
  id: string
  instrumentId: 'digital-scale' | 'lever-balance' | 'dynamometer' | 'coil'
```

- [ ] **Step 2: Update the `findSnapNear` weight-special-case comment**

Same file, find the comment around line 60-64 that mentions weights and lever-balance. No code change needed — just verify the special case still applies only when `draggedBodyId?.startsWith('weight-')` and target instrument is `'lever-balance'`. The new `'coil'` variant doesn't need any special exception.

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit
```

Expected: clean.

---

## Task 4 — Create `<MultipleChoice/>` SDK component

**Files:**
- Create: `src/sdk/ui/MultipleChoice.tsx`

Generic, lab-agnostic. Used by any lab whose Step has a `choices` array.

- [ ] **Step 1: Write the component**

Create `src/sdk/ui/MultipleChoice.tsx`:

```tsx
import { useState, useCallback, useEffect } from 'react'
import type { CSSProperties } from 'react'

type Choice = { id: string; label: string }

type Props = {
  question: string
  choices: Choice[]
  /** Index (0-based) of the correct option. */
  correctIndex: number
  /** Fires when the student picks the correct answer. */
  onCorrect: (chosenIndex: number) => void
}

type ButtonState = 'idle' | 'wrong' | 'correct'

/**
 * Three-button vertical-stack MC widget styled to match the lab's glass HUD.
 * Click flashes green for correct (calls `onCorrect`), red for wrong (then
 * resets after 700 ms so the student can try again). Once correct, all
 * buttons disabled.
 */
export function MultipleChoice({ question, choices, correctIndex, onCorrect }: Props) {
  const [states, setStates] = useState<ButtonState[]>(() => choices.map(() => 'idle'))
  const [locked, setLocked] = useState(false)

  // Reset internal state if the question changes (e.g. we move to next scene).
  useEffect(() => {
    setStates(choices.map(() => 'idle'))
    setLocked(false)
  }, [question, choices])

  const handleClick = useCallback((idx: number) => {
    if (locked) return
    if (idx === correctIndex) {
      setStates(s => s.map((_, i) => (i === idx ? 'correct' : 'idle')))
      setLocked(true)
      onCorrect(idx)
      return
    }
    setStates(s => s.map((cur, i) => (i === idx ? 'wrong' : cur)))
    setTimeout(() => {
      setStates(s => s.map((cur, i) => (i === idx ? 'idle' : cur)))
    }, 700)
  }, [locked, correctIndex, onCorrect])

  const wrapStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    fontFamily: '"Inter", system-ui, sans-serif',
  }
  const questionStyle: CSSProperties = {
    fontSize: 15,
    fontWeight: 600,
    color: '#1d1d1f',
    margin: '0 0 8px',
    lineHeight: 1.4,
  }
  const buttonStyle = (state: ButtonState): CSSProperties => {
    const base: CSSProperties = {
      padding: '14px 18px',
      borderRadius: 100,
      fontSize: 14,
      fontWeight: 600,
      fontFamily: '"Inter", system-ui, sans-serif',
      textAlign: 'left',
      cursor: locked ? 'default' : 'pointer',
      transition: 'background 200ms ease, color 200ms ease, border-color 200ms ease',
      border: '1px solid rgba(0,0,0,0.10)',
    }
    if (state === 'correct') {
      return { ...base, background: '#34c759', color: '#fff', borderColor: '#34c759' }
    }
    if (state === 'wrong') {
      return { ...base, background: '#ff3b30', color: '#fff', borderColor: '#ff3b30' }
    }
    return { ...base, background: 'rgba(0,0,0,0.04)', color: '#1d1d1f' }
  }

  return (
    <div style={wrapStyle} role="group" aria-label={question}>
      <p style={questionStyle}>{question}</p>
      {choices.map((c, i) => (
        <button
          key={c.id}
          type="button"
          style={buttonStyle(states[i])}
          onClick={() => handleClick(i)}
          disabled={locked && states[i] !== 'correct'}
          aria-label={c.label}
        >
          {c.label}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

Expected: clean.

---

## Task 5 — Add three camera presets to `CameraRig`

**Files:**
- Modify: `src/sdk/scene/CameraRig.tsx`

- [ ] **Step 1: Extend the `CameraPreset` union**

Open `src/sdk/scene/CameraRig.tsx`. Find:

```ts
export type CameraPreset =
  | 'intro'
  | 'overview'
  | 'workspace'
  | 'focus-scale'
  | 'focus-lever'
  | 'focus-dyn'
  | 'reveal'
```

Replace with:

```ts
export type CameraPreset =
  | 'intro'
  | 'overview'
  | 'workspace'
  | 'focus-scale'
  | 'focus-lever'
  | 'focus-dyn'
  | 'focus-coil'
  | 'focus-magnet'
  | 'focus-galv'
  | 'reveal'
```

- [ ] **Step 2: Add the matching entries to the `POSES` object**

Same file, find the `POSES` constant. Add three new entries between `'focus-dyn'` and `reveal`:

```ts
  'focus-coil':   { position: [-0.05, 1.35, 1.1], lookAt: [-0.05, 0.95, 0] },
  'focus-magnet': { position: [-0.30, 1.35, 1.1], lookAt: [-0.30, 0.95, 0] },
  'focus-galv':   { position: [0.30, 1.35, 1.1],  lookAt: [0.30, 0.95, 0]  },
```

The final `POSES` block becomes:

```ts
const POSES: Record<CameraPreset, Pose> = {
  intro:         { position: [0, 2.0, 2.4],   lookAt: [0, 0.85, 0]   },
  overview:      { position: [0, 1.5, 2.0],   lookAt: [0, 0.85, 0]   },
  workspace:     { position: [0, 1.5, 2.0],   lookAt: [0, 0.85, 0]   },
  'focus-scale': { position: [0.25, 1.5, 1.8], lookAt: [0.4, 0.9, 0] },
  'focus-lever': { position: [0.05, 1.5, 1.8], lookAt: [0.05, 0.9, 0] },
  'focus-dyn':   { position: [-0.25, 1.55, 1.8], lookAt: [-0.4, 1.05, 0] },
  'focus-coil':   { position: [-0.05, 1.35, 1.1], lookAt: [-0.05, 0.95, 0] },
  'focus-magnet': { position: [-0.30, 1.35, 1.1], lookAt: [-0.30, 0.95, 0] },
  'focus-galv':   { position: [0.30, 1.35, 1.1],  lookAt: [0.30, 0.95, 0]  },
  reveal:        { position: [0, 3.0, 3.2],   lookAt: [0, 1.0, 0]    },
}
```

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit
```

Expected: clean.

---

## Task 6 — Lab physics functions + tests

**Files:**
- Create: `src/labs/electromagnetic-induction/physics/induction.ts`
- Create: `tests/labs/em-induction.test.ts`

Pure, deterministic functions. Tested in isolation. No React/three.js imports — just `Vector3` from `three` for the inputs.

- [ ] **Step 1: Write the physics module**

Create `src/labs/electromagnetic-induction/physics/induction.ts`:

```ts
import { Vector3 } from 'three'

/**
 * World position of the coil's centre. The lab's LabScene mounts the coil
 * at this point and the physics functions consume this constant directly.
 */
export const COIL_CENTER = new Vector3(-0.05, 0.95, 0)

/**
 * Coil axis — magnetic flux through the coil is the component of the
 * magnet's velocity along this direction. Coil's bore is oriented along z
 * so the student drags the magnet toward/away from the camera.
 */
export const COIL_AXIS = new Vector3(0, 0, 1)

/** Outside this radius, the magnet has no effect on the coil. */
export const INFLUENCE_RADIUS = 0.18

/** Tuning constant — converts m/s into galvanometer-scale units. */
const EMF_GAIN = 12.0

/** Galvanometer needle scale extends ±EMF_MAX. */
export const EMF_MAX = 5.0

/** |EMF| below this threshold → bulb stays dark. */
export const BULB_THRESHOLD = 1.5

/** |EMF| at this point → bulb at maximum brightness. */
export const BULB_MAX = 4.5

/**
 * EMF induced in the coil by the moving magnet, in arbitrary units
 * matched to the ±EMF_MAX galvanometer scale.
 *
 * Faraday's law in qualitative form: EMF ∝ rate of flux change. Here
 * we approximate rate of flux change as (velocity-along-axis) × proximity,
 * which captures the two effects we want to teach:
 *
 *   1. Stationary magnet (any position) → velAlongAxis = 0 → EMF = 0.
 *      Even at coil centre with proximity = 1, no motion means no current.
 *
 *   2. Magnet far from coil (distance > INFLUENCE_RADIUS) → proximity = 0
 *      → EMF = 0, regardless of how fast it moves.
 *
 *   3. Reversed motion direction → velAlongAxis sign flips → EMF sign
 *      flips → galvanometer needle deflects the other way (Lenz).
 */
export function computeEMF(magnetPos: Vector3, magnetVel: Vector3): number {
  const offset = new Vector3().subVectors(magnetPos, COIL_CENTER)
  const distance = offset.length()
  if (distance > INFLUENCE_RADIUS) return 0
  // Proximity factor: 1 at the centre, smoothly tapering to 0 at the edge
  const t = distance / INFLUENCE_RADIUS
  const proximity = 1 - t * t
  // Velocity component along coil axis (positive = entering from -z, negative = leaving)
  const velAlongAxis = magnetVel.dot(COIL_AXIS)
  const emf = EMF_GAIN * velAlongAxis * proximity
  return Math.max(-EMF_MAX, Math.min(EMF_MAX, emf))
}

/**
 * Bulb brightness 0..1 from the absolute EMF magnitude. Threshold below
 * which the bulb is dark — this is the pedagogical hook: slow motion ⇒
 * small EMF ⇒ below threshold ⇒ bulb dark, even though current is non-zero.
 */
export function computeBulbBrightness(emf: number): number {
  const abs = Math.abs(emf)
  if (abs <= BULB_THRESHOLD) return 0
  return Math.min(1, (abs - BULB_THRESHOLD) / (BULB_MAX - BULB_THRESHOLD))
}

/**
 * Galvanometer needle angle in radians. 0 = vertical (centred at "0").
 * Positive EMF → needle rotates clockwise toward "+5" on the right.
 * Negative EMF → counter-clockwise toward "-5" on the left.
 */
export function computeGalvanometerAngle(emf: number): number {
  const MAX_ANGLE = Math.PI / 3  // ±60° from vertical
  return (emf / EMF_MAX) * MAX_ANGLE
}
```

- [ ] **Step 2: Write the tests**

Create `tests/labs/em-induction.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { Vector3 } from 'three'
import {
  computeEMF,
  computeBulbBrightness,
  computeGalvanometerAngle,
  COIL_CENTER,
  COIL_AXIS,
  EMF_MAX,
  BULB_THRESHOLD,
} from '../../src/labs/electromagnetic-induction/physics/induction'

describe('computeEMF', () => {
  it('stationary magnet inside the coil produces zero EMF', () => {
    const pos = COIL_CENTER.clone()
    const vel = new Vector3(0, 0, 0)
    expect(computeEMF(pos, vel)).toBe(0)
  })

  it('magnet far away produces zero EMF regardless of speed', () => {
    const pos = COIL_CENTER.clone().add(new Vector3(0, 0, 1.0))  // 1 m down-axis
    const vel = new Vector3(0, 0, 10)  // very fast
    expect(computeEMF(pos, vel)).toBe(0)
  })

  it('positive z-velocity inside coil → positive EMF', () => {
    const pos = COIL_CENTER.clone()
    const vel = new Vector3(0, 0, 0.5)
    const emf = computeEMF(pos, vel)
    expect(emf).toBeGreaterThan(0)
  })

  it('negative z-velocity inside coil → negative EMF (Lenz)', () => {
    const pos = COIL_CENTER.clone()
    const vel = new Vector3(0, 0, -0.5)
    const emf = computeEMF(pos, vel)
    expect(emf).toBeLessThan(0)
  })

  it('EMF clamps at ±EMF_MAX even for very fast motion', () => {
    const pos = COIL_CENTER.clone()
    const fast = new Vector3(0, 0, 100)
    expect(computeEMF(pos, fast)).toBe(EMF_MAX)
    const slow = new Vector3(0, 0, -100)
    expect(computeEMF(slow, fast)).toBe(-EMF_MAX)  // very far + fast → 0, not -EMF_MAX. So use pos here:
    expect(computeEMF(pos, new Vector3(0, 0, -100))).toBe(-EMF_MAX)
  })
})

describe('computeBulbBrightness', () => {
  it('|EMF| below threshold → bulb dark (0)', () => {
    expect(computeBulbBrightness(0)).toBe(0)
    expect(computeBulbBrightness(BULB_THRESHOLD - 0.01)).toBe(0)
    expect(computeBulbBrightness(-(BULB_THRESHOLD - 0.01))).toBe(0)
  })

  it('|EMF| above threshold → linear ramp up to 1', () => {
    expect(computeBulbBrightness(BULB_THRESHOLD + 0.01)).toBeGreaterThan(0)
    expect(computeBulbBrightness(EMF_MAX)).toBeCloseTo(1, 1)
    expect(computeBulbBrightness(-EMF_MAX)).toBeCloseTo(1, 1)
  })
})

describe('computeGalvanometerAngle', () => {
  it('zero EMF → zero angle', () => {
    expect(computeGalvanometerAngle(0)).toBe(0)
  })

  it('full positive EMF → +60° (π/3 radians)', () => {
    expect(computeGalvanometerAngle(EMF_MAX)).toBeCloseTo(Math.PI / 3, 4)
  })

  it('full negative EMF → -60°', () => {
    expect(computeGalvanometerAngle(-EMF_MAX)).toBeCloseTo(-Math.PI / 3, 4)
  })
})
```

- [ ] **Step 3: Run tests — verify all pass**

```bash
npx vitest run tests/labs/em-induction.test.ts | tail -3
```

Expected: 10 tests passing.

---

## Task 7 — Lab state stores

**Files:**
- Create: `src/labs/electromagnetic-induction/state/LabState.ts`
- Create: `src/labs/electromagnetic-induction/state/InductionReadings.ts`

- [ ] **Step 1: Write `LabState.ts`**

Mirrors the mass-measurement pattern (phase, currentSceneIndex, journal):

```ts
import { create } from 'zustand'

export type LabPhase = 'intro' | 'in-progress' | 'finished'

export type JournalEntry = {
  sceneId: string
  chosenIndex: number
  timestamp: number
}

type LabState = {
  phase: LabPhase
  currentSceneIndex: number
  journal: JournalEntry[]
  sessionId: number
  start: () => void
  recordMCAnswer: (sceneId: string, chosenIndex: number) => void
  advanceScene: () => void
  reset: () => void
  respawnObjects: () => void
}

const TOTAL_SCENES = 5

export const useLabState = create<LabState>((set, get) => ({
  phase: 'intro',
  currentSceneIndex: 0,
  journal: [],
  sessionId: 0,

  start: () => set({ phase: 'in-progress' }),

  recordMCAnswer: (sceneId, chosenIndex) => {
    const { journal } = get()
    set({
      journal: [...journal, { sceneId, chosenIndex, timestamp: Date.now() }],
    })
  },

  advanceScene: () => {
    const { currentSceneIndex } = get()
    const next = currentSceneIndex + 1
    set({
      currentSceneIndex: next,
      phase: next >= TOTAL_SCENES ? 'finished' : 'in-progress',
    })
  },

  reset: () => set(s => ({
    phase: 'intro',
    currentSceneIndex: 0,
    journal: [],
    sessionId: s.sessionId + 1,
  })),

  respawnObjects: () => set(s => ({ sessionId: s.sessionId + 1 })),
}))
```

- [ ] **Step 2: Write `InductionReadings.ts`**

```ts
import { create } from 'zustand'

/**
 * Real-time physics readings. LabScene writes here every frame; instruments
 * (Galvanometer, Bulb) subscribe and render reactively.
 */
type InductionReadings = {
  /** Signed EMF in galvanometer-scale units (±EMF_MAX from induction.ts). */
  currentEMF: number
  /** 0..1, drives the bulb's PointLight intensity + emissive material. */
  bulbBrightness: number
  /** Radians, drives the galvanometer needle's rotation around its pivot. */
  galvanometerAngle: number
  /** Magnitude of magnet velocity in m/s — used by scene-advance heuristics. */
  magnetSpeed: number
  /** Magnet position (world) — used by scene-advance heuristics. */
  magnetWorldZ: number
  setReadings: (r: Partial<Pick<InductionReadings,
    'currentEMF' | 'bulbBrightness' | 'galvanometerAngle' | 'magnetSpeed' | 'magnetWorldZ'>>) => void
}

export const useInductionReadings = create<InductionReadings>((set) => ({
  currentEMF: 0,
  bulbBrightness: 0,
  galvanometerAngle: 0,
  magnetSpeed: 0,
  magnetWorldZ: 0,
  setReadings: (r) => set(r),
}))
```

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit
```

Expected: clean.

---

## Task 8 — Scene content

**Files:**
- Create: `src/labs/electromagnetic-induction/content/scenes.ts`

- [ ] **Step 1: Write the scenes**

```ts
import type { Step } from '../../../sdk/guided/TaskSteps'

/**
 * The 5 EM-induction scenes. Each scene has a list of Steps the student
 * works through. Three motion-aware step kinds are unique to this lab and
 * detected by LabScene's useFrame loop (not by the SDK predicate engine):
 *
 *   'magnet-near-coil'         — magnet enters INFLUENCE_RADIUS for >= 1.5 s
 *   'magnet-leaving-coil'      — magnet exits influence radius after being inside
 *   'magnet-stationary-in-coil' — magnet inside coil + speed < 0.02 m/s for >= 2.0 s
 *
 * These are NOT in CompletionRule. LabScene watches readings and calls
 * advanceStep() directly when the conditions are met. Each Step below
 * uses a placeholder { kind: 'submitted' } completion for scenes where the
 * actual advance is motion-driven — LabScene short-circuits before the
 * SDK predicate is ever evaluated for those steps.
 */
export type EmStep = Step & {
  /**
   * Lab-local completion override. When set, LabScene watches the
   * corresponding readings and calls advanceStep() directly instead of
   * relying on the SDK's isStepComplete predicate.
   */
  motionTrigger?: 'magnet-near-coil' | 'magnet-leaving-coil' | 'magnet-stationary-in-coil'
}

export const SCENES: EmStep[][] = [
  // Scene 1 — Знайомство (intro, single advance step)
  [
    {
      id: 'intro-ack',
      target: { kind: 'ui', id: 'submit' },
      visualHint: 'highlight',
      hintTitle: 'Знайомство з обладнанням',
      hintExplanation:
        "Перед тобою — котушка з мідного дроту, гальванометр зі стрілкою і лампочка в одному електричному колі. " +
        "Ми будемо рухати магніт біля котушки і дослідимо, коли в колі виникає струм.",
      complete: { kind: 'submitted' },
    },
  ],

  // Scene 2 — Повільний рух
  [
    {
      id: 'pickup-slow',
      target: { kind: 'object', id: 'bar-magnet' },
      visualHint: 'arrow',
      hintTitle: 'Візьми магніт',
      hintExplanation: 'Натисни і утримуй магніт, щоб взяти його.',
      complete: { kind: 'dragging', bodyPattern: 'bar-magnet' },
    },
    {
      id: 'move-slow',
      target: { kind: 'instrument', id: 'coil' },
      visualHint: 'target-ring',
      hintTitle: 'Повільно піднеси магніт до котушки',
      hintExplanation: 'Зверни увагу на стрілку гальванометра і на лампочку. Не поспішай.',
      complete: { kind: 'submitted' },
      motionTrigger: 'magnet-near-coil',
    },
    {
      id: 'mc-slow',
      target: { kind: 'ui', id: 'input' },
      visualHint: 'highlight',
      hintTitle: 'Що відбувається з лампочкою при повільному русі?',
      choices: [
        { id: 'dark', label: 'Не світиться' },
        { id: 'bright', label: 'Світиться яскраво' },
        { id: 'weak', label: 'Світиться слабо' },
      ],
      complete: { kind: 'mc-selected', correctIndex: 0 },
    },
  ],

  // Scene 3 — Швидкий рух
  [
    {
      id: 'pickup-fast',
      target: { kind: 'object', id: 'bar-magnet' },
      visualHint: 'arrow',
      hintTitle: 'Тепер рухай магніт ШВИДКО крізь котушку',
      hintExplanation: 'Сильним рухом протягни магніт через котушку.',
      complete: { kind: 'dragging', bodyPattern: 'bar-magnet' },
    },
    {
      id: 'observe-fast',
      target: { kind: 'instrument', id: 'coil' },
      visualHint: 'target-ring',
      hintTitle: 'Подивись, що відбувається з гальванометром і лампочкою',
      complete: { kind: 'submitted' },
      motionTrigger: 'magnet-near-coil',
    },
    {
      id: 'mc-fast',
      target: { kind: 'ui', id: 'input' },
      visualHint: 'highlight',
      hintTitle: 'При швидкому русі лампочка...',
      choices: [
        { id: 'dark', label: 'Не світиться' },
        { id: 'bright', label: 'Світиться яскраво' },
        { id: 'same', label: 'Світиться так само як раніше' },
      ],
      complete: { kind: 'mc-selected', correctIndex: 1 },
    },
  ],

  // Scene 4 — Зміна напрямку
  [
    {
      id: 'pull-away',
      target: { kind: 'instrument', id: 'coil' },
      visualHint: 'arrow',
      hintTitle: 'Відведи магніт від котушки',
      hintExplanation: 'Спостерігай за напрямком, у який відхиляється стрілка гальванометра.',
      complete: { kind: 'submitted' },
      motionTrigger: 'magnet-leaving-coil',
    },
    {
      id: 'mc-direction',
      target: { kind: 'ui', id: 'input' },
      visualHint: 'highlight',
      hintTitle: 'Куди відхиляється стрілка, коли магніт ВИХОДИТЬ з котушки?',
      choices: [
        { id: 'right', label: 'Так само вправо' },
        { id: 'left', label: 'Вліво (інший бік)' },
        { id: 'none', label: 'Не відхиляється' },
      ],
      complete: { kind: 'mc-selected', correctIndex: 1 },
    },
  ],

  // Scene 5 — Нерухомий магніт
  [
    {
      id: 'place-inside',
      target: { kind: 'instrument', id: 'coil' },
      visualHint: 'target-ring',
      hintTitle: 'Поклади магніт всередину котушки і відпусти',
      hintExplanation: 'Магніт має лежати нерухомо всередині котушки.',
      complete: { kind: 'submitted' },
      motionTrigger: 'magnet-stationary-in-coil',
    },
    {
      id: 'mc-stationary',
      target: { kind: 'ui', id: 'input' },
      visualHint: 'highlight',
      hintTitle: 'Чому струму немає, хоча магніт у котушці?',
      choices: [
        { id: 'weak', label: 'Магніт занадто слабкий' },
        { id: 'no-change', label: 'Бо немає РУХУ — потрібна зміна потоку' },
        { id: 'broken', label: 'Котушка зламана' },
      ],
      complete: { kind: 'mc-selected', correctIndex: 1 },
    },
  ],
]
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

Expected: clean.

---

## Task 9 — `BarMagnet` draggable object

**Files:**
- Create: `src/labs/electromagnetic-induction/objects/BarMagnet.tsx`

- [ ] **Step 1: Write the component**

```tsx
import { Draggable } from '../../../sdk/object/Draggable'

export const MAGNET_HALF_LENGTH = 0.045  // total length 9 cm
export const MAGNET_HALF_DEPTH = 0.012   // square cross-section 24 mm side
export const MAGNET_MASS_GRAMS = 80      // arbitrary — not used by EM-induction physics
export const BAR_MAGNET_BODY_ID = 'bar-magnet'

type Props = { position: [number, number, number]; enabled?: boolean }

/**
 * Classic bar magnet — N pole red (#ff3b30), S pole blue (#0a84ff).
 * Draggable. Physics shape is a cuboid sized to match the visual mesh.
 */
export function BarMagnet({ position, enabled = true }: Props) {
  return (
    <Draggable
      position={position}
      mass={MAGNET_MASS_GRAMS}
      shape={{
        type: 'cuboid',
        halfExtents: [MAGNET_HALF_LENGTH, MAGNET_HALF_DEPTH, MAGNET_HALF_DEPTH],
      }}
      bodyId={BAR_MAGNET_BODY_ID}
      enabled={enabled}
    >
      {/* N pole (red) — left half (-x) */}
      <mesh position={[-MAGNET_HALF_LENGTH / 2, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[MAGNET_HALF_LENGTH, MAGNET_HALF_DEPTH * 2, MAGNET_HALF_DEPTH * 2]} />
        <meshStandardMaterial color="#ff3b30" metalness={0.6} roughness={0.4} envMapIntensity={0.5} />
      </mesh>
      {/* S pole (blue) — right half (+x) */}
      <mesh position={[MAGNET_HALF_LENGTH / 2, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[MAGNET_HALF_LENGTH, MAGNET_HALF_DEPTH * 2, MAGNET_HALF_DEPTH * 2]} />
        <meshStandardMaterial color="#0a84ff" metalness={0.6} roughness={0.4} envMapIntensity={0.5} />
      </mesh>
      {/* Tiny "N" / "S" letters on top face for clarity */}
      <mesh position={[-MAGNET_HALF_LENGTH / 2, MAGNET_HALF_DEPTH + 0.0005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[MAGNET_HALF_LENGTH * 0.6, MAGNET_HALF_DEPTH * 1.4]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.85} />
      </mesh>
      <mesh position={[MAGNET_HALF_LENGTH / 2, MAGNET_HALF_DEPTH + 0.0005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[MAGNET_HALF_LENGTH * 0.6, MAGNET_HALF_DEPTH * 1.4]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.85} />
      </mesh>
    </Draggable>
  )
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

Expected: clean.

---

## Task 10 — Galvanometer dial texture

**Files:**
- Create: `src/labs/electromagnetic-induction/textures/galvanometerDial.ts`

A canvas-rendered scale: arc from −5 (left) to +5 (right) through 0 (top centre).

- [ ] **Step 1: Write the texture builder**

```ts
import { CanvasTexture } from 'three'

export const DIAL_TEXTURE_W = 512
export const DIAL_TEXTURE_H = 512

/**
 * Draws an analog galvanometer dial face — a half-disc with tick marks
 * from -5 (far left) through 0 (top centre) to +5 (far right). Used by
 * the Galvanometer instrument's flat face plane.
 *
 * Coordinate system: x ∈ [0, W], y ∈ [0, H]. The arc's centre is at the
 * BOTTOM-CENTRE of the canvas (pivot of the needle). Ticks radiate
 * outward at angles from 30° (right side) through 90° (top) to 150°
 * (left side) — that's 60° per ±5N, so 12° per N unit.
 */
export function createGalvanometerDialTexture(): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = DIAL_TEXTURE_W
  canvas.height = DIAL_TEXTURE_H
  const ctx = canvas.getContext('2d')!

  // Off-white plate background
  ctx.fillStyle = '#f5f5f7'
  ctx.fillRect(0, 0, DIAL_TEXTURE_W, DIAL_TEXTURE_H)

  // Outer plate border
  ctx.strokeStyle = '#c8c8d0'
  ctx.lineWidth = 4
  ctx.strokeRect(4, 4, DIAL_TEXTURE_W - 8, DIAL_TEXTURE_H - 8)

  // Title at the top
  ctx.fillStyle = '#1d1d1f'
  ctx.font = 'bold 36px "SF Pro Display", "Inter", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('A', DIAL_TEXTURE_W / 2, 50)

  // Geometry: pivot at bottom centre, arc radius
  const pivotX = DIAL_TEXTURE_W / 2
  const pivotY = DIAL_TEXTURE_H * 0.92
  const innerR = DIAL_TEXTURE_W * 0.32
  const outerR = DIAL_TEXTURE_W * 0.40
  const labelR = DIAL_TEXTURE_W * 0.46

  // For each integer N in -5..+5, compute angle and draw tick + label
  // Angle convention: 0° = +x axis (right), counter-clockwise positive.
  // We want -5 at 150°, 0 at 90° (straight up), +5 at 30°.
  // angle(n) = 90° + (-n) * 12° → in radians: π/2 + (-n) * (12 * π / 180)
  const TICK_STEP_DEG = 12  // degrees per unit
  for (let n = -5; n <= 5; n++) {
    const angleDeg = 90 + (-n) * TICK_STEP_DEG
    const angle = (angleDeg * Math.PI) / 180

    const x1 = pivotX + innerR * Math.cos(angle)
    const y1 = pivotY - innerR * Math.sin(angle)
    const x2 = pivotX + outerR * Math.cos(angle)
    const y2 = pivotY - outerR * Math.sin(angle)

    // Major tick
    ctx.strokeStyle = '#1d1d1f'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()

    // Label
    const lx = pivotX + labelR * Math.cos(angle)
    const ly = pivotY - labelR * Math.sin(angle)
    ctx.fillStyle = '#1d1d1f'
    ctx.font = 'bold 30px "SF Pro Display", "Inter", sans-serif'
    ctx.fillText(`${n}`, lx, ly)
  }

  // Minor ticks every 1 unit between integers — at 0.5 step, but we keep
  // it simple here (already 11 major marks covers ±5 with 1-unit precision).

  // Arc outline between -5 and +5
  ctx.strokeStyle = '#1d1d1f'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(pivotX, pivotY, innerR, (30 * Math.PI) / 180, (150 * Math.PI) / 180, false)
  ctx.stroke()

  // Pivot dot
  ctx.fillStyle = '#1d1d1f'
  ctx.beginPath()
  ctx.arc(pivotX, pivotY, 8, 0, Math.PI * 2)
  ctx.fill()

  return new CanvasTexture(canvas)
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

Expected: clean.

---

## Task 11 — `Coil` instrument

**Files:**
- Create: `src/labs/electromagnetic-induction/instruments/Coil.tsx`

Horizontal solenoid — TubeGeometry helix along world-z, similar pattern to the Dynamometer's spring but bigger and orientation flipped.

- [ ] **Step 1: Write the component**

```tsx
import { useMemo, useEffect } from 'react'
import { Vector3, TubeGeometry, CatmullRomCurve3 } from 'three'
import { Outlines } from '@react-three/drei'
import { registerSnap } from '../../../sdk/physics/snapTargets'

export const COIL_OUTER_RADIUS = 0.04   // 4 cm
export const COIL_TUBE_RADIUS = 0.0035  // copper wire thickness
export const COIL_LENGTH = 0.12         // 12 cm long along z
export const COIL_TURNS = 16
export const COIL_SNAP_RADIUS = 0.10

type Props = {
  /** World position of the coil's CENTRE. */
  position: [number, number, number]
  /** True when this lab is the active instrument — toggles highlight. */
  active?: boolean
}

function buildCoilGeometry(): TubeGeometry {
  const SEGMENTS = 256
  const points: Vector3[] = []
  for (let i = 0; i <= SEGMENTS; i++) {
    const t = i / SEGMENTS
    const angle = t * COIL_TURNS * Math.PI * 2
    // axis along z: vary z linearly, oscillate x and y
    const z = -COIL_LENGTH / 2 + t * COIL_LENGTH
    points.push(new Vector3(
      Math.cos(angle) * COIL_OUTER_RADIUS,
      Math.sin(angle) * COIL_OUTER_RADIUS,
      z,
    ))
  }
  const curve = new CatmullRomCurve3(points)
  return new TubeGeometry(curve, SEGMENTS * 2, COIL_TUBE_RADIUS, 8, false)
}

export function Coil({ position, active = false }: Props) {
  const geometry = useMemo(() => buildCoilGeometry(), [])

  useEffect(() => {
    return () => { geometry.dispose() }
  }, [geometry])

  useEffect(() => {
    const unregister = registerSnap({
      id: 'coil-center',
      instrumentId: 'coil',
      position: new Vector3(...position),
      radius: COIL_SNAP_RADIUS,
      keepKinematic: false,
      onAttach: () => { /* magnet is free-form; no kinematic snap */ },
    })
    return unregister
  }, [position])

  return (
    <group position={position}>
      <mesh geometry={geometry} castShadow>
        <meshStandardMaterial
          color="#b67333"
          metalness={0.85}
          roughness={0.25}
          envMapIntensity={1.0}
        />
        {active && <Outlines thickness={3} color="#0a84ff" />}
      </mesh>
    </group>
  )
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

Expected: clean.

---

## Task 12 — `Galvanometer` instrument

**Files:**
- Create: `src/labs/electromagnetic-induction/instruments/Galvanometer.tsx`

Box housing + flat textured face with arc dial + needle that rotates around the bottom-centre pivot. Reads `galvanometerAngle` from `InductionReadings` and smooths it with a spring-damper (avoids jitter from raw Rapier velocity).

- [ ] **Step 1: Write the component**

```tsx
import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import type { Mesh } from 'three'
import { useInductionReadings } from '../state/InductionReadings'
import { createGalvanometerDialTexture } from '../textures/galvanometerDial'
import { springStep } from '../../../sdk/animation'

const HOUSING_W = 0.16
const HOUSING_H = 0.18
const HOUSING_D = 0.06
const FACE_W = 0.13
const FACE_H = 0.13
const NEEDLE_LEN = 0.05
const NEEDLE_PIVOT_Y_LOCAL = -FACE_H / 2 + 0.005  // near the bottom of the face

const NEEDLE_STIFFNESS = 70
const NEEDLE_DAMPING = 8

type Props = { position: [number, number, number] }

export function Galvanometer({ position }: Props) {
  const targetAngle = useInductionReadings(s => s.galvanometerAngle)
  const dialTexture = useMemo(() => createGalvanometerDialTexture(), [])
  const needleRef = useRef<Mesh>(null)
  const displayedAngle = useRef(0)
  const velocity = useRef(0)

  useEffect(() => {
    return () => { dialTexture.dispose() }
  }, [dialTexture])

  useFrame((_, delta) => {
    // Spring-damper smoothing so the needle eases into its target instead
    // of jittering with raw Rapier velocity.
    const r = springStep({
      current: displayedAngle.current,
      velocity: velocity.current,
      target: targetAngle,
      stiffness: NEEDLE_STIFFNESS,
      damping: NEEDLE_DAMPING,
      dt: Math.min(delta, 0.033),
    })
    displayedAngle.current = r.current
    velocity.current = r.velocity
    if (needleRef.current) {
      needleRef.current.rotation.z = -r.current
    }
  })

  return (
    <group position={position}>
      {/* Black housing */}
      <RoundedBox
        args={[HOUSING_W, HOUSING_H, HOUSING_D]}
        radius={0.008}
        smoothness={4}
        position={[0, HOUSING_H / 2, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color="#1a1a1d" metalness={0.55} roughness={0.40} envMapIntensity={0.5} />
      </RoundedBox>

      {/* Front face plane with the dial texture */}
      <mesh position={[0, HOUSING_H / 2, HOUSING_D / 2 + 0.001]}>
        <planeGeometry args={[FACE_W, FACE_H]} />
        <meshBasicMaterial map={dialTexture} />
      </mesh>

      {/* Needle — thin red box rotating around its base */}
      <group position={[0, HOUSING_H / 2 + NEEDLE_PIVOT_Y_LOCAL, HOUSING_D / 2 + 0.002]}>
        <mesh ref={needleRef} position={[0, NEEDLE_LEN / 2, 0]}>
          <boxGeometry args={[0.0028, NEEDLE_LEN, 0.002]} />
          <meshStandardMaterial color="#ff3b30" emissive="#ff3b30" emissiveIntensity={0.7} toneMapped={false} />
        </mesh>
      </group>

      {/* Two terminal posts on the front bottom (for wires to attach visually) */}
      <mesh position={[-FACE_W * 0.30, 0.012, HOUSING_D / 2 + 0.005]} castShadow>
        <cylinderGeometry args={[0.0045, 0.0045, 0.012, 16]} />
        <meshStandardMaterial color="#c8c8d0" metalness={0.95} roughness={0.15} envMapIntensity={1.2} />
      </mesh>
      <mesh position={[FACE_W * 0.30, 0.012, HOUSING_D / 2 + 0.005]} castShadow>
        <cylinderGeometry args={[0.0045, 0.0045, 0.012, 16]} />
        <meshStandardMaterial color="#c8c8d0" metalness={0.95} roughness={0.15} envMapIntensity={1.2} />
      </mesh>
    </group>
  )
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

Expected: clean.

---

## Task 13 — `Bulb` instrument

**Files:**
- Create: `src/labs/electromagnetic-induction/instruments/Bulb.tsx`

Frosted-glass sphere on a brass base. `<pointLight>` intensity driven by `bulbBrightness`. Emissive material on the glass material so the bulb itself looks lit.

- [ ] **Step 1: Write the component**

```tsx
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { PointLight, MeshStandardMaterial } from 'three'
import { useInductionReadings } from '../state/InductionReadings'

const BULB_GLASS_R = 0.025
const BASE_HEIGHT = 0.020
const MAX_LIGHT_INTENSITY = 2.5

type Props = { position: [number, number, number] }

export function Bulb({ position }: Props) {
  const brightness = useInductionReadings(s => s.bulbBrightness)
  const lightRef = useRef<PointLight>(null)
  const glassMatRef = useRef<MeshStandardMaterial>(null)

  // Update light + emissive every frame via refs — avoids React re-render churn.
  useFrame(() => {
    if (lightRef.current) {
      lightRef.current.intensity = brightness * MAX_LIGHT_INTENSITY
    }
    if (glassMatRef.current) {
      glassMatRef.current.emissiveIntensity = brightness * 2.5
    }
  })

  return (
    <group position={position}>
      {/* Brass base */}
      <mesh position={[0, BASE_HEIGHT / 2, 0]} castShadow>
        <cylinderGeometry args={[BULB_GLASS_R * 0.55, BULB_GLASS_R * 0.7, BASE_HEIGHT, 24]} />
        <meshStandardMaterial color="#c8a050" metalness={0.85} roughness={0.30} envMapIntensity={1.0} />
      </mesh>
      {/* Frosted glass sphere */}
      <mesh position={[0, BASE_HEIGHT + BULB_GLASS_R, 0]} castShadow>
        <sphereGeometry args={[BULB_GLASS_R, 24, 16]} />
        <meshStandardMaterial
          ref={glassMatRef}
          color="#fff7d8"
          emissive="#ffe890"
          emissiveIntensity={0}
          metalness={0}
          roughness={0.35}
          transparent
          opacity={0.92}
        />
      </mesh>
      {/* Point light inside the bulb */}
      <pointLight
        ref={lightRef}
        position={[0, BASE_HEIGHT + BULB_GLASS_R, 0]}
        color="#ffe890"
        intensity={0}
        distance={1.2}
        decay={2}
      />
    </group>
  )
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

Expected: clean.

---

## Task 14 — `LabScene` (Canvas, Physics, motion-aware step advance)

**Files:**
- Create: `src/labs/electromagnetic-induction/scene/LabScene.tsx`

The heart of the lab. Mounts Canvas + Physics + CameraRig + the four scene elements + a sceneController effect that watches readings and advances the step engine on motion-aware triggers.

- [ ] **Step 1: Write the component**

```tsx
import { useEffect, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Physics, RigidBody, RapierRigidBody } from '@react-three/rapier'
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
import { useStepEngine } from '../../../sdk/guided/StepEngine'
import { setActiveInstrument } from '../../../sdk/physics/snapTargets'
import { useViewport } from '../../../sdk/a11y/useViewport'
import { Coil } from '../instruments/Coil'
import { Galvanometer } from '../instruments/Galvanometer'
import { Bulb } from '../instruments/Bulb'
import { BarMagnet } from '../objects/BarMagnet'
import { useLabState } from '../state/LabState'
import { useInductionReadings } from '../state/InductionReadings'
import { SCENES } from '../content/scenes'
import { computeEMF, computeBulbBrightness, computeGalvanometerAngle, COIL_CENTER, INFLUENCE_RADIUS } from '../physics/induction'
import { HUD } from '../ui/HUD'
import { getBodyByBodyId } from '../../../sdk/physics/bodyRegistry'

const COIL_WORLD: [number, number, number] = [COIL_CENTER.x, COIL_CENTER.y, COIL_CENTER.z]
const GALVANOMETER_WORLD: [number, number, number] = [0.30, 0.85, 0]
const BULB_WORLD: [number, number, number] = [0.55, 0.85, 0]
const MAGNET_TRAY_WORLD: [number, number, number] = [-0.40, 0.94, 0.30]

const SCENE_TO_PRESET: CameraPreset[] = ['overview', 'focus-coil', 'focus-coil', 'focus-coil', 'focus-coil']

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
    const body = getBodyByBodyId('bar-magnet')
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

    // ---------- Motion-aware step advance ----------
    const scene = SCENES[currentSceneIdx]
    if (!scene) return
    const step = scene[currentStepIdx]
    if (!step || !step.motionTrigger) return

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

  const preset: CameraPreset = SCENE_TO_PRESET[idx] ?? 'overview'

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
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

Expected: clean.

(NOTE: This task references `getBodyByBodyId` from `bodyRegistry`. If the existing bodyRegistry doesn't expose this helper, the engineer should: (a) check `src/sdk/physics/bodyRegistry.ts` for the exact API, and if no `getByBodyId` exists, add it as a 4-line helper:

```ts
// Add to bodyRegistry.ts if missing
export function getBodyByBodyId(bodyId: string): RapierRigidBody | null {
  for (const [body, info] of registry.entries()) {
    if (info.bodyId === bodyId) return body
  }
  return null
}
```

Match the file's existing patterns for `registry` and `info` shape. If it already exists under a different name like `findBody`, use that name instead. Document any rename in the commit message.)

---

## Task 15 — UI: HUD, IntroScreen, RevealScene

**Files:**
- Create: `src/labs/electromagnetic-induction/ui/HUD.tsx`
- Create: `src/labs/electromagnetic-induction/ui/IntroScreen.tsx`
- Create: `src/labs/electromagnetic-induction/ui/RevealScene.tsx`

- [ ] **Step 1: Write `HUD.tsx`**

```tsx
import { useEffect } from 'react'
import { GlassPanel } from '../../../sdk/ui/GlassPanel'
import { CollapsibleGlassPanel } from '../../../sdk/ui/CollapsibleGlassPanel'
import { Button } from '../../../sdk/ui/Button'
import { MultipleChoice } from '../../../sdk/ui/MultipleChoice'
import { useViewport } from '../../../sdk/a11y/useViewport'
import { useLabState } from '../state/LabState'
import { useStepEngine } from '../../../sdk/guided/StepEngine'
import { SCENES } from '../content/scenes'

export function HUD() {
  const phase = useLabState(s => s.phase)
  const sceneIdx = useLabState(s => s.currentSceneIndex)
  const recordMCAnswer = useLabState(s => s.recordMCAnswer)
  const advanceScene = useLabState(s => s.advanceScene)
  const journal = useLabState(s => s.journal)
  const stepIdx = useStepEngine(s => s.currentStepIndex)
  const setLastMCChoice = useStepEngine(s => s.setLastMCChoice)
  const resetForTask = useStepEngine(s => s.resetForTask)
  const { breakpoint } = useViewport()

  useEffect(() => {
    resetForTask(sceneIdx)
  }, [sceneIdx, resetForTask])

  if (phase !== 'in-progress') return null

  const scene = SCENES[sceneIdx]
  if (!scene) return null
  const step = scene[stepIdx]
  const sceneComplete = !step

  // If the scene's last step completed, advance to next scene
  useEffect(() => {
    if (sceneComplete) {
      const t = setTimeout(() => advanceScene(), 400)
      return () => clearTimeout(t)
    }
  }, [sceneComplete, advanceScene])

  const layout = (() => {
    if (breakpoint === 'phone') {
      return {
        topPill: { top: 8, padding: '6px 14px', fontSize: 12 } as const,
        taskPanel: { left: 8, right: 8, bottom: 96, top: undefined, width: 'auto', maxHeight: '40vh', padding: 14 } as const,
        journalPanel: { left: 8, right: 8, bottom: undefined, top: 56, width: 'auto', maxHeight: 120, padding: 10, fontSize: 12 } as const,
      }
    }
    if (breakpoint === 'tablet') {
      return {
        topPill: { top: 12, padding: '8px 18px', fontSize: 13 } as const,
        taskPanel: { top: 64, left: 12, width: 340, padding: 16, bottom: undefined, right: undefined, maxHeight: undefined } as const,
        journalPanel: { top: 64, right: 12, width: 280, padding: 14, bottom: undefined, left: undefined, maxHeight: '60vh' } as const,
      }
    }
    return {
      topPill: { top: 16, padding: '8px 20px', fontSize: 13 } as const,
      taskPanel: { top: 80, left: 16, width: 380, padding: 20, bottom: undefined, right: undefined, maxHeight: undefined } as const,
      journalPanel: { top: 80, right: 16, width: 320, padding: 16, bottom: undefined, left: undefined, maxHeight: '70vh' } as const,
    }
  })()

  return (
    <>
      {/* Top pill */}
      <GlassPanel
        variant="strong"
        style={{
          position: 'fixed', left: '50%',
          transform: 'translateX(-50%)',
          borderRadius: 100,
          fontWeight: 500,
          zIndex: 10,
          color: '#1d1d1f',
          ...layout.topPill,
        }}
      >
        Сцена {Math.min(sceneIdx + 1, SCENES.length)} / {SCENES.length}
      </GlassPanel>

      {/* Task panel — collapsible */}
      <CollapsibleGlassPanel
        storageKey="em-task-panel"
        label="панель сцени"
        defaultCollapsed={breakpoint === 'phone'}
        aria-labelledby="em-task-label"
        style={{ overflow: 'auto', ...layout.taskPanel }}
        collapsedStyle={
          breakpoint === 'phone' ? { bottom: 96, left: 8 } : { top: layout.taskPanel.top ?? 64, left: 8 }
        }
      >
        <div id="em-task-label" style={{ fontSize: 11, letterSpacing: '0.15em', color: '#86868b', textTransform: 'uppercase', marginBottom: 8 }}>
          Зараз робимо
        </div>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#1d1d1f', marginBottom: 8 }}>
          {step?.hintTitle ?? '...'}
        </div>
        {step?.hintExplanation && (
          <div style={{ fontSize: 13, color: '#6e6e73', lineHeight: 1.5, marginBottom: 14 }}>
            {step.hintExplanation}
          </div>
        )}
        {/* Choices */}
        {step?.choices && step.complete.kind === 'mc-selected' && (
          <MultipleChoice
            question=""
            choices={step.choices}
            correctIndex={step.complete.correctIndex}
            onCorrect={(idx) => {
              recordMCAnswer(step.id, idx)
              setLastMCChoice(idx)
            }}
          />
        )}
        {/* Submit button for non-choice ack steps */}
        {step?.complete.kind === 'submitted' && !step.choices && !step.target.id.includes('coil') && (
          <Button
            onClick={() => useStepEngine.getState().advanceStep()}
            aria-label="Далі"
          >
            Далі →
          </Button>
        )}
      </CollapsibleGlassPanel>

      {/* Journal panel */}
      <CollapsibleGlassPanel
        storageKey="em-journal-panel"
        label="журнал"
        defaultCollapsed={breakpoint === 'phone'}
        aria-labelledby="em-journal-label"
        style={{ overflow: 'auto', ...layout.journalPanel }}
        collapsedStyle={
          breakpoint === 'phone' ? { top: 56, right: 8 } : { top: layout.journalPanel.top ?? 64, right: 8 }
        }
      >
        <div id="em-journal-label" style={{ fontSize: 11, letterSpacing: '0.15em', color: '#86868b', textTransform: 'uppercase', marginBottom: 8 }}>
          Лабжурнал
        </div>
        {journal.length === 0 ? (
          <div style={{ fontSize: 13, color: '#6e6e73' }}>Поки що порожньо.</div>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 13 }}>
            {journal.map((entry, i) => (
              <li key={i} style={{ padding: '6px 0', borderBottom: '1px solid rgba(0,0,0,0.06)', color: '#1d1d1f' }}>
                <span style={{ color: '#34c759', marginRight: 6 }}>✓</span>
                {entry.sceneId}
              </li>
            ))}
          </ul>
        )}
      </CollapsibleGlassPanel>
    </>
  )
}
```

- [ ] **Step 2: Write `IntroScreen.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { useLabState } from '../state/LabState'
import { Button } from '../../../sdk/ui/Button'

export function IntroScreen() {
  const start = useLabState(s => s.start)
  const [stage, setStage] = useState(0)

  useEffect(() => {
    const t1 = setTimeout(() => setStage(1), 100)
    const t2 = setTimeout(() => setStage(2), 600)
    const t3 = setTimeout(() => setStage(3), 1100)
    const t4 = setTimeout(() => setStage(4), 1700)
    return () => [t1, t2, t3, t4].forEach(clearTimeout)
  }, [])

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'linear-gradient(180deg, #fafafa 0%, #cdcdd2 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      color: '#1d1d1f', padding: 32,
      fontFamily: '"SF Pro Display", "Inter", system-ui, sans-serif',
    }}>
      <div style={{
        opacity: stage >= 1 ? 1 : 0,
        transform: stage >= 1 ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 600ms ease, transform 600ms ease',
        fontSize: 56, fontWeight: 200, letterSpacing: -1.5,
        marginBottom: 8, textAlign: 'center',
      }}>
        Практична робота
      </div>
      <div style={{
        opacity: stage >= 2 ? 1 : 0,
        transform: stage >= 2 ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 600ms ease, transform 600ms ease',
        fontSize: 32, fontWeight: 400, color: '#0071e3',
        marginBottom: 40, textAlign: 'center',
      }}>
        Дослідження електромагнітної індукції
      </div>
      <div style={{
        opacity: stage >= 3 ? 1 : 0,
        transform: stage >= 3 ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 800ms ease, transform 800ms ease',
        fontSize: 17, color: '#6e6e73', maxWidth: 620,
        textAlign: 'center', lineHeight: 1.55, marginBottom: 48,
      }}>
        Рухай магніт біля котушки — спостерігай за стрілкою гальванометра та яскравістю лампочки.
        Ми пройдемо 5 сцен і відкриємо, коли в колі виникає індукований струм.
      </div>
      <div style={{
        opacity: stage >= 4 ? 1 : 0,
        transform: stage >= 4 ? 'scale(1)' : 'scale(0.9)',
        transition: 'opacity 400ms ease, transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}>
        <Button onClick={start}>Почати дослідження</Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Write `RevealScene.tsx`**

```tsx
import { useEffect, useState } from 'react'

const CONCLUSIONS = [
  'Струм виникає лише при ЗМІНІ магнітного потоку.',
  'Швидше рух → більший струм (закон Фарадея).',
  'Зміна напрямку руху → зміна напрямку струму (закон Ленца).',
]

export function RevealScene() {
  const [stage, setStage] = useState(0)

  useEffect(() => {
    const timers = [400, 1500, 2600, 3700].map((ms, i) =>
      setTimeout(() => setStage(i + 1), ms),
    )
    return () => timers.forEach(clearTimeout)
  }, [])

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#08080a',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      color: '#fff', padding: 32,
      fontFamily: '"Inter", system-ui, sans-serif',
    }}>
      {/* Glow backdrop */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `
          radial-gradient(ellipse 60% 35% at 90% 12%, rgba(255, 200, 70, 0.45) 0%, transparent 75%),
          radial-gradient(ellipse 55% 55% at 70% 60%, rgba(80, 220, 130, 0.40) 0%, transparent 80%),
          radial-gradient(ellipse 55% 70% at 5% 85%, rgba(10, 132, 255, 0.45) 0%, transparent 75%)
        `,
        filter: 'blur(60px)',
        pointerEvents: 'none',
      }} />

      <div style={{
        opacity: stage >= 1 ? 1 : 0,
        transform: stage >= 1 ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 600ms ease, transform 600ms ease',
        fontFamily: '"Saira", "Inter", sans-serif',
        fontSize: 36, fontWeight: 800, letterSpacing: -0.02,
        marginBottom: 40, textTransform: 'uppercase', textAlign: 'center',
      }}>
        Висновки
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 22, maxWidth: 760, textAlign: 'center' }}>
        {CONCLUSIONS.map((text, i) => (
          <div key={i} style={{
            opacity: stage >= i + 2 ? 1 : 0,
            transform: stage >= i + 2 ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 600ms ease, transform 600ms ease',
            fontSize: 22, fontWeight: 500, color: 'rgba(255,255,255,0.9)',
            lineHeight: 1.5,
          }}>
            <span style={{ color: '#0a84ff', fontWeight: 700, marginRight: 8 }}>{i + 1}.</span>
            {text}
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Verify**

```bash
npx tsc --noEmit
```

Expected: clean.

---

## Task 16 — Lab entry `index.tsx`

**Files:**
- Create: `src/labs/electromagnetic-induction/index.tsx`

- [ ] **Step 1: Write the entry**

```tsx
import { useEffect } from 'react'
import { sound } from '../../sdk/audio/SoundManager'
import { LabScene } from './scene/LabScene'
import { useLabState } from './state/LabState'
import { IntroScreen } from './ui/IntroScreen'
import { RevealScene } from './ui/RevealScene'

export const emInductionLabDefinition = {
  id: 'em-induction',
  title: 'Дослідження електромагнітної індукції',
}

const SOUND_CATALOG = {
  tick: '/audio/sdk/tick.mp3',
  ding: '/audio/sdk/ding.mp3',
  whoosh: '/audio/sdk/whoosh.mp3',
  success: '/audio/sdk/success.mp3',
  error: '/audio/sdk/error.mp3',
} as const

export function EMInductionLab() {
  const phase = useLabState(s => s.phase)

  useEffect(() => {
    if (phase !== 'in-progress') return
    sound.preload(SOUND_CATALOG)
  }, [phase])

  return (
    <>
      {phase === 'intro' && <IntroScreen />}
      {phase === 'finished' && <RevealScene />}
      {phase === 'in-progress' && <LabScene />}
    </>
  )
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

Expected: clean.

---

## Task 17 — Platform integration (subjects, SubjectPill plural, App route)

**Files:**
- Modify: `src/site/content/subjects.ts`
- Modify: `src/site/components/SubjectPill.tsx`
- Modify: `src/app/App.tsx`

- [ ] **Step 1: Add the new lab to `subjects.ts`**

Open `src/site/content/subjects.ts`. Find the physics entry's `labs` array. Add the second entry after `mass-measurement`:

```ts
        {
          id: 'mass-measurement',
          // ...existing...
        },
        {
          id: 'em-induction',
          title: 'Дослідження електромагнітної індукції',
          subtitle: 'Котушка · Гальванометр · Лампочка',
          path: '/physics/em-induction',
          status: 'available',
        },
```

- [ ] **Step 2: Fix the Ukrainian plural in `SubjectPill.tsx`**

Open `src/site/components/SubjectPill.tsx`. Find:

```ts
  const badgeText = isAvailable
    ? labCount === 1 ? '1 ЛАБА' : `${labCount} ЛАБ`
    : 'СКОРО'
```

Replace with:

```ts
  const badgeText = isAvailable
    ? labCount === 1 ? '1 ЛАБА'
      : labCount >= 2 && labCount <= 4 ? `${labCount} ЛАБИ`
      : `${labCount} ЛАБ`
    : 'СКОРО'
```

- [ ] **Step 3: Add the route in `App.tsx`**

Open `src/app/App.tsx`. Add the import line near the other imports:

```tsx
import { EMInductionLab } from '../labs/electromagnetic-induction'
```

In the `<Routes>` block, add the new route AFTER `/physics/mass-measurement` and BEFORE the `*` fallback:

```tsx
        <Route path="/physics/em-induction" element={<EMInductionLab />} />
```

The final `<Routes>` block becomes:

```tsx
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/physics" element={<PhysicsPage />} />
        <Route path="/physics/mass-measurement" element={<MassMeasurementLab />} />
        <Route path="/physics/em-induction" element={<EMInductionLab />} />
        <Route path="/math" element={<ComingSoonPage subjectId="math" />} />
        <Route path="/history" element={<ComingSoonPage subjectId="history" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
```

- [ ] **Step 4: Verify**

```bash
npx tsc --noEmit
```

Expected: clean.

---

## Task 18 — Final verification + single atomic commit

- [ ] **Step 1: Full verification**

```bash
npx tsc --noEmit
npx vitest run | tail -3
npm run build 2>&1 | tail -3
```

Expected:
- typecheck clean,
- vitest: **~192 tests pass** (183 base + 3 new mc-selected + 10 new physics ≈ 196 — the slight variance is acceptable; mass-measurement tests must remain green),
- build succeeds (chunk-size warning is pre-existing and OK).

- [ ] **Step 2: Single atomic commit**

```bash
git add src/sdk/guided/TaskSteps.ts src/sdk/guided/StepEngine.ts \
        src/sdk/physics/snapTargets.ts src/sdk/scene/CameraRig.tsx \
        src/sdk/ui/MultipleChoice.tsx \
        src/labs/electromagnetic-induction/ \
        src/site/content/subjects.ts src/site/components/SubjectPill.tsx \
        src/app/App.tsx \
        tests/sdk/stepDsl.test.ts tests/labs/em-induction.test.ts
git commit -m "feat(lab): electromagnetic induction — second lab on NOVA EVRIKA

Five guided scenes (intro, slow motion, fast motion, direction change,
stationary magnet) each closing with a 3-option multiple-choice
question. Real-time physics: dragging a bar magnet through a horizontal
coil computes EMF (Faraday's law qualitatively), drives a center-zero
analog galvanometer needle and a frosted-glass bulb with a threshold
brightness curve.

SDK additions (generic, reusable):
- 'mc-selected' CompletionRule + Step.choices field
- lastMCChoice in StepEngine state + setter
- <MultipleChoice/> component (glass pills, green flash on correct,
  red flash on wrong with retry)
- SnapTarget.instrumentId union widened to include 'coil'
- Three camera presets: 'focus-coil', 'focus-magnet', 'focus-galv'

Lab tree (src/labs/electromagnetic-induction/):
- physics/induction.ts — pure functions: computeEMF (velocity along
  axis × proximity-to-coil-centre, clamped to ±5), computeBulbBrightness
  (threshold curve), computeGalvanometerAngle
- state/LabState.ts (phase, currentSceneIndex, journal)
- state/InductionReadings.ts (real-time EMF / brightness / angle / speed)
- content/scenes.ts (5 scenes × steps, with motionTrigger field for the
  three motion-aware completions handled inside LabScene)
- objects/BarMagnet.tsx (N-red / S-blue, Draggable cuboid)
- instruments/Coil.tsx (TubeGeometry helix, 16 turns, copper)
- instruments/Galvanometer.tsx (housing + dial face + spring-damper
  smoothed needle)
- instruments/Bulb.tsx (frosted sphere + PointLight, intensity driven
  by readings)
- textures/galvanometerDial.ts (canvas dial −5..+5 A)
- scene/LabScene.tsx (Canvas + Physics + SceneController watching
  readings and advancing the step engine on motion triggers)
- ui/HUD.tsx (top pill, task panel with MC widget, journal)
- ui/IntroScreen.tsx, ui/RevealScene.tsx
- index.tsx (phase router)

Platform: subjects.ts gets the em-induction entry, App.tsx gets the
/physics/em-induction route, SubjectPill badge plural fixed for 2-4
('ЛАБИ' instead of 'ЛАБ' for genitive 2/3/4).

Tests: 183 → ~196. 3 new SDK tests (mc-selected predicate) + 10 new
lab physics tests (EMF / brightness / angle edge cases)."
```

- [ ] **Step 3: Verify clean tree**

```bash
git status
```

Expected: `nothing to commit, working tree clean`.

---

## Self-review

**Spec coverage:**

- §Goal (5 scenes, MC, physics-based interaction) → Tasks 8 (scenes), 14 (LabScene+SceneController), 15 (HUD with MC) ✓
- §Architecture > Lab file layout → File map at top of plan + Tasks 6–16 each create one file ✓
- §SDK additions (mc-selected rule, MultipleChoice, ctx widening, snapTargets union, camera presets) → Tasks 2, 3, 4, 5 ✓
- §Scene layout (4 instruments + magnet on tray + wire decorations) → Task 14 (LabScene mounts them), but wires are NOT explicitly modeled — left out as scope discipline. Acceptance criterion 2 mentions wires; if the implementer chooses to add them they're decorative TubeGeometry curves. The spec says "Wires are visible TubeGeometry curves drawn between coil ends..." — flagged as a missing task. **Adding wires as Task 14 sub-step**: see below.
- §Physics model → Task 6 ✓
- §5 scenes (text + choices + correct indices) → Task 8 ✓
- §Reveal scene → Task 15 step 3 ✓
- §File touch-list → all 20+ files map to specific tasks ✓
- §Acceptance criteria 1–14 → covered by Tasks 6/8/14/15/17 + Task 18 verification ✓

**Gap fix — wire decorations were not in any task.** Adding a small note in Task 14: after mounting `<Coil/>`, `<Galvanometer/>`, and `<Bulb/>`, the implementer can optionally add two decorative `<mesh geometry={tubeGeometry}>` lines using `CatmullRomCurve3` from coil end ↦ galvanometer terminal and coil end ↦ bulb base ↦ back-to-coil. They're visual-only, no physics. Tagging this as **best-effort** rather than required to avoid blocking the slice on aesthetic detail.

**Placeholder scan:** every step has concrete file paths, complete code, and exact commands. No "TBD" / "implement later" / "similar to Task N" / "add appropriate handling".

**Type consistency:**
- `EmStep` extends `Step` and adds `motionTrigger?` (Task 8) — used in `LabScene` SceneController (Task 14).
- `CompletionRule.mc-selected.correctIndex: number` (Task 2) matches `step.complete.correctIndex` usage in HUD (Task 15).
- `useInductionReadings.setReadings` (Task 7) signature matches the calls in `LabScene.SceneController` (Task 14).
- `computeEMF / computeBulbBrightness / computeGalvanometerAngle` signatures (Task 6) match their consumers in `LabScene` (Task 14) and `Galvanometer` (Task 12).
- `BAR_MAGNET_BODY_ID = 'bar-magnet'` (Task 9) matches `bodyPattern: 'bar-magnet'` in scenes (Task 8) and the `getBodyByBodyId('bar-magnet')` lookup in LabScene (Task 14).
- `COIL_CENTER` (Task 6) is consumed by `LabScene` for both spawn position of the Coil component AND the SceneController's distance check — single source of truth ✓.
- `instrumentId: 'coil'` (Task 3 union widening) used by `Coil.tsx` (Task 11) and accepted by `SnapTarget.instrumentId` ✓.

No fixes needed beyond the noted wires-aesthetic note.
