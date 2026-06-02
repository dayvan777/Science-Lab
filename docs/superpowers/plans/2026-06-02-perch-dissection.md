# Perch Dissection Lab — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A procedural 3D "study the structure of the river perch" zoology lab — examine external structure, drag a scalpel to swing the body wall open on a hinge, then study internal organs in place.

**Architecture:** New lab `src/labs/perch/`, mirroring the paramecium lab (phase machine + Zustand store + procedural scene + rail/info-card/HUD + the `PartShell`/`PartLabel` selectable-part pattern). Novel piece: a hinged near-side body-wall **flap** whose open angle is bound to a drag-driven `cutProgress`. Pure cut math in `cut.ts` is unit-tested.

**Tech Stack:** React 19, @react-three/fiber 9, @react-three/drei 10, three 0.184, Zustand 5, Vitest 4, TypeScript strict (`noUnusedLocals`).

---

## Branch & deploy strategy

- Branch **`feat/biology-perch-lab`** off `master` (`5e613f0`).
- **Spike gate (after Task 7):** controller fast-forwards the spike tip to `master` and pushes; the user validates the cut feel + fish recognizability on prod **before** Phase B. (Mirrors anatomy/paramecium.)
- **Finish (Task 14):** `merge --no-ff` → `master` → push.

## File structure (new lab `src/labs/perch/`)

| File | Responsibility | Task |
|---|---|---|
| `scene/anatomy.ts` | body dims, colors, `dampAlpha` | 1 |
| `scene/cut.ts` (+`.test.ts`) | pure cut math: `clamp01`, `flapAngle`, `cutProgressFromDrag` | 1 |
| `state/PerchState.ts` (+`.test.ts`) | phase machine, `cutProgress`, selection/viewed | 2 |
| `index.tsx` | `PerchLab` phase machine + `perchLabDefinition` | 3 |
| `ui/IntroScreen.tsx` | staged title fade → `start()` | 3 |
| `scene/PerchScene.tsx` | Canvas + Tray + body + organs + scalpel + HUD | 3,5,6,10,11,12 |
| `scene/Tray.tsx` | dissection tray + lights + ambient | 3 |
| `scene/PerchBody.tsx` | skin texture, far shell + cavity, hinged flap, fins, tail, eye | 4 |
| `scene/Scalpel.tsx` | drag handle + guide → `setCut` | 5 |
| `content/parts.ts` (+`.test.ts`) | `PartDef` + 16 `PARTS` + helpers | 8 |
| `scene/PartShell.tsx` | hover/select/cursor + visual `state`, phase-gated | 9 |
| `scene/PartLabel.tsx` | drei `Html` pill + `Line` leader for the selected part | 9 |
| `scene/Organs.tsx` | 7 internal organs via `PartShell` | 10 |
| `scene/ExternalParts.tsx` | 9 external hotspots via `PartShell` | 11 |
| `ui/PartRail.tsx`, `ui/InfoCard.tsx`, `ui/HUD.tsx` | rail (phase-filtered) + facts card + HUD | 12 |

**Modify:** `src/site/content/subjects.ts` (+`subjects.test.ts`) add `perch`; `src/app/App.tsx` lazy `/biology/perch` route. (Both in Task 3.)

**Import-depth cheat-sheet (from `src/labs/perch/<dir>/X.tsx`):** SDK `'../../../sdk/...'`; sibling lab dirs `'../state/...'`, `'../content/...'`, `'../scene/...'`, `'../ui/...'`.

---

# PHASE A — Spike (build + deploy gate)

### Task 0: Branch

- [ ] **Step 1**

```bash
cd "C:\Users\vdomo\OneDrive\Рабочий стол\3dwebsimulation"
git checkout master
git switch -c feat/biology-perch-lab
git status -sb   # ## feat/biology-perch-lab, clean
```

---

### Task 1: `anatomy.ts` + `cut.ts` pure math + tests (TDD)

**Files:** Create `src/labs/perch/scene/anatomy.ts`, `src/labs/perch/scene/cut.ts`, `src/labs/perch/scene/cut.test.ts`

- [ ] **Step 1: failing test** — `src/labs/perch/scene/cut.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { clamp01, flapAngle, cutProgressFromDrag } from './cut'

describe('clamp01', () => {
  it('clamps to [0,1]', () => {
    expect(clamp01(-2)).toBe(0)
    expect(clamp01(0.4)).toBe(0.4)
    expect(clamp01(3)).toBe(1)
  })
})

describe('flapAngle', () => {
  it('is 0 closed, max open, monotonic, eased', () => {
    expect(flapAngle(0)).toBe(0)
    expect(flapAngle(1, 2)).toBeCloseTo(2, 6)
    expect(flapAngle(-1)).toBe(0)
    expect(flapAngle(5, 2)).toBeCloseTo(2, 6)
    expect(flapAngle(0.25)).toBeLessThan(flapAngle(0.75))
  })
})

describe('cutProgressFromDrag', () => {
  it('maps + clamps, guards zero length', () => {
    expect(cutProgressFromDrag(0, 300)).toBe(0)
    expect(cutProgressFromDrag(150, 300)).toBeCloseTo(0.5, 6)
    expect(cutProgressFromDrag(900, 300)).toBe(1)
    expect(cutProgressFromDrag(50, 0)).toBe(0)
  })
})
```

- [ ] **Step 2: run → FAIL** — `npm test -- perch/scene/cut` (module missing).

- [ ] **Step 3: implement** — `src/labs/perch/scene/cut.ts`:

```ts
/** Clamp to [0,1]. */
export function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x))
}

/** Eased flap-open angle (radians) from cut progress 0..1. */
export function flapAngle(cutProgress: number, maxRad = 1.95): number {
  const p = clamp01(cutProgress)
  return p * p * (3 - 2 * p) * maxRad
}

/** Cut progress from drag distance (px) over the full guide span (px). */
export function cutProgressFromDrag(dragPx: number, fullPx: number): number {
  if (fullPx <= 0) return 0
  return clamp01(dragPx / fullPx)
}
```

`src/labs/perch/scene/anatomy.ts`:

```ts
/** Perch body ellipsoid half-extents: X=length (head −X → tail +X), Y=height, Z=half-width (near side +Z). */
export const BODY = { L: 2.2, H: 0.82, W: 0.52 }

/** Palette (procedural, zero assets). */
export const COLORS = {
  back: '#6b7b3a', belly: '#c8d3a0', flap: '#7e8c4c', cavity: '#34281f',
  finOlive: '#9aa86a', finRed: '#c8623c', operculum: '#8a9a6a', eye: '#1c1c16',
}

/** Frame-rate-independent damping alpha. */
export function dampAlpha(dt: number, smoothing = 6): number {
  return 1 - Math.exp(-smoothing * Math.max(dt, 0))
}
```

- [ ] **Step 4: run → PASS** — `npm test -- perch/scene/cut`.

- [ ] **Step 5: commit**

```bash
git add src/labs/perch/scene/anatomy.ts src/labs/perch/scene/cut.ts src/labs/perch/scene/cut.test.ts
git commit -m "feat(perch): anatomy constants + cut math + tests"
```

---

### Task 2: `PerchState` store + tests (TDD)

**Files:** Create `src/labs/perch/state/PerchState.ts`, `src/labs/perch/state/PerchState.test.ts`

> The store imports `PartId` from `content/parts`, which is built in Task 8. To keep this task self-contained and green, define a **local** `PartId` type alias here now and switch to the content import in Task 8. (Flagged again in Task 8.)

- [ ] **Step 1: failing test** — `src/labs/perch/state/PerchState.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { usePerchState } from './PerchState'

const get = () => usePerchState.getState()
beforeEach(() => get().reset())

describe('PerchState', () => {
  it('starts in intro, no cut, nothing selected/viewed', () => {
    expect(get().phase).toBe('intro')
    expect(get().cutProgress).toBe(0)
    expect(get().selectedPartId).toBeNull()
    expect(get().viewedPartIds).toEqual([])
  })

  it('start() → external', () => {
    get().start()
    expect(get().phase).toBe('external')
  })

  it('setCut clamps and promotes to internal at full cut', () => {
    get().start()
    get().setCut(0.5)
    expect(get().cutProgress).toBe(0.5)
    expect(get().phase).toBe('external')
    get().setCut(2)
    expect(get().cutProgress).toBe(1)
    expect(get().phase).toBe('internal')
  })

  it('suture() closes the flap, returns to external, clears selection', () => {
    get().start(); get().setCut(1); get().select('heart')
    get().suture()
    expect(get().cutProgress).toBe(0)
    expect(get().phase).toBe('external')
    expect(get().selectedPartId).toBeNull()
  })

  it('select() records viewed (dedup); deselect keeps viewed', () => {
    get().select('gills'); get().deselect(); get().select('gills'); get().select('liver')
    expect(get().viewedPartIds).toEqual(['gills', 'liver'])
    expect(get().selectedPartId).toBe('liver')
    get().deselect()
    expect(get().selectedPartId).toBeNull()
    expect(get().viewedPartIds).toEqual(['gills', 'liver'])
  })

  it('reset restores initial state', () => {
    get().start(); get().setCut(1); get().select('kidney'); get().reset()
    expect(get().phase).toBe('intro')
    expect(get().cutProgress).toBe(0)
    expect(get().viewedPartIds).toEqual([])
  })
})
```

- [ ] **Step 2: run → FAIL** — `npm test -- PerchState`.

- [ ] **Step 3: implement** — `src/labs/perch/state/PerchState.ts`:

```ts
import { create } from 'zustand'

// TEMP local type — replaced by `import type { PartId } from '../content/parts'` in Task 8.
type PartId = string

export type PerchPhase = 'intro' | 'external' | 'internal'

type PerchState = {
  phase: PerchPhase
  cutProgress: number
  selectedPartId: PartId | null
  viewedPartIds: PartId[]
  start: () => void
  setCut: (p: number) => void
  suture: () => void
  select: (id: PartId) => void
  deselect: () => void
  reset: () => void
}

export const usePerchState = create<PerchState>((set, get) => ({
  phase: 'intro',
  cutProgress: 0,
  selectedPartId: null,
  viewedPartIds: [],

  start: () => set({ phase: 'external' }),

  setCut: (p) => {
    const cut = Math.min(1, Math.max(0, p))
    set(cut >= 1 ? { cutProgress: 1, phase: 'internal' } : { cutProgress: cut })
  },

  suture: () => set({ cutProgress: 0, phase: 'external', selectedPartId: null }),

  select: (id) => {
    const { viewedPartIds } = get()
    const viewed = viewedPartIds.includes(id) ? viewedPartIds : [...viewedPartIds, id]
    set({ selectedPartId: id, viewedPartIds: viewed })
  },

  deselect: () => set({ selectedPartId: null }),

  reset: () => set({ phase: 'intro', cutProgress: 0, selectedPartId: null, viewedPartIds: [] }),
}))
```

- [ ] **Step 4: run → PASS** — `npm test -- PerchState`.

- [ ] **Step 5: commit**

```bash
git add src/labs/perch/state/PerchState.ts src/labs/perch/state/PerchState.test.ts
git commit -m "feat(perch): PerchState phase machine + cut progress + tests"
```

---

### Task 3: Lab scaffold (intro → empty tray) + route + subject

**Files:** Create `src/labs/perch/index.tsx`, `src/labs/perch/ui/IntroScreen.tsx`, `src/labs/perch/scene/PerchScene.tsx`, `src/labs/perch/scene/Tray.tsx`. Modify `src/site/content/subjects.ts`, `src/site/content/subjects.test.ts`, `src/app/App.tsx`.

- [ ] **Step 1: `scene/Tray.tsx`**

```tsx
/** Dissection tray + watery-teal lighting (procedural). */
export function Tray() {
  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[4, 7, 5]} intensity={1.2} castShadow />
      <directionalLight position={[-5, 2, -3]} intensity={0.4} color="#9fd8ff" />
      <fog attach="fog" args={['#0b2530', 12, 30]} />
      {/* tray slab */}
      <mesh position={[0, -1.0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[9, 5]} />
        <meshStandardMaterial color="#16323a" roughness={0.9} metalness={0.1} />
      </mesh>
      {/* tray rim */}
      <mesh position={[0, -0.95, 0]}>
        <torusGeometry args={[3.4, 0.06, 8, 48]} />
        <meshStandardMaterial color="#2a4a52" roughness={0.6} />
      </mesh>
    </>
  )
}
```

- [ ] **Step 2: `scene/PerchScene.tsx`** (skeleton — body/organs/scalpel/HUD added in later tasks)

```tsx
import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment as DreiEnvironment, Loader } from '@react-three/drei'
import { ACESFilmicToneMapping } from 'three'
import { Tray } from './Tray'

export function PerchScene() {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(ellipse at 50% 40%, #123a42 0%, #0a212b 55%, #06121a 100%)' }}>
      <Canvas shadows dpr={[1, 2]} camera={{ position: [0.5, 2.2, 5.2], fov: 45 }} gl={{ toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1.05 }}>
        <Suspense fallback={null}>
          <Tray />
          <DreiEnvironment preset="city" environmentIntensity={0.35} />
        </Suspense>
        <OrbitControls makeDefault enableDamping target={[0, 0, 0]} autoRotate={false} minDistance={3} maxDistance={11} maxPolarAngle={Math.PI * 0.52} />
      </Canvas>
      <Loader />
    </div>
  )
}
```
(No `useReducedMotion` here — `autoRotate` is hardcoded off. `PerchScene` never needs it.)

- [ ] **Step 3: `ui/IntroScreen.tsx`** (mirror paramecium intro)

```tsx
import { useEffect, useState } from 'react'
import { usePerchState } from '../state/PerchState'
import { Button } from '../../../sdk/ui/Button'
import { useViewport } from '../../../sdk/a11y/useViewport'

export function IntroScreen() {
  const start = usePerchState(s => s.start)
  const [stage, setStage] = useState(0)
  const { breakpoint } = useViewport()
  const isPhone = breakpoint === 'phone'

  useEffect(() => {
    const t = [
      setTimeout(() => setStage(1), 100),
      setTimeout(() => setStage(2), 600),
      setTimeout(() => setStage(3), 1100),
      setTimeout(() => setStage(4), 1700),
    ]
    return () => t.forEach(clearTimeout)
  }, [])

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'linear-gradient(180deg, #eafaf7 0%, #bcd9d3 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      color: '#10302c', padding: 32, fontFamily: '"SF Pro Display", "Inter", system-ui, sans-serif',
    }}>
      <div style={{ opacity: stage >= 1 ? 1 : 0, transform: stage >= 1 ? 'translateY(0)' : 'translateY(20px)', transition: 'opacity 600ms ease, transform 600ms ease', fontSize: isPhone ? 34 : 56, fontWeight: 200, letterSpacing: -1.5, marginBottom: 8, textAlign: 'center' }}>Зоологія</div>
      <div style={{ opacity: stage >= 2 ? 1 : 0, transform: stage >= 2 ? 'translateY(0)' : 'translateY(20px)', transition: 'opacity 600ms ease, transform 600ms ease', fontSize: isPhone ? 22 : 32, fontWeight: 400, color: '#0e9c87', marginBottom: 40, textAlign: 'center' }}>Будова річкового окуня</div>
      <div style={{ opacity: stage >= 3 ? 1 : 0, transform: stage >= 3 ? 'translateY(0)' : 'translateY(20px)', transition: 'opacity 800ms ease, transform 800ms ease', fontSize: 17, color: '#3c5a54', maxWidth: 620, textAlign: 'center', lineHeight: 1.55, marginBottom: 48 }}>
        {'Перед тобою — річковий окунь на препарувальному столику. Роздивись його будову, обережно зроби розріз і дізнайся, що в риби всередині.'}
      </div>
      <div style={{ opacity: stage >= 4 ? 1 : 0, transform: stage >= 4 ? 'scale(1)' : 'scale(0.9)', transition: 'opacity 400ms ease, transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
        <Button onClick={start}>Почати дослідження</Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: `index.tsx`**

```tsx
import { useNavigate } from 'react-router-dom'
import { PerchScene } from './scene/PerchScene'
import { usePerchState } from './state/PerchState'
import { IntroScreen } from './ui/IntroScreen'
import { isWebGLAvailable } from '../../sdk/scene/webgl'
import { WebGLUnsupported } from '../../sdk/ui/WebGLUnsupported'

export const perchLabDefinition = {
  id: 'perch',
  title: 'Будова річкового окуня',
}

export function PerchLab() {
  const phase = usePerchState(s => s.phase)
  const navigate = useNavigate()
  const webglOk = isWebGLAvailable()
  return (
    <>
      {phase === 'intro' && <IntroScreen />}
      {phase !== 'intro' && (webglOk ? <PerchScene /> : <WebGLUnsupported onHome={() => navigate('/')} />)}
    </>
  )
}
```

- [ ] **Step 5: subject entry** — in `src/site/content/subjects.ts`, add to the biology `labs` array (after the paramecium entry):

```ts
      {
        id: 'perch',
        title: 'Будова річкового окуня',
        subtitle: 'Зовнішня будова · розтин · внутрішні органи',
        path: '/biology/perch',
        status: 'available',
      },
```

- [ ] **Step 6: subject test** — in `src/site/content/subjects.test.ts`, add (mirroring the existing paramecium assertion; match that file's style):

```ts
  it('biology has the perch dissection lab', () => {
    const bio = SUBJECTS.find(s => s.id === 'biology')!
    const perch = bio.labs.find(l => l.id === 'perch')!
    expect(perch.path).toBe('/biology/perch')
    expect(perch.status).toBe('available')
  })
```
(If `SUBJECTS` isn't already imported in that test file, add `import { SUBJECTS } from './subjects'` consistent with the file.)

- [ ] **Step 7: route** — in `src/app/App.tsx`, add the lazy import beside the paramecium one:

```tsx
const PerchLab = lazy(() => import('../labs/perch').then(m => ({ default: m.PerchLab })))
```
and add the route beside `/biology/paramecium`:

```tsx
        <Route
          path="/biology/perch"
          element={
            <Suspense fallback={<div style={{ position: 'fixed', inset: 0, background: '#06121a' }} />}>
              <PerchLab />
            </Suspense>
          }
        />
```

- [ ] **Step 8: gate** — `npm run typecheck && npm test` → green.
- [ ] **Step 9: visual** — `npm run dev`, open `/biology/perch`: intro fades in → "Почати дослідження" → empty tray scene with OrbitControls. Subject page lists the new lab.
- [ ] **Step 10: commit**

```bash
git add src/labs/perch src/site/content/subjects.ts src/site/content/subjects.test.ts src/app/App.tsx
git commit -m "feat(perch): lab scaffold — intro, tray scene, route, subject entry"
```

---

### Task 4: `PerchBody` — skin, far shell + cavity, hinged flap, fins, tail, eye

**Files:** Create `src/labs/perch/scene/PerchBody.tsx`. Modify `scene/PerchScene.tsx` (mount it).

- [ ] **Step 1: create `PerchBody.tsx`**

```tsx
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, CanvasTexture, RepeatWrapping, DoubleSide, Shape, MeshStandardMaterial } from 'three'
import { usePerchState } from '../state/PerchState'
import { useReducedMotion } from '../../../sdk/a11y/useReducedMotion'
import { BODY, COLORS, dampAlpha } from './anatomy'
import { flapAngle } from './cut'

/** Olive→pale gradient + dark vertical bars (perch markings); zero asset files. */
function makeSkin(): CanvasTexture {
  const w = 256, h = 128
  const c = document.createElement('canvas'); c.width = w; c.height = h
  const ctx = c.getContext('2d')!
  const g = ctx.createLinearGradient(0, 0, 0, h)
  g.addColorStop(0, COLORS.back); g.addColorStop(0.6, '#94a05e'); g.addColorStop(1, COLORS.belly)
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = 'rgba(40,55,20,0.34)'
  for (let i = 0; i < 7; i++) ctx.fillRect(18 + i * 34, 0, 10, h * 0.72)
  const tex = new CanvasTexture(c); tex.wrapS = tex.wrapT = RepeatWrapping
  return tex
}

/** A flat double-sided fin from 2D points, placed + rotated. */
function Fin({ pts, position, rotation, color }: { pts: [number, number][]; position: [number, number, number]; rotation?: [number, number, number]; color: string }) {
  const geo = useMemo(() => {
    const s = new Shape()
    s.moveTo(pts[0][0], pts[0][1])
    pts.slice(1).forEach(([x, y]) => s.lineTo(x, y))
    s.closePath()
    return s
  }, [pts])
  return (
    <mesh position={position} rotation={rotation}>
      <shapeGeometry args={[geo]} />
      <meshStandardMaterial color={color} side={DoubleSide} roughness={0.7} transparent opacity={0.95} />
    </mesh>
  )
}

export function PerchBody() {
  const reduced = useReducedMotion()
  const cutProgress = usePerchState(s => s.cutProgress)
  const flapRef = useRef<Group>(null)
  const skin = useMemo(() => makeSkin(), [])
  const bodyMat = useMemo(() => new MeshStandardMaterial({ map: skin, roughness: 0.55, side: DoubleSide }), [skin])
  const flapMat = useMemo(() => new MeshStandardMaterial({ map: skin, roughness: 0.55, side: DoubleSide }), [skin])
  const cavityMat = useMemo(() => new MeshStandardMaterial({ color: COLORS.cavity, roughness: 0.9, side: DoubleSide }), [])

  useFrame((_, dt) => {
    const g = flapRef.current
    if (!g) return
    const target = flapAngle(cutProgress)
    g.rotation.x = reduced ? target : g.rotation.x + (target - g.rotation.x) * dampAlpha(dt, 9)
  })

  return (
    <group>
      {/* far body wall (z<0 hemisphere) */}
      <mesh scale={[BODY.L, BODY.H, BODY.W]} material={bodyMat}>
        <sphereGeometry args={[1, 56, 36, Math.PI, Math.PI]} />
      </mesh>
      {/* dark cavity backing just inside the far wall */}
      <mesh scale={[BODY.L * 0.96, BODY.H * 0.95, BODY.W * 0.9]} material={cavityMat}>
        <sphereGeometry args={[1, 40, 28, Math.PI, Math.PI]} />
      </mesh>

      {/* near body wall = FLAP (z>0 hemisphere), hinged at the dorsal ridge */}
      <group ref={flapRef} position={[0, BODY.H, 0]}>
        <mesh position={[0, -BODY.H, 0]} scale={[BODY.L, BODY.H, BODY.W]} material={flapMat}>
          <sphereGeometry args={[1, 56, 36, 0, Math.PI]} />
        </mesh>
      </group>

      {/* tail (forked) */}
      <Fin pts={[[0, 0], [0.7, 0.42], [0.46, 0], [0.7, -0.42]]} position={[BODY.L * 0.98, 0, 0]} rotation={[Math.PI / 2, 0, 0]} color={COLORS.finOlive} />
      {/* dorsal fins (spiny + soft) */}
      <Fin pts={[[0, 0], [0.18, 0.5], [0.5, 0.12], [0.7, 0]]} position={[-0.2, BODY.H * 0.92, 0]} rotation={[Math.PI / 2, 0, 0]} color={COLORS.finOlive} />
      <Fin pts={[[0, 0], [0.22, 0.34], [0.5, 0]]} position={[0.7, BODY.H * 0.92, 0]} rotation={[Math.PI / 2, 0, 0]} color={COLORS.finOlive} />
      {/* anal + pelvic + pectoral (reddish) */}
      <Fin pts={[[0, 0], [0.18, -0.3], [0.42, 0]]} position={[0.7, -BODY.H * 0.9, 0]} rotation={[Math.PI / 2, 0, 0]} color={COLORS.finRed} />
      <Fin pts={[[0, 0], [0.12, -0.28], [0.3, 0]]} position={[-0.5, -BODY.H * 0.85, 0.2]} rotation={[Math.PI / 2, 0, 0.3]} color={COLORS.finRed} />
      <Fin pts={[[0, 0], [0.26, -0.16], [0.28, 0.14]]} position={[-0.85, -0.1, BODY.W * 0.8]} rotation={[0, 0.5, -0.4]} color={COLORS.finRed} />

      {/* operculum hint (gill-cover plate) */}
      <mesh position={[-1.15, 0.05, BODY.W * 0.55]} rotation={[0, 0.5, 0]}>
        <boxGeometry args={[0.05, 0.7, 0.5]} />
        <meshStandardMaterial color={COLORS.operculum} roughness={0.5} />
      </mesh>
      {/* eye */}
      <mesh position={[-1.55, 0.18, BODY.W * 0.55]}>
        <sphereGeometry args={[0.12, 16, 12]} />
        <meshStandardMaterial color="#f2efe0" />
      </mesh>
      <mesh position={[-1.63, 0.18, BODY.W * 0.58]}>
        <sphereGeometry args={[0.06, 12, 10]} />
        <meshStandardMaterial color={COLORS.eye} />
      </mesh>
    </group>
  )
}
```

- [ ] **Step 2: mount** — in `PerchScene.tsx`, import and add `<PerchBody />` inside `<Suspense>` after `<Tray />`:
```tsx
import { PerchBody } from './PerchBody'
// ...
          <Tray />
          <PerchBody />
```

- [ ] **Step 3: gate** — `npm run typecheck && npm test` → green.
- [ ] **Step 4: visual** — a recognizable perch on the tray (two dorsal fins, forked tail, reddish lower fins, eye, striped olive body). It's whole (flap closed at `cutProgress=0`). *Aesthetic constants (fin points, scales, hinge) are spike-tunable — adjust until it reads as a perch.*
- [ ] **Step 5: commit**

```bash
git add src/labs/perch/scene/PerchBody.tsx src/labs/perch/scene/PerchScene.tsx
git commit -m "feat(perch): procedural perch body + hinged flap + fins"
```

---

### Task 5: `Scalpel` — drag to cut → flap opens

**Files:** Create `src/labs/perch/scene/Scalpel.tsx`. Modify `scene/PerchScene.tsx`.

- [ ] **Step 1: create `Scalpel.tsx`**

```tsx
import type { ThreeEvent } from '@react-three/fiber'
import { useCursor, Line } from '@react-three/drei'
import { useState } from 'react'
import { usePerchState } from '../state/PerchState'
import { BODY } from './anatomy'
import { cutProgressFromDrag } from './cut'

const X0 = -1.0, X1 = 1.4          // belly cut span (head → vent)
const YB = -BODY.H * 0.92, ZB = BODY.W * 0.78
const DRAG_PX = 320                 // pixels of horizontal drag = full cut

export function Scalpel() {
  const phase = usePerchState(s => s.phase)
  const cutProgress = usePerchState(s => s.cutProgress)
  const setCut = usePerchState(s => s.setCut)
  const [hover, setHover] = useState(false)
  useCursor(hover && phase !== 'internal', 'grab')

  if (phase === 'internal') return null
  const hx = X0 + (X1 - X0) * cutProgress

  const onDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    const startX = e.nativeEvent.clientX
    const base = cutProgress
    const move = (ev: PointerEvent) => setCut(base + cutProgressFromDrag(ev.clientX - startX, DRAG_PX))
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  return (
    <group>
      {/* dashed guide along the belly */}
      <Line points={[[X0, YB, ZB], [X1, YB, ZB]]} color="#eafffb" lineWidth={1.5} dashed dashSize={0.1} gapSize={0.08} transparent opacity={0.7} />
      {/* draggable blade */}
      <group position={[hx, YB, ZB]} onPointerOver={() => setHover(true)} onPointerOut={() => setHover(false)} onPointerDown={onDown}>
        <mesh rotation={[0, 0, Math.PI * 0.18]}>
          <coneGeometry args={[0.06, 0.34, 4]} />
          <meshStandardMaterial color="#d3d9dd" metalness={0.6} roughness={0.3} />
        </mesh>
        <mesh position={[0.0, 0.22, 0]}>
          <boxGeometry args={[0.05, 0.18, 0.05]} />
          <meshStandardMaterial color="#5a3a22" roughness={0.7} />
        </mesh>
      </group>
    </group>
  )
}
```

- [ ] **Step 2: mount** — in `PerchScene.tsx`, import and add `<Scalpel />` after `<PerchBody />`:
```tsx
import { Scalpel } from './Scalpel'
// ...
          <PerchBody />
          <Scalpel />
```

- [ ] **Step 3: gate** — `npm run typecheck && npm test` → green.
- [ ] **Step 4: visual** — drag the blade along the belly → the flap swings open proportionally; at full drag the cavity is exposed. Release mid-way → flap holds. (Touch: same drag.)
- [ ] **Step 5: commit**

```bash
git add src/labs/perch/scene/Scalpel.tsx src/labs/perch/scene/PerchScene.tsx
git commit -m "feat(perch): scalpel drag-to-cut opens the body wall"
```

---

### Task 6: Spike organs (swim bladder + heart)

**Files:** Modify `scene/PerchScene.tsx` (inline spike organs — REMOVED in Task 10).

- [ ] **Step 1: add a clearly-marked spike group** in `PerchScene.tsx` inside `<Suspense>` after `<Scalpel />`:

```tsx
          {/* SPIKE ORGANS — removed in Task 10 (replaced by <Organs/>) */}
          <group>
            <mesh position={[0.2, 0.32, 0.05]} scale={[0.9, 0.3, 0.28]}>
              <sphereGeometry args={[1, 24, 18]} />
              <meshStandardMaterial color="#d6dce0" roughness={0.35} metalness={0.1} />
            </mesh>
            <mesh position={[-0.95, -0.42, 0.1]}>
              <sphereGeometry args={[0.16, 18, 14]} />
              <meshStandardMaterial color="#b02a1e" roughness={0.5} />
            </mesh>
          </group>
```

- [ ] **Step 2: gate** — `npm run typecheck && npm test` → green.
- [ ] **Step 3: visual** — after cutting, a large silvery swim bladder + a small red heart sit in the cavity.
- [ ] **Step 4: commit**

```bash
git add src/labs/perch/scene/PerchScene.tsx
git commit -m "feat(perch): spike organs (swim bladder + heart) in the cavity"
```

---

### Task 7: Spike gate (full gate + deploy + user validation)

- [ ] **Step 1: full gate** — `npm run typecheck` · `npm test` · `npm run build` all succeed.
- [ ] **Step 2: controller deploys + pauses**

> **Controller action:** fast-forward `master` to the spike tip and `git push origin master`. Tell the user to open `science-lab-phi.vercel.app/biology/perch` and confirm: the fish reads as a perch, and dragging the scalpel to open the body wall feels right. **Do not start Phase B until approved.** Tweak on the branch + redeploy if requested.

---

# PHASE B — Parts, picking, organs, external structure

### Task 8: `content/parts.ts` (16 parts + facts) + tests

**Files:** Create `src/labs/perch/content/parts.ts`, `src/labs/perch/content/parts.test.ts`. Modify `src/labs/perch/state/PerchState.ts` (swap the temp `PartId`).

- [ ] **Step 1: failing test** — `src/labs/perch/content/parts.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { PARTS, PART_IDS, getPart } from './parts'

describe('perch parts', () => {
  it('has 16 parts: 9 external + 7 internal', () => {
    expect(PARTS).toHaveLength(16)
    expect(PARTS.filter(p => p.phase === 'external')).toHaveLength(9)
    expect(PARTS.filter(p => p.phase === 'internal')).toHaveLength(7)
  })
  it('ids are unique and every part has ≥1 fact + a label', () => {
    expect(new Set(PART_IDS).size).toBe(16)
    for (const p of PARTS) {
      expect(p.label.length).toBeGreaterThan(0)
      expect(p.facts.length).toBeGreaterThan(0)
    }
  })
  it('getPart returns the def or throws', () => {
    expect(getPart('heart').label).toBe('Серце')
    expect(() => getPart('nope' as never)).toThrow()
  })
})
```

- [ ] **Step 2: run → FAIL** — `npm test -- perch/content/parts`.

- [ ] **Step 3: implement** — `src/labs/perch/content/parts.ts`:

```ts
export type PartId =
  | 'dorsalFins' | 'caudalFin' | 'analFin' | 'pectoralFins' | 'pelvicFins'
  | 'operculum' | 'lateralLine' | 'scales' | 'head'
  | 'gills' | 'heart' | 'liver' | 'swimBladder' | 'stomach' | 'intestine' | 'kidney'

export type PartPhase = 'external' | 'internal'
export type PartKind = 'fin' | 'plate' | 'line' | 'region' | 'organ'

export interface PartDef {
  id: PartId
  label: string
  phase: PartPhase
  kind: PartKind
  color: string
  /** Label/leader anchor in body-local frame. */
  position: [number, number, number]
  facts: string[]
}

export const PARTS: PartDef[] = [
  // ── External ──
  { id: 'dorsalFins', label: 'Спинні плавці', phase: 'external', kind: 'fin', color: '#9aa86a', position: [0.1, 1.15, 0],
    facts: ["Два спинні плавці: передній з твердими колючками — захист, задній м'який — для рівноваги."] },
  { id: 'caudalFin', label: 'Хвостовий плавець', phase: 'external', kind: 'fin', color: '#9aa86a', position: [2.5, 0.1, 0],
    facts: ['Хвостовий плавець — головний «мотор»: штовхає рибу вперед і задає напрям руху.'] },
  { id: 'analFin', label: 'Анальний плавець', phase: 'external', kind: 'fin', color: '#c8623c', position: [1.0, -0.95, 0],
    facts: ['Непарний плавець під хвостом — допомагає триматися рівно й не перевертатися.'] },
  { id: 'pectoralFins', label: 'Грудні плавці', phase: 'external', kind: 'fin', color: '#c8623c', position: [-0.85, -0.1, 0.7],
    facts: ['Пара плавців по боках за головою; ними риба повертає, гальмує й зависає на місці.'] },
  { id: 'pelvicFins', label: 'Черевні плавці', phase: 'external', kind: 'fin', color: '#c8623c', position: [-0.5, -0.85, 0.5],
    facts: ['Пара плавців знизу — допомагають рухатися вгору-вниз і утримувати рівновагу.'] },
  { id: 'operculum', label: 'Зяброва кришка', phase: 'external', kind: 'plate', color: '#8a9a6a', position: [-1.2, 0.3, 0.6],
    facts: ['Кісткова кришка прикриває зябра й працює як насос, проганяючи воду крізь них.'] },
  { id: 'lateralLine', label: 'Бічна лінія', phase: 'external', kind: 'line', color: '#5c673f', position: [0.3, 0.2, 0.55],
    facts: ['Орган чуття вздовж тіла: відчуває рух і коливання води, навіть у темряві.'] },
  { id: 'scales', label: 'Луска', phase: 'external', kind: 'region', color: '#94a05e', position: [0.6, 0.45, 0.55],
    facts: ['Тіло вкрите кістковою лускою; вона росте все життя, і по кільцях визначають вік риби.'] },
  { id: 'head', label: 'Голова', phase: 'external', kind: 'region', color: '#7e8a5a', position: [-1.7, 0.2, 0.3],
    facts: ['На голові — очі без повік, ніздрі (лише для нюху) і рот із дрібними зубами.'] },
  // ── Internal ──
  { id: 'gills', label: 'Зябра', phase: 'internal', kind: 'organ', color: '#c0392b', position: [-1.15, 0.0, 0.2],
    facts: ['Червоні зяброві пелюстки; крізь них риба дихає, забираючи з води розчинений кисень.'] },
  { id: 'heart', label: 'Серце', phase: 'internal', kind: 'organ', color: '#b02a1e', position: [-0.95, -0.45, 0.15],
    facts: ['Двокамерне серце жене кров до зябер — у риби одне коло кровообігу.'] },
  { id: 'liver', label: 'Печінка', phase: 'internal', kind: 'organ', color: '#8c5a3c', position: [-0.55, -0.4, 0.15],
    facts: ['Велика печінка виробляє жовч для травлення й запасає поживні речовини.'] },
  { id: 'swimBladder', label: 'Плавальний міхур', phase: 'internal', kind: 'organ', color: '#d6dce0', position: [0.2, 0.55, 0.1],
    facts: ['Наповнений газом міхур регулює глибину — риба спливає чи занурюється, не витрачаючи сил.'] },
  { id: 'stomach', label: 'Шлунок', phase: 'internal', kind: 'organ', color: '#b89a6a', position: [-0.2, -0.4, 0.15],
    facts: ['У шлунку здобич (дрібна риба, личинки) починає перетравлюватися.'] },
  { id: 'intestine', label: 'Кишечник', phase: 'internal', kind: 'organ', color: '#b8a86a', position: [0.45, -0.5, 0.15],
    facts: ['У звивистому кишечнику поживні речовини всмоктуються в кров.'] },
  { id: 'kidney', label: 'Нирки', phase: 'internal', kind: 'organ', color: '#6a5a7a', position: [0.2, 0.65, 0.0],
    facts: ['Темні нирки вздовж хребта очищають кров і виводять зайву воду.'] },
]

export const PART_IDS: PartId[] = PARTS.map(p => p.id)

export function getPart(id: PartId): PartDef {
  const p = PARTS.find(x => x.id === id)
  if (!p) throw new Error(`Unknown part id: ${id}`)
  return p
}
```

- [ ] **Step 4: run → PASS** — `npm test -- perch/content/parts`.

- [ ] **Step 5: swap the temp type in the store** — in `src/labs/perch/state/PerchState.ts`, replace
```ts
// TEMP local type — replaced by `import type { PartId } from '../content/parts'` in Task 8.
type PartId = string
```
with
```ts
import type { PartId } from '../content/parts'
```
(put it with the other imports at the top). Run `npm test -- PerchState` → still green.

- [ ] **Step 6: commit**

```bash
git add src/labs/perch/content/parts.ts src/labs/perch/content/parts.test.ts src/labs/perch/state/PerchState.ts
git commit -m "feat(perch): 16 parts content + facts; wire real PartId into store"
```

---

### Task 9: `PartShell` + `PartLabel` (selectable-part infra)

**Files:** Create `src/labs/perch/scene/PartShell.tsx`, `src/labs/perch/scene/PartLabel.tsx`.

- [ ] **Step 1: `PartShell.tsx`**

```tsx
import { useState, type ComponentType } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { useCursor } from '@react-three/drei'
import type { PartDef } from '../content/parts'
import { usePerchState } from '../state/PerchState'

export type PartVisualState = { selected: boolean; dimmed: boolean; targetEmissive: number; targetOpacity: number }
export type PartRenderer = ComponentType<{ def: PartDef; state: PartVisualState }>

/** Hover/select/cursor + dim/highlight policy, gated so a part is interactive only in its phase. */
export function PartShell({ def, Renderer }: { def: PartDef; Renderer: PartRenderer }) {
  const phase = usePerchState(s => s.phase)
  const selectedId = usePerchState(s => s.selectedPartId)
  const select = usePerchState(s => s.select)
  const [hovered, setHovered] = useState(false)
  const active = def.phase === phase            // interactive this phase
  useCursor(hovered && active)

  const isSelected = selectedId === def.id
  const anySelected = selectedId !== null
  const highlighted = hovered && active && !anySelected
  const state: PartVisualState = {
    selected: isSelected,
    dimmed: anySelected && !isSelected,
    targetEmissive: isSelected ? 0.55 : highlighted ? 0.28 : 0,
    targetOpacity: anySelected && !isSelected ? 0.25 : (active ? 0.97 : 0.85),
  }

  const onOver = (e: ThreeEvent<PointerEvent>) => { if (active) { e.stopPropagation(); setHovered(true) } }
  const onOut = () => setHovered(false)
  const onDown = (e: ThreeEvent<PointerEvent>) => { if (active) { e.stopPropagation(); select(def.id) } }

  return (
    <group onPointerOver={onOver} onPointerOut={onOut} onPointerDown={onDown}>
      <Renderer def={def} state={state} />
    </group>
  )
}
```

- [ ] **Step 2: `PartLabel.tsx`**

```tsx
import { Html, Line } from '@react-three/drei'
import type { PartDef } from '../content/parts'

export function PartLabel({ def }: { def: PartDef }) {
  const a = def.position
  const end: [number, number, number] = [a[0] + 0.45, a[1] + 0.55, a[2] + 0.2]
  return (
    <group>
      <Line points={[a, end]} color={def.color} lineWidth={1} transparent opacity={0.75} />
      <Html position={end} center distanceFactor={7} zIndexRange={[20, 0]}>
        <div style={{
          pointerEvents: 'none', whiteSpace: 'nowrap', transform: 'translateY(-50%)',
          padding: '3px 9px', borderRadius: 999, fontSize: 13, fontWeight: 600,
          fontFamily: 'system-ui, sans-serif', color: '#06121a', background: def.color,
          boxShadow: '0 4px 14px -4px rgba(0,0,0,.5)',
        }}>{def.label}</div>
      </Html>
    </group>
  )
}
```

- [ ] **Step 3: gate** — `npm run typecheck && npm test` → green (components not yet mounted; ensure no unused-export errors — exports are fine).
- [ ] **Step 4: commit**

```bash
git add src/labs/perch/scene/PartShell.tsx src/labs/perch/scene/PartLabel.tsx
git commit -m "feat(perch): PartShell + PartLabel (phase-gated selectable parts)"
```

---

### Task 10: `Organs` (7 internal) via PartShell; remove spike organs

**Files:** Create `src/labs/perch/scene/Organs.tsx`. Modify `scene/PerchScene.tsx` (remove spike group; mount `<Organs/>`).

- [ ] **Step 1: create `Organs.tsx`**

```tsx
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, MeshStandardMaterial, Group } from 'three'
import type { PartDef } from '../content/parts'
import { PARTS } from '../content/parts'
import { useReducedMotion } from '../../../sdk/a11y/useReducedMotion'
import { dampAlpha } from './anatomy'
import { PartShell, type PartVisualState, type PartRenderer } from './PartShell'

const ORGAN_PARTS = PARTS.filter(p => p.phase === 'internal')

/** Per-organ procedural shape, keyed by id. All share the lerped emissive/opacity from `state`. */
function OrganMesh({ def, state }: { def: PartDef; state: PartVisualState }) {
  const reduced = useReducedMotion()
  const ref = useRef<Group>(null)
  const mat = useMemo(() => new MeshStandardMaterial({
    color: def.color, emissive: new Color(def.color), emissiveIntensity: 0,
    roughness: def.id === 'swimBladder' ? 0.3 : 0.55, metalness: def.id === 'swimBladder' ? 0.1 : 0,
    transparent: true, opacity: 0.97,
  }), [def.color, def.id])

  useFrame((s, dt) => {
    const a = reduced ? 1 : dampAlpha(dt, 8)
    mat.emissiveIntensity += (state.targetEmissive - mat.emissiveIntensity) * a
    mat.opacity += (state.targetOpacity - mat.opacity) * a
    // gills gently sway when not reduced
    if (ref.current && def.id === 'gills') ref.current.rotation.z = reduced ? 0 : Math.sin(s.clock.elapsedTime * 1.5) * 0.06
  })

  const p = def.position
  switch (def.id) {
    case 'gills':
      return (
        <group ref={ref} position={[p[0], p[1], p[2]]}>
          {[0, 1, 2].map(i => (
            <mesh key={i} position={[0, -i * 0.12, 0]} material={mat}>
              <torusGeometry args={[0.16, 0.03, 8, 16, Math.PI]} />
            </mesh>
          ))}
        </group>
      )
    case 'heart':
      return <mesh position={p} material={mat}><sphereGeometry args={[0.17, 18, 14]} /></mesh>
    case 'liver':
      return <mesh position={p} scale={[1.5, 0.9, 0.8]} material={mat}><sphereGeometry args={[0.22, 18, 14]} /></mesh>
    case 'swimBladder':
      return <mesh position={p} scale={[2.4, 0.7, 0.7]} material={mat}><sphereGeometry args={[0.3, 26, 18]} /></mesh>
    case 'stomach':
      return <mesh position={p} scale={[1.2, 1.4, 0.8]} material={mat}><sphereGeometry args={[0.2, 16, 14]} /></mesh>
    case 'intestine':
      return (
        <mesh position={p} material={mat}>
          <torusKnotGeometry args={[0.16, 0.05, 64, 8, 2, 3]} />
        </mesh>
      )
    case 'kidney':
      return <mesh position={p} scale={[3.2, 0.5, 0.4]} material={mat}><sphereGeometry args={[0.16, 18, 12]} /></mesh>
    default:
      return <mesh position={p} material={mat}><sphereGeometry args={[0.16, 16, 12]} /></mesh>
  }
}

const Renderer: PartRenderer = OrganMesh

export function Organs() {
  return <>{ORGAN_PARTS.map(def => <PartShell key={def.id} def={def} Renderer={Renderer} />)}</>
}
```

- [ ] **Step 2: swap in `PerchScene.tsx`** — delete the entire `{/* SPIKE ORGANS … */}` group from Task 6 and add the import + `<Organs />` in its place:
```tsx
import { Organs } from './Organs'
// ...
          <Scalpel />
          <Organs />
```

- [ ] **Step 3: gate** — `npm run typecheck && npm test` → green. `git grep -n "SPIKE ORGANS" src` → no matches.
- [ ] **Step 4: visual** — after cutting, 7 distinct organs in place; hovering (in internal phase) highlights, others dim.
- [ ] **Step 5: commit**

```bash
git add src/labs/perch/scene/Organs.tsx src/labs/perch/scene/PerchScene.tsx
git commit -m "feat(perch): 7 internal organs via PartShell; drop spike organs"
```

---

### Task 11: `ExternalParts` (9 hotspots) via PartShell

**Files:** Create `src/labs/perch/scene/ExternalParts.tsx`. Modify `scene/PerchScene.tsx`.

- [ ] **Step 1: create `ExternalParts.tsx`** — transparent clickable hotspots over the external features (the body/fins are drawn by `PerchBody`; these are pickable proxies that glow on hover/select).

```tsx
import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, MeshStandardMaterial } from 'three'
import type { PartDef } from '../content/parts'
import { PARTS } from '../content/parts'
import { useReducedMotion } from '../../../sdk/a11y/useReducedMotion'
import { dampAlpha } from './anatomy'
import { PartShell, type PartVisualState, type PartRenderer } from './PartShell'

const EXTERNAL_PARTS = PARTS.filter(p => p.phase === 'external')

/** A soft hotspot sphere at the part anchor: invisible until hovered/selected, then a colored glow. */
function Hotspot({ def, state }: { def: PartDef; state: PartVisualState }) {
  const reduced = useReducedMotion()
  const mat = useMemo(() => new MeshStandardMaterial({
    color: def.color, emissive: new Color(def.color), emissiveIntensity: 0,
    transparent: true, opacity: 0,
  }), [def.color])
  useFrame((_, dt) => {
    const a = reduced ? 1 : dampAlpha(dt, 8)
    const wantOpacity = state.selected ? 0.5 : (state.targetEmissive > 0 ? 0.3 : 0.0)
    mat.opacity += (wantOpacity - mat.opacity) * a
    mat.emissiveIntensity += (state.targetEmissive - mat.emissiveIntensity) * a
  })
  return (
    <mesh position={def.position} material={mat}>
      <sphereGeometry args={[0.32, 16, 12]} />
    </mesh>
  )
}

const Renderer: PartRenderer = Hotspot

export function ExternalParts() {
  return <>{EXTERNAL_PARTS.map(def => <PartShell key={def.id} def={def} Renderer={Renderer} />)}</>
}
```

- [ ] **Step 2: mount** — in `PerchScene.tsx`, add after `<Organs />`:
```tsx
import { ExternalParts } from './ExternalParts'
// ...
          <Organs />
          <ExternalParts />
```

- [ ] **Step 3: gate** — `npm run typecheck && npm test` → green.
- [ ] **Step 4: visual** — in the external phase, hovering near a fin/operculum/etc. glows a soft hotspot; clicking selects it. Hotspots are inert once cut to internal.
- [ ] **Step 5: commit**

```bash
git add src/labs/perch/scene/ExternalParts.tsx src/labs/perch/scene/PerchScene.tsx
git commit -m "feat(perch): external-structure hotspots via PartShell"
```

---

# PHASE C — UI + polish

### Task 12: HUD + rail + info card + in-scene label

**Files:** Create `src/labs/perch/ui/PartRail.tsx`, `src/labs/perch/ui/InfoCard.tsx`, `src/labs/perch/ui/HUD.tsx`. Modify `scene/PerchScene.tsx` (mount `<SelectedLabel/>` + `<HUD/>`).

- [ ] **Step 1: `ui/PartRail.tsx`** (phase-filtered chips + progress; mirror paramecium rail)

```tsx
import type { CSSProperties } from 'react'
import { PARTS } from '../content/parts'
import { usePerchState } from '../state/PerchState'
import { useViewport } from '../../../sdk/a11y/useViewport'

export function PartRail() {
  const phase = usePerchState(s => s.phase)
  const selectedId = usePerchState(s => s.selectedPartId)
  const viewed = usePerchState(s => s.viewedPartIds)
  const select = usePerchState(s => s.select)
  const { breakpoint } = useViewport()
  const isPhone = breakpoint === 'phone'
  if (phase === 'intro') return null

  const parts = PARTS.filter(p => p.phase === phase)
  const title = phase === 'external' ? 'Зовнішня будова' : 'Внутрішні органи'

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
  const progress: CSSProperties = { color: '#9fc4c0', fontSize: 12, fontWeight: 600, letterSpacing: '0.04em', padding: isPhone ? '8px 6px' : '0 4px 6px', alignSelf: isPhone ? 'center' : 'flex-start' }

  return (
    <nav style={railStyle} aria-label={title}>
      {!isPhone && <div style={progress}>{title.toUpperCase()} · {viewed.length}/{PARTS.length}</div>}
      {parts.map(p => {
        const active = selectedId === p.id
        const isViewed = viewed.includes(p.id)
        return (
          <button key={p.id} type="button" onClick={() => select(p.id)} style={chip(active)} aria-pressed={active} aria-label={`${p.label}${isViewed ? ', вивчено' : ''}`}>
            <span>{p.label}</span>
            <span aria-hidden style={{ opacity: isViewed ? 1 : 0.25 }}>{isViewed ? '✓' : '○'}</span>
          </button>
        )
      })}
      {isPhone && <div style={progress}>{viewed.length}/{PARTS.length}</div>}
    </nav>
  )
}
```

- [ ] **Step 2: `ui/InfoCard.tsx`** (mirror paramecium)

```tsx
import type { CSSProperties } from 'react'
import { GlassPanel } from '../../../sdk/ui/GlassPanel'
import { Button } from '../../../sdk/ui/Button'
import { useViewport } from '../../../sdk/a11y/useViewport'
import { usePerchState } from '../state/PerchState'
import { getPart } from '../content/parts'

export function InfoCard() {
  const selectedId = usePerchState(s => s.selectedPartId)
  const deselect = usePerchState(s => s.deselect)
  const { breakpoint } = useViewport()
  const isPhone = breakpoint === 'phone'
  if (!selectedId) return null
  const p = getPart(selectedId)
  const wrap: CSSProperties = { position: 'fixed', zIndex: 6, ...(isPhone ? { left: 12, right: 12, bottom: 84 } : { right: 18, top: 96, width: 360 }) }
  return (
    <div style={wrap}>
      <GlassPanel variant="strong" style={{ padding: 22 }} role="dialog" aria-label={p.label}>
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 12, fontFamily: '"Inter", system-ui, sans-serif' }}>{p.label}</div>
        <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {p.facts.map((f, i) => <li key={i} style={{ fontSize: 14, lineHeight: 1.5, color: '#3a3a3f' }}>{f}</li>)}
        </ul>
        <div style={{ marginTop: 18 }}><Button variant="secondary" fullWidth onClick={deselect}>Закрити</Button></div>
      </GlassPanel>
    </div>
  )
}
```

- [ ] **Step 3: `ui/HUD.tsx`** (back link / suture / progress badge / credit + rail + card)

```tsx
import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { PARTS } from '../content/parts'
import { usePerchState } from '../state/PerchState'
import { PartRail } from './PartRail'
import { InfoCard } from './InfoCard'

export function HUD() {
  const phase = usePerchState(s => s.phase)
  const selectedId = usePerchState(s => s.selectedPartId)
  const viewed = usePerchState(s => s.viewedPartIds)
  const suture = usePerchState(s => s.suture)
  const allViewed = viewed.length === PARTS.length

  const pill: CSSProperties = {
    position: 'fixed', zIndex: 6, top: 18, color: 'rgba(234,246,244,0.8)', textDecoration: 'none', fontSize: 13,
    fontFamily: '"Inter", system-ui, sans-serif', fontWeight: 500, letterSpacing: '0.04em', padding: '8px 12px',
    borderRadius: 100, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(150,230,220,0.16)', backdropFilter: 'blur(20px)', cursor: 'pointer',
  }
  const badge: CSSProperties = {
    position: 'fixed', zIndex: 6, top: 18, left: '50%', transform: 'translateX(-50%)', padding: '10px 18px', borderRadius: 100,
    background: 'rgba(95,227,208,0.16)', border: '1px solid rgba(95,227,208,0.4)', color: '#bdf4ea', fontSize: 13, fontWeight: 700, fontFamily: '"Inter", system-ui, sans-serif',
  }
  const credit: CSSProperties = {
    position: 'fixed', zIndex: 5, right: 14, bottom: 10, maxWidth: 220, textAlign: 'right',
    color: 'rgba(234,246,244,0.3)', fontSize: 10, lineHeight: 1.4, fontFamily: '"Inter", system-ui, sans-serif', pointerEvents: 'none',
  }

  return (
    <>
      <Link to="/biology" style={{ ...pill, left: 18 }} aria-label="Назад до біології">← Біологія</Link>
      {phase === 'internal' && <button type="button" style={{ ...pill, left: 140 }} onClick={() => suture()} aria-label="Зашити (закрити розріз)">Зашити</button>}
      {allViewed && !selectedId && <div style={badge}>Готово — ти вивчив усю будову 🎉</div>}
      <div style={credit}>Річковий окунь · процедурна 3D-модель · NOVA EVRIKA</div>
      <PartRail />
      <InfoCard />
    </>
  )
}
```

- [ ] **Step 4: in-scene label + HUD + reduced** — in `scene/PerchScene.tsx`:
  - add imports:
    ```tsx
    import { usePerchState } from '../state/PerchState'
    import { getPart } from '../content/parts'
    import { PartLabel } from './PartLabel'
    import { HUD } from '../ui/HUD'
    ```
  - add a `SelectedLabel` helper inside the file (above `PerchScene`):
    ```tsx
    function SelectedLabel() {
      const id = usePerchState(s => s.selectedPartId)
      if (!id) return null
      return <PartLabel def={getPart(id)} />
    }
    ```
  - mount `<SelectedLabel />` inside `<Suspense>` (after `<ExternalParts />`), and `<HUD />` after `</Canvas>` (before `<Loader />`).

- [ ] **Step 5: gate** — `npm run typecheck && npm test` → green.
- [ ] **Step 6: visual** — rail switches label/contents between phases; clicking a part shows its pill + leader + facts card; «Зашити» closes the flap and returns to external; badge appears at 16/16.
- [ ] **Step 7: commit**

```bash
git add src/labs/perch/ui src/labs/perch/scene/PerchScene.tsx
git commit -m "feat(perch): HUD + phase-filtered rail + info card + in-scene labels"
```

---

### Task 13: Polish — idle life, suture easing audit, reduced-motion

**Files:** Modify `scene/PerchBody.tsx` (idle breathing), `scene/PerchScene.tsx` (none if already gated). Verify reduced-motion across the lab.

- [ ] **Step 1: gentle idle "breathing"** — in `PerchBody.tsx`: add `const bodyRef = useRef<Group>(null)` next to `flapRef`, change the root `return ( <group>` to `<group ref={bodyRef}>`, and replace the whole `useFrame` block with:

```tsx
  useFrame((st, dt) => {
    const flap = flapRef.current
    if (flap) {
      const target = flapAngle(cutProgress)
      flap.rotation.x = reduced ? target : flap.rotation.x + (target - flap.rotation.x) * dampAlpha(dt, 9)
    }
    const body = bodyRef.current
    if (body) body.scale.setScalar(reduced ? 1 : 1 + Math.sin(st.clock.elapsedTime * 1.2) * 0.012)
  })
```
(Faint — a fish at rest on a tray, just a breath. `Group` is already imported in `PerchBody.tsx`.)

- [ ] **Step 2: reduced-motion audit** — confirm by reading each `useFrame`: `PerchBody` (flap → instant when reduced; breathing → none), `Organs` (gills sway → none when reduced; emissive/opacity lerp is fine), `ExternalParts` (lerp only), `Scalpel` (drag-driven, no auto-motion). Fix any motion not gated.

- [ ] **Step 3: gate** — `npm run typecheck && npm test` → green.
- [ ] **Step 4: visual** — at rest the fish breathes faintly + gills sway; with OS "reduce motion" on, all idle motion stops and the cut snaps instantly while still draggable.
- [ ] **Step 5: commit**

```bash
git add src/labs/perch/scene/PerchBody.tsx
git commit -m "polish(perch): idle breathing + reduced-motion audit"
```

---

# PHASE D — Finish

### Task 14: Full gate, final review, finish branch

- [ ] **Step 1: full gate** — `npm run typecheck` · `npm test` · `npm run build` all succeed.
- [ ] **Step 2: final review** — controller dispatches a final code-reviewer (most capable model) over `git diff master..feat/biology-perch-lab`, checking: phase-gated picking (external vs internal), cut math + flap hinge correctness, reduced-motion on every `useFrame`, no shared-material leaks, label coverage for all 16 parts, `noUnusedLocals` clean, spike organs removed, subjects/route wired.
- [ ] **Step 3: browser smoke** — `/biology/perch`: intro → external parts clickable → drag-cut opens flap → 7 organs clickable → labels + facts → «Зашити» closes → «← Біологія» → phone layout → reduced-motion.
- [ ] **Step 4: finish** — REQUIRED SUB-SKILL `superpowers:finishing-a-development-branch`: `merge --no-ff` → `master`, push (confirm with user), delete branch.

---

## Self-review notes (author)

- **Spec coverage:** 3 phases + cut mechanic (T2 state, T4 flap, T5 scalpel) ✓; procedural perch + defining features (T4) ✓; 16 parts 9/7 (T8) ✓; internal organs (T10) ✓; external parts (T11) ✓; PartShell/PartLabel mirror (T9) ✓; tray/ambient (T3) ✓; rail/info-card/HUD + «Зашити» + N/16 badge (T12) ✓; pure cut math tests (T1) + state tests (T2) + content tests (T8) ✓; reduced-motion (T13 audit; gated per task) ✓; spike gate (T7) ✓; subjects+route (T3) ✓.
- **Type consistency:** `PartId` is a temp `string` alias in T2, swapped to the `content/parts` import in T8 (flagged in both). `PartVisualState`/`PartRenderer` defined once in `PartShell.tsx`. `flapAngle`/`cutProgressFromDrag`/`clamp01` signatures match their tests. `usePerchState` action names (`start/setCut/suture/select/deselect/reset`) consistent across store, UI, scalpel.
- **Per-task gate independence:** T3's `PerchScene` omits `useReducedMotion` until T12 needs it (no unused local); spike organs (T6) removed in T10 with a `git grep` check; `getPart`/`PartLabel`/`HUD` imports land in the task that uses them.
- **Aesthetic constants** (fish proportions, fin shapes, hinge offset, organ positions) are explicitly spike-tunable in T4–T6 — the T7 prod gate exists to validate exactly these before the full build.
