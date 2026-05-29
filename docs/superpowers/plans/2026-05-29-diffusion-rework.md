# Diffusion Lab Rework — "One Living Box" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the brownian-diffusion lab into a single stateful glass box driven by a control panel (no 3D drag), with a live mixedness meter, a 7-mission arc gated by an explicit «Далі →» (no silent auto-advance), and a free-play finale.

**Architecture:** Reuse the entire physics engine (`kinetics`, `divider`, `lattice`, `spawnInk`, `ParticleField`, `SceneController`) and the SDK guided flow (`StepEngine`, HUD primitives) unchanged. Change only interaction + presentation: extend the two Zustand stores, add a pure `mixedness()` selector, rewrite `content/scenes.ts` into the mission arc, add `ControlPanel`/`MixednessMeter`/`LatticeField`, rewrite `LabScene` to mount one box whose contents swap by `materialState`, and gate the HUD «Далі» on a `goalReached` flag.

**Tech Stack:** React 19, @react-three/fiber, @react-three/rapier, Zustand, Vitest + @testing-library/react, TypeScript (strict, noUnusedLocals).

Spec: `docs/superpowers/specs/2026-05-29-diffusion-rework-design.md`.

---

## Pre-flight

- [ ] **P1: Create the feature branch**

```bash
git checkout master && git pull --ff-only
git checkout -b feat/diffusion-rework
```

- [ ] **P2: Confirm the baseline is green** (record the number — it must not drop)

```bash
npx vitest run
npx tsc --noEmit
```
Expected: all tests PASS, tsc 0 errors.

---

## Conventions used below

- Test runner: `npx vitest run <path>` (targeted) / `npx vitest run` (full).
- Type check: `npx tsc --noEmit`. Build: `npm run build`.
- "Місія" is UI copy; the code symbol stays `SCENES` (avoids renaming imports in `LabState`/`HUD`/`LabScene`).
- All lab paths are under `src/labs/brownian-diffusion/`.

---

## Slice 1 — Settings & state foundation (pure logic, fully unit-tested)

### Task 1: Extend `LabSettingsState`

**Files:**
- Modify: `src/labs/brownian-diffusion/state/LabSettingsState.ts`
- Test: `src/labs/brownian-diffusion/state/__tests__/LabSettingsState.rework.test.ts` (create)

- [ ] **Step 1: Write the failing test**

```ts
// LabSettingsState.rework.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useLabSettings } from '../LabSettingsState'

describe('LabSettingsState rework fields', () => {
  beforeEach(() => {
    useLabSettings.setState({
      materialState: 'gas', dividerRaised: false, redCount: 20, blueCount: 20,
      tracerActive: false, temperatureLevel: 'normal',
    })
  })

  it('defaults: gas, divider down, 20/20, no tracer', () => {
    const s = useLabSettings.getState()
    expect(s.materialState).toBe('gas')
    expect(s.dividerRaised).toBe(false)
    expect(s.redCount).toBe(20)
    expect(s.tracerActive).toBe(false)
  })

  it('setMaterialState / setDividerRaised / setTemperature mutate', () => {
    const s = useLabSettings.getState()
    s.setMaterialState('liquid'); expect(useLabSettings.getState().materialState).toBe('liquid')
    s.setDividerRaised(true);     expect(useLabSettings.getState().dividerRaised).toBe(true)
    s.setTemperature('hot');      expect(useLabSettings.getState().temperatureLevel).toBe('hot')
  })

  it('setRedCount/setBlueCount clamp to [5,40]', () => {
    const s = useLabSettings.getState()
    s.setRedCount(99); expect(useLabSettings.getState().redCount).toBe(40)
    s.setBlueCount(0); expect(useLabSettings.getState().blueCount).toBe(5)
  })

  it('addTracer sets tracerActive true; setTracerActive(false) resets', () => {
    const s = useLabSettings.getState()
    s.addTracer();            expect(useLabSettings.getState().tracerActive).toBe(true)
    s.setTracerActive(false); expect(useLabSettings.getState().tracerActive).toBe(false)
  })
})
```

- [ ] **Step 2: Run it — expect FAIL** (`materialState` etc. don't exist)

```bash
npx vitest run src/labs/brownian-diffusion/state/__tests__/LabSettingsState.rework.test.ts
```

- [ ] **Step 3: Implement.** Replace the contents of `LabSettingsState.ts` with:

```ts
import { create } from 'zustand'

export type TemperatureLevel = 'cold' | 'normal' | 'warm' | 'hot'
export type TimeLapseYears = 1 | 10 | 100 | 1000
export type MaterialState = 'gas' | 'liquid' | 'solid'

export const TIME_LAPSE_VALUES: TimeLapseYears[] = [1, 10, 100, 1000]
const TEMP_CYCLE: TemperatureLevel[] = ['cold', 'normal', 'warm', 'hot']
const clampCount = (n: number) => Math.max(5, Math.min(40, Math.round(n)))

type Settings = {
  temperatureLevel: TemperatureLevel
  showMolecules: boolean
  timeLapseYears: TimeLapseYears
  maxParticles: number
  materialState: MaterialState
  dividerRaised: boolean
  redCount: number
  blueCount: number
  tracerActive: boolean

  cycleTemperature: () => void
  toggleMolecules: () => void
  setMolecules: (b: boolean) => void
  setTimeLapse: (y: TimeLapseYears) => void
  setTemperature: (level: TemperatureLevel) => void
  setMaterialState: (s: MaterialState) => void
  setDividerRaised: (b: boolean) => void
  setRedCount: (n: number) => void
  setBlueCount: (n: number) => void
  addTracer: () => void
  setTracerActive: (b: boolean) => void
}

export const useLabSettings = create<Settings>((set, get) => ({
  temperatureLevel: 'normal',
  showMolecules: true,
  timeLapseYears: 1,
  maxParticles: 150,
  materialState: 'gas',
  dividerRaised: false,
  redCount: 20,
  blueCount: 20,
  tracerActive: false,

  cycleTemperature: () => {
    const i = TEMP_CYCLE.indexOf(get().temperatureLevel)
    set({ temperatureLevel: TEMP_CYCLE[(i + 1) % TEMP_CYCLE.length] })
  },
  toggleMolecules: () => set(s => ({ showMolecules: !s.showMolecules })),
  setMolecules: (b) => set({ showMolecules: b }),
  setTimeLapse: (y) => { if (TIME_LAPSE_VALUES.includes(y)) set({ timeLapseYears: y }) },
  setTemperature: (level) => set({ temperatureLevel: level }),
  setMaterialState: (s) => set({ materialState: s }),
  setDividerRaised: (b) => set({ dividerRaised: b }),
  setRedCount: (n) => set({ redCount: clampCount(n) }),
  setBlueCount: (n) => set({ blueCount: clampCount(n) }),
  addTracer: () => set({ tracerActive: true }),
  setTracerActive: (b) => set({ tracerActive: b }),
}))
```

Note: `showMolecules` default is now `true` (gas molecules visible by default); mission 1 will set it `false` for the Brownian reveal. `setMolecules` is added so the panel can set it explicitly.

- [ ] **Step 4: Run it — expect PASS**

```bash
npx vitest run src/labs/brownian-diffusion/state/__tests__/LabSettingsState.rework.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/labs/brownian-diffusion/state/LabSettingsState.ts src/labs/brownian-diffusion/state/__tests__/LabSettingsState.rework.test.ts
git commit -m "feat(diffusion): extend LabSettingsState (materialState, divider, counts, tracer)"
```

---

### Task 2: Add `goalReached` + `mixedness` to `LabState`

**Files:**
- Modify: `src/labs/brownian-diffusion/state/LabState.ts`
- Test: `src/labs/brownian-diffusion/state/__tests__/LabState.rework.test.ts` (create)

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useLabState } from '../LabState'

describe('LabState rework fields', () => {
  beforeEach(() => useLabState.getState().reset())

  it('goalReached defaults false and is settable', () => {
    expect(useLabState.getState().goalReached).toBe(false)
    useLabState.getState().setGoalReached(true)
    expect(useLabState.getState().goalReached).toBe(true)
  })

  it('mixedness defaults 0 and is settable', () => {
    expect(useLabState.getState().mixedness).toBe(0)
    useLabState.getState().setMixedness(0.42)
    expect(useLabState.getState().mixedness).toBeCloseTo(0.42)
  })

  it('advanceScene clears goalReached', () => {
    useLabState.getState().setGoalReached(true)
    useLabState.getState().advanceScene()
    expect(useLabState.getState().goalReached).toBe(false)
  })
})
```

- [ ] **Step 2: Run it — expect FAIL**

```bash
npx vitest run src/labs/brownian-diffusion/state/__tests__/LabState.rework.test.ts
```

- [ ] **Step 3: Implement.** In `LabState.ts`: add the two fields to the `LabState` type and store, and clear `goalReached` in `advanceScene` and `reset`.

Add to the `type LabState`:
```ts
  goalReached: boolean
  mixedness: number
  setGoalReached: (b: boolean) => void
  setMixedness: (v: number) => void
```

Add to the store initial state (next to `journal: []`):
```ts
  goalReached: false,
  mixedness: 0,
```

Add the two setters (next to `respawnObjects`):
```ts
  setGoalReached: (b) => set({ goalReached: b }),
  setMixedness: (v) => set({ mixedness: v }),
```

Change `advanceScene` to also clear the flag:
```ts
  advanceScene: () => {
    const { currentSceneIndex } = get()
    const next = currentSceneIndex + 1
    set({
      currentSceneIndex: next,
      phase: next >= TOTAL_SCENES ? 'finished' : 'in-progress',
      goalReached: false,
    })
  },
```

Change `reset` to include `goalReached: false, mixedness: 0`:
```ts
  reset: () => set(s => ({
    phase: 'intro',
    currentSceneIndex: 0,
    journal: [],
    sessionId: s.sessionId + 1,
    goalReached: false,
    mixedness: 0,
  })),
```

- [ ] **Step 4: Run it — expect PASS**

```bash
npx vitest run src/labs/brownian-diffusion/state/__tests__/LabState.rework.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/labs/brownian-diffusion/state/LabState.ts src/labs/brownian-diffusion/state/__tests__/LabState.rework.test.ts
git commit -m "feat(diffusion): add goalReached + mixedness to LabState"
```

---

## Slice 2 — Mixedness selector (pure logic)

### Task 3: `physics/mixedness.ts`

**Files:**
- Create: `src/labs/brownian-diffusion/physics/mixedness.ts`
- Test: `src/labs/brownian-diffusion/physics/__tests__/mixedness.test.ts` (create)

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { liquidMixed, latticeMixed, mixedness } from '../mixedness'
import type { Particle } from '../particles'

const ink = (y: number): Particle => ({ kind: 'ink', pos: { x: 0, y, z: 0 }, vel: { x: 0, y: 0, z: 0 }, mass: 1, radius: 0.004 })

describe('mixedness selectors', () => {
  it('liquidMixed: 0 with no ink, 0.5 when half the ink has risen', () => {
    expect(liquidMixed([])).toBe(0)
    expect(liquidMixed([ink(0.02), ink(0.02), ink(-0.09), ink(-0.09)])).toBeCloseTo(0.5)
  })

  it('latticeMixed: 0 at year 0, > 0 by year 1000', () => {
    expect(latticeMixed(0)).toBe(0)
    expect(latticeMixed(1000)).toBeGreaterThan(0)
  })

  it('mixedness dispatches by state', () => {
    expect(mixedness('liquid', [ink(0.02), ink(-0.09)], 1)).toBeCloseTo(0.5)
    expect(mixedness('solid', [], 1000)).toBeGreaterThan(0)
    expect(mixedness('gas', [], 1)).toBe(0) // no red/blue → fractionMixed 0
  })
})
```

- [ ] **Step 2: Run it — expect FAIL**

```bash
npx vitest run src/labs/brownian-diffusion/physics/__tests__/mixedness.test.ts
```

- [ ] **Step 3: Implement** `physics/mixedness.ts`:

```ts
import type { Particle } from './particles'
import { fractionMixed } from './divider'
import { interpolateLattice } from './lattice'

/** Liquid: fraction of ink particles that have risen above the lower quarter (y > -0.05). */
export function liquidMixed(particles: Particle[]): number {
  const ink = particles.filter(p => p.kind === 'ink')
  if (ink.length === 0) return 0
  return ink.filter(p => p.pos.y > -0.05).length / ink.length
}

/** Solid: fraction of interpolated lattice atoms that have crossed to the wrong half. */
export function latticeMixed(years: number): number {
  const { atoms } = interpolateLattice(years)
  if (atoms.length === 0) return 0
  const crossed = atoms.filter(a =>
    (a.kind === 'gold' && a.pos.y < 0) || (a.kind === 'lead' && a.pos.y > 0),
  ).length
  return crossed / atoms.length
}

/** Dispatch the 0..1 mixedness for the current material state. */
export function mixedness(
  state: 'gas' | 'liquid' | 'solid',
  particles: Particle[],
  years: number,
): number {
  switch (state) {
    case 'gas':    return fractionMixed(particles)
    case 'liquid': return liquidMixed(particles)
    case 'solid':  return latticeMixed(years)
  }
}
```

- [ ] **Step 4: Run it — expect PASS**

```bash
npx vitest run src/labs/brownian-diffusion/physics/__tests__/mixedness.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/labs/brownian-diffusion/physics/mixedness.ts src/labs/brownian-diffusion/physics/__tests__/mixedness.test.ts
git commit -m "feat(diffusion): mixedness selector (gas/liquid/solid)"
```

---

## Slice 3 — Mission content

### Task 4: Rewrite `content/scenes.ts` into the 7-mission arc

**Files:**
- Modify (rewrite in place): `src/labs/brownian-diffusion/content/scenes.ts`
- Test: `src/labs/brownian-diffusion/content/__tests__/scenes.rework.test.ts` (create)

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { SCENES } from '../scenes'

describe('mission arc', () => {
  it('has 7 missions (6 concepts + free play)', () => {
    expect(SCENES).toHaveLength(7)
  })

  it('contains no dragging completion rules (drag is removed)', () => {
    for (const m of SCENES)
      for (const s of m.steps)
        expect(s.complete.kind).not.toBe('dragging')
  })

  it('every goal step (motionTrigger) is a submitted step', () => {
    for (const m of SCENES)
      for (const s of m.steps)
        if (s.motionTrigger) expect(s.complete.kind).toBe('submitted')
  })

  it('every mc step has correctIndex 0 and 3 choices', () => {
    const mc = SCENES.flatMap(m => m.steps).filter(s => s.complete.kind === 'mc-selected')
    expect(mc.length).toBeGreaterThanOrEqual(6)
    for (const s of mc) {
      expect(s.choices).toHaveLength(3)
      expect(s.complete).toMatchObject({ kind: 'mc-selected', correctIndex: 0 })
    }
  })
})
```

- [ ] **Step 2: Run it — expect FAIL**

```bash
npx vitest run src/labs/brownian-diffusion/content/__tests__/scenes.rework.test.ts
```

- [ ] **Step 3: Implement.** Replace the contents of `content/scenes.ts` with:

```ts
import type { Step } from '../../../sdk/guided/TaskSteps'

/**
 * Mission goals unique to this lab. LabScene.onTick watches lab + settings
 * state and calls setGoalReached(true) when the current goal step's trigger
 * is met. The SDK predicate engine sees `complete: 'submitted'`; the HUD
 * enables «Далі →» only once goalReached is true (no silent auto-advance).
 */
export type BdMotionTrigger =
  | 'molecules-shown'
  | 'tracer-jiggled'
  | 'gas-mixed'
  | 'liquid-mixed'
  | 'timelapse-reached'
  | 'temp-hot'

export type BdStep = Step & { motionTrigger?: BdMotionTrigger }
export type BdScene = { title: string; steps: BdStep[] }

export const SCENES: BdScene[] = [
  // 1 — Молекули не сплять
  {
    title: 'Молекули не сплять',
    steps: [
      {
        id: 'intro-ack',
        target: { kind: 'ui', id: 'submit' },
        visualHint: 'highlight',
        hintTitle: 'Зазирни в речовину',
        hintExplanation:
          'Уся матерія складається з крихітних частинок, що ніколи не зупиняються. ' +
          'Зараз ти бачиш збільшений шматочок газу. Покрути модель, познайомся.',
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

  // 2 — Броунівський рух
  {
    title: 'Броунівський рух',
    steps: [
      {
        id: 'add-tracer',
        target: { kind: 'ui', id: 'submit' },
        visualHint: 'highlight',
        hintTitle: 'Додай тестову частинку',
        hintExplanation:
          'Натисни «＋ Тестова частинка». Велика пилинка застрибає — її штовхають ' +
          'невидимі молекули. Увімкни «Показати молекули», щоб переконатись.',
        complete: { kind: 'submitted' },
        motionTrigger: 'tracer-jiggled',
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

  // 3 — Дифузія в газі
  {
    title: 'Дифузія в газі',
    steps: [
      {
        id: 'raise-divider',
        target: { kind: 'ui', id: 'submit' },
        visualHint: 'highlight',
        hintTitle: 'Підніми перегородку і доведи до повного змішування',
        hintExplanation:
          'Тумблер «Перегородка» прибере стінку. Стеж за шкалою «Перемішаність» — ' +
          'доведи її до 100%.',
        complete: { kind: 'submitted' },
        motionTrigger: 'gas-mixed',
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

  // 4 — Дифузія в рідині
  {
    title: 'Дифузія в рідині',
    steps: [
      {
        id: 'drop-ink',
        target: { kind: 'ui', id: 'submit' },
        visualHint: 'highlight',
        hintTitle: 'Капни чорнило і поспостерігай',
        hintExplanation:
          'Колба вже з водою. Натисни «＋ Тестова частинка» — крапля чорнила повільно ' +
          'розходиться. У рідині дифузія повільніша, ніж у газі.',
        complete: { kind: 'submitted' },
        motionTrigger: 'liquid-mixed',
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

  // 5 — Дифузія у твердому
  {
    title: 'Дифузія у твердому',
    steps: [
      {
        id: 'time-lapse',
        target: { kind: 'ui', id: 'submit' },
        visualHint: 'highlight',
        hintTitle: 'Перемотай час до 100+ років',
        hintExplanation:
          'Зверху золото, знизу олово. Посунь повзунок «Час» до 100 років і далі — ' +
          'атоми ледь-ледь проникають один в одного. Дифузія в твердому дуже повільна.',
        complete: { kind: 'submitted' },
        motionTrigger: 'timelapse-reached',
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

  // 6 — Температура вирішує
  {
    title: 'Температура вирішує',
    steps: [
      {
        id: 'heat-up',
        target: { kind: 'ui', id: 'submit' },
        visualHint: 'highlight',
        hintTitle: 'Зроби «Гаряче» і поспостерігай',
        hintExplanation:
          'Посунь повзунок «Температура» до «Гаряче». Молекули прискорюються, ' +
          'дифузія йде швидше.',
        complete: { kind: 'submitted' },
        motionTrigger: 'temp-hot',
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

  // 7 — Вільна пісочниця
  {
    title: 'Вільна пісочниця',
    steps: [
      {
        id: 'free-play',
        target: { kind: 'ui', id: 'submit' },
        visualHint: 'highlight',
        hintTitle: 'Грай вільно',
        hintExplanation:
          'Усі контроли відкриті — перемикай стани, грій, додавай молекули. ' +
          'Натисни «Далі →», коли закінчиш.',
        complete: { kind: 'submitted' },
      },
    ],
  },
]
```

- [ ] **Step 4: Run it — expect PASS**

```bash
npx vitest run src/labs/brownian-diffusion/content/__tests__/scenes.rework.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/labs/brownian-diffusion/content/scenes.ts src/labs/brownian-diffusion/content/__tests__/scenes.rework.test.ts
git commit -m "feat(diffusion): rewrite scenes.ts into the 7-mission arc (no drag)"
```

Note: the old `content/__tests__/*.test.ts` (if any) and `scene/__tests__/stepAdvance.test.ts` reference the old scenes and will be updated/replaced in Task 5. Expect them to be red between Task 4 and Task 5 — that is fine within this slice; the full gate is Slice 8.

---

## Slice 4 — Completion model (no silent auto-advance)

### Task 5: Simplify `stepAdvance.ts` to MC-only

**Files:**
- Modify: `src/labs/brownian-diffusion/scene/stepAdvance.ts`
- Modify: `src/labs/brownian-diffusion/scene/__tests__/stepAdvance.test.ts`

- [ ] **Step 1: Rewrite the test** (drag steps no longer exist; only MC auto-advances)

```ts
import { describe, it, expect } from 'vitest'
import { evaluateStepAdvance } from '../stepAdvance'
import { SCENES } from '../../content/scenes'

const baseEngine = {
  draggingBodyId: null as string | null,
  lastSnapTargetId: null as string | null,
  lastMCChoice: null as number | null,
  readingStableSinceMs: 0,
  inputFocused: false,
}

// SCENES[0].steps[0] = intro-ack (submitted); SCENES[0].steps[1] = mc-always-moving (correctIndex 0)
const ack = SCENES[0].steps[0]
const mc = SCENES[0].steps[1]

describe('evaluateStepAdvance (MC-only)', () => {
  it('advances an mc step on the correct choice', () => {
    const r = evaluateStepAdvance(mc, { ...baseEngine, lastMCChoice: 0 }, 1000)
    expect(r.advance).toBe(true)
    expect(r.consumeMC).toBe(true)
  })
  it('does NOT advance an mc step on a wrong choice', () => {
    expect(evaluateStepAdvance(mc, { ...baseEngine, lastMCChoice: 1 }, 1000).advance).toBe(false)
  })
  it('does NOT advance a submitted (ack) step — the HUD button handles it', () => {
    expect(evaluateStepAdvance(ack, baseEngine, 1000).advance).toBe(false)
  })
  it('does NOT advance when the step is undefined', () => {
    expect(evaluateStepAdvance(undefined, baseEngine, 1000).advance).toBe(false)
  })
})
```

- [ ] **Step 2: Run it — expect FAIL** (old impl still references drag scenes / shape)

```bash
npx vitest run src/labs/brownian-diffusion/scene/__tests__/stepAdvance.test.ts
```

- [ ] **Step 3: Implement.** Replace `stepAdvance.ts` with:

```ts
import { isStepComplete } from '../../../sdk/guided/StepEngine'
import type { BdStep } from '../content/scenes'

/** Subset of StepEngine state needed to evaluate an MC auto-advance. */
export type EngineSnapshot = {
  draggingBodyId: string | null
  lastSnapTargetId: string | null
  lastMCChoice: number | null
  readingStableSinceMs: number
  inputFocused: boolean
}

/**
 * Only `mc-selected` steps auto-advance (on the correct choice). `submitted`
 * steps — including goal steps that carry a `motionTrigger` — advance via the
 * HUD «Далі →» button, never silently. Returns `consumeMC` so the caller can
 * clear `lastMCChoice` after an MC advance.
 */
export function evaluateStepAdvance(
  step: BdStep | undefined,
  engine: EngineSnapshot,
  nowMs: number,
): { advance: boolean; consumeMC: boolean } {
  if (!step || step.complete.kind !== 'mc-selected') return { advance: false, consumeMC: false }
  const complete = isStepComplete(step.complete, {
    draggingBodyId: engine.draggingBodyId,
    lastSnapTargetId: engine.lastSnapTargetId,
    digitalScaleGrams: 0,
    dynamometerNewtons: 0,
    leverBalanceTilt: 0,
    leverLeftPanGrams: 0,
    leverRightPanGrams: 0,
    lastMCChoice: engine.lastMCChoice,
    readingStableSinceMs: engine.readingStableSinceMs,
    nowMs,
    inputFocused: engine.inputFocused,
    submittedSinceMs: 0,
  })
  return { advance: complete, consumeMC: complete }
}
```

- [ ] **Step 4: Run it — expect PASS**

```bash
npx vitest run src/labs/brownian-diffusion/scene/__tests__/stepAdvance.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/labs/brownian-diffusion/scene/stepAdvance.ts src/labs/brownian-diffusion/scene/__tests__/stepAdvance.test.ts
git commit -m "refactor(diffusion): stepAdvance is MC-only (goals advance via Далі)"
```

---

### Task 6: HUD «Далі»-gating + «Місія» copy

**Files:**
- Modify: `src/labs/brownian-diffusion/ui/HUD.tsx`

This is glue over the existing HUD; verify in the browser smoke (Slice 8). No unit test (RTL can't drive R3F goal state meaningfully here).

- [ ] **Step 1: Read `HUD.tsx`** to anchor the edits (it currently imports `useLabState`, `useStepEngine`, `SCENES`, renders the top pill, task panel with MC + a Далі button for `submitted && !choices && !motionTrigger`, and a 400 ms scene auto-advance effect).

- [ ] **Step 2: Pull `goalReached` + `setGoalReached` from the store.** Add to the `useLabState` selectors block:

```tsx
  const goalReached = useLabState(s => s.goalReached)
  const setGoalReached = useLabState(s => s.setGoalReached)
```

- [ ] **Step 3: Reset `goalReached` whenever the step or mission changes.** Add this effect near the existing `resetForTask` effect:

```tsx
  useEffect(() => {
    setGoalReached(false)
  }, [sceneIdx, stepIdx, setGoalReached])
```

- [ ] **Step 4: Replace the Далі button block.** Find:

```tsx
        {step?.complete.kind === 'submitted' && !step.choices && !step.motionTrigger && (
          <Button
            onClick={() => useStepEngine.getState().advanceStep()}
            aria-label="Далі"
          >
            Далі →
          </Button>
        )}
```

Replace with (renders for ALL submitted steps; goal steps stay disabled until `goalReached`):

```tsx
        {step?.complete.kind === 'submitted' && !step.choices && (
          <Button
            onClick={() => { useStepEngine.getState().advanceStep(); setGoalReached(false) }}
            disabled={!!step.motionTrigger && !goalReached}
            aria-label="Далі"
          >
            {step.motionTrigger && !goalReached ? 'Виконай завдання…' : 'Далі →'}
          </Button>
        )}
        {step?.complete.kind === 'submitted' && !step.choices && step.motionTrigger && goalReached && (
          <div style={{ marginTop: 8, fontSize: 13, color: '#34c759' }}>✓ Ціль досягнута</div>
        )}
```

- [ ] **Step 5: Relabel the top pill** «Сцена» → «Місія». Find `Сцена {Math.min(sceneIdx + 1, SCENES.length)} / {SCENES.length}` and replace `Сцена` with `Місія`.

- [ ] **Step 6: Keep the 400 ms scene-advance effect as-is** — it fires only AFTER the last step completes (which now requires a Далі tap or correct MC), so it is no longer "silent". No change needed.

- [ ] **Step 7: Type-check**

```bash
npx tsc --noEmit
```
Expected: 0 errors (HUD may still reference removed instruments only via LabScene, not here).

- [ ] **Step 8: Commit**

```bash
git add src/labs/brownian-diffusion/ui/HUD.tsx
git commit -m "feat(diffusion): HUD gates Далі on goalReached; Місія copy"
```

---

## Slice 5 — Control panel + mixedness meter (new UI)

### Task 7: `ui/MixednessMeter.tsx`

**Files:**
- Create: `src/labs/brownian-diffusion/ui/MixednessMeter.tsx`
- Test: `src/labs/brownian-diffusion/ui/__tests__/MixednessMeter.test.tsx` (create)

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { MixednessMeter } from '../MixednessMeter'
import { useLabState } from '../../state/LabState'

describe('MixednessMeter', () => {
  beforeEach(() => useLabState.setState({ mixedness: 0 }))

  it('renders the current mixedness as a percent', () => {
    useLabState.setState({ mixedness: 0.62 })
    const { getByTestId } = render(<MixednessMeter />)
    expect(getByTestId('mixedness-pct').textContent).toBe('62%')
  })

  it('clamps and rounds (1.0 -> 100%)', () => {
    useLabState.setState({ mixedness: 1 })
    const { getByTestId } = render(<MixednessMeter />)
    expect(getByTestId('mixedness-pct').textContent).toBe('100%')
  })
})
```

- [ ] **Step 2: Run it — expect FAIL**

```bash
npx vitest run src/labs/brownian-diffusion/ui/__tests__/MixednessMeter.test.tsx
```

- [ ] **Step 3: Implement** `ui/MixednessMeter.tsx`:

```tsx
import { useLabState } from '../state/LabState'

export function MixednessMeter() {
  const pct = Math.max(0, Math.min(100, Math.round(useLabState(s => s.mixedness) * 100)))
  return (
    <div
      aria-label="Перемішаність"
      style={{
        padding: '12px 16px', borderRadius: 14,
        background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(20px)',
        boxShadow: '0 1px 2px rgba(0,0,0,0.06), 0 8px 30px rgba(0,0,0,0.10)',
        minWidth: 240,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <span style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#86868b', fontWeight: 600 }}>
          Перемішаність
        </span>
        <span data-testid="mixedness-pct" style={{ fontSize: 20, fontWeight: 700, color: '#0071e3' }}>{pct}%</span>
      </div>
      <div style={{ height: 10, borderRadius: 999, background: 'rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#34c759,#0071e3)', transition: 'width 200ms ease' }} />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run it — expect PASS**

```bash
npx vitest run src/labs/brownian-diffusion/ui/__tests__/MixednessMeter.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add src/labs/brownian-diffusion/ui/MixednessMeter.tsx src/labs/brownian-diffusion/ui/__tests__/MixednessMeter.test.tsx
git commit -m "feat(diffusion): MixednessMeter component"
```

---

### Task 8: `ui/ControlPanel.tsx`

**Files:**
- Create: `src/labs/brownian-diffusion/ui/ControlPanel.tsx`
- Test: `src/labs/brownian-diffusion/ui/__tests__/ControlPanel.test.tsx` (create)

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { ControlPanel } from '../ControlPanel'
import { useLabSettings } from '../../state/LabSettingsState'

const reset = () => useLabSettings.setState({
  materialState: 'gas', dividerRaised: false, redCount: 20, blueCount: 20,
  tracerActive: false, temperatureLevel: 'normal', showMolecules: true, timeLapseYears: 1,
})

describe('ControlPanel', () => {
  beforeEach(reset)

  it('switches material state', () => {
    const { getByRole } = render(<ControlPanel />)
    fireEvent.click(getByRole('button', { name: 'Рідина' }))
    expect(useLabSettings.getState().materialState).toBe('liquid')
  })

  it('toggles the divider', () => {
    const { getByRole } = render(<ControlPanel />)
    fireEvent.click(getByRole('button', { name: /Перегородка/ }))
    expect(useLabSettings.getState().dividerRaised).toBe(true)
  })

  it('adds a tracer; disabled in solid', () => {
    const { getByRole, rerender } = render(<ControlPanel />)
    fireEvent.click(getByRole('button', { name: /Тестова частинка/ }))
    expect(useLabSettings.getState().tracerActive).toBe(true)
    useLabSettings.setState({ materialState: 'solid' })
    rerender(<ControlPanel />)
    expect(getByRole('button', { name: /Тестова частинка/ })).toBeDisabled()
  })

  it('steps molecule counts by 5 (clamped to 40)', () => {
    useLabSettings.setState({ redCount: 38 })
    const { getByRole } = render(<ControlPanel />)
    fireEvent.click(getByRole('button', { name: 'Більше червоних' }))
    expect(useLabSettings.getState().redCount).toBe(40)
  })

  it('shows the time slider only in solid state', () => {
    const { queryByRole, rerender } = render(<ControlPanel />)
    expect(queryByRole('button', { name: '100' })).toBeNull()
    useLabSettings.setState({ materialState: 'solid' })
    rerender(<ControlPanel />)
    expect(queryByRole('button', { name: '100' })).not.toBeNull()
  })
})
```

- [ ] **Step 2: Run it — expect FAIL**

```bash
npx vitest run src/labs/brownian-diffusion/ui/__tests__/ControlPanel.test.tsx
```

- [ ] **Step 3: Implement** `ui/ControlPanel.tsx`:

```tsx
import { useLabSettings, type MaterialState, type TemperatureLevel, type TimeLapseYears, TIME_LAPSE_VALUES } from '../state/LabSettingsState'

const STATES: { id: MaterialState; label: string }[] = [
  { id: 'gas', label: 'Газ' }, { id: 'liquid', label: 'Рідина' }, { id: 'solid', label: 'Тверде' },
]
const TEMPS: { id: TemperatureLevel; label: string }[] = [
  { id: 'cold', label: 'Холодно' }, { id: 'normal', label: 'Кімнатна' },
  { id: 'warm', label: 'Тепло' }, { id: 'hot', label: 'Гаряче' },
]

const seg = (active: boolean): React.CSSProperties => ({
  flex: 1, padding: '8px 0', border: 'none', borderRadius: 8, fontSize: 12.5, fontWeight: 600,
  cursor: 'pointer', color: active ? '#fff' : '#1d1d1f',
  background: active ? '#0071e3' : 'rgba(0,0,0,0.05)',
})
const label: React.CSSProperties = { fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#86868b', fontWeight: 600, marginBottom: 6, display: 'block' }
const ctl: React.CSSProperties = { marginBottom: 14 }

export function ControlPanel() {
  const s = useLabSettings()
  const solid = s.materialState === 'solid'

  return (
    <div style={{ padding: 16, borderRadius: 16, background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(20px)', width: 260, color: '#1d1d1f', boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }}>
      <div style={ctl}>
        <span style={label}>Стан речовини</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {STATES.map(st => (
            <button key={st.id} style={seg(s.materialState === st.id)} onClick={() => s.setMaterialState(st.id)}>{st.label}</button>
          ))}
        </div>
      </div>

      <div style={ctl}>
        <span style={label}>Температура</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {TEMPS.map(t => (
            <button key={t.id} style={seg(s.temperatureLevel === t.id)} onClick={() => s.setTemperature(t.id)}>{t.label}</button>
          ))}
        </div>
      </div>

      <div style={ctl}>
        <span style={label}>Молекули</span>
        <Stepper colour="#e64a3b" name="червоних" value={s.redCount} onMinus={() => s.setRedCount(s.redCount - 5)} onPlus={() => s.setRedCount(s.redCount + 5)} />
        <Stepper colour="#0a84ff" name="синіх" value={s.blueCount} onMinus={() => s.setBlueCount(s.blueCount - 5)} onPlus={() => s.setBlueCount(s.blueCount + 5)} />
      </div>

      <div style={ctl}>
        <button style={{ ...seg(s.dividerRaised), width: '100%' }} onClick={() => s.setDividerRaised(!s.dividerRaised)}>
          Перегородка: {s.dividerRaised ? 'Піднята' : 'Опущена'}
        </button>
      </div>

      <button
        disabled={solid}
        onClick={() => s.addTracer()}
        style={{ width: '100%', padding: 11, border: 'none', borderRadius: 11, fontSize: 13, fontWeight: 700, marginBottom: 14, cursor: solid ? 'not-allowed' : 'pointer', color: '#fff', background: solid ? '#a0a0a8' : '#0071e3' }}
      >
        ＋ Тестова частинка
      </button>

      <div style={{ ...ctl, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13 }}>Показати молекули</span>
        <button onClick={() => s.toggleMolecules()} aria-pressed={s.showMolecules}
          style={{ padding: '6px 12px', borderRadius: 999, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: s.showMolecules ? '#fff' : '#1d1d1f', background: s.showMolecules ? '#34c759' : 'rgba(0,0,0,0.08)' }}>
          {s.showMolecules ? 'Увімк.' : 'Вимк.'}
        </button>
      </div>

      {solid && (
        <div style={ctl}>
          <span style={label}>Час (роки)</span>
          <div style={{ display: 'flex', gap: 4 }}>
            {TIME_LAPSE_VALUES.map((y: TimeLapseYears) => (
              <button key={y} style={seg(s.timeLapseYears === y)} onClick={() => s.setTimeLapse(y)}>{y}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Stepper({ colour, name, value, onMinus, onPlus }: { colour: string; name: string; value: number; onMinus: () => void; onPlus: () => void }) {
  const btn: React.CSSProperties = { width: 30, height: 30, borderRadius: 8, border: '1px solid rgba(0,0,0,0.1)', background: 'rgba(0,0,0,0.04)', fontSize: 16, fontWeight: 700, color: '#0071e3', cursor: 'pointer' }
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
        <span style={{ width: 11, height: 11, borderRadius: '50%', background: colour }} /> {name}
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button style={btn} aria-label={`Менше ${name}`} onClick={onMinus}>−</button>
        <b style={{ minWidth: 22, textAlign: 'center' }}>{value}</b>
        <button style={btn} aria-label={`Більше ${name}`} onClick={onPlus}>＋</button>
      </span>
    </div>
  )
}
```

Note: the stepper aria-labels are `Більше червоних` / `Менше синіх` etc. — matching the test's `name: 'Більше червоних'`.

- [ ] **Step 4: Run it — expect PASS**

```bash
npx vitest run src/labs/brownian-diffusion/ui/__tests__/ControlPanel.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add src/labs/brownian-diffusion/ui/ControlPanel.tsx src/labs/brownian-diffusion/ui/__tests__/ControlPanel.test.tsx
git commit -m "feat(diffusion): ControlPanel (state, temp, counts, divider, tracer, molecules, time)"
```

---

## Slice 6 — One-box scene (R3F integration; browser-verified)

R3F components are not unit-tested (per spec §10). For these tasks the "test" is `tsc` + the browser smoke. TDD micro-steps don't apply; write the file, type-check, verify in browser, commit.

### Task 9: `scene/LatticeField.tsx` (in-box solid renderer)

**Files:**
- Create: `src/labs/brownian-diffusion/scene/LatticeField.tsx`

- [ ] **Step 1: Implement**

```tsx
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, InstancedMesh, Matrix4 } from 'three'
import { interpolateLattice } from '../physics/lattice'
import { useLabSettings } from '../state/LabSettingsState'

const GOLD = new Color('#d4af37')
const LEAD = new Color('#8a8f99')
const SCRATCH = new Matrix4()
const ATOM_R = 0.005

/** Renders the 100-atom gold/lead lattice for the solid state, interpolated by timeLapseYears. */
export function LatticeField({ position }: { position: [number, number, number] }) {
  const meshRef = useRef<InstancedMesh>(null)
  const years = useLabSettings(s => s.timeLapseYears)

  useFrame(() => {
    const m = meshRef.current
    if (!m) return
    const { atoms } = interpolateLattice(years)
    for (let i = 0; i < atoms.length; i++) {
      const a = atoms[i]
      SCRATCH.makeScale(ATOM_R, ATOM_R, ATOM_R)
      SCRATCH.setPosition(a.pos.x, a.pos.y, a.pos.z)
      m.setMatrixAt(i, SCRATCH)
      m.setColorAt(i, a.kind === 'gold' ? GOLD : LEAD)
    }
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  })

  return (
    <group position={position}>
      <instancedMesh ref={meshRef} args={[undefined, undefined, 100]}>
        <sphereGeometry args={[1, 12, 10]} />
        <meshStandardMaterial roughness={0.35} metalness={0.6} />
      </instancedMesh>
    </group>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/labs/brownian-diffusion/scene/LatticeField.tsx
git commit -m "feat(diffusion): LatticeField (in-box gold/lead lattice)"
```

---

### Task 10: Rewrite `scene/LabScene.tsx` (one stateful box + controls)

**Files:**
- Modify (rewrite in place): `src/labs/brownian-diffusion/scene/LabScene.tsx`

- [ ] **Step 1: Replace the whole file** with:

```tsx
import { useCallback, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { ACESFilmicToneMapping } from 'three'
import { Environment } from '@react-three/drei'
import { CinematicLighting } from '../../../sdk/scene/CinematicLighting'
import { CameraRig } from '../../../sdk/scene/CameraRig'
import { PostFX } from '../../../sdk/scene/PostFX'
import { Table } from '../../../sdk/scene/Table'
import { CANVAS_BASE_STYLE } from '../../../sdk/scene/canvasStyle'
import { Button } from '../../../sdk/ui/Button'
import { SoundToggle } from '../../../sdk/ui/SoundToggle'
import { ZoomControls } from '../../../sdk/ui/ZoomControls'
import { BottomSheet } from '../../../sdk/ui/BottomSheet'
import { SheetTriggerButton } from '../../../sdk/ui/SheetTriggerButton'
import { SheetSection } from '../../../sdk/ui/SheetSection'
import { LoadingScreen } from '../../../sdk/ui/LoadingScreen'
import { safeAreaBottom } from '../../../sdk/a11y/safeArea'
import { PinchZoomController } from '../../../sdk/scene/PinchZoomController'
import { useViewport } from '../../../sdk/a11y/useViewport'
import { HUD } from '../ui/HUD'
import { ControlPanel } from '../ui/ControlPanel'
import { MixednessMeter } from '../ui/MixednessMeter'
import { GlassBox, BOX_INTERIOR, BOX_HALF } from '../instruments/GlassBox'
import { ParticleField } from './ParticleField'
import { LatticeField } from './LatticeField'
import { SceneController } from './SceneController'
import { Particle, PARTICLE_DEFAULTS, randomVelocity } from '../physics/particles'
import { spawnInk } from '../physics/spawnInk'
import { dividerStateAt, BOX_HALF_Y } from '../physics/divider'
import { mixedness } from '../physics/mixedness'
import { useLabState } from '../state/LabState'
import { useLabSettings, type MaterialState, type TemperatureLevel } from '../state/LabSettingsState'
import { useStepEngine } from '../../../sdk/guided/StepEngine'
import { SCENES, type BdStep } from '../content/scenes'
import { evaluateStepAdvance } from './stepAdvance'

const BOX_WORLD: [number, number, number] = [0, 0.95, 0]
const CAPACITY = 150

const T_VELOCITY_SCALE: Record<TemperatureLevel, number> = { cold: 0.5, normal: 1.0, warm: 1.5, hot: 2.5 }

// Per-mission scene setup. Index = mission (currentSceneIndex).
const MISSION_STATE:   MaterialState[] = ['gas', 'gas', 'gas', 'liquid', 'solid', 'gas', 'gas']
const MISSION_DIVIDER: boolean[]       = [true,  true,  false, true,     true,    true,  true]
const MISSION_SHOWMOL: boolean[]       = [true,  false, true,  true,     true,    true,  true]
const isSegregated = (idx: number) => idx === 2

function makeParticles(state: MaterialState, red: number, blue: number, segregated: boolean): Particle[] {
  if (state === 'solid') return []
  const out: Particle[] = []
  const H = 0.09
  if (state === 'liquid') {
    const def = PARTICLE_DEFAULTS.water
    for (let i = 0; i < 40; i++) {
      out.push({
        kind: 'water',
        pos: { x: (Math.random() - 0.5) * 2 * H, y: -0.02 + (Math.random() - 0.5) * 0.12, z: (Math.random() - 0.5) * 2 * H },
        vel: randomVelocity(0.05), mass: def.mass, radius: def.radius,
      })
    }
    return out
  }
  const total = red + blue
  for (let i = 0; i < total; i++) {
    const kind: 'red' | 'blue' = i < red ? 'red' : 'blue'
    const def = PARTICLE_DEFAULTS[kind]
    const x = segregated
      ? (kind === 'red' ? -0.02 - Math.random() * 0.06 : 0.02 + Math.random() * 0.06)
      : (Math.random() - 0.5) * 2 * H
    out.push({
      kind,
      pos: { x, y: (Math.random() - 0.5) * 2 * H, z: (Math.random() - 0.5) * 2 * H },
      vel: randomVelocity(0.3), mass: def.mass, radius: def.radius,
    })
  }
  return out
}

export function LabScene() {
  const idx = useLabState(s => s.currentSceneIndex)
  const sessionId = useLabState(s => s.sessionId)
  const respawnObjects = useLabState(s => s.respawnObjects)
  const advanceStep = useStepEngine(s => s.advanceStep)
  const { breakpoint } = useViewport()
  const isMobile = breakpoint === 'phone' || breakpoint === 'tablet'

  const materialState = useLabSettings(s => s.materialState)
  const showMolecules = useLabSettings(s => s.showMolecules)
  const dividerRaised = useLabSettings(s => s.dividerRaised)
  const tracerActive = useLabSettings(s => s.tracerActive)
  const redCount = useLabSettings(s => s.redCount)
  const blueCount = useLabSettings(s => s.blueCount)
  const temperatureLevel = useLabSettings(s => s.temperatureLevel)

  const [sheetOpen, setSheetOpen] = useState(false)
  const [ready, setReady] = useState(false)
  const [renderKey, setRenderKey] = useState(0)

  const particlesRef = useRef<Particle[]>(makeParticles('gas', 20, 20, false))
  const tracerStartRef = useRef<{ x: number; y: number; z: number } | null>(null)

  // Mission entry: apply the mission's intended state (this triggers the re-seed effect).
  useEffect(() => {
    const s = useLabSettings.getState()
    s.setMaterialState(MISSION_STATE[idx] ?? 'gas')
    s.setDividerRaised(MISSION_DIVIDER[idx] ?? true)
    s.setMolecules(MISSION_SHOWMOL[idx] ?? true)
    s.setTracerActive(false)
  }, [idx, sessionId])

  // Re-seed the box whenever the medium or molecule counts change.
  useEffect(() => {
    particlesRef.current = makeParticles(materialState, redCount, blueCount, isSegregated(idx) && materialState === 'gas')
    tracerStartRef.current = null
    setRenderKey(k => k + 1)
  }, [materialState, redCount, blueCount, sessionId, idx])

  // Add a tracer (gas: amber Brownian grain; liquid: ink drop) on the rising edge of tracerActive.
  useEffect(() => {
    if (!tracerActive || tracerStartRef.current) return
    if (materialState === 'gas') {
      const def = PARTICLE_DEFAULTS.pollen
      const start = { x: 0, y: 0.06, z: 0 }
      particlesRef.current.push({ kind: 'pollen', pos: { ...start }, vel: randomVelocity(0.3), mass: def.mass, radius: def.radius })
      tracerStartRef.current = start
      setRenderKey(k => k + 1)
    } else if (materialState === 'liquid') {
      spawnInk(particlesRef.current, { x: BOX_WORLD[0], y: BOX_WORLD[1] + 0.06, z: BOX_WORLD[2] }, BOX_WORLD, 30)
      tracerStartRef.current = { x: 0, y: 0.06, z: 0 } // sentinel: already spawned
      setRenderKey(k => k + 1)
    }
  }, [tracerActive, materialState])

  const getDivider = useCallback(
    () => (materialState === 'gas' && !dividerRaised ? dividerStateAt(-BOX_HALF_Y) : null),
    [materialState, dividerRaised],
  )

  const velocityMultiplier = materialState === 'solid' ? 1 : T_VELOCITY_SCALE[temperatureLevel]
  const liquidDrag = materialState === 'liquid' ? 1.2 : 0

  const onTick = useCallback(() => {
    const engine = useStepEngine.getState()
    const step = SCENES[idx]?.steps[engine.currentStepIndex] as BdStep | undefined

    // MC auto-advance (the only auto-advance).
    const { advance, consumeMC } = evaluateStepAdvance(step, engine, performance.now())
    if (advance) { advanceStep(); if (consumeMC) engine.setLastMCChoice(null) }

    const set = useLabSettings.getState()
    const lab = useLabState.getState()
    const mx = mixedness(set.materialState, particlesRef.current, set.timeLapseYears)
    if (Math.abs(mx - lab.mixedness) >= 0.01) lab.setMixedness(mx)

    // Goal detection — set goalReached (HUD shows «Далі»); never auto-advances.
    if (!step || step.complete.kind !== 'submitted' || !step.motionTrigger || lab.goalReached) return
    const tracerDisp = () => {
      const s0 = tracerStartRef.current
      const p = particlesRef.current.find(pp => pp.kind === 'pollen')
      if (!s0 || !p) return 0
      const dx = p.pos.x - s0.x, dy = p.pos.y - s0.y, dz = p.pos.z - s0.z
      return Math.sqrt(dx * dx + dy * dy + dz * dz)
    }
    let reached = false
    switch (step.motionTrigger) {
      case 'molecules-shown':   reached = set.showMolecules; break
      case 'tracer-jiggled':    reached = tracerDisp() >= 0.05; break
      case 'gas-mixed':         reached = set.dividerRaised && mx >= 0.98; break
      case 'liquid-mixed':      reached = set.materialState === 'liquid' && set.tracerActive && mx >= 0.5; break
      case 'timelapse-reached': reached = set.materialState === 'solid' && set.timeLapseYears >= 100; break
      case 'temp-hot':          reached = set.temperatureLevel === 'hot'; break
    }
    if (reached) lab.setGoalReached(true)
  }, [idx, advanceStep])

  const utilities = (
    <Button variant="secondary" onClick={() => respawnObjects()} aria-label="Скинути" title="Скинути">↻ Скинути</Button>
  )

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
        <CameraRig preset="focus-box" />
        <PinchZoomController />
        <Environment preset="studio" background={false} resolution={64} />
        <Physics key={sessionId} gravity={[0, -9.81, 0]} timeStep={1 / 60}>
          <Table />
          <GlassBox position={BOX_WORLD} />
          {materialState !== 'solid' && (
            <ParticleField
              key={renderKey}
              particles={particlesRef}
              capacity={CAPACITY}
              position={BOX_WORLD}
              isVisible={(p) => (p.kind === 'pollen' ? true : materialState === 'gas' ? showMolecules : true)}
            />
          )}
          {materialState === 'solid' && <LatticeField position={BOX_WORLD} />}
          {materialState === 'gas' && !dividerRaised && (
            <mesh position={BOX_WORLD}>
              <boxGeometry args={[0.004, 2 * BOX_HALF, 2 * BOX_HALF]} />
              <meshStandardMaterial color="#cfd6e0" transparent opacity={0.5} roughness={0.4} metalness={0.3} />
            </mesh>
          )}
          <SceneController
            particles={particlesRef}
            walls={BOX_INTERIOR}
            getDivider={getDivider}
            onTick={onTick}
            liquidDrag={liquidDrag}
            velocityMultiplier={velocityMultiplier}
          />
        </Physics>
        <PostFX />
      </Canvas>
      <LoadingScreen done={ready} />
      <HUD />

      {isMobile ? (
        <>
          <div style={{ position: 'fixed', bottom: safeAreaBottom(16), right: 8, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 10 }}>
            <ZoomControls />
            <SheetTriggerButton onClick={() => setSheetOpen(true)} />
          </div>
          <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)}>
            <SheetSection label="Перемішаність"><MixednessMeter /></SheetSection>
            <SheetSection label="Керування"><ControlPanel /></SheetSection>
            <SheetSection label="Звук"><SoundToggle /></SheetSection>
            <div style={{ marginTop: 8 }}>{utilities}</div>
          </BottomSheet>
        </>
      ) : (
        <>
          <div style={{ position: 'fixed', top: '50%', right: 16, transform: 'translateY(-50%)', zIndex: 10 }}>
            <ControlPanel />
          </div>
          <div style={{ position: 'fixed', bottom: safeAreaBottom(16), left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}>
            <MixednessMeter />
          </div>
          <div style={{ position: 'fixed', bottom: safeAreaBottom(16), right: 16, display: 'flex', gap: 8, zIndex: 10 }}>
            <ZoomControls />
            <SoundToggle />
            {utilities}
          </div>
        </>
      )}
    </>
  )
}
```

- [ ] **Step 2: Type-check** (this will surface unused imports in files that referenced the now-removed instruments — those are cleaned in Task 11; LabScene itself must be clean)

```bash
npx tsc --noEmit
```
Expected: errors ONLY from the soon-retired instrument files / old tests, not from `LabScene.tsx`. If `LabScene.tsx` itself errors, fix before continuing.

- [ ] **Step 3: Browser-verify** (dev server + manual): start `npm run dev`, open `/physics/brownian-diffusion`, start the lab. Confirm: one box renders; ControlPanel (right desktop / sheet mobile) switches Газ/Рідина/Тверде and the contents change; MixednessMeter moves; «Далі» stays disabled until each mission's goal is met. **Browser-tune note:** if the desktop ControlPanel overlaps the HUD journal panel (top-right), set the journal's `defaultCollapsed` to `true` for desktop in `HUD.tsx`, or nudge the ControlPanel `top`. Resolve visually.

- [ ] **Step 4: Commit**

```bash
git add src/labs/brownian-diffusion/scene/LabScene.tsx
git commit -m "feat(diffusion): one-box LabScene driven by ControlPanel + missions"
```

---

## Slice 7 — Retire drag/per-scene instruments + cleanup

### Task 11: Delete unused instruments and standalone widgets

**Files (delete):**
- `src/labs/brownian-diffusion/instruments/PollenParticle.tsx`
- `src/labs/brownian-diffusion/instruments/PollenTrail.tsx`
- `src/labs/brownian-diffusion/instruments/InkDropper.tsx`
- `src/labs/brownian-diffusion/instruments/Divider.tsx`
- `src/labs/brownian-diffusion/instruments/Beaker.tsx`
- `src/labs/brownian-diffusion/instruments/SolidBlocks.tsx`
- `src/labs/brownian-diffusion/ui/ShowMoleculesToggle.tsx` + `src/labs/brownian-diffusion/ui/__tests__/ShowMoleculesToggle.test.tsx`
- `src/labs/brownian-diffusion/ui/TemperatureButton.tsx`
- `src/labs/brownian-diffusion/ui/TimeLapseSlider.tsx`
- Any `__tests__` files that import the above (e.g., a `TimeLapseSlider`/`TemperatureButton`/`Divider.tsx` component test — keep `physics/__tests__/divider.test.ts` and `physics/__tests__/lattice.test.ts`, which test the math, not the retired 3D components).

- [ ] **Step 1: Delete the files**

```bash
git rm \
  src/labs/brownian-diffusion/instruments/PollenParticle.tsx \
  src/labs/brownian-diffusion/instruments/PollenTrail.tsx \
  src/labs/brownian-diffusion/instruments/InkDropper.tsx \
  src/labs/brownian-diffusion/instruments/Divider.tsx \
  src/labs/brownian-diffusion/instruments/Beaker.tsx \
  src/labs/brownian-diffusion/instruments/SolidBlocks.tsx \
  src/labs/brownian-diffusion/ui/ShowMoleculesToggle.tsx \
  src/labs/brownian-diffusion/ui/__tests__/ShowMoleculesToggle.test.tsx \
  src/labs/brownian-diffusion/ui/TemperatureButton.tsx \
  src/labs/brownian-diffusion/ui/TimeLapseSlider.tsx
```

- [ ] **Step 2: Find any dangling imports / tests of removed modules**

```bash
npx vitest run
npx tsc --noEmit
```

- [ ] **Step 3: Fix stragglers.** For each error, remove the dangling import or delete the orphaned test file. Likely candidates: a component test for `TimeLapseSlider`/`TemperatureButton`/`Divider`; `BenchmarkScene.tsx` should only import `ParticleField` (leave it). Do NOT touch `physics/*` or other labs. `noUnusedLocals` will flag any leftover import in a kept file — remove it.

- [ ] **Step 4: Re-run the gate — expect green**

```bash
npx vitest run
npx tsc --noEmit
```
Expected: all tests PASS, 0 type errors.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore(diffusion): retire drag instruments + standalone widgets (folded into ControlPanel)"
```

---

## Slice 8 — Verify & finish

### Task 12: Full gate + browser smoke + finish branch

- [ ] **Step 1: Full automated gate**

```bash
npx vitest run
npx tsc --noEmit
npm run build
```
Expected: all tests PASS (count ≥ the pre-flight baseline — old drag/scene tests are replaced by the new state/mixedness/missions/panel tests), 0 type errors, build succeeds.

- [ ] **Step 2: Browser smoke (mandatory — R3F + controls are not unit-tested).** `npm run dev`, open `/physics/brownian-diffusion`, and walk every mission:

  - [ ] **Mission 1** — molecules visible in the gas box; «Далі» (ack) works; MC «завжди рухаються» → correct advances.
  - [ ] **Mission 2** — molecules hidden by default; «＋ Тестова частинка» drops the amber grain; it visibly jiggles; «Показати молекули» reveals red/blue; «Далі» enables only after the tracer has moved; MC advances.
  - [ ] **Mission 3** — colours start segregated with the divider wall; the «Перегородка» toggle removes the wall; the meter climbs to ~100%; «Далі» enables at 100%; MC advances.
  - [ ] **Mission 4** — box is water; «＋ Тестова частинка» drops ink; it spreads slowly; meter rises; «Далі» enables ≥ 50%; MC advances.
  - [ ] **Mission 5** — solid lattice renders; the «Час» slider appears; 100+ years enables «Далі»; MC advances.
  - [ ] **Mission 6** — temperature slider to «Гаряче» speeds molecules; «Далі» enables at hot; MC advances.
  - [ ] **Free play** — all controls live; «Далі →» finishes → RevealScene.
  - [ ] No console errors during the whole walk. Resize to phone width: ControlPanel + meter live in the bottom sheet; HUD panels collapse.

  If any step sticks or errors, fix with `superpowers:systematic-debugging` and re-verify in the browser before claiming done (this is exactly how the earlier stuck-at-scene-1 bug slipped through).

- [ ] **Step 3: Finish the branch.** The controller invokes `superpowers:finishing-a-development-branch` to merge `feat/diffusion-rework` into `master` (project convention: `--no-ff`; Vercel auto-deploys prod from master). Do NOT merge until Steps 1–2 are green.

---

## Self-review (filled in by the plan author)

**Spec coverage:**
- §1 four-pains fixes → drag removed (Task 8/10/11), Далі-gating (Task 2/6/10), meter (Task 3/7/10), one-box + missions (Task 4/10). ✓
- §3 three states → `makeParticles` + ParticleField/LatticeField switch (Task 9/10); physics reused. ✓
- §4 controls → Task 8 (every row covered: state, temp, counts, divider, tracer, molecules, time). ✓
- §5 meter → Task 3 (selector) + Task 7 (component) + onTick wiring (Task 10). ✓
- §6 mission arc → Task 4 (7 missions, no dragging). ✓
- §7 completion model (goalReached, Далі-gating, no silent advance) → Task 2 + Task 5 + Task 6 + onTick (Task 10). ✓
- §8 file map → Tasks 1–11 match (reuse/modify/new/retire). ✓
- §9 layout (desktop rail / phone sheet) → Task 10. ✓
- §10 testing → unit tests in Tasks 1–3,7,8; browser smoke Task 12. ✓
- §11 non-goals (no physics-math change, no other labs) → honored; only `brownian-diffusion` touched. ✓

**Type consistency:** `MaterialState`/`TemperatureLevel`/`TimeLapseYears` come from `LabSettingsState`; `BdStep`/`BdMotionTrigger`/`SCENES` from `content/scenes`; `mixedness(state, particles, years)` signature matches its call in `LabScene.onTick`; `goalReached`/`setGoalReached`/`mixedness`/`setMixedness` defined in Task 2 and used in Task 6/10; `addTracer`/`setTracerActive`/`setMolecules`/`setTemperature`/`setMaterialState`/`setDividerRaised`/`setRedCount`/`setBlueCount` defined in Task 1 and used in Tasks 8/10. ✓

**Placeholder scan:** every code step has full code; commands have expected output. ✓

**Known deviation from spec:** the spec mentioned a `sandbox` phase; the plan implements free-play as the 7th mission instead (simpler, same behaviour — controls are always live; the final «Далі» finishes). No separate phase needed.

