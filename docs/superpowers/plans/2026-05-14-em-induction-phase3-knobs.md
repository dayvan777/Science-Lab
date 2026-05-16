# EM Induction Phase 3 — Turns + Magnet Strength Knobs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two cycle-pill buttons to the EM induction lab so students can change the coil's turn count (3/5/10/20, default 10) and the magnet's strength (weak/normal/strong, default normal). EMF scales linearly with both; field-line opacity scales with magnet strength; coil geometry rebuilds when turns change.

**Architecture:** Extend the existing single-boolean visual-state store into a multi-field "lab settings" store (renamed). `computeEMF` accepts two new scalar arguments. `Coil.tsx` takes `turns` as a prop and rebuilds its TubeGeometry on change. `FieldLines.tsx` takes `opacityScale`. Two new pill components mirror the existing `FieldToggleButton` pattern (one-tap cycle, plays tick sound, persists via Zustand).

**Tech Stack:** React 19, TypeScript, Vite, @react-three/fiber, Three.js (`TubeGeometry`, `CatmullRomCurve3`), Zustand 5 + `zustand/middleware` persist, Vitest. All changes are lab-local; the SDK is not touched.

**Spec:** `docs/superpowers/specs/2026-05-14-em-induction-phase3-knobs-design.md` (commit `0e2096a`).

**Branch:** `feat/em-induction-phase3-knobs` (from `master` at commit `0e2096a`).

---

## File Structure

Every change is inside `src/labs/electromagnetic-induction/` or `tests/labs/`. No SDK file is touched.

| File | Change |
|---|---|
| `src/labs/electromagnetic-induction/state/VisualState.ts` | **DELETE** — replaced by `LabSettingsState.ts`. |
| `src/labs/electromagnetic-induction/state/LabSettingsState.ts` | **NEW** — `fieldVisible` + `coilTurns` + `magnetStrength` + setters/cyclers. Persisted under `'em-induction.lab-settings'`. |
| `src/labs/electromagnetic-induction/ui/FieldToggleButton.tsx` | **MODIFY** — swap import `useVisualState` → `useLabSettings`. |
| `src/labs/electromagnetic-induction/ui/CoilTurnsButton.tsx` | **NEW** — pill displaying `Витки: <N>`, cycles `3→5→10→20`. |
| `src/labs/electromagnetic-induction/ui/MagnetStrengthButton.tsx` | **NEW** — pill displaying `Магніт: <label>`, cycles weak→normal→strong. |
| `src/labs/electromagnetic-induction/instruments/Coil.tsx` | **MODIFY** — replace `COIL_TURNS = 16` with `DEFAULT_COIL_TURNS = 10`. Add `turns` prop. `buildCoilGeometry(turns)`. `useMemo` deps `[turns]`. |
| `src/labs/electromagnetic-induction/instruments/FieldLines.tsx` | **MODIFY** — add `opacityScale` prop, multiply lerp target by it. |
| `src/labs/electromagnetic-induction/instruments/CurrentArrows.tsx` | **MODIFY** — already accepts `coilTurns` as a prop; no internal change. Updated import path only if needed. |
| `src/labs/electromagnetic-induction/physics/induction.ts` | **MODIFY** — `computeEMF` gains `turns` + `strengthMultiplier` args. Export `DEFAULT_COIL_TURNS = 10`. Linear scale. |
| `src/labs/electromagnetic-induction/scene/LabScene.tsx` | **MODIFY** — import settings store + new pills + `DEFAULT_COIL_TURNS`. Read `coilTurns` + `magnetStrength` selectively. Pass `turns` to `<Coil>`, `coilTurns` to `<CurrentArrows>`, `opacityScale` to `<FieldLines>`. SceneController's `computeEMF` call adds the two new args. |
| `tests/labs/em-induction.test.ts` | **MODIFY** — update 9 existing `computeEMF` calls to pass `(pos, vel, DEFAULT_COIL_TURNS, 1.0)`. Add 2 new tests for linear scaling (turns + strength). Total 138 → 140. |

---

## Pre-flight

- [ ] **Step 0a: Confirm clean working tree**

Run: `git status`
Expected: `nothing to commit, working tree clean`. Current `HEAD` is `0e2096a` on `master`.

- [ ] **Step 0b: Create feature branch**

Run: `git checkout -b feat/em-induction-phase3-knobs`
Expected: `Switched to a new branch 'feat/em-induction-phase3-knobs'`

- [ ] **Step 0c: Baseline test run**

Run: `npm test -- --run`
Expected: 138 tests passing, 0 failures. Snapshot this number before changing anything.

---

## Task 1: Rename store + extend with new settings

**Files:**
- Delete: `src/labs/electromagnetic-induction/state/VisualState.ts`
- Create: `src/labs/electromagnetic-induction/state/LabSettingsState.ts`
- Modify: `src/labs/electromagnetic-induction/ui/FieldToggleButton.tsx`
- Modify: `src/labs/electromagnetic-induction/scene/LabScene.tsx` (just the import line)

The new store keeps `fieldVisible` for backwards continuity with Phase 2 and adds two new discrete fields plus their cycle-functions. Cycle order matches the spec.

- [ ] **Step 1.1: Create the new settings store file**

Create `src/labs/electromagnetic-induction/state/LabSettingsState.ts` with this exact content:

```ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Lab-local persisted settings. Three knobs:
 *   - `fieldVisible` — toggles magnetic-field-line + current-arrow rendering.
 *   - `coilTurns` — number of helix wraps in the coil. Discrete values
 *     3 / 5 / 10 / 20 cycle on the "Витки" pill. Affects both the coil's
 *     visual geometry and the EMF magnitude (linear scaling).
 *   - `magnetStrength` — discrete `'weak' | 'normal' | 'strong'` cycle on
 *     the "Магніт" pill. Affects EMF magnitude (×0.5 / ×1.0 / ×1.5) and the
 *     field-line opacity (faint / normal / bright).
 *
 * Persisted under `'em-induction.lab-settings'` (a fresh key — Phase 2's
 * `'em-induction.visual-state'` becomes a tiny orphan in localStorage, which
 * is acceptable per the spec).
 */
export type CoilTurns = 3 | 5 | 10 | 20
export type MagnetStrength = 'weak' | 'normal' | 'strong'

const COIL_TURNS_CYCLE: CoilTurns[] = [3, 5, 10, 20]
const MAGNET_STRENGTH_CYCLE: MagnetStrength[] = ['weak', 'normal', 'strong']

type LabSettings = {
  fieldVisible: boolean
  coilTurns: CoilTurns
  magnetStrength: MagnetStrength
  setFieldVisible: (v: boolean) => void
  cycleCoilTurns: () => void
  cycleMagnetStrength: () => void
}

export const useLabSettings = create<LabSettings>()(
  persist(
    (set, get) => ({
      fieldVisible: true,
      coilTurns: 10,
      magnetStrength: 'normal',
      setFieldVisible: (fieldVisible) => set({ fieldVisible }),
      cycleCoilTurns: () => {
        const idx = COIL_TURNS_CYCLE.indexOf(get().coilTurns)
        const next = COIL_TURNS_CYCLE[(idx + 1) % COIL_TURNS_CYCLE.length]
        set({ coilTurns: next })
      },
      cycleMagnetStrength: () => {
        const idx = MAGNET_STRENGTH_CYCLE.indexOf(get().magnetStrength)
        const next = MAGNET_STRENGTH_CYCLE[(idx + 1) % MAGNET_STRENGTH_CYCLE.length]
        set({ magnetStrength: next })
      },
    }),
    { name: 'em-induction.lab-settings' },
  ),
)
```

- [ ] **Step 1.2: Update FieldToggleButton import**

In `src/labs/electromagnetic-induction/ui/FieldToggleButton.tsx`, change:

```ts
import { useVisualState } from '../state/VisualState'
```

to:

```ts
import { useLabSettings } from '../state/LabSettingsState'
```

Then change both references inside the component (`useVisualState` → `useLabSettings`):

```ts
export function FieldToggleButton() {
  const fieldVisible = useLabSettings((s) => s.fieldVisible)
  const setFieldVisible = useLabSettings((s) => s.setFieldVisible)
  // ...rest unchanged
}
```

- [ ] **Step 1.3: Update LabScene import**

In `src/labs/electromagnetic-induction/scene/LabScene.tsx`, change line 28:

```ts
import { useVisualState } from '../state/VisualState'
```

to:

```ts
import { useLabSettings } from '../state/LabSettingsState'
```

And in line 188 of `LabScene` (inside the `LabScene` function body):

```ts
const fieldVisibleToggle = useVisualState((s) => s.fieldVisible)
```

becomes:

```ts
const fieldVisibleToggle = useLabSettings((s) => s.fieldVisible)
```

- [ ] **Step 1.4: Delete the old store file**

Run: `git rm src/labs/electromagnetic-induction/state/VisualState.ts`
Expected: file removed from index.

- [ ] **Step 1.5: Type-check + test**

Run: `npx tsc --noEmit`
Expected: 0 errors.

Run: `npm test -- --run`
Expected: 138 tests passing, no new failures.

- [ ] **Step 1.6: Commit**

```bash
git add -A
git commit -m "refactor(em-induction): rename VisualState→LabSettingsState + add turns/strength fields"
```

---

## Task 2: Extend computeEMF signature with TDD

**Files:**
- Modify: `tests/labs/em-induction.test.ts`
- Modify: `src/labs/electromagnetic-induction/physics/induction.ts`
- Modify: `src/labs/electromagnetic-induction/scene/LabScene.tsx` (SceneController's `computeEMF` call)

This is the one task with a clean TDD surface. The new signature requires `(pos, vel, turns, strengthMultiplier)`. Linear scaling means doubling `turns` doubles EMF, and `strengthMultiplier` of 1.5 yields 1.5× EMF.

- [ ] **Step 2.1: Write the failing tests**

In `tests/labs/em-induction.test.ts`, modify the imports at line 3-10 to include `DEFAULT_COIL_TURNS`:

```ts
import {
  computeEMF,
  computeBulbBrightness,
  computeGalvanometerAngle,
  COIL_CENTER,
  EMF_MAX,
  BULB_THRESHOLD,
  DEFAULT_COIL_TURNS,
} from '../../src/labs/electromagnetic-induction/physics/induction'
```

Then update every existing `computeEMF(...)` call in the file to pass two more args. Current call sites (5 in total inside the `describe('computeEMF', ...)` block):

```ts
// Line 16
expect(computeEMF(pos, vel)).toBe(0)
// Line 22
expect(computeEMF(pos, vel)).toBe(0)
// Line 28
const emf = computeEMF(pos, vel)
// Line 35
const emf = computeEMF(pos, vel)
// Line 42-43
expect(computeEMF(pos, fast)).toBe(EMF_MAX)
expect(computeEMF(pos, new Vector3(-100, 0, 0))).toBe(-EMF_MAX)
```

Replace each with `(pos, vel, DEFAULT_COIL_TURNS, 1.0)` / `(pos, fast, DEFAULT_COIL_TURNS, 1.0)` / `(pos, new Vector3(-100, 0, 0), DEFAULT_COIL_TURNS, 1.0)`:

```ts
// in 'stationary magnet inside the coil produces zero EMF':
expect(computeEMF(pos, vel, DEFAULT_COIL_TURNS, 1.0)).toBe(0)

// in 'magnet far away produces zero EMF regardless of speed':
expect(computeEMF(pos, vel, DEFAULT_COIL_TURNS, 1.0)).toBe(0)

// in 'positive x-velocity inside coil → positive EMF':
const emf = computeEMF(pos, vel, DEFAULT_COIL_TURNS, 1.0)

// in 'negative x-velocity inside coil → negative EMF (Lenz)':
const emf = computeEMF(pos, vel, DEFAULT_COIL_TURNS, 1.0)

// in 'EMF clamps at ±EMF_MAX even for very fast motion':
expect(computeEMF(pos, fast, DEFAULT_COIL_TURNS, 1.0)).toBe(EMF_MAX)
expect(computeEMF(pos, new Vector3(-100, 0, 0), DEFAULT_COIL_TURNS, 1.0)).toBe(-EMF_MAX)
```

Then append the two new test cases at the end of the `describe('computeEMF', ...)` block (after line 44 closing brace `})`):

```ts
  it('more turns → proportionally more EMF (Faraday: EMF ∝ N)', () => {
    const pos = COIL_CENTER.clone()
    // Use a moderate velocity that won't hit the EMF_MAX clamp at 20 turns
    const vel = new Vector3(0.1, 0, 0)
    const emfFew = computeEMF(pos, vel, 5, 1.0)
    const emfMany = computeEMF(pos, vel, 20, 1.0)
    // 20 turns / 5 turns = 4× scaling
    expect(emfMany).toBeCloseTo(emfFew * 4, 4)
  })

  it('stronger magnet → proportionally more EMF', () => {
    const pos = COIL_CENTER.clone()
    const vel = new Vector3(0.1, 0, 0)
    const emfNormal = computeEMF(pos, vel, DEFAULT_COIL_TURNS, 1.0)
    const emfStrong = computeEMF(pos, vel, DEFAULT_COIL_TURNS, 1.5)
    const emfWeak = computeEMF(pos, vel, DEFAULT_COIL_TURNS, 0.5)
    expect(emfStrong).toBeCloseTo(emfNormal * 1.5, 4)
    expect(emfWeak).toBeCloseTo(emfNormal * 0.5, 4)
  })
```

- [ ] **Step 2.2: Run tests to verify they fail**

Run: `npm test -- --run`
Expected: tests fail to compile — TypeScript complains that `computeEMF` accepts 2 args, not 4, and that `DEFAULT_COIL_TURNS` is not an export. This is the "red" state.

- [ ] **Step 2.3: Update computeEMF signature + add DEFAULT_COIL_TURNS**

In `src/labs/electromagnetic-induction/physics/induction.ts`, update the file. Replace the existing `computeEMF` function (lines 56–67) and add `DEFAULT_COIL_TURNS` as a top-level export.

Add this constant near the other exported constants (after `BULB_MAX = 4.5` on line 31):

```ts
/**
 * Default number of helix wraps in the coil. `computeEMF` uses
 * `turns / DEFAULT_COIL_TURNS` as a linear gain — so at the default
 * (10 turns) the gain is 1.0 and matches Phase 2's EMF magnitudes.
 */
export const DEFAULT_COIL_TURNS = 10
```

Replace the `computeEMF` function body with:

```ts
export function computeEMF(
  magnetPos: Vector3,
  magnetVel: Vector3,
  turns: number,
  strengthMultiplier: number,
): number {
  _scratchOffset.subVectors(magnetPos, COIL_CENTER)
  const distance = _scratchOffset.length()
  if (distance > INFLUENCE_RADIUS) return 0
  const t = distance / INFLUENCE_RADIUS
  const proximity = 1 - t * t
  const velAlongAxis = magnetVel.dot(COIL_AXIS)
  const turnsScale = turns / DEFAULT_COIL_TURNS
  const emf = EMF_GAIN * velAlongAxis * proximity * turnsScale * strengthMultiplier
  return Math.max(-EMF_MAX, Math.min(EMF_MAX, emf))
}
```

- [ ] **Step 2.4: Update LabScene's SceneController to pass new args**

In `src/labs/electromagnetic-induction/scene/LabScene.tsx`, the `SceneController` function uses `computeEMF` at line 88. Update the call. First, inside `useFrame` (line 81 area), read settings via `getState()` to avoid re-renders, and compute the multiplier:

Replace line 88:

```ts
const emf = computeEMF(scratchPos.current, scratchVel.current)
```

with:

```ts
const settings = useLabSettings.getState()
const strengthMul =
  settings.magnetStrength === 'weak' ? 0.5
  : settings.magnetStrength === 'strong' ? 1.5
  : 1.0
const emf = computeEMF(scratchPos.current, scratchVel.current, settings.coilTurns, strengthMul)
```

- [ ] **Step 2.5: Run tests to verify they pass**

Run: `npm test -- --run`
Expected: 140 tests passing (138 + 2 new).

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 2.6: Commit**

```bash
git add -A
git commit -m "feat(em-induction): computeEMF scales with turns + magnet strength"
```

---

## Task 3: Refactor Coil.tsx to accept turns as a prop

**Files:**
- Modify: `src/labs/electromagnetic-induction/instruments/Coil.tsx`
- Modify: `src/labs/electromagnetic-induction/scene/LabScene.tsx`

The coil currently bakes `COIL_TURNS = 16` into the geometry once via `useMemo([])`. After this task, `turns` is a prop, the geometry rebuilds when it changes, and the old geometry is properly disposed.

The exported constant changes name: `COIL_TURNS` → `DEFAULT_COIL_TURNS`, and its value changes 16 → 10. This matches the physics module's `DEFAULT_COIL_TURNS`.

- [ ] **Step 3.1: Rewrite Coil.tsx**

Replace the full content of `src/labs/electromagnetic-induction/instruments/Coil.tsx` with:

```tsx
import { useMemo, useEffect } from 'react'
import { Vector3, TubeGeometry, CatmullRomCurve3 } from 'three'
import { Outlines } from '@react-three/drei'
import { registerSnap } from '../../../sdk/physics/snapTargets'

export const COIL_OUTER_RADIUS = 0.04   // 4 cm
export const COIL_TUBE_RADIUS = 0.0035  // copper wire thickness
export const COIL_LENGTH = 0.12         // 12 cm long along x
export const DEFAULT_COIL_TURNS = 10
export const COIL_SNAP_RADIUS = 0.10

type Props = {
  /** World position of the coil's CENTRE. */
  position: [number, number, number]
  /** Number of helix wraps. Drives geometry rebuild. */
  turns: number
  /** True when this lab is the active instrument — toggles highlight. */
  active?: boolean
}

function buildCoilGeometry(turns: number): TubeGeometry {
  const SEGMENTS = 96
  const points: Vector3[] = []
  for (let i = 0; i <= SEGMENTS; i++) {
    const t = i / SEGMENTS
    const angle = t * turns * Math.PI * 2
    const x = -COIL_LENGTH / 2 + t * COIL_LENGTH
    points.push(new Vector3(
      x,
      Math.sin(angle) * COIL_OUTER_RADIUS,
      Math.cos(angle) * COIL_OUTER_RADIUS,
    ))
  }
  const curve = new CatmullRomCurve3(points)
  return new TubeGeometry(curve, SEGMENTS * 2, COIL_TUBE_RADIUS, 6, false)
}

export function Coil({ position, turns, active = false }: Props) {
  const geometry = useMemo(() => buildCoilGeometry(turns), [turns])

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
      <mesh geometry={geometry}>
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

Key changes:
- `COIL_TURNS = 16` → `DEFAULT_COIL_TURNS = 10`.
- `buildCoilGeometry` takes `turns` as a parameter.
- `useMemo` deps on `[turns]` so geometry rebuilds when the prop changes.
- `useEffect` cleanup disposes the previous geometry when `geometry` is replaced.

- [ ] **Step 3.2: Update LabScene to pass turns**

In `src/labs/electromagnetic-induction/scene/LabScene.tsx`, find line 17:

```ts
import { Coil, COIL_LENGTH, COIL_OUTER_RADIUS, COIL_TURNS } from '../instruments/Coil'
```

Replace with:

```ts
import { Coil, COIL_LENGTH, COIL_OUTER_RADIUS, DEFAULT_COIL_TURNS } from '../instruments/Coil'
```

Inside the `LabScene` function body, after line 188 (`const fieldVisibleToggle = useLabSettings((s) => s.fieldVisible)`), add a selector for `coilTurns` and `magnetStrength`:

```ts
const coilTurns = useLabSettings((s) => s.coilTurns)
const magnetStrength = useLabSettings((s) => s.magnetStrength)
```

Find the `<Coil>` JSX (currently line 223):

```tsx
<Coil position={COIL_WORLD} />
```

Replace with:

```tsx
<Coil position={COIL_WORLD} turns={coilTurns} />
```

Find the `<CurrentArrows>` JSX (currently lines 224–230):

```tsx
<CurrentArrows
  coilWorld={COIL_WORLD}
  coilLength={COIL_LENGTH}
  coilOuterRadius={COIL_OUTER_RADIUS}
  coilTurns={COIL_TURNS}
  visible={fieldVisible}
/>
```

Replace `coilTurns={COIL_TURNS}` with `coilTurns={coilTurns}`:

```tsx
<CurrentArrows
  coilWorld={COIL_WORLD}
  coilLength={COIL_LENGTH}
  coilOuterRadius={COIL_OUTER_RADIUS}
  coilTurns={coilTurns}
  visible={fieldVisible}
/>
```

Note: `DEFAULT_COIL_TURNS` is now imported but not used in JSX — it's available for future references. Static analysis may flag it as unused. If TypeScript complains about the unused import, drop it for now and rely on the physics module's export. Leave the import only if it's still referenced somewhere; otherwise remove the `DEFAULT_COIL_TURNS` token from the destructure list.

The cleanest version of the import line (assuming `DEFAULT_COIL_TURNS` is NOT referenced elsewhere in LabScene) is:

```ts
import { Coil, COIL_LENGTH, COIL_OUTER_RADIUS } from '../instruments/Coil'
```

- [ ] **Step 3.3: Type-check + test**

Run: `npx tsc --noEmit`
Expected: 0 errors.

Run: `npm test -- --run`
Expected: 140 tests passing.

- [ ] **Step 3.4: Smoke-test build**

Run: `npm run build`
Expected: build succeeds, no errors.

- [ ] **Step 3.5: Commit**

```bash
git add -A
git commit -m "refactor(em-induction): coil turns becomes prop, rebuilds on change"
```

---

## Task 4: FieldLines opacityScale prop

**Files:**
- Modify: `src/labs/electromagnetic-induction/instruments/FieldLines.tsx`
- Modify: `src/labs/electromagnetic-induction/scene/LabScene.tsx`

The current FieldLines fades between `FIELD_OPACITY` (0.55) and 0 based on `visible`. We add `opacityScale` so the target opacity scales by 0.5 / 1.0 / 1.5 (weak / normal / strong magnet). The result is clamped to [0, 1] so a 1.5× boost on the already 0.55 ceiling reaches 0.825, well under 1.0 — no clamping in practice, but the clamp is correctness insurance.

- [ ] **Step 4.1: Add opacityScale prop to FieldLines**

In `src/labs/electromagnetic-induction/instruments/FieldLines.tsx`, update the `Props` type (currently lines 37–42):

```ts
type Props = {
  /** Body-id of the bar magnet (matches Draggable.bodyId). */
  magnetBodyId: string
  /** When false, the entire group fades to opacity 0 over ~250 ms. */
  visible: boolean
  /** Multiplier on the field-line opacity (e.g. 0.5 weak, 1.0 normal, 1.5 strong). */
  opacityScale: number
}
```

Update the function signature (line 66):

```ts
export function FieldLines({ magnetBodyId, visible, opacityScale }: Props) {
```

Update the `useFrame` callback (line 99). Replace:

```ts
const target = visible ? FIELD_OPACITY : 0
const step = Math.min(1, delta * FADE_STIFFNESS)
material.opacity += (target - material.opacity) * step
```

with:

```ts
const target = visible ? Math.min(1, FIELD_OPACITY * opacityScale) : 0
const step = Math.min(1, delta * FADE_STIFFNESS)
material.opacity += (target - material.opacity) * step
```

- [ ] **Step 4.2: Update LabScene to compute and pass opacityScale**

In `src/labs/electromagnetic-induction/scene/LabScene.tsx`, after the line where we already read `magnetStrength` (added in Task 3.2), derive `opacityScale`:

```ts
const opacityScale =
  magnetStrength === 'weak' ? 0.5
  : magnetStrength === 'strong' ? 1.5
  : 1.0
```

Find the `<FieldLines>` JSX (currently line 244):

```tsx
<FieldLines magnetBodyId={BAR_MAGNET_BODY_ID} visible={fieldVisible} />
```

Replace with:

```tsx
<FieldLines magnetBodyId={BAR_MAGNET_BODY_ID} visible={fieldVisible} opacityScale={opacityScale} />
```

- [ ] **Step 4.3: Type-check + test**

Run: `npx tsc --noEmit`
Expected: 0 errors.

Run: `npm test -- --run`
Expected: 140 tests passing.

- [ ] **Step 4.4: Commit**

```bash
git add -A
git commit -m "feat(em-induction): field-line opacity scales with magnet strength"
```

---

## Task 5: New CoilTurnsButton pill

**Files:**
- Create: `src/labs/electromagnetic-induction/ui/CoilTurnsButton.tsx`
- Modify: `src/labs/electromagnetic-induction/scene/LabScene.tsx`

A pill mirroring `FieldToggleButton`. Display text is `Витки: <N>`. Click cycles `3 → 5 → 10 → 20`, plays `tick` sound, persists.

- [ ] **Step 5.1: Create the button file**

Create `src/labs/electromagnetic-induction/ui/CoilTurnsButton.tsx` with this content:

```tsx
import { Button } from '../../../sdk/ui/Button'
import { sound } from '../../../sdk/audio/SoundManager'
import { useLabSettings } from '../state/LabSettingsState'

/**
 * Bottom-right HUD pill that cycles the coil's turn count
 * (3 → 5 → 10 → 20). Plays a tick sound on every click. Reads + writes
 * the persisted `useLabSettings.coilTurns` field.
 */
export function CoilTurnsButton() {
  const coilTurns = useLabSettings((s) => s.coilTurns)
  const cycleCoilTurns = useLabSettings((s) => s.cycleCoilTurns)

  const handleClick = () => {
    sound.play('tick')
    cycleCoilTurns()
  }

  const label = `Кількість витків котушки: ${coilTurns}`

  return (
    <Button
      variant="secondary"
      onClick={handleClick}
      aria-label={label}
      title={label}
    >
      {`Витки: ${coilTurns}`}
    </Button>
  )
}
```

- [ ] **Step 5.2: Mount the button in LabScene**

In `src/labs/electromagnetic-induction/scene/LabScene.tsx`, add an import near the other UI imports (around line 32):

```ts
import { CoilTurnsButton } from '../ui/CoilTurnsButton'
```

Then mount the button in the bottom-right control row. Find the existing block (around lines 257–267):

```tsx
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
```

Insert `<CoilTurnsButton />` immediately after `<FieldToggleButton />`:

```tsx
<ZoomControls />
<SoundToggle />
<FieldToggleButton />
<CoilTurnsButton />
<Button
  variant="secondary"
  onClick={() => respawnObjects()}
  aria-label="Скинути предмети"
  title="Скинути предмети"
>
  {isPhone ? '↻' : '↻ Скинути предмети'}
</Button>
```

- [ ] **Step 5.3: Type-check + test**

Run: `npx tsc --noEmit`
Expected: 0 errors.

Run: `npm test -- --run`
Expected: 140 tests passing.

- [ ] **Step 5.4: Commit**

```bash
git add -A
git commit -m "feat(em-induction): add Витки pill (cycles 3/5/10/20)"
```

---

## Task 6: New MagnetStrengthButton pill

**Files:**
- Create: `src/labs/electromagnetic-induction/ui/MagnetStrengthButton.tsx`
- Modify: `src/labs/electromagnetic-induction/scene/LabScene.tsx`

Same shape as `CoilTurnsButton`. Display text is `Магніт: Слаб.` / `Магніт: Звич.` / `Магніт: Сильн.` — abbreviated so the pill stays narrow. Click cycles `weak → normal → strong`, plays `tick` sound, persists.

- [ ] **Step 6.1: Create the button file**

Create `src/labs/electromagnetic-induction/ui/MagnetStrengthButton.tsx` with this content:

```tsx
import { Button } from '../../../sdk/ui/Button'
import { sound } from '../../../sdk/audio/SoundManager'
import { useLabSettings, type MagnetStrength } from '../state/LabSettingsState'

const PILL_LABEL: Record<MagnetStrength, string> = {
  weak: 'Слаб.',
  normal: 'Звич.',
  strong: 'Сильн.',
}

const ARIA_LABEL: Record<MagnetStrength, string> = {
  weak: 'Слабкий магніт',
  normal: 'Звичайний магніт',
  strong: 'Сильний магніт',
}

/**
 * Bottom-right HUD pill that cycles the magnet's strength
 * (weak → normal → strong). Plays a tick sound on every click. Reads +
 * writes the persisted `useLabSettings.magnetStrength` field.
 */
export function MagnetStrengthButton() {
  const magnetStrength = useLabSettings((s) => s.magnetStrength)
  const cycleMagnetStrength = useLabSettings((s) => s.cycleMagnetStrength)

  const handleClick = () => {
    sound.play('tick')
    cycleMagnetStrength()
  }

  return (
    <Button
      variant="secondary"
      onClick={handleClick}
      aria-label={ARIA_LABEL[magnetStrength]}
      title={ARIA_LABEL[magnetStrength]}
    >
      {`Магніт: ${PILL_LABEL[magnetStrength]}`}
    </Button>
  )
}
```

- [ ] **Step 6.2: Mount the button in LabScene**

In `src/labs/electromagnetic-induction/scene/LabScene.tsx`, add an import near the other UI imports:

```ts
import { MagnetStrengthButton } from '../ui/MagnetStrengthButton'
```

Insert `<MagnetStrengthButton />` after `<CoilTurnsButton />`:

```tsx
<ZoomControls />
<SoundToggle />
<FieldToggleButton />
<CoilTurnsButton />
<MagnetStrengthButton />
<Button
  variant="secondary"
  onClick={() => respawnObjects()}
  aria-label="Скинути предмети"
  title="Скинути предмети"
>
  {isPhone ? '↻' : '↻ Скинути предмети'}
</Button>
```

- [ ] **Step 6.3: Type-check + test**

Run: `npx tsc --noEmit`
Expected: 0 errors.

Run: `npm test -- --run`
Expected: 140 tests passing.

- [ ] **Step 6.4: Commit**

```bash
git add -A
git commit -m "feat(em-induction): add Магніт pill (cycles Слабкий/Звичайний/Сильний)"
```

---

## Task 7: Final verification

**Files:** None modified. Verification only.

- [ ] **Step 7.1: Full clean build + tests**

Run: `npx tsc --noEmit`
Expected: 0 errors.

Run: `npm run build`
Expected: build succeeds, no warnings about missing exports or unused imports.

Run: `npm test -- --run`
Expected: 140 tests passing, 0 failures, 0 skipped.

- [ ] **Step 7.2: Verify the persist key migration is benign**

Open browser DevTools → Application → Local Storage. Confirm the new key `em-induction.lab-settings` appears after first interaction. The old `em-induction.visual-state` (Phase 2) may still be present — it's a tiny orphan, acceptable per the spec.

- [ ] **Step 7.3: Live smoke-test acceptance criteria**

Run: `npm run dev` and open the EM induction lab in a browser. Navigate to Scene 2 (or beyond). Confirm:

1. Bottom-right row shows `⊟ Поле`, `Витки: 10`, `Магніт: Звич.` plus the existing controls.
2. Clicking `Витки: 10` cycles to `Витки: 20`, the helix visibly rebuilds with more wraps. Continue: 20 → 3 → 5 → 10.
3. Clicking `Магніт: Звич.` cycles to `Магніт: Сильн.` — field lines visibly brighter. Continue: Сильн. → Слаб. → Звич.
4. With strong magnet + 20 turns + fast drag, galvanometer needle saturates at ±max; bulb glows brightly.
5. With weak magnet + 3 turns + same drag speed, needle barely deflects; bulb stays dark.
6. Refresh the page → settings persist (last-clicked values).
7. Open the mass-measurement lab — confirm it still loads and works (Phase 3 was lab-local).

- [ ] **Step 7.4: Push the branch (no PR yet — user's call)**

Run: `git push -u origin feat/em-induction-phase3-knobs`
Expected: branch pushed to remote.

Stop here. Do NOT open a PR; the user will inspect the live preview and decide.

---

## Self-Review Notes

**Spec coverage check:**
- ✅ Two cycle-pills in HUD: Tasks 5 + 6.
- ✅ "Витки" cycles 3/5/10/20: Task 5 (default 10 in Task 1's store).
- ✅ "Магніт" cycles weak/normal/strong: Task 6.
- ✅ Store rename + extension: Task 1.
- ✅ Coil rebuild on turns change: Task 3.
- ✅ EMF linear scaling with turns + strength: Task 2.
- ✅ Field-line opacity scales with strength: Task 4.
- ✅ Persist key migration to `'em-induction.lab-settings'`: Task 1 (handled implicitly by Zustand's persist).
- ✅ Tests 138 → 140: Task 2 adds 2 tests + updates existing call sites.
- ✅ All lab-local; SDK untouched: confirmed by file structure section.

**Placeholder scan:** No TBDs, no "TODO", no "implement later". Every step shows the full code.

**Type consistency:** `CoilTurns` and `MagnetStrength` types are defined in Task 1 and used in Task 6's import. `DEFAULT_COIL_TURNS` is exported from `induction.ts` in Task 2 and from `Coil.tsx` in Task 3 — two different modules, same name, same value (10). Both are exported by name; the tests import from `induction.ts`; `LabScene` no longer imports `DEFAULT_COIL_TURNS` from `Coil.tsx` (it reads `coilTurns` from the settings store). The `Coil.tsx` export remains for completeness and future contributors.

**Commits:** 6 (one per task) + the verification task has no commit.
