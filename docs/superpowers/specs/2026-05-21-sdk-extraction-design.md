# SDK Extraction (Safe Subset) — Design

**Date:** 2026-05-21
**Status:** Approved-in-concept (user picked the "safe subset" scope; deferred LabCanvas / LabToolbar / useHudLayout to a future PR once a 3rd lab reveals the true shared interface)
**Scope:** PR-C of the audit follow-up. Extract the *byte-identical* cross-lab duplication into the SDK, split the oversized EM `LabScene.tsx`, and remove three isolated `as unknown as` casts. No behavior change.

## Background

The architecture audit found cross-lab duplication that will multiply when a third lab is added. This PR removes the duplication that is genuinely identical (so extracting it is a safe, mechanical de-dupe — not a speculative abstraction), plus two hygiene wins (splitting the 419-line EM `LabScene.tsx`, and removing three `as unknown as` casts).

Deliberately deferred (per the YAGNI principle — two consumers is a coincidence, three is a pattern): `LabCanvas`, `LabToolbar`, and `useHudLayout`. Those have real per-lab variance (different toolbar buttons, panel widths 360 vs 380) and touch the most interaction-critical, unit-test-free code. Extracting them now risks the wrong abstraction; they wait until a third lab shows the true shared interface.

Current duplication / debt being addressed:
- `SheetSection` — an identical 12-line presentational helper defined at the bottom of BOTH `LabScene.tsx` files (added inline during the mobile-sheet PR with a documented "extract at 3 consumers" note; we now have 2 and it's byte-identical).
- The 300 ms drag-collapse debounce (`useState` + `useEffect` reading `draggingBodyId`) duplicated verbatim in BOTH `HUD.tsx` files (added during mobile-polish-v2).
- EM `LabScene.tsx` is 419 lines and contains a self-contained ~140-line `SceneController` (a `useFrame` physics-to-store bridge) that has no reason to live in the same file as Canvas setup + toolbar JSX.
- Three `as unknown as` casts: `useDrag.ts` (reading `.buttons` off a synthetic event), `Draggable.tsx` (×2, forwarding pointer events to `useDrag`'s handlers), `SoundManager.ts` (Safari `webkitAudioContext` vendor prefix).

Safety net: 222 tests (physics math + state machines; R3F scenes / drag / HUD are NOT unit-tested), plus `npx tsc --noEmit`, `npm run build`, and a human smoke-test. Since this is a pure refactor, tsc + build + the existing test gate + smoke-test must show **no behavioral change**.

## Non-goals

- `LabCanvas` / `LabToolbar` / `useHudLayout` extraction (deferred to a post-3rd-lab PR).
- Any visual or behavioral change. This is a pure refactor.
- New unit tests (the extracted units are either presentational or thin logic; the 222-gate + tsc + build + smoke-test is the safety net). An optional test for `useForceCollapsed` is allowed if trivial, but not required.
- Touching mass-measurement's physics-to-store path (it has no `SceneController`; instruments push readings directly).
- Renaming any existing exported symbol consumed outside the touched files.

## Architecture

Branch `feat/sdk-extraction` from `master` at commit `f2e1ef6`. Five slices, single merge.

| Slice | Files |
|---|---|
| **1** — SheetSection → SDK | `src/sdk/ui/SheetSection.tsx` (new), both `LabScene.tsx` (remove local def + import) |
| **2** — useForceCollapsed → SDK hook | `src/sdk/ui/useForceCollapsed.ts` (new), both `HUD.tsx` (replace inline effect) |
| **3** — SceneController split | `src/labs/electromagnetic-induction/scene/SceneController.tsx` (new), EM `LabScene.tsx` (remove def + import) |
| **4** — Type-safety casts | `src/sdk/physics/useDrag.ts`, `src/sdk/object/Draggable.tsx`, `src/sdk/audio/SoundManager.ts` |
| **5** — Verify + merge | none |

3 new files, 7 modified. ~250 lines moved/changed, near-zero net new logic.

---

## Slice 1 — SheetSection → SDK

**Files:** `src/sdk/ui/SheetSection.tsx` (new); `src/labs/electromagnetic-induction/scene/LabScene.tsx`, `src/labs/mass-measurement/scene/LabScene.tsx` (modify)

### New file

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

### Both LabScenes

In each `LabScene.tsx`:
1. Remove the local `function SheetSection(...) { ... }` definition at the bottom of the file.
2. Add `import { SheetSection } from '../../../sdk/ui/SheetSection'` near the other SDK UI imports.
3. If a now-unused `type ReactNode` import remains (it was added for the local `SheetSection`), remove it — unless `ReactNode` is still used elsewhere in the file. (tsc's `noUnusedLocals` will flag it; verify per file.)

### Acceptance

1. `SheetSection` is exported once from `src/sdk/ui/SheetSection.tsx`.
2. Neither `LabScene.tsx` defines a local `SheetSection`.
3. The mobile settings sheets render identically (same label caption + control layout).
4. tsc clean (no unused `ReactNode` import left behind).

---

## Slice 2 — useForceCollapsed → SDK hook

**Files:** `src/sdk/ui/useForceCollapsed.ts` (new); `src/labs/electromagnetic-induction/ui/HUD.tsx`, `src/labs/mass-measurement/ui/HUD.tsx` (modify)

### New file

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

### Both HUDs

In each `HUD.tsx`:
1. Keep the existing `const draggingBodyId = useStepEngine(s => s.draggingBodyId)` selector.
2. Replace the inline block:

```ts
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

with:

```ts
  const forceCollapsed = useForceCollapsed(draggingBodyId)
```

3. Add `import { useForceCollapsed } from '../../../sdk/ui/useForceCollapsed'`.
4. Remove now-unused imports: if `useState` / `useEffect` are no longer used elsewhere in the file, drop them from the `react` import. (Both HUDs use `useEffect` for `resetForTask` — so `useEffect` likely stays; `useState` may become unused in EM HUD — verify per file via tsc.)

### Acceptance

1. `useForceCollapsed` is exported once; both HUDs consume it.
2. The 300 ms debounce behavior is unchanged (panels collapse on drag, re-expand 300 ms after release).
3. Neither HUD has the inline `setForceCollapsed` effect anymore.
4. tsc clean (no unused `useState`/`useEffect` imports).

---

## Slice 3 — SceneController split

**Files:** `src/labs/electromagnetic-induction/scene/SceneController.tsx` (new); `src/labs/electromagnetic-induction/scene/LabScene.tsx` (modify)

`SceneController` is the `function SceneController()` currently inside EM `LabScene.tsx` (≈ lines 62–205). It's a headless `useFrame` component that reads the active magnet's position/velocity, computes EMF/bulb/galvanometer, pushes to the readings store, and drives the three motion-trigger step advances.

### Move

1. Create `src/labs/electromagnetic-induction/scene/SceneController.tsx`.
2. Move the entire `function SceneController() { ... }` body into it, changing it to `export function SceneController()`.
3. Move ONLY the imports `SceneController` needs into the new file. Based on the function body, those are:
   - `useEffect`, `useRef` from `react`
   - `useFrame` from `@react-three/fiber`
   - `Vector3` from `three`
   - `useStepEngine`, `isStepComplete` from `../../../sdk/guided/StepEngine`
   - `findBodyByTag` from `../../../sdk/physics/bodyRegistry`
   - `useLabState` from `../state/LabState`
   - `useInductionReadings` from `../state/InductionReadings`
   - `useLabSettings` from `../state/LabSettingsState`
   - `SCENES` from `../content/scenes`
   - `computeEMF`, `computeBulbBrightness`, `computeGalvanometerAngle`, `COIL_CENTER`, `INFLUENCE_RADIUS` from `../physics/induction`

   (The implementer confirms the exact import set by reading the function body — these are what it references. Any import that is now used ONLY by `SceneController` moves out of `LabScene.tsx`; any still used by `LabScene` stays.)
4. In `LabScene.tsx`: delete the `function SceneController()` definition, add `import { SceneController } from './SceneController'`, and prune imports that are now only used by the moved code (tsc's `noUnusedLocals` flags them).

### Acceptance

1. `SceneController` lives in its own file, exported, mounted unchanged in `LabScene` (`<SceneController />` inside `<Physics>`).
2. EM `LabScene.tsx` drops below ~290 lines.
3. The lab behaves identically: motion triggers (magnet-near-coil / leaving / stationary) fire as before; readings update.
4. tsc clean (no unused imports in either file).

---

## Slice 4 — Type-safety casts

**Files:** `src/sdk/physics/useDrag.ts`, `src/sdk/object/Draggable.tsx`, `src/sdk/audio/SoundManager.ts`

### 4A — `useDrag.ts`

Find the mouse-button guard in `onPointerDown` (around line 118):

```ts
    if (ev.pointerType === 'mouse' && (ev as unknown as { buttons: number }).buttons === 0) return
```

Replace with (read `.buttons` off the typed native event):

```ts
    if (ev.pointerType === 'mouse' && ev.nativeEvent.buttons === 0) return
```

(`ev` is `ThreeEvent<PointerEvent>`; `ev.nativeEvent` is `PointerEvent`, which has a typed `buttons: number`.)

### 4B — `Draggable.tsx`

The root cause is the wrong parameter type. R3F's `<group onPointerDown>` provides a `ThreeEvent<PointerEvent>`, but the handlers are annotated `React.PointerEvent`, forcing the casts.

1. Add `ThreeEvent` to the fiber import. The file currently imports from `@react-three/rapier` and others; add:

```ts
import type { ThreeEvent } from '@react-three/fiber'
```

2. Change the handler signatures + drop the casts:

```ts
  const onPointerDown = (ev: ThreeEvent<PointerEvent>) => {
    if (!enabled) return  // BLOCK pickup when not the active object
    if (bodyId) setDragging(bodyId)
    if (ref.current) notifyDragStart(ref.current)
    rawDown(ev)
  }

  const onPointerUp = (ev: ThreeEvent<PointerEvent>) => {
    if (bodyId) setDragging(null)
    rawUp(ev)
  }
```

(`rawDown` / `rawUp` from `useDrag` already expect `ThreeEvent<PointerEvent>`, so no cast is needed once `ev` is typed correctly. The `<group>` JSX is unchanged — R3F passes the matching event type.)

### 4C — `SoundManager.ts`

Find (around line 41):

```ts
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
```

Replace with an intersection-type cast (no `unknown` laundering):

```ts
    const w = window as Window & { webkitAudioContext?: typeof AudioContext }
    const Ctor = window.AudioContext ?? w.webkitAudioContext
```

### Acceptance

1. No `as unknown as` remains in any of the three files (`grep` confirms).
2. `useDrag` mouse-button guard reads `ev.nativeEvent.buttons`.
3. `Draggable` handlers are typed `ThreeEvent<PointerEvent>` and pass `ev` directly to `rawDown`/`rawUp`.
4. `SoundManager` uses a typed intersection cast for the Safari prefix.
5. Drag (mouse + touch), tap-to-focus, and sound playback all work unchanged; tsc clean.

---

## Slice 5 — Verify + merge

No file changes. `npx tsc --noEmit` (0 errors), `npm run build` (success), `npm test -- --run` (222 passing — pure refactor, no test count change), commit-chain sanity, push, direct-merge to master, user smoke-test.

---

## File touch-list

| File | Slice | Change |
|---|---|---|
| `src/sdk/ui/SheetSection.tsx` | 1 | NEW — extracted presentational component. |
| `src/labs/electromagnetic-induction/scene/LabScene.tsx` | 1 + 3 | Remove local SheetSection; import it. Remove SceneController; import it. Prune unused imports. |
| `src/labs/mass-measurement/scene/LabScene.tsx` | 1 | Remove local SheetSection; import it. Prune unused `ReactNode` if applicable. |
| `src/sdk/ui/useForceCollapsed.ts` | 2 | NEW — extracted hook. |
| `src/labs/electromagnetic-induction/ui/HUD.tsx` | 2 | Replace inline debounce with `useForceCollapsed`; prune unused imports. |
| `src/labs/mass-measurement/ui/HUD.tsx` | 2 | Same. |
| `src/labs/electromagnetic-induction/scene/SceneController.tsx` | 3 | NEW — moved physics-to-store bridge. |
| `src/sdk/physics/useDrag.ts` | 4 | `ev.nativeEvent.buttons`. |
| `src/sdk/object/Draggable.tsx` | 4 | `ThreeEvent<PointerEvent>` handler types; drop 2 casts. |
| `src/sdk/audio/SoundManager.ts` | 4 | Intersection-type cast. |

3 new, 7 modified.

## Testing strategy

The 222-test suite is the regression gate (pure refactor — no test count change). `npx tsc --noEmit` + `npm run build` must stay clean and are the primary safety net for the R3F/HUD code that has no unit coverage. Human smoke-test after deploy:

1. Both labs on phone: drag an object → task/journal panels collapse, re-expand ~300 ms after release (useForceCollapsed unchanged).
2. Both labs: open the ⚙ settings sheet → labelled sections render (SheetSection unchanged).
3. EM lab: move the magnet near/through/away from the coil → galvanometer + bulb respond; the three motion-trigger steps still advance (SceneController unchanged).
4. Drag with mouse on desktop + touch on phone (useDrag/Draggable typing change — verify no drag regression).
5. Sound: tick on toggles, ding on success (SoundManager change — verify audio still inits, incl. Safari).

## Risks

- **SceneController import-pruning mistakes.** Moving 140 lines means splitting the import set between two files. tsc's `noUnusedLocals` catches both leftover (in LabScene) and missing (in SceneController) imports. The plan instructs the implementer to let tsc drive the prune. Low residual risk.
- **`ev.nativeEvent.buttons` differs from the cast.** The old cast read `.buttons` off the synthetic ThreeEvent; the new code reads it off `nativeEvent`. ThreeEvent forwards native properties, so both resolve to the same number at runtime — `nativeEvent.buttons` is the typed, canonical source. Verified by the mouse-drag smoke-test.
- **`Draggable` handler retype.** If R3F's `group` onPointerDown type isn't exactly `ThreeEvent<PointerEvent>`, tsc fails at the JSX assignment — caught at compile time, not runtime. The `<group>` JSX is otherwise unchanged.
- **Unused-import churn.** Removing the inline effects/components leaves some imports unused; pruning them is required for tsc to pass. The plan flags each spot.
- **No behavioral change is the whole point** — any smoke-test regression means the refactor wasn't behavior-preserving and must be reverted/fixed at the offending slice.

## Out of scope

- `LabCanvas`, `LabToolbar`, `useHudLayout` (deferred).
- Any visual/behavioral change.
- Mass-measurement physics-to-store path.
- New tests beyond the optional `useForceCollapsed` one.

## Self-review checklist

- [x] Every slice has concrete acceptance criteria.
- [x] Internally consistent — each extraction is independent; EM LabScene is touched by Slices 1 and 3 but on different code regions (bottom-of-file SheetSection vs the SceneController function).
- [x] No "TBD" / "TODO" / placeholder text.
- [x] File touch-list matches the slices.
- [x] Existing tests NOT modified; 222 regression gate; pure refactor.
- [x] No new dependencies.
- [x] User's "safe subset" scope respected; deferred items explicit with the YAGNI rationale.
- [x] Risks cover import-pruning, the nativeEvent.buttons equivalence, the Draggable retype, and the "no behavior change" invariant.
- [x] Out-of-scope explicit.
