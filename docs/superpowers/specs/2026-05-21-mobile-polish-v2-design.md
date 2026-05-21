# Mobile Polish v2 — Design

**Date:** 2026-05-21
**Status:** Approved-in-concept (user picked "auto-collapse on drag" + "friendly journal labels"; deferred camera-zoom default, MC option compaction, landscape, tablet compaction, landing audit)
**Scope:** Two-slice mobile UX polish, follow-up to the bottom-sheet + pinch-zoom merges. Slice 1: HUD panels (task + journal) collapse automatically while the student drags an object so the 3D scene is unobstructed during interaction. Slice 2: EM-induction journal entries display the scene's friendly Ukrainian title instead of the developer step ID.

## Background

After PR1 (bottom-sheet for lab controls) and PR2 (pinch-to-zoom with midpoint focal point) merged, the user smoke-tested EM induction on iPhone (Scene 3/5, screenshot at 20:39). Two issues surfaced:

1. **Panels block the work area during interaction.** The task panel — pinned to the bottom on phone — takes ~40 % of viewport height when expanded (especially when the step has MC options). The journal panel — pinned to the top on phone — adds another ~15 %. The middle band where the bar magnet and coil live is compressed to a thin strip where dragging is awkward. The student needs to *read* the task panel to know what to do, then *interact* with the scene, then read the panel again. The current pattern requires manual collapse/expand each cycle.

2. **Journal entries display developer IDs.** The journal log shows raw `entry.sceneId` like `mc-slow`, which is actually the *step ID* (per the JournalEntry shape in `LabState.ts`). User wants the scene's friendly Ukrainian title instead, e.g., "Повільний рух".

Existing infrastructure used as-is:
- `useStepEngine.draggingBodyId: string | null` — already set by `useDrag` when the user picks up a draggable object. Source of truth for "is a drag in progress".
- `CollapsibleGlassPanel.tsx` — already manages its own collapsed/expanded state with localStorage persistence (`lab.collapse.<storageKey>`).
- `useLabState.journal: JournalEntry[]` with Zustand persist — already stores answered scenes; refactor must preserve forward compatibility for users who already have journal entries from prior visits.
- EM-induction's 5 scenes are defined as `SCENES: EmStep[][]` (array-of-arrays). Each step has a `hintTitle` (the question/instruction shown in the task panel) but the scene as a whole has no title field — the title was only ever in the user's head ("scene 2 is about slow movement"). Mass-measurement uses a different shape (`tasks: Task[]` with `displayName`) and is already friendly.

## Non-goals

- Phone camera default zoom (user explicitly declined; deferred).
- MC option button compaction (deferred).
- Phone landscape special-casing (separate spec later).
- Tablet HUD panel compaction (separate spec later).
- Landing page mobile audit (separate spec later).
- IntroScreen / RevealScene / MilestoneOverlay polish (separate spec later).
- New unit tests. The 220-test regression suite is the gate; both slices are UX/state plumbing without good unit-test surface.
- Mass-measurement journal label changes — that lab already uses `displayName` from `tasks` (e.g., "Tennis ball", "Apple"), which is friendly.
- Changing the `defaultCollapsed` behaviour of `CollapsibleGlassPanel` on phone — it stays default-collapsed; auto-collapse is an *additional* override that does NOT modify persistence.

## Architecture

Branch `feat/mobile-polish-v2` from `master` at commit `bde6940`. Two independent slices in one PR, two distinct commit groups, single merge.

| Slice | Files |
|---|---|
| **1A** — `CollapsibleGlassPanel.forceCollapsed` prop | `src/sdk/ui/CollapsibleGlassPanel.tsx` |
| **1B** — EM-induction HUD wires `draggingBodyId` to `forceCollapsed` | `src/labs/electromagnetic-induction/ui/HUD.tsx` |
| **1C** — Mass-measurement HUD wires `draggingBodyId` to `forceCollapsed` | `src/labs/mass-measurement/ui/HUD.tsx` |
| **2A** — EM-induction `SCENES` refactor to `{ title, steps }[]` | `src/labs/electromagnetic-induction/content/scenes.ts` |
| **2B** — `JournalEntry.sceneTitle` + `recordMCAnswer(chosenIndex)` | `src/labs/electromagnetic-induction/state/LabState.ts` |
| **2C** — EM-induction HUD + LabScene rendering / access updates | `src/labs/electromagnetic-induction/ui/HUD.tsx` (also modified by 1B), `src/labs/electromagnetic-induction/scene/LabScene.tsx` |

5 unique files modified. ~160 lines net. No new files.

Slices 1 and 2 are independent and could land in either order. Implementation order in the plan: 1A → 1B → 1C → 2A → 2B → 2C → verify+merge. Slice 1 lands first because it's the user's #1 pain.

---

## Slice 1 — Auto-collapse panels during drag

### Slice 1A — `CollapsibleGlassPanel.forceCollapsed`

**File:** `src/sdk/ui/CollapsibleGlassPanel.tsx` (modify)

Add one optional prop. When `true`, render the collapsed pill regardless of the internal `collapsed` state; do NOT mutate the internal state or localStorage; restore display to the persisted state on the next render where `forceCollapsed === false`.

#### Props (new shape)

```ts
type Props = {
  storageKey: string
  label: string
  collapsedIcon?: string
  defaultCollapsed?: boolean
  style?: CSSProperties
  collapsedStyle?: CSSProperties
  'aria-labelledby'?: string
  /**
   * External override — render collapsed even when the persisted state is
   * "expanded". Used by labs to hide HUD panels while the student is
   * actively dragging an object. Does NOT mutate persistence.
   */
  forceCollapsed?: boolean
  children: ReactNode
}
```

#### Implementation change

Inside the component body, replace the existing `if (collapsed)` branch entry with:

```ts
const showCollapsed = forceCollapsed || collapsed
if (showCollapsed) {
  // ... existing pill rendering ...
}
```

The pill's `onClick` still calls `setCollapsed(false)` to record the user's intent in localStorage. Visually nothing changes during `forceCollapsed === true` because we keep rendering the pill — but the user's intent is preserved for when the force lifts.

Risk: while `forceCollapsed === true`, a tap on the pill writes `collapsed: false` to localStorage. When `forceCollapsed` flips back to `false`, the panel will then snap open. In practice the user can't tap the pill while dragging (their finger is on the canvas object). Accepted edge case.

#### Acceptance

1. `<CollapsibleGlassPanel forceCollapsed={true} ...>` renders the pill, not the panel, regardless of internal `collapsed` state.
2. `<CollapsibleGlassPanel forceCollapsed={false} ...>` (or undefined) renders per the internal `collapsed` state, unchanged from current behaviour.
3. Toggling `forceCollapsed` `true → false` immediately reveals the panel if the internal state is expanded; immediately shows the pill if the internal state is collapsed.
4. localStorage state under `lab.collapse.<storageKey>` is NOT modified when `forceCollapsed` flips.

### Slice 1B — EM-induction HUD wiring

**File:** `src/labs/electromagnetic-induction/ui/HUD.tsx` (modify)

#### Hook

Add at the top of `HUD()`, alongside the existing `useStepEngine` selectors:

```ts
const draggingBodyId = useStepEngine(s => s.draggingBodyId)
const [debouncedDragging, setDebouncedDragging] = useState(false)

useEffect(() => {
  if (draggingBodyId !== null) {
    setDebouncedDragging(true)
    return
  }
  // 300 ms grace period before re-expanding — prevents flicker if the
  // student briefly releases and re-grabs the object.
  const t = setTimeout(() => setDebouncedDragging(false), 300)
  return () => clearTimeout(t)
}, [draggingBodyId])
```

(`useState` and `useEffect` need to be imported if not already.)

#### Apply to both `CollapsibleGlassPanel`s

Pass the new prop to both panels:

```tsx
<CollapsibleGlassPanel
  storageKey="em-task-panel"
  label="панель сцени"
  defaultCollapsed={breakpoint === 'phone'}
  forceCollapsed={debouncedDragging}
  ...
>
```

```tsx
<CollapsibleGlassPanel
  storageKey="em-journal-panel"
  label="журнал"
  defaultCollapsed={breakpoint === 'phone'}
  forceCollapsed={debouncedDragging}
  ...
>
```

#### Acceptance

1. On EM induction phone, expanding either panel and then pressing-and-holding the bar magnet → both panels collapse to pills within one frame.
2. Releasing the magnet → both panels return to their persisted state after a 300 ms delay.
3. Quick release-and-regrab (< 300 ms apart) does NOT cause a flicker; panels stay collapsed.
4. Tapping a panel pill to collapse it while no drag is in progress still works (current behaviour preserved).

### Slice 1C — Mass-measurement HUD wiring

**File:** `src/labs/mass-measurement/ui/HUD.tsx` (modify)

Mirror Slice 1B: add the same hook (`useStepEngine.draggingBodyId` + 300 ms debounce + `forceCollapsed` prop on both `CollapsibleGlassPanel`s).

#### Acceptance

1. On mass-measurement phone, picking up the apple / tennis ball / baseball collapses both panels.
2. Releasing returns them to persisted state after 300 ms.

---

## Slice 2 — Journal: friendly scene titles (EM only)

### Slice 2A — `SCENES` refactor to `{ title, steps }[]`

**File:** `src/labs/electromagnetic-induction/content/scenes.ts` (modify)

#### New type and shape

```ts
export type EmScene = {
  /** Short Ukrainian title shown in the journal. */
  title: string
  steps: EmStep[]
}

export const SCENES: EmScene[] = [
  // Scene 1 — Знайомство
  {
    title: 'Знайомство',
    steps: [
      { id: 'intro-ack', /* ... unchanged ... */ },
    ],
  },
  // Scene 2 — Повільний рух
  {
    title: 'Повільний рух',
    steps: [
      { id: 'pickup-slow', /* ... unchanged ... */ },
      { id: 'move-slow',   /* ... unchanged ... */ },
      { id: 'mc-slow',     /* ... unchanged ... */ },
    ],
  },
  // Scene 3 — Швидкий рух
  {
    title: 'Швидкий рух',
    steps: [
      { id: 'pickup-fast', /* ... */ },
      { id: 'observe-fast', /* ... */ },
      { id: 'mc-fast', /* ... */ },
    ],
  },
  // Scene 4 — Зміна напрямку
  {
    title: 'Зміна напрямку',
    steps: [
      { id: 'pull-away', /* ... */ },
      { id: 'mc-direction', /* ... */ },
    ],
  },
  // Scene 5 — Нерухомий магніт
  {
    title: 'Нерухомий магніт',
    steps: [
      { id: 'place-inside', /* ... */ },
      { id: 'mc-stationary', /* ... */ },
    ],
  },
]
```

(Step contents are preserved verbatim — only the outer scene container shape changes.)

### Slice 2B — `JournalEntry.sceneTitle` + `recordMCAnswer(chosenIndex)`

**File:** `src/labs/electromagnetic-induction/state/LabState.ts` (modify)

#### Type changes

```ts
export type JournalEntry = {
  /** Friendly Ukrainian scene title, e.g., 'Повільний рух'. */
  sceneTitle: string
  chosenIndex: number
  timestamp: number
}
```

#### `recordMCAnswer` signature change

From `recordMCAnswer: (sceneId: string, chosenIndex: number) => void` to:

```ts
recordMCAnswer: (chosenIndex: number) => void
```

Implementation:

```ts
recordMCAnswer: (chosenIndex) => {
  const { journal, currentSceneIndex } = get()
  const scene = SCENES[currentSceneIndex]
  if (!scene) return
  set({
    journal: [...journal, { sceneTitle: scene.title, chosenIndex, timestamp: Date.now() }],
  })
}
```

Import `SCENES` from `'../content/scenes'` at the top of `LabState.ts` if not already.

#### Persist migration

The Zustand persist middleware already serialises journal entries. Old entries (from past sessions) will have `sceneId: string` not `sceneTitle: string`. Approach:

- Bump the persist `version` from its current value (likely 1) to 2.
- Add a `migrate(persistedState, fromVersion)` that converts old `sceneId` entries to `sceneTitle` by looking up the step's containing scene via a small map:

```ts
const STEP_TO_SCENE_TITLE: Record<string, string> = {
  'intro-ack': 'Знайомство',
  'pickup-slow': 'Повільний рух', 'move-slow': 'Повільний рух', 'mc-slow': 'Повільний рух',
  'pickup-fast': 'Швидкий рух',   'observe-fast': 'Швидкий рух', 'mc-fast': 'Швидкий рух',
  'pull-away': 'Зміна напрямку',  'mc-direction': 'Зміна напрямку',
  'place-inside': 'Нерухомий магніт', 'mc-stationary': 'Нерухомий магніт',
}
```

This map lives inside `LabState.ts` (close to the migrate function). The mapping is small enough to inline.

The migrate function receives `persistedState: unknown` (per Zustand types) and returns the v2-shaped state. Implementation walks `journal[]` and replaces each `sceneId` with the corresponding `sceneTitle`. If the step ID is unknown (shouldn't happen but defensive), fall back to the step ID string so nothing breaks visually.

#### Acceptance

1. `recordMCAnswer(chosenIndex)` writes `{ sceneTitle, chosenIndex, timestamp }` based on `currentSceneIndex`.
2. Existing localStorage state from prior sessions migrates cleanly: each old entry's `sceneId` (the step ID, despite the field name) is mapped to its scene's friendly title.
3. Unknown step IDs in old data fall back to the step ID itself — no crash, just an awkward label that the next play-through will overwrite.

### Slice 2C — HUD + LabScene access pattern updates

**Files:**
- `src/labs/electromagnetic-induction/ui/HUD.tsx` (already modified in 1B; further edits here)
- `src/labs/electromagnetic-induction/scene/LabScene.tsx`

#### HUD.tsx changes

(a) Access pattern: `scene?.[stepIdx]` → `scene?.steps[stepIdx]`. Find the line:

```ts
const scene = SCENES[sceneIdx]
const step = scene?.[stepIdx]
```

Replace with:

```ts
const scene = SCENES[sceneIdx]
const step = scene?.steps[stepIdx]
```

(b) Journal entry rendering: find this block in the journal map:

```tsx
{journal.map((entry, i) => (
  <li key={i} ...>
    <span style={{ color: '#34c759', marginRight: 6 }}>✓</span>
    {entry.sceneId}
  </li>
))}
```

Replace with:

```tsx
{journal.map((entry, i) => (
  <li key={i} ...>
    <span style={{ color: '#34c759', marginRight: 6 }}>✓</span>
    {entry.sceneTitle}
  </li>
))}
```

(c) MC answer callback: find:

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

#### LabScene.tsx changes

Find each use of `SCENES[i]` as an array of steps. Currently `SceneController` uses:

```ts
const scene = SCENES[currentSceneIdx]
if (!scene) return
const step = scene[currentStepIdx]
```

Replace with:

```ts
const scene = SCENES[currentSceneIdx]
if (!scene) return
const step = scene.steps[currentStepIdx]
```

Verify by grepping `SCENES\[` and updating every occurrence that treats the result as a step array.

#### Acceptance

1. EM-induction lab compiles, types are correct (`SCENES[i]` is `EmScene`, `SCENES[i].steps[j]` is `EmStep`).
2. After answering the first MC in Scene 2 ("Повільний рух"), the journal shows `✓ Повільний рух` rather than `✓ mc-slow`.
3. After completing all 5 scenes, the journal shows 5 entries with the 5 scene titles in order.
4. A user who plays this lab for the first time after deploy sees the friendly titles from the start.
5. A user with prior journal data (`sceneId: 'mc-slow'` in localStorage) sees the migrated `sceneTitle: 'Повільний рух'` on first load.

---

## File touch-list

| File | Slice | Change |
|---|---|---|
| `src/sdk/ui/CollapsibleGlassPanel.tsx` | 1A | Add `forceCollapsed?: boolean` prop; gate rendering by `forceCollapsed || collapsed`. |
| `src/labs/electromagnetic-induction/ui/HUD.tsx` | 1B + 2C | Add `draggingBodyId` selector + 300 ms debounce + `forceCollapsed` on both panels. Update journal rendering to `entry.sceneTitle`. Change `step` lookup to `scene?.steps[stepIdx]`. Update `recordMCAnswer` callsite. |
| `src/labs/mass-measurement/ui/HUD.tsx` | 1C | Same `draggingBodyId` selector + debounce + `forceCollapsed`. No journal-label change. |
| `src/labs/electromagnetic-induction/content/scenes.ts` | 2A | Refactor `SCENES` to `EmScene[]` with `title` + `steps`. |
| `src/labs/electromagnetic-induction/state/LabState.ts` | 2B | `JournalEntry.sceneTitle`, `recordMCAnswer(chosenIndex)`, persist v2 migration. |
| `src/labs/electromagnetic-induction/scene/LabScene.tsx` | 2C | Update `scene.steps[stepIdx]` access pattern. |

6 files modified, 0 new files. ~160 lines net.

## Testing strategy

No new unit tests. The 220-test regression suite is the gate; `npx tsc --noEmit` and `npm run build` must remain clean.

Smoke-test (user, after Vercel deploy):

1. **EM induction phone — auto-collapse:** load lab. Expand both panels (tap their pills). Confirm panels stay expanded across scene advance. Pick up bar magnet → both collapse instantly. Release magnet → after ~300 ms both re-expand. Quick release+regrab → no flicker.
2. **Mass-measurement phone — auto-collapse:** load lab. Same gesture cycle with apple/tennis ball/baseball.
3. **EM induction phone — journal labels:** complete Scene 2's MC. Open journal panel. See `✓ Повільний рух`.
4. **Persisted state:** reload the lab between steps 1 and 3. Confirm collapsed/expanded state is preserved; auto-collapse still fires on next drag.
5. **Existing-user migration:** if a user has old journal data (`sceneId: 'mc-slow'`) in localStorage from before this deploy, after the deploy they should see the migrated friendly title.
6. **Desktop:** no behavioural change for the auto-collapse (drag still triggers but panels are normally visible on desktop and the override is harmless). Journal labels also show friendly names.
7. 220 tests pass; tsc clean; build clean.

## Risks

- **`forceCollapsed` race with user-initiated collapse during a drag.** While `forceCollapsed === true`, tapping the pill calls `setCollapsed(false)` (internal). The visual stays collapsed. On drag release, the panel pops open. In practice, on phone the user's finger is on the canvas — they can't tap the pill. On desktop with a cursor it's theoretically reachable but the panel pop-open is a benign surprise. Accepted.
- **Migration of unknown step IDs in old journal data.** If someone's localStorage has `sceneId: 'something-removed'`, the map lookup returns `undefined`. Fallback: store the original string. The journal then shows a raw step ID for that one entry, identical to today's behaviour. No crash.
- **300 ms debounce on drag release feels wrong.** Two failure modes: (a) too short — flicker still happens; (b) too long — student is confused why panels stay collapsed after releasing. 300 ms is a common UI sweet-spot value; if smoke-test feels wrong, the constant is a single edit.
- **`useStepEngine.draggingBodyId` propagates through Zustand subscribe + re-render in HUD.** This causes the HUD to re-render every time a drag starts/ends. The HUD is already mounted permanently and renders cheaply; no measurable cost. If profile reveals jank, narrow the selector to just `(s => s.draggingBodyId !== null)`.
- **Persist `migrate()` runs on every page load until the user's local version reaches 2.** Idempotent: once the journal entries have `sceneTitle` fields, the next migrate would no-op. Standard Zustand pattern.

## Out of scope

- Phone landscape orientation.
- Tablet HUD compaction.
- Landing page mobile audit.
- IntroScreen / RevealScene / MilestoneOverlay polish.
- Camera default zoom adjustments.
- MC option compaction.
- Mass-measurement journal label changes (already friendly).
- Renaming `entry.sceneTitle` to anything else if "sceneTitle" feels misleading once the field exists.

## Self-review checklist

- [x] Every slice has concrete acceptance criteria.
- [x] Architecture is internally consistent — Slice 1 doesn't depend on Slice 2 and vice versa; the EM-induction HUD is touched by both slices but the edits don't overlap line-by-line.
- [x] No "TBD" / "TODO" / placeholder text.
- [x] File touch-list matches what each slice describes.
- [x] Existing tests are NOT modified; suite is regression gate.
- [x] No new dependencies, no new persist keys (only persist version bump).
- [x] Out-of-scope items are explicit and match what the user deferred.
- [x] Risks section addresses force-collapse race, migration fallback, debounce tuning, re-render churn, persist idempotency.
