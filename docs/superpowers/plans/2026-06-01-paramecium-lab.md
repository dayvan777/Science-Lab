# Paramecium Lab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Biology "Paramecium" lab (інфузорія-туфелька) — a fully procedural 3D free-explorer where a Paramecium drifts in pond water; click it to dive into the cell; click organelles to highlight them + read a Ukrainian fact; progress N/9.

**Architecture:** New `paramecium` lab under the existing `biology` subject, route `/biology/paramecium`. The cell is **procedural** (zero asset files): a translucent ellipsoid body, an `InstancedMesh` of beating cilia, organelle blobs, pulsing vacuoles, all in a drifting particle-field water environment. A Zustand store drives two view modes (`environment` ↔ `cell`) + organelle selection. Mirrors the just-built anatomy lab for boilerplate (intro, state, HUD/rail/info-card, lazy route).

**Tech Stack:** React 19, @react-three/fiber 9, @react-three/drei 10, three 0.184, Zustand 5, Vitest 4, TypeScript strict + noUnusedLocals.

**Spec:** `docs/superpowers/specs/2026-06-01-paramecium-lab-design.md` (commit 9b56a5c).

**Shared geometry constant (used by spike, Cell, Cilia):** the cell body is a unit sphere scaled to an ellipsoid `A=1.5, B=0.75, C=0.6` (long axis = X). Organelle positions are authored in this local frame.

---

## File Structure

```
src/site/content/subjects.ts          MODIFY  add paramecium lab to the biology subject
src/app/App.tsx                        MODIFY  add lazy /biology/paramecium + (T1) spike route; (T12) drop spike

src/labs/paramecium/
  ParameciumSpike.tsx      CREATE (T1) self-contained quality spike; DELETE (T12)
  content/
    organelles.ts          CREATE  OrganelleId, OrganelleDef, ORGANELLES[9], helpers
    organelles.test.ts     CREATE  data sanity tests
  state/
    ParameciumState.ts     CREATE  Zustand (phase, viewMode, selectedOrganelleId, viewedOrganelleIds)
    ParameciumState.test.ts CREATE store tests
  ui/
    IntroScreen.tsx        CREATE  staged intro
    OrganelleRail.tsx      CREATE  9 chips + "вивчено N/9" (cell view only)
    InfoCard.tsx           CREATE  selected organelle label + facts + close
    HUD.tsx                CREATE  back link + "← краплина" + rail + info card + badge
  scene/
    life.ts                CREATE  dampAlpha + ELLIPSOID consts
    Environment.tsx        CREATE  water bg, drifting particles, faint microbes, lights
    Cilia.tsx              CREATE  instanced beating cilia
    Organelles.tsx         CREATE  blob/pair/funnel organelles + trichocyst dots; hover/select/highlight/pulse
    Cell.tsx               CREATE  glass body + swim + dive scale + click→enterCell; mounts Cilia + Organelles
    ParameciumScene.tsx    CREATE  Canvas + Environment + Cell + OrbitControls + HUD + Loader
  index.tsx                CREATE  ParameciumLab phase machine + lab definition
```

**Conventions (verified in repo):** Zustand `create<T>((set,get)=>({...}))`; `Button` props `{onClick,variant?,children,disabled?,fullWidth?,title?}`; `useViewport():{breakpoint:'desktop'|'tablet'|'phone'}`; `useReducedMotion():boolean`; `isWebGLAvailable()`; lazy route pattern already used in `App.tsx` for `BenchmarkScene` and the anatomy lab.

---

### Task 1: Deployable quality spike (procedural cell in water)

**Files:**
- Create: `src/labs/paramecium/ParameciumSpike.tsx`
- Modify: `src/app/App.tsx`

**Context:** A self-contained, throwaway scene to validate the procedural 3D look on prod BEFORE building the full lab (the anatomy lesson). No state, no interaction — just a living Paramecium drifting in pond water, auto-rotating. Route `/biology/paramecium-spike`. Deleted in Task 12. No unit test (R3F; verified by build + the user's prod smoke).

- [ ] **Step 1: Create `src/labs/paramecium/ParameciumSpike.tsx`**

```tsx
import { Suspense, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Environment as DreiEnvironment, Loader } from '@react-three/drei'
import {
  ACESFilmicToneMapping, Group, InstancedMesh, Object3D, Vector3, Points,
  BufferGeometry, Float32BufferAttribute,
} from 'three'

/** QUALITY SPIKE — not the final lab. Procedural Paramecium drifting in pond water. */
const A = 1.5, B = 0.75, C = 0.6
const UP = new Vector3(0, 1, 0)
const CILIA = 420

function Cilia() {
  const ref = useRef<InstancedMesh>(null)
  const dummy = useMemo(() => new Object3D(), [])
  const data = useMemo(() => {
    const pts: Vector3[] = [], nrm: Vector3[] = [], ph: number[] = []
    const golden = Math.PI * (3 - Math.sqrt(5))
    for (let i = 0; i < CILIA; i++) {
      const y = 1 - (i / (CILIA - 1)) * 2
      const r = Math.sqrt(Math.max(0, 1 - y * y))
      const th = golden * i
      const sx = Math.cos(th) * r, sy = y, sz = Math.sin(th) * r
      pts.push(new Vector3(sx * A, sy * B, sz * C))
      nrm.push(new Vector3(sx / A, sy / B, sz / C).normalize())
      ph.push(sx)
    }
    return { pts, nrm, ph }
  }, [])
  useFrame((state) => {
    const m = ref.current
    if (!m) return
    const t = state.clock.elapsedTime
    for (let i = 0; i < CILIA; i++) {
      dummy.position.copy(data.pts[i]).addScaledVector(data.nrm[i], 0.06)
      dummy.quaternion.setFromUnitVectors(UP, data.nrm[i])
      dummy.rotateX(Math.sin(t * 6 + data.ph[i] * 3) * 0.5)
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
    }
    m.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, CILIA]}>
      <coneGeometry args={[0.018, 0.13, 5]} />
      <meshStandardMaterial color="#bfeee2" transparent opacity={0.85} />
    </instancedMesh>
  )
}

function Blob({ p, r, color, scale }: { p: [number, number, number]; r: number; color: string; scale?: [number, number, number] }) {
  return (
    <mesh position={p} scale={scale}>
      <sphereGeometry args={[r, 24, 20]} />
      <meshStandardMaterial color={color} roughness={0.5} transparent opacity={0.85} />
    </mesh>
  )
}

function Cell() {
  const g = useRef<Group>(null)
  useFrame((state, dt) => {
    if (!g.current) return
    const t = state.clock.elapsedTime
    g.current.position.set(Math.sin(t * 0.3) * 0.4, Math.cos(t * 0.23) * 0.25, Math.sin(t * 0.17) * 0.2)
    g.current.rotation.z = Math.sin(t * 0.2) * 0.15
    g.current.rotation.y += dt * 0.15
  })
  return (
    <group ref={g}>
      <mesh scale={[A, B, C]}>
        <sphereGeometry args={[1, 64, 48]} />
        <meshPhysicalMaterial color="#9fe6d8" transparent opacity={0.22} roughness={0.12} clearcoat={0.6} clearcoatRoughness={0.25} ior={1.33} depthWrite={false} />
      </mesh>
      <Cilia />
      {/* macronucleus + micronucleus */}
      <Blob p={[0.1, 0, 0]} r={0.3} color="#f0be78" scale={[1.4, 0.9, 0.9]} />
      <Blob p={[0.45, 0.15, 0.05]} r={0.1} color="#caa06e" />
      {/* contractile vacuoles */}
      <Blob p={[-0.9, 0.25, 0]} r={0.18} color="#9ccdf2" />
      <Blob p={[0.95, -0.1, 0]} r={0.18} color="#9ccdf2" />
      {/* food vacuoles */}
      <Blob p={[-0.3, -0.2, 0.2]} r={0.13} color="#a7c46a" />
      <Blob p={[0.5, 0.2, -0.2]} r={0.13} color="#a7c46a" />
      <Blob p={[0.8, -0.2, 0.15]} r={0.13} color="#a7c46a" />
      {/* oral groove (funnel) */}
      <mesh position={[-0.2, -0.55, 0.3]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.22, 0.4, 20, 1, true]} />
        <meshStandardMaterial color="#7fc8c0" roughness={0.4} transparent opacity={0.6} side={2} />
      </mesh>
    </group>
  )
}

function Particles() {
  const ref = useRef<Points>(null)
  const geo = useMemo(() => {
    const N = 240, arr: number[] = []
    for (let i = 0; i < N; i++) arr.push((Math.random() - 0.5) * 14, (Math.random() - 0.5) * 9, (Math.random() - 0.5) * 8)
    const g = new BufferGeometry()
    g.setAttribute('position', new Float32BufferAttribute(arr, 3))
    return g
  }, [])
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.y += dt * 0.02 })
  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial color="#bfeee8" size={0.05} sizeAttenuation transparent opacity={0.5} />
    </points>
  )
}

export function ParameciumSpike() {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(ellipse at 50% 35%, #11383d 0%, #0a1c26 55%, #06121a 100%)' }}>
      <Canvas dpr={[1, 2]} camera={{ position: [0, 0.5, 5.5], fov: 45 }} gl={{ toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1.1 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[4, 6, 5]} intensity={1.2} />
        <directionalLight position={[-5, -2, -3]} intensity={0.4} color="#9fd8ff" />
        <Suspense fallback={null}>
          <Cell />
          <Particles />
          <DreiEnvironment preset="city" environmentIntensity={0.4} />
        </Suspense>
        <OrbitControls makeDefault enableDamping autoRotate autoRotateSpeed={0.5} minDistance={2} maxDistance={11} />
      </Canvas>
      <div style={{ position: 'fixed', top: 18, left: 18, maxWidth: 400, color: '#EAF6F4', fontFamily: 'Inter, system-ui, sans-serif', pointerEvents: 'none' }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>Інфузорія-туфелька · spike</div>
        <div style={{ fontSize: 13, color: '#9fc4c0', marginTop: 5, lineHeight: 1.5 }}>
          Процедурна клітина в краплині води: скляне тіло, війки, що б'ються, органели. Перевірка 3D-якості, не фінальна лаба.
        </div>
      </div>
      <Loader />
    </div>
  )
}
```

- [ ] **Step 2: Add the spike route in `src/app/App.tsx`**

Add the import after the existing anatomy import:

```tsx
import { ParameciumSpike } from '../labs/paramecium/ParameciumSpike'
```

Add the route after the `/biology/anatomy` route:

```tsx
        <Route path="/biology/paramecium-spike" element={<ParameciumSpike />} />
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: `tsc` + `vite build` succeed, zero errors.

- [ ] **Step 4: Commit**

```bash
git add src/labs/paramecium/ParameciumSpike.tsx src/app/App.tsx
git commit -m "spike(paramecium): procedural cell-in-water quality spike (/biology/paramecium-spike)"
```

- [ ] **Step 5: STOP for the quality gate**

Report DONE_WITH_CONCERNS noting this is the visual-quality gate: the controller must deploy (push master) and have the user judge `/biology/paramecium-spike` on prod before continuing. If the user requests look changes (material, cilia density/beat, lighting, environment), iterate THIS file before proceeding to Task 2.

---

### Task 2: Organelle content data (`organelles.ts`)

**Files:**
- Create: `src/labs/paramecium/content/organelles.ts`
- Test: `src/labs/paramecium/content/organelles.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/labs/paramecium/content/organelles.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { ORGANELLES, ORGANELLE_IDS } from './organelles'

describe('ORGANELLES data', () => {
  it('has the nine expected organelles in order', () => {
    expect(ORGANELLES).toHaveLength(9)
    expect(ORGANELLE_IDS).toEqual([
      'cilia', 'pellicle', 'oral', 'foodVacuoles', 'contractileVacuoles',
      'macronucleus', 'micronucleus', 'trichocysts', 'analPore',
    ])
  })

  it('has unique ids and hex colours and ≥1 non-empty fact each', () => {
    expect(new Set(ORGANELLES.map(o => o.id)).size).toBe(9)
    for (const o of ORGANELLES) {
      expect(o.color).toMatch(/^#[0-9a-fA-F]{6}$/)
      expect(o.label.length).toBeGreaterThan(0)
      expect(o.facts.length).toBeGreaterThanOrEqual(1)
      for (const f of o.facts) expect(f.trim().length).toBeGreaterThan(0)
    }
  })

  it('non-layer organelles have at least one position; layer organelles have none', () => {
    for (const o of ORGANELLES) {
      if (o.kind === 'layer') expect(o.positions).toBeUndefined()
      else expect(o.positions && o.positions.length).toBeGreaterThan(0)
    }
  })
})
```

- [ ] **Step 2: Run it, confirm it fails**

Run: `npx vitest run src/labs/paramecium/content/organelles.test.ts`
Expected: FAIL — cannot resolve `./organelles`.

- [ ] **Step 3: Implement `src/labs/paramecium/content/organelles.ts`**

```ts
export type OrganelleId =
  | 'cilia' | 'pellicle' | 'oral' | 'foodVacuoles' | 'contractileVacuoles'
  | 'macronucleus' | 'micronucleus' | 'trichocysts' | 'analPore'

export type OrganelleKind = 'layer' | 'blob' | 'pair' | 'funnel'

export interface OrganelleDef {
  id: OrganelleId
  label: string
  color: string
  kind: OrganelleKind
  /** Render points in the cell's local frame (A=1.5,B=0.75,C=0.6). Omitted for `layer`. */
  positions?: [number, number, number][]
  /** Sphere radius for blob/pair points. */
  radius?: number
  /** Optional ellipsoid scale for a blob (e.g. macronucleus). */
  scale?: [number, number, number]
  facts: string[]
}

export const ORGANELLES: OrganelleDef[] = [
  {
    id: 'cilia', label: 'Війки', color: '#bfeee2', kind: 'layer',
    facts: ['Тонкі волоски по всьому тілу. Б’ються хвилями — клітина пливе, а ще вони женуть бактерій до рота.'],
  },
  {
    id: 'pellicle', label: 'Пелікула', color: '#9fe6d8', kind: 'layer',
    facts: ['Щільна еластична оболонка. Тримає сталу форму «туфельки» й захищає клітину.'],
  },
  {
    id: 'oral', label: 'Клітинний рот і глотка', color: '#7fc8c0', kind: 'funnel',
    positions: [[-0.2, -0.55, 0.3]], radius: 0.18,
    facts: ['Заглибина з війками заганяє бактерій у глотку, де утворюється травна вакуоля.'],
  },
  {
    id: 'foodVacuoles', label: 'Травні вакуолі', color: '#a7c46a', kind: 'blob',
    positions: [[-0.3, -0.2, 0.2], [0.5, 0.2, -0.2], [0.8, -0.2, 0.15], [-0.1, 0.3, -0.1]], radius: 0.13,
    facts: ['Пухирці, що перетравлюють спійманих бактерій і всмоктують поживні речовини.'],
  },
  {
    id: 'contractileVacuoles', label: 'Скоротливі вакуолі', color: '#9ccdf2', kind: 'pair',
    positions: [[-0.9, 0.25, 0], [0.95, -0.1, 0]], radius: 0.18,
    facts: ['Дві «помпи» — спереду й ззаду. Відкачують зайву воду, щоб клітина не луснула.'],
  },
  {
    id: 'macronucleus', label: 'Макронуклеус', color: '#f0be78', kind: 'blob',
    positions: [[0.1, 0, 0]], radius: 0.3, scale: [1.4, 0.9, 0.9],
    facts: ['Велике ядро. Керує повсякденним життям клітини: рухом, живленням, виділенням.'],
  },
  {
    id: 'micronucleus', label: 'Мікронуклеус', color: '#caa06e', kind: 'blob',
    positions: [[0.45, 0.15, 0.05]], radius: 0.1,
    facts: ['Мале ядро. Зберігає спадкову інформацію — головне для розмноження.'],
  },
  {
    id: 'trichocysts', label: 'Трихоцисти', color: '#dfeaf2', kind: 'layer',
    facts: ['Захисні «стріли» під оболонкою. Вистрілюють назовні, коли клітину турбують.'],
  },
  {
    id: 'analPore', label: 'Порошиця', color: '#8fb0a8', kind: 'blob',
    positions: [[1.0, -0.1, 0]], radius: 0.08,
    facts: ['Отвір ззаду, через який викидаються неперетравлені рештки їжі.'],
  },
]

export const ORGANELLE_IDS: OrganelleId[] = ORGANELLES.map(o => o.id)

export function getOrganelle(id: OrganelleId): OrganelleDef {
  const o = ORGANELLES.find(x => x.id === id)
  if (!o) throw new Error(`Unknown organelle id: ${id}`)
  return o
}
```

- [ ] **Step 4: Run the test, confirm it passes**

Run: `npx vitest run src/labs/paramecium/content/organelles.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/labs/paramecium/content/organelles.ts src/labs/paramecium/content/organelles.test.ts
git commit -m "feat(paramecium): organelle content data + facts"
```

---

### Task 3: Paramecium state store (`ParameciumState.ts`)

**Files:**
- Create: `src/labs/paramecium/state/ParameciumState.ts`
- Test: `src/labs/paramecium/state/ParameciumState.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/labs/paramecium/state/ParameciumState.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useParameciumState } from './ParameciumState'

const get = () => useParameciumState.getState()
beforeEach(() => get().reset())

describe('ParameciumState', () => {
  it('starts in intro, environment view, nothing selected/viewed', () => {
    expect(get().phase).toBe('intro')
    expect(get().viewMode).toBe('environment')
    expect(get().selectedOrganelleId).toBeNull()
    expect(get().viewedOrganelleIds).toEqual([])
  })

  it('start() → in-progress (still environment)', () => {
    get().start()
    expect(get().phase).toBe('in-progress')
    expect(get().viewMode).toBe('environment')
  })

  it('enterCell() switches to cell view; exitToEnvironment() returns and clears selection', () => {
    get().enterCell()
    expect(get().viewMode).toBe('cell')
    get().select('macronucleus')
    get().exitToEnvironment()
    expect(get().viewMode).toBe('environment')
    expect(get().selectedOrganelleId).toBeNull()
  })

  it('select() sets selection, records viewed, and forces cell view', () => {
    get().select('cilia')
    expect(get().selectedOrganelleId).toBe('cilia')
    expect(get().viewMode).toBe('cell')
    expect(get().viewedOrganelleIds).toEqual(['cilia'])
  })

  it('re-selecting dedupes; switching grows the viewed set', () => {
    get().select('cilia')
    get().deselect()
    get().select('cilia')
    get().select('oral')
    expect(get().viewedOrganelleIds).toEqual(['cilia', 'oral'])
    expect(get().selectedOrganelleId).toBe('oral')
  })

  it('deselect() clears selection but keeps view + viewed', () => {
    get().select('oral')
    get().deselect()
    expect(get().selectedOrganelleId).toBeNull()
    expect(get().viewMode).toBe('cell')
    expect(get().viewedOrganelleIds).toEqual(['oral'])
  })

  it('reset() restores the initial state', () => {
    get().start(); get().select('analPore'); get().reset()
    expect(get().phase).toBe('intro')
    expect(get().viewMode).toBe('environment')
    expect(get().selectedOrganelleId).toBeNull()
    expect(get().viewedOrganelleIds).toEqual([])
  })
})
```

- [ ] **Step 2: Run it, confirm it fails**

Run: `npx vitest run src/labs/paramecium/state/ParameciumState.test.ts`
Expected: FAIL — cannot resolve `./ParameciumState`.

- [ ] **Step 3: Implement `src/labs/paramecium/state/ParameciumState.ts`**

```ts
import { create } from 'zustand'
import type { OrganelleId } from '../content/organelles'

export type ParameciumPhase = 'intro' | 'in-progress'
export type ViewMode = 'environment' | 'cell'

type ParameciumState = {
  phase: ParameciumPhase
  viewMode: ViewMode
  selectedOrganelleId: OrganelleId | null
  viewedOrganelleIds: OrganelleId[]
  start: () => void
  enterCell: () => void
  exitToEnvironment: () => void
  select: (id: OrganelleId) => void
  deselect: () => void
  reset: () => void
}

export const useParameciumState = create<ParameciumState>((set, get) => ({
  phase: 'intro',
  viewMode: 'environment',
  selectedOrganelleId: null,
  viewedOrganelleIds: [],

  start: () => set({ phase: 'in-progress' }),

  enterCell: () => set({ viewMode: 'cell' }),

  exitToEnvironment: () => set({ viewMode: 'environment', selectedOrganelleId: null }),

  select: (id) => {
    const { viewedOrganelleIds } = get()
    const viewed = viewedOrganelleIds.includes(id) ? viewedOrganelleIds : [...viewedOrganelleIds, id]
    set({ selectedOrganelleId: id, viewMode: 'cell', viewedOrganelleIds: viewed })
  },

  deselect: () => set({ selectedOrganelleId: null }),

  reset: () => set({ phase: 'intro', viewMode: 'environment', selectedOrganelleId: null, viewedOrganelleIds: [] }),
}))
```

- [ ] **Step 4: Run the test, confirm it passes**

Run: `npx vitest run src/labs/paramecium/state/ParameciumState.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/labs/paramecium/state/ParameciumState.ts src/labs/paramecium/state/ParameciumState.test.ts
git commit -m "feat(paramecium): view-mode + organelle-selection state store"
```

---

### Task 4: IntroScreen

**Files:**
- Create: `src/labs/paramecium/ui/IntroScreen.tsx`

(No unit test — presentational; verified by build. Mirrors the brownian/anatomy intro.)

- [ ] **Step 1: Implement `src/labs/paramecium/ui/IntroScreen.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { useParameciumState } from '../state/ParameciumState'
import { Button } from '../../../sdk/ui/Button'
import { useViewport } from '../../../sdk/a11y/useViewport'

export function IntroScreen() {
  const start = useParameciumState(s => s.start)
  const [stage, setStage] = useState(0)
  const { breakpoint } = useViewport()
  const isPhone = breakpoint === 'phone'

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
      background: 'linear-gradient(180deg, #eafaf7 0%, #bcd9d3 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      color: '#10302c', padding: 32,
      fontFamily: '"SF Pro Display", "Inter", system-ui, sans-serif',
    }}>
      <div style={{
        opacity: stage >= 1 ? 1 : 0, transform: stage >= 1 ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 600ms ease, transform 600ms ease',
        fontSize: isPhone ? 34 : 56, fontWeight: 200, letterSpacing: -1.5, marginBottom: 8, textAlign: 'center',
      }}>Біологія</div>
      <div style={{
        opacity: stage >= 2 ? 1 : 0, transform: stage >= 2 ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 600ms ease, transform 600ms ease',
        fontSize: isPhone ? 22 : 32, fontWeight: 400, color: '#0e9c87', marginBottom: 40, textAlign: 'center',
      }}>Інфузорія-туфелька</div>
      <div style={{
        opacity: stage >= 3 ? 1 : 0, transform: stage >= 3 ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 800ms ease, transform 800ms ease',
        fontSize: 17, color: '#3c5a54', maxWidth: 620, textAlign: 'center', lineHeight: 1.55, marginBottom: 48,
      }}>
        У краплині ставкової води живе одноклітинна істота. Натисни на неї, щоб зазирнути
        всередину, і дізнайся, з яких частин складається ця крихітна клітина.
      </div>
      <div style={{
        opacity: stage >= 4 ? 1 : 0, transform: stage >= 4 ? 'scale(1)' : 'scale(0.9)',
        transition: 'opacity 400ms ease, transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}>
        <Button onClick={start}>Зануритись у краплину</Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: succeeds (file not yet imported).

- [ ] **Step 3: Commit**

```bash
git add src/labs/paramecium/ui/IntroScreen.tsx
git commit -m "feat(paramecium): intro screen"
```

---

### Task 5: Scene constants + Environment

**Files:**
- Create: `src/labs/paramecium/scene/life.ts`
- Create: `src/labs/paramecium/scene/Environment.tsx`

(No unit test — helpers + R3F; verified by build.)

- [ ] **Step 1: Implement `src/labs/paramecium/scene/life.ts`**

```ts
/** Cell ellipsoid radii (long axis = X). Shared by Cell, Cilia, Organelles. */
export const A = 1.5
export const B = 0.75
export const C = 0.6

/** Frame-rate-independent damping alpha for lerping toward a target. */
export function dampAlpha(dt: number, smoothing = 6): number {
  return 1 - Math.exp(-smoothing * Math.max(dt, 0))
}
```

- [ ] **Step 2: Implement `src/labs/paramecium/scene/Environment.tsx`**

```tsx
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Points, BufferGeometry, Float32BufferAttribute } from 'three'
import { useReducedMotion } from '../../../sdk/a11y/useReducedMotion'

function Particles() {
  const ref = useRef<Points>(null)
  const reduced = useReducedMotion()
  const geo = useMemo(() => {
    const N = 260, arr: number[] = []
    for (let i = 0; i < N; i++) arr.push((Math.random() - 0.5) * 15, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 9)
    const g = new BufferGeometry()
    g.setAttribute('position', new Float32BufferAttribute(arr, 3))
    return g
  }, [])
  useFrame((_, dt) => { if (ref.current && !reduced) ref.current.rotation.y += dt * 0.02 })
  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial color="#bfeee8" size={0.05} sizeAttenuation transparent opacity={0.5} depthWrite={false} />
    </points>
  )
}

/** A faint background microbe silhouette for a sense of life. */
function Microbe({ position }: { position: [number, number, number] }) {
  return (
    <mesh position={position} rotation={[0, 0, 0.5]} scale={[1, 0.5, 0.5]}>
      <sphereGeometry args={[1, 16, 12]} />
      <meshBasicMaterial color="#7fb8b2" wireframe transparent opacity={0.12} />
    </mesh>
  )
}

export function Environment() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[4, 6, 5]} intensity={1.2} />
      <directionalLight position={[-5, -2, -3]} intensity={0.4} color="#9fd8ff" />
      <fog attach="fog" args={['#0a1c26', 8, 20]} />
      <Particles />
      <Microbe position={[-6, 2, -4]} />
      <Microbe position={[7, -2.5, -5]} />
    </>
  )
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/labs/paramecium/scene/life.ts src/labs/paramecium/scene/Environment.tsx
git commit -m "feat(paramecium): scene constants + water environment (particles, microbes, lights)"
```

---

### Task 6: Cilia (instanced beating cilia)

**Files:**
- Create: `src/labs/paramecium/scene/Cilia.tsx`

(No unit test — R3F instancing; verified by build + smoke.)

**Context:** Many short cones on the ellipsoid surface, oriented along the surface normal, beating with a metachronal sine wave. Highlights (emissive) when its `highlighted` prop is true (organelle id `cilia` selected). Beat is gated by reduced motion.

- [ ] **Step 1: Implement `src/labs/paramecium/scene/Cilia.tsx`**

```tsx
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { InstancedMesh, Object3D, Vector3, MeshStandardMaterial } from 'three'
import { useReducedMotion } from '../../../sdk/a11y/useReducedMotion'
import { A, B, C } from './life'

const COUNT = 420
const UP = new Vector3(0, 1, 0)

export function Cilia({ highlighted }: { highlighted: boolean }) {
  const ref = useRef<InstancedMesh>(null)
  const reduced = useReducedMotion()
  const dummy = useMemo(() => new Object3D(), [])
  const mat = useMemo(
    () => new MeshStandardMaterial({ color: '#bfeee2', transparent: true, opacity: 0.85 }),
    [],
  )
  const data = useMemo(() => {
    const pts: Vector3[] = [], nrm: Vector3[] = [], ph: number[] = []
    const golden = Math.PI * (3 - Math.sqrt(5))
    for (let i = 0; i < COUNT; i++) {
      const y = 1 - (i / (COUNT - 1)) * 2
      const r = Math.sqrt(Math.max(0, 1 - y * y))
      const th = golden * i
      const sx = Math.cos(th) * r, sy = y, sz = Math.sin(th) * r
      pts.push(new Vector3(sx * A, sy * B, sz * C))
      nrm.push(new Vector3(sx / A, sy / B, sz / C).normalize())
      ph.push(sx)
    }
    return { pts, nrm, ph }
  }, [])

  useFrame((state) => {
    const m = ref.current
    if (!m) return
    const t = state.clock.elapsedTime
    for (let i = 0; i < COUNT; i++) {
      dummy.position.copy(data.pts[i]).addScaledVector(data.nrm[i], 0.06)
      dummy.quaternion.setFromUnitVectors(UP, data.nrm[i])
      if (!reduced) dummy.rotateX(Math.sin(t * 6 + data.ph[i] * 3) * 0.5)
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
    }
    m.instanceMatrix.needsUpdate = true
    mat.color.set(highlighted ? '#eafffb' : '#bfeee2')
    mat.emissive.set(highlighted ? '#5FE3D0' : '#000000')
    mat.emissiveIntensity = highlighted ? 0.6 : 0
  })

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, COUNT]} material={mat}>
      <coneGeometry args={[0.018, 0.13, 5]} />
    </instancedMesh>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: succeeds. (Note: `instancedMesh` with a `material` prop + a child geometry is valid in R3F.)

- [ ] **Step 3: Commit**

```bash
git add src/labs/paramecium/scene/Cilia.tsx
git commit -m "feat(paramecium): instanced beating cilia"
```

---

### Task 7: Organelles (blobs + pulse + select/highlight)

**Files:**
- Create: `src/labs/paramecium/scene/Organelles.tsx`

(No unit test — R3F; verified by build + smoke.)

**Context:** Renders the non-layer organelles (blob/pair/funnel) as meshes at their `positions`, plus a sparse `trichocysts` dot layer. Each organelle group is hover/click → `select(id)`. The selected organelle glows (emissive) and pulses; contractile vacuoles always gently pulse. Highlight + dim is driven by the store's `selectedOrganelleId`. Uses drei `useCursor`.

- [ ] **Step 1: Implement `src/labs/paramecium/scene/Organelles.tsx`**

```tsx
import { useMemo, useRef, useState } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { useFrame } from '@react-three/fiber'
import { useCursor } from '@react-three/drei'
import { Group, Color, MeshStandardMaterial } from 'three'
import { ORGANELLES, type OrganelleDef, type OrganelleId } from '../content/organelles'
import { useParameciumState } from '../state/ParameciumState'
import { useReducedMotion } from '../../../sdk/a11y/useReducedMotion'

const POINT_ORGANELLES = ORGANELLES.filter(o => o.kind !== 'layer')

function OrganelleGroup({ def }: { def: OrganelleDef }) {
  const selectedId = useParameciumState(s => s.selectedOrganelleId)
  const select = useParameciumState(s => s.select)
  const viewMode = useParameciumState(s => s.viewMode)
  const reduced = useReducedMotion()
  const [hovered, setHovered] = useState(false)
  useCursor(hovered && viewMode === 'cell')

  const ref = useRef<Group>(null)
  const isSelected = selectedId === def.id
  const anySelected = selectedId !== null
  const mat = useMemo(() => new MeshStandardMaterial({
    color: def.color, roughness: 0.5, transparent: true, opacity: 0.9,
    emissive: new Color(def.color), emissiveIntensity: 0,
  }), [def.color])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    // emissive on select; dim others
    mat.emissiveIntensity = isSelected ? 0.5 : (hovered && !anySelected && viewMode === 'cell' ? 0.25 : 0)
    mat.opacity = anySelected && !isSelected ? 0.25 : 0.9
    // pulse: contractile vacuoles always; selected organelle gently
    const g = ref.current
    if (g) {
      const pulse = def.id === 'contractileVacuoles' && !reduced ? 1 + Math.sin(t * 2) * 0.08
        : isSelected && !reduced ? 1 + Math.sin(t * 4) * 0.05 : 1
      g.scale.setScalar(pulse)
    }
  })

  const onOver = (e: ThreeEvent<PointerEvent>) => { if (viewMode === 'cell') { e.stopPropagation(); setHovered(true) } }
  const onOut = () => setHovered(false)
  const onDown = (e: ThreeEvent<PointerEvent>) => { if (viewMode === 'cell') { e.stopPropagation(); select(def.id) } }

  return (
    <group ref={ref}>
      {(def.positions ?? []).map((p, i) => (
        <mesh key={i} position={p} scale={def.scale} material={mat} onPointerOver={onOver} onPointerOut={onOut} onPointerDown={onDown}>
          {def.kind === 'funnel'
            ? <coneGeometry args={[def.radius ?? 0.18, 0.4, 20, 1, true]} />
            : <sphereGeometry args={[def.radius ?? 0.12, 24, 20]} />}
        </mesh>
      ))}
    </group>
  )
}

/** Sparse dots just under the pellicle; glow when trichocysts are selected. */
function Trichocysts() {
  const selectedId = useParameciumState(s => s.selectedOrganelleId)
  const on = selectedId === 'trichocysts'
  const dots = useMemo(() => {
    const out: [number, number, number][] = []
    const golden = Math.PI * (3 - Math.sqrt(5))
    for (let i = 0; i < 60; i++) {
      const y = 1 - (i / 59) * 2, r = Math.sqrt(Math.max(0, 1 - y * y)), th = golden * i
      out.push([Math.cos(th) * r * 1.42, y * 0.71, Math.sin(th) * r * 0.57])
    }
    return out
  }, [])
  return (
    <group>
      {dots.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.03, 8, 8]} />
          <meshStandardMaterial color="#dfeaf2" emissive={on ? '#5FE3D0' : '#000000'} emissiveIntensity={on ? 0.8 : 0} transparent opacity={on ? 0.95 : 0.45} />
        </mesh>
      ))}
    </group>
  )
}

export function Organelles() {
  return (
    <>
      {POINT_ORGANELLES.map(def => <OrganelleGroup key={def.id} def={def} />)}
      <Trichocysts />
    </>
  )
}

// re-export so Cell can highlight layer organelles by id without importing content twice
export type { OrganelleId }
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/labs/paramecium/scene/Organelles.tsx
git commit -m "feat(paramecium): organelle blobs with select/highlight/pulse + trichocyst layer"
```

---

### Task 8: Cell (glass body + swim + dive-in)

**Files:**
- Create: `src/labs/paramecium/scene/Cell.tsx`

(No unit test — R3F; verified by build + smoke.)

**Context:** The cell `<group>` holds the glass ellipsoid body + `<Cilia>` + `<Organelles>`. In `environment` mode it gently swims and the whole body is click → `enterCell`. In `cell` mode it eases to centre + scales up + the body clarifies (lower opacity) so organelles read. The body (pellicle) glows when `pellicle` is the selected organelle. All motion gated by reduced motion.

- [ ] **Step 1: Implement `src/labs/paramecium/scene/Cell.tsx`**

```tsx
import { useMemo, useRef, useState } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { useFrame } from '@react-three/fiber'
import { useCursor } from '@react-three/drei'
import { Group, Vector3, MeshPhysicalMaterial, Color, DoubleSide } from 'three'
import { useParameciumState } from '../state/ParameciumState'
import { useReducedMotion } from '../../../sdk/a11y/useReducedMotion'
import { A, B, C, dampAlpha } from './life'
import { Cilia } from './Cilia'
import { Organelles } from './Organelles'

const ZERO = new Vector3(0, 0, 0)

export function Cell() {
  const viewMode = useParameciumState(s => s.viewMode)
  const selectedId = useParameciumState(s => s.selectedOrganelleId)
  const enterCell = useParameciumState(s => s.enterCell)
  const reduced = useReducedMotion()
  const [hovered, setHovered] = useState(false)
  useCursor(hovered && viewMode === 'environment')

  const groupRef = useRef<Group>(null)
  const bodyMat = useMemo(() => new MeshPhysicalMaterial({
    color: '#9fe6d8', transparent: true, opacity: 0.22, roughness: 0.12, metalness: 0,
    clearcoat: 0.6, clearcoatRoughness: 0.25, ior: 1.33, side: DoubleSide, depthWrite: false,
    emissive: new Color('#5FE3D0'), emissiveIntensity: 0,
  }), [])

  useFrame((state, dt) => {
    const g = groupRef.current
    if (!g) return
    const a = reduced ? 1 : dampAlpha(dt)
    const inCell = viewMode === 'cell'
    // dive: scale + clarify
    const targetScale = inCell ? 1.6 : 1
    g.scale.setScalar(g.scale.x + (targetScale - g.scale.x) * a)
    const targetOpacity = inCell ? (selectedId ? 0.1 : 0.16) : 0.22
    bodyMat.opacity += (targetOpacity - bodyMat.opacity) * a
    // pellicle highlight
    bodyMat.emissiveIntensity += ((selectedId === 'pellicle' ? 0.5 : 0) - bodyMat.emissiveIntensity) * a
    // motion
    if (!inCell && !reduced) {
      const t = state.clock.elapsedTime
      g.position.set(Math.sin(t * 0.3) * 0.4, Math.cos(t * 0.23) * 0.25, Math.sin(t * 0.17) * 0.2)
      g.rotation.z = Math.sin(t * 0.2) * 0.15
      g.rotation.y += dt * 0.15
    } else if (inCell) {
      g.position.lerp(ZERO, a)
    }
  })

  return (
    <group ref={groupRef}>
      <mesh
        material={bodyMat}
        scale={[A, B, C]}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => { if (viewMode === 'environment') { e.stopPropagation(); setHovered(true) } }}
        onPointerOut={() => setHovered(false)}
        onPointerDown={(e: ThreeEvent<PointerEvent>) => { if (viewMode === 'environment') { e.stopPropagation(); enterCell() } }}
      >
        <sphereGeometry args={[1, 64, 48]} />
      </mesh>
      <Cilia highlighted={selectedId === 'cilia'} />
      <Organelles />
    </group>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/labs/paramecium/scene/Cell.tsx
git commit -m "feat(paramecium): glass cell body with swim + dive-in + pellicle highlight"
```

---

### Task 9: Overlay UI — OrganelleRail, InfoCard, HUD

**Files:**
- Create: `src/labs/paramecium/ui/OrganelleRail.tsx`
- Create: `src/labs/paramecium/ui/InfoCard.tsx`
- Create: `src/labs/paramecium/ui/HUD.tsx`

(No unit test — presentational; verified by build.)

- [ ] **Step 1: Implement `src/labs/paramecium/ui/OrganelleRail.tsx`**

```tsx
import type { CSSProperties } from 'react'
import { ORGANELLES } from '../content/organelles'
import { useParameciumState } from '../state/ParameciumState'
import { useViewport } from '../../../sdk/a11y/useViewport'

export function OrganelleRail() {
  const viewMode = useParameciumState(s => s.viewMode)
  const selectedId = useParameciumState(s => s.selectedOrganelleId)
  const viewed = useParameciumState(s => s.viewedOrganelleIds)
  const select = useParameciumState(s => s.select)
  const { breakpoint } = useViewport()
  const isPhone = breakpoint === 'phone'

  if (viewMode !== 'cell') return null

  const railStyle: CSSProperties = {
    position: 'fixed', zIndex: 5, display: 'flex', gap: 8, fontFamily: '"Inter", system-ui, sans-serif',
    ...(isPhone
      ? { left: 12, right: 12, bottom: 12, flexDirection: 'row', overflowX: 'auto', padding: 4 }
      : { left: 18, top: 96, flexDirection: 'column', width: 210 }),
  }
  const chip = (active: boolean): CSSProperties => ({
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
    padding: '11px 13px', borderRadius: 12, cursor: 'pointer', flex: isPhone ? '0 0 auto' : undefined,
    background: active ? 'rgba(220,255,250,0.95)' : 'rgba(255,255,255,0.07)',
    color: active ? '#0a2420' : '#EAF6F4', border: `1px solid ${active ? 'transparent' : 'rgba(150,230,220,0.18)'}`,
    backdropFilter: 'blur(20px)', fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap',
  })
  const progress: CSSProperties = {
    color: '#9fc4c0', fontSize: 12, fontWeight: 600, letterSpacing: '0.04em',
    padding: isPhone ? '8px 6px' : '0 4px 6px', alignSelf: isPhone ? 'center' : 'flex-start',
  }

  return (
    <nav style={railStyle} aria-label="Органели">
      {!isPhone && <div style={progress}>ВИВЧЕНО {viewed.length}/{ORGANELLES.length}</div>}
      {ORGANELLES.map(o => {
        const active = selectedId === o.id
        const isViewed = viewed.includes(o.id)
        return (
          <button key={o.id} type="button" onClick={() => select(o.id)} style={chip(active)} aria-pressed={active}
            aria-label={`Органела: ${o.label}${isViewed ? ', вивчено' : ''}`}>
            <span>{o.label}</span>
            <span aria-hidden style={{ opacity: isViewed ? 1 : 0.25 }}>{isViewed ? '✓' : '○'}</span>
          </button>
        )
      })}
      {isPhone && <div style={progress}>{viewed.length}/{ORGANELLES.length}</div>}
    </nav>
  )
}
```

- [ ] **Step 2: Implement `src/labs/paramecium/ui/InfoCard.tsx`**

```tsx
import type { CSSProperties } from 'react'
import { GlassPanel } from '../../../sdk/ui/GlassPanel'
import { Button } from '../../../sdk/ui/Button'
import { useViewport } from '../../../sdk/a11y/useViewport'
import { useParameciumState } from '../state/ParameciumState'
import { getOrganelle } from '../content/organelles'

export function InfoCard() {
  const selectedId = useParameciumState(s => s.selectedOrganelleId)
  const deselect = useParameciumState(s => s.deselect)
  const { breakpoint } = useViewport()
  const isPhone = breakpoint === 'phone'

  if (!selectedId) return null
  const o = getOrganelle(selectedId)

  const wrap: CSSProperties = {
    position: 'fixed', zIndex: 6,
    ...(isPhone ? { left: 12, right: 12, bottom: 84 } : { right: 18, top: 96, width: 360 }),
  }

  return (
    <div style={wrap}>
      <GlassPanel variant="strong" style={{ padding: 22 }} role="dialog" aria-label={o.label}>
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 12, fontFamily: '"Inter", system-ui, sans-serif' }}>{o.label}</div>
        <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {o.facts.map((f, i) => <li key={i} style={{ fontSize: 14, lineHeight: 1.5, color: '#3a3a3f' }}>{f}</li>)}
        </ul>
        <div style={{ marginTop: 18 }}>
          <Button variant="secondary" fullWidth onClick={deselect}>Закрити</Button>
        </div>
      </GlassPanel>
    </div>
  )
}
```

- [ ] **Step 3: Implement `src/labs/paramecium/ui/HUD.tsx`**

```tsx
import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { ORGANELLES } from '../content/organelles'
import { useParameciumState } from '../state/ParameciumState'
import { OrganelleRail } from './OrganelleRail'
import { InfoCard } from './InfoCard'

export function HUD() {
  const viewMode = useParameciumState(s => s.viewMode)
  const selectedId = useParameciumState(s => s.selectedOrganelleId)
  const viewed = useParameciumState(s => s.viewedOrganelleIds)
  const exit = useParameciumState(s => s.exitToEnvironment)
  const allViewed = viewed.length === ORGANELLES.length

  const pill: CSSProperties = {
    position: 'fixed', zIndex: 6, top: 18,
    color: 'rgba(234,246,244,0.8)', textDecoration: 'none', fontSize: 13,
    fontFamily: '"Inter", system-ui, sans-serif', fontWeight: 500, letterSpacing: '0.04em',
    padding: '8px 12px', borderRadius: 100, background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(150,230,220,0.16)', backdropFilter: 'blur(20px)', cursor: 'pointer',
  }
  const badge: CSSProperties = {
    position: 'fixed', zIndex: 6, top: 18, left: '50%', transform: 'translateX(-50%)',
    padding: '10px 18px', borderRadius: 100, background: 'rgba(95,227,208,0.16)',
    border: '1px solid rgba(95,227,208,0.4)', color: '#bdf4ea', fontSize: 13, fontWeight: 700,
    fontFamily: '"Inter", system-ui, sans-serif',
  }
  const credit: CSSProperties = {
    position: 'fixed', zIndex: 5, right: 14, bottom: 10, maxWidth: 220, textAlign: 'right',
    color: 'rgba(234,246,244,0.3)', fontSize: 10, lineHeight: 1.4,
    fontFamily: '"Inter", system-ui, sans-serif', pointerEvents: 'none',
  }

  return (
    <>
      {viewMode === 'cell'
        ? <button type="button" style={{ ...pill, left: 18 }} onClick={() => exit()} aria-label="Назад до краплини">← Краплина</button>
        : <Link to="/biology" style={{ ...pill, left: 18 }} aria-label="Назад до біології">← Біологія</Link>}
      {allViewed && !selectedId && <div style={badge}>Готово — ти вивчив усі частини 🎉</div>}
      <div style={credit}>Інфузорія-туфелька · процедурна 3D-модель · NOVA EVRIKA</div>
      <OrganelleRail />
      <InfoCard />
    </>
  )
}
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/labs/paramecium/ui/OrganelleRail.tsx src/labs/paramecium/ui/InfoCard.tsx src/labs/paramecium/ui/HUD.tsx
git commit -m "feat(paramecium): organelle rail, info card, HUD overlay"
```

---

### Task 10: ParameciumScene + lab entry + subject/route (lab live)

**Files:**
- Create: `src/labs/paramecium/scene/ParameciumScene.tsx`
- Create: `src/labs/paramecium/index.tsx`
- Modify: `src/site/content/subjects.ts`
- Modify: `src/app/App.tsx`

(No unit test for the R3F/composition; the subjects change is covered by extending the existing biology test — see Step 5.)

- [ ] **Step 1: Implement `src/labs/paramecium/scene/ParameciumScene.tsx`**

```tsx
import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment as DreiEnvironment, Loader } from '@react-three/drei'
import { ACESFilmicToneMapping } from 'three'
import { Environment } from './Environment'
import { Cell } from './Cell'
import { useParameciumState } from '../state/ParameciumState'
import { useReducedMotion } from '../../../sdk/a11y/useReducedMotion'
import { HUD } from '../ui/HUD'

export function ParameciumScene() {
  const viewMode = useParameciumState(s => s.viewMode)
  const reduced = useReducedMotion()
  const envMode = viewMode === 'environment'

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(ellipse at 50% 35%, #11383d 0%, #0a1c26 55%, #06121a 100%)' }}>
      <Canvas dpr={[1, 2]} camera={{ position: [0, 0.5, 5.5], fov: 45 }} gl={{ toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1.1 }}>
        <Suspense fallback={null}>
          <Environment />
          <Cell />
          <DreiEnvironment preset="city" environmentIntensity={0.4} />
        </Suspense>
        <OrbitControls
          makeDefault enableDamping target={[0, 0, 0]}
          autoRotate={envMode && !reduced} autoRotateSpeed={0.45}
          minDistance={2} maxDistance={11}
        />
      </Canvas>
      <HUD />
      <Loader />
    </div>
  )
}
```

- [ ] **Step 2: Implement `src/labs/paramecium/index.tsx`**

```tsx
import { useNavigate } from 'react-router-dom'
import { ParameciumScene } from './scene/ParameciumScene'
import { useParameciumState } from './state/ParameciumState'
import { IntroScreen } from './ui/IntroScreen'
import { isWebGLAvailable } from '../../sdk/scene/webgl'
import { WebGLUnsupported } from '../../sdk/ui/WebGLUnsupported'

export const parameciumLabDefinition = {
  id: 'paramecium',
  title: 'Інфузорія-туфелька',
}

export function ParameciumLab() {
  const phase = useParameciumState(s => s.phase)
  const navigate = useNavigate()
  const webglOk = isWebGLAvailable()

  return (
    <>
      {phase === 'intro' && <IntroScreen />}
      {phase === 'in-progress' && (webglOk
        ? <ParameciumScene />
        : <WebGLUnsupported onHome={() => navigate('/')} />
      )}
    </>
  )
}
```

- [ ] **Step 3: Add the lab to the biology subject in `src/site/content/subjects.ts`**

Inside the `biology` subject's `labs` array (after the existing `anatomy` entry), add:

```ts
      {
        id: 'paramecium',
        title: 'Інфузорія-туфелька',
        subtitle: 'Будова клітини · органели · мікросвіт',
        path: '/biology/paramecium',
        status: 'available',
      },
```

- [ ] **Step 4: Wire the lazy route in `src/app/App.tsx`**

Add a lazy declaration next to the other `lazy(...)` blocks:

```tsx
const ParameciumLab = lazy(() => import('../labs/paramecium').then(m => ({ default: m.ParameciumLab })))
```

Add the route after the `/biology/anatomy` route:

```tsx
        <Route
          path="/biology/paramecium"
          element={
            <Suspense fallback={<div style={{ position: 'fixed', inset: 0, background: '#06121a' }} />}>
              <ParameciumLab />
            </Suspense>
          }
        />
```

(Leave the `/biology/paramecium-spike` route from Task 1 in place — removed in Task 12. `lazy` + `Suspense` are already imported.)

- [ ] **Step 5: Extend the biology subjects test**

In `src/site/content/subjects.test.ts`, add a test asserting the paramecium lab exists:

```ts
  it('biology has the paramecium lab available', () => {
    const bio = findSubject('biology')
    const p = bio?.labs.find(l => l.id === 'paramecium')
    expect(p).toBeDefined()
    expect(p?.path).toBe('/biology/paramecium')
    expect(p?.status).toBe('available')
  })
```

- [ ] **Step 6: Verify gates**

Run: `npm run build` (expect success) and `npx vitest run src/labs/paramecium src/site/content/subjects.test.ts` (expect all pass).

- [ ] **Step 7: Commit**

```bash
git add src/labs/paramecium/scene/ParameciumScene.tsx src/labs/paramecium/index.tsx src/site/content/subjects.ts src/site/content/subjects.test.ts src/app/App.tsx
git commit -m "feat(paramecium): assemble scene + lab entry + biology subject entry + lazy route"
```

---

### Task 11: Full gates + browser smoke

**Files:** none (verification only).

- [ ] **Step 1: Type-check + build**

Run: `npm run build`
Expected: `tsc` (strict + noUnusedLocals) + vite build succeed; confirm a separate lazy `paramecium-*` chunk appears in the vite output.

- [ ] **Step 2: Scoped unit suite**

Run: `npx vitest run src/labs/paramecium src/site/content/subjects.test.ts`
Expected: organelles (3) + state (7) + subjects (3) pass.

- [ ] **Step 3: Dev smoke (desktop)**

Run `npm run dev`, open `/biology/paramecium`. Verify: intro → "Зануритись у краплину" → the cell drifts in water (cilia beat, vacuoles pulse, particles drift). Click the cell → it enlarges + clarifies (dive-in), rail "ВИВЧЕНО 0/9" appears. Click organelles (3D or rail) → highlight + pulse + info card; layer parts (війки/пелікула/трихоцисти) highlight via rail. "Закрити" + "← Краплина" work; rail fills to 9/9 → badge. "← Біологія" only in environment view.

- [ ] **Step 4: Responsive + reduced-motion smoke**

Phone width: rail = bottom strip, card above it. OS reduce-motion: no swim/beat/pulse/auto-rotate, dive-in is instant, app fully usable.

- [ ] **Step 5: Commit (only if fixes were needed)**

```bash
git add -A
git commit -m "test(paramecium): verification fixes from smoke"
```

---

### Task 12: Remove the quality spike

**Files:**
- Delete: `src/labs/paramecium/ParameciumSpike.tsx`
- Modify: `src/app/App.tsx`

- [ ] **Step 1: Delete + unwire**

```bash
git rm src/labs/paramecium/ParameciumSpike.tsx
```
In `src/app/App.tsx` remove the import `import { ParameciumSpike } from '../labs/paramecium/ParameciumSpike'` and the `<Route path="/biology/paramecium-spike" ... />` route. Leave the real `/biology/paramecium` route intact.

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: succeeds (noUnusedLocals confirms no dangling reference).

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore(paramecium): remove procedural-cell quality spike"
```

---

## Self-Review

**1. Spec coverage:**
- Pond-water environment, cell not isolated → Task 5 (Environment) + Task 8 (swim). ✓
- Click cell → dive-in (enlarge + clarify) → Task 8. ✓
- Click organelles → highlight + UA fact → Tasks 7 (blobs/select) + 9 (info card). ✓
- Procedural, zero assets → Tasks 1/6/7/8 (geometry), no `public/models`. ✓
- 9 organelles + facts → Task 2. ✓
- View-mode env↔cell + progress N/9 + badge → Tasks 3 (state) + 9 (HUD). ✓
- Reduced-motion gates all motion → Tasks 5,6,7,8 (every `useFrame` checks `reduced`) + Task 10 (autoRotate). ✓
- New `paramecium` lab under biology + lazy route → Task 10. ✓
- Quality spike first (deployable) → Task 1 (+ controller deploys for the prod smoke). ✓
- SDK reuse (WebGL gate, Button, GlassPanel, useViewport, useReducedMotion, useCursor, Loader) → Tasks 4,7,8,9,10. ✓
- Cleanup spike → Task 12. ✓

**2. Placeholder scan:** No TBD/TODO; every code step is complete; facts are final.

**3. Type consistency:** `OrganelleId` union (9 ids) identical in `organelles.ts`, `ParameciumState.ts`, `Organelles.tsx`. `ViewMode` `'environment'|'cell'` consistent across state + Cell + Organelles + Rail + Scene. `useParameciumState` selectors match the store shape (`phase`, `viewMode`, `selectedOrganelleId`, `viewedOrganelleIds`, `start`, `enterCell`, `exitToEnvironment`, `select`, `deselect`, `reset`). Ellipsoid `A/B/C` shared via `life.ts` (Cilia, Cell) and matched literally in the Task-1 spike + Trichocysts (1.42/0.71/0.57 ≈ A/B/C). `getOrganelle`/`ORGANELLES`/`ORGANELLE_IDS` exports match all importers. SDK signatures (`Button`, `GlassPanel`, `useViewport`, `useReducedMotion`, `isWebGLAvailable`, `WebGLUnsupported`, drei `useCursor`/`Loader`) verified against source during the anatomy lab.

**Implementer note:** all motion-bearing `useFrame` callbacks must early-respect `useReducedMotion()` (snap, no idle motion) — already written into every scene component above.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-01-paramecium-lab.md`.

Recommended: **subagent-driven-development** — fresh subagent per task, two-stage review on the complex R3F tasks (1, 6, 7, 8, 10). Task 1 is the deployable quality gate: after it builds, the controller pushes to prod and the user judges `/biology/paramecium-spike` before Task 2.
