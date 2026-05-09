# Mass Measurement Lab — Slice 0 + 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move existing code into a clean SDK/lab folder split (Slice 0), then bring the Tennis Ball + Digital Scale (task t1) end-to-end pipeline to gold-standard quality (Slice 1) — cinematic lighting, PBR materials, magnetic snap animation, focus camera, polished LCD, redesigned UI, sound integration.

**Architecture:** Refactor first, polish second. `src/sdk/` holds reusable engine; `src/labs/mass-measurement/` holds lab-specific content. After Slice 0, behavior is identical and tests still pass; Slice 1 layers visual + interaction polish onto the t1 path only, leaving t2-t9 visually unchanged for now (Slices 2-4 in a follow-up plan).

**Tech Stack:** React 19, TypeScript 6, R3F 9, drei 10, @react-three/rapier 2, @react-three/postprocessing (NEW dep for Slice 1), Zustand 5, Vitest 4. Web Audio API for sound. No `framer-motion` (custom tween helpers).

**Spec:** `docs/superpowers/specs/2026-05-09-mass-measurement-gold-standard-design.md`

**Checkpoint after Slice 1:** before propagating to Slices 2-4, the user reviews the t1 flagship and approves visual language.

---

## Slice 0 — Foundation Refactor

**Outcome:** `src/sdk/` and `src/labs/mass-measurement/` exist; existing code moved without behavior change; typecheck and 25 tests pass.

### File map (Slice 0)

```
sdk/physics/           ← from src/physics/
sdk/scene/             ← from src/scene/{CameraRig,Table,Lighting}.tsx
sdk/guided/            ← from src/guided/ (engine + DSL types + overlay + primitives)
sdk/object/            ← from src/scene/objects/Draggable.tsx
sdk/ui/                ← from src/ui/ (Button, GlassPanel, NumberInput; drop TouchNumberKeypad — unused per spec §6.4)
sdk/types.ts           ← NEW: LabDefinition contract (stub)
labs/mass-measurement/index.tsx              ← NEW: <MassMeasurementLab/> entry
labs/mass-measurement/instruments/           ← from src/scene/instruments/
labs/mass-measurement/objects/               ← from src/scene/objects/{TennisBall,Apple,Baseball,Weights}.tsx
labs/mass-measurement/textures/              ← from src/scene/textures/
labs/mass-measurement/content/tasks.ts       ← from src/lab/tasks.ts
labs/mass-measurement/content/steps.ts       ← from src/guided/TaskSteps.ts
labs/mass-measurement/content/strings.ts     ← NEW: extracted Ukrainian strings (just defines empty obj for now — populated in Slice 1)
labs/mass-measurement/state/LabState.ts      ← from src/lab/LabState.ts
labs/mass-measurement/state/InstrumentReadings.ts  ← from src/lab/InstrumentReadings.ts
labs/mass-measurement/ui/HUD.tsx             ← from src/lab/HUD.tsx
labs/mass-measurement/ui/IntroScreen.tsx     ← from src/lab/IntroScreen.tsx
labs/mass-measurement/ui/SummaryScreen.tsx   ← from src/lab/SummaryScreen.tsx
labs/mass-measurement/scene/LabScene.tsx     ← from src/scene/LabScene.tsx (renamed component if needed)
app/App.tsx                                  ← from src/App.tsx (mounts <MassMeasurementLab/>)
```

Test files mirror the moves. `src/utils/units.ts` stays at `src/utils/units.ts` (used by both lab and tests; not yet promoted to SDK — generic enough but YAGNI until 2nd lab needs it).

`src/main.tsx` stays at root.

### Task 0.1: Create empty SDK folder skeleton

**Files:**
- Create: `src/sdk/physics/.gitkeep`
- Create: `src/sdk/scene/.gitkeep`
- Create: `src/sdk/guided/.gitkeep`
- Create: `src/sdk/guided/primitives/.gitkeep`
- Create: `src/sdk/object/.gitkeep`
- Create: `src/sdk/ui/.gitkeep`
- Create: `src/labs/mass-measurement/instruments/.gitkeep`
- Create: `src/labs/mass-measurement/objects/.gitkeep`
- Create: `src/labs/mass-measurement/textures/.gitkeep`
- Create: `src/labs/mass-measurement/content/.gitkeep`
- Create: `src/labs/mass-measurement/state/.gitkeep`
- Create: `src/labs/mass-measurement/ui/.gitkeep`
- Create: `src/labs/mass-measurement/scene/.gitkeep`
- Create: `src/app/.gitkeep`

- [ ] **Step 1: Create folder skeleton**

Use shell to make all directories with `.gitkeep` files (so empty dirs commit). On Windows bash:
```bash
cd "C:/Users/vdomo/OneDrive/Рабочий стол/3dwebsimulation"
mkdir -p src/sdk/physics src/sdk/scene src/sdk/guided/primitives src/sdk/object src/sdk/ui \
         src/labs/mass-measurement/instruments src/labs/mass-measurement/objects \
         src/labs/mass-measurement/textures src/labs/mass-measurement/content \
         src/labs/mass-measurement/state src/labs/mass-measurement/ui \
         src/labs/mass-measurement/scene src/app
touch src/sdk/physics/.gitkeep src/sdk/scene/.gitkeep src/sdk/guided/.gitkeep \
      src/sdk/guided/primitives/.gitkeep src/sdk/object/.gitkeep src/sdk/ui/.gitkeep \
      src/labs/mass-measurement/instruments/.gitkeep src/labs/mass-measurement/objects/.gitkeep \
      src/labs/mass-measurement/textures/.gitkeep src/labs/mass-measurement/content/.gitkeep \
      src/labs/mass-measurement/state/.gitkeep src/labs/mass-measurement/ui/.gitkeep \
      src/labs/mass-measurement/scene/.gitkeep src/app/.gitkeep
```

- [ ] **Step 2: Commit skeleton**

```bash
git add src/sdk src/labs src/app
git commit -m "refactor(structure): create sdk/ and labs/ folder skeleton"
```

### Task 0.2: Move physics/ → sdk/physics/

**Files moved:**
- `src/physics/bodyRegistry.ts` → `src/sdk/physics/bodyRegistry.ts`
- `src/physics/snapTargets.ts` → `src/sdk/physics/snapTargets.ts`
- `src/physics/useDrag.ts` → `src/sdk/physics/useDrag.ts`
- Tests: `src/physics/__tests__/*` → `src/sdk/physics/__tests__/*` (if exist)

- [ ] **Step 1: Move files via git mv**

```bash
git mv src/physics/bodyRegistry.ts src/sdk/physics/bodyRegistry.ts
git mv src/physics/snapTargets.ts src/sdk/physics/snapTargets.ts
git mv src/physics/useDrag.ts src/sdk/physics/useDrag.ts
# Move any test files if they exist:
ls src/physics/__tests__ 2>/dev/null && git mv src/physics/__tests__ src/sdk/physics/__tests__
rmdir src/physics 2>/dev/null
rm src/sdk/physics/.gitkeep
```

- [ ] **Step 2: Update imports across project**

Find all `from '...physics/...'` and change to point to new path. Use Grep to find all referencing files, then Edit each one.

```bash
# Find all imports referencing old physics paths
grep -rn "from.*physics/" src --include="*.ts" --include="*.tsx" | grep -v "sdk/physics"
```

For each file found, Edit the import:
- `from '../../physics/snapTargets'` → `from '../../sdk/physics/snapTargets'`
- `from '../physics/snapTargets'` → `from '../sdk/physics/snapTargets'`
- `from './physics/...'` → use appropriate relative path

Files affected (verify via grep): `src/scene/objects/Draggable.tsx`, `src/scene/instruments/DigitalScale.tsx`, `src/scene/instruments/Dynamometer.tsx`, `src/scene/instruments/LeverBalance.tsx`, `src/scene/LabScene.tsx`, possibly tests.

- [ ] **Step 3: Run typecheck and tests**

```bash
npx tsc --noEmit
npx vitest run
```

Expected: typecheck clean, 25/25 tests pass.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor(physics): move to sdk/physics/ + update imports"
```

### Task 0.3: Move guided/ → sdk/guided/

Following the same pattern as Task 0.2.

- [ ] **Step 1: Move files**

```bash
git mv src/guided/StepEngine.ts src/sdk/guided/StepEngine.ts
git mv src/guided/GuidedOverlay.tsx src/sdk/guided/GuidedOverlay.tsx
git mv src/guided/SkipGuidanceToggle.tsx src/sdk/guided/SkipGuidanceToggle.tsx
git mv src/guided/primitives/Arrow3D.tsx src/sdk/guided/primitives/Arrow3D.tsx
git mv src/guided/primitives/GlowRing.tsx src/sdk/guided/primitives/GlowRing.tsx
git mv src/guided/primitives/HighlightOutline.tsx src/sdk/guided/primitives/HighlightOutline.tsx
git mv src/guided/primitives/PulseEffect.tsx src/sdk/guided/primitives/PulseEffect.tsx
# TaskSteps.ts is lab-specific (contains mass-lab steps) — moves to lab content:
git mv src/guided/TaskSteps.ts src/labs/mass-measurement/content/steps.ts
# Move tests if they exist
ls src/guided/__tests__ 2>/dev/null && git mv src/guided/__tests__ src/sdk/guided/__tests__
rm -rf src/guided
rm src/sdk/guided/.gitkeep src/sdk/guided/primitives/.gitkeep
rm src/labs/mass-measurement/content/.gitkeep
```

- [ ] **Step 2: Split DSL types from lab content**

The old `TaskSteps.ts` mixed DSL types (Step, CompletionRule) with lab-specific tasks (TASK_STEPS map). Split:

Create `src/sdk/guided/TaskSteps.ts` containing only types (Step, CompletionRule, StepTarget, TaskStepsMap). Read the original and copy types to new SDK file:

```bash
# Read the original (now at labs/mass-measurement/content/steps.ts)
# Copy types-only header to new SDK file
```

Concretely, edit `src/labs/mass-measurement/content/steps.ts`:
- Remove the `export type` declarations for `StepTarget`, `CompletionRule`, `Step`, `TaskStepsMap`
- Add `import type { Step, StepTarget, CompletionRule } from '../../../sdk/guided/TaskSteps'`
- Keep the make functions and `TASK_STEPS` export

Then create `src/sdk/guided/TaskSteps.ts` with:

```ts
export type StepTarget =
  | { kind: 'object'; id: string }
  | { kind: 'instrument'; id: string }
  | { kind: 'ui'; id: 'input' | 'submit' }

export type CompletionRule =
  | { kind: 'dragging'; bodyPattern: string }
  | { kind: 'snapped'; targetPrefix: string }
  | { kind: 'reading-stable'; instrument: string; minValue: number; durationMs: number }
  | { kind: 'lever-balanced'; toleranceTilt: number }
  | { kind: 'input-focused' }
  | { kind: 'submitted' }

export type Step = {
  id: string
  target: StepTarget
  visualHint: 'arrow' | 'glow' | 'target-ring' | 'highlight'
  hintTemplate: string
  complete: CompletionRule
}

export type TaskStepsMap = Record<string, Step[]>
```

Note: the `id` of `StepTarget` is widened to `string` to allow lab-specific identifiers without SDK churn.

- [ ] **Step 3: Update imports**

```bash
grep -rn "from.*guided/" src --include="*.ts" --include="*.tsx" | grep -v "sdk/guided\|labs/mass-measurement/content"
```

Update each match to point to either `sdk/guided/...` (engine, overlay, primitives) or `labs/mass-measurement/content/steps` (the lab's task list). Files likely affected: `src/scene/LabScene.tsx`, `src/sdk/guided/StepEngine.ts` (its own internal `import('./TaskSteps')` references), tests.

- [ ] **Step 4: Run typecheck + tests**

```bash
npx tsc --noEmit && npx vitest run
```

Expected: green.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(guided): split SDK types from lab content; move to sdk/guided/ and labs/mass-measurement/content/"
```

### Task 0.4: Move object Draggable → sdk/object/, lab objects → labs/...

- [ ] **Step 1: Move Draggable**

```bash
git mv src/scene/objects/Draggable.tsx src/sdk/object/Draggable.tsx
rm src/sdk/object/.gitkeep
```

- [ ] **Step 2: Move lab-specific objects**

```bash
git mv src/scene/objects/TennisBall.tsx src/labs/mass-measurement/objects/TennisBall.tsx
git mv src/scene/objects/Apple.tsx src/labs/mass-measurement/objects/Apple.tsx
git mv src/scene/objects/Baseball.tsx src/labs/mass-measurement/objects/Baseball.tsx
git mv src/scene/objects/Weights.tsx src/labs/mass-measurement/objects/Weights.tsx
rm src/labs/mass-measurement/objects/.gitkeep
rmdir src/scene/objects
```

- [ ] **Step 3: Update imports in moved files**

In each of `TennisBall.tsx`, `Apple.tsx`, `Baseball.tsx`, `Weights.tsx`:
- `from './Draggable'` → `from '../../../sdk/object/Draggable'`
- Texture imports stay relative (textures move next task)

In `src/sdk/object/Draggable.tsx`:
- `from '../../physics/useDrag'` → `from '../physics/useDrag'`
- `from '../../guided/StepEngine'` → `from '../guided/StepEngine'`
- `from '../../physics/bodyRegistry'` → `from '../physics/bodyRegistry'`

- [ ] **Step 4: Update consumers**

```bash
grep -rn "scene/objects" src --include="*.ts" --include="*.tsx"
```

In `src/scene/LabScene.tsx`: change object imports to `from '../labs/mass-measurement/objects/...'`. (LabScene moves later in this slice; intermediate state is OK as long as imports resolve.)

- [ ] **Step 5: Run typecheck + tests**

```bash
npx tsc --noEmit && npx vitest run
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor(objects): move Draggable to sdk/object/, lab objects to labs/mass-measurement/objects/"
```

### Task 0.5: Move textures → labs/mass-measurement/textures/

- [ ] **Step 1: Move texture files**

```bash
git mv src/scene/textures/dialTexture.ts src/labs/mass-measurement/textures/dialTexture.ts
git mv src/scene/textures/feltTexture.ts src/labs/mass-measurement/textures/feltTexture.ts
git mv src/scene/textures/labelTexture.ts src/labs/mass-measurement/textures/labelTexture.ts
git mv src/scene/textures/lcdTexture.ts src/labs/mass-measurement/textures/lcdTexture.ts
git mv src/scene/textures/seamTexture.ts src/labs/mass-measurement/textures/seamTexture.ts
git mv src/scene/textures/weightLabel.ts src/labs/mass-measurement/textures/weightLabel.ts
rm src/labs/mass-measurement/textures/.gitkeep
rmdir src/scene/textures
```

- [ ] **Step 2: Update imports**

```bash
grep -rn "scene/textures" src --include="*.ts" --include="*.tsx"
```

Update each consumer (instruments mostly, also Apple/Baseball/TennisBall/Weights for their textures) to point at the new path. After move, instruments still live at `src/scene/instruments/` (they move next), so during this step adjust their imports to `from '../../labs/mass-measurement/textures/...'`. Lab objects (already moved) need `from '../textures/...'`.

- [ ] **Step 3: Verify + commit**

```bash
npx tsc --noEmit && npx vitest run
git add -A
git commit -m "refactor(textures): move to labs/mass-measurement/textures/"
```

### Task 0.6: Move instruments → labs/mass-measurement/instruments/

- [ ] **Step 1: Move instrument files**

```bash
git mv src/scene/instruments/DigitalScale.tsx src/labs/mass-measurement/instruments/DigitalScale.tsx
git mv src/scene/instruments/Dynamometer.tsx src/labs/mass-measurement/instruments/Dynamometer.tsx
git mv src/scene/instruments/LeverBalance.tsx src/labs/mass-measurement/instruments/LeverBalance.tsx
rm src/labs/mass-measurement/instruments/.gitkeep
rmdir src/scene/instruments
```

- [ ] **Step 2: Update imports inside moved files**

In each of the 3 instrument files (now at `src/labs/mass-measurement/instruments/`):
- `from '../../physics/snapTargets'` → `from '../../../sdk/physics/snapTargets'`
- `from '../../physics/bodyRegistry'` → `from '../../../sdk/physics/bodyRegistry'`
- `from '../../lab/InstrumentReadings'` → `from '../state/InstrumentReadings'` (will exist after Task 0.7)
- `from '../textures/...'` → `from '../textures/...'` (path stays — textures already moved)

- [ ] **Step 3: Update consumers**

```bash
grep -rn "scene/instruments" src --include="*.ts" --include="*.tsx"
```

Update `src/scene/LabScene.tsx` instrument imports to `from '../labs/mass-measurement/instruments/...'`.

- [ ] **Step 4: Verify + commit**

```bash
npx tsc --noEmit && npx vitest run
git add -A
git commit -m "refactor(instruments): move to labs/mass-measurement/instruments/"
```

### Task 0.7: Move lab state and UI → labs/mass-measurement/state/ and ui/

- [ ] **Step 1: Move state and UI files**

```bash
git mv src/lab/LabState.ts src/labs/mass-measurement/state/LabState.ts
git mv src/lab/InstrumentReadings.ts src/labs/mass-measurement/state/InstrumentReadings.ts
git mv src/lab/HUD.tsx src/labs/mass-measurement/ui/HUD.tsx
git mv src/lab/IntroScreen.tsx src/labs/mass-measurement/ui/IntroScreen.tsx
git mv src/lab/SummaryScreen.tsx src/labs/mass-measurement/ui/SummaryScreen.tsx
git mv src/lab/tasks.ts src/labs/mass-measurement/content/tasks.ts
rm src/labs/mass-measurement/state/.gitkeep
rm src/labs/mass-measurement/ui/.gitkeep
rmdir src/lab
```

- [ ] **Step 2: Move shared UI primitives → sdk/ui/**

```bash
git mv src/ui/Button.tsx src/sdk/ui/Button.tsx
git mv src/ui/GlassPanel.tsx src/sdk/ui/GlassPanel.tsx
git mv src/ui/NumberInput.tsx src/sdk/ui/NumberInput.tsx
# TouchNumberKeypad.tsx is unused per spec §6.4 (replaced by inline NumberInput).
# Delete it rather than move:
git rm src/ui/TouchNumberKeypad.tsx
rm src/sdk/ui/.gitkeep
rmdir src/ui
```

- [ ] **Step 3: Update all imports across the project**

```bash
grep -rn "from.*\(lab/\|ui/\|scene/\)" src --include="*.ts" --include="*.tsx" | grep -v "sdk/\|labs/mass-measurement"
```

Walk every match and update. Common rewrites:
- In files at `src/labs/mass-measurement/instruments/...`:
  - `from '../../lab/InstrumentReadings'` → `from '../state/InstrumentReadings'`
- In files at `src/labs/mass-measurement/ui/...`:
  - `from '../ui/Button'` → `from '../../../sdk/ui/Button'`
  - `from '../ui/GlassPanel'` → `from '../../../sdk/ui/GlassPanel'`
  - `from './LabState'` → `from '../state/LabState'`
  - `from './tasks'` → `from '../content/tasks'`
- In `src/scene/LabScene.tsx` (still at old location until next task):
  - update all references

- [ ] **Step 4: Verify + commit**

```bash
npx tsc --noEmit && npx vitest run
git add -A
git commit -m "refactor(lab): move state/UI to labs/mass-measurement/, shared UI to sdk/ui/"
```

### Task 0.8: Move scene/ → split between sdk/scene/ and labs/...

- [ ] **Step 1: Move SDK-bound scene files**

```bash
git mv src/scene/CameraRig.tsx src/sdk/scene/CameraRig.tsx
git mv src/scene/Lighting.tsx src/sdk/scene/Lighting.tsx
git mv src/scene/Table.tsx src/sdk/scene/Table.tsx
rm src/sdk/scene/.gitkeep
```

- [ ] **Step 2: Move LabScene to lab folder**

```bash
git mv src/scene/LabScene.tsx src/labs/mass-measurement/scene/LabScene.tsx
rm src/labs/mass-measurement/scene/.gitkeep
rmdir src/scene
```

- [ ] **Step 3: Update LabScene imports**

In `src/labs/mass-measurement/scene/LabScene.tsx`:
- `from './Lighting'` → `from '../../../sdk/scene/Lighting'`
- `from './CameraRig'` → `from '../../../sdk/scene/CameraRig'`
- `from './Table'` → `from '../../../sdk/scene/Table'`
- `from './objects/TennisBall'` → `from '../objects/TennisBall'`
- `from './objects/Apple'` → `from '../objects/Apple'`
- `from './objects/Baseball'` → `from '../objects/Baseball'`
- `from './objects/Weights'` → `from '../objects/Weights'`
- `from './instruments/DigitalScale'` → `from '../instruments/DigitalScale'`
- `from './instruments/Dynamometer'` → `from '../instruments/Dynamometer'`
- `from './instruments/LeverBalance'` → `from '../instruments/LeverBalance'`
- `from '../ui/Button'` → `from '../../../sdk/ui/Button'`
- `from '../lab/HUD'` → `from '../ui/HUD'`
- `from '../lab/LabState'` → `from '../state/LabState'`
- `from '../lab/tasks'` → `from '../content/tasks'`
- `from '../guided/GuidedOverlay'` → `from '../../../sdk/guided/GuidedOverlay'`
- `from '../guided/SkipGuidanceToggle'` → `from '../../../sdk/guided/SkipGuidanceToggle'`
- `from '../physics/snapTargets'` → `from '../../../sdk/physics/snapTargets'`

- [ ] **Step 4: Verify + commit**

```bash
npx tsc --noEmit && npx vitest run
git add -A
git commit -m "refactor(scene): split into sdk/scene/ (engine) and labs/mass-measurement/scene/ (LabScene)"
```

### Task 0.9: Create LabDefinition type stub and Lab entry component

**Files:**
- Create: `src/sdk/types.ts`
- Create: `src/labs/mass-measurement/index.tsx`

- [ ] **Step 1: Create SDK LabDefinition stub**

`src/sdk/types.ts`:

```ts
/**
 * LabDefinition contract — every lab provides one of these and the SDK
 * wires it into a runnable scene. This is a stub for Slice 0;
 * fields will be filled in as the SDK matures (Slices 1-8).
 */
export type LabDefinition = {
  id: string
  title: string
  // scene, instruments, objects, steps, reveal — added in later slices
}
```

- [ ] **Step 2: Create lab entry component**

`src/labs/mass-measurement/index.tsx`:

```tsx
import { LabScene } from './scene/LabScene'
import { useLabState } from './state/LabState'
import { IntroScreen } from './ui/IntroScreen'
import { SummaryScreen } from './ui/SummaryScreen'

export const massMeasurementDefinition = {
  id: 'mass-measurement',
  title: 'Вимірювання маси тіл',
}

export function MassMeasurementLab() {
  const phase = useLabState(s => s.phase)
  if (phase === 'intro') return <IntroScreen />
  if (phase === 'finished') return <SummaryScreen />
  return <LabScene />
}
```

- [ ] **Step 3: Update src/App.tsx to mount the lab**

Move `App.tsx` to `src/app/App.tsx` and rewrite it to use the new entry:

```bash
git mv src/App.tsx src/app/App.tsx
rm src/app/.gitkeep
```

Then edit `src/app/App.tsx`:

```tsx
import { MassMeasurementLab } from '../labs/mass-measurement'

export default function App() {
  return <MassMeasurementLab />
}
```

- [ ] **Step 4: Update src/main.tsx**

Edit `src/main.tsx` to import from new path:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './app/App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

(Keep existing if it already looks like this — only change the App import path.)

- [ ] **Step 5: Verify + commit**

```bash
npx tsc --noEmit && npx vitest run
npm run dev  # smoke test: open browser, lab should run identically to before
# Ctrl+C dev server when done
git add -A
git commit -m "feat(structure): add LabDefinition stub + MassMeasurementLab entry"
```

### Task 0.10: Slice 0 verification gate

- [ ] **Step 1: Full verification**

```bash
npx tsc --noEmit
npx vitest run
npm run build
```

Expected:
- Typecheck: 0 errors
- Tests: 25/25 passing
- Build: succeeds, no errors

- [ ] **Step 2: Manual smoke test**

```bash
npm run dev
```

Open `http://localhost:5173/`. Walk through one full task (drag tennis ball onto digital scale, type a value, submit, advance to t2). Confirm behavior is identical to the pre-Slice-0 baseline.

- [ ] **Step 3: Confirm git status is clean**

```bash
git status
```

Expected: `nothing to commit, working tree clean`. The folder structure refactor is complete.

---

## Slice 1 — t1 Vertical Polish (Tennis Ball + Digital Scale flagship)

**Outcome:** Walking through task t1 (tennis ball on digital scale) feels gold-standard: cinematic dark studio lighting, brushed-steel platform with anodized housing and glowing 7-segment LCD, magnetic snap animation with tick sound, focus camera that dollies in on snap, polished UI with progress indicator and two-layer hints, success sound on submit. Tasks t2-t9 still work but visually unchanged (handled in Slices 2-4).

**Performance target:** ≥50fps on dev machine. Manual measurement, not automated.

### Task 1.1: Add @react-three/postprocessing dependency

- [ ] **Step 1: Install package**

```bash
npm install @react-three/postprocessing@^3
```

- [ ] **Step 2: Verify installation**

```bash
cat package.json | grep postprocessing
```

Expected: line `"@react-three/postprocessing": "^3..."` present.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "deps: add @react-three/postprocessing for bloom/vignette"
```

### Task 1.2: Animation helpers (TDD)

**Files:**
- Create: `src/sdk/animation/index.ts`
- Create: `src/sdk/animation/__tests__/animation.test.ts`

These are pure math helpers used by tween animations, lever spring-damper, reading-tick interpolation. Pure TDD.

- [ ] **Step 1: Write failing tests**

`src/sdk/animation/__tests__/animation.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { lerp, clamp, easeOutCubic, easeInOutCubic, springStep } from '../index'

describe('lerp', () => {
  it('returns start when t=0', () => {
    expect(lerp(10, 20, 0)).toBe(10)
  })
  it('returns end when t=1', () => {
    expect(lerp(10, 20, 1)).toBe(20)
  })
  it('returns midpoint when t=0.5', () => {
    expect(lerp(10, 20, 0.5)).toBe(15)
  })
})

describe('clamp', () => {
  it('returns value when in range', () => {
    expect(clamp(5, 0, 10)).toBe(5)
  })
  it('clamps to min', () => {
    expect(clamp(-3, 0, 10)).toBe(0)
  })
  it('clamps to max', () => {
    expect(clamp(15, 0, 10)).toBe(10)
  })
})

describe('easeOutCubic', () => {
  it('returns 0 at t=0', () => {
    expect(easeOutCubic(0)).toBe(0)
  })
  it('returns 1 at t=1', () => {
    expect(easeOutCubic(1)).toBe(1)
  })
  it('is past 0.5 at t=0.5 (front-loaded)', () => {
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5)
  })
})

describe('easeInOutCubic', () => {
  it('returns 0 at t=0', () => {
    expect(easeInOutCubic(0)).toBe(0)
  })
  it('returns 1 at t=1', () => {
    expect(easeInOutCubic(1)).toBe(1)
  })
  it('returns 0.5 at t=0.5 (symmetric)', () => {
    expect(easeInOutCubic(0.5)).toBe(0.5)
  })
})

describe('springStep', () => {
  it('does not move when at target with zero velocity', () => {
    const result = springStep({ current: 5, velocity: 0, target: 5, stiffness: 8, damping: 2.5, dt: 0.016 })
    expect(result.current).toBeCloseTo(5, 5)
    expect(result.velocity).toBeCloseTo(0, 5)
  })

  it('moves toward target', () => {
    const result = springStep({ current: 0, velocity: 0, target: 10, stiffness: 8, damping: 2.5, dt: 0.016 })
    expect(result.current).toBeGreaterThan(0)
    expect(result.current).toBeLessThan(10)
    expect(result.velocity).toBeGreaterThan(0)
  })

  it('eventually settles within tolerance', () => {
    let s = { current: 0, velocity: 0 }
    for (let i = 0; i < 1000; i++) {
      const r = springStep({ ...s, target: 10, stiffness: 8, damping: 2.5, dt: 0.016 })
      s = { current: r.current, velocity: r.velocity }
    }
    expect(Math.abs(s.current - 10)).toBeLessThan(0.01)
    expect(Math.abs(s.velocity)).toBeLessThan(0.01)
  })
})
```

- [ ] **Step 2: Run tests — verify failures**

```bash
npx vitest run src/sdk/animation
```

Expected: all FAIL (module not found).

- [ ] **Step 3: Implement helpers**

`src/sdk/animation/index.ts`:

```ts
/**
 * Linear interpolation: returns a value t-fraction of the way from a to b.
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/**
 * Clamp a value into [min, max].
 */
export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

/**
 * Cubic ease-out: starts fast, decelerates to target.
 * Use for snap animations — feels "magnetic".
 */
export function easeOutCubic(t: number): number {
  const u = 1 - t
  return 1 - u * u * u
}

/**
 * Symmetric cubic ease — slow start, fast middle, slow end.
 * Use for camera dollies.
 */
export function easeInOutCubic(t: number): number {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2
}

/**
 * Spring-damper integration step. Returns updated current and velocity.
 * Use for lever-balance beam, dynamometer hook — physical "wobble" then settle.
 *
 * Recommended params for a balance beam: stiffness=8, damping=2.5.
 */
export function springStep(args: {
  current: number
  velocity: number
  target: number
  stiffness: number
  damping: number
  dt: number
}): { current: number; velocity: number } {
  const { current, velocity, target, stiffness, damping, dt } = args
  const force = (target - current) * stiffness - velocity * damping
  const newVelocity = velocity + force * dt
  const newCurrent = current + newVelocity * dt
  return { current: newCurrent, velocity: newVelocity }
}
```

- [ ] **Step 4: Run tests — verify passing**

```bash
npx vitest run src/sdk/animation
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/sdk/animation
git commit -m "feat(sdk/animation): pure math helpers (lerp, ease, spring-damper) with tests"
```

### Task 1.3: SoundManager (TDD-able core + manual playback verification)

**Files:**
- Create: `src/sdk/audio/SoundManager.ts`
- Create: `src/sdk/audio/__tests__/SoundManager.test.ts`
- Create: `public/audio/sdk/.gitkeep` (audio assets sourced in next task)

The pure-logic parts (mute toggle persistence, volume clamp, play-when-not-loaded no-op) are TDD'able. Actual `AudioContext` playback is manual-verify.

- [ ] **Step 1: Write failing tests for SoundManager logic**

`src/sdk/audio/__tests__/SoundManager.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SoundManager } from '../SoundManager'

describe('SoundManager', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('starts unmuted by default', () => {
    const sm = new SoundManager()
    expect(sm.isMuted()).toBe(false)
  })

  it('toggleMute flips state', () => {
    const sm = new SoundManager()
    sm.toggleMute()
    expect(sm.isMuted()).toBe(true)
    sm.toggleMute()
    expect(sm.isMuted()).toBe(false)
  })

  it('persists mute state to localStorage', () => {
    const sm1 = new SoundManager()
    sm1.toggleMute()
    const sm2 = new SoundManager()
    expect(sm2.isMuted()).toBe(true)
  })

  it('setVolume clamps to [0, 1]', () => {
    const sm = new SoundManager()
    sm.setVolume(-0.5)
    expect(sm.getVolume()).toBe(0)
    sm.setVolume(1.5)
    expect(sm.getVolume()).toBe(1)
    sm.setVolume(0.5)
    expect(sm.getVolume()).toBe(0.5)
  })

  it('play is a no-op when no buffer is loaded for the id (does not throw)', () => {
    const sm = new SoundManager()
    expect(() => sm.play('tick')).not.toThrow()
  })

  it('play is a no-op when muted (does not throw)', () => {
    const sm = new SoundManager()
    sm.toggleMute()
    expect(() => sm.play('tick')).not.toThrow()
  })
})
```

- [ ] **Step 2: Run tests — verify failures**

```bash
npx vitest run src/sdk/audio
```

Expected: FAIL (module not found).

- [ ] **Step 3: Implement SoundManager**

`src/sdk/audio/SoundManager.ts`:

```ts
import { clamp } from '../animation'

export type SoundId = 'tick' | 'ding' | 'whoosh' | 'success' | 'error'

const STORAGE_KEY = 'lab-sdk.audio.muted'

export class SoundManager {
  private muted: boolean
  private volume: number = 0.6
  private buffers = new Map<SoundId, AudioBuffer>()
  private ctx: AudioContext | null = null

  constructor() {
    this.muted = readMuted()
  }

  isMuted(): boolean {
    return this.muted
  }

  toggleMute(): void {
    this.muted = !this.muted
    writeMuted(this.muted)
  }

  getVolume(): number {
    return this.volume
  }

  setVolume(v: number): void {
    this.volume = clamp(v, 0, 1)
  }

  /**
   * Lazy-init AudioContext on first user-driven play call.
   * Web Audio API forbids creating a context before user gesture.
   */
  private ensureContext(): AudioContext | null {
    if (this.ctx) return this.ctx
    if (typeof window === 'undefined') return null
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    this.ctx = new Ctor()
    return this.ctx
  }

  /**
   * Preload all sounds. Call after first user interaction.
   */
  async preload(catalog: Record<SoundId, string>): Promise<void> {
    const ctx = this.ensureContext()
    if (!ctx) return
    const entries = Object.entries(catalog) as [SoundId, string][]
    await Promise.all(entries.map(async ([id, url]) => {
      try {
        const res = await fetch(url)
        if (!res.ok) return
        const arrayBuf = await res.arrayBuffer()
        const audioBuf = await ctx.decodeAudioData(arrayBuf)
        this.buffers.set(id, audioBuf)
      } catch {
        // Swallow; play() will no-op if buffer missing.
      }
    }))
  }

  play(id: SoundId, volumeMul: number = 1): void {
    if (this.muted) return
    const buf = this.buffers.get(id)
    if (!buf) return
    const ctx = this.ensureContext()
    if (!ctx || ctx.state === 'suspended') return
    const src = ctx.createBufferSource()
    src.buffer = buf
    const gain = ctx.createGain()
    gain.gain.value = this.volume * volumeMul
    src.connect(gain)
    gain.connect(ctx.destination)
    src.start()
  }
}

function readMuted(): boolean {
  if (typeof localStorage === 'undefined') return false
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function writeMuted(v: boolean): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, v ? '1' : '0')
  } catch {
    // ignore
  }
}

// Singleton for convenience.
export const sound = new SoundManager()
```

- [ ] **Step 4: Run tests — verify passing**

```bash
npx vitest run src/sdk/audio
```

Expected: 6/6 PASS.

- [ ] **Step 5: Commit**

```bash
git add src/sdk/audio
git commit -m "feat(sdk/audio): SoundManager with persistent mute, lazy AudioContext, and tests"
```

### Task 1.4: Source CC0 sound assets

This is a one-shot manual task — sources audio files from freesound.org with CC0 license.

- [ ] **Step 1: Download 5 CC0 sound files**

Download these to `public/audio/sdk/`:

| Filename | Source guidance | Approximate length |
|---|---|---|
| `tick.mp3` | Search freesound.org "ui click subtle" filtered by Creative Commons 0 | 80ms |
| `ding.mp3` | Search "soft notification ding cc0" | 250ms |
| `whoosh.mp3` | Search "low whoosh transition cc0" | 600ms |
| `success.mp3` | Search "achievement chord short cc0" | 1.2s |
| `error.mp3` | Search "buzz short error cc0" | 200ms |

If the implementer cannot source files manually in this step, leave a TODO commit with empty placeholder MP3 files (a minimum-valid 0.1s silent MP3 — generated via `ffmpeg -f lavfi -i anullsrc=r=44100:cl=mono -t 0.1 -q:a 9 -acodec libmp3lame public/audio/sdk/tick.mp3` etc.). Real assets get sourced before final demo.

- [ ] **Step 2: Create credits file**

`public/audio/CREDITS.md`:

```md
# Audio Credits

All sounds in this directory are Public Domain (CC0) sourced from freesound.org.

## sdk/

- `tick.mp3` — [author/url] (CC0)
- `ding.mp3` — [author/url] (CC0)
- `whoosh.mp3` — [author/url] (CC0)
- `success.mp3` — [author/url] (CC0)
- `error.mp3` — [author/url] (CC0)

If a placeholder silent MP3 is currently in place, replace before public release and update credits accordingly.
```

- [ ] **Step 3: Commit**

```bash
rm public/audio/sdk/.gitkeep 2>/dev/null
git add public/audio
git commit -m "feat(audio): add CC0 sound assets (tick/ding/whoosh/success/error) + credits"
```

### Task 1.5: Wire SoundManager into the lab + add a mute toggle

**Files:**
- Modify: `src/labs/mass-measurement/scene/LabScene.tsx`
- Create: `src/sdk/ui/SoundToggle.tsx`

- [ ] **Step 1: Create SoundToggle UI component**

`src/sdk/ui/SoundToggle.tsx`:

```tsx
import { useState } from 'react'
import { sound } from '../audio/SoundManager'

export function SoundToggle() {
  const [muted, setMuted] = useState(sound.isMuted())
  const onClick = () => {
    sound.toggleMute()
    setMuted(sound.isMuted())
  }
  return (
    <button
      onClick={onClick}
      title={muted ? 'Увімкнути звук' : 'Вимкнути звук'}
      style={{
        background: 'rgba(20,20,24,0.72)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.08)',
        color: '#f5f5f7',
        borderRadius: 8,
        width: 40,
        height: 40,
        fontSize: 18,
        cursor: 'pointer',
      }}
      aria-label={muted ? 'Увімкнути звук' : 'Вимкнути звук'}
    >
      {muted ? '🔇' : '🔊'}
    </button>
  )
}
```

- [ ] **Step 2: Preload sounds on first lab mount**

Edit `src/labs/mass-measurement/index.tsx`. Add a `useEffect` that preloads sounds after first interaction:

```tsx
import { useEffect } from 'react'
import { sound } from '../../sdk/audio/SoundManager'
import { LabScene } from './scene/LabScene'
import { useLabState } from './state/LabState'
import { IntroScreen } from './ui/IntroScreen'
import { SummaryScreen } from './ui/SummaryScreen'

export const massMeasurementDefinition = {
  id: 'mass-measurement',
  title: 'Вимірювання маси тіл',
}

const SOUND_CATALOG = {
  tick: '/audio/sdk/tick.mp3',
  ding: '/audio/sdk/ding.mp3',
  whoosh: '/audio/sdk/whoosh.mp3',
  success: '/audio/sdk/success.mp3',
  error: '/audio/sdk/error.mp3',
} as const

export function MassMeasurementLab() {
  const phase = useLabState(s => s.phase)

  useEffect(() => {
    if (phase !== 'in-progress') return
    sound.preload(SOUND_CATALOG)
  }, [phase])

  if (phase === 'intro') return <IntroScreen />
  if (phase === 'finished') return <SummaryScreen />
  return <LabScene />
}
```

- [ ] **Step 3: Add SoundToggle to LabScene controls**

Edit `src/labs/mass-measurement/scene/LabScene.tsx`. Locate the bottom-right controls block (Camera/Reset buttons). Add `<SoundToggle/>`:

```tsx
import { SoundToggle } from '../../../sdk/ui/SoundToggle'
// ...
<div style={{ position: 'fixed', bottom: 16, right: 16, display: 'flex', gap: 8, zIndex: 10 }}>
  <SoundToggle />
  <Button variant="secondary" onClick={() => respawnObjects()}>↻ Скинути предмети</Button>
  <Button variant="secondary" onClick={() => setPreset('overview')}>Камера</Button>
</div>
```

- [ ] **Step 4: Manual smoke test**

```bash
npm run dev
```

- Open lab, verify mute icon shows in bottom-right.
- Click it — should toggle 🔊 ↔ 🔇.
- Reload page — toggle state should persist.

- [ ] **Step 5: Commit**

```bash
git add src/sdk/ui/SoundToggle.tsx src/labs/mass-measurement
git commit -m "feat(audio): wire SoundManager + SoundToggle into mass-measurement lab"
```

### Task 1.6: Cinematic Lighting (sdk/scene/CinematicLighting.tsx)

**Files:**
- Create: `src/sdk/scene/CinematicLighting.tsx`
- Modify: `src/labs/mass-measurement/scene/LabScene.tsx`

- [ ] **Step 1: Create CinematicLighting component**

`src/sdk/scene/CinematicLighting.tsx`:

```tsx
/**
 * 3-point cinematic lighting preset (Tesla unveiling vibe).
 * Warm key light, cool fill, warm rim, low ambient + subtle hemisphere.
 */
export function CinematicLighting({ shadows = true }: { shadows?: boolean }) {
  return (
    <>
      <ambientLight intensity={0.15} />
      <hemisphereLight args={['#2a3040', '#1a1208', 0.3]} />
      {/* Key */}
      <directionalLight
        position={[2, 4, 2]}
        intensity={2.5}
        color="#fff5e8"
        castShadow={shadows}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={0.1}
        shadow-camera-far={10}
        shadow-camera-left={-2}
        shadow-camera-right={2}
        shadow-camera-top={2}
        shadow-camera-bottom={-2}
      />
      {/* Fill */}
      <directionalLight position={[-2, 2, 1]} intensity={0.6} color="#b0c8e8" />
      {/* Rim */}
      <directionalLight position={[0, 1, -3]} intensity={1.5} color="#ffd0a0" />
    </>
  )
}
```

- [ ] **Step 2: Replace old Lighting in LabScene**

Edit `src/labs/mass-measurement/scene/LabScene.tsx`:

- Replace import:
  - `from '../../../sdk/scene/Lighting'` → `from '../../../sdk/scene/CinematicLighting'`
- Replace `<Lighting />` JSX with `<CinematicLighting />`

Then enable shadow rendering on the Canvas. Find the `<Canvas ...>` and add `shadows`:

```tsx
<Canvas
  camera={{ position: [0, 1.5, 2.0], fov: 50 }}
  dpr={[1, 1.5]}
  shadows
  style={{ position: 'fixed', inset: 0, background: 'radial-gradient(ellipse at center, #2a2a30 0%, #1a1a1e 50%, #0a0a0c 100%)' }}
>
```

(Background gradient also lands here in this step — replaces the flat `#2a2a2a`.)

- [ ] **Step 3: Make the table cast/receive shadows**

Edit `src/sdk/scene/Table.tsx`. Find the table mesh, add `castShadow receiveShadow` props on the `<mesh>` tag.

- [ ] **Step 4: Make tennis ball + digital scale cast shadows**

Edit `src/labs/mass-measurement/objects/TennisBall.tsx` — find the `<mesh>` for the ball geometry, add `castShadow receiveShadow`.

Edit `src/labs/mass-measurement/instruments/DigitalScale.tsx` — find each `<mesh>` for housing, platform, and add `castShadow receiveShadow` to each.

(Other instruments and objects polished in later slices.)

- [ ] **Step 5: Manual verification**

```bash
npm run dev
```

Expected at `http://localhost:5173/`:
- Background is dark radial gradient (was flat #2a2a2a)
- Lighting is dramatic — clear key direction with warm tone, contrasting cool fill
- Tennis ball casts a visible shadow on the table
- Digital scale casts a shadow

- [ ] **Step 6: Commit**

```bash
git add src/sdk/scene/CinematicLighting.tsx src/sdk/scene/Table.tsx \
        src/labs/mass-measurement/objects/TennisBall.tsx \
        src/labs/mass-measurement/instruments/DigitalScale.tsx \
        src/labs/mass-measurement/scene/LabScene.tsx
git commit -m "feat(visual): cinematic 3-point lighting + radial dark background + shadows for ball/scale"
```

Note: `Lighting.tsx` is still in `sdk/scene/` from Slice 0. Leave it for now — Slices 2-4 will remove it once all instruments use the new lighting consistently.

### Task 1.7: Post-FX (Bloom + Vignette + ACES tone mapping)

**Files:**
- Create: `src/sdk/scene/PostFX.tsx`
- Modify: `src/labs/mass-measurement/scene/LabScene.tsx`

- [ ] **Step 1: Create PostFX component**

`src/sdk/scene/PostFX.tsx`:

```tsx
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'

/**
 * Light post-processing pass. Bloom for highlights/LCD glow, vignette
 * for compositional focus. Tone mapping is applied at the Canvas-level
 * via gl prop (ACESFilmicToneMapping) — not via a post pass for perf.
 */
export function PostFX() {
  return (
    <EffectComposer>
      <Bloom intensity={0.4} luminanceThreshold={0.9} luminanceSmoothing={0.05} mipmapBlur />
      <Vignette eskil={false} offset={0.3} darkness={0.6} />
    </EffectComposer>
  )
}
```

- [ ] **Step 2: Wire PostFX + tone mapping into Canvas**

Edit `src/labs/mass-measurement/scene/LabScene.tsx`:

```tsx
import { ACESFilmicToneMapping } from 'three'
import { PostFX } from '../../../sdk/scene/PostFX'
// ...

<Canvas
  camera={{ position: [0, 1.5, 2.0], fov: 50 }}
  dpr={[1, 1.5]}
  shadows
  gl={{ toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1.0 }}
  style={{ position: 'fixed', inset: 0, background: 'radial-gradient(ellipse at center, #2a2a30 0%, #1a1a1e 50%, #0a0a0c 100%)' }}
>
  <CinematicLighting />
  {/* ... rest of scene unchanged ... */}
  <PostFX />
</Canvas>
```

`PostFX` must be a child of `Canvas` (after all 3D content), OUTSIDE `<Physics>` (effects work on the rendered output).

- [ ] **Step 3: Manual perf check**

```bash
npm run dev
```

Open browser dev tools → Performance / FPS counter. Walk through t1.

Expected: ≥50fps stable on dev machine. If under 50fps:
- Try reducing Bloom `intensity` to 0.25
- Try removing Vignette (cheaper without it)
- If still bad, comment out `<PostFX />` and skip; fall back path is acceptable for slice 1 if perf budget tight on target hardware.

- [ ] **Step 4: Commit**

```bash
git add src/sdk/scene/PostFX.tsx src/labs/mass-measurement/scene/LabScene.tsx
git commit -m "feat(visual): post-fx (bloom + vignette) + ACES tone mapping"
```

### Task 1.8: Snap animation — magnetic-pull tween (TDD logic + integration)

**Files:**
- Modify: `src/sdk/physics/snapTargets.ts` (add `animateSnap` helper)
- Modify: `src/sdk/physics/useDrag.ts` (use animation on drop)
- Create: `src/sdk/physics/__tests__/snapAnimation.test.ts`

The tween logic itself is testable. Integration with R3F is manual.

- [ ] **Step 1: Write failing test for tween progress**

`src/sdk/physics/__tests__/snapAnimation.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { snapProgress } from '../snapTargets'

describe('snapProgress', () => {
  it('returns 0 at elapsed=0', () => {
    expect(snapProgress(0, 300)).toBe(0)
  })

  it('returns 1 when elapsed >= duration', () => {
    expect(snapProgress(300, 300)).toBe(1)
    expect(snapProgress(500, 300)).toBe(1)
  })

  it('eases out (front-loaded) — value past 0.5 at midpoint', () => {
    expect(snapProgress(150, 300)).toBeGreaterThan(0.5)
  })
})
```

- [ ] **Step 2: Run test — verify failure**

```bash
npx vitest run src/sdk/physics
```

Expected: FAIL.

- [ ] **Step 3: Add snapProgress export**

Edit `src/sdk/physics/snapTargets.ts`. At the end of the file:

```ts
import { clamp, easeOutCubic } from '../animation'

/**
 * Returns 0..1 progress of a magnetic-pull snap tween.
 * elapsed and duration in milliseconds. Eases out (front-loaded).
 */
export function snapProgress(elapsedMs: number, durationMs: number): number {
  const t = clamp(elapsedMs / durationMs, 0, 1)
  return easeOutCubic(t)
}
```

- [ ] **Step 4: Run test — verify passing**

```bash
npx vitest run src/sdk/physics
```

Expected: 3/3 PASS.

- [ ] **Step 5: Integrate snap animation into useDrag**

Edit `src/sdk/physics/useDrag.ts`. Currently `onPointerUp` calls `snap.onAttach` immediately. Change to a 300ms tween that walks the body from its drop position to the snap target before calling `onAttach`.

Replace the `onPointerUp` body:

```ts
const onPointerUp = (ev: ThreeEvent<PointerEvent>) => {
  if (ev.pointerId !== pointerId.current) return
  isDragging.current = false
  pointerId.current = null
  ;(ev.target as Element).releasePointerCapture(ev.pointerId)
  if (!rigidBody.current) return
  const t = rigidBody.current.translation()
  const dropPos = new Vector3(t.x, t.y, t.z)
  const snap = findSnapNear(dropPos, bodyId)
  if (!snap) {
    rigidBody.current.setBodyType(RigidBodyType.Dynamic, true)
    return
  }
  // Magnetic-pull tween: kinematic body walked from dropPos to snap.position over 300ms.
  setLastSnap(snap.id)
  animateMagneticSnap(rigidBody.current, dropPos, snap.position, 300, () => {
    if (!rigidBody.current) return
    snap.onAttach(rigidBody.current)
    if (!snap.keepKinematic) {
      rigidBody.current.setBodyType(RigidBodyType.Dynamic, true)
    }
  })
}
```

Add the `animateMagneticSnap` helper at module scope (above the hook, or imported from `snapTargets.ts`):

```ts
import { snapProgress } from './snapTargets'

function animateMagneticSnap(
  body: RapierRigidBody,
  from: Vector3,
  to: Vector3,
  durationMs: number,
  done: () => void,
): void {
  const start = performance.now()
  const step = () => {
    const elapsed = performance.now() - start
    const u = snapProgress(elapsed, durationMs)
    const x = from.x + (to.x - from.x) * u
    const y = from.y + (to.y - from.y) * u
    const z = from.z + (to.z - from.z) * u
    body.setNextKinematicTranslation({ x, y, z })
    if (u >= 1) {
      done()
      return
    }
    requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}
```

- [ ] **Step 6: Verify all existing tests still pass**

```bash
npx vitest run
npx tsc --noEmit
```

Expected: 28/28 (25 existing + 3 new) PASS.

- [ ] **Step 7: Manual verify**

```bash
npm run dev
```

Drag tennis ball over digital scale, release. Expected: ball glides to platform over ~300ms instead of teleporting. Feels magnetic.

- [ ] **Step 8: Commit**

```bash
git add src/sdk/physics
git commit -m "feat(physics): magnetic-pull snap animation (300ms ease-out tween) + tests"
```

### Task 1.9: Camera focus presets + auto-dolly to active instrument

**Files:**
- Modify: `src/sdk/scene/CameraRig.tsx`
- Modify: `src/labs/mass-measurement/scene/LabScene.tsx`

- [ ] **Step 1: Read current CameraRig to understand baseline**

Open `src/sdk/scene/CameraRig.tsx` and review. The existing component takes a `preset` prop (`'overview'` etc.). Extend with focus presets.

- [ ] **Step 2: Extend preset type and add focus poses**

Edit `src/sdk/scene/CameraRig.tsx`. Replace existing preset enum and pose mapping:

```tsx
import { useThree, useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { Vector3 } from 'three'
import { easeInOutCubic, clamp } from '../animation'

export type CameraPreset =
  | 'intro'
  | 'overview'      // existing default — keep for compatibility
  | 'workspace'     // new: front + slightly above
  | 'focus-scale'
  | 'focus-lever'
  | 'focus-dyn'
  | 'reveal'

type Pose = { position: [number, number, number]; lookAt: [number, number, number] }

const POSES: Record<CameraPreset, Pose> = {
  intro:        { position: [0, 2.5, 2.5],  lookAt: [0, 0.85, 0]    },
  overview:     { position: [0, 1.5, 2.0],  lookAt: [0, 0.85, 0]    },
  workspace:    { position: [0, 1.4, 1.8],  lookAt: [0, 0.9, 0]     },
  'focus-scale':{ position: [0.75, 1.2, 1.2], lookAt: [0.75, 0.95, 0] },
  'focus-lever':{ position: [0.05, 1.3, 1.3], lookAt: [0.05, 1.0, 0]  },
  'focus-dyn':  { position: [-0.55, 1.3, 1.3], lookAt: [-0.55, 1.05, 0] },
  reveal:       { position: [0, 3.5, 3.5],  lookAt: [0, 1.0, 0]     },
}

const DOLLY_DURATION_MS = 1500

type Props = { preset: CameraPreset }

export function CameraRig({ preset }: Props) {
  const { camera } = useThree()
  const tweenStart = useRef<number | null>(null)
  const fromPos = useRef(new Vector3())
  const fromLook = useRef(new Vector3())
  const targetLook = useRef(new Vector3())
  const lastPreset = useRef<CameraPreset | null>(null)

  useEffect(() => {
    if (lastPreset.current === preset) return
    fromPos.current.copy(camera.position)
    // Approximate "from look" as forward direction projected onto current focus plane:
    const dir = new Vector3()
    camera.getWorldDirection(dir)
    fromLook.current.copy(camera.position).add(dir)
    const target = POSES[preset]
    targetLook.current.set(...target.lookAt)
    tweenStart.current = performance.now()
    lastPreset.current = preset
  }, [preset, camera])

  useFrame(() => {
    if (tweenStart.current === null) return
    const elapsed = performance.now() - tweenStart.current
    const t = clamp(elapsed / DOLLY_DURATION_MS, 0, 1)
    const u = easeInOutCubic(t)
    const target = POSES[preset]
    camera.position.set(
      fromPos.current.x + (target.position[0] - fromPos.current.x) * u,
      fromPos.current.y + (target.position[1] - fromPos.current.y) * u,
      fromPos.current.z + (target.position[2] - fromPos.current.z) * u,
    )
    const lookX = fromLook.current.x + (targetLook.current.x - fromLook.current.x) * u
    const lookY = fromLook.current.y + (targetLook.current.y - fromLook.current.y) * u
    const lookZ = fromLook.current.z + (targetLook.current.z - fromLook.current.z) * u
    camera.lookAt(lookX, lookY, lookZ)
    if (t >= 1) {
      tweenStart.current = null
    }
  })

  return null
}
```

- [ ] **Step 3: Drive preset from active instrument in LabScene**

Edit `src/labs/mass-measurement/scene/LabScene.tsx`. Replace the `useState<CameraPreset>('overview')` with a derived preset based on `activeInstrumentId`:

```tsx
import type { CameraPreset } from '../../../sdk/scene/CameraRig'
// ...

function instrumentToPreset(id: string | null): CameraPreset {
  if (id === 'digital-scale') return 'focus-scale'
  if (id === 'lever-balance') return 'focus-lever'
  if (id === 'dynamometer')   return 'focus-dyn'
  return 'workspace'
}

// inside component:
const preset: CameraPreset = instrumentToPreset(activeInstrumentId)
// ...
<CameraRig preset={preset} />
```

Remove the `setPreset` state and the bottom-right "Камера" button (or keep but make it a manual override toggle to `overview`) — for Slice 1, the auto preset is sufficient. Drop the manual button for now:

```tsx
<div style={{ position: 'fixed', bottom: 16, right: 16, display: 'flex', gap: 8, zIndex: 10 }}>
  <SoundToggle />
  <Button variant="secondary" onClick={() => respawnObjects()}>↻ Скинути предмети</Button>
</div>
```

- [ ] **Step 4: Manual verification**

```bash
npm run dev
```

Walk through tasks t1 → t2 → t3. Camera should smoothly dolly between focus-scale → focus-lever → focus-dyn over ~1.5 seconds.

- [ ] **Step 5: Verify typecheck**

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/sdk/scene/CameraRig.tsx src/labs/mass-measurement/scene/LabScene.tsx
git commit -m "feat(scene): camera focus presets + auto-dolly on active instrument change"
```

### Task 1.10: Reading-tick animation on Digital Scale LCD (TDD lerp helper, integration manual)

The LCD currently snaps to the new reading instantly. Make digits interpolate ~500ms toward target using `lerp` (already tested in Task 1.2).

**Files:**
- Modify: `src/labs/mass-measurement/instruments/DigitalScale.tsx`

- [ ] **Step 1: Add tick-toward-target in DigitalScale useFrame**

Edit `src/labs/mass-measurement/instruments/DigitalScale.tsx`. Find the existing `useFrame` block. The current code already does smoothing (`prev * 0.7 + grams * 0.3`) — replace with `lerp` against a target and snap when close:

```tsx
import { lerp } from '../../../sdk/animation'
// ...

useFrame(() => {
  let totalMassKg = 0
  snappedItems.current.forEach(b => { totalMassKg += getBodyMass(b) })
  const targetGrams = Math.max(0, totalMassKg * 1000 - tareOffset)
  setReading(prev => {
    const next = lerp(prev, targetGrams, 0.15)
    return Math.abs(next - targetGrams) < 0.5 ? targetGrams : next
  })
  setDigitalScale(Math.round(targetGrams))
})
```

- [ ] **Step 2: Manual verification**

```bash
npm run dev
```

Drop tennis ball on scale. Expected: LCD digits visibly tick from 0 toward 58 over ~500ms, then settle. Not an instant jump.

- [ ] **Step 3: Commit**

```bash
git add src/labs/mass-measurement/instruments/DigitalScale.tsx
git commit -m "feat(scale): LCD digits interpolate toward target reading using lerp"
```

### Task 1.11: PBR materials — Tennis ball and Digital Scale

**Files:**
- Modify: `src/labs/mass-measurement/objects/TennisBall.tsx`
- Modify: `src/labs/mass-measurement/instruments/DigitalScale.tsx`

These are visual-only changes. No tests; manual verification.

- [ ] **Step 1: Update Tennis ball material**

Edit `src/labs/mass-measurement/objects/TennisBall.tsx`. Find the felt material on the ball mesh. Replace the existing `<meshStandardMaterial>` with one configured for felt:

```tsx
<meshStandardMaterial
  map={feltTexture}
  metalness={0}
  roughness={0.85}
  envMapIntensity={0.6}
/>
```

If there's an existing seam/decal, leave it. The change is roughness up + metalness 0 + env intensity tuning so it reads as fabric.

- [ ] **Step 2: Update Digital Scale platform — brushed steel**

Edit `src/labs/mass-measurement/instruments/DigitalScale.tsx`. Locate the platform mesh. Replace its material:

```tsx
<meshStandardMaterial
  color="#9a9aa0"
  metalness={0.85}
  roughness={0.35}
  envMapIntensity={1.0}
/>
```

- [ ] **Step 3: Update Digital Scale housing — anodized matte black**

Same file. Locate the housing `RoundedBox` material. Replace with:

```tsx
<meshStandardMaterial
  color="#222226"
  metalness={0.7}
  roughness={0.4}
  envMapIntensity={0.8}
/>
```

- [ ] **Step 4: Add a procedural environment for reflections**

Without an environment, metals look dead. Use drei's `Environment` with a built-in preset.

Edit `src/labs/mass-measurement/scene/LabScene.tsx`:

```tsx
import { Environment } from '@react-three/drei'
// inside <Physics>:
<Environment preset="studio" background={false} resolution={64} />
```

`resolution={64}` is intentionally low for perf (we don't need crisp env details — just enough to give metals a reflective base).

- [ ] **Step 5: Manual verification**

```bash
npm run dev
```

Expected:
- Tennis ball reads as fabric with subtle environment pickup
- Digital scale platform looks like brushed steel (slightly reflective, not mirror)
- Housing looks like satin black plastic / anodized aluminum
- The whole thing has a "lit by studio" feel

If perf drops below 50fps, drop `Environment resolution` to 32.

- [ ] **Step 6: Commit**

```bash
git add src/labs/mass-measurement/objects/TennisBall.tsx \
        src/labs/mass-measurement/instruments/DigitalScale.tsx \
        src/labs/mass-measurement/scene/LabScene.tsx
git commit -m "feat(materials): PBR upgrade — felt tennis ball, brushed steel platform, anodized housing, low-res env map"
```

### Task 1.12: LCD upgrade — 7-segment style + green glow

**Files:**
- Modify: `src/labs/mass-measurement/textures/lcdTexture.ts`

The existing LCD is a procedural canvas texture. Upgrade the rendering to look like 7-segment with strong glow.

- [ ] **Step 1: Read current implementation**

Open `src/labs/mass-measurement/textures/lcdTexture.ts` and review. We want to keep the same exported function shape (`createLcdTexture`, `drawLcd`) so call sites in `DigitalScale.tsx` don't change. Internals get rewritten.

- [ ] **Step 2: Rewrite drawLcd**

Replace the body of `drawLcd` with a thicker, glowing 7-segment-style render. Keep `createLcdTexture` the same (creates a CanvasTexture). New `drawLcd`:

```ts
export function drawLcd(texture: CanvasTexture, value: number) {
  const canvas = texture.image as HTMLCanvasElement
  const ctx = canvas.getContext('2d')!
  const W = canvas.width
  const H = canvas.height

  // Background — deep black, slightly inset
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = '#050505'
  ctx.fillRect(8, 8, W - 16, H - 16)

  // Faint scanlines
  ctx.fillStyle = 'rgba(127, 255, 96, 0.04)'
  for (let y = 0; y < H; y += 4) {
    ctx.fillRect(0, y, W, 1)
  }

  // The number — formatted with units
  const text = `${Math.round(value)} g`

  // Strong green glow
  ctx.font = `bold ${Math.floor(H * 0.55)}px "Courier New", "Lucida Console", monospace`
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'right'

  // Outer halo
  ctx.shadowColor = '#7fff60'
  ctx.shadowBlur = 24
  ctx.fillStyle = '#7fff60'
  ctx.fillText(text, W - 24, H / 2)

  // Inner crisp pass
  ctx.shadowBlur = 0
  ctx.fillStyle = '#c8ffaf'
  ctx.fillText(text, W - 24, H / 2)

  texture.needsUpdate = true
}
```

- [ ] **Step 3: Manual verification**

```bash
npm run dev
```

Expected: LCD displays with strong warm-green glow, slight scanlines, monospace digits. With Bloom from PostFX, the glow blooms beautifully.

- [ ] **Step 4: Commit**

```bash
git add src/labs/mass-measurement/textures/lcdTexture.ts
git commit -m "feat(lcd): 7-segment style render with green glow + scanlines"
```

### Task 1.13: Step DSL — extend with hintExplanation, sound, micropause (TDD)

**Files:**
- Modify: `src/sdk/guided/TaskSteps.ts`
- Modify: `src/sdk/guided/StepEngine.ts`
- Create: `src/sdk/guided/__tests__/stepDsl.test.ts`
- Modify: `src/labs/mass-measurement/content/steps.ts`

- [ ] **Step 1: Write failing test for the extended Step type**

`src/sdk/guided/__tests__/stepDsl.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import type { Step } from '../TaskSteps'

describe('Step DSL', () => {
  it('accepts a step with hintExplanation', () => {
    const step: Step = {
      id: 'place',
      target: { kind: 'instrument', id: 'digital-scale' },
      visualHint: 'target-ring',
      hintTitle: 'Поклади на платформу',
      hintExplanation: 'Електронні ваги вимірюють силу тиску',
      complete: { kind: 'snapped', targetPrefix: 'digital-scale' },
    }
    expect(step.hintTitle).toBe('Поклади на платформу')
    expect(step.hintExplanation).toBe('Електронні ваги вимірюють силу тиску')
  })

  it('accepts a step with sound', () => {
    const step: Step = {
      id: 'place',
      target: { kind: 'instrument', id: 'digital-scale' },
      visualHint: 'target-ring',
      hintTitle: 'Поклади',
      sound: 'tick',
      complete: { kind: 'snapped', targetPrefix: 'digital-scale' },
    }
    expect(step.sound).toBe('tick')
  })

  it('accepts a step with micropause', () => {
    const step: Step = {
      id: 'place',
      target: { kind: 'instrument', id: 'digital-scale' },
      visualHint: 'target-ring',
      hintTitle: 'Поклади',
      micropause: 250,
      complete: { kind: 'snapped', targetPrefix: 'digital-scale' },
    }
    expect(step.micropause).toBe(250)
  })

  it('still accepts the legacy hintTemplate (back-compat)', () => {
    const step: Step = {
      id: 'place',
      target: { kind: 'instrument', id: 'digital-scale' },
      visualHint: 'target-ring',
      hintTemplate: 'Покладіть м\'яч',
      complete: { kind: 'snapped', targetPrefix: 'digital-scale' },
    }
    expect(step.hintTemplate).toBe('Покладіть м\'яч')
  })
})
```

- [ ] **Step 2: Run test — verify failure**

```bash
npx vitest run src/sdk/guided
```

Expected: type errors compiling the test file.

- [ ] **Step 3: Extend Step type**

Edit `src/sdk/guided/TaskSteps.ts`:

```ts
export type SoundId = 'tick' | 'ding' | 'whoosh' | 'success' | 'error'

export type Step = {
  id: string
  target: StepTarget
  visualHint: 'arrow' | 'glow' | 'target-ring' | 'highlight'
  /** Legacy single-line hint. Prefer hintTitle + hintExplanation. */
  hintTemplate?: string
  /** Short instruction (what to do). Required for new content. */
  hintTitle?: string
  /** Educational "why" context shown below the title. Optional. */
  hintExplanation?: string
  /** Milliseconds to wait after completion before advancing. */
  micropause?: number
  /** Sound to play on completion. */
  sound?: SoundId
  complete: CompletionRule
}
```

(The fields are all optional except `id`, `target`, `visualHint`, `complete` to maintain back-compat with existing content.)

- [ ] **Step 4: Run tests — verify pass**

```bash
npx vitest run src/sdk/guided
```

Expected: 4/4 PASS plus all existing engine tests still pass.

- [ ] **Step 5: Update lab content for t1 to use new fields**

Edit `src/labs/mass-measurement/content/steps.ts`. Currently `makeDigitalScaleSteps` uses `hintTemplate`. Migrate the t1 entries (which return for `objectId === 'tennis-ball'`) to use `hintTitle` + `hintExplanation` + `sound`. Keep t2-t9 on the legacy field for now (they get migrated in later slices).

Replace the body of `makeDigitalScaleSteps` for the tennis-ball case only — easiest is to give the function a parameter and branch, but cleaner is to duplicate just the tennis-ball one and leave the original for apple/baseball:

```ts
function makeDigitalScaleStepsTennis(): Step[] {
  return [
    {
      id: 'pickup',
      target: { kind: 'object', id: 'tennis-ball' },
      visualHint: 'arrow',
      hintTitle: 'Візьми тенісний м\'яч',
      hintExplanation: 'Натисни і утримуй, щоб взяти предмет',
      complete: { kind: 'dragging', bodyPattern: 'tennis-ball' },
    },
    {
      id: 'place',
      target: { kind: 'instrument', id: 'digital-scale' },
      visualHint: 'target-ring',
      hintTitle: 'Поклади на платформу електронних ваг',
      hintExplanation: 'Електронні ваги вимірюють силу тиску і конвертують у грами',
      sound: 'tick',
      complete: { kind: 'snapped', targetPrefix: 'digital-scale' },
    },
    {
      id: 'read',
      target: { kind: 'instrument', id: 'digital-scale' },
      visualHint: 'highlight',
      hintTitle: 'Дисплей показує {digitalScaleGrams} г',
      hintExplanation: 'Зачекай, поки число стабілізується',
      complete: { kind: 'reading-stable', instrument: 'digital-scale', minValue: 1, durationMs: 1500 },
    },
    {
      id: 'enter',
      target: { kind: 'ui', id: 'input' },
      visualHint: 'arrow',
      hintTitle: 'Введи {digitalScaleGrams} у поле нижче',
      hintExplanation: 'Перевір, що значення збігається з показниками приладу',
      complete: { kind: 'input-focused' },
    },
    {
      id: 'submit',
      target: { kind: 'ui', id: 'submit' },
      visualHint: 'arrow',
      hintTitle: 'Натисни «Записати»',
      sound: 'ding',
      complete: { kind: 'submitted' },
    },
  ]
}
```

Then in the `TASK_STEPS` map, replace the t1 entry:

```ts
export const TASK_STEPS: TaskStepsMap = {
  t1: makeDigitalScaleStepsTennis(),  // upgraded
  t2: makeLeverBalanceSteps('t2', 'tennis-ball'),
  // ...rest unchanged
}
```

- [ ] **Step 6: Wire sound playback in StepEngine**

Edit `src/sdk/guided/StepEngine.ts`. Find where step transitions happen — when a step is marked complete and advance happens, play `step.sound` if defined.

If the engine doesn't have a single advance call site, edit `GuidedOverlay.tsx` (which orchestrates step completion) to call `sound.play(step.sound)` on the just-completed step.

Concrete approach — the cleanest spot is `GuidedOverlay.tsx` where `isStepComplete` triggers `advanceStep`. Add:

```tsx
import { sound } from '../audio/SoundManager'
// ...
if (isStepComplete(step.complete, ctx)) {
  if (step.sound) sound.play(step.sound)
  if (step.micropause) {
    setTimeout(() => advanceStep(), step.micropause)
  } else {
    advanceStep()
  }
}
```

Read the actual file first; if `advanceStep` is already wrapped in any handler, integrate without breaking that.

- [ ] **Step 7: Verify all tests + typecheck**

```bash
npx tsc --noEmit && npx vitest run
```

Expected: green.

- [ ] **Step 8: Manual verification**

```bash
npm run dev
```

Walk t1: drag ball, drop on scale (expect tick sound), reading ticks up, type value, submit (expect ding sound). Check `hintExplanation` text appears as a second line below the main hint (verified in next task — for now just confirm no regression).

- [ ] **Step 9: Commit**

```bash
git add src/sdk/guided/TaskSteps.ts src/sdk/guided/StepEngine.ts \
        src/sdk/guided/GuidedOverlay.tsx src/sdk/guided/__tests__ \
        src/labs/mass-measurement/content/steps.ts
git commit -m "feat(guided): extend Step DSL (hintTitle, hintExplanation, sound, micropause); migrate t1; wire sounds"
```

### Task 1.14: HUD redesign — progress indicator + two-layer hints

**Files:**
- Modify: `src/labs/mass-measurement/ui/HUD.tsx`

- [ ] **Step 1: Read current HUD**

Open `src/labs/mass-measurement/ui/HUD.tsx`. Review what it currently renders.

- [ ] **Step 2: Add a 9-segment progress bar above current task**

Insert at the top of the "ЗАРАЗ РОБИМО" panel (where the current task displays):

```tsx
function TaskProgressBar({ currentIndex, total }: { currentIndex: number; total: number }) {
  return (
    <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
      {Array.from({ length: total }).map((_, i) => {
        const state = i < currentIndex ? 'done' : i === currentIndex ? 'active' : 'pending'
        const bg = state === 'done'   ? '#34c759'
                 : state === 'active' ? '#0a84ff'
                 :                       'rgba(255,255,255,0.12)'
        return <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: bg }} />
      })}
    </div>
  )
}
```

Use it inside the panel:

```tsx
<TaskProgressBar currentIndex={idx} total={tasks.length} />
```

(Where `idx` is the current task index from `useLabState`. Read existing HUD to find where idx/tasks come from; reuse the same store accessors.)

- [ ] **Step 3: Render two-layer hint when current step has hintTitle/hintExplanation**

Find where current step's hint string is rendered. Add a fallback that renders the new fields when present:

```tsx
{currentStep && (
  <>
    <div style={{ fontSize: 16, fontWeight: 600, color: '#0a84ff', marginBottom: 4 }}>
      {currentStep.hintTitle ?? renderTemplate(currentStep.hintTemplate ?? '', readings)}
    </div>
    {currentStep.hintExplanation && (
      <div style={{ fontSize: 13, color: '#a8a8b0', lineHeight: 1.5 }}>
        {currentStep.hintExplanation}
      </div>
    )}
  </>
)}
```

Where `renderTemplate` is the existing string-interpolator (find it in the current HUD file or in StepEngine — it substitutes `{digitalScaleGrams}` etc.). Use the same function for `hintTitle` so placeholders also work there.

- [ ] **Step 4: Manual verification**

```bash
npm run dev
```

Expected:
- 9-segment progress bar at top of "ЗАРАЗ РОБИМО" panel — first segment blue (active), rest dim.
- Hint area shows two lines: bold blue title + smaller secondary explanation
- Walking through t1 — segments turn green as tasks complete

- [ ] **Step 5: Commit**

```bash
git add src/labs/mass-measurement/ui/HUD.tsx
git commit -m "feat(hud): 9-segment progress bar + two-layer hint rendering"
```

### Task 1.15: Final Slice 1 verification gate

- [ ] **Step 1: Full automated check**

```bash
npx tsc --noEmit
npx vitest run
npm run build
```

Expected:
- Typecheck clean
- ≥ 28 tests passing (25 original + 3 snapProgress + 5 lerp/ease/spring + 6 SoundManager + 4 Step DSL = 43 minimum)
- Build succeeds

- [ ] **Step 2: t1 walkthrough — gold-standard checklist**

```bash
npm run dev
```

Walk through t1 (Tennis Ball + Digital Scale). Tick each box:

- [ ] Background: dark radial gradient (not flat)
- [ ] Lighting: dramatic warm key + cool fill, visible specular on platform
- [ ] Tennis ball casts a shadow on the table
- [ ] Camera dollies in toward digital scale (not static overview)
- [ ] Pickup hint shows TITLE in blue + EXPLANATION below
- [ ] Drop on scale: ball glides to platform over ~300ms (not teleport)
- [ ] Tick sound plays on snap
- [ ] LCD digits tick up from 0 toward 58 over ~500ms
- [ ] Bloom on LCD glow visible
- [ ] Submit value → ding sound plays
- [ ] 9-segment progress bar shows first segment green, second active

- [ ] **Step 3: Performance benchmark**

In dev server, open browser perf tools or `r3f-perf`. With t1 active, observe FPS for 10 seconds.

Expected: ≥ 50fps. If under:
- Drop env map resolution to 32
- Drop bloom intensity to 0.25
- Disable shadows on the table (only ball + scale shadows)

- [ ] **Step 4: User-checkpoint**

This is where the plan PAUSES. Request user review of the t1 flagship. Adjust visual language if needed before propagating to Slices 2-4.

Format the request:

> "Slice 1 complete. Tennis Ball + Digital Scale path is gold-standard. Please walk through t1 in the browser and confirm:
> 1. Visual language feels right (Cinematic Dark Studio aesthetic).
> 2. Pacing feels right (snap timing, camera dolly, sound feedback).
> 3. Hint copy serves the pedagogy.
>
> If anything is off, we tune now — propagating to t2-t9 amplifies any decision tenfold. Ready to write Plan 2 (Slices 2-4 instrument propagation) once you approve."

---

## Self-Review

**Spec coverage check (Slices 0-1 only — Slices 2-8 are out of this plan's scope):**

- Architecture/folder split (spec §"Architecture") → Tasks 0.1-0.9 ✓
- LabDefinition stub (spec §"LabDefinition contract") → Task 0.9 ✓
- Cinematic Lighting (spec §"Visual System / Lighting") → Task 1.6 ✓
- Background gradient (spec §"Visual System / Background") → Task 1.6 (Canvas style) ✓
- PostFX bloom + vignette + ACES (spec §"Visual System / Post-FX") → Task 1.7 ✓
- Tennis ball + Digital Scale PBR materials (spec §"Visual System / Materials") → Task 1.11 ✓
- Environment map (spec §"Visual System / Materials") → Task 1.11 (drei studio preset, low-res) ✓
- LCD upgrade (spec §"Visual System / LCD displays") → Task 1.12 ✓
- Snap magnetic-pull animation (spec §"Animations / Snap") → Task 1.8 ✓
- Reading-tick interpolation (spec §"Animations / Reading update") → Task 1.10 ✓
- Camera focus presets + auto-dolly (spec §"Animations / Camera presets") → Task 1.9 ✓
- Step DSL extension (spec §"Pedagogy / Step DSL extensions") → Task 1.13 ✓
- Two-layer hint copy for t1 (spec §"Pedagogy / Hint copy pattern") → Task 1.13 + 1.14 ✓
- 9-segment progress bar (spec §"UI / Зараз робимо panel") → Task 1.14 ✓
- SoundManager + 5 sounds (spec §"Audio / Catalog & API") → Tasks 1.3, 1.4, 1.5 ✓
- Sound integration on snap+submit (spec §"Audio") → Task 1.13 ✓
- Performance ≥ 50fps (spec §"Phasing / Slice 1 DoD") → Task 1.15 step 3 ✓

**Out of this plan (handled in follow-ups):**
- Slice 2 (Lever Balance polish) → Plan 2
- Slice 3 (Dynamometer polish) → Plan 2
- Slice 4 (Apple/Baseball/Weights polish) → Plan 2
- Slices 5-8 (intro flythrough, milestones, journal redesign, reveal, polish, demo mode) → Plan 3

**Type consistency check:**
- `SoundId` defined in `sdk/audio/SoundManager.ts` AND in `sdk/guided/TaskSteps.ts` (Task 1.13) — must be same union. After Task 1.13 the TaskSteps SoundId mirrors the SoundManager type by string union. **Recommendation in execution:** when implementing Task 1.13, instead of duplicating the union, `import type { SoundId } from '../audio/SoundManager'` in TaskSteps.ts to avoid drift.
- `CameraPreset` defined in `sdk/scene/CameraRig.tsx` and consumed in `LabScene.tsx` (Task 1.9) ✓
- `Step` type back-compat: existing `hintTemplate` field kept as optional alongside new `hintTitle`/`hintExplanation` so t2-t9 keep working unchanged ✓

**Placeholder scan:** None ("TBD"/"TODO"/etc. only appears in the audio CREDITS as `[author/url]` markers for the actual licensing entries — that's expected user-fillable metadata, not code placeholder).

**Risk callouts:**
- Task 1.7 (PostFX) may tank perf on weaker hardware. Plan includes a fallback: drop intensity, disable Vignette, last resort comment out PostFX. Slice 1 DoD is "≥50fps on dev"; Promethean perf measured separately.
- Task 1.11 environment map adds a 64×64 cubemap. If drei doesn't have `studio` preset in the installed version, swap to `'apartment'` or `'warehouse'` — both ship with drei.
- Task 1.5 sound preload: AudioContext requires user gesture. The preload happens on `phase === 'in-progress'` transition, which is triggered by the user's "Start" click → satisfies the gesture requirement.
