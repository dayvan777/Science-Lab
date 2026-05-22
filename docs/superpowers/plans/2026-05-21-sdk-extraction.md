# SDK Extraction (Safe Subset) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove byte-identical cross-lab duplication (SheetSection, the drag-collapse debounce), split the 419-line EM `LabScene.tsx`, and drop three `as unknown as` casts — all behavior-preserving.

**Architecture:** Two new SDK exports (`SheetSection`, `useForceCollapsed`) consumed by both labs; the EM `SceneController` moves to its own file; three isolated casts get typed alternatives. No logic changes — `tsc --noEmit` + `npm run build` + the 222-test gate + smoke-test guard against regressions.

**Tech Stack:** React 19, TypeScript (strict, `noUnusedLocals`), R3F, Rapier, Zustand. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-05-21-sdk-extraction-design.md` (commit `1f81ad6`).

**Branch:** `feat/sdk-extraction` (already created from `master` at `f2e1ef6`; spec commit `1f81ad6` on it).

**CRITICAL:** This is a pure refactor. Any behavioral change is a bug. When moving `SceneController` (Task 3), let `tsc --noEmit`'s `noUnusedLocals` errors drive which imports to prune from `LabScene.tsx` — don't guess.

---

## File Structure

3 new files, 7 modified.

| File | Responsibility |
|---|---|
| `src/sdk/ui/SheetSection.tsx` | NEW. Labelled section component for bottom sheets (extracted, byte-identical). |
| `src/sdk/ui/useForceCollapsed.ts` | NEW. Drag-collapse debounce hook (extracted). |
| `src/labs/electromagnetic-induction/scene/SceneController.tsx` | NEW. The `useFrame` physics-to-store bridge (moved out of EM LabScene). |
| `src/labs/electromagnetic-induction/scene/LabScene.tsx` | MODIFY. Drop local SheetSection + SceneController; import both; prune unused imports. |
| `src/labs/mass-measurement/scene/LabScene.tsx` | MODIFY. Drop local SheetSection; import it. |
| `src/labs/electromagnetic-induction/ui/HUD.tsx` | MODIFY. Replace inline debounce with `useForceCollapsed`. |
| `src/labs/mass-measurement/ui/HUD.tsx` | MODIFY. Same. |
| `src/sdk/physics/useDrag.ts` | MODIFY. `ev.nativeEvent.buttons`. |
| `src/sdk/object/Draggable.tsx` | MODIFY. `ThreeEvent<PointerEvent>` handler types; drop 2 casts. |
| `src/sdk/audio/SoundManager.ts` | MODIFY. Intersection-type cast. |

---

## Pre-flight

- [ ] **Step 0a: Confirm branch + clean tree**

Run: `git status` → `On branch feat/sdk-extraction`, clean. HEAD at `1f81ad6`.

- [ ] **Step 0b: Baseline test + types**

Run: `npm test -- --run` → `Tests 222 passed (222)`.
Run: `npx tsc --noEmit` → 0 errors.

---

## Task 1: SheetSection → SDK (Slice 1)

**Files:**
- Create: `src/sdk/ui/SheetSection.tsx`
- Modify: `src/labs/electromagnetic-induction/scene/LabScene.tsx`, `src/labs/mass-measurement/scene/LabScene.tsx`

- [ ] **Step 1.1: Create `src/sdk/ui/SheetSection.tsx`**

```tsx
import type { ReactNode } from 'react'

/**
 * A labelled section inside a BottomSheet — an uppercase caption above a
 * control slot. Shared by both labs' mobile settings sheets. Extracted from
 * the two LabScene files where it was byte-identical.
 */
export function SheetSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div
        style={{
          fontSize: 11,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: '#86868b',
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  )
}
```

- [ ] **Step 1.2: EM LabScene — remove local SheetSection, add import**

Open `src/labs/electromagnetic-induction/scene/LabScene.tsx`.

Delete the local definition at the bottom of the file:

```tsx
function SheetSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div
        style={{
          fontSize: 11,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: '#86868b',
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  )
}
```

Add this import after the `SheetTriggerButton` import (line ~16):

```ts
import { SheetSection } from '../../../sdk/ui/SheetSection'
```

Note: `type ReactNode` is imported on line 1 (`import { useEffect, useRef, useState, type ReactNode } from 'react'`). After removing the local SheetSection, `ReactNode` may be unused in this file — Task 3 also touches this file. Do NOT prune `ReactNode` here yet; the final prune happens after Task 3 when tsc shows the complete unused set. (If implementing Task 1 standalone and tsc flags `ReactNode` unused, remove the `, type ReactNode` from line 1.)

- [ ] **Step 1.3: Mass LabScene — remove local SheetSection, add import**

Open `src/labs/mass-measurement/scene/LabScene.tsx`. Delete the identical local `function SheetSection(...) { ... }` at the bottom of the file. Add near the other SDK UI imports:

```ts
import { SheetSection } from '../../../sdk/ui/SheetSection'
```

Mass LabScene's line 1 is `import { useEffect, useRef, useState, type ReactNode } from 'react'`. After removing the local SheetSection, if `ReactNode` is unused, change line 1 to `import { useEffect, useRef, useState } from 'react'`. Let tsc confirm.

- [ ] **Step 1.4: Type-check + build + test**

- `npx tsc --noEmit` — 0 errors (fix any unused `ReactNode` per the notes above).
- `npm run build` — succeeds.
- `npm test -- --run` — 222 passed.

- [ ] **Step 1.5: Commit**

```bash
git add src/sdk/ui/SheetSection.tsx \
        src/labs/electromagnetic-induction/scene/LabScene.tsx \
        src/labs/mass-measurement/scene/LabScene.tsx
git commit -m "$(cat <<'EOF'
refactor(sdk): extract SheetSection from both LabScenes

The labelled-section sheet helper was byte-identical at the bottom of
both LabScene files. Now a single src/sdk/ui/SheetSection.tsx export.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: useForceCollapsed → SDK hook (Slice 2)

**Files:**
- Create: `src/sdk/ui/useForceCollapsed.ts`
- Modify: `src/labs/electromagnetic-induction/ui/HUD.tsx`, `src/labs/mass-measurement/ui/HUD.tsx`

- [ ] **Step 2.1: Create `src/sdk/ui/useForceCollapsed.ts`**

```ts
import { useEffect, useState } from 'react'

/**
 * Returns true while a drag is in progress, with a grace period before
 * flipping back to false on release. Used by lab HUDs to auto-collapse
 * the task/journal panels during interaction (so the 3D scene is
 * unobstructed) without flickering when the student briefly releases and
 * re-grabs an object.
 *
 * @param draggingBodyId  non-null while a body is being dragged (from StepEngine).
 * @param graceMs         delay before re-expanding on release. Default 300.
 */
export function useForceCollapsed(draggingBodyId: string | null, graceMs = 300): boolean {
  const [forceCollapsed, setForceCollapsed] = useState(false)
  useEffect(() => {
    if (draggingBodyId !== null) {
      setForceCollapsed(true)
      return
    }
    const t = setTimeout(() => setForceCollapsed(false), graceMs)
    return () => clearTimeout(t)
  }, [draggingBodyId, graceMs])
  return forceCollapsed
}
```

- [ ] **Step 2.2: EM HUD — replace inline debounce**

Open `src/labs/electromagnetic-induction/ui/HUD.tsx`. Find the inline block:

```ts
  // Auto-collapse HUD panels while the student is actively dragging an
  // object. 300 ms grace period on the release so a quick re-grab does
  // not flicker the panel open/closed.
  const [forceCollapsed, setForceCollapsed] = useState(false)
  useEffect(() => {
    if (draggingBodyId !== null) {
      setForceCollapsed(true)
      return
    }
    const t = setTimeout(() => setForceCollapsed(false), 300)
    return () => clearTimeout(t)
  }, [draggingBodyId])
```

Replace with:

```ts
  // Auto-collapse HUD panels while the student is actively dragging an
  // object (300 ms grace on release to avoid flicker).
  const forceCollapsed = useForceCollapsed(draggingBodyId)
```

Add the import near the other SDK imports:

```ts
import { useForceCollapsed } from '../../../sdk/ui/useForceCollapsed'
```

Then: if `useState` is no longer used anywhere else in EM HUD, remove it from the `react` import on line 1 (`import { useEffect, useState } from 'react'` → `import { useEffect } from 'react'`). `useEffect` is still used (the `resetForTask` effect). Let tsc confirm which to prune.

- [ ] **Step 2.3: Mass HUD — replace inline debounce**

Open `src/labs/mass-measurement/ui/HUD.tsx`. Find the same inline block:

```ts
  // Auto-collapse HUD panels while the student is actively dragging an
  // object. 300 ms grace period on the release so a quick re-grab does
  // not flicker the panel open/closed.
  const [forceCollapsed, setForceCollapsed] = useState(false)
  useEffect(() => {
    if (draggingBodyId !== null) {
      setForceCollapsed(true)
      return
    }
    const t = setTimeout(() => setForceCollapsed(false), 300)
    return () => clearTimeout(t)
  }, [draggingBodyId])
```

Replace with:

```ts
  // Auto-collapse HUD panels while the student is actively dragging an
  // object (300 ms grace on release to avoid flicker).
  const forceCollapsed = useForceCollapsed(draggingBodyId)
```

Add the import:

```ts
import { useForceCollapsed } from '../../../sdk/ui/useForceCollapsed'
```

Mass HUD uses `useEffect` (resetForTask) and previously `useState` for forceCollapsed. After this change, if `useState` is unused, prune it from line 1. Let tsc confirm.

- [ ] **Step 2.4: Type-check + build + test**

- `npx tsc --noEmit` — 0 errors (prune unused `useState` per notes).
- `npm run build` — succeeds.
- `npm test -- --run` — 222 passed.

- [ ] **Step 2.5: Commit**

```bash
git add src/sdk/ui/useForceCollapsed.ts \
        src/labs/electromagnetic-induction/ui/HUD.tsx \
        src/labs/mass-measurement/ui/HUD.tsx
git commit -m "$(cat <<'EOF'
refactor(sdk): extract useForceCollapsed hook from both HUDs

The 300 ms drag-collapse debounce (useState + useEffect on
draggingBodyId) was duplicated verbatim in both HUDs. Now a single
src/sdk/ui/useForceCollapsed.ts hook; both HUDs call it.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: SceneController split (Slice 3)

**Files:**
- Create: `src/labs/electromagnetic-induction/scene/SceneController.tsx`
- Modify: `src/labs/electromagnetic-induction/scene/LabScene.tsx`

This is a verbatim MOVE of an existing function — do not rewrite its logic.

- [ ] **Step 3.1: Read the current `SceneController` function**

In `src/labs/electromagnetic-induction/scene/LabScene.tsx`, locate `function SceneController() { ... }` (starts around line 60 with its JSDoc, ends around line 205 with `return null` then `}`). Read its entire body — you'll move it verbatim.

- [ ] **Step 3.2: Create `src/labs/electromagnetic-induction/scene/SceneController.tsx`**

Create the new file with this import block (the exact set the function references), followed by the moved function prefixed with `export`:

```tsx
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

// <PASTE THE ENTIRE SceneController FUNCTION HERE, VERBATIM, PREFIXED WITH `export`>
// i.e. change `function SceneController()` to `export function SceneController()`
// Keep its JSDoc comment and full body unchanged.
```

After pasting, run `npx tsc --noEmit`. If it reports an import in THIS file is unused, remove it; if it reports a reference is undefined, add the matching import. The import set above is the expected one — tsc is the source of truth.

- [ ] **Step 3.3: EM LabScene — remove the function, add the import**

In `src/labs/electromagnetic-induction/scene/LabScene.tsx`:
1. Delete the entire `function SceneController() { ... }` definition (the one you read in 3.1).
2. Add the import near the other scene imports (e.g. after the `PinchZoomController` import, line ~18):

```ts
import { SceneController } from './SceneController'
```

3. The `<SceneController />` usage inside `<Physics>` in the JSX stays unchanged.

- [ ] **Step 3.4: Prune now-unused imports from EM LabScene (tsc-driven)**

Run `npx tsc --noEmit`. With `noUnusedLocals`, tsc will list every import in `LabScene.tsx` that was only used by the moved `SceneController`. Remove exactly those. The EXPECTED prune set (verify against tsc, don't blindly apply):
- Line 2: `import { Canvas, useFrame }` → `import { Canvas }` (`useFrame` was SceneController-only).
- Line 4: `import { Vector3, ACESFilmicToneMapping }` → `import { ACESFilmicToneMapping }` (`Vector3` was SceneController-only; `ACESFilmicToneMapping` stays — used by the Canvas `gl` prop).
- Line 19: `import { useStepEngine, isStepComplete }` → remove the whole line IF LabScene uses neither (expected: both were SceneController-only).
- Line 33: `import { useInductionReadings }` → remove (SceneController-only).
- Line 36: `import { computeEMF, computeBulbBrightness, computeGalvanometerAngle, COIL_CENTER, INFLUENCE_RADIUS }` → keep ONLY `COIL_CENTER` (used by `COIL_WORLD` const on line 46); remove the other four.
- Line 44: `import { findBodyByTag }` → remove (SceneController-only).
- Line 1: if `type ReactNode` is now unused (after Task 1 removed local SheetSection too), drop `, type ReactNode`.

Apply exactly what tsc flags. Re-run `npx tsc --noEmit` until 0 errors.

- [ ] **Step 3.5: Build + test**

- `npm run build` — succeeds.
- `npm test -- --run` — 222 passed.

- [ ] **Step 3.6: Commit**

```bash
git add src/labs/electromagnetic-induction/scene/SceneController.tsx \
        src/labs/electromagnetic-induction/scene/LabScene.tsx
git commit -m "$(cat <<'EOF'
refactor(em-induction): split SceneController into its own file

The ~140-line useFrame physics-to-store bridge (EMF/bulb/galvanometer
computation + the three motion-trigger step advances) moves out of the
419-line LabScene.tsx into scene/SceneController.tsx. Verbatim move;
LabScene imports it and mounts <SceneController/> inside <Physics> as
before. Unused imports pruned per tsc.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Type-safety casts (Slice 4)

**Files:**
- Modify: `src/sdk/physics/useDrag.ts`, `src/sdk/object/Draggable.tsx`, `src/sdk/audio/SoundManager.ts`

- [ ] **Step 4.1: `useDrag.ts` — typed buttons access**

Open `src/sdk/physics/useDrag.ts`. Find (in `onPointerDown`, around line 118):

```ts
    if (ev.pointerType === 'mouse' && (ev as unknown as { buttons: number }).buttons === 0) return
```

Replace with:

```ts
    if (ev.pointerType === 'mouse' && ev.nativeEvent.buttons === 0) return
```

- [ ] **Step 4.2: `Draggable.tsx` — retype handlers, drop casts**

Open `src/sdk/object/Draggable.tsx`. Add a type import near the top (after the existing imports, around line 5):

```ts
import type { ThreeEvent } from '@react-three/fiber'
```

Find:

```ts
  const onPointerDown = (ev: React.PointerEvent) => {
    if (!enabled) return  // BLOCK pickup when not the active object
    if (bodyId) setDragging(bodyId)
    // Notify snap systems so they can release this body from any pan/platform tracking
    if (ref.current) notifyDragStart(ref.current)
    rawDown(ev as unknown as Parameters<typeof rawDown>[0])
  }

  const onPointerUp = (ev: React.PointerEvent) => {
    if (bodyId) setDragging(null)
    rawUp(ev as unknown as Parameters<typeof rawUp>[0])
  }
```

Replace with:

```ts
  const onPointerDown = (ev: ThreeEvent<PointerEvent>) => {
    if (!enabled) return  // BLOCK pickup when not the active object
    if (bodyId) setDragging(bodyId)
    // Notify snap systems so they can release this body from any pan/platform tracking
    if (ref.current) notifyDragStart(ref.current)
    rawDown(ev)
  }

  const onPointerUp = (ev: ThreeEvent<PointerEvent>) => {
    if (bodyId) setDragging(null)
    rawUp(ev)
  }
```

(`rawDown`/`rawUp` from `useDrag` already accept `ThreeEvent<PointerEvent>`. The `<group onPointerDown={onPointerDown} ...>` JSX is unchanged — R3F passes the matching event type.)

- [ ] **Step 4.3: `SoundManager.ts` — intersection-type cast**

Open `src/sdk/audio/SoundManager.ts`. Find (around line 41):

```ts
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
```

Replace with:

```ts
    const w = window as Window & { webkitAudioContext?: typeof AudioContext }
    const Ctor = window.AudioContext ?? w.webkitAudioContext
```

- [ ] **Step 4.4: Verify no `as unknown as` remains in the three files**

Run a content check — confirm `as unknown as` is gone from all three:
`npx tsc --noEmit` (0 errors) is the primary gate. Additionally the implementer greps each of the three files for `as unknown as` and confirms zero matches.

- [ ] **Step 4.5: Build + test**

- `npm run build` — succeeds.
- `npm test -- --run` — 222 passed.

- [ ] **Step 4.6: Commit**

```bash
git add src/sdk/physics/useDrag.ts src/sdk/object/Draggable.tsx src/sdk/audio/SoundManager.ts
git commit -m "$(cat <<'EOF'
refactor(sdk): remove three `as unknown as` casts

useDrag reads ev.nativeEvent.buttons (typed) instead of casting the
synthetic event. Draggable types its pointer handlers as
ThreeEvent<PointerEvent> so it forwards to useDrag without casts.
SoundManager uses a typed intersection (Window & { webkitAudioContext })
for the Safari vendor prefix. No behavior change.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Verify + push + direct-merge to master (Slice 5)

**Files:** None modified. Verification + git only.

- [ ] **Step 5.1: Final type-check** — `npx tsc --noEmit` → 0 errors.
- [ ] **Step 5.2: Final build** — `npm run build` → succeeds, only pre-existing chunk-size warning.
- [ ] **Step 5.3: Final test** — `npm test -- --run` → `Tests 222 passed (222)`.
- [ ] **Step 5.4: Confirm no `as unknown as` left in the three Slice-4 files**

Use the Grep tool (or `git grep`) for `as unknown as` in `src/sdk/physics/useDrag.ts`, `src/sdk/object/Draggable.tsx`, `src/sdk/audio/SoundManager.ts` — expect zero matches.

- [ ] **Step 5.5: Sanity-check commit chain**

Run: `git log --oneline master..HEAD`

Expected (4 commits + spec):

```
<sha> refactor(sdk): remove three `as unknown as` casts
<sha> refactor(em-induction): split SceneController into its own file
<sha> refactor(sdk): extract useForceCollapsed hook from both HUDs
<sha> refactor(sdk): extract SheetSection from both LabScenes
1f81ad6 docs(specs): SDK extraction safe subset (PR-C)
```

- [ ] **Step 5.6: Push** — `git push -u origin feat/sdk-extraction`.

- [ ] **Step 5.7: Direct-merge to master**

```bash
git checkout master
git merge --no-ff feat/sdk-extraction -m "Merge feat/sdk-extraction: extract SheetSection + useForceCollapsed, split SceneController, drop unsafe casts"
git push origin master
```

- [ ] **Step 5.8: User smoke-test (after Vercel deploy, ~2 min)** — this is a pure refactor, so the goal is "NOTHING changed":

On `science-lab-phi.vercel.app`:
1. Both labs on phone: drag an object → task/journal panels collapse + re-expand ~300 ms after release (useForceCollapsed works).
2. Both labs: open ⚙ sheet → labelled sections render (SheetSection works).
3. EM lab: move the magnet near/through/away from the coil → galvanometer needle + bulb respond, and the slow/fast/leaving/stationary scene steps still advance (SceneController works).
4. Drag with mouse (desktop) and touch (phone); tap-to-focus the magnet still works (useDrag/Draggable typing).
5. Sounds play (tick/ding) including in Safari (SoundManager).

If anything behaves differently than before, the refactor broke behavior — entry point: SheetSection→Task 1, debounce→Task 2, magnet physics/steps→Task 3, drag/sound→Task 4.

---

## Self-Review Notes

**Spec coverage:**
- ✅ Slice 1 (SheetSection) — Task 1.
- ✅ Slice 2 (useForceCollapsed) — Task 2.
- ✅ Slice 3 (SceneController split) — Task 3.
- ✅ Slice 4 (3 type-safety casts) — Task 4.
- ✅ Slice 5 (verify + merge) — Task 5.
- ✅ "No behavior change" invariant emphasized in the header + Task 5.8.

**Placeholder scan:** The only intentional "paste here" directive is Task 3.2 (a verbatim function MOVE — re-typing 140 lines would risk transcription errors, so the plan instructs a copy-paste of the existing function and gives the exact import block + tsc-driven verification). Every other code step shows a full Find/Replace. No "TBD"/"implement later".

**Type consistency:**
- `SheetSection({ label, children }: { label: string; children: ReactNode })` defined once (Task 1.1), imported in both LabScenes (1.2, 1.3).
- `useForceCollapsed(draggingBodyId: string | null, graceMs = 300): boolean` defined once (Task 2.1), called as `useForceCollapsed(draggingBodyId)` in both HUDs (2.2, 2.3) — both already have `const draggingBodyId = useStepEngine(s => s.draggingBodyId)` in scope.
- `SceneController` exported (Task 3.2), imported + mounted in LabScene (3.3) — `<SceneController />` JSX unchanged.
- `ThreeEvent<PointerEvent>` (Task 4.2) matches what `useDrag`'s `rawDown`/`rawUp` accept.

**Pure refactor:** No test count change (222 → 222). tsc + build + the gate + smoke-test are the safety net; the plan emphasizes tsc-driven import pruning for the risky Task 3 move.

**Branch parallelism:** `feat/sdk-extraction` from fresh master (`f2e1ef6`) + spec commit (`1f81ad6`). No conflicting branches.

**Iteration order:** Task 1 (SheetSection) and Task 3 (SceneController) both touch EM LabScene but on disjoint regions (bottom-of-file helper vs the SceneController function); the import-prune in Task 3.4 accounts for Task 1 having already removed the local SheetSection (the `ReactNode` note). Tasks 2 + 4 are fully independent. Each task ends green on tsc + build + tests.
