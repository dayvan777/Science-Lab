# Mass Measurement Lab — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a browser-based 3D physics lab "Mass Measurement of Bodies" — student measures mass of three objects (tennis ball, apple, baseball) using three instruments (digital scale, lever balance, dynamometer), records results in a digital journal, and gets a final report.

**Architecture:** Single-page React app on Vite. R3F drives the scene, Rapier (`@react-three/rapier`) drives physics (real, accurate values). Zustand holds lab state. No backend. Pragmatic monolith — no "lab framework" abstractions for a single MVP lab. Detailed spec: [`docs/superpowers/specs/2026-04-29-mass-measurement-lab-design.md`](../specs/2026-04-29-mass-measurement-lab-design.md).

**Tech Stack:** React 18 + TypeScript 5 + Vite 5 + `@react-three/fiber` 8 + `@react-three/drei` 9 + `@react-three/rapier` 1 + Zustand 4 + html-to-image 1.11 + Vitest 1

**Target:** Chrome 120+ on Promethean ActivPanel. Cloud deployment (Cloudflare Pages).

---

## File Structure (locked-in decomposition)

```
src/
  main.tsx                    React + ReactDOM bootstrap
  App.tsx                     Phase router: <IntroScreen> | <LabScreen> | <SummaryScreen>
  scene/
    LabScene.tsx              <Canvas> + <Physics> root (3D world)
    Lighting.tsx              key/fill/rim + Environment HDRI
    CameraRig.tsx             fixed camera + named zoom presets
    Table.tsx                 table mesh + collider
    instruments/
      DigitalScale.tsx        platform + mass summing + LCD canvas texture
      Dynamometer.tsx         stand + spring + hook + Newton scale
      LeverBalance.tsx        stand + beam (RevoluteJoint) + two pans + indicator
    objects/
      Draggable.tsx           shared <RigidBody> wrapper + <useDrag> hook
      TennisBall.tsx          58g sphere
      Apple.tsx               180g
      Baseball.tsx            145g
      Weights.tsx             7 weight pieces, each Draggable
  physics/
    DragController.tsx        global pointer→kinematic dispatcher (multi-touch)
    useDrag.ts                Draggable's hook
  lab/
    tasks.ts                  9 task definitions (TS const)
    LabState.ts               Zustand store
    HUD.tsx                   header + task panel + journal + input bar (overlay)
    IntroScreen.tsx
    SummaryScreen.tsx
  ui/
    NumberInput.tsx           tap-friendly numeric input
    Button.tsx                shared touch-sized button (≥56px tap targets)
  utils/
    units.ts                  N↔g conversion, value comparison
    assetLoader.tsx           normalize .glb scale to metric
public/
  assets/                     .glb models, HDRI .hdr file
tests/                        vitest specs (mirror src/ structure)
```

---

## Tasks

### Task 0: Project bootstrap

**Files:** repository root

- [ ] **Step 1: Initialize git**

```bash
cd "C:/Users/vdomo/OneDrive/Рабочий стол/3dwebsimulation"
git init
echo "node_modules/" > .gitignore
echo "dist/" >> .gitignore
echo ".superpowers/" >> .gitignore
echo ".env*" >> .gitignore
git add idea.md docs/ .gitignore
git commit -m "chore: initial spec and design doc"
```

- [ ] **Step 2: Scaffold Vite + React + TypeScript**

```bash
npm create vite@latest . -- --template react-ts
# When prompted "Current directory is not empty", choose "Ignore files and continue"
npm install
```

- [ ] **Step 3: Install runtime dependencies**

```bash
npm install three @react-three/fiber @react-three/drei @react-three/rapier zustand html-to-image
npm install --save-dev @types/three vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom
```

- [ ] **Step 4: Add Vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
  },
})
```

Create `tests/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest'
```

Add to `package.json` scripts:

```json
"test": "vitest run",
"test:watch": "vitest",
"typecheck": "tsc --noEmit"
```

- [ ] **Step 5: Verify build and test pipeline**

Run:

```bash
npm run build
npm run test
npm run typecheck
```

Expected: `build` succeeds (default Vite template), `test` reports "no tests found" (exit 0), `typecheck` succeeds.

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "chore: scaffold Vite + React + TS + R3F + Rapier deps + Vitest"
```

---

### Task 1: Unit conversion utility (TDD warmup)

**Files:**
- Create: `src/utils/units.ts`
- Test: `tests/utils/units.test.ts`

This is the first real code. Pure functions, easiest TDD.

- [ ] **Step 1: Write failing tests**

Create `tests/utils/units.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { newtonsToGrams, gramsToNewtons, withinTolerance } from '../../src/utils/units'

describe('newtonsToGrams', () => {
  it('converts 1 N to ~102 g (using g=9.8)', () => {
    expect(newtonsToGrams(1)).toBeCloseTo(102.04, 1)
  })
  it('converts 0 N to 0 g', () => {
    expect(newtonsToGrams(0)).toBe(0)
  })
})

describe('gramsToNewtons', () => {
  it('converts 1000 g to ~9.8 N', () => {
    expect(gramsToNewtons(1000)).toBeCloseTo(9.8, 2)
  })
})

describe('withinTolerance', () => {
  it('accepts value within ±10% of expected', () => {
    expect(withinTolerance(180, 180, 0.10)).toBe(true)
    expect(withinTolerance(170, 180, 0.10)).toBe(true)
    expect(withinTolerance(195, 180, 0.10)).toBe(true)
  })
  it('rejects value outside ±10%', () => {
    expect(withinTolerance(150, 180, 0.10)).toBe(false)
    expect(withinTolerance(220, 180, 0.10)).toBe(false)
  })
  it('handles zero expected (treats as exact match required)', () => {
    expect(withinTolerance(0, 0, 0.10)).toBe(true)
    expect(withinTolerance(1, 0, 0.10)).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests — verify they fail with import error**

Run: `npm run test`
Expected: FAIL — module `src/utils/units` not found.

- [ ] **Step 3: Implement minimal code**

Create `src/utils/units.ts`:

```ts
export const G = 9.8

export function newtonsToGrams(n: number): number {
  return (n / G) * 1000
}

export function gramsToNewtons(g: number): number {
  return (g / 1000) * G
}

export function withinTolerance(value: number, expected: number, tolerance: number): boolean {
  if (expected === 0) return value === 0
  const delta = Math.abs(value - expected)
  return delta / Math.abs(expected) <= tolerance
}
```

- [ ] **Step 4: Run tests — verify they pass**

Run: `npm run test`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add src/utils/units.ts tests/utils/units.test.ts
git commit -m "feat(utils): N↔g conversion and tolerance comparison"
```

---

### Task 2: Lab task definitions

**Files:**
- Create: `src/lab/tasks.ts`
- Test: `tests/lab/tasks.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/lab/tasks.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { tasks } from '../../src/lab/tasks'

describe('tasks', () => {
  it('has exactly 9 tasks (3 objects × 3 instruments)', () => {
    expect(tasks).toHaveLength(9)
  })
  it('each task has unique id', () => {
    const ids = tasks.map(t => t.id)
    expect(new Set(ids).size).toBe(9)
  })
  it('covers all 3 objects × 3 instruments combinations', () => {
    const pairs = tasks.map(t => `${t.objectId}-${t.instrumentId}`)
    expect(new Set(pairs).size).toBe(9)
  })
  it('every task has positive expectedValue and tolerance in (0, 1)', () => {
    for (const t of tasks) {
      expect(t.expectedValue).toBeGreaterThan(0)
      expect(t.tolerance).toBeGreaterThan(0)
      expect(t.tolerance).toBeLessThan(1)
    }
  })
  it('dynamometer tasks use Newton input unit', () => {
    const dynTasks = tasks.filter(t => t.instrumentId === 'dynamometer')
    for (const t of dynTasks) {
      expect(t.inputUnit).toBe('N')
    }
  })
  it('non-dynamometer tasks use gram input unit', () => {
    const others = tasks.filter(t => t.instrumentId !== 'dynamometer')
    for (const t of others) {
      expect(t.inputUnit).toBe('g')
    }
  })
})
```

- [ ] **Step 2: Run — expect import failure**

Run: `npm run test`. Expected: FAIL.

- [ ] **Step 3: Implement**

Create `src/lab/tasks.ts`:

```ts
export type ObjectId = 'tennis-ball' | 'apple' | 'baseball'
export type InstrumentId = 'digital-scale' | 'lever-balance' | 'dynamometer'
export type InputUnit = 'g' | 'N'

export type Task = {
  id: string
  objectId: ObjectId
  instrumentId: InstrumentId
  prompt: string
  hint: string
  expectedValue: number   // grams (g) or Newtons (N) per inputUnit
  tolerance: number       // fraction (0.10 = ±10%)
  inputUnit: InputUnit
}

const G = 9.8
const massNewtons = (massGrams: number) => (massGrams / 1000) * G

const TENNIS = 58
const APPLE = 180
const BASEBALL = 145

export const tasks: Task[] = [
  {
    id: 't1', objectId: 'tennis-ball', instrumentId: 'digital-scale',
    prompt: 'Виміряйте масу тенісного м\'яча електронними вагами.',
    hint: 'Покладіть м\'яч на платформу і прочитайте значення на LCD.',
    expectedValue: TENNIS, tolerance: 0.05, inputUnit: 'g',
  },
  {
    id: 't2', objectId: 'tennis-ball', instrumentId: 'lever-balance',
    prompt: 'Виміряйте масу тенісного м\'яча важільними терезами.',
    hint: 'Покладіть м\'яч на ліву чашу. Додавайте гирьки на праву, поки балка не вирівняється.',
    expectedValue: TENNIS, tolerance: 0.10, inputUnit: 'g',
  },
  {
    id: 't3', objectId: 'tennis-ball', instrumentId: 'dynamometer',
    prompt: 'Виміряйте вагу тенісного м\'яча динамометром.',
    hint: 'Чіпляйте м\'яч на гачок і прочитайте силу натягу в Ньютонах.',
    expectedValue: massNewtons(TENNIS), tolerance: 0.10, inputUnit: 'N',
  },
  {
    id: 't4', objectId: 'apple', instrumentId: 'digital-scale',
    prompt: 'Виміряйте масу яблука електронними вагами.',
    hint: 'Покладіть яблуко на платформу.',
    expectedValue: APPLE, tolerance: 0.05, inputUnit: 'g',
  },
  {
    id: 't5', objectId: 'apple', instrumentId: 'lever-balance',
    prompt: 'Виміряйте масу яблука важільними терезами.',
    hint: 'Підбирайте гирьки до балансу.',
    expectedValue: APPLE, tolerance: 0.10, inputUnit: 'g',
  },
  {
    id: 't6', objectId: 'apple', instrumentId: 'dynamometer',
    prompt: 'Виміряйте вагу яблука динамометром.',
    hint: 'Чіпляйте на гачок, читайте Ньютони.',
    expectedValue: massNewtons(APPLE), tolerance: 0.10, inputUnit: 'N',
  },
  {
    id: 't7', objectId: 'baseball', instrumentId: 'digital-scale',
    prompt: 'Виміряйте масу бейсбольного м\'яча електронними вагами.',
    hint: 'Покладіть м\'яч на платформу.',
    expectedValue: BASEBALL, tolerance: 0.05, inputUnit: 'g',
  },
  {
    id: 't8', objectId: 'baseball', instrumentId: 'lever-balance',
    prompt: 'Виміряйте масу бейсбольного м\'яча важільними терезами.',
    hint: 'Підбирайте гирьки.',
    expectedValue: BASEBALL, tolerance: 0.10, inputUnit: 'g',
  },
  {
    id: 't9', objectId: 'baseball', instrumentId: 'dynamometer',
    prompt: 'Виміряйте вагу бейсбольного м\'яча динамометром.',
    hint: 'Чіпляйте на гачок.',
    expectedValue: massNewtons(BASEBALL), tolerance: 0.10, inputUnit: 'N',
  },
]
```

- [ ] **Step 4: Run tests — expect pass**

Run: `npm run test`. Expected: PASS, all 6+7 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lab/tasks.ts tests/lab/tasks.test.ts
git commit -m "feat(lab): define 9 measurement tasks for 3 objects × 3 instruments"
```

---

### Task 3: Lab state store (Zustand)

**Files:**
- Create: `src/lab/LabState.ts`
- Test: `tests/lab/LabState.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/lab/LabState.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useLabState } from '../../src/lab/LabState'

describe('LabState', () => {
  beforeEach(() => {
    useLabState.getState().reset()
  })

  it('starts in intro phase with no journal entries', () => {
    const s = useLabState.getState()
    expect(s.phase).toBe('intro')
    expect(s.currentTaskIndex).toBe(0)
    expect(s.journal).toHaveLength(0)
  })

  it('start() moves to in-progress', () => {
    useLabState.getState().start()
    expect(useLabState.getState().phase).toBe('in-progress')
  })

  it('setMeasurement adds entry and advances index', () => {
    const s = useLabState.getState()
    s.start()
    s.setMeasurement('t1', 58)
    const next = useLabState.getState()
    expect(next.journal).toHaveLength(1)
    expect(next.journal[0]).toMatchObject({ taskId: 't1', userValue: 58 })
    expect(next.currentTaskIndex).toBe(1)
  })

  it('finishes after 9th measurement', () => {
    const s = useLabState.getState()
    s.start()
    for (let i = 0; i < 9; i++) {
      useLabState.getState().setMeasurement(`t${i + 1}`, 100)
    }
    expect(useLabState.getState().phase).toBe('finished')
  })

  it('reset returns to initial state', () => {
    const s = useLabState.getState()
    s.start()
    s.setMeasurement('t1', 58)
    s.reset()
    const r = useLabState.getState()
    expect(r.phase).toBe('intro')
    expect(r.journal).toHaveLength(0)
    expect(r.currentTaskIndex).toBe(0)
  })
})
```

- [ ] **Step 2: Run — expect failure**

- [ ] **Step 3: Implement store**

Create `src/lab/LabState.ts`:

```ts
import { create } from 'zustand'

export type LabPhase = 'intro' | 'in-progress' | 'finished'

export type JournalEntry = {
  taskId: string
  userValue: number
  timestamp: number
}

type LabState = {
  phase: LabPhase
  currentTaskIndex: number
  journal: JournalEntry[]
  start: () => void
  setMeasurement: (taskId: string, value: number) => void
  reset: () => void
}

const TOTAL_TASKS = 9

export const useLabState = create<LabState>((set, get) => ({
  phase: 'intro',
  currentTaskIndex: 0,
  journal: [],

  start: () => set({ phase: 'in-progress' }),

  setMeasurement: (taskId, userValue) => {
    const { journal, currentTaskIndex } = get()
    const newJournal = [...journal, { taskId, userValue, timestamp: Date.now() }]
    const newIndex = currentTaskIndex + 1
    set({
      journal: newJournal,
      currentTaskIndex: newIndex,
      phase: newIndex >= TOTAL_TASKS ? 'finished' : 'in-progress',
    })
  },

  reset: () => set({ phase: 'intro', currentTaskIndex: 0, journal: [] }),
}))
```

- [ ] **Step 4: Run — expect pass**

- [ ] **Step 5: Commit**

```bash
git add src/lab/LabState.ts tests/lab/LabState.test.ts
git commit -m "feat(lab): zustand store with intro→in-progress→finished state machine"
```

---

### Task 4: App shell + Intro screen

**Files:**
- Modify: `src/App.tsx`
- Create: `src/lab/IntroScreen.tsx`
- Create: `src/ui/Button.tsx`

No automated test (UI smoke). Manual verify in `npm run dev`.

- [ ] **Step 1: Create reusable Button**

Create `src/ui/Button.tsx`:

```tsx
import { ReactNode, MouseEvent } from 'react'

type Props = {
  onClick: () => void
  variant?: 'primary' | 'secondary'
  children: ReactNode
}

export function Button({ onClick, variant = 'primary', children }: Props) {
  const bg = variant === 'primary' ? '#2ecc71' : '#3498db'
  return (
    <button
      onClick={(e: MouseEvent) => { e.preventDefault(); onClick() }}
      style={{
        background: bg,
        color: '#fff',
        border: 'none',
        borderRadius: 12,
        padding: '16px 32px',
        fontSize: 18,
        fontWeight: 600,
        minHeight: 56,
        minWidth: 120,
        cursor: 'pointer',
        touchAction: 'manipulation',
      }}
    >
      {children}
    </button>
  )
}
```

- [ ] **Step 2: Create IntroScreen**

Create `src/lab/IntroScreen.tsx`:

```tsx
import { useLabState } from './LabState'
import { Button } from '../ui/Button'

export function IntroScreen() {
  const start = useLabState(s => s.start)
  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'linear-gradient(135deg, #1a1a2e, #0f3460)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      color: '#fff', padding: 32,
    }}>
      <h1 style={{ fontSize: 36, marginBottom: 16 }}>
        Лабораторна робота
      </h1>
      <h2 style={{ fontSize: 28, marginBottom: 32, fontWeight: 400 }}>
        Вимірювання маси тіл
      </h2>
      <p style={{ maxWidth: 600, textAlign: 'center', fontSize: 16, lineHeight: 1.6, marginBottom: 40 }}>
        На столі є три прилади і три предмети. Виміряй масу кожного предмета
        всіма приладами. Записуй результати в лабжурнал. Успіхів!
      </p>
      <Button onClick={start}>Почати</Button>
    </div>
  )
}
```

- [ ] **Step 3: Wire phase router in App.tsx**

Replace contents of `src/App.tsx`:

```tsx
import { useLabState } from './lab/LabState'
import { IntroScreen } from './lab/IntroScreen'

export default function App() {
  const phase = useLabState(s => s.phase)
  if (phase === 'intro') return <IntroScreen />
  // LabScreen and SummaryScreen wired in later tasks
  return <div style={{ padding: 32 }}>Phase: {phase} (not yet wired)</div>
}
```

- [ ] **Step 4: Manual verify**

Run: `npm run dev`. Open http://localhost:5173.
Expected: Intro screen with "Почати" button. Click → page changes to "Phase: in-progress (not yet wired)".

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/lab/IntroScreen.tsx src/ui/Button.tsx
git commit -m "feat(ui): intro screen with start button + phase routing in App"
```

---

### Task 5: Empty 3D scene with Canvas

**Files:**
- Create: `src/scene/LabScene.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create empty LabScene**

Create `src/scene/LabScene.tsx`:

```tsx
import { Canvas } from '@react-three/fiber'

export function LabScene() {
  return (
    <Canvas
      camera={{ position: [0, 1.5, 2.0], fov: 50 }}
      shadows
      style={{ position: 'fixed', inset: 0, background: '#1a1a1a' }}
    >
      <ambientLight intensity={0.5} />
      <mesh>
        <boxGeometry args={[0.3, 0.3, 0.3]} />
        <meshStandardMaterial color="orange" />
      </mesh>
    </Canvas>
  )
}
```

- [ ] **Step 2: Wire LabScene into App.tsx**

Modify `src/App.tsx`:

```tsx
import { useLabState } from './lab/LabState'
import { IntroScreen } from './lab/IntroScreen'
import { LabScene } from './scene/LabScene'

export default function App() {
  const phase = useLabState(s => s.phase)
  if (phase === 'intro') return <IntroScreen />
  return <LabScene />
}
```

- [ ] **Step 3: Manual verify**

Run: `npm run dev`. Click "Почати" on intro screen.
Expected: Orange cube floating against dark background.

- [ ] **Step 4: Commit**

```bash
git add src/scene/LabScene.tsx src/App.tsx
git commit -m "feat(scene): bootstrap R3F Canvas with placeholder cube"
```

---

### Task 6: Lighting

**Files:**
- Create: `src/scene/Lighting.tsx`
- Modify: `src/scene/LabScene.tsx`

- [ ] **Step 1: Create Lighting component**

Create `src/scene/Lighting.tsx`:

```tsx
import { Environment } from '@react-three/drei'

export function Lighting() {
  return (
    <>
      {/* Key — warm overhead */}
      <directionalLight
        position={[2, 4, 2]}
        intensity={1.5}
        color="#fff4e0"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-3}
        shadow-camera-right={3}
        shadow-camera-top={3}
        shadow-camera-bottom={-3}
      />
      {/* Fill */}
      <directionalLight position={[-2, 2, 3]} intensity={0.4} color="#e0e8ff" />
      {/* Rim — cooler back light */}
      <directionalLight position={[0, 3, -3]} intensity={0.6} color="#c0d0ff" />
      {/* Soft ambient + IBL */}
      <ambientLight intensity={0.2} />
      <Environment preset="warehouse" />
    </>
  )
}
```

- [ ] **Step 2: Use Lighting in LabScene**

Modify `src/scene/LabScene.tsx`:

```tsx
import { Canvas } from '@react-three/fiber'
import { Lighting } from './Lighting'

export function LabScene() {
  return (
    <Canvas
      camera={{ position: [0, 1.5, 2.0], fov: 50 }}
      shadows
      style={{ position: 'fixed', inset: 0, background: '#2a2a2a' }}
    >
      <Lighting />
      <mesh castShadow position={[0, 0.5, 0]}>
        <boxGeometry args={[0.3, 0.3, 0.3]} />
        <meshStandardMaterial color="orange" />
      </mesh>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[5, 5]} />
        <meshStandardMaterial color="#404040" />
      </mesh>
    </Canvas>
  )
}
```

- [ ] **Step 3: Manual verify**

Run: `npm run dev` → click "Почати".
Expected: Orange cube on grey floor, with visible shadow underneath, three-point lighting visible (cube has highlights and shading).

- [ ] **Step 4: Commit**

```bash
git add src/scene/Lighting.tsx src/scene/LabScene.tsx
git commit -m "feat(scene): three-point lighting with HDRI environment"
```

---

### Task 7: Camera rig with zoom presets

**Files:**
- Create: `src/scene/CameraRig.tsx`
- Modify: `src/scene/LabScene.tsx`

- [ ] **Step 1: Create CameraRig**

Create `src/scene/CameraRig.tsx`:

```tsx
import { useRef, useEffect } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { Vector3 } from 'three'

export type CameraPreset = 'overview' | 'digital-scale' | 'lever-balance' | 'dynamometer'

const PRESETS: Record<CameraPreset, { pos: [number, number, number]; target: [number, number, number] }> = {
  'overview':       { pos: [0, 1.5, 2.0],   target: [0, 0.85, 0] },
  'digital-scale':  { pos: [0.6, 1.2, 1.0], target: [0.6, 0.9, 0] },
  'lever-balance':  { pos: [0, 1.2, 1.0],   target: [0, 0.95, 0] },
  'dynamometer':    { pos: [-0.5, 1.3, 1.0], target: [-0.5, 1.0, 0] },
}

type Props = { preset: CameraPreset }

export function CameraRig({ preset }: Props) {
  const { camera } = useThree()
  const targetPos = useRef(new Vector3(...PRESETS[preset].pos))
  const targetLook = useRef(new Vector3(...PRESETS[preset].target))

  useEffect(() => {
    targetPos.current.set(...PRESETS[preset].pos)
    targetLook.current.set(...PRESETS[preset].target)
  }, [preset])

  useFrame((_, delta) => {
    camera.position.lerp(targetPos.current, Math.min(1, delta * 3))
    const currentLook = new Vector3()
    camera.getWorldDirection(currentLook)
    const desiredLook = targetLook.current.clone().sub(camera.position).normalize()
    const lerpedLook = currentLook.lerp(desiredLook, Math.min(1, delta * 3))
    camera.lookAt(camera.position.clone().add(lerpedLook))
  })

  return null
}
```

- [ ] **Step 2: Wire into scene with state**

Modify `src/scene/LabScene.tsx`:

```tsx
import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Lighting } from './Lighting'
import { CameraRig, CameraPreset } from './CameraRig'
import { Button } from '../ui/Button'

export function LabScene() {
  const [preset, setPreset] = useState<CameraPreset>('overview')

  return (
    <>
      <Canvas
        camera={{ position: [0, 1.5, 2.0], fov: 50 }}
        shadows
        style={{ position: 'fixed', inset: 0, background: '#2a2a2a' }}
      >
        <Lighting />
        <CameraRig preset={preset} />
        <mesh castShadow position={[0, 0.5, 0]}>
          <boxGeometry args={[0.3, 0.3, 0.3]} />
          <meshStandardMaterial color="orange" />
        </mesh>
        <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[5, 5]} />
          <meshStandardMaterial color="#404040" />
        </mesh>
      </Canvas>
      <div style={{ position: 'fixed', bottom: 16, right: 16, display: 'flex', gap: 8 }}>
        <Button variant="secondary" onClick={() => setPreset('overview')}>Скинути</Button>
        <Button variant="secondary" onClick={() => setPreset('digital-scale')}>Наблизити</Button>
      </div>
    </>
  )
}
```

- [ ] **Step 3: Manual verify camera transitions**

Run: `npm run dev` → "Почати" → click "Наблизити" / "Скинути".
Expected: Camera smoothly lerps between positions over ~0.3s.

- [ ] **Step 4: Commit**

```bash
git add src/scene/CameraRig.tsx src/scene/LabScene.tsx
git commit -m "feat(scene): camera rig with named zoom presets and smooth lerp"
```

---

### Task 8: Table with collision

**Files:**
- Create: `src/scene/Table.tsx`
- Modify: `src/scene/LabScene.tsx` (wrap in `<Physics>`, replace placeholder)

- [ ] **Step 1: Add `<Physics>` wrapper to LabScene**

Modify `src/scene/LabScene.tsx`:

```tsx
import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { Lighting } from './Lighting'
import { CameraRig, CameraPreset } from './CameraRig'
import { Table } from './Table'
import { Button } from '../ui/Button'

export function LabScene() {
  const [preset, setPreset] = useState<CameraPreset>('overview')

  return (
    <>
      <Canvas
        camera={{ position: [0, 1.5, 2.0], fov: 50 }}
        shadows
        style={{ position: 'fixed', inset: 0, background: '#2a2a2a' }}
      >
        <Lighting />
        <CameraRig preset={preset} />
        <Physics gravity={[0, -9.81, 0]}>
          <Table />
        </Physics>
      </Canvas>
      <div style={{ position: 'fixed', bottom: 16, right: 16, display: 'flex', gap: 8 }}>
        <Button variant="secondary" onClick={() => setPreset('overview')}>Скинути</Button>
        <Button variant="secondary" onClick={() => setPreset('digital-scale')}>Наблизити</Button>
      </div>
    </>
  )
}
```

- [ ] **Step 2: Create Table**

Create `src/scene/Table.tsx`:

```tsx
import { RigidBody } from '@react-three/rapier'

const TABLE_WIDTH = 2.5
const TABLE_DEPTH = 1.2
const TABLE_HEIGHT = 0.85
const TOP_THICKNESS = 0.05

export const TABLE_TOP_Y = TABLE_HEIGHT // public constant for object placement

export function Table() {
  return (
    <RigidBody type="fixed" colliders="cuboid">
      {/* Tabletop */}
      <mesh
        receiveShadow
        position={[0, TABLE_HEIGHT - TOP_THICKNESS / 2, 0]}
      >
        <boxGeometry args={[TABLE_WIDTH, TOP_THICKNESS, TABLE_DEPTH]} />
        <meshStandardMaterial color="#8b5a2b" roughness={0.7} />
      </mesh>
      {/* 4 legs (visual only, single collider above is enough) */}
      {[
        [-1.15, 0.35, -0.5],
        [1.15, 0.35, -0.5],
        [-1.15, 0.35, 0.5],
        [1.15, 0.35, 0.5],
      ].map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]} castShadow>
          <boxGeometry args={[0.06, 0.7, 0.06]} />
          <meshStandardMaterial color="#5a3a1a" roughness={0.8} />
        </mesh>
      ))}
    </RigidBody>
  )
}
```

- [ ] **Step 3: Manual verify**

Run: `npm run dev` → "Почати".
Expected: Wooden-looking table on dark background. No falling object yet — physics world is set up but empty.

- [ ] **Step 4: Commit**

```bash
git add src/scene/Table.tsx src/scene/LabScene.tsx
git commit -m "feat(scene): table mesh with fixed Rapier collider"
```

---

### Task 9: Drag hook (useDrag)

**Files:**
- Create: `src/physics/useDrag.ts`

- [ ] **Step 1: Implement useDrag**

Create `src/physics/useDrag.ts`:

```ts
import { useRef, useCallback } from 'react'
import { ThreeEvent, useThree } from '@react-three/fiber'
import { Plane, Vector3 } from 'three'
import { RapierRigidBody } from '@react-three/rapier'

const DRAG_HEIGHT = 1.0 // 15 cm above tabletop (TABLE_TOP_Y = 0.85)
const SMOOTHING = 0.3   // lower = smoother but laggier

type Props = { rigidBody: React.RefObject<RapierRigidBody> }

export function useDrag({ rigidBody }: Props) {
  const { camera, gl } = useThree()
  const dragPlane = useRef(new Plane(new Vector3(0, 1, 0), -DRAG_HEIGHT))
  const target = useRef(new Vector3())
  const isDragging = useRef(false)
  const pointerId = useRef<number | null>(null)

  const intersectPlane = useCallback((ev: PointerEvent | ThreeEvent<PointerEvent>) => {
    const native = 'nativeEvent' in ev ? ev.nativeEvent : ev
    const rect = gl.domElement.getBoundingClientRect()
    const x = ((native.clientX - rect.left) / rect.width) * 2 - 1
    const y = -((native.clientY - rect.top) / rect.height) * 2 + 1
    const ndc = new Vector3(x, y, 0.5).unproject(camera)
    const dir = ndc.sub(camera.position).normalize()
    const t = -(camera.position.y - DRAG_HEIGHT) / dir.y
    return camera.position.clone().add(dir.multiplyScalar(t))
  }, [camera, gl])

  const onPointerDown = (ev: ThreeEvent<PointerEvent>) => {
    if (!rigidBody.current) return
    ev.stopPropagation()
    isDragging.current = true
    pointerId.current = ev.pointerId
    rigidBody.current.setBodyType(2 /* KinematicPositionBased */, true)
    rigidBody.current.setAngvel({ x: 0, y: 0, z: 0 }, true)
    target.current.copy(intersectPlane(ev))
    ;(ev.target as Element).setPointerCapture(ev.pointerId)
  }

  const onPointerMove = (ev: ThreeEvent<PointerEvent>) => {
    if (!isDragging.current || ev.pointerId !== pointerId.current) return
    const next = intersectPlane(ev)
    target.current.lerp(next, SMOOTHING)
    if (rigidBody.current) {
      rigidBody.current.setNextKinematicTranslation({
        x: target.current.x,
        y: target.current.y,
        z: target.current.z,
      })
    }
  }

  const onPointerUp = (ev: ThreeEvent<PointerEvent>) => {
    if (ev.pointerId !== pointerId.current) return
    isDragging.current = false
    pointerId.current = null
    if (rigidBody.current) {
      rigidBody.current.setBodyType(0 /* Dynamic */, true)
    }
    ;(ev.target as Element).releasePointerCapture(ev.pointerId)
  }

  return { onPointerDown, onPointerMove, onPointerUp }
}
```

- [ ] **Step 2: No tests for now (hook needs R3F context).** Will verify with placeholder draggable in next task.

- [ ] **Step 3: Commit**

```bash
git add src/physics/useDrag.ts
git commit -m "feat(physics): useDrag hook converts pointer to kinematic translation"
```

---

### Task 10: Draggable wrapper + placeholder ball

**Files:**
- Create: `src/scene/objects/Draggable.tsx`
- Create: `src/scene/objects/TennisBall.tsx`
- Modify: `src/scene/LabScene.tsx`

- [ ] **Step 1: Create Draggable wrapper**

Create `src/scene/objects/Draggable.tsx`:

```tsx
import { ReactNode, useRef } from 'react'
import { RigidBody, RapierRigidBody, BallCollider, CuboidCollider } from '@react-three/rapier'
import { useDrag } from '../../physics/useDrag'

type Props = {
  position: [number, number, number]
  mass: number          // grams
  shape: { type: 'ball'; radius: number } | { type: 'cuboid'; halfExtents: [number, number, number] }
  children: ReactNode
}

export function Draggable({ position, mass, shape, children }: Props) {
  const ref = useRef<RapierRigidBody>(null)
  const { onPointerDown, onPointerMove, onPointerUp } = useDrag({ rigidBody: ref })
  const massKg = mass / 1000

  return (
    <RigidBody
      ref={ref}
      colliders={false}
      position={position}
      type="dynamic"
      restitution={0.2}
      friction={0.6}
    >
      {shape.type === 'ball' ? (
        <BallCollider args={[shape.radius]} mass={massKg} />
      ) : (
        <CuboidCollider args={shape.halfExtents} mass={massKg} />
      )}
      <group
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        {children}
      </group>
    </RigidBody>
  )
}
```

- [ ] **Step 2: Create TennisBall using Draggable**

Create `src/scene/objects/TennisBall.tsx`:

```tsx
import { Draggable } from './Draggable'

const RADIUS = 0.0335  // 3.35 cm — official tennis ball
const MASS_GRAMS = 58

type Props = { position: [number, number, number] }

export function TennisBall({ position }: Props) {
  return (
    <Draggable position={position} mass={MASS_GRAMS} shape={{ type: 'ball', radius: RADIUS }}>
      <mesh castShadow>
        <sphereGeometry args={[RADIUS, 24, 16]} />
        <meshStandardMaterial color="#d8e043" roughness={0.85} />
      </mesh>
    </Draggable>
  )
}
```

- [ ] **Step 3: Wire into scene**

Modify `src/scene/LabScene.tsx` — add inside `<Physics>`:

```tsx
import { TennisBall } from './objects/TennisBall'
// ...
<Physics gravity={[0, -9.81, 0]}>
  <Table />
  <TennisBall position={[-0.8, 1.2, 0]} />
</Physics>
```

- [ ] **Step 4: Manual verify**

Run: `npm run dev` → "Почати".
Expected:
- Yellow tennis ball drops from above, lands on table, settles.
- Click and drag the ball with mouse — ball follows pointer.
- Release — ball drops back to table with gravity.
- Multi-touch: open in Chrome with touch emulation, two fingers can grab two balls (only one ball here, so to verify multi-touch we'll add more in next task).

- [ ] **Step 5: Commit**

```bash
git add src/scene/objects/Draggable.tsx src/scene/objects/TennisBall.tsx src/scene/LabScene.tsx
git commit -m "feat(scene): tennis ball with drag-and-drop and physics"
```

---

### Task 11: Apple and baseball

**Files:**
- Create: `src/scene/objects/Apple.tsx`
- Create: `src/scene/objects/Baseball.tsx`
- Modify: `src/scene/LabScene.tsx`

- [ ] **Step 1: Create Apple**

Create `src/scene/objects/Apple.tsx`:

```tsx
import { Draggable } from './Draggable'

const RADIUS = 0.04  // ~8 cm diameter
const MASS_GRAMS = 180

type Props = { position: [number, number, number] }

export function Apple({ position }: Props) {
  return (
    <Draggable position={position} mass={MASS_GRAMS} shape={{ type: 'ball', radius: RADIUS }}>
      <mesh castShadow>
        <sphereGeometry args={[RADIUS, 24, 16]} />
        <meshStandardMaterial color="#c0392b" roughness={0.5} />
      </mesh>
    </Draggable>
  )
}
```

- [ ] **Step 2: Create Baseball**

Create `src/scene/objects/Baseball.tsx`:

```tsx
import { Draggable } from './Draggable'

const RADIUS = 0.0365  // 3.65 cm — official baseball
const MASS_GRAMS = 145

type Props = { position: [number, number, number] }

export function Baseball({ position }: Props) {
  return (
    <Draggable position={position} mass={MASS_GRAMS} shape={{ type: 'ball', radius: RADIUS }}>
      <mesh castShadow>
        <sphereGeometry args={[RADIUS, 24, 16]} />
        <meshStandardMaterial color="#f5f5f0" roughness={0.6} />
      </mesh>
    </Draggable>
  )
}
```

- [ ] **Step 3: Wire all three into scene**

Modify `src/scene/LabScene.tsx` inside `<Physics>`:

```tsx
<TennisBall position={[-1.0, 1.2, 0]} />
<Apple position={[-0.8, 1.2, 0]} />
<Baseball position={[-0.6, 1.2, 0]} />
```

- [ ] **Step 4: Manual verify**

Three balls drop. Each can be dragged independently. Verify on touch device or in Chrome DevTools touch emulation — two fingers grab two separate balls simultaneously.

- [ ] **Step 5: Commit**

```bash
git add src/scene/objects/Apple.tsx src/scene/objects/Baseball.tsx src/scene/LabScene.tsx
git commit -m "feat(scene): apple and baseball draggable objects"
```

---

### Task 12: Digital scale (electronic)

**Files:**
- Create: `src/scene/instruments/DigitalScale.tsx`
- Modify: `src/scene/LabScene.tsx`

- [ ] **Step 1: Implement DigitalScale**

Create `src/scene/instruments/DigitalScale.tsx`:

```tsx
import { useRef, useState, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider, RapierRigidBody, useRapier } from '@react-three/rapier'
import { CanvasTexture } from 'three'

const PLATFORM_W = 0.20
const PLATFORM_D = 0.20
const PLATFORM_T = 0.02
const HOUSING_H = 0.04
const LCD_W = 0.12
const LCD_H = 0.04

type Props = { position: [number, number, number] }

export function DigitalScale({ position }: Props) {
  const platformRef = useRef<RapierRigidBody>(null)
  const { world } = useRapier()
  const [reading, setReading] = useState(0)
  const [tareOffset, setTareOffset] = useState(0)

  const lcdTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 96
    return new CanvasTexture(canvas)
  }, [])

  // Update LCD texture when reading changes
  useMemo(() => {
    const ctx = (lcdTexture.image as HTMLCanvasElement).getContext('2d')!
    ctx.fillStyle = '#a0c0a0'
    ctx.fillRect(0, 0, 256, 96)
    ctx.fillStyle = '#1a1a1a'
    ctx.font = 'bold 56px monospace'
    ctx.textAlign = 'right'
    ctx.fillText(`${Math.round(reading)} g`, 240, 70)
    lcdTexture.needsUpdate = true
  }, [reading, lcdTexture])

  useFrame(() => {
    if (!platformRef.current) return
    const platformHandle = platformRef.current.handle
    let totalMassKg = 0

    world.contactPairsWith(platformRef.current.collider(0), (collider) => {
      const body = collider.parent()
      if (!body || body.handle === platformHandle) return
      if (body.bodyType() === 0 /* Dynamic */) {
        totalMassKg += body.mass()
      }
    })

    const grams = totalMassKg * 1000 - tareOffset
    setReading(Math.max(0, grams))
  })

  const onTare = () => setTareOffset(reading + tareOffset)

  return (
    <group position={position}>
      {/* Housing */}
      <mesh castShadow position={[0, HOUSING_H / 2, 0]}>
        <boxGeometry args={[PLATFORM_W * 1.1, HOUSING_H, PLATFORM_D * 1.1]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.4} metalness={0.2} />
      </mesh>
      {/* Platform with intersection detection */}
      <RigidBody
        ref={platformRef}
        type="fixed"
        colliders={false}
        position={[0, HOUSING_H + PLATFORM_T / 2, 0]}
      >
        <CuboidCollider args={[PLATFORM_W / 2, PLATFORM_T / 2, PLATFORM_D / 2]} />
        <mesh castShadow receiveShadow>
          <boxGeometry args={[PLATFORM_W, PLATFORM_T, PLATFORM_D]} />
          <meshStandardMaterial color="#888" metalness={0.6} roughness={0.3} />
        </mesh>
      </RigidBody>
      {/* LCD on the front */}
      <mesh position={[0, HOUSING_H / 2, PLATFORM_D / 2 * 1.1 + 0.001]}>
        <planeGeometry args={[LCD_W, LCD_H]} />
        <meshBasicMaterial map={lcdTexture} />
      </mesh>
      {/* Tare button visual (functional via separate UI later if needed) */}
      <mesh
        position={[LCD_W / 2 + 0.015, HOUSING_H / 2, PLATFORM_D / 2 * 1.1 + 0.001]}
        onClick={onTare}
      >
        <boxGeometry args={[0.012, 0.012, 0.005]} />
        <meshStandardMaterial color="#e74c3c" />
      </mesh>
    </group>
  )
}
```

> **Note on Rapier API:** `world.contactPairsWith` and `body.mass()` come from `@dimforge/rapier3d-compat`. If the API differs in your installed version (check `node_modules/@dimforge/rapier3d-compat/package.json`), use `world.intersectionPairsWith` or iterate `world.intersectionPair(collider1, collider2)` instead. Verify by checking `import('@react-three/rapier').useRapier` types in your IDE.

- [ ] **Step 2: Place in scene**

Modify `src/scene/LabScene.tsx`, add inside `<Physics>`:

```tsx
import { DigitalScale } from './instruments/DigitalScale'
// ...
<DigitalScale position={[0.6, 0.85, 0]} />
```

- [ ] **Step 3: Manual verify**

Run dev, drag tennis ball onto digital scale platform.
Expected: LCD reads `58 g` (or close — gravity settling may take a moment). Drop apple — LCD reads `180 g`. Stack both — LCD reads `238 g`.

- [ ] **Step 4: Adjust if reading is unstable**

If LCD flickers, add a small smoothing in the `useFrame` callback:
```ts
const smoothed = reading * 0.85 + grams * 0.15
setReading(Math.max(0, smoothed))
```

- [ ] **Step 5: Commit**

```bash
git add src/scene/instruments/DigitalScale.tsx src/scene/LabScene.tsx
git commit -m "feat(instruments): digital scale with mass-summing LCD readout"
```

---

### Task 13: Dynamometer

**Files:**
- Create: `src/scene/instruments/Dynamometer.tsx`
- Modify: `src/scene/LabScene.tsx`

- [ ] **Step 1: Implement Dynamometer**

Create `src/scene/instruments/Dynamometer.tsx`:

```tsx
import { useRef, useState, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, RapierRigidBody, BallCollider, useFixedJoint } from '@react-three/rapier'
import { CanvasTexture, Vector3 } from 'three'

const G = 9.81
const SPRING_K = 50  // N/m — gives 0–10 cm range for 0–5 N
const STAND_H = 0.4
const SPRING_TOP_Y = 0.4
const HOOK_REST_Y = 0.2  // distance below SPRING_TOP_Y at rest
const SNAP_RADIUS = 0.05

type Props = { position: [number, number, number] }

export function Dynamometer({ position }: Props) {
  const hookRef = useRef<RapierRigidBody>(null)
  const [attached, setAttached] = useState<RapierRigidBody | null>(null)
  const [forceN, setForceN] = useState(0)
  const [hookY, setHookY] = useState(SPRING_TOP_Y - HOOK_REST_Y)

  // Scale texture
  const scaleTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 256
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#f5f5f5'
    ctx.fillRect(0, 0, 64, 256)
    ctx.fillStyle = '#000'
    ctx.font = 'bold 14px sans-serif'
    ctx.textAlign = 'right'
    for (let i = 0; i <= 5; i++) {
      const y = 30 + i * 40
      ctx.fillText(`${i} N`, 50, y)
      ctx.fillRect(8, y - 3, 18, 2)
    }
    return new CanvasTexture(canvas)
  }, [])

  useFrame(() => {
    if (!hookRef.current) return
    const F = attached ? attached.mass() * G : 0
    setForceN(F)
    const newY = SPRING_TOP_Y - HOOK_REST_Y - F / SPRING_K
    setHookY(newY)
    hookRef.current.setNextKinematicTranslation({
      x: position[0],
      y: position[1] + newY,
      z: position[2],
    })
  })

  const onAttachAttempt = (body: RapierRigidBody) => {
    // Called by external snap detection (in next refactor); for MVP we attach via collision check
    setAttached(body)
  }

  return (
    <group position={position}>
      {/* Stand */}
      <mesh castShadow position={[0, STAND_H / 2, 0]}>
        <boxGeometry args={[0.04, STAND_H, 0.04]} />
        <meshStandardMaterial color="#333" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh castShadow position={[0.05, STAND_H + 0.01, 0]}>
        <boxGeometry args={[0.14, 0.02, 0.04]} />
        <meshStandardMaterial color="#333" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Spring (visual) — cylinder scaled to current extension */}
      <mesh position={[0.05, (SPRING_TOP_Y + hookY) / 2, 0]}>
        <cylinderGeometry args={[0.008, 0.008, Math.max(0.02, SPRING_TOP_Y - hookY), 8]} />
        <meshStandardMaterial color="#aaa" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Hook (kinematic) */}
      <RigidBody
        ref={hookRef}
        type="kinematicPosition"
        colliders={false}
        position={[position[0] + 0.05, position[1] + hookY, position[2]]}
      >
        <BallCollider args={[0.012]} sensor onIntersectionEnter={({ other }) => {
          const body = other.rigidBody
          if (!body || attached) return
          if (body.bodyType() !== 0 /* Dynamic */) return
          const dist = new Vector3(
            body.translation().x - (position[0] + 0.05),
            body.translation().y - (position[1] + hookY),
            body.translation().z - position[2],
          ).length()
          if (dist < SNAP_RADIUS) onAttachAttempt(body)
        }} />
        <mesh castShadow>
          <torusGeometry args={[0.012, 0.003, 8, 16]} />
          <meshStandardMaterial color="#888" metalness={0.7} />
        </mesh>
      </RigidBody>
      {/* Scale plate */}
      <mesh position={[-0.04, STAND_H * 0.6, 0]}>
        <planeGeometry args={[0.06, 0.24]} />
        <meshBasicMaterial map={scaleTexture} />
      </mesh>
      {/* Indicator pointer — small red triangle following hookY */}
      <mesh position={[-0.01, position[1] + hookY - position[1] + 0.0, 0.001]}>
        <boxGeometry args={[0.02, 0.005, 0.001]} />
        <meshBasicMaterial color="#e74c3c" />
      </mesh>
    </group>
  )
}
```

> **Important caveat:** This MVP version uses `onIntersectionEnter` to attach. In practice, for a clean snap-to-hook UX you'll want a dedicated "attach zone" detection in the Draggable's `onPointerUp` (check distance to all hooks in scene). Refactor in Task 17 (polish pass).

- [ ] **Step 2: Place in scene**

```tsx
import { Dynamometer } from './instruments/Dynamometer'
// ...
<Dynamometer position={[-0.5, 0.85, 0]} />
```

- [ ] **Step 3: Manual verify**

Drag tennis ball near hook. Ball "snaps" to hook (or sits there). Spring extends visually. Indicator on scale moves down. Note: this MVP attach is rough — calibrate in Task 17.

- [ ] **Step 4: Commit**

```bash
git add src/scene/instruments/Dynamometer.tsx src/scene/LabScene.tsx
git commit -m "feat(instruments): dynamometer with computed spring extension"
```

---

### Task 14: Lever balance

**Files:**
- Create: `src/scene/instruments/LeverBalance.tsx`
- Modify: `src/scene/LabScene.tsx`

- [ ] **Step 1: Implement LeverBalance**

Create `src/scene/instruments/LeverBalance.tsx`:

```tsx
import { useRef } from 'react'
import { RigidBody, RapierRigidBody, CuboidCollider, useRevoluteJoint, useFixedJoint } from '@react-three/rapier'

const STAND_H = 0.25
const BEAM_LEN = 0.45
const BEAM_T = 0.012
const PAN_R = 0.07
const PAN_DEPTH = 0.015

type Props = { position: [number, number, number] }

export function LeverBalance({ position }: Props) {
  const standRef = useRef<RapierRigidBody>(null)
  const beamRef = useRef<RapierRigidBody>(null)
  const leftPanRef = useRef<RapierRigidBody>(null)
  const rightPanRef = useRef<RapierRigidBody>(null)

  // Revolute joint at center of beam, hinged to stand
  useRevoluteJoint(standRef, beamRef, [
    [0, STAND_H, 0],          // anchor on stand (top)
    [0, 0, 0],                // anchor on beam (center)
    [0, 0, 1],                // axis: Z (so beam tilts in XY plane)
  ])

  // Fixed joints connecting pans to beam ends
  useFixedJoint(beamRef, leftPanRef, [
    [-BEAM_LEN / 2, -BEAM_T / 2, 0], [0, 0, 0, 1],
    [0, PAN_DEPTH / 2, 0], [0, 0, 0, 1],
  ])
  useFixedJoint(beamRef, rightPanRef, [
    [BEAM_LEN / 2, -BEAM_T / 2, 0], [0, 0, 0, 1],
    [0, PAN_DEPTH / 2, 0], [0, 0, 0, 1],
  ])

  return (
    <group position={position}>
      {/* Stand */}
      <RigidBody ref={standRef} type="fixed" colliders="cuboid">
        <mesh castShadow position={[0, STAND_H / 2, 0]}>
          <boxGeometry args={[0.04, STAND_H, 0.04]} />
          <meshStandardMaterial color="#444" metalness={0.4} roughness={0.4} />
        </mesh>
      </RigidBody>
      {/* Beam — DYNAMIC, with revolute joint to stand */}
      <RigidBody
        ref={beamRef}
        type="dynamic"
        colliders={false}
        position={[0, STAND_H, 0]}
        mass={0.05}
      >
        <CuboidCollider args={[BEAM_LEN / 2, BEAM_T / 2, 0.012]} />
        <mesh castShadow>
          <boxGeometry args={[BEAM_LEN, BEAM_T, 0.024]} />
          <meshStandardMaterial color="#555" metalness={0.5} roughness={0.3} />
        </mesh>
        {/* Indicator arrow */}
        <mesh position={[0, -BEAM_T / 2 - 0.04, 0]}>
          <boxGeometry args={[0.005, 0.06, 0.005]} />
          <meshStandardMaterial color="#e74c3c" />
        </mesh>
      </RigidBody>
      {/* Left pan */}
      <RigidBody
        ref={leftPanRef}
        type="dynamic"
        colliders={false}
        position={[-BEAM_LEN / 2, STAND_H - PAN_DEPTH, 0]}
        mass={0.02}
      >
        <CuboidCollider args={[PAN_R, PAN_DEPTH / 2, PAN_R]} />
        <mesh castShadow>
          <cylinderGeometry args={[PAN_R, PAN_R * 0.9, PAN_DEPTH, 24]} />
          <meshStandardMaterial color="#666" metalness={0.6} roughness={0.4} />
        </mesh>
      </RigidBody>
      {/* Right pan */}
      <RigidBody
        ref={rightPanRef}
        type="dynamic"
        colliders={false}
        position={[BEAM_LEN / 2, STAND_H - PAN_DEPTH, 0]}
        mass={0.02}
      >
        <CuboidCollider args={[PAN_R, PAN_DEPTH / 2, PAN_R]} />
        <mesh castShadow>
          <cylinderGeometry args={[PAN_R, PAN_R * 0.9, PAN_DEPTH, 24]} />
          <meshStandardMaterial color="#666" metalness={0.6} roughness={0.4} />
        </mesh>
      </RigidBody>
      {/* Reference scale (-, 0, +) behind beam */}
      <mesh position={[0, STAND_H, -0.025]}>
        <planeGeometry args={[0.10, 0.04]} />
        <meshBasicMaterial color="#fff" />
      </mesh>
    </group>
  )
}
```

> **Joint API note:** `useRevoluteJoint` and `useFixedJoint` signatures vary across @react-three/rapier versions. If they error, check the installed version's docs (`node_modules/@react-three/rapier/README.md`) and adjust the anchor/quaternion arrays.

- [ ] **Step 2: Place in scene**

```tsx
import { LeverBalance } from './instruments/LeverBalance'
// ...
<LeverBalance position={[0, 0.85, 0]} />
```

- [ ] **Step 3: Manual verify**

Drop tennis ball onto left pan. Beam should tilt to the left under gravity. Add a 100g weight (after Task 15) to right pan — beam balances when masses are equal.

- [ ] **Step 4: Commit**

```bash
git add src/scene/instruments/LeverBalance.tsx src/scene/LabScene.tsx
git commit -m "feat(instruments): lever balance with real revolute joint physics"
```

---

### Task 15: Weight set

**Files:**
- Create: `src/scene/objects/Weights.tsx`
- Modify: `src/scene/LabScene.tsx`

- [ ] **Step 1: Implement Weights component**

Create `src/scene/objects/Weights.tsx`:

```tsx
import { Draggable } from './Draggable'

const WEIGHTS = [
  { mass: 1000, radius: 0.035, height: 0.05, color: '#444', label: '1кг' },
  { mass: 500,  radius: 0.030, height: 0.040, color: '#555', label: '500г' },
  { mass: 200,  radius: 0.024, height: 0.032, color: '#666', label: '200г' },
  { mass: 100,  radius: 0.020, height: 0.028, color: '#777', label: '100г' },
  { mass: 50,   radius: 0.016, height: 0.022, color: '#888', label: '50г' },
  { mass: 20,   radius: 0.012, height: 0.018, color: '#999', label: '20г' },
  { mass: 10,   radius: 0.010, height: 0.014, color: '#aaa', label: '10г' },
]

type Props = { startPosition: [number, number, number] }

export function Weights({ startPosition }: Props) {
  const [x0, y0, z0] = startPosition
  return (
    <>
      {WEIGHTS.map((w, i) => {
        // Stagger horizontally; cylinders use cuboid colliders for simplicity
        const x = x0 + (i - 3) * 0.05
        return (
          <Draggable
            key={w.label}
            position={[x, y0 + w.height / 2, z0]}
            mass={w.mass}
            shape={{ type: 'cuboid', halfExtents: [w.radius, w.height / 2, w.radius] }}
          >
            <mesh castShadow>
              <cylinderGeometry args={[w.radius, w.radius * 0.95, w.height, 16]} />
              <meshStandardMaterial color={w.color} metalness={0.7} roughness={0.4} />
            </mesh>
          </Draggable>
        )
      })}
    </>
  )
}
```

- [ ] **Step 2: Place in scene**

```tsx
import { Weights } from './objects/Weights'
// ...
<Weights startPosition={[0.5, 0.86, 0.45]} />
```

- [ ] **Step 3: Manual verify lever balance**

With weights placed, drop apple (180g) on left pan, drag 100g + 50g + 20g + 10g to right pan = 180g. Beam balances within ~5° of horizontal. This proves real physics works.

- [ ] **Step 4: Commit**

```bash
git add src/scene/objects/Weights.tsx src/scene/LabScene.tsx
git commit -m "feat(objects): full weight set 1kg → 10g (7 pieces, draggable)"
```

---

### Task 16: HUD (header, task panel, journal)

**Files:**
- Create: `src/lab/HUD.tsx`
- Create: `src/ui/NumberInput.tsx`
- Modify: `src/scene/LabScene.tsx`

- [ ] **Step 1: Create NumberInput**

Create `src/ui/NumberInput.tsx`:

```tsx
import { useState } from 'react'

type Props = {
  unit: 'g' | 'N'
  onSubmit: (value: number) => void
}

export function NumberInput({ unit, onSubmit }: Props) {
  const [text, setText] = useState('')

  const handleSubmit = () => {
    const value = parseFloat(text.replace(',', '.'))
    if (Number.isFinite(value) && value >= 0) {
      onSubmit(value)
      setText('')
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ fontSize: 14, opacity: 0.7 }}>Значення:</span>
      <input
        type="number"
        inputMode="decimal"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        style={{
          background: '#fff', color: '#000',
          padding: '10px 16px', fontSize: 18,
          border: 'none', borderRadius: 8,
          width: 100, fontWeight: 600,
        }}
      />
      <span style={{ fontSize: 14, opacity: 0.7 }}>{unit === 'g' ? 'грамів' : 'Ньютонів'}</span>
      <button
        onClick={handleSubmit}
        disabled={!text}
        style={{
          background: text ? '#2ecc71' : '#444',
          color: '#fff',
          padding: '10px 20px', fontSize: 14, fontWeight: 600,
          border: 'none', borderRadius: 8,
          cursor: text ? 'pointer' : 'not-allowed',
        }}
      >
        Записати → Далі
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Implement HUD**

Create `src/lab/HUD.tsx`:

```tsx
import { useLabState } from './LabState'
import { tasks } from './tasks'
import { NumberInput } from '../ui/NumberInput'
import { withinTolerance, newtonsToGrams } from '../utils/units'

const PANEL_BG = 'rgba(20, 20, 30, 0.92)'
const TOTAL = 9

export function HUD() {
  const phase = useLabState(s => s.phase)
  const idx = useLabState(s => s.currentTaskIndex)
  const journal = useLabState(s => s.journal)
  const setMeasurement = useLabState(s => s.setMeasurement)

  if (phase !== 'in-progress') return null
  const current = tasks[idx]

  return (
    <>
      {/* Header */}
      <div style={{
        position: 'fixed', top: 16, left: 16, right: 16,
        background: PANEL_BG, color: '#fff',
        padding: '12px 24px', borderRadius: 8,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        backdropFilter: 'blur(8px)',
      }}>
        <div style={{ fontWeight: 600, fontSize: 16 }}>
          Лабораторна: Вимірювання маси тіл
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {Array.from({ length: TOTAL }).map((_, i) => (
            <div key={i} style={{
              width: 36, height: 8, borderRadius: 4,
              background: i < idx ? '#2ecc71' : i === idx ? '#5DADE2' : 'rgba(255,255,255,0.2)',
            }}/>
          ))}
        </div>
        <div style={{ fontSize: 14, opacity: 0.7 }}>{idx + 1} / {TOTAL}</div>
      </div>

      {/* Task panel (left) */}
      <div style={{
        position: 'fixed', top: 80, left: 16, width: 320,
        background: PANEL_BG, color: '#fff',
        padding: 16, borderRadius: 8, backdropFilter: 'blur(8px)',
      }}>
        <div style={{ fontSize: 11, opacity: 0.6, textTransform: 'uppercase' }}>
          Завдання {idx + 1}
        </div>
        <div style={{ fontSize: 14, fontWeight: 500, margin: '8px 0', lineHeight: 1.4 }}>
          {current.prompt}
        </div>
        <div style={{
          fontSize: 12, opacity: 0.7, lineHeight: 1.4,
          paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.1)',
        }}>
          💡 {current.hint}
        </div>
      </div>

      {/* Journal (right) */}
      <div style={{
        position: 'fixed', top: 80, right: 16, width: 320,
        background: PANEL_BG, color: '#fff',
        padding: 16, borderRadius: 8, backdropFilter: 'blur(8px)',
        maxHeight: '70vh', overflow: 'auto',
      }}>
        <div style={{ fontSize: 11, opacity: 0.7, textTransform: 'uppercase', marginBottom: 8 }}>
          Лабжурнал
        </div>
        {tasks.map((t, i) => {
          const entry = journal.find(e => e.taskId === t.id)
          const opacity = i < idx ? 1 : i === idx ? 0.7 : 0.4
          const valueText = entry
            ? t.inputUnit === 'N'
              ? `${entry.userValue.toFixed(2)} N (≈${Math.round(newtonsToGrams(entry.userValue))} г)`
              : `${entry.userValue} г`
            : '— —'
          return (
            <div key={t.id} style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '6px 0',
              borderBottom: '1px dashed rgba(255,255,255,0.1)',
              fontSize: 12, opacity,
            }}>
              <span>{t.objectId} ({t.instrumentId})</span>
              <span style={{ fontWeight: 600, color: entry ? '#5DADE2' : '#888' }}>{valueText}</span>
            </div>
          )
        })}
      </div>

      {/* Input bar (bottom center) */}
      <div style={{
        position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)',
        background: PANEL_BG, color: '#fff',
        padding: '12px 24px', borderRadius: 8, backdropFilter: 'blur(8px)',
      }}>
        <NumberInput
          unit={current.inputUnit}
          onSubmit={(value) => setMeasurement(current.id, value)}
        />
      </div>
    </>
  )
}
```

- [ ] **Step 3: Add HUD to LabScene**

Modify `src/scene/LabScene.tsx`:

```tsx
import { HUD } from '../lab/HUD'
// ...
return (
  <>
    <Canvas>...</Canvas>
    <HUD />
    <div style={{ position: 'fixed', bottom: 16, right: 16, ... }}>...</div>
  </>
)
```

- [ ] **Step 4: Manual verify**

Run dev → "Почати". HUD appears with task 1 prompt, empty journal, input bar. Type "58" → "Записати → Далі" → progress advances to 2/9, journal shows entry.

- [ ] **Step 5: Commit**

```bash
git add src/lab/HUD.tsx src/ui/NumberInput.tsx src/scene/LabScene.tsx
git commit -m "feat(lab): HUD with header, task panel, journal, input bar"
```

---

### Task 17: Snap-to-instrument polish

**Files:**
- Modify: `src/physics/useDrag.ts`
- Modify: `src/scene/objects/Draggable.tsx`
- Modify: `src/scene/instruments/Dynamometer.tsx`

This task fixes the rough hook attachment from Task 13 with a proper "release-zone" check.

- [ ] **Step 1: Add a global "snap targets" registry**

Create `src/physics/snapTargets.ts`:

```ts
import { Vector3 } from 'three'
import { RapierRigidBody } from '@react-three/rapier'

export type SnapTarget = {
  id: string
  position: Vector3
  radius: number
  onAttach: (body: RapierRigidBody) => void
}

const targets = new Map<string, SnapTarget>()

export function registerSnap(target: SnapTarget) {
  targets.set(target.id, target)
  return () => { targets.delete(target.id) }
}

export function findSnapNear(pos: Vector3): SnapTarget | null {
  for (const t of targets.values()) {
    if (pos.distanceTo(t.position) <= t.radius) return t
  }
  return null
}
```

- [ ] **Step 2: Use snap registry in useDrag**

Modify `src/physics/useDrag.ts` — in `onPointerUp`:

```ts
import { findSnapNear } from './snapTargets'
// ...
const onPointerUp = (ev: ThreeEvent<PointerEvent>) => {
  if (ev.pointerId !== pointerId.current) return
  isDragging.current = false
  pointerId.current = null
  if (rigidBody.current) {
    const t = rigidBody.current.translation()
    const snap = findSnapNear(new Vector3(t.x, t.y, t.z))
    if (snap) {
      snap.onAttach(rigidBody.current)
    } else {
      rigidBody.current.setBodyType(0 /* Dynamic */, true)
    }
  }
  ;(ev.target as Element).releasePointerCapture(ev.pointerId)
}
```

- [ ] **Step 3: Register dynamometer hook as snap target**

Modify `src/scene/instruments/Dynamometer.tsx`:

```tsx
import { useEffect } from 'react'
import { Vector3 } from 'three'
import { registerSnap } from '../../physics/snapTargets'
// ...
useEffect(() => {
  const hookWorldPos = new Vector3(position[0] + 0.05, position[1] + hookY, position[2])
  const unregister = registerSnap({
    id: 'dynamometer-hook',
    position: hookWorldPos,
    radius: 0.06,
    onAttach: (body) => setAttached(body),
  })
  return unregister
}, [position, hookY])
```

> Remove the previous `BallCollider` `onIntersectionEnter`-based attach logic from Task 13.

- [ ] **Step 4: Manual verify**

Drag tennis ball — release within 6 cm of hook → ball attaches and stays. Release further away → ball drops.

- [ ] **Step 5: Commit**

```bash
git add src/physics/snapTargets.ts src/physics/useDrag.ts src/scene/instruments/Dynamometer.tsx
git commit -m "refactor(physics): clean snap-to-target via release-zone registry"
```

---

### Task 18: Active instrument highlight

**Files:**
- Modify: `src/lab/HUD.tsx` (add active instrument outline via state)
- Modify: `src/scene/LabScene.tsx`
- Create: `src/scene/InstrumentHighlight.tsx`

- [ ] **Step 1: Add Outlines via drei postprocessing**

Install:

```bash
npm install @react-three/postprocessing postprocessing
```

Create `src/scene/InstrumentHighlight.tsx`:

```tsx
import { ReactNode } from 'react'
import { Outlines } from '@react-three/drei'

export function InstrumentHighlight({ active, children }: { active: boolean; children: ReactNode }) {
  return (
    <>
      {children}
      {active && <Outlines thickness={2} color="#f4d03f" />}
    </>
  )
}
```

- [ ] **Step 2: Wire instrumentId from current task into scene**

Modify `src/scene/LabScene.tsx`:

```tsx
import { useLabState } from '../lab/LabState'
import { tasks } from '../lab/tasks'
// ...
const idx = useLabState(s => s.currentTaskIndex)
const phase = useLabState(s => s.phase)
const activeInstrument = phase === 'in-progress' ? tasks[idx]?.instrumentId : null
// pass to each instrument:
<DigitalScale position={[0.6, 0.85, 0]} active={activeInstrument === 'digital-scale'} />
<LeverBalance position={[0, 0.85, 0]} active={activeInstrument === 'lever-balance'} />
<Dynamometer position={[-0.5, 0.85, 0]} active={activeInstrument === 'dynamometer'} />
```

Each instrument component takes a new `active?: boolean` prop and applies Outlines on its main mesh, e.g. inside DigitalScale around the housing mesh:

```tsx
<mesh ...>
  <boxGeometry .../>
  <meshStandardMaterial .../>
  {active && <Outlines thickness={2} color="#f4d03f" />}
</mesh>
```

- [ ] **Step 3: Manual verify**

Walk through tasks 1-9 — active instrument has a yellow outline that switches as tasks progress.

- [ ] **Step 4: Commit**

```bash
git add src/scene/InstrumentHighlight.tsx src/scene/instruments/*.tsx src/scene/LabScene.tsx package.json package-lock.json
git commit -m "feat(scene): yellow outline highlights instrument for current task"
```

---

### Task 19: Summary screen

**Files:**
- Create: `src/lab/SummaryScreen.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Implement SummaryScreen**

Create `src/lab/SummaryScreen.tsx`:

```tsx
import { useRef } from 'react'
import { toPng } from 'html-to-image'
import { useLabState } from './LabState'
import { tasks } from './tasks'
import { withinTolerance, newtonsToGrams } from '../utils/units'
import { Button } from '../ui/Button'

export function SummaryScreen() {
  const journal = useLabState(s => s.journal)
  const reset = useLabState(s => s.reset)
  const reportRef = useRef<HTMLDivElement>(null)

  let exact = 0
  let close = 0
  let off = 0
  const rows = tasks.map(t => {
    const entry = journal.find(e => e.taskId === t.id)
    if (!entry) return { task: t, entry: null, status: 'missing' as const }
    const inTol = withinTolerance(entry.userValue, t.expectedValue, t.tolerance)
    const inLooseTol = withinTolerance(entry.userValue, t.expectedValue, t.tolerance * 1.5)
    const status = inTol ? 'exact' : inLooseTol ? 'close' : 'off'
    if (status === 'exact') exact++
    else if (status === 'close') close++
    else off++
    return { task: t, entry, status }
  })

  const downloadScreenshot = async () => {
    if (!reportRef.current) return
    const dataUrl = await toPng(reportRef.current, { backgroundColor: '#1a1a2e' })
    const link = document.createElement('a')
    link.download = 'mass-lab-report.png'
    link.href = dataUrl
    link.click()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'linear-gradient(135deg, #1a1a2e, #0f3460)',
      color: '#fff',
      overflow: 'auto', padding: 32,
    }}>
      <div ref={reportRef} style={{ maxWidth: 700, margin: '0 auto', padding: 32 }}>
        <h1 style={{ fontSize: 32, marginBottom: 8 }}>Лабораторну виконано!</h1>
        <p style={{ fontSize: 18, opacity: 0.8, marginBottom: 24 }}>
          Точно: {exact} · Близько: {close} · Помилка: {off}
        </p>
        {rows.map(({ task, entry, status }) => {
          const dot = status === 'exact' ? '🟢' : status === 'close' ? '🟡' : '🔴'
          const expectedDisplay = task.inputUnit === 'N'
            ? `${task.expectedValue.toFixed(2)} N`
            : `${task.expectedValue} г`
          const userDisplay = entry
            ? task.inputUnit === 'N'
              ? `${entry.userValue.toFixed(2)} N`
              : `${entry.userValue} г`
            : '—'
          return (
            <div key={task.id} style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '12px 0',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              fontSize: 15,
            }}>
              <span>{dot} {task.objectId} · {task.instrumentId}</span>
              <span>
                <span style={{ opacity: 0.6 }}>еталон {expectedDisplay} · </span>
                <span style={{ fontWeight: 600 }}>ти: {userDisplay}</span>
              </span>
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 32 }}>
        <Button variant="secondary" onClick={downloadScreenshot}>📷 Скачати звіт</Button>
        <Button onClick={reset}>Почати знову</Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Wire phase routing**

Modify `src/App.tsx`:

```tsx
import { useLabState } from './lab/LabState'
import { IntroScreen } from './lab/IntroScreen'
import { LabScene } from './scene/LabScene'
import { SummaryScreen } from './lab/SummaryScreen'

export default function App() {
  const phase = useLabState(s => s.phase)
  if (phase === 'intro') return <IntroScreen />
  if (phase === 'finished') return <SummaryScreen />
  return <LabScene />
}
```

- [ ] **Step 3: Manual verify**

Complete all 9 tasks → SummaryScreen appears with color-coded results. Click "Скачати звіт" → PNG downloads. Click "Почати знову" → returns to intro.

- [ ] **Step 4: Commit**

```bash
git add src/lab/SummaryScreen.tsx src/App.tsx
git commit -m "feat(lab): summary screen with results comparison and PNG export"
```

---

### Task 20: Asset replacement (real .glb models)

**Files:**
- Create: `src/utils/assetLoader.tsx`
- Modify: `src/scene/Table.tsx`, all `instruments/*.tsx`, all `objects/*.tsx`
- Add: `public/assets/*.glb`

This is mostly content work, not coding. Per spec, source from Sketchfab/Poly Haven (CC0) + AI generation (Meshy.ai) for missing pieces.

- [ ] **Step 1: Create scale-normalizing asset loader**

Create `src/utils/assetLoader.tsx`:

```tsx
import { useGLTF } from '@react-three/drei'
import { useEffect, useMemo } from 'react'
import { Box3, Vector3 } from 'three'

type Props = { url: string; targetSize: number; children?: never }

/**
 * Loads a .glb and normalizes it so its largest dimension equals targetSize (in meters).
 * Useful because Sketchfab/Meshy models come in arbitrary scales.
 */
export function NormalizedAsset({ url, targetSize }: Props) {
  const { scene } = useGLTF(url)
  const cloned = useMemo(() => scene.clone(true), [scene])

  useEffect(() => {
    const box = new Box3().setFromObject(cloned)
    const size = new Vector3()
    box.getSize(size)
    const maxDim = Math.max(size.x, size.y, size.z)
    if (maxDim > 0) {
      const scale = targetSize / maxDim
      cloned.scale.setScalar(scale)
    }
    cloned.traverse((obj: any) => {
      if (obj.isMesh) {
        obj.castShadow = true
        obj.receiveShadow = true
      }
    })
  }, [cloned, targetSize])

  return <primitive object={cloned} />
}
```

- [ ] **Step 2: Source models** (manual content work)

Create `public/assets/` directory. Acquire `.glb` files for: table, dynamometer+stand, lever-balance, digital-scale, weight-set (combined), tennis-ball, apple, baseball.

Process each through `gltf-transform optimize <input> <output>` to compress.

- [ ] **Step 3: Replace placeholder meshes incrementally**

For each component (e.g. `TennisBall.tsx`), replace the placeholder `<sphereGeometry>` mesh:

```tsx
import { NormalizedAsset } from '../../utils/assetLoader'
// ...
<Draggable ...>
  <NormalizedAsset url="/assets/tennis-ball.glb" targetSize={2 * RADIUS} />
</Draggable>
```

Ensure colliders remain — visual mesh changes, but `BallCollider` shape stays.

- [ ] **Step 4: Manual verify** each replacement renders correctly, scales match physics.

- [ ] **Step 5: Commit (one commit per asset for easy rollback)**

```bash
git add public/assets/tennis-ball.glb src/scene/objects/TennisBall.tsx src/utils/assetLoader.tsx
git commit -m "feat(assets): replace placeholder tennis ball with .glb model"
# repeat for each asset
```

---

### Task 21: Build and Cloudflare Pages deployment

**Files:**
- Modify: `vite.config.ts` (set base path if needed)
- Create: `wrangler.toml` or `cloudflare/_routes.json` (optional)

- [ ] **Step 1: Verify production build**

```bash
npm run build
ls -lh dist/
```

Expected: `dist/index.html` + bundled JS/CSS + `dist/assets/*.glb` copied. Total size: hopefully <100 MB.

- [ ] **Step 2: Test production build locally**

```bash
npx vite preview --port 4173
```

Open http://localhost:4173 — verify the lab works end-to-end.

- [ ] **Step 3: Deploy to Cloudflare Pages**

Two options:

**Option A — GitHub-driven (recommended):**
1. Push repo to GitHub.
2. Cloudflare dashboard → Pages → "Connect to Git" → select repo.
3. Build settings: framework "Vite", build command `npm run build`, output directory `dist`.
4. Deploy.

**Option B — Wrangler CLI:**

```bash
npm install -g wrangler
wrangler pages deploy dist --project-name=mass-lab
```

- [ ] **Step 4: Verify on the deployed URL**

Open `https://mass-lab.pages.dev` (or assigned URL) in Chrome. Run through full lab. Note initial load time — target <30s on a slow connection.

- [ ] **Step 5: Commit deploy config**

```bash
git add wrangler.toml  # if using
git commit -m "chore: add Cloudflare Pages deployment config"
```

---

### Task 22: Manual QA on real Promethean panel

**Files:** none (manual testing)

- [ ] **Step 1: QA checklist**

On a real Promethean panel running Chrome 120+:

- [ ] App loads within 30 seconds on first visit.
- [ ] Intro screen renders, "Почати" button is reachable by finger tap.
- [ ] All 3 objects can be dragged smoothly.
- [ ] Dropping ball on digital scale shows correct mass (within ±5%).
- [ ] Lever balance physically tilts and balances when weights match.
- [ ] Dynamometer hook attaches with snap, spring extends, force shown in N.
- [ ] Two students can drag two objects simultaneously (multi-touch).
- [ ] Camera "Наблизити" button transitions smoothly.
- [ ] Active instrument has visible yellow outline.
- [ ] Input bar accepts numeric input via on-screen keyboard.
- [ ] All 9 tasks can be completed without app crash or stuck state.
- [ ] Summary screen shows correct red/yellow/green per measurement.
- [ ] "Скачати звіт" produces a readable PNG.
- [ ] "Почати знову" returns to intro and resets state.
- [ ] FPS stays ≥30 throughout (use DevTools performance monitor).

- [ ] **Step 2: Document any issues found**

Create `docs/superpowers/qa/2026-04-29-promethean-test.md` with each issue, severity (blocker/major/minor), and reproduction steps.

- [ ] **Step 3: Triage**

Blockers must be fixed before public release. Majors create follow-up tasks. Minors may be deferred.

---

## Self-Review Notes

**Spec coverage check:**
- Section 1 goals → Tasks 0-21 ✓
- Section 3 architecture → Tasks 0-3 (bootstrap, store, tasks) ✓
- Section 4 scene/assets → Tasks 5-8, 20 ✓
- Section 5 physics/drag → Tasks 9-11, 17 ✓
- Section 6 instruments → Tasks 12-14 ✓
- Section 7 UI/lab flow → Tasks 16, 19 ✓
- Section 8 build/deploy/test → Tasks 0, 21, 22 ✓ (automated tests in Tasks 1-3 cover store + tasks + units)
- Section 9 risks → no specific tasks (mitigations applied where relevant: smoothing in Task 9, asset compression in Task 20)

**Rapier API caveat:** Tasks 12-14 reference `world.contactPairsWith`, `useRevoluteJoint`, `useFixedJoint`, `body.bodyType()`, `body.mass()`, etc. These vary across `@react-three/rapier` versions — engineer should verify against installed version's types and adjust signatures inline. Each task notes this where applicable.

**Scope:** Single MVP lab, ~22 tasks, ~3-4 weeks of focused work. Fits one plan per the spec.
