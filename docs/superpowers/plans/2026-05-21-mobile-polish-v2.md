# Mobile Polish v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Two mobile UX fixes — HUD panels auto-collapse while the student drags an object so the 3D scene is unobstructed, and EM-induction journal entries display the friendly Ukrainian scene title instead of the developer step ID.

**Architecture:** Slice 1 adds a `forceCollapsed?: boolean` prop on `CollapsibleGlassPanel` and wires both labs' HUDs to flip it on/off based on `useStepEngine.draggingBodyId` with a 300 ms grace period. Slice 2 refactors the EM-induction `SCENES` constant to carry a `title` field, retitles `JournalEntry.sceneId → sceneTitle`, and tweaks `recordMCAnswer` to derive the title from the current scene index.

**Tech Stack:** React 19, TypeScript, Zustand. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-05-21-mobile-polish-v2-design.md` (commit `1ee1c62`).

**Branch:** `feat/mobile-polish-v2` (already created from `master` at commit `bde6940`; spec commit `1ee1c62` lives on it).

**Note on spec deviation:** The spec mentions bumping a Zustand persist `version` and adding a `migrate()`. Investigation of `src/labs/electromagnetic-induction/state/LabState.ts` shows it does NOT use `persist` middleware — journal is in-memory only. So no migration is needed; the JournalEntry shape change is a fresh-start refactor. The spec's "Persist migration" subsection is moot. Other slices unaffected.

---

## File Structure

6 files modified, 0 new.

| File | Responsibility |
|---|---|
| `src/sdk/ui/CollapsibleGlassPanel.tsx` | New optional prop `forceCollapsed?: boolean`. Gates rendering by `forceCollapsed || collapsed`; does NOT mutate persisted state. |
| `src/labs/electromagnetic-induction/ui/HUD.tsx` | Reads `useStepEngine.draggingBodyId`; 300 ms debounce → boolean → passes as `forceCollapsed` to both panels. Also updates journal rendering (`entry.sceneTitle`), MC callsite (`recordMCAnswer(idx)`), and step lookup pattern (`scene?.steps[stepIdx]`). |
| `src/labs/mass-measurement/ui/HUD.tsx` | Same debounce + `forceCollapsed` wiring as EM HUD. No journal/step changes (mass-measurement journal is already friendly). |
| `src/labs/electromagnetic-induction/content/scenes.ts` | `SCENES: EmStep[][]` → `SCENES: EmScene[]` where `EmScene = { title: string, steps: EmStep[] }`. 5 scenes get friendly Ukrainian titles. |
| `src/labs/electromagnetic-induction/state/LabState.ts` | `JournalEntry.sceneId: string` → `JournalEntry.sceneTitle: string`. `recordMCAnswer(sceneId, chosenIndex)` → `recordMCAnswer(chosenIndex)`. Implementation derives title from `SCENES[currentSceneIndex].title`. |
| `src/labs/electromagnetic-induction/scene/LabScene.tsx` | Update two `scene[currentStepIdx]` → `scene.steps[currentStepIdx]` accesses inside `SceneController`. |

---

## Pre-flight

- [ ] **Step 0a: Confirm on branch with clean tree**

Run: `git status`
Expected: `On branch feat/mobile-polish-v2`, working tree clean. HEAD at `1ee1c62`.

- [ ] **Step 0b: Baseline test run**

Run: `npm test -- --run`
Expected: `Tests 220 passed (220)`.

- [ ] **Step 0c: Baseline type-check**

Run: `npx tsc --noEmit`
Expected: 0 errors.

---

## Task 1: `CollapsibleGlassPanel.forceCollapsed`

**Files:**
- Modify: `src/sdk/ui/CollapsibleGlassPanel.tsx`

- [ ] **Step 1.1: Add the new prop to the `Props` type**

Find this block at the top of the file:

```ts
type Props = {
  /** Stable id used to persist collapsed state to localStorage. */
  storageKey: string
  /** Short label shown on the collapsed pill (sr-only when an icon is given). */
  label: string
  /** Optional icon shown on the collapsed pill. Defaults to '+'. */
  collapsedIcon?: string
  /** Default collapsed state on first mount (overridden by localStorage). */
  defaultCollapsed?: boolean
  /** Outer panel style (when expanded). */
  style?: CSSProperties
  /** Inline style for the collapsed pill — override position to keep it
   *  in the same corner as the expanded panel. */
  collapsedStyle?: CSSProperties
  /** ARIA region label id (the element with this id labels the panel). */
  'aria-labelledby'?: string
  children: ReactNode
}
```

Replace with (one new prop added, between `aria-labelledby` and `children`):

```ts
type Props = {
  /** Stable id used to persist collapsed state to localStorage. */
  storageKey: string
  /** Short label shown on the collapsed pill (sr-only when an icon is given). */
  label: string
  /** Optional icon shown on the collapsed pill. Defaults to '+'. */
  collapsedIcon?: string
  /** Default collapsed state on first mount (overridden by localStorage). */
  defaultCollapsed?: boolean
  /** Outer panel style (when expanded). */
  style?: CSSProperties
  /** Inline style for the collapsed pill — override position to keep it
   *  in the same corner as the expanded panel. */
  collapsedStyle?: CSSProperties
  /** ARIA region label id (the element with this id labels the panel). */
  'aria-labelledby'?: string
  /**
   * External override — render the collapsed pill even when the persisted
   * state is "expanded". Used by labs to hide HUD panels while the student
   * is actively dragging an object. Does NOT mutate persistence.
   */
  forceCollapsed?: boolean
  children: ReactNode
}
```

- [ ] **Step 1.2: Destructure the new prop**

Find the destructure block in the component signature:

```ts
export function CollapsibleGlassPanel({
  storageKey,
  label,
  collapsedIcon = '+',
  defaultCollapsed = false,
  style,
  collapsedStyle,
  children,
  'aria-labelledby': ariaLabelledBy,
}: Props) {
```

Replace with:

```ts
export function CollapsibleGlassPanel({
  storageKey,
  label,
  collapsedIcon = '+',
  defaultCollapsed = false,
  style,
  collapsedStyle,
  children,
  'aria-labelledby': ariaLabelledBy,
  forceCollapsed = false,
}: Props) {
```

- [ ] **Step 1.3: Gate the collapsed-render branch by `forceCollapsed || collapsed`**

Find this line inside the component body:

```ts
  if (collapsed) {
```

Replace with:

```ts
  const showCollapsed = forceCollapsed || collapsed
  if (showCollapsed) {
```

The rest of the file is unchanged. The pill's `onClick` continues to call `setCollapsed(false)` — preserving the user's intent in localStorage even when `forceCollapsed` is `true`.

- [ ] **Step 1.4: Type-check**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 1.5: Build**

Run: `npm run build`
Expected: build succeeds (only pre-existing chunk-size warning).

- [ ] **Step 1.6: Test (regression gate)**

Run: `npm test -- --run`
Expected: `Tests 220 passed (220)`.

- [ ] **Step 1.7: Commit**

```bash
git add src/sdk/ui/CollapsibleGlassPanel.tsx
git commit -m "$(cat <<'EOF'
feat(sdk): CollapsibleGlassPanel — add forceCollapsed external override

New optional prop. When true, renders the collapsed pill regardless of
the internal persisted state. The internal state and localStorage entry
are NOT touched. When forceCollapsed flips back to false, the panel
returns to whatever the user persisted.

Used in the next commits by both lab HUDs to hide the task/journal
panels while the student is actively dragging an object on phone.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: EM induction HUD — auto-collapse wiring

**Files:**
- Modify: `src/labs/electromagnetic-induction/ui/HUD.tsx`

- [ ] **Step 2.1: Extend the react import on line 1**

Find on line 1:

```ts
import { useEffect } from 'react'
```

Replace with:

```ts
import { useEffect, useState } from 'react'
```

- [ ] **Step 2.2: Add the debounce hook inside `HUD()`**

Find this block near the top of `HUD()` (currently the section that pulls Zustand selectors):

```ts
  const phase = useLabState(s => s.phase)
  const sceneIdx = useLabState(s => s.currentSceneIndex)
  const recordMCAnswer = useLabState(s => s.recordMCAnswer)
  const advanceScene = useLabState(s => s.advanceScene)
  const journal = useLabState(s => s.journal)
  const stepIdx = useStepEngine(s => s.currentStepIndex)
  const setLastMCChoice = useStepEngine(s => s.setLastMCChoice)
  const resetForTask = useStepEngine(s => s.resetForTask)
  const { breakpoint } = useViewport()
```

Insert one new selector and a `useState`/`useEffect` pair AFTER the existing block, BEFORE the existing `useEffect(() => { resetForTask(sceneIdx) }, [...])` call:

```ts
  const phase = useLabState(s => s.phase)
  const sceneIdx = useLabState(s => s.currentSceneIndex)
  const recordMCAnswer = useLabState(s => s.recordMCAnswer)
  const advanceScene = useLabState(s => s.advanceScene)
  const journal = useLabState(s => s.journal)
  const stepIdx = useStepEngine(s => s.currentStepIndex)
  const setLastMCChoice = useStepEngine(s => s.setLastMCChoice)
  const resetForTask = useStepEngine(s => s.resetForTask)
  const draggingBodyId = useStepEngine(s => s.draggingBodyId)
  const { breakpoint } = useViewport()

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

- [ ] **Step 2.3: Pass `forceCollapsed` to the task panel**

Find the task `<CollapsibleGlassPanel ...>` opening tag (currently around line 84):

```tsx
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
```

Replace with (add one prop):

```tsx
      <CollapsibleGlassPanel
        storageKey="em-task-panel"
        label="панель сцени"
        defaultCollapsed={breakpoint === 'phone'}
        forceCollapsed={forceCollapsed}
        aria-labelledby="em-task-label"
        style={{ overflow: 'auto', ...layout.taskPanel }}
        collapsedStyle={
          breakpoint === 'phone' ? { bottom: 96, left: 8 } : { top: layout.taskPanel.top ?? 64, left: 8 }
        }
      >
```

- [ ] **Step 2.4: Pass `forceCollapsed` to the journal panel**

Find the journal `<CollapsibleGlassPanel ...>` opening tag (currently around line 130):

```tsx
      <CollapsibleGlassPanel
        storageKey="em-journal-panel"
        label="журнал"
        defaultCollapsed={breakpoint === 'phone'}
        aria-labelledby="em-journal-label"
        style={{ overflow: 'auto', ...layout.journalPanel }}
        collapsedStyle={
          breakpoint === 'phone' ? { top: safeAreaTop(56), right: 8 } : { top: layout.journalPanel.top ?? 64, right: 8 }
        }
      >
```

Replace with:

```tsx
      <CollapsibleGlassPanel
        storageKey="em-journal-panel"
        label="журнал"
        defaultCollapsed={breakpoint === 'phone'}
        forceCollapsed={forceCollapsed}
        aria-labelledby="em-journal-label"
        style={{ overflow: 'auto', ...layout.journalPanel }}
        collapsedStyle={
          breakpoint === 'phone' ? { top: safeAreaTop(56), right: 8 } : { top: layout.journalPanel.top ?? 64, right: 8 }
        }
      >
```

- [ ] **Step 2.5: Type-check + build + test**

Run sequentially, expect each to be clean:
- `npx tsc --noEmit` — 0 errors.
- `npm run build` — succeeds (pre-existing chunk-size warning only).
- `npm test -- --run` — 220 passed.

- [ ] **Step 2.6: Commit**

```bash
git add src/labs/electromagnetic-induction/ui/HUD.tsx
git commit -m "$(cat <<'EOF'
feat(em-induction): HUD panels auto-collapse during drag

Subscribe to useStepEngine.draggingBodyId. When non-null, set
forceCollapsed=true on both task and journal panels so the 3D scene
is unobstructed during interaction. On release, 300 ms grace period
before re-expanding — guards against flicker if the student briefly
releases and re-grabs.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Mass-measurement HUD — auto-collapse wiring

**Files:**
- Modify: `src/labs/mass-measurement/ui/HUD.tsx`

Mirror Task 2 in the mass-measurement HUD. Mass-measurement's HUD also has TWO `CollapsibleGlassPanel` instances (task + journal); both need `forceCollapsed`.

- [ ] **Step 3.1: Extend the react import**

Find on line 1:

```ts
import { useEffect } from 'react'
```

Replace with:

```ts
import { useEffect, useState } from 'react'
```

- [ ] **Step 3.2: Add the debounce hook**

Find this block near the top of `HUD()` (currently around lines 34-51) — the existing selectors block:

```ts
export function HUD() {
  const phase = useLabState(s => s.phase)
  const idx = useLabState(s => s.currentTaskIndex)
  const journal = useLabState(s => s.journal)
  const setMeasurement = useLabState(s => s.setMeasurement)

  const digitalScaleG = useReadings(s => s.digitalScaleGrams)
  const dynamometerN = useReadings(s => s.dynamometerNewtons)
  const leverTilt = useReadings(s => s.leverBalanceTilt)
  const leverRightG = useReadings(s => s.leverRightPanGrams)

  const currentStepIndex = useStepEngine(s => s.currentStepIndex)
  const resetForTask = useStepEngine(s => s.resetForTask)
  useEffect(() => {
    resetForTask(idx)
  }, [idx, resetForTask])

  const { breakpoint } = useViewport()
```

Insert a new `draggingBodyId` selector and the `forceCollapsed` state/effect AFTER `const { breakpoint } = useViewport()`:

```ts
  const { breakpoint } = useViewport()
  const draggingBodyId = useStepEngine(s => s.draggingBodyId)

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

- [ ] **Step 3.3: Pass `forceCollapsed` to the task panel**

Find the task `<CollapsibleGlassPanel ...>` opening tag (currently around line 155):

```tsx
      <CollapsibleGlassPanel
        storageKey="task-panel"
        label="панель завдання"
        defaultCollapsed={breakpoint === 'phone'}
        aria-labelledby="hud-current-task-label"
        style={{ overflow: 'auto', ...layout.taskPanel }}
        collapsedStyle={
          breakpoint === 'phone'
            ? { bottom: 96, left: 8 }
            : { top: layout.taskPanel.top ?? 64, left: 8 }
        }
      >
```

Replace with (add one prop):

```tsx
      <CollapsibleGlassPanel
        storageKey="task-panel"
        label="панель завдання"
        defaultCollapsed={breakpoint === 'phone'}
        forceCollapsed={forceCollapsed}
        aria-labelledby="hud-current-task-label"
        style={{ overflow: 'auto', ...layout.taskPanel }}
        collapsedStyle={
          breakpoint === 'phone'
            ? { bottom: 96, left: 8 }
            : { top: layout.taskPanel.top ?? 64, left: 8 }
        }
      >
```

- [ ] **Step 3.4: Pass `forceCollapsed` to the journal panel**

Find the journal `<CollapsibleGlassPanel ...>` opening tag (currently around line 213):

```tsx
      <CollapsibleGlassPanel
        storageKey="journal-panel"
        label="журнал"
        defaultCollapsed={breakpoint === 'phone'}
        aria-labelledby="hud-journal-label"
        style={{ overflow: 'auto', ...layout.journalPanel }}
        collapsedStyle={
          breakpoint === 'phone'
            ? { top: safeAreaTop(56), right: 8 }
            : { top: layout.journalPanel.top ?? 64, right: 8 }
        }
      >
```

Replace with:

```tsx
      <CollapsibleGlassPanel
        storageKey="journal-panel"
        label="журнал"
        defaultCollapsed={breakpoint === 'phone'}
        forceCollapsed={forceCollapsed}
        aria-labelledby="hud-journal-label"
        style={{ overflow: 'auto', ...layout.journalPanel }}
        collapsedStyle={
          breakpoint === 'phone'
            ? { top: safeAreaTop(56), right: 8 }
            : { top: layout.journalPanel.top ?? 64, right: 8 }
        }
      >
```

- [ ] **Step 3.5: Type-check + build + test**

- `npx tsc --noEmit` — 0 errors.
- `npm run build` — succeeds.
- `npm test -- --run` — 220 passed.

- [ ] **Step 3.6: Commit**

```bash
git add src/labs/mass-measurement/ui/HUD.tsx
git commit -m "$(cat <<'EOF'
feat(mass-measurement): HUD panels auto-collapse during drag

Mirrors the EM-induction implementation. draggingBodyId subscribed via
StepEngine; 300 ms debounce on release; both task and journal panels
receive forceCollapsed.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: EM induction `SCENES` refactor

**Files:**
- Modify: `src/labs/electromagnetic-induction/content/scenes.ts`
- Modify: `src/labs/electromagnetic-induction/ui/HUD.tsx`
- Modify: `src/labs/electromagnetic-induction/scene/LabScene.tsx`

This task is one atomic refactor — it changes the public shape of `SCENES` AND updates both consumers in the same commit so tsc stays clean.

- [ ] **Step 4.1: Add the `EmScene` type and rewrap the 5 scenes in `scenes.ts`**

Find the existing type alias and the `SCENES` declaration in `src/labs/electromagnetic-induction/content/scenes.ts`. The file currently exports `export type EmStep = Step & { motionTrigger?: ... }` followed by `export const SCENES: EmStep[][] = [ /* 5 step arrays */ ]`.

Add the new `EmScene` type immediately after `EmStep`. Change `SCENES` to `EmScene[]` where each scene becomes `{ title: '<Ukrainian title>', steps: [<the old step array>] }`. Step contents are unchanged.

Find the line that currently reads:

```ts
export const SCENES: EmStep[][] = [
```

Replace with:

```ts
export type EmScene = {
  /** Short Ukrainian title shown in the journal. */
  title: string
  steps: EmStep[]
}

export const SCENES: EmScene[] = [
```

Then, for each of the 5 scene blocks, wrap it as `{ title: '...', steps: [...] }`. The simplest approach is to do each wrap as a Find/Replace.

**Scene 1 — Знайомство:** Find:

```ts
  // Scene 1 — Знайомство (intro, single advance step)
  [
    {
      id: 'intro-ack',
```

Replace with:

```ts
  // Scene 1 — Знайомство (intro, single advance step)
  {
    title: 'Знайомство',
    steps: [
    {
      id: 'intro-ack',
```

Then find the closing of Scene 1 (the `],` before Scene 2's `// Scene 2 — Повільний рух` comment). The current block ends with:

```ts
      complete: { kind: 'submitted' },
    },
  ],

  // Scene 2 — Повільний рух
```

Replace with:

```ts
      complete: { kind: 'submitted' },
    },
    ],
  },

  // Scene 2 — Повільний рух
```

**Scene 2 — Повільний рух:** Find:

```ts
  // Scene 2 — Повільний рух
  [
    {
      id: 'pickup-slow',
```

Replace with:

```ts
  // Scene 2 — Повільний рух
  {
    title: 'Повільний рух',
    steps: [
    {
      id: 'pickup-slow',
```

Find the closing of Scene 2 (the `],` before Scene 3):

```ts
      complete: { kind: 'mc-selected', correctIndex: 0 },
    },
  ],

  // Scene 3 — Швидкий рух
```

Replace with:

```ts
      complete: { kind: 'mc-selected', correctIndex: 0 },
    },
    ],
  },

  // Scene 3 — Швидкий рух
```

**Scene 3 — Швидкий рух:** Find:

```ts
  // Scene 3 — Швидкий рух
  [
    {
      id: 'pickup-fast',
```

Replace with:

```ts
  // Scene 3 — Швидкий рух
  {
    title: 'Швидкий рух',
    steps: [
    {
      id: 'pickup-fast',
```

Find the closing of Scene 3:

```ts
      complete: { kind: 'mc-selected', correctIndex: 1 },
    },
  ],

  // Scene 4 — Зміна напрямку
```

Replace with:

```ts
      complete: { kind: 'mc-selected', correctIndex: 1 },
    },
    ],
  },

  // Scene 4 — Зміна напрямку
```

**Scene 4 — Зміна напрямку:** Find:

```ts
  // Scene 4 — Зміна напрямку
  [
    {
      id: 'pull-away',
```

Replace with:

```ts
  // Scene 4 — Зміна напрямку
  {
    title: 'Зміна напрямку',
    steps: [
    {
      id: 'pull-away',
```

Find the closing of Scene 4:

```ts
      complete: { kind: 'mc-selected', correctIndex: 1 },
    },
  ],

  // Scene 5 — Нерухомий магніт
```

Replace with:

```ts
      complete: { kind: 'mc-selected', correctIndex: 1 },
    },
    ],
  },

  // Scene 5 — Нерухомий магніт
```

**Scene 5 — Нерухомий магніт:** Find:

```ts
  // Scene 5 — Нерухомий магніт
  [
    {
      id: 'place-inside',
```

Replace with:

```ts
  // Scene 5 — Нерухомий магніт
  {
    title: 'Нерухомий магніт',
    steps: [
    {
      id: 'place-inside',
```

Find the FINAL closing of Scene 5 (and the outer SCENES array):

```ts
      complete: { kind: 'mc-selected', correctIndex: 1 },
    },
  ],
]
```

Replace with:

```ts
      complete: { kind: 'mc-selected', correctIndex: 1 },
    },
    ],
  },
]
```

Verification (mental): there are 5 `{ title: '...', steps: [` openers and 5 `], },` closers, then the outer `]` closes `SCENES`. Each scene's inner `steps: [` matches an inner `]` before the outer `}`.

- [ ] **Step 4.2: Update `scene[stepIdx]` in EM HUD to `scene.steps[stepIdx]`**

Open `src/labs/electromagnetic-induction/ui/HUD.tsx`. Find this block (currently around line 27):

```ts
  const scene = SCENES[sceneIdx]
  const step = scene?.[stepIdx]
  const sceneComplete = !!scene && !step
```

Replace with:

```ts
  const scene = SCENES[sceneIdx]
  const step = scene?.steps[stepIdx]
  const sceneComplete = !!scene && !step
```

- [ ] **Step 4.3: Update `scene[currentStepIdx]` in EM LabScene to `scene.steps[currentStepIdx]`**

Open `src/labs/electromagnetic-induction/scene/LabScene.tsx`. Find this block inside `SceneController` (currently around lines 125-128):

```ts
    const scene = SCENES[currentSceneIdx]
    if (!scene) return
    const step = scene[currentStepIdx]
    if (!step) return
```

Replace with:

```ts
    const scene = SCENES[currentSceneIdx]
    if (!scene) return
    const step = scene.steps[currentStepIdx]
    if (!step) return
```

- [ ] **Step 4.4: Type-check**

Run: `npx tsc --noEmit`
Expected: 0 errors.

(If tsc reports any other `SCENES[i]` access pattern that still treats the value as an array, also update that to `.steps[...]`. The two locations above are the only known consumers.)

- [ ] **Step 4.5: Build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4.6: Test**

Run: `npm test -- --run`
Expected: `Tests 220 passed (220)`.

- [ ] **Step 4.7: Commit**

```bash
git add src/labs/electromagnetic-induction/content/scenes.ts \
        src/labs/electromagnetic-induction/ui/HUD.tsx \
        src/labs/electromagnetic-induction/scene/LabScene.tsx
git commit -m "$(cat <<'EOF'
refactor(em-induction): SCENES carries a Ukrainian title per scene

EmStep[][] -> EmScene[] where EmScene = { title, steps }. Five
friendly titles assigned: Знайомство, Повільний рух, Швидкий рух,
Зміна напрямку, Нерухомий магніт. Both consumers (HUD step lookup
and SceneController motion-trigger loop) updated to scene.steps[i].

Prepares the journal label refactor in the next commit.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Journal entries use friendly scene title

**Files:**
- Modify: `src/labs/electromagnetic-induction/state/LabState.ts`
- Modify: `src/labs/electromagnetic-induction/ui/HUD.tsx`

- [ ] **Step 5.1: Update the `JournalEntry` type and `recordMCAnswer` signature in `LabState.ts`**

Open `src/labs/electromagnetic-induction/state/LabState.ts`. The current file starts:

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
```

Replace with (three changes: import `SCENES`, rename `sceneId` → `sceneTitle`, simplify `recordMCAnswer` signature):

```ts
import { create } from 'zustand'
import { SCENES } from '../content/scenes'

export type LabPhase = 'intro' | 'in-progress' | 'finished'

export type JournalEntry = {
  /** Friendly Ukrainian scene title, e.g., 'Повільний рух'. */
  sceneTitle: string
  chosenIndex: number
  timestamp: number
}

type LabState = {
  phase: LabPhase
  currentSceneIndex: number
  journal: JournalEntry[]
  sessionId: number
  start: () => void
  recordMCAnswer: (chosenIndex: number) => void
  advanceScene: () => void
  reset: () => void
  respawnObjects: () => void
}
```

- [ ] **Step 5.2: Update `recordMCAnswer` implementation**

Still in `LabState.ts`, find:

```ts
  recordMCAnswer: (sceneId, chosenIndex) => {
    const { journal } = get()
    set({
      journal: [...journal, { sceneId, chosenIndex, timestamp: Date.now() }],
    })
  },
```

Replace with:

```ts
  recordMCAnswer: (chosenIndex) => {
    const { journal, currentSceneIndex } = get()
    const scene = SCENES[currentSceneIndex]
    if (!scene) return
    set({
      journal: [...journal, { sceneTitle: scene.title, chosenIndex, timestamp: Date.now() }],
    })
  },
```

- [ ] **Step 5.3: Update the callsite in `HUD.tsx`**

Open `src/labs/electromagnetic-induction/ui/HUD.tsx`. Find the MC `onCorrect` callback (currently around line 111):

```tsx
            onCorrect={(idx) => {
              recordMCAnswer(step.id, idx)
              setLastMCChoice(idx)
            }}
```

Replace with:

```tsx
            onCorrect={(idx) => {
              recordMCAnswer(idx)
              setLastMCChoice(idx)
            }}
```

- [ ] **Step 5.4: Update the journal entry rendering**

Still in `HUD.tsx`, find the journal `<ul>` block (currently around lines 146-153):

```tsx
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 13 }}>
            {journal.map((entry, i) => (
              <li key={i} style={{ padding: '6px 0', borderBottom: '1px solid rgba(0,0,0,0.06)', color: '#1d1d1f' }}>
                <span style={{ color: '#34c759', marginRight: 6 }}>✓</span>
                {entry.sceneId}
              </li>
            ))}
          </ul>
```

Replace with (only the `{entry.sceneId}` token changes):

```tsx
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 13 }}>
            {journal.map((entry, i) => (
              <li key={i} style={{ padding: '6px 0', borderBottom: '1px solid rgba(0,0,0,0.06)', color: '#1d1d1f' }}>
                <span style={{ color: '#34c759', marginRight: 6 }}>✓</span>
                {entry.sceneTitle}
              </li>
            ))}
          </ul>
```

- [ ] **Step 5.5: Type-check + build + test**

- `npx tsc --noEmit` — 0 errors.
- `npm run build` — succeeds.
- `npm test -- --run` — 220 passed.

- [ ] **Step 5.6: Commit**

```bash
git add src/labs/electromagnetic-induction/state/LabState.ts \
        src/labs/electromagnetic-induction/ui/HUD.tsx
git commit -m "$(cat <<'EOF'
feat(em-induction): journal entries use friendly scene title

JournalEntry.sceneId -> sceneTitle. recordMCAnswer signature drops
the step-id parameter and derives the friendly title from SCENES[
currentSceneIndex].title. Existing journal display now shows
'✓ Повільний рух' instead of '✓ mc-slow'.

LabState is in-memory only (no persist middleware), so no migration
needed for prior users.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Verify + push + direct-merge to master

**Files:** None modified. Verification + git operations only.

- [ ] **Step 6.1: Final type-check**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 6.2: Final build**

Run: `npm run build`
Expected: build succeeds; only the pre-existing chunk-size warning.

- [ ] **Step 6.3: Final test**

Run: `npm test -- --run`
Expected: `Tests 220 passed (220)`.

- [ ] **Step 6.4: Sanity-check the commit chain**

Run: `git log --oneline master..HEAD`

Expected output (6 commits including the spec):

```
<sha> feat(em-induction): journal entries use friendly scene title
<sha> refactor(em-induction): SCENES carries a Ukrainian title per scene
<sha> feat(mass-measurement): HUD panels auto-collapse during drag
<sha> feat(em-induction): HUD panels auto-collapse during drag
<sha> feat(sdk): CollapsibleGlassPanel — add forceCollapsed external override
1ee1c62 docs(specs): mobile polish v2 — auto-collapse panels on drag + friendly journal labels
```

Run: `git diff master..HEAD --stat`

Expected: 7 files changed (spec + 6 modified). Approximately ~600 lines total (most is the spec).

- [ ] **Step 6.5: Push the branch**

Run: `git push -u origin feat/mobile-polish-v2`
Expected: branch pushed to remote.

- [ ] **Step 6.6: Direct-merge to master**

```bash
git checkout master
git merge --no-ff feat/mobile-polish-v2 -m "Merge feat/mobile-polish-v2: auto-collapse panels on drag + friendly journal labels"
git push origin master
```

Expected: master fast-forwards onto a merge commit; pushed; Vercel triggers production deploy.

- [ ] **Step 6.7: User smoke-test (after Vercel deploy completes, ~2 min after push)**

On the live site `science-lab-phi.vercel.app`:

1. **EM induction on iPhone — auto-collapse:**
   - Load lab, expand both panels (task at bottom, journal at top) by tapping their `+` pills.
   - Press-and-hold the bar magnet → both panels collapse to `+` pills immediately.
   - Release the magnet → ~300 ms later both panels re-expand to their previous state.
   - Quick release+regrab (< 300 ms apart) — no flicker; panels stay collapsed.

2. **EM induction — friendly journal labels:**
   - Complete Scene 2's MC (answer "Не світиться") → open the journal panel → see `✓ Повільний рух` instead of `✓ mc-slow`.
   - Continue through scenes — each MC answer logs the scene title.

3. **Mass-measurement on iPhone — auto-collapse:**
   - Same gesture cycle on apple/tennis ball/baseball → both task and journal panels collapse during drag, re-expand on release.

4. **Desktop (browser at 1280+ px):**
   - Panels default to expanded; drag still triggers auto-collapse but the visual change is mild (panels become small `+` pills). Acceptable — drag-cancel UX is also nice on desktop.

5. **Persistence sanity:**
   - On phone: collapse task panel manually (tap minus), refresh page → task panel still collapsed (localStorage preserved).
   - Drag magnet → both still collapse → release → task stays collapsed (persisted), journal returns to expanded (persisted state).

If anything fails the smoke-test, the relevant task is the entry point for a targeted fix:
- `forceCollapsed` doesn't work → Task 1.
- EM auto-collapse not firing → Task 2.
- Mass auto-collapse not firing → Task 3.
- TypeScript broken or scene access wrong → Task 4.
- Journal still shows `mc-slow` → Task 5.

---

## Self-Review Notes

**Spec coverage:**
- ✅ Slice 1A (`forceCollapsed` prop) — Task 1.
- ✅ Slice 1B (EM HUD wiring) — Task 2.
- ✅ Slice 1C (Mass HUD wiring) — Task 3.
- ✅ Slice 2A (`SCENES` refactor) — Task 4 (scenes.ts portion + both consumer updates).
- ✅ Slice 2B (`JournalEntry.sceneTitle` + `recordMCAnswer(chosenIndex)`) — Task 5.
- ✅ Slice 2C (HUD + LabScene access + render updates) — split between Task 4 (scene.steps access) and Task 5 (journal render + recordMCAnswer callsite).
- ⚠️ Persist migration (spec mentioned bumping version + STEP_TO_SCENE_TITLE map) — NOT in this plan because LabState.ts does not currently use the persist middleware. The journal is in-memory only and resets on page reload. The spec's precondition was wrong; no migration is needed. This is called out in the plan's "Note on spec deviation" header section.
- ✅ Acceptance criteria 1–5 from the spec covered in Task 6.7's smoke-test list.

**Placeholder scan:** No "TBD" / "TODO" / "implement later" / "similar to Task N". Every code-changing step shows the full snippet or Find/Replace. Every command shows the exact CLI + expected output.

**Type consistency:**
- `forceCollapsed?: boolean` is the same prop name + type in `CollapsibleGlassPanel` (Task 1), EM HUD (Task 2), Mass HUD (Task 3).
- `EmScene = { title: string, steps: EmStep[] }` defined in Task 4, consumed in HUD (Task 4 + 5) and LabScene (Task 4) and LabState (Task 5).
- `JournalEntry.sceneTitle: string` (Task 5) — rendered in HUD (Task 5), written by `recordMCAnswer` (Task 5).
- `recordMCAnswer(chosenIndex: number)` (Task 5) — called from HUD `onCorrect` (Task 5).
- `useStepEngine.draggingBodyId` is the existing engine selector used identically in EM HUD (Task 2) and Mass HUD (Task 3).
- `300` ms debounce — same value in both HUDs; if changed in one, must update both.

**No new tests:** Spec carries forward the 220-test regression gate; no unit-testable surface added.

**Branch parallelism:** Working on `feat/mobile-polish-v2` from fresh master (`bde6940`) plus spec commit (`1ee1c62`). No conflicting open branches.

**Iteration order rationale:** Task 1 introduces the SDK prop with no consumers — backward compatible. Tasks 2 + 3 wire each lab independently. Task 4 makes the breaking `SCENES` shape change and updates both consumers in one atomic commit so tsc stays clean. Task 5 cleans up the journal-display side that Task 4 didn't touch. Task 6 verifies the whole branch.
