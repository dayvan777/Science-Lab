# Brownian Motion & Diffusion Lab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the third lab on NOVA EVRIKA — «Броунівський рух та дифузія» — covering the grade-7 chapter on molecular structure of matter through 6 guided scenes (molecular theory, Brownian motion, gas / liquid / solid diffusion, temperature dependence).

**Architecture:** Mirror the EM-induction lab structure verbatim in `src/labs/brownian-diffusion/`. React 19 + @react-three/fiber + @react-three/rapier + Zustand. A new **custom kinetic particle engine** (not Rapier) renders up to 150 elastic-colliding particles via `InstancedMesh`; Rapier remains only for draggable instruments (pollen, divider, ink dropper). Scene 5 (solid) uses pre-computed lattice snapshots with interpolation — distinct from the gas/liquid engine.

**Tech Stack:** React 19.2, @react-three/fiber 9, @react-three/rapier 2, three.js 0.184, Zustand 5, Vitest 4, TypeScript 6 (strict, noUnusedLocals).

**Spec:** `docs/superpowers/specs/2026-05-26-brownian-diffusion-lab-design.md` (commit `78189a9`)

**Branch:** `feat/brownian-diffusion-lab` (from master `e7e708c`; spec already committed at `78189a9`)

**Pattern source:** `src/labs/electromagnetic-induction/` — every task that says "mirror EM" refers to this folder. The implementer should read the equivalent EM file before mirroring.

**Verification gate (after EVERY task):**
- `npx tsc --noEmit` → 0 errors
- `npm test -- --run` → all green; count grows toward 254
- `npm run build` → green

**Smoke test (Task 10):** end-to-end manual run + mobile device check per spec §15.

---

## Slices Overview

| # | Slice | Tasks | Δ tests | Key risk |
|---|---|---|---|---|
| 1 | Foundation — `LabState` (6 scenes), `LabSettingsState`, route, placeholder | 1.1–1.3 | +10 | none — pure scaffolding |
| 2 | Particle engine + dev benchmark (PERF GATE) | 2.1–2.3 | +10 | mobile perf — fail-fast here |
| 3 | 3D scene foundation — `GlassBox` + `ParticleField` + `LabScene` shell | 3.1–3.3 | +2 | InstancedMesh updates |
| 4 | Scene 1 (мол. теорія) — `scenes.ts` + `HUD` + `IntroScreen` + `RevealScene` + MC | 4.1–4.4 | +4 | guided-flow plumbing |
| 5 | Scene 2 (Брауні) — `PollenParticle` + trail + `ShowMoleculesToggle` | 5.1–5.4 | +2 | motion-trigger timing |
| 6 | Scene 3 (Газ) — `Divider` + `divider.ts` physics | 6.1–6.3 | +4 | divider wall logic |
| 7 | Scene 4 (Рідина) — `Beaker` + `InkDropper` + liquid params | 7.1–7.4 | +0 | dropper drop-zone |
| 8 | Scene 5 (Тверде) — `SolidBlocks` + `lattice.ts` + `TimeLapseSlider` | 8.1–8.4 | +4 | lattice authoring |
| 9 | Scene 6 (Температура) — `TemperatureButton` + T-scaling + reveal | 9.1–9.3 | +0 | T-scaling math |
| 10 | Polish — camera presets, mobile sheet, full gates, smoke test | 10.1–10.3 | +0 | mobile UX |
| | **Total** | **~30 tasks** | **~32** | Target: 222 → 254 passing |

---

## Slice 1 — Foundation

### Task 1.1 — `LabState.ts` (6-scene state machine) + tests

**Files:**
- Create: `src/labs/brownian-diffusion/state/LabState.ts`
- Create: `src/labs/brownian-diffusion/state/__tests__/LabState.test.ts`
- Create (empty for now): `src/labs/brownian-diffusion/content/scenes.ts`

**Pre-condition:** On branch `feat/brownian-diffusion-lab`, working tree clean.

- [ ] **Step 1: Create the empty scenes stub so LabState can import it**

Create `src/labs/brownian-diffusion/content/scenes.ts`:

```ts
/**
 * Stub — full curriculum lands in Slice 4.
 * LabState.ts needs `SCENES` to exist as an array so TOTAL_SCENES math
 * is well-defined even before scenes are filled.
 */
export type BdScene = { title: string }

export const SCENES: BdScene[] = [
  { title: 'Знайомство з молекулами' },
  { title: 'Броунівський рух' },
  { title: 'Дифузія в газах' },
  { title: 'Дифузія в рідинах' },
  { title: 'Дифузія у твердих тілах' },
  { title: 'Залежність від температури' },
]
```

- [ ] **Step 2: Write the failing LabState test**

Create `src/labs/brownian-diffusion/state/__tests__/LabState.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useLabState } from '../LabState'

describe('useLabState (brownian-diffusion)', () => {
  beforeEach(() => {
    useLabState.getState().reset()
  })

  it('starts in the intro phase at scene 0 with empty journal', () => {
    const s = useLabState.getState()
    expect(s.phase).toBe('intro')
    expect(s.currentSceneIndex).toBe(0)
    expect(s.journal).toEqual([])
  })

  it('start() moves to in-progress', () => {
    useLabState.getState().start()
    expect(useLabState.getState().phase).toBe('in-progress')
  })

  it('advanceScene() walks 0 → 5 then finishes at scene 6', () => {
    useLabState.getState().start()
    for (let i = 0; i < 6; i++) {
      useLabState.getState().advanceScene()
    }
    const s = useLabState.getState()
    expect(s.currentSceneIndex).toBe(6)
    expect(s.phase).toBe('finished')
  })

  it('recordMCAnswer pushes an entry with the current scene title', () => {
    useLabState.getState().start()
    useLabState.getState().recordMCAnswer(1)
    const s = useLabState.getState()
    expect(s.journal).toHaveLength(1)
    expect(s.journal[0].sceneTitle).toBe('Знайомство з молекулами')
    expect(s.journal[0].chosenIndex).toBe(1)
    expect(typeof s.journal[0].timestamp).toBe('number')
  })

  it('reset() returns to intro and clears journal', () => {
    useLabState.getState().start()
    useLabState.getState().recordMCAnswer(0)
    useLabState.getState().advanceScene()
    useLabState.getState().reset()
    const s = useLabState.getState()
    expect(s.phase).toBe('intro')
    expect(s.currentSceneIndex).toBe(0)
    expect(s.journal).toEqual([])
  })

  it('respawnObjects() bumps sessionId without changing phase or index', () => {
    useLabState.getState().start()
    useLabState.getState().advanceScene()
    const before = useLabState.getState()
    useLabState.getState().respawnObjects()
    const after = useLabState.getState()
    expect(after.sessionId).toBe(before.sessionId + 1)
    expect(after.phase).toBe('in-progress')
    expect(after.currentSceneIndex).toBe(before.currentSceneIndex)
  })
})
```

- [ ] **Step 3: Run the test — it must fail**

```bash
npx vitest run src/labs/brownian-diffusion/state/__tests__/LabState.test.ts
```

Expected: 6 failures (`LabState.ts` doesn't exist).

- [ ] **Step 4: Implement `LabState.ts`**

Create `src/labs/brownian-diffusion/state/LabState.ts`:

```ts
import { create } from 'zustand'
import { SCENES } from '../content/scenes'

export type LabPhase = 'intro' | 'in-progress' | 'finished'

export type JournalEntry = {
  /** Friendly Ukrainian scene title, e.g., 'Дифузія в газах'. */
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

const TOTAL_SCENES = SCENES.length

export const useLabState = create<LabState>((set, get) => ({
  phase: 'intro',
  currentSceneIndex: 0,
  journal: [],
  sessionId: 0,

  start: () => set({ phase: 'in-progress' }),

  recordMCAnswer: (chosenIndex) => {
    const { journal, currentSceneIndex } = get()
    const scene = SCENES[currentSceneIndex]
    if (!scene) return
    set({
      journal: [...journal, { sceneTitle: scene.title, chosenIndex, timestamp: Date.now() }],
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

- [ ] **Step 5: Run tests — all 6 must pass**

```bash
npx vitest run src/labs/brownian-diffusion/state/__tests__/LabState.test.ts
```

Expected: ✓ 6/6.

- [ ] **Step 6: Run full gate**

```bash
npx tsc --noEmit
npm test -- --run
```

Expected: tsc 0 errors, full suite green (222 → 228, since this added 6 tests).

- [ ] **Step 7: Commit**

```bash
git add src/labs/brownian-diffusion/state/LabState.ts \
        src/labs/brownian-diffusion/state/__tests__/LabState.test.ts \
        src/labs/brownian-diffusion/content/scenes.ts
git commit -m "feat(brownian-diffusion): LabState (6-scene machine) + scenes stub

Mirrors EM-induction's LabState shape; TOTAL_SCENES derived from
SCENES.length so adding/removing scenes is a one-place change.
6 tests cover phase transitions, journal accumulation, reset, respawn."
```

---

### Task 1.2 — `LabSettingsState.ts` + tests

**Files:**
- Create: `src/labs/brownian-diffusion/state/LabSettingsState.ts`
- Create: `src/labs/brownian-diffusion/state/__tests__/LabSettingsState.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/labs/brownian-diffusion/state/__tests__/LabSettingsState.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useLabSettings, TIME_LAPSE_VALUES } from '../LabSettingsState'

describe('useLabSettings (brownian-diffusion)', () => {
  beforeEach(() => {
    useLabSettings.setState({
      temperatureLevel: 'normal',
      showMolecules: false,
      timeLapseYears: 1,
      maxParticles: 150,
    })
  })

  it('has sensible defaults', () => {
    const s = useLabSettings.getState()
    expect(s.temperatureLevel).toBe('normal')
    expect(s.showMolecules).toBe(false)
    expect(s.timeLapseYears).toBe(1)
    expect(s.maxParticles).toBe(150)
  })

  it('cycleTemperature walks cold → normal → warm → hot → cold', () => {
    const order = ['cold', 'normal', 'warm', 'hot'] as const
    useLabSettings.setState({ temperatureLevel: 'cold' })
    for (let i = 1; i <= 4; i++) {
      useLabSettings.getState().cycleTemperature()
      expect(useLabSettings.getState().temperatureLevel).toBe(order[i % 4])
    }
  })

  it('toggleMolecules flips boolean', () => {
    useLabSettings.getState().toggleMolecules()
    expect(useLabSettings.getState().showMolecules).toBe(true)
    useLabSettings.getState().toggleMolecules()
    expect(useLabSettings.getState().showMolecules).toBe(false)
  })

  it('setTimeLapse only accepts allowed values', () => {
    useLabSettings.getState().setTimeLapse(100)
    expect(useLabSettings.getState().timeLapseYears).toBe(100)
    // Disallowed: ignored
    useLabSettings.getState().setTimeLapse(50 as 1 | 10 | 100 | 1000)
    expect(useLabSettings.getState().timeLapseYears).toBe(100)
  })

  it('TIME_LAPSE_VALUES exposes the 4 allowed values in order', () => {
    expect(TIME_LAPSE_VALUES).toEqual([1, 10, 100, 1000])
  })
})
```

- [ ] **Step 2: Run failing**

```bash
npx vitest run src/labs/brownian-diffusion/state/__tests__/LabSettingsState.test.ts
```

Expected: 5 failures.

- [ ] **Step 3: Implement `LabSettingsState.ts`**

Create `src/labs/brownian-diffusion/state/LabSettingsState.ts`:

```ts
import { create } from 'zustand'

export type TemperatureLevel = 'cold' | 'normal' | 'warm' | 'hot'
export type TimeLapseYears = 1 | 10 | 100 | 1000

export const TIME_LAPSE_VALUES: TimeLapseYears[] = [1, 10, 100, 1000]

const TEMP_CYCLE: TemperatureLevel[] = ['cold', 'normal', 'warm', 'hot']

type Settings = {
  temperatureLevel: TemperatureLevel
  showMolecules: boolean
  /** Scene 5 only. */
  timeLapseYears: TimeLapseYears
  /** Internal — dev fallback, no UI control. */
  maxParticles: number

  cycleTemperature: () => void
  toggleMolecules: () => void
  setTimeLapse: (y: TimeLapseYears) => void
}

export const useLabSettings = create<Settings>((set, get) => ({
  temperatureLevel: 'normal',
  showMolecules: false,
  timeLapseYears: 1,
  maxParticles: 150,

  cycleTemperature: () => {
    const cur = get().temperatureLevel
    const i = TEMP_CYCLE.indexOf(cur)
    const next = TEMP_CYCLE[(i + 1) % TEMP_CYCLE.length]
    set({ temperatureLevel: next })
  },

  toggleMolecules: () => set(s => ({ showMolecules: !s.showMolecules })),

  setTimeLapse: (y) => {
    if (!TIME_LAPSE_VALUES.includes(y)) return
    set({ timeLapseYears: y })
  },
}))
```

- [ ] **Step 4: Run — all 5 must pass**

```bash
npx vitest run src/labs/brownian-diffusion/state/__tests__/LabSettingsState.test.ts
```

- [ ] **Step 5: Full gate**

```bash
npx tsc --noEmit
npm test -- --run
```

Expected: 233 passing (222 + 6 + 5).

- [ ] **Step 6: Commit**

```bash
git add src/labs/brownian-diffusion/state/LabSettingsState.ts \
        src/labs/brownian-diffusion/state/__tests__/LabSettingsState.test.ts
git commit -m "feat(brownian-diffusion): LabSettingsState + tests

Holds temperature (cycle-pill cold/normal/warm/hot), showMolecules
toggle (scene 2), and timeLapseYears (scene 5). maxParticles is an
internal dev fallback, no UI control. 5 tests cover cycle, toggle,
setTimeLapse clamping."
```

---

### Task 1.3 — Lab folder scaffold + route + placeholder loads

**Files:**
- Create: `src/labs/brownian-diffusion/index.tsx`
- Create: `src/labs/brownian-diffusion/ui/IntroScreen.tsx` (placeholder)
- Create: `src/labs/brownian-diffusion/ui/RevealScene.tsx` (placeholder)
- Create: `src/labs/brownian-diffusion/scene/LabScene.tsx` (placeholder)
- Modify: `src/site/content/subjects.ts`
- Modify: the router file (find it via grep — see Step 1)

- [ ] **Step 1: Locate the router registration site**

```bash
grep -rn "em-induction" src/
```

Expected: shows `subjects.ts`, plus the router file that registers `EMInductionLab`. Note the exact route declaration pattern — you will mirror it.

- [ ] **Step 2: Write a stub `IntroScreen.tsx`**

Create `src/labs/brownian-diffusion/ui/IntroScreen.tsx`:

```tsx
import { useLabState } from '../state/LabState'
import { Button } from '../../../sdk/ui/Button'

export function IntroScreen() {
  const start = useLabState(s => s.start)
  return (
    <div style={{
      position: 'fixed', inset: 0,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 24, color: '#fff',
      background: 'radial-gradient(ellipse at center, #2a2a30 0%, #0a0a0c 70%)',
      fontFamily: '"Inter", system-ui, sans-serif',
    }}>
      <h1 style={{ fontSize: 32, fontWeight: 700, textAlign: 'center', maxWidth: 600 }}>
        Броунівський рух та дифузія
      </h1>
      <p style={{ fontSize: 16, opacity: 0.7, maxWidth: 480, textAlign: 'center' }}>
        Дізнаймось, як молекули рухаються і змішуються в газах, рідинах і твердих тілах.
      </p>
      <Button variant="primary" onClick={() => start()}>Почати</Button>
    </div>
  )
}
```

- [ ] **Step 3: Write a stub `RevealScene.tsx`**

Create `src/labs/brownian-diffusion/ui/RevealScene.tsx`:

```tsx
import { useNavigate } from 'react-router-dom'
import { useLabState } from '../state/LabState'
import { Button } from '../../../sdk/ui/Button'

export function RevealScene() {
  const reset = useLabState(s => s.reset)
  const journal = useLabState(s => s.journal)
  const navigate = useNavigate()
  return (
    <div style={{
      position: 'fixed', inset: 0,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 18, color: '#fff', padding: 24,
      background: 'radial-gradient(ellipse at center, #2a2a30 0%, #0a0a0c 70%)',
      fontFamily: '"Inter", system-ui, sans-serif',
    }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Дослідження завершено</h1>
      <div style={{ fontSize: 14, opacity: 0.7 }}>
        Відповіді: {journal.length} / 6
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <Button variant="primary" onClick={() => reset()}>Спробувати знову</Button>
        <Button variant="secondary" onClick={() => navigate('/')}>На головну</Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Write a placeholder `LabScene.tsx`**

Create `src/labs/brownian-diffusion/scene/LabScene.tsx`:

```tsx
/**
 * Placeholder — replaced in Slice 3 with the full R3F scene.
 * Lets us verify routing/state plumbing before any 3D code lands.
 */
export function LabScene() {
  return (
    <div style={{
      position: 'fixed', inset: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontFamily: 'system-ui, sans-serif',
      background: '#0a0a0c',
    }}>
      Лабораторія завантажується… (placeholder — Slice 3 додасть 3D-сцену)
    </div>
  )
}
```

- [ ] **Step 5: Write the lab entry `index.tsx`**

Create `src/labs/brownian-diffusion/index.tsx`:

```tsx
import { useNavigate } from 'react-router-dom'
import { LabScene } from './scene/LabScene'
import { useLabState } from './state/LabState'
import { IntroScreen } from './ui/IntroScreen'
import { RevealScene } from './ui/RevealScene'
import { isWebGLAvailable } from '../../sdk/scene/webgl'
import { WebGLUnsupported } from '../../sdk/ui/WebGLUnsupported'

export const brownianDiffusionLabDefinition = {
  id: 'brownian-diffusion',
  title: 'Броунівський рух та дифузія',
}

export function BrownianDiffusionLab() {
  const phase = useLabState(s => s.phase)
  const navigate = useNavigate()
  const webglOk = isWebGLAvailable()

  return (
    <>
      {phase === 'intro' && <IntroScreen />}
      {phase === 'finished' && <RevealScene />}
      {phase === 'in-progress' && (webglOk
        ? <LabScene />
        : <WebGLUnsupported onHome={() => navigate('/')} />
      )}
    </>
  )
}
```

- [ ] **Step 6: Add the lab to `subjects.ts`**

Modify `src/site/content/subjects.ts`. Inside the `physics` entry's `labs` array, **append** after the `em-induction` entry:

```ts
{
  id: 'brownian-diffusion',
  title: 'Броунівський рух та дифузія',
  subtitle: 'Молекули · Дифузія · Температура',
  path: '/physics/brownian-diffusion',
  status: 'available',
},
```

- [ ] **Step 7: Register the route**

Open the router file you located in Step 1 (it imports `EMInductionLab`). Mirror its pattern for `BrownianDiffusionLab`:

1. Add the import alongside `EMInductionLab`:
   ```ts
   import { BrownianDiffusionLab } from '../labs/brownian-diffusion'
   // (or whatever relative path the EM import uses)
   ```
2. Add the route in the same `<Routes>` block (mirror EM's `Route` for `em-induction`):
   ```tsx
   <Route path="/physics/brownian-diffusion" element={<BrownianDiffusionLab />} />
   ```

If EM uses lazy-loading (`React.lazy`), mirror that — including any `<Suspense>` boundary that wraps it.

- [ ] **Step 8: Full gate**

```bash
npx tsc --noEmit
npm test -- --run
npm run build
```

Expected: tsc 0 errors, tests 233 passing, build green.

- [ ] **Step 9: Manual smoke**

```bash
npm run dev
```

Navigate to `http://localhost:5173/physics`. Verify the new lab card appears with title «Броунівський рух та дифузія». Click it → intro screen appears → click «Почати» → placeholder screen «Лабораторія завантажується…» appears. Refresh the browser → intro again.

- [ ] **Step 10: Commit**

```bash
git add src/labs/brownian-diffusion/ \
        src/site/content/subjects.ts \
        <router-file-from-step-7>
git commit -m "feat(brownian-diffusion): lab scaffold, route, placeholder loads

Skeleton structure mirrors EM-induction: index.tsx phase-router,
IntroScreen, RevealScene, placeholder LabScene. Subject registry
+1 entry, router +1 route. Verifies plumbing end-to-end before 3D
code is written."
```

---

## Slice 2 — Particle engine + dev benchmark (PERF GATE)

### Task 2.1 — `physics/particles.ts` types

**Files:**
- Create: `src/labs/brownian-diffusion/physics/particles.ts`

This file has no testable logic — pure type/constant declarations. No test needed.

- [ ] **Step 1: Write `particles.ts`**

```ts
/**
 * Particle types and initial-state factories for the brownian-diffusion lab.
 *
 * Each kind has a colour, mass, and radius. Velocity scaling lives in
 * kinetics.ts (depends on temperature setting).
 */

export type ParticleKind =
  | 'red'    // gas A (warm hue)
  | 'blue'   // gas B (cool hue)
  | 'water'  // liquid solvent
  | 'ink'    // liquid solute (purple)
  | 'pollen' // big Brownian particle (one only)

export type Vec3 = { x: number; y: number; z: number }

export type Particle = {
  kind: ParticleKind
  pos: Vec3
  vel: Vec3
  mass: number    // toy units, dimensionless
  radius: number  // metres (toy scale)
}

export const PARTICLE_DEFAULTS: Record<ParticleKind, { mass: number; radius: number; color: [number, number, number] }> = {
  red:    { mass: 1,  radius: 0.005, color: [0.90, 0.29, 0.23] }, // #e64a3b
  blue:   { mass: 1,  radius: 0.005, color: [0.04, 0.52, 1.00] }, // #0a84ff
  water:  { mass: 1,  radius: 0.004, color: [0.53, 0.77, 1.00] }, // #88c4ff
  ink:    { mass: 1,  radius: 0.004, color: [0.48, 0.24, 0.95] }, // #7a3df2
  pollen: { mass: 30, radius: 0.012, color: [0.90, 0.29, 0.23] }, // big red
}

/**
 * Generate a random unit-direction velocity, scaled by `speed`.
 * Deterministic when given a seeded RNG.
 */
export function randomVelocity(speed: number, rand: () => number = Math.random): Vec3 {
  // Marsaglia method for uniform-on-sphere
  let x: number, y: number, z: number, s: number
  do {
    x = 2 * rand() - 1
    y = 2 * rand() - 1
    z = 2 * rand() - 1
    s = x * x + y * y + z * z
  } while (s >= 1 || s === 0)
  const f = speed / Math.sqrt(s)
  return { x: x * f, y: y * f, z: z * f }
}

export function clonePos(p: Vec3): Vec3 { return { x: p.x, y: p.y, z: p.z } }
```

- [ ] **Step 2: Verify it compiles**

```bash
npx tsc --noEmit
```

Expected: 0 errors. (No tests yet — this is pure types.)

- [ ] **Step 3: Commit**

```bash
git add src/labs/brownian-diffusion/physics/particles.ts
git commit -m "feat(brownian-diffusion): particle types + defaults

ParticleKind union (red/blue/water/ink/pollen), PARTICLE_DEFAULTS
table (mass/radius/RGB color), randomVelocity Marsaglia sampler
with optional RNG injection for tests."
```

---

### Task 2.2 — `physics/kinetics.ts` step function + tests

**Files:**
- Create: `src/labs/brownian-diffusion/physics/kinetics.ts`
- Create: `src/labs/brownian-diffusion/physics/__tests__/kinetics.test.ts`

The heart of the lab. TDD this carefully.

- [ ] **Step 1: Write the failing tests**

Create `src/labs/brownian-diffusion/physics/__tests__/kinetics.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { Particle } from '../particles'
import {
  step,
  collidePair,
  reflectAtWalls,
  totalKE,
  totalMomentum,
} from '../kinetics'

const DT = 1 / 60

function mkP(x: number, y: number, z: number, vx: number, vy: number, vz: number, mass = 1, radius = 0.01): Particle {
  return { kind: 'red', pos: { x, y, z }, vel: { x: vx, y: vy, z: vz }, mass, radius }
}

describe('step (integration)', () => {
  it('integrates pos += vel·dt for a single particle in free space', () => {
    const ps = [mkP(0, 0, 0, 0.1, 0.2, -0.3)]
    step(ps, { min: { x: -1, y: -1, z: -1 }, max: { x: 1, y: 1, z: 1 } }, null, DT)
    expect(ps[0].pos.x).toBeCloseTo(0.1 * DT, 8)
    expect(ps[0].pos.y).toBeCloseTo(0.2 * DT, 8)
    expect(ps[0].pos.z).toBeCloseTo(-0.3 * DT, 8)
  })
})

describe('collidePair (elastic)', () => {
  it('conserves kinetic energy on head-on collision (equal masses)', () => {
    const a = mkP(0, 0, 0, 1, 0, 0, 1, 0.05)
    const b = mkP(0.08, 0, 0, -1, 0, 0, 1, 0.05)
    const ke0 = totalKE([a, b])
    collidePair(a, b)
    const ke1 = totalKE([a, b])
    expect(ke1).toBeCloseTo(ke0, 6)
  })

  it('conserves momentum on elastic collision (equal masses)', () => {
    const a = mkP(0, 0, 0, 1, 0, 0, 1, 0.05)
    const b = mkP(0.08, 0, 0, -1, 0, 0, 1, 0.05)
    const p0 = totalMomentum([a, b])
    collidePair(a, b)
    const p1 = totalMomentum([a, b])
    expect(p1.x).toBeCloseTo(p0.x, 6)
    expect(p1.y).toBeCloseTo(p0.y, 6)
    expect(p1.z).toBeCloseTo(p0.z, 6)
  })

  it('conserves KE on unequal masses (big particle vs small)', () => {
    const big = mkP(0, 0, 0, 0, 0, 0, 30, 0.012)
    const sm = mkP(0.015, 0, 0, -2, 0, 0, 1, 0.005)
    const ke0 = totalKE([big, sm])
    collidePair(big, sm)
    const ke1 = totalKE([big, sm])
    expect(ke1).toBeCloseTo(ke0, 6)
  })

  it('does nothing if particles are not overlapping', () => {
    const a = mkP(0, 0, 0, 1, 0, 0, 1, 0.05)
    const b = mkP(0.5, 0, 0, -1, 0, 0, 1, 0.05)
    const before = { ax: a.vel.x, bx: b.vel.x }
    collidePair(a, b)
    expect(a.vel.x).toBe(before.ax)
    expect(b.vel.x).toBe(before.bx)
  })
})

describe('reflectAtWalls', () => {
  it('flips x velocity at min-x wall', () => {
    const p = mkP(-0.99, 0, 0, -1, 0.5, 0.5, 1, 0.05)
    reflectAtWalls(p, { min: { x: -1, y: -1, z: -1 }, max: { x: 1, y: 1, z: 1 } })
    expect(p.vel.x).toBeGreaterThan(0)
    expect(p.pos.x).toBeGreaterThan(-1) // pushed inside
  })

  it('flips y velocity at max-y wall', () => {
    const p = mkP(0, 0.99, 0, 0, 1, 0, 1, 0.05)
    reflectAtWalls(p, { min: { x: -1, y: -1, z: -1 }, max: { x: 1, y: 1, z: 1 } })
    expect(p.vel.y).toBeLessThan(0)
    expect(p.pos.y).toBeLessThan(1)
  })

  it('flips z velocity at max-z wall', () => {
    const p = mkP(0, 0, 0.99, 0, 0, 1, 1, 0.05)
    reflectAtWalls(p, { min: { x: -1, y: -1, z: -1 }, max: { x: 1, y: 1, z: 1 } })
    expect(p.vel.z).toBeLessThan(0)
  })
})

describe('step (integration + walls)', () => {
  it('keeps every particle inside the box after many steps', () => {
    const ps: Particle[] = []
    for (let i = 0; i < 50; i++) {
      ps.push(mkP(
        (i - 25) * 0.01, 0, 0,
        Math.sin(i) * 0.3, Math.cos(i) * 0.3, Math.cos(i * 1.3) * 0.3,
        1, 0.005,
      ))
    }
    const walls = { min: { x: -0.1, y: -0.1, z: -0.1 }, max: { x: 0.1, y: 0.1, z: 0.1 } }
    for (let f = 0; f < 600; f++) step(ps, walls, null, DT)
    for (const p of ps) {
      expect(p.pos.x).toBeGreaterThanOrEqual(walls.min.x - 1e-6)
      expect(p.pos.x).toBeLessThanOrEqual(walls.max.x + 1e-6)
      expect(p.pos.y).toBeGreaterThanOrEqual(walls.min.y - 1e-6)
      expect(p.pos.y).toBeLessThanOrEqual(walls.max.y + 1e-6)
    }
  })

  it('total kinetic energy stays approximately constant (no T scaling)', () => {
    const ps: Particle[] = []
    for (let i = 0; i < 30; i++) {
      ps.push(mkP(
        (i - 15) * 0.005, 0, 0,
        0.1 + (i % 3) * 0.05, 0, 0, 1, 0.003,
      ))
    }
    const walls = { min: { x: -0.1, y: -0.1, z: -0.1 }, max: { x: 0.1, y: 0.1, z: 0.1 } }
    const ke0 = totalKE(ps)
    for (let f = 0; f < 120; f++) step(ps, walls, null, DT)
    const ke1 = totalKE(ps)
    expect(ke1).toBeCloseTo(ke0, 4)
  })
})
```

- [ ] **Step 2: Run — all 10 must fail**

```bash
npx vitest run src/labs/brownian-diffusion/physics/__tests__/kinetics.test.ts
```

Expected: 10 failures (`kinetics.ts` doesn't exist).

- [ ] **Step 3: Implement `kinetics.ts`**

Create `src/labs/brownian-diffusion/physics/kinetics.ts`:

```ts
import { Particle, Vec3 } from './particles'

export type AABB = { min: Vec3; max: Vec3 }
export type DividerState = { x: number; openHeightY: number } | null
//                          ^ wall plane    ^ y at which divider ends (particles can cross ABOVE this y)

/**
 * Advance every particle by one timestep:
 *   1. integrate pos += vel * dt
 *   2. pair-wise elastic collisions (O(n²))
 *   3. wall reflections
 *   4. optional divider as inner wall
 *
 * `dt` is clamped externally to ≤ 1/60 by the caller (LabScene useFrame).
 */
export function step(
  particles: Particle[],
  walls: AABB,
  divider: DividerState,
  dt: number,
): void {
  // 1. Integrate
  for (const p of particles) {
    p.pos.x += p.vel.x * dt
    p.pos.y += p.vel.y * dt
    p.pos.z += p.vel.z * dt
  }

  // 2. Pair collisions — O(n²)
  const n = particles.length
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      collidePair(particles[i], particles[j])
    }
  }

  // 3. Walls
  for (const p of particles) reflectAtWalls(p, walls)

  // 4. Divider (if active and not fully open)
  if (divider) {
    for (const p of particles) reflectAtDivider(p, divider)
  }
}

/**
 * Elastic collision between two spheres. Mutates both particles in place.
 * Does nothing if the spheres are not overlapping (distance >= sum of radii).
 */
export function collidePair(a: Particle, b: Particle): void {
  const dx = b.pos.x - a.pos.x
  const dy = b.pos.y - a.pos.y
  const dz = b.pos.z - a.pos.z
  const r = a.radius + b.radius
  const distSq = dx * dx + dy * dy + dz * dz
  if (distSq >= r * r || distSq === 0) return

  const dist = Math.sqrt(distSq)
  // Unit normal from a → b
  const nx = dx / dist
  const ny = dy / dist
  const nz = dz / dist

  // Relative velocity along normal
  const dvx = b.vel.x - a.vel.x
  const dvy = b.vel.y - a.vel.y
  const dvz = b.vel.z - a.vel.z
  const vRelN = dvx * nx + dvy * ny + dvz * nz

  // Already separating — don't process (avoids sticky double-hit)
  if (vRelN > 0) return

  // Impulse magnitude for 3D elastic collision
  const j = (2 * vRelN) / (1 / a.mass + 1 / b.mass)

  a.vel.x += (j / a.mass) * nx
  a.vel.y += (j / a.mass) * ny
  a.vel.z += (j / a.mass) * nz
  b.vel.x -= (j / b.mass) * nx
  b.vel.y -= (j / b.mass) * ny
  b.vel.z -= (j / b.mass) * nz

  // Positional correction — push apart so they don't stick (split by mass)
  const overlap = r - dist
  const totalM = a.mass + b.mass
  a.pos.x -= nx * overlap * (b.mass / totalM)
  a.pos.y -= ny * overlap * (b.mass / totalM)
  a.pos.z -= nz * overlap * (b.mass / totalM)
  b.pos.x += nx * overlap * (a.mass / totalM)
  b.pos.y += ny * overlap * (a.mass / totalM)
  b.pos.z += nz * overlap * (a.mass / totalM)
}

export function reflectAtWalls(p: Particle, w: AABB): void {
  if (p.pos.x - p.radius < w.min.x) { p.pos.x = w.min.x + p.radius; if (p.vel.x < 0) p.vel.x = -p.vel.x }
  if (p.pos.x + p.radius > w.max.x) { p.pos.x = w.max.x - p.radius; if (p.vel.x > 0) p.vel.x = -p.vel.x }
  if (p.pos.y - p.radius < w.min.y) { p.pos.y = w.min.y + p.radius; if (p.vel.y < 0) p.vel.y = -p.vel.y }
  if (p.pos.y + p.radius > w.max.y) { p.pos.y = w.max.y - p.radius; if (p.vel.y > 0) p.vel.y = -p.vel.y }
  if (p.pos.z - p.radius < w.min.z) { p.pos.z = w.min.z + p.radius; if (p.vel.z < 0) p.vel.z = -p.vel.z }
  if (p.pos.z + p.radius > w.max.z) { p.pos.z = w.max.z - p.radius; if (p.vel.z > 0) p.vel.z = -p.vel.z }
}

/**
 * Divider at x = d.x acts as a wall ONLY for particles whose y is below openHeightY.
 * When openHeightY ≤ min wall y, the divider is fully open (no-op).
 */
function reflectAtDivider(p: Particle, d: NonNullable<DividerState>): void {
  if (p.pos.y > d.openHeightY) return
  // Approaching from left
  if (p.pos.x + p.radius > d.x && p.vel.x > 0 && p.pos.x < d.x) {
    p.pos.x = d.x - p.radius
    p.vel.x = -p.vel.x
  }
  // Approaching from right
  else if (p.pos.x - p.radius < d.x && p.vel.x < 0 && p.pos.x > d.x) {
    p.pos.x = d.x + p.radius
    p.vel.x = -p.vel.x
  }
}

export function totalKE(particles: Particle[]): number {
  let ke = 0
  for (const p of particles) {
    ke += 0.5 * p.mass * (p.vel.x ** 2 + p.vel.y ** 2 + p.vel.z ** 2)
  }
  return ke
}

export function totalMomentum(particles: Particle[]): Vec3 {
  let x = 0, y = 0, z = 0
  for (const p of particles) {
    x += p.mass * p.vel.x
    y += p.mass * p.vel.y
    z += p.mass * p.vel.z
  }
  return { x, y, z }
}
```

- [ ] **Step 4: Run tests — all 10 must pass**

```bash
npx vitest run src/labs/brownian-diffusion/physics/__tests__/kinetics.test.ts
```

Expected: ✓ 10/10.

- [ ] **Step 5: Full gate**

```bash
npx tsc --noEmit
npm test -- --run
```

Expected: 243 passing (233 + 10).

- [ ] **Step 6: Commit**

```bash
git add src/labs/brownian-diffusion/physics/kinetics.ts \
        src/labs/brownian-diffusion/physics/__tests__/kinetics.test.ts
git commit -m "feat(brownian-diffusion): custom kinetic particle engine

step() = integrate + O(n²) elastic collisions + wall reflection +
optional divider. collidePair preserves KE and momentum for unequal
masses. reflectAtWalls + reflectAtDivider handle the box and inner
wall. 10 tests cover collisions, walls, integration, long-run
energy conservation."
```

---

### Task 2.3 — Dev benchmark page (PERF GATE)

The point of this task: prove the engine survives 150 particles at 60 fps on a throttled mobile profile **before** we build all 6 scenes. If it fails, we discover here and adjust (lower default count, add spatial hashing, etc.).

**Files:**
- Create: `src/labs/brownian-diffusion/scene/BenchmarkScene.tsx`
- Modify: the router file (add `/dev/diffusion-benchmark` route, gated behind `import.meta.env.DEV`)

- [ ] **Step 1: Write the benchmark scene**

Create `src/labs/brownian-diffusion/scene/BenchmarkScene.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { InstancedMesh, Matrix4, Object3D } from 'three'
import { Particle, randomVelocity, PARTICLE_DEFAULTS } from '../physics/particles'
import { step, AABB } from '../physics/kinetics'

const COUNT = 150
const BOX: AABB = { min: { x: -0.1, y: -0.1, z: -0.1 }, max: { x: 0.1, y: 0.1, z: 0.1 } }

function makeParticles(n: number): Particle[] {
  const out: Particle[] = []
  for (let i = 0; i < n; i++) {
    const kind = i < n / 2 ? 'red' : 'blue'
    const def = PARTICLE_DEFAULTS[kind]
    out.push({
      kind,
      pos: {
        x: (Math.random() - 0.5) * 0.18,
        y: (Math.random() - 0.5) * 0.18,
        z: (Math.random() - 0.5) * 0.18,
      },
      vel: randomVelocity(0.3),
      mass: def.mass,
      radius: def.radius,
    })
  }
  return out
}

function ParticleSwarm({ onFps }: { onFps: (fps: number) => void }) {
  const meshRef = useRef<InstancedMesh>(null)
  const particles = useRef<Particle[]>(makeParticles(COUNT))
  const dummy = useRef(new Object3D())
  const tmp = useRef(new Matrix4())
  const frames = useRef(0)
  const lastReport = useRef(performance.now())

  useFrame((_state, delta) => {
    const dt = Math.min(delta, 1 / 60)
    step(particles.current, BOX, null, dt)

    const m = meshRef.current
    if (m) {
      for (let i = 0; i < particles.current.length; i++) {
        const p = particles.current[i]
        dummy.current.position.set(p.pos.x, p.pos.y, p.pos.z)
        dummy.current.scale.setScalar(p.radius * 2 * 100) // scale for vis
        dummy.current.updateMatrix()
        m.setMatrixAt(i, dummy.current.matrix)
      }
      m.instanceMatrix.needsUpdate = true
    }

    frames.current++
    const now = performance.now()
    if (now - lastReport.current >= 1000) {
      onFps(frames.current)
      frames.current = 0
      lastReport.current = now
    }
    tmp.current // keep ref live
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, COUNT]}>
      <sphereGeometry args={[1, 8, 6]} />
      <meshBasicMaterial color="#88c4ff" />
    </instancedMesh>
  )
}

export function BenchmarkScene() {
  const [fps, setFps] = useState(0)
  const [history, setHistory] = useState<number[]>([])
  useEffect(() => {
    if (fps > 0) setHistory(h => [...h.slice(-29), fps])
  }, [fps])
  const avg = history.length ? Math.round(history.reduce((a, b) => a + b, 0) / history.length) : 0

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0a0a0c' }}>
      <Canvas camera={{ position: [0, 0, 0.4], fov: 50 }} dpr={[1, 1.5]}>
        <ambientLight intensity={1.2} />
        <ParticleSwarm onFps={setFps} />
      </Canvas>
      <div style={{
        position: 'fixed', top: 16, left: 16, padding: '12px 16px',
        background: 'rgba(0,0,0,0.7)', color: '#fff', fontFamily: 'monospace',
        borderRadius: 8, fontSize: 14, lineHeight: 1.6,
      }}>
        <div>Particles: {COUNT}</div>
        <div>FPS (now): {fps}</div>
        <div>FPS (avg of last {history.length}): {avg}</div>
        <div style={{ opacity: 0.7, fontSize: 12, marginTop: 8 }}>
          Throttle CPU ×4 in DevTools to simulate mobile.
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Register the dev-only route**

In the router file, add (only when `import.meta.env.DEV`):

```tsx
import { BenchmarkScene } from '../labs/brownian-diffusion/scene/BenchmarkScene'
// ...
{import.meta.env.DEV && (
  <Route path="/dev/diffusion-benchmark" element={<BenchmarkScene />} />
)}
```

(If your router config doesn't allow conditional `<Route>` children easily, use `import.meta.env.DEV ? <Route … /> : null`.)

- [ ] **Step 3: Verify it compiles**

```bash
npx tsc --noEmit
npm run build
```

Expected: 0 errors, build green.

- [ ] **Step 4: Run the benchmark — desktop baseline**

```bash
npm run dev
```

Navigate to `http://localhost:5173/dev/diffusion-benchmark`. Read the overlay. Desktop should show FPS ≥ 58.

- [ ] **Step 5: Run the benchmark — throttled mobile**

In Chrome DevTools → Performance → CPU throttling → 4× slowdown. Hold for ~10 seconds. Read **avg** FPS.

**Gate:** if avg FPS ≥ 55 → ✓ pass, continue.

**If FPS < 55:** lower `LabSettingsState.maxParticles` default to 100, re-run. If still failing at 100, document the issue and consider:
1. Disabling `instanceMatrix.needsUpdate = true` every frame; use a dirty flag every 2 frames.
2. Spatial-hash collision detection (only check neighbors within a grid cell).
3. Reduce `sphereGeometry` segments to `[1, 6, 4]`.

Document the chosen mitigation in the commit message.

- [ ] **Step 6: Commit**

```bash
git add src/labs/brownian-diffusion/scene/BenchmarkScene.tsx \
        <router-file>
git commit -m "feat(brownian-diffusion): dev-only particle benchmark scene

/dev/diffusion-benchmark renders 150 particles via custom kinetic
engine + InstancedMesh; overlay shows live + average FPS. Perf gate:
≥55 fps avg on Chrome devtools mobile throttle ×4. Route gated
behind import.meta.env.DEV — never ships in prod build."
```

---

## Slice 3 — 3D scene foundation

### Task 3.1 — `instruments/GlassBox.tsx`

**Files:**
- Create: `src/labs/brownian-diffusion/instruments/GlassBox.tsx`

No tests — this is pure JSX/Three.js scene description, covered by smoke test.

- [ ] **Step 1: Write `GlassBox.tsx`**

```tsx
/**
 * A transparent glass cube on the lab table. Renders the 6 walls (5
 * if `openTop` is true) as thin transparent boxes with subtle blue
 * tint and edge highlights. The cube's INTERIOR (the AABB used by
 * the particle engine) is exposed as `BOX_INTERIOR` for callers.
 */
export const BOX_HALF = 0.10                    // metres — half-extent
export const BOX_INTERIOR = {                   // AABB for the engine
  min: { x: -BOX_HALF, y: -BOX_HALF, z: -BOX_HALF },
  max: { x:  BOX_HALF, y:  BOX_HALF, z:  BOX_HALF },
}

type Props = {
  /** Centre of the box, world-space. Y is centre, not base. */
  position: [number, number, number]
  /** If true, top wall is omitted (Scene 2 pollen drops in). */
  openTop?: boolean
}

const WALL_THICK = 0.003

export function GlassBox({ position, openTop = false }: Props) {
  return (
    <group position={position}>
      {/* Bottom */}
      <mesh position={[0, -BOX_HALF, 0]}>
        <boxGeometry args={[2 * BOX_HALF, WALL_THICK, 2 * BOX_HALF]} />
        <meshStandardMaterial color="#88c4ff" transparent opacity={0.18} roughness={0.1} metalness={0} />
      </mesh>
      {/* Top */}
      {!openTop && (
        <mesh position={[0, BOX_HALF, 0]}>
          <boxGeometry args={[2 * BOX_HALF, WALL_THICK, 2 * BOX_HALF]} />
          <meshStandardMaterial color="#88c4ff" transparent opacity={0.12} roughness={0.1} />
        </mesh>
      )}
      {/* Left / Right (x) */}
      <mesh position={[-BOX_HALF, 0, 0]}>
        <boxGeometry args={[WALL_THICK, 2 * BOX_HALF, 2 * BOX_HALF]} />
        <meshStandardMaterial color="#88c4ff" transparent opacity={0.16} roughness={0.1} />
      </mesh>
      <mesh position={[BOX_HALF, 0, 0]}>
        <boxGeometry args={[WALL_THICK, 2 * BOX_HALF, 2 * BOX_HALF]} />
        <meshStandardMaterial color="#88c4ff" transparent opacity={0.16} roughness={0.1} />
      </mesh>
      {/* Front / Back (z) */}
      <mesh position={[0, 0, -BOX_HALF]}>
        <boxGeometry args={[2 * BOX_HALF, 2 * BOX_HALF, WALL_THICK]} />
        <meshStandardMaterial color="#88c4ff" transparent opacity={0.16} roughness={0.1} />
      </mesh>
      <mesh position={[0, 0, BOX_HALF]}>
        <boxGeometry args={[2 * BOX_HALF, 2 * BOX_HALF, WALL_THICK]} />
        <meshStandardMaterial color="#88c4ff" transparent opacity={0.16} roughness={0.1} />
      </mesh>
    </group>
  )
}
```

- [ ] **Step 2: Verify compiles**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/labs/brownian-diffusion/instruments/GlassBox.tsx
git commit -m "feat(brownian-diffusion): GlassBox instrument

20cm transparent glass cube; openTop prop omits the lid (used in
scene 2 to drop the pollen in). Exposes BOX_HALF and BOX_INTERIOR
constants so kinetics walls AABB matches geometry exactly."
```

---

### Task 3.2 — `scene/ParticleField.tsx` (InstancedMesh wrapping engine)

**Files:**
- Create: `src/labs/brownian-diffusion/scene/ParticleField.tsx`
- Create: `src/labs/brownian-diffusion/scene/__tests__/instanceMatrix.test.ts`

The trickiest pure-rendering piece — a vitest-friendly helper does the matrix maths so we can test it.

- [ ] **Step 1: Write the failing test**

Create `src/labs/brownian-diffusion/scene/__tests__/instanceMatrix.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { Matrix4 } from 'three'
import { Particle } from '../../physics/particles'
import { writeParticleMatrix } from '../ParticleField'

describe('writeParticleMatrix', () => {
  it('encodes position and radius-scale correctly', () => {
    const p: Particle = {
      kind: 'red',
      pos: { x: 0.05, y: -0.03, z: 0.01 },
      vel: { x: 0, y: 0, z: 0 },
      mass: 1,
      radius: 0.005,
    }
    const m = new Matrix4()
    writeParticleMatrix(m, p)
    // Translation should match position exactly
    expect(m.elements[12]).toBeCloseTo(0.05, 8)
    expect(m.elements[13]).toBeCloseTo(-0.03, 8)
    expect(m.elements[14]).toBeCloseTo(0.01, 8)
    // Scale should equal radius (unit sphere geometry × radius)
    expect(m.elements[0]).toBeCloseTo(0.005, 8) // sx
    expect(m.elements[5]).toBeCloseTo(0.005, 8) // sy
    expect(m.elements[10]).toBeCloseTo(0.005, 8) // sz
  })
})
```

- [ ] **Step 2: Run — must fail**

```bash
npx vitest run src/labs/brownian-diffusion/scene/__tests__/instanceMatrix.test.ts
```

- [ ] **Step 3: Implement `ParticleField.tsx`**

Create `src/labs/brownian-diffusion/scene/ParticleField.tsx`:

```tsx
import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, InstancedMesh, Matrix4, Object3D } from 'three'
import { Particle, PARTICLE_DEFAULTS } from '../physics/particles'

/**
 * Encode a particle's position + radius into a Three.js Matrix4 in
 * the form expected by InstancedMesh.setMatrixAt. Scale = radius
 * because the sphere geometry is built with radius=1.
 *
 * Exported for unit testability.
 */
export function writeParticleMatrix(out: Matrix4, p: Particle): void {
  out.makeScale(p.radius, p.radius, p.radius)
  out.setPosition(p.pos.x, p.pos.y, p.pos.z)
}

type Props = {
  /** Live particle array (mutated by SceneController each frame). */
  particles: React.MutableRefObject<Particle[]>
  /** Number of slots — usually `particles.current.length` at mount. Cannot grow. */
  capacity: number
  /** Position of the field's origin in world space (centre of containing box). */
  position: [number, number, number]
  /** Per-frame: should this particle be visible? Default: always true. */
  isVisible?: (p: Particle) => boolean
}

const SCRATCH = new Matrix4()
const COLOR = new Color()

export function ParticleField({ particles, capacity, position, isVisible }: Props) {
  const meshRef = useRef<InstancedMesh>(null)
  const hiddenRef = useRef(new Object3D())

  // Set per-instance colors once at mount.
  useEffect(() => {
    const m = meshRef.current
    if (!m) return
    for (let i = 0; i < capacity; i++) {
      const p = particles.current[i]
      if (!p) continue
      const [r, g, b] = PARTICLE_DEFAULTS[p.kind].color
      COLOR.setRGB(r, g, b)
      m.setColorAt(i, COLOR)
    }
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  }, [particles, capacity])

  useFrame(() => {
    const m = meshRef.current
    if (!m) return
    const list = particles.current
    for (let i = 0; i < capacity; i++) {
      const p = list[i]
      if (!p || (isVisible && !isVisible(p))) {
        // Hide by scaling to 0 at origin
        hiddenRef.current.scale.setScalar(0)
        hiddenRef.current.position.set(0, 0, 0)
        hiddenRef.current.updateMatrix()
        m.setMatrixAt(i, hiddenRef.current.matrix)
        continue
      }
      writeParticleMatrix(SCRATCH, p)
      m.setMatrixAt(i, SCRATCH)
    }
    m.instanceMatrix.needsUpdate = true
  })

  return (
    <group position={position}>
      <instancedMesh ref={meshRef} args={[undefined, undefined, capacity]}>
        <sphereGeometry args={[1, 10, 8]} />
        <meshStandardMaterial roughness={0.3} metalness={0} vertexColors={false} />
      </instancedMesh>
    </group>
  )
}
```

- [ ] **Step 4: Run test — pass**

```bash
npx vitest run src/labs/brownian-diffusion/scene/__tests__/instanceMatrix.test.ts
```

Expected: ✓ 1/1.

- [ ] **Step 5: Full gate**

```bash
npx tsc --noEmit
npm test -- --run
```

Expected: 244 passing.

- [ ] **Step 6: Commit**

```bash
git add src/labs/brownian-diffusion/scene/ParticleField.tsx \
        src/labs/brownian-diffusion/scene/__tests__/instanceMatrix.test.ts
git commit -m "feat(brownian-diffusion): ParticleField (InstancedMesh)

Reads from a mutable ref each frame, writes per-instance matrices
via writeParticleMatrix helper. Per-instance colors set once at
mount from PARTICLE_DEFAULTS. isVisible predicate prop hides
individual particles by scaling them to 0 (used scene-2 for
invisible Brownian molecules)."
```

---

### Task 3.3 — `LabScene.tsx` (R3F shell) + `SceneController.tsx` (ticks engine)

**Files:**
- Replace: `src/labs/brownian-diffusion/scene/LabScene.tsx` (was placeholder from Task 1.3)
- Create: `src/labs/brownian-diffusion/scene/SceneController.tsx`

**Pattern source:** read `src/labs/electromagnetic-induction/scene/LabScene.tsx` and `SceneController.tsx` first. The diff is: no EM-specific instruments; one shared particle ref; no motion triggers yet (added per-scene in later slices).

- [ ] **Step 1: Write `SceneController.tsx`**

Create `src/labs/brownian-diffusion/scene/SceneController.tsx`:

```tsx
import { useFrame } from '@react-three/fiber'
import { MutableRefObject } from 'react'
import { Particle } from '../physics/particles'
import { step, AABB, DividerState } from '../physics/kinetics'

type Props = {
  particles: MutableRefObject<Particle[]>
  walls: AABB
  /** Returns the current divider state (or null = no divider). Re-evaluated each frame. */
  getDivider?: () => DividerState
  /** Velocity multiplier applied each frame BEFORE stepping. 1 = unchanged. */
  velocityMultiplier?: number
}

/**
 * Empty R3F-rendered component whose only job is to tick the
 * custom kinetic engine each frame. Lives INSIDE <Canvas> so
 * useFrame is available.
 */
export function SceneController({ particles, walls, getDivider, velocityMultiplier = 1 }: Props) {
  useFrame((_state, delta) => {
    const dt = Math.min(delta, 1 / 60)
    if (velocityMultiplier !== 1) {
      for (const p of particles.current) {
        p.vel.x *= velocityMultiplier
        p.vel.y *= velocityMultiplier
        p.vel.z *= velocityMultiplier
      }
    }
    const divider = getDivider ? getDivider() : null
    step(particles.current, walls, divider, dt)
  })
  return null
}
```

- [ ] **Step 2: Rewrite `LabScene.tsx`**

**Read first:** `src/labs/electromagnetic-induction/scene/LabScene.tsx`. The structure to mirror: Canvas + CinematicLighting + CameraRig + PinchZoomController + Environment + Physics + your-instruments + PostFX + HUD + zoom/sheet controls.

Replace `src/labs/brownian-diffusion/scene/LabScene.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { ACESFilmicToneMapping } from 'three'
import { Environment } from '@react-three/drei'
import { CinematicLighting } from '../../../sdk/scene/CinematicLighting'
import { CameraRig } from '../../../sdk/scene/CameraRig'
import type { CameraPreset } from '../../../sdk/scene/CameraRig'
import { PostFX } from '../../../sdk/scene/PostFX'
import { Table } from '../../../sdk/scene/Table'
import { CANVAS_BASE_STYLE } from '../../../sdk/scene/canvasStyle'
import { LoadingScreen } from '../../../sdk/ui/LoadingScreen'
import { PinchZoomController } from '../../../sdk/scene/PinchZoomController'
import { useViewport } from '../../../sdk/a11y/useViewport'
import { GlassBox, BOX_INTERIOR } from '../instruments/GlassBox'
import { ParticleField } from './ParticleField'
import { SceneController } from './SceneController'
import { Particle, PARTICLE_DEFAULTS, randomVelocity } from '../physics/particles'
import { useLabState } from '../state/LabState'

const BOX_WORLD: [number, number, number] = [0, 0.95, 0]   // centre of the cube, table top at 0.85

function makeInitialParticles(): Particle[] {
  const out: Particle[] = []
  const HALF = 0.09 // slightly less than 0.10 so they spawn inside walls
  for (let i = 0; i < 60; i++) {
    const kind: 'red' | 'blue' = i < 30 ? 'red' : 'blue'
    const def = PARTICLE_DEFAULTS[kind]
    out.push({
      kind,
      pos: {
        x: (Math.random() - 0.5) * 2 * HALF,
        y: (Math.random() - 0.5) * 2 * HALF,
        z: (Math.random() - 0.5) * 2 * HALF,
      },
      vel: randomVelocity(0.3),
      mass: def.mass,
      radius: def.radius,
    })
  }
  return out
}

function sceneToPreset(idx: number): CameraPreset {
  // Slice 3: every scene uses focus-box; Slice 10 wires per-scene presets.
  // Use 'focus-coil' as a placeholder if the SDK doesn't yet have 'focus-box'
  // (this is fine — it's a generic close-up of the table centre).
  return idx === 0 ? 'overview' : 'focus-coil'
}

export function LabScene() {
  const idx = useLabState(s => s.currentSceneIndex)
  const sessionId = useLabState(s => s.sessionId)
  const { breakpoint } = useViewport()
  void breakpoint // wired in Slice 10
  const [ready, setReady] = useState(false)
  const preset: CameraPreset = sceneToPreset(idx)
  const particlesRef = useRef<Particle[]>(makeInitialParticles())

  // On respawn, rebuild particle array.
  useEffect(() => {
    particlesRef.current = makeInitialParticles()
  }, [sessionId])

  return (
    <>
      <Canvas
        camera={{ position: [0, 1.5, 2.0], fov: 50 }}
        dpr={[1, 1.5]}
        shadows
        gl={{ toneMapping: ACESFilmicToneMapping, toneMappingExposure: 0.55 }}
        style={{ ...CANVAS_BASE_STYLE, background: 'radial-gradient(ellipse at center, #2a2a30 0%, #1a1a1e 50%, #0a0a0c 100%)' }}
        onCreated={() => setReady(true)}
      >
        <CinematicLighting />
        <CameraRig preset={preset} />
        <PinchZoomController />
        <Environment preset="studio" background={false} resolution={64} />
        <Physics key={sessionId} gravity={[0, -9.81, 0]} timeStep={1 / 60}>
          <Table />
          <GlassBox position={BOX_WORLD} />
          <ParticleField particles={particlesRef} capacity={60} position={BOX_WORLD} />
          <SceneController particles={particlesRef} walls={BOX_INTERIOR} />
        </Physics>
        <PostFX />
      </Canvas>
      <LoadingScreen done={ready} />
    </>
  )
}
```

> **Note:** `sceneToPreset` uses `'focus-coil'` as a placeholder. If your SDK `CameraPreset` union doesn't include 'focus-box', Slice 10 will add it. Leaving `'focus-coil'` here keeps Slice 3 compiling. If the union DOES include 'focus-box', use that string instead.

- [ ] **Step 3: Verify compiles + builds**

```bash
npx tsc --noEmit
npm run build
```

Expected: 0 errors, build green.

- [ ] **Step 4: Manual smoke**

```bash
npm run dev
```

Navigate `/physics/brownian-diffusion`. Click «Почати». You should see: the studio table, a transparent glass cube above it, and ~60 red/blue spheres bouncing inside. No controls yet, no scene flow — that's Slice 4.

- [ ] **Step 5: Commit**

```bash
git add src/labs/brownian-diffusion/scene/LabScene.tsx \
        src/labs/brownian-diffusion/scene/SceneController.tsx
git commit -m "feat(brownian-diffusion): R3F scene shell with glass box + 60 particles

LabScene mirrors EM-induction shell (Canvas, lighting, CameraRig,
Physics, Table, PostFX, LoadingScreen). SceneController.useFrame
clamps delta and ticks the kinetic engine. ParticleField renders
60 red+blue spheres bouncing inside the box. Camera preset uses a
generic close-up; per-scene presets wired in Slice 10."
```

---

## Slice 4 — Scene 1 (Molecular Theory) + scaffolding

### Task 4.1 — `content/scenes.ts` full 6-scene skeleton + `BdStep` type

**Files:**
- Replace: `src/labs/brownian-diffusion/content/scenes.ts` (was stub from Task 1.1)
- Create: `src/labs/brownian-diffusion/content/__tests__/scenes.test.ts`

**Pattern source:** read `src/labs/electromagnetic-induction/content/scenes.ts` for the `Step` import path and the EmStep-extension idiom. Mirror exactly, swapping motion triggers.

- [ ] **Step 1: Write the failing test**

Create `src/labs/brownian-diffusion/content/__tests__/scenes.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { SCENES } from '../scenes'

describe('SCENES (brownian-diffusion)', () => {
  it('has exactly 6 scenes', () => {
    expect(SCENES).toHaveLength(6)
  })

  it('each scene has a non-empty title and at least one step', () => {
    for (const s of SCENES) {
      expect(s.title.length).toBeGreaterThan(0)
      expect(s.steps.length).toBeGreaterThan(0)
    }
  })

  it('every MC-step has a valid correctIndex within its choices', () => {
    for (const scene of SCENES) {
      for (const step of scene.steps) {
        if (step.complete.kind === 'mc-selected') {
          const idx = step.complete.correctIndex
          expect(step.choices).toBeDefined()
          expect(idx).toBeGreaterThanOrEqual(0)
          expect(idx).toBeLessThan(step.choices!.length)
        }
      }
    }
  })

  it('every motion trigger uses a recognised name', () => {
    const allowed = new Set([
      'pollen-observed',
      'gases-mixed',
      'liquid-mixed-partial',
      'time-lapse-reached',
      'temp-reached-hot',
    ])
    for (const scene of SCENES) {
      for (const step of scene.steps) {
        if (step.motionTrigger) {
          expect(allowed.has(step.motionTrigger)).toBe(true)
        }
      }
    }
  })
})
```

- [ ] **Step 2: Run failing**

```bash
npx vitest run src/labs/brownian-diffusion/content/__tests__/scenes.test.ts
```

Expected: 4 failures (stub has no `steps`, no `complete`).

- [ ] **Step 3: Write the full `scenes.ts`**

Replace `src/labs/brownian-diffusion/content/scenes.ts`:

```ts
import type { Step } from '../../../sdk/guided/TaskSteps'

/**
 * Motion triggers unique to this lab. Same idiom as EM-induction:
 * SceneController watches lab state and calls advanceStep() directly
 * for these — the SDK predicate engine sees `complete: 'submitted'`.
 */
export type BdMotionTrigger =
  | 'pollen-observed'
  | 'gases-mixed'
  | 'liquid-mixed-partial'
  | 'time-lapse-reached'
  | 'temp-reached-hot'

export type BdStep = Step & { motionTrigger?: BdMotionTrigger }

export type BdScene = {
  title: string
  steps: BdStep[]
}

export const SCENES: BdScene[] = [
  // Scene 1 — Знайомство з молекулами
  {
    title: 'Знайомство з молекулами',
    steps: [
      {
        id: 'intro-ack',
        target: { kind: 'ui', id: 'submit' },
        visualHint: 'highlight',
        hintTitle: 'Зазирни в речовину',
        hintExplanation:
          'Уся матерія складається з крихітних частинок — молекул і атомів. ' +
          'Вони ніколи не зупиняються. Зараз ти бачиш збільшений шматочок газу.',
        complete: { kind: 'submitted' },
      },
      {
        id: 'mc-always-moving',
        target: { kind: 'ui', id: 'input' },
        visualHint: 'highlight',
        hintTitle: 'Чи завжди рухаються молекули?',
        choices: [
          { id: 'always', label: 'Так, завжди — навіть у твердих тілах' },
          { id: 'hot-only', label: 'Лише коли тепло' },
          { id: 'gas-only', label: 'Лише в газах' },
        ],
        complete: { kind: 'mc-selected', correctIndex: 0 },
      },
    ],
  },

  // Scene 2 — Броунівський рух
  {
    title: 'Броунівський рух',
    steps: [
      {
        id: 'pickup-pollen',
        target: { kind: 'object', id: 'pollen' },
        visualHint: 'arrow',
        hintTitle: 'Візьми велику пилинку',
        hintExplanation: 'Натисни і утримуй пилинку на лотку зліва.',
        complete: { kind: 'dragging', bodyPattern: 'pollen' },
      },
      {
        id: 'place-pollen-in-box',
        target: { kind: 'instrument', id: 'glass-box' },
        visualHint: 'target-ring',
        hintTitle: 'Кинь її всередину коробки',
        complete: { kind: 'submitted' },
        motionTrigger: 'pollen-observed',
      },
      {
        id: 'observe-jiggle',
        target: { kind: 'ui', id: 'submit' },
        visualHint: 'highlight',
        hintTitle: 'Дивись, як пилинка хаотично смикається',
        hintExplanation:
          'Молекули газу невидимі — але вони штовхають пилинку з усіх боків. ' +
          'Натисни «Показати причину», щоб побачити їх.',
        complete: { kind: 'submitted' },
      },
      {
        id: 'mc-why-jiggle',
        target: { kind: 'ui', id: 'input' },
        visualHint: 'highlight',
        hintTitle: 'Чому велика частинка стрибає?',
        choices: [
          { id: 'invisible', label: 'Її штовхають невидимі молекули з усіх боків' },
          { id: 'alive', label: 'Бо вона жива' },
          { id: 'wind', label: 'Бо в коробці протяг' },
        ],
        complete: { kind: 'mc-selected', correctIndex: 0 },
      },
    ],
  },

  // Scene 3 — Дифузія в газах
  {
    title: 'Дифузія в газах',
    steps: [
      {
        id: 'lift-divider',
        target: { kind: 'object', id: 'divider' },
        visualHint: 'arrow',
        hintTitle: 'Підніми перегородку догори',
        hintExplanation: 'Захопи ручку зверху і потягни вгору, щоб гази могли змішатись.',
        complete: { kind: 'dragging', bodyPattern: 'divider' },
      },
      {
        id: 'observe-mixing',
        target: { kind: 'instrument', id: 'glass-box' },
        visualHint: 'target-ring',
        hintTitle: 'Спостерігай, як гази повільно перемішуються',
        complete: { kind: 'submitted' },
        motionTrigger: 'gases-mixed',
      },
      {
        id: 'mc-final-state',
        target: { kind: 'ui', id: 'input' },
        visualHint: 'highlight',
        hintTitle: 'Що буде через певний час?',
        choices: [
          { id: 'uniform', label: 'Повне рівномірне змішування' },
          { id: 'separated', label: 'Залишаться окремо' },
          { id: 'reseparate', label: 'Розділяться знову на 2 кольори' },
        ],
        complete: { kind: 'mc-selected', correctIndex: 0 },
      },
    ],
  },

  // Scene 4 — Дифузія в рідинах
  {
    title: 'Дифузія в рідинах',
    steps: [
      {
        id: 'pick-dropper',
        target: { kind: 'object', id: 'dropper' },
        visualHint: 'arrow',
        hintTitle: 'Візьми піпетку з чорнилом',
        complete: { kind: 'dragging', bodyPattern: 'dropper' },
      },
      {
        id: 'drop-ink',
        target: { kind: 'instrument', id: 'beaker' },
        visualHint: 'target-ring',
        hintTitle: 'Капни чорнило в мензурку з водою',
        complete: { kind: 'submitted' },
        motionTrigger: 'liquid-mixed-partial',
      },
      {
        id: 'mc-where-faster',
        target: { kind: 'ui', id: 'input' },
        visualHint: 'highlight',
        hintTitle: 'Де дифузія йде швидше?',
        choices: [
          { id: 'gas', label: 'У газі — молекули вільніші й швидші' },
          { id: 'liquid', label: 'У рідині — бо води більше' },
          { id: 'same', label: 'Однаково' },
        ],
        complete: { kind: 'mc-selected', correctIndex: 0 },
      },
    ],
  },

  // Scene 5 — Дифузія у твердих тілах
  {
    title: 'Дифузія у твердих тілах',
    steps: [
      {
        id: 'press-blocks',
        target: { kind: 'ui', id: 'submit' },
        visualHint: 'highlight',
        hintTitle: 'Метали притиснули один до одного',
        hintExplanation: 'Зверху — золото, знизу — олово. Натисни кнопку для початку експерименту.',
        complete: { kind: 'submitted' },
      },
      {
        id: 'time-lapse',
        target: { kind: 'ui', id: 'submit' },
        visualHint: 'highlight',
        hintTitle: 'Перетягни повзунок часу до 100 років і далі',
        hintExplanation: 'Дивись, як атоми золота повільно проникають у решітку олова.',
        complete: { kind: 'submitted' },
        motionTrigger: 'time-lapse-reached',
      },
      {
        id: 'mc-solid-timescale',
        target: { kind: 'ui', id: 'input' },
        visualHint: 'highlight',
        hintTitle: 'Скільки часу йде дифузія в твердому?',
        choices: [
          { id: 'years', label: 'Десятки-сотні років' },
          { id: 'seconds', label: 'Декілька секунд' },
          { id: 'never', label: 'Зовсім не йде' },
        ],
        complete: { kind: 'mc-selected', correctIndex: 0 },
      },
    ],
  },

  // Scene 6 — Залежність від температури
  {
    title: 'Залежність від температури',
    steps: [
      {
        id: 'cycle-temp',
        target: { kind: 'ui', id: 'submit' },
        visualHint: 'highlight',
        hintTitle: 'Покрути «температуру» до «Гаряче»',
        hintExplanation: 'Кнопка-pill знизу праворуч. Дивись, як змінюється швидкість молекул.',
        complete: { kind: 'submitted' },
        motionTrigger: 'temp-reached-hot',
      },
      {
        id: 'mc-temp-relationship',
        target: { kind: 'ui', id: 'input' },
        visualHint: 'highlight',
        hintTitle: 'Коли дифузія йде швидше?',
        choices: [
          { id: 'higher', label: 'При вищій температурі — молекули енергійніші' },
          { id: 'lower', label: 'При нижчій температурі' },
          { id: 'none', label: 'Температура не впливає' },
        ],
        complete: { kind: 'mc-selected', correctIndex: 0 },
      },
    ],
  },
]
```

- [ ] **Step 4: Run tests — all 4 must pass**

```bash
npx vitest run src/labs/brownian-diffusion/content/__tests__/scenes.test.ts
```

- [ ] **Step 5: Full gate**

```bash
npx tsc --noEmit
npm test -- --run
```

Expected: 248 passing.

- [ ] **Step 6: Commit**

```bash
git add src/labs/brownian-diffusion/content/scenes.ts \
        src/labs/brownian-diffusion/content/__tests__/scenes.test.ts
git commit -m "feat(brownian-diffusion): all 6 scenes content + BdStep type

BdStep extends sdk Step with motionTrigger union (5 lab-local
trigger names). Each scene has its Ukrainian title, the action
steps with Ukrainian hint copy, and exactly one MC question with
correctIndex=0 wherever pedagogically appropriate. 4 tests cover
structure validity."
```

---

### Task 4.2 — `ui/HUD.tsx` (task panel + journal)

**Files:**
- Create: `src/labs/brownian-diffusion/ui/HUD.tsx`

**Pattern source:** `src/labs/electromagnetic-induction/ui/HUD.tsx`. Copy the file, then:
1. Change all `useLabState` / `useLabSettings` imports to point at `../state/LabState` / `../state/LabSettingsState` in THIS lab.
2. Change `SCENES` import to `'../content/scenes'`.
3. Change the journal entry display: it already uses `sceneTitle` after PR-C, so no logic change.
4. Remove any EM-specific references (field-visibility toggle, magnet strength readout) that don't apply here. Keep the generic task-panel + journal-panel structure intact.
5. The `useForceCollapsed` hook from `sdk/ui/useForceCollapsed` already exists (PR-C); pass the same prop pattern.

- [ ] **Step 1: Open and read EM's HUD.tsx fully**

```bash
cat src/labs/electromagnetic-induction/ui/HUD.tsx | head -200
```

Identify three blocks: imports, layout state, render. You're going to copy each but swap the lab-specific bits.

- [ ] **Step 2: Write `HUD.tsx`**

Create `src/labs/brownian-diffusion/ui/HUD.tsx` mirroring EM's HUD. The diff against EM HUD is:

1. **Imports** — point at this lab's state:
   ```ts
   import { useLabState } from '../state/LabState'
   import { SCENES } from '../content/scenes'
   ```

2. **No `LabSettingsState`-driven readouts** (EM shows field-visibility / magnet-strength readouts in its journal panel). Strip those out — this lab will get its own readouts from later slices.

3. **Scene-count** — wherever EM hard-codes 5, derive `SCENES.length` (=6) instead.

4. **Step-source** — EM's HUD selects `currentStep` from `SCENES[currentSceneIndex].steps[currentStepIndex]`. The currentStepIndex is held by the SDK guided engine. Wire the same hook. (If EM uses `useTaskState` or similar from `sdk/guided`, import the same hook.)

5. **`useForceCollapsed`** — copy EM's usage verbatim.

> Implementer: this is mechanical copy + adjust. Do NOT introduce new behaviour. If anything diverges from EM HUD, that's a bug — make a note and we'll fix in code review.

- [ ] **Step 3: Compile**

```bash
npx tsc --noEmit
```

Expected: 0 errors. (HUD is mostly visual; we'll smoke-test it in Task 4.4 together with Intro/Reveal.)

- [ ] **Step 4: Commit**

```bash
git add src/labs/brownian-diffusion/ui/HUD.tsx
git commit -m "feat(brownian-diffusion): HUD (task panel + journal)

Mirror of EM-induction HUD with state/scenes imports rewired to
this lab. SCENES.length drives total count (6). useForceCollapsed
auto-collapses during drag (carries the PR-C extraction)."
```

---

### Task 4.3 — Real `IntroScreen.tsx` + `RevealScene.tsx`

**Files:**
- Replace: `src/labs/brownian-diffusion/ui/IntroScreen.tsx` (Task 1.3's stub)
- Replace: `src/labs/brownian-diffusion/ui/RevealScene.tsx` (Task 1.3's stub)

**Pattern source:** `src/labs/electromagnetic-induction/ui/IntroScreen.tsx` and `RevealScene.tsx`. Copy + reword.

- [ ] **Step 1: Mirror IntroScreen**

Open EM's `IntroScreen.tsx` and copy. Change:
- title → `'Броунівський рух та дифузія'`
- subtitle → `'Молекули · Дифузія · Температура'`
- description → 2-3 sentences explaining we'll explore how molecules move and mix
- learning outcomes list (if EM has one) → 6 bullets matching the 6 scenes

- [ ] **Step 2: Mirror RevealScene**

Open EM's `RevealScene.tsx` and copy. Change:
- title and copy to celebrate completion of THIS lab
- iterate over `journal` (now 6 entries) showing each `sceneTitle` + chosen answer
- "На головну" `useNavigate('/')` and "Спробувати знову" → `reset()` are unchanged

- [ ] **Step 3: Compile + build**

```bash
npx tsc --noEmit
npm run build
```

Expected: 0 errors, build green.

- [ ] **Step 4: Commit**

```bash
git add src/labs/brownian-diffusion/ui/IntroScreen.tsx \
        src/labs/brownian-diffusion/ui/RevealScene.tsx
git commit -m "feat(brownian-diffusion): real Intro + Reveal screens

Mirror EM-induction with lab-specific copy (title, subtitle,
6 learning outcomes, 6 journal entries on the reveal)."
```

---

### Task 4.4 — Mount HUD in LabScene + verify scene 1 playable

**Files:**
- Modify: `src/labs/brownian-diffusion/scene/LabScene.tsx`

- [ ] **Step 1: Add HUD import and mount**

In `src/labs/brownian-diffusion/scene/LabScene.tsx`, add:

```tsx
import { HUD } from '../ui/HUD'
```

In the return statement, after `</Canvas>` and `<LoadingScreen>`, add:

```tsx
<HUD />
```

- [ ] **Step 2: Compile + manual smoke**

```bash
npx tsc --noEmit
npm run dev
```

Navigate `/physics/brownian-diffusion` → «Почати». Verify:
- ✓ The studio table + glass cube with bouncing red/blue particles renders
- ✓ HUD task panel appears (top-right or wherever EM's HUD lives), showing «Знайомство з молекулами»
- ✓ The first step's hint text appears
- ✓ A button labelled like EM's "Готово" / "Submit" advances to the MC step
- ✓ The MC question «Чи завжди рухаються молекули?» appears with 3 choices
- ✓ Clicking correct choice (0: "Так, завжди") records to journal and advances to scene 2

Scene 2 won't be playable yet (no PollenParticle) but the transition itself should happen, and the HUD should show the new scene title.

- [ ] **Step 3: Full gate**

```bash
npx tsc --noEmit
npm test -- --run
npm run build
```

Expected: 248 passing, build green.

- [ ] **Step 4: Commit**

```bash
git add src/labs/brownian-diffusion/scene/LabScene.tsx
git commit -m "feat(brownian-diffusion): mount HUD, scene 1 playable

Smoke verified end-to-end: intro → glass box w/ 60 particles → MC
question 'Чи завжди рухаються молекули?' → journal entry → advance
to scene 2 (whose mechanics come in Slice 5)."
```

---

## Slice 5 — Scene 2 (Brownian motion)

### Task 5.1 — `instruments/PollenParticle.tsx` (Rapier draggable)

**Files:**
- Create: `src/labs/brownian-diffusion/instruments/PollenParticle.tsx`

**Pattern source:** `src/labs/electromagnetic-induction/objects/BarMagnet.tsx` — the canonical Rapier-draggable in this codebase. Read it first.

- [ ] **Step 1: Write the component**

Create `src/labs/brownian-diffusion/instruments/PollenParticle.tsx`:

```tsx
import { useRef } from 'react'
import { RigidBody, RapierRigidBody, BallCollider } from '@react-three/rapier'
import { Draggable } from '../../../sdk/object/Draggable'
import { PARTICLE_DEFAULTS } from '../physics/particles'

const POLLEN = PARTICLE_DEFAULTS.pollen
//  ^ mass: 30, radius: 0.012, color: [0.90, 0.29, 0.23]

type Props = {
  /** Position when not held — the tray. */
  trayPosition: [number, number, number]
  enabled: boolean
}

export function PollenParticle({ trayPosition, enabled }: Props) {
  const bodyRef = useRef<RapierRigidBody>(null)
  return (
    <RigidBody
      ref={bodyRef}
      type={enabled ? 'dynamic' : 'fixed'}
      colliders={false}
      position={trayPosition}
      userData={{ bodyId: 'pollen' }}
      mass={POLLEN.mass}
      linearDamping={0.4}
      angularDamping={0.6}
    >
      <BallCollider args={[POLLEN.radius * 2]} />
      <Draggable bodyRef={bodyRef} bodyId="pollen" enabled={enabled}>
        <mesh castShadow>
          <sphereGeometry args={[POLLEN.radius * 2, 16, 12]} />
          <meshStandardMaterial
            color={`rgb(${Math.round(POLLEN.color[0] * 255)}, ${Math.round(POLLEN.color[1] * 255)}, ${Math.round(POLLEN.color[2] * 255)})`}
            roughness={0.4}
          />
        </mesh>
      </Draggable>
    </RigidBody>
  )
}
```

> **Note on radius doubling:** the visual mesh uses `radius * 2` so the pollen reads as a clearly bigger ball; the kinetic engine uses the underlying `POLLEN.radius` for collision math. The Rapier `BallCollider` matches the visual size so drag feels right.

- [ ] **Step 2: Mount in LabScene (gated on scene 2)**

In `src/labs/brownian-diffusion/scene/LabScene.tsx` add:

```tsx
import { PollenParticle } from '../instruments/PollenParticle'

const POLLEN_TRAY_WORLD: [number, number, number] = [-0.40, 0.94, 0.30]
```

Inside `<Physics>`, after `<SceneController …/>`:

```tsx
{idx === 1 && (
  <PollenParticle trayPosition={POLLEN_TRAY_WORLD} enabled={true} />
)}
```

- [ ] **Step 3: Compile + smoke**

```bash
npx tsc --noEmit
npm run dev
```

Navigate the lab to scene 2 (answer scene 1's MC). You should see:
- A red pollen sphere on the tray to the left of the box.
- Clicking/dragging it moves it. Releasing drops it (Rapier physics).
- It cannot enter the box yet — the box has walls and the pollen is a Rapier body, not a kinetic particle. (That's wired in Task 5.4.)

- [ ] **Step 4: Commit**

```bash
git add src/labs/brownian-diffusion/instruments/PollenParticle.tsx \
        src/labs/brownian-diffusion/scene/LabScene.tsx
git commit -m "feat(brownian-diffusion): PollenParticle (Rapier draggable)

Big red sphere on the tray; Draggable wires the pointer drag (PR-C
pattern). bodyId='pollen' matches scenes.ts complete.bodyPattern.
Mounted only during scene 2."
```

---

### Task 5.2 — Trail rendering for the pollen

**Files:**
- Create: `src/labs/brownian-diffusion/instruments/PollenTrail.tsx`

The trail is a fading polyline that follows the pollen's recent positions. Pure visual, no test (covered by smoke).

- [ ] **Step 1: Write the trail component**

Create `src/labs/brownian-diffusion/instruments/PollenTrail.tsx`:

```tsx
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferAttribute, BufferGeometry, Line, LineBasicMaterial, Vector3 } from 'three'
import { RapierRigidBody } from '@react-three/rapier'

const TRAIL_LENGTH = 60       // samples (~1 second at 60fps)
const SAMPLE_EVERY_MS = 50    // sample at 20Hz

type Props = {
  bodyRef: React.RefObject<RapierRigidBody>
  enabled: boolean
}

export function PollenTrail({ bodyRef, enabled }: Props) {
  const samples = useRef<Vector3[]>([])
  const lastSample = useRef(0)
  const lineRef = useRef<Line>(null)

  // Pre-allocate buffer for TRAIL_LENGTH vertices.
  const { geometry, material } = useMemo(() => {
    const positions = new Float32Array(TRAIL_LENGTH * 3)
    const colors = new Float32Array(TRAIL_LENGTH * 3) // for per-vertex alpha-fade via brightness
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(positions, 3))
    g.setAttribute('color', new BufferAttribute(colors, 3))
    const m = new LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9 })
    return { geometry: g, material: m }
  }, [])

  useFrame((_state, _delta) => {
    if (!enabled || !bodyRef.current) return
    const now = performance.now()
    if (now - lastSample.current >= SAMPLE_EVERY_MS) {
      const t = bodyRef.current.translation()
      samples.current.push(new Vector3(t.x, t.y, t.z))
      if (samples.current.length > TRAIL_LENGTH) samples.current.shift()
      lastSample.current = now
    }

    const positions = geometry.attributes.position as BufferAttribute
    const colors = geometry.attributes.color as BufferAttribute
    const arr = samples.current
    for (let i = 0; i < TRAIL_LENGTH; i++) {
      const v = arr[i] ?? arr[arr.length - 1] ?? new Vector3()
      positions.setXYZ(i, v.x, v.y, v.z)
      const age = (TRAIL_LENGTH - i) / TRAIL_LENGTH   // 1 at oldest, 0 at newest — invert below
      const fade = 1 - age                             // 0 at oldest, 1 at newest
      colors.setXYZ(i, 1.0 * fade, 0.82 * fade, 0.30 * fade) // amber
    }
    positions.needsUpdate = true
    colors.needsUpdate = true
    geometry.setDrawRange(0, Math.min(arr.length, TRAIL_LENGTH))
  })

  return <primitive ref={lineRef} object={new Line(geometry, material)} />
}
```

- [ ] **Step 2: Mount the trail with pollen**

In `LabScene.tsx`, refactor the PollenParticle mount to expose `bodyRef`:

Actually — PollenParticle owns its bodyRef internally. The cleanest fix is to mount PollenTrail INSIDE PollenParticle, sharing the ref.

Replace `instruments/PollenParticle.tsx` (final form):

```tsx
import { useRef } from 'react'
import { RigidBody, RapierRigidBody, BallCollider } from '@react-three/rapier'
import { Draggable } from '../../../sdk/object/Draggable'
import { PARTICLE_DEFAULTS } from '../physics/particles'
import { PollenTrail } from './PollenTrail'

const POLLEN = PARTICLE_DEFAULTS.pollen

type Props = {
  trayPosition: [number, number, number]
  enabled: boolean
  /** Show the recent-path trail (true once pollen lands in box). */
  showTrail: boolean
}

export function PollenParticle({ trayPosition, enabled, showTrail }: Props) {
  const bodyRef = useRef<RapierRigidBody>(null)
  return (
    <>
      <RigidBody
        ref={bodyRef}
        type={enabled ? 'dynamic' : 'fixed'}
        colliders={false}
        position={trayPosition}
        userData={{ bodyId: 'pollen' }}
        mass={POLLEN.mass}
        linearDamping={0.4}
        angularDamping={0.6}
      >
        <BallCollider args={[POLLEN.radius * 2]} />
        <Draggable bodyRef={bodyRef} bodyId="pollen" enabled={enabled}>
          <mesh castShadow>
            <sphereGeometry args={[POLLEN.radius * 2, 16, 12]} />
            <meshStandardMaterial
              color={`rgb(${Math.round(POLLEN.color[0] * 255)}, ${Math.round(POLLEN.color[1] * 255)}, ${Math.round(POLLEN.color[2] * 255)})`}
              roughness={0.4}
            />
          </mesh>
        </Draggable>
      </RigidBody>
      <PollenTrail bodyRef={bodyRef} enabled={showTrail} />
    </>
  )
}
```

In `LabScene.tsx`, update the mount to pass `showTrail`. We don't know yet whether the pollen is inside the box — wire a placeholder for now:

```tsx
{idx === 1 && (
  <PollenParticle
    trayPosition={POLLEN_TRAY_WORLD}
    enabled={true}
    showTrail={true}   // will gate on "is pollen inside box" in Task 5.4
  />
)}
```

- [ ] **Step 3: Compile + smoke**

```bash
npx tsc --noEmit
npm run dev
```

Move the pollen around → amber trail follows for ~1 second behind it. Good.

- [ ] **Step 4: Commit**

```bash
git add src/labs/brownian-diffusion/instruments/PollenTrail.tsx \
        src/labs/brownian-diffusion/instruments/PollenParticle.tsx \
        src/labs/brownian-diffusion/scene/LabScene.tsx
git commit -m "feat(brownian-diffusion): PollenTrail amber polyline (60 samples)

Samples Rapier translation at 20Hz, renders as BufferGeometry-backed
Line with per-vertex color fade (amber → black). Mounted inside
PollenParticle so they share the body ref. Trail visible whenever
showTrail prop is true."
```

---

### Task 5.3 — `ui/ShowMoleculesToggle.tsx` + scene 2 button mount

**Files:**
- Create: `src/labs/brownian-diffusion/ui/ShowMoleculesToggle.tsx`
- Modify: `src/labs/brownian-diffusion/scene/LabScene.tsx` (mount the button on scene 2)
- Create: `src/labs/brownian-diffusion/ui/__tests__/ShowMoleculesToggle.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/labs/brownian-diffusion/ui/__tests__/ShowMoleculesToggle.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { ShowMoleculesToggle } from '../ShowMoleculesToggle'
import { useLabSettings } from '../../state/LabSettingsState'

describe('ShowMoleculesToggle', () => {
  beforeEach(() => {
    useLabSettings.setState({ showMolecules: false })
  })

  it('shows "Показати причину" when molecules are hidden', () => {
    const { getByRole } = render(<ShowMoleculesToggle />)
    expect(getByRole('button').textContent).toContain('Показати причину')
  })

  it('shows "Сховати молекули" when molecules are visible', () => {
    useLabSettings.setState({ showMolecules: true })
    const { getByRole } = render(<ShowMoleculesToggle />)
    expect(getByRole('button').textContent).toContain('Сховати молекули')
  })

  it('toggles state on click', () => {
    const { getByRole } = render(<ShowMoleculesToggle />)
    fireEvent.click(getByRole('button'))
    expect(useLabSettings.getState().showMolecules).toBe(true)
    fireEvent.click(getByRole('button'))
    expect(useLabSettings.getState().showMolecules).toBe(false)
  })
})
```

- [ ] **Step 2: Run failing**

```bash
npx vitest run src/labs/brownian-diffusion/ui/__tests__/ShowMoleculesToggle.test.tsx
```

Expected: 3 failures.

- [ ] **Step 3: Implement the component**

Create `src/labs/brownian-diffusion/ui/ShowMoleculesToggle.tsx`:

```tsx
import { Button } from '../../../sdk/ui/Button'
import { useLabSettings } from '../state/LabSettingsState'

export function ShowMoleculesToggle() {
  const showMolecules = useLabSettings(s => s.showMolecules)
  const toggle = useLabSettings(s => s.toggleMolecules)
  return (
    <Button
      variant={showMolecules ? 'primary' : 'secondary'}
      onClick={() => toggle()}
      aria-label={showMolecules ? 'Сховати молекули' : 'Показати причину'}
      title={showMolecules ? 'Сховати молекули' : 'Показати причину'}
    >
      {showMolecules ? '👁 Сховати молекули' : '✨ Показати причину'}
    </Button>
  )
}
```

- [ ] **Step 4: Run tests — pass**

```bash
npx vitest run src/labs/brownian-diffusion/ui/__tests__/ShowMoleculesToggle.test.tsx
```

Expected: ✓ 3/3.

- [ ] **Step 5: Mount in LabScene gated on scene 2**

In `src/labs/brownian-diffusion/scene/LabScene.tsx`, add to the bottom-right controls area:

```tsx
import { ShowMoleculesToggle } from '../ui/ShowMoleculesToggle'
// ... inside JSX, near the other bottom-right buttons:
{idx === 1 && (
  <div style={{ position: 'fixed', bottom: 80, right: 16, zIndex: 10 }}>
    <ShowMoleculesToggle />
  </div>
)}
```

(Slice 10 will integrate this with the proper mobile bottom-sheet vs desktop row layout. For now a fixed position is fine.)

- [ ] **Step 6: Full gate**

```bash
npx tsc --noEmit
npm test -- --run
npm run build
```

Expected: 251 passing.

- [ ] **Step 7: Commit**

```bash
git add src/labs/brownian-diffusion/ui/ShowMoleculesToggle.tsx \
        src/labs/brownian-diffusion/ui/__tests__/ShowMoleculesToggle.test.tsx \
        src/labs/brownian-diffusion/scene/LabScene.tsx
git commit -m "feat(brownian-diffusion): ShowMoleculesToggle + scene 2 mount

Toggle button flips LabSettings.showMolecules; ParticleField (Slice
3) already honors a per-particle isVisible predicate so we can hide
molecules at render time. 3 tests cover label switching and
toggling. Mounted bottom-right only during scene 2."
```

---

### Task 5.4 — Scene 2 motion-trigger + pollen-in-box detection + isVisible wiring

**Files:**
- Modify: `src/labs/brownian-diffusion/scene/LabScene.tsx`
- Modify: `src/labs/brownian-diffusion/scene/SceneController.tsx` (extend with motion-trigger advance)

**Goal:** detect when the pollen has been inside the box for ≥4 seconds, and call `advanceStep` to fire the `pollen-observed` trigger. Also: hide individual kinetic molecules when `showMolecules === false` on scene 2.

- [ ] **Step 1: Extend `SceneController.tsx` with the motion-trigger callback**

Replace `src/labs/brownian-diffusion/scene/SceneController.tsx`:

```tsx
import { useFrame } from '@react-three/fiber'
import { MutableRefObject, useRef } from 'react'
import { Particle } from '../physics/particles'
import { step, AABB, DividerState } from '../physics/kinetics'

type Props = {
  particles: MutableRefObject<Particle[]>
  walls: AABB
  getDivider?: () => DividerState
  velocityMultiplier?: number
  /** Called every frame with a synthetic "tick" event; lab can call advanceStep when its
   *  motion trigger conditions are met. Receives delta-time so the lab can run timers. */
  onTick?: (dt: number) => void
}

export function SceneController({ particles, walls, getDivider, velocityMultiplier = 1, onTick }: Props) {
  const carry = useRef(velocityMultiplier)
  useFrame((_state, delta) => {
    const dt = Math.min(delta, 1 / 60)
    if (velocityMultiplier !== carry.current) {
      const ratio = velocityMultiplier / carry.current
      for (const p of particles.current) {
        p.vel.x *= ratio
        p.vel.y *= ratio
        p.vel.z *= ratio
      }
      carry.current = velocityMultiplier
    }
    const divider = getDivider ? getDivider() : null
    step(particles.current, walls, divider, dt)
    if (onTick) onTick(dt)
  })
  return null
}
```

**Diff vs prior version:** added `onTick` prop and a `carry`-ref-based ratio scaling so velocity changes accumulate correctly when temperature changes (used by Slice 9).

- [ ] **Step 2: Wire scene-2 in `LabScene.tsx`**

Modify `LabScene.tsx`:

1. Import `useLabSettings` and helpers:
   ```tsx
   import { useLabSettings } from '../state/LabSettingsState'
   import { useTaskState } from '../../../sdk/guided/useTaskState'
   //   ^ Replace with the actual hook EM uses to advance steps. Read EM's
   //   SceneController.tsx for the exact import path.
   ```

2. Add a ref for pollen-in-box dwell time:
   ```tsx
   const pollenDwellRef = useRef(0)
   ```

3. Add a `useEffect` that resets the dwell when leaving scene 2:
   ```tsx
   useEffect(() => { pollenDwellRef.current = 0 }, [idx])
   ```

4. Build an `onTick` handler that:
   - Reads the pollen RigidBody translation (via a forwarded ref or `useRapier()`).
   - Checks whether the pollen position is inside BOX_INTERIOR (offset by BOX_WORLD).
   - Increments `pollenDwellRef` by `dt` if inside, else resets to 0.
   - When dwell ≥ 4.0 AND the current step is `'place-pollen-in-box'`, calls `advanceStep()`.

   The cleanest implementation: lift the pollen body ref up to LabScene so we can read it here. Update `PollenParticle.tsx` to accept a forwarded ref:

   ```tsx
   // PollenParticle.tsx — change signature
   type Props = {
     trayPosition: [number, number, number]
     enabled: boolean
     showTrail: boolean
     bodyRef?: React.MutableRefObject<RapierRigidBody | null>
   }
   export function PollenParticle({ trayPosition, enabled, showTrail, bodyRef: externalRef }: Props) {
     const localRef = useRef<RapierRigidBody>(null)
     const bodyRef = (externalRef ?? localRef) as React.MutableRefObject<RapierRigidBody | null>
     // ... use bodyRef in the RigidBody and PollenTrail
   }
   ```

5. In `LabScene.tsx`:
   ```tsx
   const pollenBodyRef = useRef<RapierRigidBody | null>(null)

   // onTick handler:
   const onTick = (dt: number) => {
     if (idx !== 1) return
     const body = pollenBodyRef.current
     if (!body) return
     const t = body.translation()
     // BOX_WORLD = [0, 0.95, 0]; BOX_INTERIOR is ±0.10 from origin
     const localX = t.x - BOX_WORLD[0]
     const localY = t.y - BOX_WORLD[1]
     const localZ = t.z - BOX_WORLD[2]
     const inside =
       Math.abs(localX) < 0.10 && Math.abs(localY) < 0.10 && Math.abs(localZ) < 0.10
     if (inside) pollenDwellRef.current += dt
     else pollenDwellRef.current = 0

     if (pollenDwellRef.current >= 4.0) {
       // Fire pollen-observed; the SDK guided engine will see step's
       // motionTrigger and advance — OR we call advanceStep() directly.
       // Read EM's SceneController for the exact API.
       advanceStep('pollen-observed')   // ← placeholder; replace with actual call
       pollenDwellRef.current = -Infinity  // prevent re-fire
     }
   }
   ```

6. Pass `onTick` to `<SceneController …/>`:
   ```tsx
   <SceneController particles={particlesRef} walls={BOX_INTERIOR} onTick={onTick} />
   ```

7. **Hide molecules on scene 2 when toggle is off** — add `isVisible` prop to `ParticleField`:
   ```tsx
   const showMolecules = useLabSettings(s => s.showMolecules)
   // ...
   <ParticleField
     particles={particlesRef}
     capacity={60}
     position={BOX_WORLD}
     isVisible={(p) => idx !== 1 || showMolecules}
   />
   ```

> **Note:** the `advanceStep('pollen-observed')` call signature is a placeholder. The implementer should READ `src/labs/electromagnetic-induction/scene/SceneController.tsx` to see exactly how EM advances on `magnet-near-coil` (likely calls a function from `sdk/guided/useTaskState`). Mirror that call signature exactly.

- [ ] **Step 3: Compile + smoke**

```bash
npx tsc --noEmit
npm run dev
```

Scene 2: pick up pollen, drop in box. Particles are invisible. Pollen jiggles. After ~4s the step advances to `observe-jiggle` (or directly to MC). Tap "Показати причину" — molecules appear, opacity gives causal explanation. Answer MC → advance to scene 3.

- [ ] **Step 4: Add the scene-2 motion-trigger unit test**

Create `src/labs/brownian-diffusion/scene/__tests__/sceneTriggers.test.ts`:

```ts
import { describe, it, expect } from 'vitest'

/**
 * Pollen-in-box dwell logic — pure function form to keep it testable.
 * The actual integration lives in LabScene.tsx but we mirror the math here.
 */
function isInsideBox(pos: { x: number; y: number; z: number }, boxCentre: [number, number, number], halfExtent: number): boolean {
  return Math.abs(pos.x - boxCentre[0]) < halfExtent
      && Math.abs(pos.y - boxCentre[1]) < halfExtent
      && Math.abs(pos.z - boxCentre[2]) < halfExtent
}

describe('pollen-in-box detection', () => {
  it('detects point at exact centre', () => {
    expect(isInsideBox({ x: 0, y: 0.95, z: 0 }, [0, 0.95, 0], 0.10)).toBe(true)
  })

  it('rejects point outside on x axis', () => {
    expect(isInsideBox({ x: 0.20, y: 0.95, z: 0 }, [0, 0.95, 0], 0.10)).toBe(false)
  })
})
```

- [ ] **Step 5: Full gate**

```bash
npx tsc --noEmit
npm test -- --run
```

Expected: 253 passing.

- [ ] **Step 6: Commit**

```bash
git add src/labs/brownian-diffusion/scene/SceneController.tsx \
        src/labs/brownian-diffusion/scene/LabScene.tsx \
        src/labs/brownian-diffusion/instruments/PollenParticle.tsx \
        src/labs/brownian-diffusion/scene/__tests__/sceneTriggers.test.ts
git commit -m "feat(brownian-diffusion): scene 2 motion trigger + molecules hide

SceneController.onTick callback fires each frame; LabScene tracks
pollen dwell time inside box AABB and advances pollen-observed
step at ≥4s. ParticleField.isVisible hides kinetic molecules
when showMolecules toggle is off. Scene 2 now fully playable
end-to-end."
```

---

## Slice 6 — Scene 3 (Gas Diffusion)

### Task 6.1 — `physics/divider.ts` + tests

The divider's behaviour is already wired into `kinetics.ts:reflectAtDivider`. This file adds the **state-management** layer: an interpolated height-over-time, and a "fraction-mixed" helper used by the gases-mixed motion trigger.

**Files:**
- Create: `src/labs/brownian-diffusion/physics/divider.ts`
- Create: `src/labs/brownian-diffusion/physics/__tests__/divider.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/labs/brownian-diffusion/physics/__tests__/divider.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { Particle } from '../particles'
import { dividerStateAt, fractionMixed, BOX_HALF_Y } from '../divider'

describe('dividerStateAt(handleY)', () => {
  it('returns wall plane x=0 and openHeightY at default base y', () => {
    const d = dividerStateAt(-BOX_HALF_Y) // handle at bottom = fully closed
    expect(d?.x).toBe(0)
    expect(d?.openHeightY).toBeCloseTo(BOX_HALF_Y, 6)
  })

  it('progressively opens as handle rises', () => {
    const closed = dividerStateAt(-BOX_HALF_Y)
    const half = dividerStateAt(0)
    const open = dividerStateAt(BOX_HALF_Y + 0.05)
    expect(closed?.openHeightY).toBeGreaterThan(half?.openHeightY ?? -Infinity)
    expect(open).toBeNull() // handle above box top → no divider
  })
})

describe('fractionMixed', () => {
  function mkPs(redOnRight: number, blueOnLeft: number): Particle[] {
    const out: Particle[] = []
    // 10 red total
    for (let i = 0; i < 10; i++) {
      const onRight = i < redOnRight
      out.push({
        kind: 'red',
        pos: { x: onRight ? 0.05 : -0.05, y: 0, z: 0 },
        vel: { x: 0, y: 0, z: 0 },
        mass: 1,
        radius: 0.005,
      })
    }
    // 10 blue total
    for (let i = 0; i < 10; i++) {
      const onLeft = i < blueOnLeft
      out.push({
        kind: 'blue',
        pos: { x: onLeft ? -0.05 : 0.05, y: 0, z: 0 },
        vel: { x: 0, y: 0, z: 0 },
        mass: 1,
        radius: 0.005,
      })
    }
    return out
  }

  it('returns 0 when fully segregated', () => {
    expect(fractionMixed(mkPs(0, 0))).toBeCloseTo(0, 6)
  })

  it('returns 1 when 50/50 in each half', () => {
    expect(fractionMixed(mkPs(5, 5))).toBeCloseTo(1, 6)
  })

  it('returns 0.5 for half-mixed', () => {
    expect(fractionMixed(mkPs(3, 3))).toBeCloseTo(0.6, 1)
  })
})
```

- [ ] **Step 2: Run failing**

```bash
npx vitest run src/labs/brownian-diffusion/physics/__tests__/divider.test.ts
```

Expected: 5 failures.

- [ ] **Step 3: Implement `divider.ts`**

Create `src/labs/brownian-diffusion/physics/divider.ts`:

```ts
import { Particle } from './particles'
import { DividerState } from './kinetics'

export const BOX_HALF_Y = 0.10

/**
 * Map the divider's handle Y (world-local, relative to box centre) to a
 * DividerState. The handle is mounted at the TOP edge of the divider
 * wall; as the student drags the handle up, openHeightY descends — i.e.
 * the gap above the divider grows from 0 (closed) to 2·BOX_HALF_Y (fully
 * open). Returns null when the handle has lifted above the box ceiling.
 */
export function dividerStateAt(handleY: number): DividerState {
  if (handleY > BOX_HALF_Y + 0.04) return null  // 4cm above box → fully removed
  // Wall blocks particles whose y < openHeightY.
  // When handle is at -BOX_HALF_Y (bottom), the wall covers full box → openHeightY = BOX_HALF_Y.
  // When handle is at +BOX_HALF_Y (top), the wall is gone → openHeightY = -BOX_HALF_Y.
  const span = 2 * BOX_HALF_Y
  const fraction = Math.max(0, Math.min(1, (BOX_HALF_Y - handleY) / span))
  const openHeightY = -BOX_HALF_Y + fraction * span
  return { x: 0, openHeightY }
}

/**
 * "Mixed-ness" of two-colour particle population: 0 = fully segregated
 * (all red on one side, all blue on the other), 1 = perfectly balanced
 * (50/50 in each half). Intermediate values scale linearly.
 *
 * Used by Scene 3 motion trigger 'gases-mixed' — fires when ≥ 0.6.
 */
export function fractionMixed(particles: Particle[]): number {
  let redLeft = 0, redRight = 0, blueLeft = 0, blueRight = 0
  for (const p of particles) {
    const left = p.pos.x < 0
    if (p.kind === 'red')  left ? redLeft++  : redRight++
    if (p.kind === 'blue') left ? blueLeft++ : blueRight++
  }
  const redTotal = redLeft + redRight
  const blueTotal = blueLeft + blueRight
  if (redTotal === 0 || blueTotal === 0) return 0
  const redRightFrac = redRight / redTotal       // 0 → 0.5
  const blueLeftFrac = blueLeft / blueTotal       // 0 → 0.5
  // perfectly mixed = 0.5 on each side = score 1.0
  return Math.min(1, (redRightFrac + blueLeftFrac) / 1.0)
}
```

- [ ] **Step 4: Run tests — pass**

```bash
npx vitest run src/labs/brownian-diffusion/physics/__tests__/divider.test.ts
```

Expected: ✓ 5/5.

- [ ] **Step 5: Commit**

```bash
git add src/labs/brownian-diffusion/physics/divider.ts \
        src/labs/brownian-diffusion/physics/__tests__/divider.test.ts
git commit -m "feat(brownian-diffusion): divider state helpers + fractionMixed

dividerStateAt(handleY) maps drag handle position to a DividerState
the kinetic engine consumes. fractionMixed measures how thoroughly
two-colour gases have intermingled — drives the 'gases-mixed'
motion trigger at >= 0.6. 5 tests cover segregated, half-mixed,
and fully-mixed cases."
```

---

### Task 6.2 — `instruments/Divider.tsx` (Rapier kinematic + drag handle)

**Files:**
- Create: `src/labs/brownian-diffusion/instruments/Divider.tsx`

The divider is a thin vertical wall inside the glass box, with a handle protruding above the box top. Student drags the handle vertically (y-axis only). The wall and handle move together.

- [ ] **Step 1: Write `Divider.tsx`**

Create `src/labs/brownian-diffusion/instruments/Divider.tsx`:

```tsx
import { useRef, useState } from 'react'
import { RigidBody, RapierRigidBody } from '@react-three/rapier'
import { Draggable } from '../../../sdk/object/Draggable'
import { BOX_HALF_Y } from '../physics/divider'

const WALL_THICK = 0.004
const WALL_W = 0.18    // slightly less than box interior (0.20) so it fits cleanly
const WALL_H = 0.18

type Props = {
  /** Centre position of the box. Divider centre x matches box x. */
  boxCentre: [number, number, number]
  /** Reports the current handle y (world-relative) on every drag tick. */
  onHandleY?: (worldY: number) => void
  enabled: boolean
}

export function Divider({ boxCentre, onHandleY, enabled }: Props) {
  const bodyRef = useRef<RapierRigidBody>(null)
  const [, force] = useState(0)

  return (
    <RigidBody
      ref={bodyRef}
      type="kinematicPosition"          // student moves it, no gravity
      position={[boxCentre[0], boxCentre[1], boxCentre[2]]}
      userData={{ bodyId: 'divider' }}
      colliders={false}
    >
      <Draggable
        bodyRef={bodyRef}
        bodyId="divider"
        enabled={enabled}
        // Constrain drag to vertical axis only.
        axis="y"
        // World y range for the handle:
        worldYMin={boxCentre[1] - BOX_HALF_Y}
        worldYMax={boxCentre[1] + BOX_HALF_Y + 0.06}
        onMove={(_pos) => {
          // Re-render trigger so SceneController's getDivider sees fresh y.
          force(n => n + 1)
          if (onHandleY && bodyRef.current) {
            onHandleY(bodyRef.current.translation().y)
          }
        }}
      >
        <group>
          {/* Vertical wall — slightly transparent so particles still visible */}
          <mesh>
            <boxGeometry args={[WALL_THICK, WALL_H, WALL_W]} />
            <meshStandardMaterial
              color="#ffce4d"
              transparent
              opacity={0.55}
              roughness={0.3}
            />
          </mesh>
          {/* Drag handle protruding above box top — generous hit radius */}
          <mesh position={[0, BOX_HALF_Y + 0.04, 0]}>
            <cylinderGeometry args={[0.012, 0.012, 0.04, 16]} />
            <meshStandardMaterial color="#ff9b3d" roughness={0.4} />
          </mesh>
        </group>
      </Draggable>
    </RigidBody>
  )
}
```

> **Implementer note:** `Draggable` from `sdk/object/Draggable` should already support `axis` and `worldYMin/Max` constraints — read the SDK file to confirm. If those props don't exist, implement the axis constraint locally inside the `onMove` callback by clamping y and ignoring x/z.

- [ ] **Step 2: Compile**

```bash
npx tsc --noEmit
```

Fix any prop-name mismatches against the actual `Draggable` API.

- [ ] **Step 3: Commit**

```bash
git add src/labs/brownian-diffusion/instruments/Divider.tsx
git commit -m "feat(brownian-diffusion): Divider (kinematic wall + drag handle)

Vertical amber-tinted wall inside the box; cylindrical handle
protrudes above the box top for a generous touch hit area.
Constrained to y-axis drag via Draggable.axis='y' with world Y
bounds. bodyId='divider' matches scenes.ts pattern."
```

---

### Task 6.3 — Wire scene 3 in `LabScene.tsx` + gases-mixed motion trigger

**Files:**
- Modify: `src/labs/brownian-diffusion/scene/LabScene.tsx`

- [ ] **Step 1: Update particle initialisation to support a 2-color split**

In `LabScene.tsx`, extend `makeInitialParticles` to accept a `mode` arg:

```tsx
function makeInitialParticles(mode: 'mixed' | 'segregated' = 'mixed'): Particle[] {
  const out: Particle[] = []
  const HALF = 0.09
  for (let i = 0; i < 80; i++) {   // 40 red + 40 blue for scenes 3/6
    const kind: 'red' | 'blue' = i < 40 ? 'red' : 'blue'
    const def = PARTICLE_DEFAULTS[kind]
    let x: number
    if (mode === 'segregated') {
      // red on left (x < 0), blue on right (x > 0)
      x = kind === 'red'
        ? -0.04 - Math.random() * 0.05
        :  0.04 + Math.random() * 0.05
    } else {
      x = (Math.random() - 0.5) * 2 * HALF
    }
    out.push({
      kind,
      pos: {
        x,
        y: (Math.random() - 0.5) * 2 * HALF,
        z: (Math.random() - 0.5) * 2 * HALF,
      },
      vel: randomVelocity(0.3),
      mass: def.mass,
      radius: def.radius,
    })
  }
  return out
}
```

- [ ] **Step 2: Trigger segregation on entry to scene 3**

Add to `LabScene.tsx`:

```tsx
import { Divider } from '../instruments/Divider'
import { dividerStateAt, fractionMixed } from '../physics/divider'

const dividerHandleY = useRef(BOX_WORLD[1] - 0.10)  // start fully closed
const gasesMixedFiredRef = useRef(false)

// When scene changes to 3, re-spawn particles in segregated mode.
useEffect(() => {
  if (idx === 2) {  // scene index 2 = scene 3
    particlesRef.current = makeInitialParticles('segregated')
    dividerHandleY.current = BOX_WORLD[1] - 0.10
    gasesMixedFiredRef.current = false
  }
  if (idx === 5) {  // scene index 5 = scene 6 (temp)
    particlesRef.current = makeInitialParticles('mixed')
  }
}, [idx])
```

- [ ] **Step 3: Mount the Divider conditionally**

```tsx
{idx === 2 && (
  <Divider
    boxCentre={BOX_WORLD}
    enabled={true}
    onHandleY={(y) => { dividerHandleY.current = y }}
  />
)}
```

- [ ] **Step 4: Pass `getDivider` and extend `onTick` for gases-mixed**

```tsx
const getDivider = () => {
  if (idx !== 2) return null
  return dividerStateAt(dividerHandleY.current - BOX_WORLD[1])
}

const onTick = (dt: number) => {
  // Scene 2: pollen dwell (existing)
  if (idx === 1) {
    /* ... pollen logic from Task 5.4 ... */
  }
  // Scene 3: detect gases mixed
  if (idx === 2 && !gasesMixedFiredRef.current) {
    const f = fractionMixed(particlesRef.current)
    if (f >= 0.6) {
      gasesMixedFiredRef.current = true
      advanceStep('gases-mixed')   // same convention as Task 5.4
    }
  }
  void dt
}

// And update the SceneController:
<SceneController
  particles={particlesRef}
  walls={BOX_INTERIOR}
  getDivider={getDivider}
  onTick={onTick}
/>
```

- [ ] **Step 5: Compile + manual smoke**

```bash
npx tsc --noEmit
npm run dev
```

Scene 3:
- ✓ On entry, red particles cluster on left, blue on right.
- ✓ Divider visible vertically in the middle with amber handle above the box.
- ✓ Drag handle up → particles begin crossing.
- ✓ Within ~10 s of mixing, the motion trigger fires and the step advances.
- ✓ MC question appears and answers correctly.

- [ ] **Step 6: Full gate**

```bash
npx tsc --noEmit
npm test -- --run
npm run build
```

Expected: 258 passing (251 + 5 divider + 2 trigger).

Wait — recount: 251 after Slice 5. Added 5 divider tests = 256, plus 2 (the trigger test we added in Task 5.4 was already in count). Hmm. Per the running totals, after Slice 5 = 253. After Slice 6: 253 + 5 = 258.

- [ ] **Step 7: Commit**

```bash
git add src/labs/brownian-diffusion/scene/LabScene.tsx
git commit -m "feat(brownian-diffusion): scene 3 wiring — divider + gases-mixed

40 red + 40 blue particles spawn segregated on entry; divider
mounts inside the box; getDivider feeds DividerState each frame.
gases-mixed motion trigger fires when fractionMixed >= 0.6.
Scene 3 fully playable end-to-end."
```

---

## Slice 7 — Scene 4 (Liquid Diffusion)

### Task 7.1 — `instruments/Beaker.tsx`

**Files:**
- Create: `src/labs/brownian-diffusion/instruments/Beaker.tsx`

Cylindrical glass beaker with a water-level shading. Particles inside are kinetic engine particles, not Rapier.

- [ ] **Step 1: Write the component**

Create `src/labs/brownian-diffusion/instruments/Beaker.tsx`:

```tsx
export const BEAKER_RADIUS = 0.06    // metres
export const BEAKER_HEIGHT = 0.14
export const WATER_LEVEL = 0.10      // metres above base (i.e., water fills lower 10cm)

type Props = {
  /** Base centre (table top). */
  position: [number, number, number]
}

export function Beaker({ position }: Props) {
  const [x, y, z] = position
  // Glass walls — open-top cylinder rendered as a thin shell using
  // CylinderGeometry with openEnded=true.
  return (
    <group position={[x, y, z]}>
      {/* Outer glass shell */}
      <mesh>
        <cylinderGeometry args={[BEAKER_RADIUS, BEAKER_RADIUS * 0.9, BEAKER_HEIGHT, 32, 1, true]} />
        <meshStandardMaterial
          color="#88c4ff"
          transparent
          opacity={0.18}
          roughness={0.1}
          side={2 /* DoubleSide */}
        />
      </mesh>
      {/* Bottom disc */}
      <mesh position={[0, -BEAKER_HEIGHT / 2 + 0.002, 0]}>
        <cylinderGeometry args={[BEAKER_RADIUS * 0.9, BEAKER_RADIUS * 0.9, 0.004, 32]} />
        <meshStandardMaterial color="#88c4ff" transparent opacity={0.25} roughness={0.15} />
      </mesh>
      {/* Water — short cylinder at lower part */}
      <mesh position={[0, -BEAKER_HEIGHT / 2 + WATER_LEVEL / 2 + 0.002, 0]}>
        <cylinderGeometry args={[BEAKER_RADIUS * 0.88, BEAKER_RADIUS * 0.88, WATER_LEVEL, 32]} />
        <meshStandardMaterial
          color="#88c4ff"
          transparent
          opacity={0.30}
          roughness={0.25}
          metalness={0}
        />
      </mesh>
    </group>
  )
}

/**
 * AABB-shaped wall bound for the kinetic engine. Approximates the cylinder
 * with its inscribed square — particles can't reach the corners but it's
 * close enough at this scale (and avoids cylindrical collision math).
 */
export function beakerWalls(position: [number, number, number]) {
  const r = BEAKER_RADIUS * 0.85
  const yBase = position[1] - BEAKER_HEIGHT / 2 + 0.005
  return {
    min: { x: position[0] - r, y: yBase, z: position[2] - r },
    max: { x: position[0] + r, y: position[1] - BEAKER_HEIGHT / 2 + WATER_LEVEL, z: position[2] + r },
  }
}
```

- [ ] **Step 2: Compile**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/labs/brownian-diffusion/instruments/Beaker.tsx
git commit -m "feat(brownian-diffusion): Beaker (glass cylinder + water level)

Open-top cylindrical glass shell with subtle blue tint + lower
water mass. beakerWalls() returns the inscribed-square AABB used
by the kinetic engine for particle confinement."
```

---

### Task 7.2 — `instruments/InkDropper.tsx`

**Files:**
- Create: `src/labs/brownian-diffusion/instruments/InkDropper.tsx`

Glass dropper draggable from the tray to the beaker; on drop above the beaker, spawns 30 ink particles.

- [ ] **Step 1: Write the dropper**

Create `src/labs/brownian-diffusion/instruments/InkDropper.tsx`:

```tsx
import { useRef } from 'react'
import { RigidBody, RapierRigidBody, BallCollider } from '@react-three/rapier'
import { Draggable } from '../../../sdk/object/Draggable'

const DROPPER_LEN = 0.06

type Props = {
  trayPosition: [number, number, number]
  enabled: boolean
  /** Called on every drag-end. If returns true, dropper does the "release"
   *  animation (the particles are spawned by the LabScene listener). */
  onRelease?: (worldPos: { x: number; y: number; z: number }) => boolean
}

export function InkDropper({ trayPosition, enabled, onRelease }: Props) {
  const bodyRef = useRef<RapierRigidBody>(null)
  return (
    <RigidBody
      ref={bodyRef}
      type={enabled ? 'kinematicPosition' : 'fixed'}
      position={trayPosition}
      userData={{ bodyId: 'dropper' }}
      colliders={false}
    >
      <BallCollider args={[0.012]} />
      <Draggable
        bodyRef={bodyRef}
        bodyId="dropper"
        enabled={enabled}
        onDragEnd={() => {
          if (onRelease && bodyRef.current) {
            const t = bodyRef.current.translation()
            onRelease({ x: t.x, y: t.y, z: t.z })
          }
        }}
      >
        <group>
          {/* Glass tube */}
          <mesh position={[0, DROPPER_LEN / 2, 0]}>
            <cylinderGeometry args={[0.008, 0.008, DROPPER_LEN, 16]} />
            <meshStandardMaterial color="#cdeaff" transparent opacity={0.6} roughness={0.2} />
          </mesh>
          {/* Rubber bulb on top */}
          <mesh position={[0, DROPPER_LEN + 0.012, 0]}>
            <sphereGeometry args={[0.014, 16, 12]} />
            <meshStandardMaterial color="#3a2a55" roughness={0.7} />
          </mesh>
          {/* Tip — purple ink droplet hint */}
          <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[0.006, 12, 10]} />
            <meshStandardMaterial color="#7a3df2" emissive="#5a25d2" emissiveIntensity={0.3} />
          </mesh>
        </group>
      </Draggable>
    </RigidBody>
  )
}
```

> **Note:** if `Draggable` doesn't yet support `onDragEnd`, add a small ref + `useEffect` polling for body position change, OR extend the SDK Draggable. For now write it as if `onDragEnd` exists; if missing the implementer should add it in a tiny SDK touch-up.

- [ ] **Step 2: Compile**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/labs/brownian-diffusion/instruments/InkDropper.tsx
git commit -m "feat(brownian-diffusion): InkDropper (glass tube + rubber bulb)

Kinematic Rapier body, dragged from the tray. onRelease callback
fires on drag-end with the dropper's world position — LabScene
listens, checks whether release point is above the beaker, and
spawns ink particles via the spawnInk helper (Task 7.3)."
```

---

### Task 7.3 — Liquid kinetics params + `spawnInk` helper

**Files:**
- Modify: `src/labs/brownian-diffusion/physics/kinetics.ts` (add `LiquidParams` + applyLiquidDrag)
- Create: `src/labs/brownian-diffusion/physics/spawnInk.ts`

Liquid sim runs the same engine with two changes: lower base velocity (×0.3) and linear drag each step.

- [ ] **Step 1: Add a `drag` field to `step()` signature**

Modify `kinetics.ts` — change `step` signature:

```ts
export function step(
  particles: Particle[],
  walls: AABB,
  divider: DividerState,
  dt: number,
  liquidDrag: number = 0,   // 0 = no drag (gas); >0 = liquid mode
): void {
  // ... after integration, before pair collisions:
  if (liquidDrag > 0) {
    const factor = Math.max(0, 1 - liquidDrag * dt)
    for (const p of particles) {
      p.vel.x *= factor
      p.vel.y *= factor
      p.vel.z *= factor
    }
  }
  // ... rest unchanged
}
```

- [ ] **Step 2: Extend the test for liquid drag**

Add to `physics/__tests__/kinetics.test.ts`:

```ts
describe('step (liquid drag)', () => {
  it('reduces velocity magnitude over time with liquidDrag > 0', () => {
    const ps = [mkP(0, 0, 0, 1, 0, 0, 1, 0.005)]
    const walls = { min: { x: -1, y: -1, z: -1 }, max: { x: 1, y: 1, z: 1 } }
    for (let f = 0; f < 60; f++) step(ps, walls, null, 1 / 60, 1.2)
    expect(Math.abs(ps[0].vel.x)).toBeLessThan(0.5)
  })
})
```

- [ ] **Step 3: Implement `spawnInk.ts`**

Create `src/labs/brownian-diffusion/physics/spawnInk.ts`:

```ts
import { Particle, PARTICLE_DEFAULTS, randomVelocity } from './particles'

/**
 * Spawn N ink particles in a small cluster at (x, y, z) in world space,
 * then translate them into the kinetic engine's local frame (relative
 * to the beaker centre). Mutates `particles` in place.
 */
export function spawnInk(
  particles: Particle[],
  worldPos: { x: number; y: number; z: number },
  beakerCentre: [number, number, number],
  count = 30,
): void {
  const def = PARTICLE_DEFAULTS.ink
  for (let i = 0; i < count; i++) {
    particles.push({
      kind: 'ink',
      pos: {
        x: (worldPos.x - beakerCentre[0]) + (Math.random() - 0.5) * 0.01,
        y: (worldPos.y - beakerCentre[1]) + (Math.random() - 0.5) * 0.01,
        z: (worldPos.z - beakerCentre[2]) + (Math.random() - 0.5) * 0.01,
      },
      vel: randomVelocity(0.1),   // slow drop
      mass: def.mass,
      radius: def.radius,
    })
  }
}
```

Add a quick test in `physics/__tests__/kinetics.test.ts` (or new file `spawnInk.test.ts`):

```ts
describe('spawnInk', () => {
  it('appends count particles of kind=ink near the release point', () => {
    const ps: Particle[] = []
    spawnInk(ps, { x: 0.40, y: 0.90, z: 0 }, [0.40, 0.85, 0], 10)
    expect(ps).toHaveLength(10)
    expect(ps.every(p => p.kind === 'ink')).toBe(true)
    // Local pos should be roughly (0, 0.05, 0)
    expect(Math.abs(ps[0].pos.x)).toBeLessThan(0.02)
    expect(ps[0].pos.y).toBeCloseTo(0.05, 1)
  })
})
```

- [ ] **Step 4: Run tests — pass**

```bash
npx vitest run src/labs/brownian-diffusion/physics/
```

- [ ] **Step 5: Commit**

```bash
git add src/labs/brownian-diffusion/physics/kinetics.ts \
        src/labs/brownian-diffusion/physics/spawnInk.ts \
        src/labs/brownian-diffusion/physics/__tests__/kinetics.test.ts
git commit -m "feat(brownian-diffusion): liquid drag + spawnInk

step() now takes an optional liquidDrag coefficient (≥0); per
frame applies factor (1 - drag·dt) to every velocity. spawnInk
appends a cluster of 30 ink particles in the engine's local
frame relative to the beaker centre. 2 new tests cover both."
```

---

### Task 7.4 — Wire scene 4 in `LabScene.tsx`

**Files:**
- Modify: `src/labs/brownian-diffusion/scene/LabScene.tsx`

- [ ] **Step 1: Add scene-4 instrument imports + constants**

```tsx
import { Beaker, beakerWalls } from '../instruments/Beaker'
import { InkDropper } from '../instruments/InkDropper'
import { spawnInk } from '../physics/spawnInk'
import { PARTICLE_DEFAULTS } from '../physics/particles'

const BEAKER_WORLD: [number, number, number] = [0.40, 0.85, 0]
const INK_TRAY_WORLD: [number, number, number] = [0.40, 0.94, 0.30]
```

- [ ] **Step 2: Seed water particles on scene-4 entry**

```tsx
function makeWaterParticles(): Particle[] {
  const out: Particle[] = []
  const def = PARTICLE_DEFAULTS.water
  for (let i = 0; i < 30; i++) {
    out.push({
      kind: 'water',
      pos: {
        x: (Math.random() - 0.5) * 0.08,
        y: -0.04 + Math.random() * 0.07,
        z: (Math.random() - 0.5) * 0.08,
      },
      vel: randomVelocity(0.05),
      mass: def.mass,
      radius: def.radius,
    })
  }
  return out
}

// in useEffect on idx change:
if (idx === 3) {  // scene 4
  particlesRef.current = makeWaterParticles()
  inkSpawnedRef.current = false
  liquidMixedFiredRef.current = false
}
```

- [ ] **Step 3: Mount Beaker + InkDropper conditionally**

Inside `<Physics>`:

```tsx
{idx === 3 && (
  <>
    <Beaker position={BEAKER_WORLD} />
    <InkDropper
      trayPosition={INK_TRAY_WORLD}
      enabled={!inkSpawnedRef.current}
      onRelease={(worldPos) => {
        // Only spawn if the release is above the beaker
        const dx = worldPos.x - BEAKER_WORLD[0]
        const dz = worldPos.z - BEAKER_WORLD[2]
        const horizDist = Math.sqrt(dx * dx + dz * dz)
        if (horizDist < 0.07 && worldPos.y > BEAKER_WORLD[1]) {
          spawnInk(particlesRef.current, worldPos, BEAKER_WORLD, 30)
          inkSpawnedRef.current = true
          return true
        }
        return false
      }}
    />
  </>
)}
```

The ParticleField needs `position={BEAKER_WORLD}` for scene 4 (NOT `BOX_WORLD`). Wire a conditional:

```tsx
<ParticleField
  particles={particlesRef}
  capacity={120}                    // bumped to fit 30 water + 30 ink (+ buffer)
  position={idx === 3 ? BEAKER_WORLD : BOX_WORLD}
  isVisible={(p) => idx !== 1 || showMolecules}
/>
```

- [ ] **Step 4: Switch walls + liquid-drag at scene 4**

Update SceneController prop selection:

```tsx
const currentWalls = idx === 3 ? beakerWalls(BEAKER_WORLD) : BOX_INTERIOR
const liquidDrag = idx === 3 ? 1.2 : 0  // drag only in liquid scene

// SceneController will pass liquidDrag down to step() — extend its props:
<SceneController
  particles={particlesRef}
  walls={currentWalls}
  getDivider={getDivider}
  onTick={onTick}
  liquidDrag={liquidDrag}
/>
```

Update `SceneController.tsx` to accept and pass through `liquidDrag`:

```ts
type Props = {
  // ... existing
  liquidDrag?: number
}
// inside useFrame:
step(particles.current, walls, divider, dt, liquidDrag ?? 0)
```

- [ ] **Step 5: Add liquid-mixed motion trigger**

In `LabScene.tsx`'s `onTick`:

```tsx
const liquidMixedFiredRef = useRef(false)
const inkSpawnedRef = useRef(false)

// in onTick:
if (idx === 3 && inkSpawnedRef.current && !liquidMixedFiredRef.current) {
  // Count ink particles whose y >= -0.02 (above the bottom third) AND
  // whose horizontal spread is meaningful. Simple proxy: ink particles
  // count above bottom quarter must be >= 50% of total ink.
  const inkPs = particlesRef.current.filter(p => p.kind === 'ink')
  if (inkPs.length > 0) {
    const aboveQuarter = inkPs.filter(p => p.pos.y > -0.05).length
    if (aboveQuarter / inkPs.length > 0.5) {
      liquidMixedFiredRef.current = true
      advanceStep('liquid-mixed-partial')
    }
  }
}
```

- [ ] **Step 6: Compile + manual smoke**

```bash
npx tsc --noEmit
npm run dev
```

Scene 4:
- ✓ Beaker visible on right of table with water particles inside.
- ✓ Pipette draggable from tray.
- ✓ Releasing pipette above beaker spawns 30 purple ink particles.
- ✓ Ink particles drift slowly (liquid drag), gradually spreading.
- ✓ Motion trigger fires when ink has visibly spread.
- ✓ MC question appears; answering advances to scene 5.

- [ ] **Step 7: Full gate**

```bash
npx tsc --noEmit
npm test -- --run
npm run build
```

Expected: 260 passing (258 + 2).

- [ ] **Step 8: Commit**

```bash
git add src/labs/brownian-diffusion/scene/LabScene.tsx \
        src/labs/brownian-diffusion/scene/SceneController.tsx
git commit -m "feat(brownian-diffusion): scene 4 wiring — beaker + ink dropper

Scene-4 entry seeds 30 water particles in beaker AABB walls; ink
dropper is draggable from tray; release above beaker spawns 30
ink particles via spawnInk. liquidDrag=1.2 makes them spread
visibly slower than gas. liquid-mixed-partial motion trigger
fires when ink rises above bottom quarter."
```

---

## Slice 8 — Scene 5 (Solid Diffusion, time-lapse)

### Task 8.1 — `physics/lattice.ts` (snapshots + interpolate) + tests

The scene 5 mechanic is purely visual interpolation between pre-baked snapshots — no kinetic engine involved.

**Files:**
- Create: `src/labs/brownian-diffusion/physics/lattice.ts`
- Create: `src/labs/brownian-diffusion/physics/__tests__/lattice.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/labs/brownian-diffusion/physics/__tests__/lattice.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { interpolateLattice, SNAPSHOTS } from '../lattice'

describe('SNAPSHOTS', () => {
  it('has exactly 5 keyframes at years [0, 1, 10, 100, 1000]', () => {
    expect(SNAPSHOTS.map(s => s.years)).toEqual([0, 1, 10, 100, 1000])
  })

  it('all snapshots have the same total atom count', () => {
    const counts = SNAPSHOTS.map(s => s.atoms.length)
    const first = counts[0]
    for (const c of counts) expect(c).toBe(first)
  })

  it('atom count is split exactly half gold / half lead in the t=0 snapshot', () => {
    const t0 = SNAPSHOTS[0]
    const gold = t0.atoms.filter(a => a.kind === 'gold').length
    const lead = t0.atoms.filter(a => a.kind === 'lead').length
    expect(gold).toBe(lead)
  })
})

describe('interpolateLattice(years)', () => {
  it('returns the exact snapshot when years matches a keyframe', () => {
    const snap = interpolateLattice(100)
    const ref = SNAPSHOTS.find(s => s.years === 100)!
    expect(snap.atoms).toHaveLength(ref.atoms.length)
    expect(snap.atoms[0].pos).toEqual(ref.atoms[0].pos)
  })

  it('returns positions between adjacent snapshots at intermediate years', () => {
    const a = SNAPSHOTS.find(s => s.years === 1)!.atoms[0]
    const b = SNAPSHOTS.find(s => s.years === 10)!.atoms[0]
    const mid = interpolateLattice(5.5)  // halfway in log-ish space — see helper
    // Position should be a weighted blend
    expect(mid.atoms[0].pos.x).toBeGreaterThan(Math.min(a.pos.x, b.pos.x) - 1e-6)
    expect(mid.atoms[0].pos.x).toBeLessThan(Math.max(a.pos.x, b.pos.x) + 1e-6)
  })

  it('clamps to first snapshot for years < 0', () => {
    const snap = interpolateLattice(-5)
    expect(snap.atoms[0].pos).toEqual(SNAPSHOTS[0].atoms[0].pos)
  })

  it('clamps to last snapshot for years > max', () => {
    const snap = interpolateLattice(5000)
    expect(snap.atoms[0].pos).toEqual(SNAPSHOTS[SNAPSHOTS.length - 1].atoms[0].pos)
  })
})
```

- [ ] **Step 2: Run failing**

```bash
npx vitest run src/labs/brownian-diffusion/physics/__tests__/lattice.test.ts
```

Expected: 5 failures.

- [ ] **Step 3: Implement `lattice.ts`**

Create `src/labs/brownian-diffusion/physics/lattice.ts`:

```ts
import { Vec3 } from './particles'

export type AtomKind = 'gold' | 'lead'

export type LatticeAtom = {
  kind: AtomKind
  /** Local pos relative to the joined block centre. */
  pos: Vec3
}

export type LatticeSnapshot = {
  years: number
  atoms: LatticeAtom[]
}

/**
 * Build a regular grid of atoms over the top half (gold) and bottom half (lead).
 * Then move some gold atoms down into lead lattice positions to simulate
 * diffusion (and vice versa, more slowly).
 *
 * Lattice is a 5×4×5 grid (100 atoms total: 50 gold + 50 lead).
 */
function buildBaseSnapshot(): LatticeAtom[] {
  const atoms: LatticeAtom[] = []
  const SPACING = 0.012
  for (let xi = -2; xi <= 2; xi++) {
    for (let zi = -2; zi <= 2; zi++) {
      // gold (top half, yi = 1..2)
      for (let yi = 1; yi <= 2; yi++) {
        atoms.push({
          kind: 'gold',
          pos: { x: xi * SPACING, y: yi * SPACING, z: zi * SPACING },
        })
      }
      // lead (bottom half, yi = -2..-1)
      for (let yi = -2; yi <= -1; yi++) {
        atoms.push({
          kind: 'lead',
          pos: { x: xi * SPACING, y: yi * SPACING, z: zi * SPACING },
        })
      }
    }
  }
  return atoms
}

/**
 * Take a base snapshot and migrate `goldDown` random gold atoms into
 * lead positions, and `leadUp` lead atoms into gold positions. Doesn't
 * remove originals — those positions stay; just changes kind so the
 * boundary "blurs" visually.
 *
 * Deterministic via a fixed pseudo-random seed.
 */
function buildEvolved(baseSnapshot: LatticeAtom[], goldDown: number, leadUp: number, seed: number): LatticeAtom[] {
  const out = baseSnapshot.map(a => ({ kind: a.kind, pos: { ...a.pos } }))
  let s = seed
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280 }

  const goldNearBoundary = out
    .map((a, i) => ({ a, i }))
    .filter(({ a }) => a.kind === 'gold' && a.pos.y === 0.012) // closest to boundary
  const leadNearBoundary = out
    .map((a, i) => ({ a, i }))
    .filter(({ a }) => a.kind === 'lead' && a.pos.y === -0.012)

  for (let n = 0; n < goldDown; n++) {
    const pick = goldNearBoundary[Math.floor(rnd() * goldNearBoundary.length)]
    out[pick.i] = { kind: 'gold', pos: { ...pick.a.pos, y: -0.012 + (rnd() - 0.5) * 0.004 } }
  }
  for (let n = 0; n < leadUp; n++) {
    const pick = leadNearBoundary[Math.floor(rnd() * leadNearBoundary.length)]
    out[pick.i] = { kind: 'lead', pos: { ...pick.a.pos, y: 0.012 + (rnd() - 0.5) * 0.004 } }
  }
  return out
}

const BASE = buildBaseSnapshot()

export const SNAPSHOTS: LatticeSnapshot[] = [
  { years: 0,    atoms: BASE.map(a => ({ kind: a.kind, pos: { ...a.pos } })) },
  { years: 1,    atoms: buildEvolved(BASE, 1, 0, 13) },
  { years: 10,   atoms: buildEvolved(BASE, 3, 1, 91) },
  { years: 100,  atoms: buildEvolved(BASE, 8, 3, 1037) },
  { years: 1000, atoms: buildEvolved(BASE, 18, 8, 7919) },
]

/**
 * Position-lerp between the two snapshots that bracket `years`. Clamps to
 * the endpoints outside the range. KIND of each atom is taken from the
 * later snapshot (kind transitions are discrete; lerp is positional only).
 */
export function interpolateLattice(years: number): LatticeSnapshot {
  if (years <= SNAPSHOTS[0].years) return SNAPSHOTS[0]
  if (years >= SNAPSHOTS[SNAPSHOTS.length - 1].years) return SNAPSHOTS[SNAPSHOTS.length - 1]

  let i = 0
  while (SNAPSHOTS[i + 1].years <= years) i++
  const a = SNAPSHOTS[i]
  const b = SNAPSHOTS[i + 1]
  const t = (years - a.years) / (b.years - a.years)

  const atoms: LatticeAtom[] = []
  for (let k = 0; k < a.atoms.length; k++) {
    const A = a.atoms[k]
    const B = b.atoms[k]
    atoms.push({
      kind: B.kind,    // later snapshot's kind (so diffused atoms read as "moved")
      pos: {
        x: A.pos.x + (B.pos.x - A.pos.x) * t,
        y: A.pos.y + (B.pos.y - A.pos.y) * t,
        z: A.pos.z + (B.pos.z - A.pos.z) * t,
      },
    })
  }
  return { years, atoms }
}
```

- [ ] **Step 4: Run tests — all pass**

```bash
npx vitest run src/labs/brownian-diffusion/physics/__tests__/lattice.test.ts
```

Expected: ✓ 5/5.

- [ ] **Step 5: Commit**

```bash
git add src/labs/brownian-diffusion/physics/lattice.ts \
        src/labs/brownian-diffusion/physics/__tests__/lattice.test.ts
git commit -m "feat(brownian-diffusion): solid-state lattice + time-lapse interpolation

Deterministic hand-built snapshots at t=0, 1, 10, 100, 1000 years
on a 5×4×5 grid (100 atoms, 50/50 gold/lead). buildEvolved swaps
a hand-tuned number of atoms across the boundary using a seeded
PRNG so the boundary 'blurs' over time. interpolateLattice
position-lerps between adjacent snapshots; kind taken from the
later snapshot. 5 tests."
```

---

### Task 8.2 — `instruments/SolidBlocks.tsx`

**Files:**
- Create: `src/labs/brownian-diffusion/instruments/SolidBlocks.tsx`

Renders lattice atoms as two stacked `InstancedMesh`es (gold + lead), reading from current snapshot.

- [ ] **Step 1: Write the component**

Create `src/labs/brownian-diffusion/instruments/SolidBlocks.tsx`:

```tsx
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { InstancedMesh, Matrix4 } from 'three'
import { useLabSettings } from '../state/LabSettingsState'
import { interpolateLattice, LatticeSnapshot } from '../physics/lattice'

const SCRATCH = new Matrix4()

type Props = {
  position: [number, number, number]   // base centre of the stacked blocks (world)
}

export function SolidBlocks({ position }: Props) {
  const years = useLabSettings(s => s.timeLapseYears)
  const goldMeshRef = useRef<InstancedMesh>(null)
  const leadMeshRef = useRef<InstancedMesh>(null)

  // Pre-compute count of atoms per kind from the first snapshot
  const { goldCount, leadCount } = useMemo(() => {
    const s = interpolateLattice(0)
    return {
      goldCount: s.atoms.filter(a => a.kind === 'gold').length,
      leadCount: s.atoms.filter(a => a.kind === 'lead').length,
    }
  }, [])

  // Track the previously-rendered snapshot to detect re-render needs.
  const lastYearsRef = useRef(-1)
  const cachedSnapRef = useRef<LatticeSnapshot | null>(null)

  useFrame(() => {
    if (years !== lastYearsRef.current) {
      cachedSnapRef.current = interpolateLattice(years)
      lastYearsRef.current = years
    }
    const snap = cachedSnapRef.current
    if (!snap) return

    let gi = 0, li = 0
    for (const atom of snap.atoms) {
      SCRATCH.makeScale(0.005, 0.005, 0.005)
      SCRATCH.setPosition(atom.pos.x, atom.pos.y, atom.pos.z)
      if (atom.kind === 'gold' && goldMeshRef.current) {
        goldMeshRef.current.setMatrixAt(gi++, SCRATCH)
      } else if (atom.kind === 'lead' && leadMeshRef.current) {
        leadMeshRef.current.setMatrixAt(li++, SCRATCH)
      }
    }
    if (goldMeshRef.current) goldMeshRef.current.instanceMatrix.needsUpdate = true
    if (leadMeshRef.current) leadMeshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <group position={position}>
      <instancedMesh ref={goldMeshRef} args={[undefined, undefined, goldCount]}>
        <sphereGeometry args={[1, 10, 8]} />
        <meshStandardMaterial color="#f4c430" roughness={0.4} metalness={0.5} />
      </instancedMesh>
      <instancedMesh ref={leadMeshRef} args={[undefined, undefined, leadCount]}>
        <sphereGeometry args={[1, 10, 8]} />
        <meshStandardMaterial color="#8a8a92" roughness={0.6} metalness={0.4} />
      </instancedMesh>
    </group>
  )
}
```

- [ ] **Step 2: Compile**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/labs/brownian-diffusion/instruments/SolidBlocks.tsx
git commit -m "feat(brownian-diffusion): SolidBlocks (gold + lead InstancedMesh)

Two InstancedMesh siblings (gold + lead); each frame the
component reads useLabSettings.timeLapseYears, calls
interpolateLattice, and rewrites the per-instance matrices. Both
meshes share the lattice grid spacing — boundary atoms cross-over
visibly when timeLapseYears jumps to 100+."
```

---

### Task 8.3 — `ui/TimeLapseSlider.tsx`

**Files:**
- Create: `src/labs/brownian-diffusion/ui/TimeLapseSlider.tsx`
- Create: `src/labs/brownian-diffusion/ui/__tests__/TimeLapseSlider.test.tsx`

A 4-stop slider: 1 → 10 → 100 → 1000 years.

- [ ] **Step 1: Write the failing test**

Create `src/labs/brownian-diffusion/ui/__tests__/TimeLapseSlider.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { TimeLapseSlider } from '../TimeLapseSlider'
import { useLabSettings } from '../../state/LabSettingsState'

describe('TimeLapseSlider', () => {
  beforeEach(() => {
    useLabSettings.setState({ timeLapseYears: 1 })
  })

  it('shows the current years value', () => {
    const { container } = render(<TimeLapseSlider />)
    expect(container.textContent).toContain('1')
  })

  it('clicking the "10" button updates state', () => {
    const { getByRole } = render(<TimeLapseSlider />)
    fireEvent.click(getByRole('button', { name: /10/ }))
    expect(useLabSettings.getState().timeLapseYears).toBe(10)
  })

  it('clicking the "1000" button updates state', () => {
    const { getByRole } = render(<TimeLapseSlider />)
    fireEvent.click(getByRole('button', { name: /1000/ }))
    expect(useLabSettings.getState().timeLapseYears).toBe(1000)
  })
})
```

- [ ] **Step 2: Run failing**

```bash
npx vitest run src/labs/brownian-diffusion/ui/__tests__/TimeLapseSlider.test.tsx
```

- [ ] **Step 3: Implement**

Create `src/labs/brownian-diffusion/ui/TimeLapseSlider.tsx`:

```tsx
import { useLabSettings, TIME_LAPSE_VALUES, TimeLapseYears } from '../state/LabSettingsState'
import { Button } from '../../../sdk/ui/Button'

export function TimeLapseSlider() {
  const years = useLabSettings(s => s.timeLapseYears)
  const setTimeLapse = useLabSettings(s => s.setTimeLapse)

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      background: 'rgba(0,0,0,0.5)',
      padding: '8px 12px',
      borderRadius: 12,
      backdropFilter: 'blur(8px)',
      color: '#fff',
      fontFamily: '"Inter", system-ui, sans-serif',
    }}>
      <div style={{ fontSize: 11, opacity: 0.7, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        Час: {years === 1 ? '1 рік' : `${years} років`}
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        {TIME_LAPSE_VALUES.map((y: TimeLapseYears) => (
          <Button
            key={y}
            variant={years === y ? 'primary' : 'secondary'}
            onClick={() => setTimeLapse(y)}
            aria-label={`${y} років`}
          >
            {y}
          </Button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests — pass**

```bash
npx vitest run src/labs/brownian-diffusion/ui/__tests__/TimeLapseSlider.test.tsx
```

Expected: ✓ 3/3.

- [ ] **Step 5: Commit**

```bash
git add src/labs/brownian-diffusion/ui/TimeLapseSlider.tsx \
        src/labs/brownian-diffusion/ui/__tests__/TimeLapseSlider.test.tsx
git commit -m "feat(brownian-diffusion): TimeLapseSlider (4 button stops)

Four SDK Buttons mapped to TIME_LAPSE_VALUES from LabSettingsState.
Active stop is highlighted via variant='primary'. Caption shows
the current value as Ukrainian text ('1 рік' / 'N років'). 3
tests cover render label, state mutation on click."
```

---

### Task 8.4 — Wire scene 5 in `LabScene.tsx` + time-lapse motion trigger

**Files:**
- Modify: `src/labs/brownian-diffusion/scene/LabScene.tsx`

- [ ] **Step 1: Mount instruments and UI conditionally on scene 5**

In `LabScene.tsx` add:

```tsx
import { SolidBlocks } from '../instruments/SolidBlocks'
import { TimeLapseSlider } from '../ui/TimeLapseSlider'

const SOLID_BLOCKS_WORLD: [number, number, number] = [-0.40, 0.86, 0]
```

Inside `<Physics>`:

```tsx
{idx === 4 && <SolidBlocks position={SOLID_BLOCKS_WORLD} />}
```

Outside Canvas (with the other UI):

```tsx
{idx === 4 && (
  <div style={{ position: 'fixed', bottom: 80, right: 16, zIndex: 10 }}>
    <TimeLapseSlider />
  </div>
)}
```

- [ ] **Step 2: Empty the particles ref on entry to scene 5**

```tsx
// in the idx-change useEffect:
if (idx === 4) {
  particlesRef.current = []   // scene 5 has no kinetic particles
}
```

- [ ] **Step 3: Wire `time-lapse-reached` motion trigger**

In `onTick`:

```tsx
const timeLapseFiredRef = useRef(false)

// in onTick:
if (idx === 4 && !timeLapseFiredRef.current) {
  const y = useLabSettings.getState().timeLapseYears
  if (y >= 100) {
    timeLapseFiredRef.current = true
    advanceStep('time-lapse-reached')
  }
}
```

And reset on scene change:

```tsx
useEffect(() => {
  if (idx === 4) timeLapseFiredRef.current = false
}, [idx])
```

- [ ] **Step 4: Compile + manual smoke**

```bash
npx tsc --noEmit
npm run dev
```

Scene 5:
- ✓ Two stacked blocks (gold + lead) visible on the left of the table.
- ✓ Slider visible bottom-right with 4 stops.
- ✓ Pressing «1 рік» / «10 років» — boundary blurs slightly.
- ✓ Pressing «100 років» — boundary visibly blurred.
- ✓ Motion trigger fires; MC question appears.

- [ ] **Step 5: Full gate**

```bash
npx tsc --noEmit
npm test -- --run
npm run build
```

Expected: 268 passing (260 + 5 lattice + 3 slider).

- [ ] **Step 6: Commit**

```bash
git add src/labs/brownian-diffusion/scene/LabScene.tsx
git commit -m "feat(brownian-diffusion): scene 5 wiring — solid blocks + slider

Empty kinetic particles on scene-5 entry (no engine here). Mount
SolidBlocks + TimeLapseSlider. time-lapse-reached motion trigger
fires when user reaches ≥100 years. Scene 5 fully playable."
```

---

## Slice 9 — Scene 6 (Temperature)

### Task 9.1 — `ui/TemperatureButton.tsx` (cycle-pill)

**Files:**
- Create: `src/labs/brownian-diffusion/ui/TemperatureButton.tsx`
- Create: `src/labs/brownian-diffusion/ui/__tests__/TemperatureButton.test.tsx`

**Pattern source:** `src/labs/electromagnetic-induction/ui/MagnetStrengthButton.tsx`. Read first; mirror the cycle-pill structure exactly.

- [ ] **Step 1: Write the failing test**

Create `src/labs/brownian-diffusion/ui/__tests__/TemperatureButton.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { TemperatureButton } from '../TemperatureButton'
import { useLabSettings } from '../../state/LabSettingsState'

describe('TemperatureButton', () => {
  beforeEach(() => {
    useLabSettings.setState({ temperatureLevel: 'normal' })
  })

  it('renders the current level label in Ukrainian', () => {
    const { container } = render(<TemperatureButton />)
    expect(container.textContent).toContain('Норма')
  })

  it('clicking cycles to next level', () => {
    const { getByRole } = render(<TemperatureButton />)
    fireEvent.click(getByRole('button'))
    expect(useLabSettings.getState().temperatureLevel).toBe('warm')
  })

  it('cycles around: hot → cold', () => {
    useLabSettings.setState({ temperatureLevel: 'hot' })
    const { getByRole } = render(<TemperatureButton />)
    fireEvent.click(getByRole('button'))
    expect(useLabSettings.getState().temperatureLevel).toBe('cold')
  })
})
```

- [ ] **Step 2: Run failing**

```bash
npx vitest run src/labs/brownian-diffusion/ui/__tests__/TemperatureButton.test.tsx
```

Expected: 3 failures.

- [ ] **Step 3: Implement**

Create `src/labs/brownian-diffusion/ui/TemperatureButton.tsx`:

```tsx
import { Button } from '../../../sdk/ui/Button'
import { useLabSettings, TemperatureLevel } from '../state/LabSettingsState'

const LABEL: Record<TemperatureLevel, string> = {
  cold:   '❄ Холодно',
  normal: 'Норма',
  warm:   '☀ Тепло',
  hot:    '🔥 Гаряче',
}

export function TemperatureButton() {
  const level = useLabSettings(s => s.temperatureLevel)
  const cycle = useLabSettings(s => s.cycleTemperature)
  return (
    <Button
      variant={level === 'normal' ? 'secondary' : 'primary'}
      onClick={() => cycle()}
      aria-label={`Температура: ${LABEL[level]}`}
      title={`Температура · ${LABEL[level]}`}
    >
      {LABEL[level]}
    </Button>
  )
}
```

- [ ] **Step 4: Run tests — pass**

```bash
npx vitest run src/labs/brownian-diffusion/ui/__tests__/TemperatureButton.test.tsx
```

Expected: ✓ 3/3.

- [ ] **Step 5: Commit**

```bash
git add src/labs/brownian-diffusion/ui/TemperatureButton.tsx \
        src/labs/brownian-diffusion/ui/__tests__/TemperatureButton.test.tsx
git commit -m "feat(brownian-diffusion): TemperatureButton (cycle-pill)

Mirrors MagnetStrengthButton from EM-induction. Single tap cycles
cold → normal → warm → hot → cold. Labels in Ukrainian with small
emoji glyphs. 3 tests cover label rendering and cycle wrap."
```

---

### Task 9.2 — T-scaling in `LabScene.tsx` (velocityMultiplier wiring)

**Files:**
- Modify: `src/labs/brownian-diffusion/scene/LabScene.tsx`

The `SceneController` already accepts `velocityMultiplier` (from Slice 5 Task 5.4). Wire it to read from `LabSettingsState.temperatureLevel`.

- [ ] **Step 1: Add the helper + import**

In `LabScene.tsx`:

```tsx
import { useLabSettings, TemperatureLevel } from '../state/LabSettingsState'

const T_VELOCITY_SCALE: Record<TemperatureLevel, number> = {
  cold:   0.5,
  normal: 1.0,
  warm:   1.5,
  hot:    2.5,
}
```

- [ ] **Step 2: Read temperature and pass `velocityMultiplier`**

```tsx
const temperatureLevel = useLabSettings(s => s.temperatureLevel)
const velocityMultiplier = idx === 5 ? T_VELOCITY_SCALE[temperatureLevel] : 1.0

// SceneController:
<SceneController
  particles={particlesRef}
  walls={currentWalls}
  getDivider={getDivider}
  onTick={onTick}
  liquidDrag={liquidDrag}
  velocityMultiplier={velocityMultiplier}
/>
```

The `SceneController`'s `carry` ref (added in Task 5.4) handles the ratio math correctly so changing levels mid-scene doesn't reset velocities — it scales the in-flight velocities by the new/old ratio.

- [ ] **Step 3: Mount the TemperatureButton on scene 6**

```tsx
import { TemperatureButton } from '../ui/TemperatureButton'
// ...
{idx === 5 && (
  <div style={{ position: 'fixed', bottom: 80, right: 16, zIndex: 10 }}>
    <TemperatureButton />
  </div>
)}
```

- [ ] **Step 4: Compile + smoke**

```bash
npx tsc --noEmit
npm run dev
```

Scene 6:
- ✓ Particles bouncing at normal speed.
- ✓ Press temperature pill — speed visibly changes.
- ✓ At "Гаряче" particles fly very fast.

- [ ] **Step 5: Commit**

```bash
git add src/labs/brownian-diffusion/scene/LabScene.tsx
git commit -m "feat(brownian-diffusion): T-scaling on scene 6

velocityMultiplier feeds SceneController; T_VELOCITY_SCALE maps
each temperature level to a factor (cold 0.5, normal 1, warm 1.5,
hot 2.5). SceneController.carry ref handles smooth in-flight
scaling so changing T mid-scene doesn't reset velocities."
```

---

### Task 9.3 — Scene 6 motion trigger + final reveal verify

**Files:**
- Modify: `src/labs/brownian-diffusion/scene/LabScene.tsx`

- [ ] **Step 1: Fire `temp-reached-hot` when user reaches Гаряче**

In `onTick`:

```tsx
const tempReachedHotRef = useRef(false)

// in onTick:
if (idx === 5 && !tempReachedHotRef.current) {
  if (temperatureLevel === 'hot') {
    tempReachedHotRef.current = true
    advanceStep('temp-reached-hot')
  }
}

// And reset on scene-change:
useEffect(() => {
  if (idx === 5) tempReachedHotRef.current = false
}, [idx])
```

> **Implementer note:** because `temperatureLevel` is read at render time but `onTick` is called inside `useFrame`, you may need to read it via `useLabSettings.getState().temperatureLevel` inside the callback closure instead — to avoid stale-closure bugs. Use whichever pattern matches EM's SceneController.

- [ ] **Step 2: Manual smoke — full lab end-to-end**

```bash
npm run dev
```

Run through ALL 6 scenes:
- ✓ Scene 1: intro → MC «Чи завжди рухаються молекули?»
- ✓ Scene 2: pollen drag → 4s observe → toggle molecules → MC «Чому стрибає?»
- ✓ Scene 3: divider drag → mixing → MC «Що буде через час?»
- ✓ Scene 4: dropper drop → ink spreads → MC «Де швидше?»
- ✓ Scene 5: time-lapse 100+ → MC «Скільки часу йде?»
- ✓ Scene 6: T to «Гаряче» → MC «Коли швидше?»
- ✓ `RevealScene` appears with all 6 journal entries showing correct sceneTitle + chosen answer.
- ✓ «Спробувати знову» → reset → intro.
- ✓ «На головну» → returns to `/`.

- [ ] **Step 3: Full gate**

```bash
npx tsc --noEmit
npm test -- --run
npm run build
```

Expected: 271 passing (268 + 3 TemperatureButton).

- [ ] **Step 4: Commit**

```bash
git add src/labs/brownian-diffusion/scene/LabScene.tsx
git commit -m "feat(brownian-diffusion): scene 6 motion trigger + full lab works

temp-reached-hot fires on first transition to 'hot' temperature.
End-to-end smoke verified: all 6 scenes playable, reveal screen
shows 6 journal entries with correct titles + chosen answers."
```

---

## Slice 10 — Polish: camera presets, mobile sheet, final gates

### Task 10.1 — Per-scene camera presets

**Files:**
- Modify: `src/sdk/scene/CameraRig.tsx` — extend `CameraPreset` union if it doesn't have the needed names
- Modify: `src/labs/brownian-diffusion/scene/LabScene.tsx`

- [ ] **Step 1: Read the SDK CameraRig**

```bash
cat src/sdk/scene/CameraRig.tsx | head -80
```

Note the current `CameraPreset` union. EM uses `'overview' | 'focus-coil'`. We need:
- `'overview'` (exists)
- `'focus-box'` (NEW)
- `'focus-beaker'` (NEW)
- `'focus-solids'` (NEW)

- [ ] **Step 2: Extend `CameraPreset` and add the new preset transforms**

In `src/sdk/scene/CameraRig.tsx`:

```ts
export type CameraPreset = 'overview' | 'focus-coil' | 'focus-box' | 'focus-beaker' | 'focus-solids'
```

In the preset → position/lookAt map (mirror the EM 'focus-coil' entry):

```ts
const PRESETS: Record<CameraPreset, { position: [number, number, number]; lookAt: [number, number, number] }> = {
  // ... existing entries
  'focus-box':     { position: [ 0,     1.40, 0.45 ], lookAt: [ 0,     0.95, 0   ] },
  'focus-beaker':  { position: [ 0.30,  1.20, 0.45 ], lookAt: [ 0.40,  0.92, 0   ] },
  'focus-solids':  { position: [-0.30,  1.25, 0.45 ], lookAt: [-0.40,  0.88, 0   ] },
}
```

> If the existing PRESETS table is structured differently (e.g. quaternion + offset rather than position + lookAt), mirror that schema.

- [ ] **Step 3: Wire per-scene preset in LabScene.tsx**

Replace the `sceneToPreset` function:

```tsx
function sceneToPreset(idx: number): CameraPreset {
  switch (idx) {
    case 0: return 'overview'      // mol theory — overview intro
    case 1: return 'focus-box'     // brownian
    case 2: return 'focus-box'     // gas
    case 3: return 'focus-beaker'  // liquid
    case 4: return 'focus-solids'  // solid
    case 5: return 'focus-box'     // temperature (back to box)
    default: return 'overview'
  }
}
```

- [ ] **Step 4: Compile + smoke each preset**

```bash
npx tsc --noEmit
npm run dev
```

Step through scenes — camera should move smoothly to each instrument as the scene changes.

- [ ] **Step 5: Commit**

```bash
git add src/sdk/scene/CameraRig.tsx \
        src/labs/brownian-diffusion/scene/LabScene.tsx
git commit -m "feat(sdk,brownian-diffusion): per-scene camera presets

SDK: extend CameraPreset union with focus-box / focus-beaker /
focus-solids. Lab: sceneToPreset returns the right preset per
currentSceneIndex. Cross-lab safe — em-induction and
mass-measurement still use the existing presets."
```

---

### Task 10.2 — Mobile bottom-sheet wiring + full HUD layout

**Files:**
- Modify: `src/labs/brownian-diffusion/scene/LabScene.tsx`

**Pattern source:** EM-induction LabScene's mobile/desktop split (the `isMobile ? sheet : row` block at the bottom of the file). Mirror.

- [ ] **Step 1: Read EM's mobile/desktop block**

```bash
grep -n "isMobile" src/labs/electromagnetic-induction/scene/LabScene.tsx
```

Find the `isMobile ? ( ... ) : ( ... )` JSX block near the end of EM's LabScene. Note: vertical stack of FocusReset/Zoom/SheetTrigger on phone, sheet with controls; inline row on desktop.

- [ ] **Step 2: Replace per-scene fixed-position UI with conditional integrated layout**

In `LabScene.tsx`:

1. Remove the temporary `<div style={{ position:'fixed', bottom: 80, right: 16, … }}>` wrappers from previous slices (Tasks 5.3, 8.4, 9.2).
2. Add the EM-style mobile/desktop layout AT the bottom of the return JSX, mirroring EM verbatim. Replace EM's `FieldToggleButton/CoilTurnsButton/MagnetStrengthButton` with this lab's conditional controls.

```tsx
import { Button } from '../../../sdk/ui/Button'
import { SoundToggle } from '../../../sdk/ui/SoundToggle'
import { ZoomControls } from '../../../sdk/ui/ZoomControls'
import { BottomSheet } from '../../../sdk/ui/BottomSheet'
import { SheetTriggerButton } from '../../../sdk/ui/SheetTriggerButton'
import { SheetSection } from '../../../sdk/ui/SheetSection'
import { safeAreaBottom } from '../../../sdk/a11y/safeArea'
// (FocusResetButton — if EM has it, mirror; if it's lab-local in EM, replicate as src/labs/brownian-diffusion/ui/FocusResetButton.tsx)
```

Bottom of the LabScene return:

```tsx
{isMobile ? (
  <>
    <div
      style={{
        position: 'fixed',
        bottom: safeAreaBottom(16),
        right: 8,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        zIndex: 10,
      }}
    >
      {/* FocusResetButton (mirror EM) */}
      <ZoomControls />
      <SheetTriggerButton onClick={() => setSheetOpen(true)} />
    </div>

    <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)}>
      {idx === 1 && (
        <SheetSection label="Показати молекули">
          <ShowMoleculesToggle />
        </SheetSection>
      )}
      {idx === 4 && (
        <SheetSection label="Час (роки)">
          <TimeLapseSlider />
        </SheetSection>
      )}
      {idx === 5 && (
        <SheetSection label="Температура">
          <TemperatureButton />
        </SheetSection>
      )}
      <SheetSection label="Звук">
        <SoundToggle />
      </SheetSection>
      <div style={{ marginTop: 8 }}>
        <Button
          variant="secondary"
          onClick={() => respawnObjects()}
          aria-label="Скинути предмети"
          title="Скинути предмети"
        >
          ↻ Скинути предмети
        </Button>
      </div>
    </BottomSheet>
  </>
) : (
  <div
    style={{
      position: 'fixed',
      bottom: safeAreaBottom(16),
      right: 16,
      display: 'flex',
      gap: 8,
      zIndex: 10,
    }}
  >
    <ZoomControls />
    <SoundToggle />
    {idx === 1 && <ShowMoleculesToggle />}
    {idx === 4 && <TimeLapseSlider />}
    {idx === 5 && <TemperatureButton />}
    {/* FocusResetButton (mirror EM) */}
    <Button
      variant="secondary"
      onClick={() => respawnObjects()}
      aria-label="Скинути предмети"
      title="Скинути предмети"
    >
      ↻ Скинути предмети
    </Button>
  </div>
)}
```

Make sure `sheetOpen`, `respawnObjects`, and `isMobile` are wired:

```tsx
const [sheetOpen, setSheetOpen] = useState(false)
const isMobile = breakpoint === 'phone' || breakpoint === 'tablet'
const respawnObjects = useLabState(s => s.respawnObjects)
```

- [ ] **Step 3: Compile + manual smoke on desktop AND mobile widths**

```bash
npx tsc --noEmit
npm run dev
```

Open the lab and verify:
- ✓ Desktop ≥900px: bottom-right inline row with ZoomControls + SoundToggle + (per-scene control) + respawn.
- ✓ Mobile <900px: floating vertical stack on the right (FocusReset/Zoom/SheetTrigger); tapping ⚙ opens the bottom-sheet with per-scene control + sound + respawn.
- ✓ Each per-scene control appears only on its scene.

Test mobile by resizing browser to ~400px width, OR opening DevTools mobile emulation (iPhone 12 / Pixel 6).

- [ ] **Step 4: Commit**

```bash
git add src/labs/brownian-diffusion/scene/LabScene.tsx
git commit -m "feat(brownian-diffusion): mobile bottom-sheet + desktop row

Mirrors EM-induction pattern: isMobile sheet vs desktop inline
row. Per-scene controls (ShowMoleculesToggle / TimeLapseSlider /
TemperatureButton) appear inside the sheet/row only when their
scene is active. Reset-objects button always available."
```

---

### Task 10.3 — Full smoke test + final gates + final commit

- [ ] **Step 1: Run the complete verification gate**

```bash
npx tsc --noEmit
npm test -- --run
npm run build
```

Expected:
- tsc → 0 errors
- tests → 271 passing (or as close as the implementation produces — adjust if any tests were combined/split)
- build → green

If the test count is significantly off (more than ±3), audit which tests are missing.

- [ ] **Step 2: Run the smoke-test checklist from spec §15**

```bash
npm run dev
```

Walk through every item in `docs/superpowers/specs/2026-05-26-brownian-diffusion-lab-design.md` §15. Tick each item as you verify:

- [ ] Landing → physics → «Броунівський рух та дифузія» appears and loads.
- [ ] Intro → «Почати» → scene 1 with ~60 multicoloured particles bouncing.
- [ ] Scene 1 MC «Чи завжди рухаються молекули?» advances to scene 2.
- [ ] Scene 2: drag pollen from tray into box; pollen jiggles WITHOUT molecules visible.
- [ ] «Показати причину» → molecules appear; pollen-observed advances.
- [ ] Scene 2 MC «Чому стрибає?» advances to scene 3.
- [ ] Scene 3: divider in middle, particles segregated.
- [ ] Drag handle up → particles mix → gases-mixed advances.
- [ ] Scene 3 MC «Що буде через час?» advances to scene 4.
- [ ] Scene 4: beaker with water; pipette draggable; drop above beaker spawns ink.
- [ ] Ink spreads slowly (liquid drag).
- [ ] Scene 4 MC «Де швидше?» advances to scene 5.
- [ ] Scene 5: gold+lead blocks visible. Press button. Time-lapse slider 1→10→100→1000.
- [ ] At 100+ years, atoms visibly migrate; time-lapse-reached advances.
- [ ] Scene 5 MC «Скільки часу йде?» advances to scene 6.
- [ ] Scene 6: box returns with mixed particles. T cycle-pill cold → … → hot.
- [ ] At Гаряче, particles fly fast; temp-reached-hot advances.
- [ ] Scene 6 MC «Коли швидше?» triggers `RevealScene`.
- [ ] RevealScene shows 6 journal entries with Ukrainian scene titles.
- [ ] «Спробувати знову» → intro again.
- [ ] «На головну» → `/`.
- [ ] Mobile resize → bottom-sheet works; pinch-zoom works in canvas.
- [ ] DevTools throttle ×4 mobile profile → scene 3 stays ≥45 fps.
- [ ] WebGL disabled (DevTools → Override → disable WebGL) → `<WebGLUnsupported>` instead of crash.

- [ ] **Step 3: Final commit (only needed if anything was tweaked during smoke)**

```bash
git status
# If there are uncommitted tweaks from smoke fixes:
git add <files>
git commit -m "fix(brownian-diffusion): smoke-test corrections

<list of tweaks>"
```

- [ ] **Step 4: Tag the branch as ready for review/merge**

```bash
git log --oneline master..HEAD
```

Verify the commit graph is clean (one commit per task, sensible messages, no `@`-prefix artifacts or amend mishaps).

```bash
git status -sb
```

Expected: `## feat/brownian-diffusion-lab` and no unstaged changes.

- [ ] **Step 5: Hand off to `superpowers:finishing-a-development-branch`**

Invoke `superpowers:finishing-a-development-branch` to decide how to integrate (direct merge to master per existing repo pattern, or PR — user's call). This is the terminal state of the subagent-driven-development flow.

---

## Done Definition (mirrors Spec §17)

This implementation is complete when:

- All ~32 new tests pass; total project test count ≈ 271 (some variance acceptable if individual tests were split/combined).
- `npx tsc --noEmit` → 0 errors.
- `npm run build` → green.
- Smoke-test checklist (Task 10.3 Step 2) passes end-to-end on desktop + one mobile device.
- Lab appears in `/physics` listing with the right subtitle, opens at `/physics/brownian-diffusion`.
- All 10 slices' final commits land on `feat/brownian-diffusion-lab`.
- A final code review pass per `superpowers:requesting-code-review` is run.

---

## Risks & Mitigations (mirrors Spec §16, with task pointers)

| Risk | Spec ref | Plan task that addresses it |
|---|---|---|
| Mobile particle perf | §16.1 | **Task 2.3** (PERF GATE before any scenes are built) |
| Solid-state visual fidelity | §16.2 | **Task 8.1** (hand-tuned snapshots; iterated in Task 8.4 smoke) |
| Divider drag handle on phone | §16.3 | **Task 6.2** (generous hit-radius via cylindrical handle protruding above box) |
| Brownian invisible-by-default leap of faith | §16.4 | **Task 5.3** + Task 4.1 scene-2 step copy («натисни ‹показати причину›…») |
| 6-scene length | §16.5 | **Task 4.1** step copy kept tight; each scene 60–90s |

---

## Appendix A — Useful greps for the implementer

```bash
# Find the route registration site
grep -rn "em-induction" src/

# Find the Step type and choices schema
grep -rn "export type Step" src/sdk/

# Find the guided-flow advance API
grep -rn "advanceStep\|useTaskState" src/sdk/

# Find Draggable's prop signature
cat src/sdk/object/Draggable.tsx | head -60

# Find EM's HUD (the pattern to mirror)
cat src/labs/electromagnetic-induction/ui/HUD.tsx
```

## Appendix B — File checklist

After all 10 slices, these files must exist (besides modifications to `subjects.ts`, the router file, and `sdk/scene/CameraRig.tsx`):

```
src/labs/brownian-diffusion/
├── index.tsx
├── content/
│   ├── scenes.ts
│   └── __tests__/scenes.test.ts
├── instruments/
│   ├── GlassBox.tsx
│   ├── Beaker.tsx
│   ├── SolidBlocks.tsx
│   ├── Divider.tsx
│   ├── PollenParticle.tsx
│   ├── PollenTrail.tsx
│   └── InkDropper.tsx
├── physics/
│   ├── particles.ts
│   ├── kinetics.ts
│   ├── divider.ts
│   ├── lattice.ts
│   ├── spawnInk.ts
│   └── __tests__/
│       ├── kinetics.test.ts
│       ├── divider.test.ts
│       └── lattice.test.ts
├── scene/
│   ├── LabScene.tsx
│   ├── SceneController.tsx
│   ├── ParticleField.tsx
│   ├── BenchmarkScene.tsx
│   └── __tests__/
│       ├── instanceMatrix.test.ts
│       └── sceneTriggers.test.ts
├── state/
│   ├── LabState.ts
│   ├── LabSettingsState.ts
│   └── __tests__/
│       ├── LabState.test.ts
│       └── LabSettingsState.test.ts
└── ui/
    ├── IntroScreen.tsx
    ├── RevealScene.tsx
    ├── HUD.tsx
    ├── TemperatureButton.tsx
    ├── ShowMoleculesToggle.tsx
    ├── TimeLapseSlider.tsx
    └── __tests__/
        ├── TemperatureButton.test.tsx
        ├── ShowMoleculesToggle.test.tsx
        └── TimeLapseSlider.test.tsx
```

**End of plan.**

