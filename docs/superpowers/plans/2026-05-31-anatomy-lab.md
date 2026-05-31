# Anatomy Lab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Biology "Anatomy" lab — a semi-transparent human body whose 5 internal organs (brain, heart, lungs, liver, kidneys) each extract → rotate → read → return, free-explore, progress N/5.

**Architecture:** New `biology` subject + `/biology` page + `/biology/anatomy` route, following the existing lab pattern (`src/labs/<id>/index.tsx` phase machine + register in `subjects.ts`). The scene loads 6 pre-downloaded, auto-registering HRA Male GLBs (in `public/models/`) into one group without re-centering. A Zustand store tracks the selected organ + viewed set. Each organ is a self-animating R3F component (extract/spin/fade) driven by the store; the body fades when any organ is selected. UI overlay (rail + info card) reuses SDK components.

**Tech Stack:** React 19, @react-three/fiber 9, @react-three/drei 10, three 0.184, Zustand 5, Vitest 4, TypeScript strict + noUnusedLocals.

**Spec:** `docs/superpowers/specs/2026-05-31-anatomy-lab-design.md` (commit 8cdf610).

---

## File Structure

```
src/site/content/subjects.ts        MODIFY  add 'biology' to SubjectId union + SUBJECTS entry
src/site/pages/BiologyPage.tsx       CREATE  subject lab-list page (clone of PhysicsPage)
src/app/App.tsx                      MODIFY  add /biology + /biology/anatomy routes; (T12) drop spike routes

src/labs/anatomy/
  index.tsx                CREATE  AnatomyLab — phase machine (intro / in-progress)
  content/organs.ts        CREATE  OrganId, OrganDef, ORGANS[] (files, colors, facts, mirrored)
  content/organs.test.ts   CREATE  data sanity unit tests
  state/AnatomyState.ts    CREATE  Zustand store (phase, selectedOrganId, viewedOrganIds)
  state/AnatomyState.test.ts CREATE store unit tests
  ui/IntroScreen.tsx       CREATE  staged intro (mirror brownian IntroScreen)
  scene/focus.ts           CREATE  shared anchor + damping constants/helpers
  scene/useFocusAnimation.ts CREATE shared per-organ extract/spin/fade frame loop
  scene/Body.tsx           CREATE  translucent skin, fades when any organ selected
  scene/Organ.tsx          CREATE  one focusable organ (single mesh)
  scene/Kidneys.tsx        CREATE  kidney + mirrored twin (the pair, one selectable unit)
  scene/AnatomyScene.tsx   CREATE  Canvas + lights + Environment + Body + organs + OrbitControls + HUD + Loader
  ui/OrganRail.tsx         CREATE  5 organ chips + "вивчено N/5"
  ui/OrganInfoCard.tsx     CREATE  selected organ label + facts + "Повернути"
  ui/HUD.tsx               CREATE  back link + rail + info card + completion badge (responsive)

src/labs/anatomy/HeartSlice.tsx      DELETE (T12)
src/labs/anatomy/AnatomySpike.tsx    DELETE (T12)
```

**Conventions to follow (verified in repo):**
- Zustand: `create<T>((set, get) => ({...}))`, consumed as `useStore(s => s.field)`.
- Lab entry mirrors `src/labs/brownian-diffusion/index.tsx`.
- `Button` props: `{ onClick, variant?: 'primary'|'secondary', children, disabled?, fullWidth?, title?, 'aria-label'? }`.
- `useViewport(): { width, height, breakpoint: 'desktop'|'tablet'|'phone' }`.
- `useReducedMotion()` returns a boolean.
- Adding a subject to `SUBJECTS` auto-renders its `SubjectPill` on the landing page (no other change needed there).

---

### Task 1: Biology subject + BiologyPage + /biology route

**Files:**
- Modify: `src/site/content/subjects.ts`
- Create: `src/site/content/subjects.test.ts`
- Create: `src/site/pages/BiologyPage.tsx`
- Modify: `src/app/App.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/site/content/subjects.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { SUBJECTS, findSubject } from './subjects'

describe('subjects registry', () => {
  it('exposes an available biology subject with the anatomy lab', () => {
    const bio = findSubject('biology')
    expect(bio).toBeDefined()
    expect(bio?.status).toBe('available')
    expect(bio?.path).toBe('/biology')
    const anatomy = bio?.labs.find(l => l.id === 'anatomy')
    expect(anatomy).toBeDefined()
    expect(anatomy?.path).toBe('/biology/anatomy')
    expect(anatomy?.status).toBe('available')
  })

  it('keeps every subject path unique', () => {
    const paths = SUBJECTS.map(s => s.path)
    expect(new Set(paths).size).toBe(paths.length)
  })
})
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run src/site/content/subjects.test.ts`
Expected: FAIL — `findSubject('biology')` is `undefined` (and `'biology'` is not assignable to `SubjectId`).

- [ ] **Step 3: Add the biology subject**

In `src/site/content/subjects.ts`, extend the union and append the entry:

```ts
export type SubjectId = 'math' | 'history' | 'physics' | 'biology'
```

Append to the `SUBJECTS` array (after the `physics` entry, before the closing `]`):

```ts
  {
    id: 'biology',
    title: 'Біологія',
    path: '/biology',
    status: 'available',
    labs: [
      {
        id: 'anatomy',
        title: 'Внутрішні органи людини',
        subtitle: 'Мозок · Серце · Легені · Печінка · Нирки',
        path: '/biology/anatomy',
        status: 'available',
      },
    ],
  },
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npx vitest run src/site/content/subjects.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Create BiologyPage**

Create `src/site/pages/BiologyPage.tsx` (clone of `PhysicsPage` with biology kicker):

```tsx
import type { CSSProperties } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { GlowBackground } from '../components/GlowBackground'
import { BrandHero } from '../components/BrandHero'
import { LabCard } from '../components/LabCard'
import { findSubject } from '../content/subjects'

const KICKER = 'ПРЕДМЕТ • БІОЛОГІЯ'

export function BiologyPage() {
  const subject = findSubject('biology')
  if (!subject) return <Navigate to="/" replace />

  const wrapStyle: CSSProperties = {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '40px 24px 64px',
  }

  const backStyle: CSSProperties = {
    alignSelf: 'flex-start',
    color: 'rgba(255, 255, 255, 0.6)',
    textDecoration: 'none',
    fontSize: 13,
    fontFamily: '"Inter", system-ui, sans-serif',
    fontWeight: 500,
    letterSpacing: '0.05em',
    padding: '8px 12px',
    borderRadius: 100,
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
  }

  const labsStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
    marginTop: 32,
    width: '100%',
    alignItems: 'center',
  }

  return (
    <>
      <GlowBackground />
      <main style={wrapStyle}>
        <Link to="/" style={backStyle} aria-label="Назад на головну">← Усі предмети</Link>
        <div style={{ marginTop: 32 }}>
          <BrandHero kicker={KICKER} size="medium" />
        </div>
        <div style={labsStyle}>
          {subject.labs.map(lab => (
            <LabCard key={lab.id} lab={lab} />
          ))}
        </div>
      </main>
    </>
  )
}
```

- [ ] **Step 6: Wire the /biology route**

In `src/app/App.tsx`, add the import after the `PhysicsPage` import:

```tsx
import { BiologyPage } from '../site/pages/BiologyPage'
```

And add the route after the `/physics` route line (`<Route path="/physics" element={<PhysicsPage />} />`):

```tsx
        <Route path="/biology" element={<BiologyPage />} />
```

(The `/biology/anatomy` route is added in Task 10. Until then the lab card link resolves to the `*` → home redirect, which is fine.)

- [ ] **Step 7: Verify build + landing pill**

Run: `npm run build`
Expected: tsc + vite build succeed. The landing page now shows a 4th pill "БІОЛОГІЯ · 1 ЛАБА" (auto from `SUBJECTS`), and `/biology` renders the lab list.

- [ ] **Step 8: Commit**

```bash
git add src/site/content/subjects.ts src/site/content/subjects.test.ts src/site/pages/BiologyPage.tsx src/app/App.tsx
git commit -m "feat(biology): add biology subject + /biology page"
```

---

### Task 2: Organ content data (`organs.ts`)

**Files:**
- Create: `src/labs/anatomy/content/organs.ts`
- Test: `src/labs/anatomy/content/organs.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/labs/anatomy/content/organs.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { ORGANS, ORGAN_IDS } from './organs'

describe('ORGANS data', () => {
  it('has exactly the five expected organs', () => {
    expect(ORGANS).toHaveLength(5)
    expect(ORGAN_IDS).toEqual(['brain', 'heart', 'lungs', 'liver', 'kidneys'])
  })

  it('has unique ids', () => {
    expect(new Set(ORGANS.map(o => o.id)).size).toBe(ORGANS.length)
  })

  it('every organ has a .glb file, a hex colour and ≥3 non-empty facts', () => {
    for (const o of ORGANS) {
      expect(o.file).toMatch(/^\/models\/.+\.glb$/)
      expect(o.color).toMatch(/^#[0-9a-fA-F]{6}$/)
      expect(o.label.length).toBeGreaterThan(0)
      expect(o.facts.length).toBeGreaterThanOrEqual(3)
      for (const f of o.facts) expect(f.trim().length).toBeGreaterThan(0)
    }
  })

  it('only the kidneys are mirrored', () => {
    expect(ORGANS.filter(o => o.mirrored).map(o => o.id)).toEqual(['kidneys'])
  })
})
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run src/labs/anatomy/content/organs.test.ts`
Expected: FAIL — cannot resolve `./organs`.

- [ ] **Step 3: Implement organs.ts**

Create `src/labs/anatomy/content/organs.ts`:

```ts
export type OrganId = 'brain' | 'heart' | 'lungs' | 'liver' | 'kidneys'

export interface OrganDef {
  id: OrganId
  /** Public path to the GLB under public/models. */
  file: string
  /** Ukrainian display name. */
  label: string
  /** Base material colour (hex). */
  color: string
  /** Render a mirrored twin (for the kidney pair). */
  mirrored?: boolean
  /** 3-4 short Ukrainian facts (6-7 клас). */
  facts: string[]
}

export const ORGANS: OrganDef[] = [
  {
    id: 'brain',
    file: '/models/brain.glb',
    label: 'Мозок',
    color: '#cbb4ad',
    facts: [
      'Керує всім тілом — думками, рухами, відчуттями й пам’яттю.',
      'Має близько 86 мільярдів нервових клітин — нейронів.',
      'Важить ~1.4 кг, але споживає майже п’яту частину всієї енергії тіла.',
      'Поділений на дві півкулі — ліву і праву.',
    ],
  },
  {
    id: 'heart',
    file: '/models/heart.glb',
    label: 'Серце',
    color: '#a8392f',
    facts: [
      'М’яз завбільшки з твій кулак, що качає кров по всьому тілу.',
      'Б’ється 60-100 разів на хвилину — близько 100 000 разів на добу.',
      'Має 4 камери: два передсердя і два шлуночки.',
      'Ніколи не відпочиває — працює все життя без зупинки.',
    ],
  },
  {
    id: 'lungs',
    file: '/models/lungs.glb',
    label: 'Легені',
    color: '#cf8a92',
    facts: [
      'Дві губчасті частки, що дають крові кисень і виводять вуглекислий газ.',
      'Права легеня більша (3 частки), ліва менша — поруч місце для серця.',
      'Усередині ~300-500 мільйонів крихітних пухирців — альвеол.',
      'Якщо їх розкласти, площа була б як тенісний корт.',
    ],
  },
  {
    id: 'liver',
    file: '/models/liver.glb',
    label: 'Печінка',
    color: '#6f4034',
    facts: [
      'Найбільший внутрішній орган — важить близько 1.5 кг.',
      'Очищає кров від шкідливих речовин.',
      'Виробляє жовч, яка допомагає перетравлювати їжу.',
      'Єдиний орган, що здатний сам відновлюватися.',
    ],
  },
  {
    id: 'kidneys',
    file: '/models/kidney.glb',
    label: 'Нирки',
    color: '#9c5446',
    mirrored: true,
    facts: [
      'Пара органів у формі квасолин — фільтри тіла.',
      'Очищають кров і утворюють сечу.',
      'За добу проганяють крізь себе ~180 літрів крові.',
      'Підтримують баланс води й солей в організмі.',
    ],
  },
]

export const ORGAN_IDS: OrganId[] = ORGANS.map(o => o.id)

export function getOrgan(id: OrganId): OrganDef {
  const o = ORGANS.find(x => x.id === id)
  if (!o) throw new Error(`Unknown organ id: ${id}`)
  return o
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npx vitest run src/labs/anatomy/content/organs.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/labs/anatomy/content/organs.ts src/labs/anatomy/content/organs.test.ts
git commit -m "feat(anatomy): organ content data + facts"
```

---

### Task 3: Anatomy state store (`AnatomyState.ts`)

**Files:**
- Create: `src/labs/anatomy/state/AnatomyState.ts`
- Test: `src/labs/anatomy/state/AnatomyState.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/labs/anatomy/state/AnatomyState.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useAnatomyState } from './AnatomyState'

const get = () => useAnatomyState.getState()

beforeEach(() => get().reset())

describe('AnatomyState', () => {
  it('starts in intro with nothing selected or viewed', () => {
    expect(get().phase).toBe('intro')
    expect(get().selectedOrganId).toBeNull()
    expect(get().viewedOrganIds).toEqual([])
  })

  it('start() moves to in-progress', () => {
    get().start()
    expect(get().phase).toBe('in-progress')
  })

  it('select() sets the selected organ and records it as viewed', () => {
    get().select('heart')
    expect(get().selectedOrganId).toBe('heart')
    expect(get().viewedOrganIds).toEqual(['heart'])
  })

  it('re-selecting the same organ does not duplicate it in viewed', () => {
    get().select('heart')
    get().deselect()
    get().select('heart')
    expect(get().viewedOrganIds).toEqual(['heart'])
  })

  it('selecting a different organ switches selection and grows the viewed set', () => {
    get().select('heart')
    get().select('brain')
    expect(get().selectedOrganId).toBe('brain')
    expect(get().viewedOrganIds).toEqual(['heart', 'brain'])
  })

  it('deselect() clears selection but keeps viewed history', () => {
    get().select('liver')
    get().deselect()
    expect(get().selectedOrganId).toBeNull()
    expect(get().viewedOrganIds).toEqual(['liver'])
  })

  it('reset() returns to the initial state', () => {
    get().start()
    get().select('lungs')
    get().reset()
    expect(get().phase).toBe('intro')
    expect(get().selectedOrganId).toBeNull()
    expect(get().viewedOrganIds).toEqual([])
  })
})
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run src/labs/anatomy/state/AnatomyState.test.ts`
Expected: FAIL — cannot resolve `./AnatomyState`.

- [ ] **Step 3: Implement AnatomyState.ts**

Create `src/labs/anatomy/state/AnatomyState.ts`:

```ts
import { create } from 'zustand'
import type { OrganId } from '../content/organs'

export type AnatomyPhase = 'intro' | 'in-progress'

type AnatomyState = {
  phase: AnatomyPhase
  selectedOrganId: OrganId | null
  viewedOrganIds: OrganId[]
  start: () => void
  select: (id: OrganId) => void
  deselect: () => void
  reset: () => void
}

export const useAnatomyState = create<AnatomyState>((set, get) => ({
  phase: 'intro',
  selectedOrganId: null,
  viewedOrganIds: [],

  start: () => set({ phase: 'in-progress' }),

  select: (id) => {
    const { viewedOrganIds } = get()
    const viewed = viewedOrganIds.includes(id) ? viewedOrganIds : [...viewedOrganIds, id]
    set({ selectedOrganId: id, viewedOrganIds: viewed })
  },

  deselect: () => set({ selectedOrganId: null }),

  reset: () => set({ phase: 'intro', selectedOrganId: null, viewedOrganIds: [] }),
}))
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npx vitest run src/labs/anatomy/state/AnatomyState.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/labs/anatomy/state/AnatomyState.ts src/labs/anatomy/state/AnatomyState.test.ts
git commit -m "feat(anatomy): selection + viewed-set state store"
```

---

### Task 4: IntroScreen

**Files:**
- Create: `src/labs/anatomy/ui/IntroScreen.tsx`

(No unit test — intro screens are not unit-tested in this repo; verified by build. Mirrors `src/labs/brownian-diffusion/ui/IntroScreen.tsx`.)

- [ ] **Step 1: Implement IntroScreen.tsx**

Create `src/labs/anatomy/ui/IntroScreen.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { useAnatomyState } from '../state/AnatomyState'
import { Button } from '../../../sdk/ui/Button'
import { useViewport } from '../../../sdk/a11y/useViewport'

export function IntroScreen() {
  const start = useAnatomyState(s => s.start)
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
      background: 'linear-gradient(180deg, #fafafa 0%, #cdcdd2 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      color: '#1d1d1f', padding: 32,
      fontFamily: '"SF Pro Display", "Inter", system-ui, sans-serif',
    }}>
      <div style={{
        opacity: stage >= 1 ? 1 : 0,
        transform: stage >= 1 ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 600ms ease, transform 600ms ease',
        fontSize: isPhone ? 34 : 56, fontWeight: 200, letterSpacing: -1.5,
        marginBottom: 8, textAlign: 'center',
      }}>
        Біологія
      </div>
      <div style={{
        opacity: stage >= 2 ? 1 : 0,
        transform: stage >= 2 ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 600ms ease, transform 600ms ease',
        fontSize: isPhone ? 22 : 32, fontWeight: 400, color: '#0071e3',
        marginBottom: 40, textAlign: 'center',
      }}>
        Внутрішні органи людини
      </div>
      <div style={{
        opacity: stage >= 3 ? 1 : 0,
        transform: stage >= 3 ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 800ms ease, transform 800ms ease',
        fontSize: 17, color: '#6e6e73', maxWidth: 620,
        textAlign: 'center', lineHeight: 1.55, marginBottom: 48,
      }}>
        Перед тобою — тіло людини. Дістань будь-який орган: мозок, серце, легені,
        печінку чи нирки. Розглянь його з усіх боків, прочитай факти — і постав на місце.
      </div>
      <div style={{
        opacity: stage >= 4 ? 1 : 0,
        transform: stage >= 4 ? 'scale(1)' : 'scale(0.9)',
        transition: 'opacity 400ms ease, transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}>
        <Button onClick={start}>Почати</Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: succeeds (file is not yet imported anywhere; just confirm it compiles).

- [ ] **Step 3: Commit**

```bash
git add src/labs/anatomy/ui/IntroScreen.tsx
git commit -m "feat(anatomy): intro screen"
```

---

### Task 5: Focus constants + shared animation hook

**Files:**
- Create: `src/labs/anatomy/scene/focus.ts`
- Create: `src/labs/anatomy/scene/useFocusAnimation.ts`

(No unit test — these drive R3F frame loops; verified by build + smoke. Pure helpers, used by Organ + Kidneys.)

- [ ] **Step 1: Implement focus.ts**

Create `src/labs/anatomy/scene/focus.ts`:

```ts
/** World-space point in front of the chest where an extracted organ is displayed. */
export const EXTRACT_ANCHOR: [number, number, number] = [0, 0.5, 0.55]

/** Opacity of organs that are NOT the selected one (when something is selected). */
export const ORGAN_FADED_OPACITY = 0.05
/** Resting opacity of the body skin shell. */
export const BODY_REST_OPACITY = 0.2
/** Body skin opacity while an organ is extracted. */
export const BODY_FADED_OPACITY = 0.035

/**
 * Frame-rate-independent damping alpha for lerping toward a target.
 * Larger `smoothing` => snappier. Returns a value in (0, 1].
 */
export function dampAlpha(dt: number, smoothing = 8): number {
  return 1 - Math.exp(-smoothing * Math.max(dt, 0))
}
```

- [ ] **Step 2: Implement useFocusAnimation.ts**

Create `src/labs/anatomy/scene/useFocusAnimation.ts`:

```ts
import type { RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, Vector3, MeshPhysicalMaterial } from 'three'
import { ORGAN_FADED_OPACITY, dampAlpha } from './focus'

const REST = new Vector3(0, 0, 0)

/**
 * Drives one organ's extract translation, inspection spin, and fade.
 * - extractRef.position eases REST <-> anchorOffset (anchorOffset places the
 *   organ's pivot on EXTRACT_ANCHOR).
 * - spinRef.rotation.y spins while selected, eases back to 0 otherwise.
 * - every material opacity eases to full (selected / nothing selected) or faded,
 *   and emissiveIntensity eases up on hover (only in the resting state).
 * Respects reduced motion by snapping instead of easing and never spinning.
 */
export function useFocusAnimation(args: {
  extractRef: RefObject<Group | null>
  spinRef: RefObject<Group | null>
  materials: MeshPhysicalMaterial[]
  anchorOffset: Vector3
  isSelected: boolean
  anySelected: boolean
  hovered: boolean
  reduced: boolean
}) {
  const { extractRef, spinRef, materials, anchorOffset, isSelected, anySelected, hovered, reduced } = args

  useFrame((_, dt) => {
    const a = reduced ? 1 : dampAlpha(dt)

    extractRef.current?.position.lerp(isSelected ? anchorOffset : REST, a)

    if (spinRef.current) {
      if (isSelected && !reduced) spinRef.current.rotation.y += dt * 0.5
      else spinRef.current.rotation.y *= 1 - a
    }

    const targetOpacity = !anySelected || isSelected ? 1 : ORGAN_FADED_OPACITY
    const targetEmissive = hovered && !anySelected ? 0.3 : 0
    for (const mat of materials) {
      mat.opacity += (targetOpacity - mat.opacity) * a
      mat.emissiveIntensity += (targetEmissive - mat.emissiveIntensity) * a
      mat.depthWrite = mat.opacity > 0.5
    }
  })
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/labs/anatomy/scene/focus.ts src/labs/anatomy/scene/useFocusAnimation.ts
git commit -m "feat(anatomy): shared focus constants + organ animation hook"
```

---

### Task 6: Organ component (single mesh)

**Files:**
- Create: `src/labs/anatomy/scene/Organ.tsx`

(No unit test — R3F component; verified by build + smoke.)

**Context:** An organ is loaded at its baked HRA world position. To spin it around its own centre while also being able to translate it out of the body, we nest groups: `extractRef` (translation) → `position={pivot}` → `spinRef` (rotation) → `position={-pivot}` → the model at its baked position. `pivot` is the organ's world-space bbox centre.

- [ ] **Step 1: Implement Organ.tsx**

Create `src/labs/anatomy/scene/Organ.tsx`:

```tsx
import { useMemo, useRef, useState } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { Box3, Vector3, Group, Mesh, MeshPhysicalMaterial, Color, type Object3D } from 'three'
import { useAnatomyState } from '../state/AnatomyState'
import type { OrganId } from '../content/organs'
import { useReducedMotion } from '../../../sdk/a11y/useReducedMotion'
import { EXTRACT_ANCHOR } from './focus'
import { useFocusAnimation } from './useFocusAnimation'

export function Organ({ id, url, color }: { id: OrganId; url: string; color: string }) {
  const { scene } = useGLTF(url)
  const selectedId = useAnatomyState(s => s.selectedOrganId)
  const select = useAnatomyState(s => s.select)
  const reduced = useReducedMotion()
  const [hovered, setHovered] = useState(false)

  const extractRef = useRef<Group>(null)
  const spinRef = useRef<Group>(null)

  // Paint materials once and compute the world-space pivot (bbox centre).
  const { pivot, materials } = useMemo(() => {
    const mats: MeshPhysicalMaterial[] = []
    scene.traverse((o: Object3D) => {
      const m = o as Mesh
      if (m.isMesh) {
        const mat = new MeshPhysicalMaterial({
          color, roughness: 0.55, metalness: 0,
          clearcoat: 0.35, clearcoatRoughness: 0.45,
          emissive: new Color(color), emissiveIntensity: 0,
          transparent: true, opacity: 1,
        })
        m.material = mat
        m.castShadow = true
        mats.push(mat)
      }
    })
    const center = new Box3().setFromObject(scene).getCenter(new Vector3())
    return { pivot: center, materials: mats }
  }, [scene, color])

  const anchorOffset = useMemo(
    () => new Vector3(...EXTRACT_ANCHOR).sub(pivot),
    [pivot],
  )
  const negPivot = useMemo(() => pivot.clone().negate(), [pivot])

  useFocusAnimation({
    extractRef, spinRef, materials, anchorOffset,
    isSelected: selectedId === id,
    anySelected: selectedId !== null,
    hovered, reduced,
  })

  return (
    <group ref={extractRef}>
      <group position={pivot}>
        <group ref={spinRef}>
          <group position={negPivot}>
            <primitive
              object={scene}
              onPointerOver={(e: ThreeEvent<PointerEvent>) => {
                e.stopPropagation()
                setHovered(true)
                document.body.style.cursor = 'pointer'
              }}
              onPointerOut={() => {
                setHovered(false)
                document.body.style.cursor = 'auto'
              }}
              onPointerDown={(e: ThreeEvent<PointerEvent>) => {
                e.stopPropagation()
                select(id)
              }}
            />
          </group>
        </group>
      </group>
    </group>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: succeeds (TS strict: note `ThreeEvent<PointerEvent>` import from `@react-three/fiber`).

- [ ] **Step 3: Commit**

```bash
git add src/labs/anatomy/scene/Organ.tsx
git commit -m "feat(anatomy): focusable single-organ component"
```

---

### Task 7: Kidneys component (mirrored pair)

**Files:**
- Create: `src/labs/anatomy/scene/Kidneys.tsx`

(No unit test — R3F component; verified by build + smoke.)

**Context:** Same nested structure as `Organ`, but the single kidney GLB is cloned twice — the original at its baked position plus a mirrored twin (`scale=[-1,1,1]`) — and treated as ONE selectable unit, `id='kidneys'`. The pivot is the symmetric pair centre `(0, c.y, c.z)`.

- [ ] **Step 1: Implement Kidneys.tsx**

Create `src/labs/anatomy/scene/Kidneys.tsx`:

```tsx
import { useMemo, useRef, useState } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { Box3, Vector3, Group, Mesh, MeshPhysicalMaterial, Color, type Object3D } from 'three'
import { useAnatomyState } from '../state/AnatomyState'
import { useReducedMotion } from '../../../sdk/a11y/useReducedMotion'
import { EXTRACT_ANCHOR } from './focus'
import { useFocusAnimation } from './useFocusAnimation'

function paint(root: Object3D, color: string, sink: MeshPhysicalMaterial[]) {
  root.traverse((o: Object3D) => {
    const m = o as Mesh
    if (m.isMesh) {
      const mat = new MeshPhysicalMaterial({
        color, roughness: 0.55, metalness: 0,
        clearcoat: 0.35, clearcoatRoughness: 0.45,
        emissive: new Color(color), emissiveIntensity: 0,
        transparent: true, opacity: 1,
      })
      m.material = mat
      m.castShadow = true
      sink.push(mat)
    }
  })
}

export function Kidneys({ url, color }: { url: string; color: string }) {
  const { scene } = useGLTF(url)
  const selectedId = useAnatomyState(s => s.selectedOrganId)
  const select = useAnatomyState(s => s.select)
  const reduced = useReducedMotion()
  const [hovered, setHovered] = useState(false)

  const extractRef = useRef<Group>(null)
  const spinRef = useRef<Group>(null)

  const { pivot, right, left, materials } = useMemo(() => {
    const center = new Box3().setFromObject(scene).getCenter(new Vector3())
    const pairPivot = new Vector3(0, center.y, center.z)
    const mats: MeshPhysicalMaterial[] = []
    const rightClone = scene.clone(true)
    const leftClone = scene.clone(true)
    paint(rightClone, color, mats)
    paint(leftClone, color, mats)
    return { pivot: pairPivot, right: rightClone, left: leftClone, materials: mats }
  }, [scene, color])

  const anchorOffset = useMemo(() => new Vector3(...EXTRACT_ANCHOR).sub(pivot), [pivot])
  const negPivot = useMemo(() => pivot.clone().negate(), [pivot])

  useFocusAnimation({
    extractRef, spinRef, materials, anchorOffset,
    isSelected: selectedId === 'kidneys',
    anySelected: selectedId !== null,
    hovered, reduced,
  })

  const onOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'
  }
  const onOut = () => { setHovered(false); document.body.style.cursor = 'auto' }
  const onDown = (e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); select('kidneys') }

  return (
    <group ref={extractRef}>
      <group position={pivot}>
        <group ref={spinRef}>
          <group position={negPivot}>
            <primitive object={right} onPointerOver={onOver} onPointerOut={onOut} onPointerDown={onDown} />
            <group scale={[-1, 1, 1]}>
              <primitive object={left} onPointerOver={onOver} onPointerOut={onOut} onPointerDown={onDown} />
            </group>
          </group>
        </group>
      </group>
    </group>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/labs/anatomy/scene/Kidneys.tsx
git commit -m "feat(anatomy): mirrored kidney pair component"
```

---

### Task 8: Body shell component

**Files:**
- Create: `src/labs/anatomy/scene/Body.tsx`

(No unit test — R3F component; verified by build + smoke.)

- [ ] **Step 1: Implement Body.tsx**

Create `src/labs/anatomy/scene/Body.tsx`:

```tsx
import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { DoubleSide, Mesh, MeshPhysicalMaterial, type Object3D } from 'three'
import { useAnatomyState } from '../state/AnatomyState'
import { useReducedMotion } from '../../../sdk/a11y/useReducedMotion'
import { BODY_REST_OPACITY, BODY_FADED_OPACITY, dampAlpha } from './focus'

export function Body({ url }: { url: string }) {
  const { scene } = useGLTF(url)
  const anySelected = useAnatomyState(s => s.selectedOrganId !== null)
  const reduced = useReducedMotion()

  const materials = useMemo(() => {
    const mats: MeshPhysicalMaterial[] = []
    scene.traverse((o: Object3D) => {
      const m = o as Mesh
      if (m.isMesh) {
        const mat = new MeshPhysicalMaterial({
          color: '#a8c2d4', transparent: true, opacity: BODY_REST_OPACITY,
          roughness: 0.35, metalness: 0, side: DoubleSide, depthWrite: false,
        })
        m.material = mat
        m.renderOrder = 3
        mats.push(mat)
      }
    })
    return mats
  }, [scene])

  useFrame((_, dt) => {
    const a = reduced ? 1 : dampAlpha(dt)
    const target = anySelected ? BODY_FADED_OPACITY : BODY_REST_OPACITY
    for (const mat of materials) mat.opacity += (target - mat.opacity) * a
  })

  return <primitive object={scene} />
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/labs/anatomy/scene/Body.tsx
git commit -m "feat(anatomy): translucent body shell that fades on selection"
```

---

### Task 9: Overlay UI — OrganRail, OrganInfoCard, HUD

**Files:**
- Create: `src/labs/anatomy/ui/OrganRail.tsx`
- Create: `src/labs/anatomy/ui/OrganInfoCard.tsx`
- Create: `src/labs/anatomy/ui/HUD.tsx`

(No unit test — presentational overlays; verified by build + smoke.)

- [ ] **Step 1: Implement OrganRail.tsx**

Create `src/labs/anatomy/ui/OrganRail.tsx`:

```tsx
import type { CSSProperties } from 'react'
import { ORGANS } from '../content/organs'
import { useAnatomyState } from '../state/AnatomyState'
import { useViewport } from '../../../sdk/a11y/useViewport'

export function OrganRail() {
  const selectedId = useAnatomyState(s => s.selectedOrganId)
  const viewed = useAnatomyState(s => s.viewedOrganIds)
  const select = useAnatomyState(s => s.select)
  const { breakpoint } = useViewport()
  const isPhone = breakpoint === 'phone'

  const railStyle: CSSProperties = {
    position: 'fixed',
    zIndex: 5,
    display: 'flex',
    gap: 8,
    fontFamily: '"Inter", system-ui, sans-serif',
    ...(isPhone
      ? { left: 12, right: 12, bottom: 12, flexDirection: 'row', overflowX: 'auto', padding: 4 }
      : { left: 18, top: 96, flexDirection: 'column', width: 188 }),
  }

  const chip = (active: boolean, isViewed: boolean): CSSProperties => ({
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
    padding: '12px 14px', borderRadius: 12, cursor: 'pointer',
    flex: isPhone ? '0 0 auto' : undefined,
    background: active ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.07)',
    color: active ? '#16171c' : '#ECECF1',
    border: `1px solid ${active ? 'transparent' : 'rgba(255,255,255,0.12)'}`,
    backdropFilter: 'blur(20px)',
    fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap',
    transition: 'background 180ms ease, color 180ms ease',
  })

  const progressStyle: CSSProperties = {
    color: '#9AA3B2', fontSize: 12, fontWeight: 600, letterSpacing: '0.04em',
    padding: isPhone ? '8px 6px' : '0 4px 6px',
    alignSelf: isPhone ? 'center' : 'flex-start',
  }

  return (
    <nav style={railStyle} aria-label="Органи">
      {!isPhone && <div style={progressStyle}>ВИВЧЕНО {viewed.length}/{ORGANS.length}</div>}
      {ORGANS.map(o => {
        const active = selectedId === o.id
        const isViewed = viewed.includes(o.id)
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => select(o.id)}
            style={chip(active, isViewed)}
            aria-pressed={active}
            aria-label={`Орган: ${o.label}${isViewed ? ', вивчено' : ''}`}
          >
            <span>{o.label}</span>
            <span aria-hidden style={{ opacity: isViewed ? 1 : 0.25 }}>{isViewed ? '✓' : '○'}</span>
          </button>
        )
      })}
      {isPhone && <div style={progressStyle}>{viewed.length}/{ORGANS.length}</div>}
    </nav>
  )
}
```

- [ ] **Step 2: Implement OrganInfoCard.tsx**

Create `src/labs/anatomy/ui/OrganInfoCard.tsx`:

```tsx
import type { CSSProperties } from 'react'
import { GlassPanel } from '../../../sdk/ui/GlassPanel'
import { Button } from '../../../sdk/ui/Button'
import { useViewport } from '../../../sdk/a11y/useViewport'
import { useAnatomyState } from '../state/AnatomyState'
import { getOrgan } from '../content/organs'

export function OrganInfoCard() {
  const selectedId = useAnatomyState(s => s.selectedOrganId)
  const deselect = useAnatomyState(s => s.deselect)
  const { breakpoint } = useViewport()
  const isPhone = breakpoint === 'phone'

  if (!selectedId) return null
  const organ = getOrgan(selectedId)

  const wrapStyle: CSSProperties = {
    position: 'fixed', zIndex: 6,
    ...(isPhone
      ? { left: 12, right: 12, bottom: 84 }
      : { right: 18, top: 96, width: 360 }),
  }

  return (
    <div style={wrapStyle}>
      <GlassPanel variant="strong" style={{ padding: 22 }} role="dialog" aria-label={organ.label}>
        <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 12, fontFamily: '"Inter", system-ui, sans-serif' }}>
          {organ.label}
        </div>
        <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {organ.facts.map((f, i) => (
            <li key={i} style={{ fontSize: 14, lineHeight: 1.5, color: '#3a3a3f' }}>{f}</li>
          ))}
        </ul>
        <div style={{ marginTop: 18 }}>
          <Button variant="secondary" fullWidth onClick={deselect}>Повернути на місце</Button>
        </div>
      </GlassPanel>
    </div>
  )
}
```

- [ ] **Step 3: Implement HUD.tsx**

Create `src/labs/anatomy/ui/HUD.tsx`:

```tsx
import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { ORGANS } from '../content/organs'
import { useAnatomyState } from '../state/AnatomyState'
import { OrganRail } from './OrganRail'
import { OrganInfoCard } from './OrganInfoCard'

export function HUD() {
  const viewed = useAnatomyState(s => s.viewedOrganIds)
  const selectedId = useAnatomyState(s => s.selectedOrganId)
  const allViewed = viewed.length === ORGANS.length

  const backStyle: CSSProperties = {
    position: 'fixed', zIndex: 6, top: 18, left: 18,
    color: 'rgba(255,255,255,0.7)', textDecoration: 'none',
    fontSize: 13, fontFamily: '"Inter", system-ui, sans-serif', fontWeight: 500,
    letterSpacing: '0.05em', padding: '8px 12px', borderRadius: 100,
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)',
    backdropFilter: 'blur(20px)',
  }

  const badgeStyle: CSSProperties = {
    position: 'fixed', zIndex: 6, top: 18, left: '50%', transform: 'translateX(-50%)',
    padding: '10px 18px', borderRadius: 100,
    background: 'rgba(95, 227, 208, 0.16)', border: '1px solid rgba(95,227,208,0.4)',
    color: '#bdf4ea', fontSize: 13, fontWeight: 700,
    fontFamily: '"Inter", system-ui, sans-serif',
  }

  return (
    <>
      <Link to="/biology" style={backStyle} aria-label="Назад до біології">← Біологія</Link>
      {allViewed && !selectedId && <div style={badgeStyle}>Готово — ти вивчив усі органи 🎉</div>}
      <OrganRail />
      <OrganInfoCard />
    </>
  )
}
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/labs/anatomy/ui/OrganRail.tsx src/labs/anatomy/ui/OrganInfoCard.tsx src/labs/anatomy/ui/HUD.tsx
git commit -m "feat(anatomy): organ rail, info card, HUD overlay"
```

---

### Task 10: AnatomyScene + AnatomyLab + route (full lab live)

**Files:**
- Create: `src/labs/anatomy/scene/AnatomyScene.tsx`
- Create: `src/labs/anatomy/index.tsx`
- Modify: `src/app/App.tsx`

(No unit test — composition + R3F; verified by build + smoke in Task 11.)

- [ ] **Step 1: Implement AnatomyScene.tsx**

Create `src/labs/anatomy/scene/AnatomyScene.tsx`:

```tsx
import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment, ContactShadows, Loader, useGLTF } from '@react-three/drei'
import { ACESFilmicToneMapping } from 'three'
import { Body } from './Body'
import { Organ } from './Organ'
import { Kidneys } from './Kidneys'
import { ORGANS, getOrgan } from '../content/organs'
import { useAnatomyState } from '../state/AnatomyState'
import { HUD } from '../ui/HUD'

const kidneys = getOrgan('kidneys')

export function AnatomyScene() {
  const deselect = useAnatomyState(s => s.deselect)
  const selectedId = useAnatomyState(s => s.selectedOrganId)

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'radial-gradient(ellipse at 50% 42%, #2a2d34 0%, #16171c 55%, #0a0a0c 100%)',
    }}>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [0, 0.45, 2.55], fov: 42 }}
        gl={{ toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
        onPointerMissed={() => deselect()}
      >
        <ambientLight intensity={0.35} />
        <directionalLight
          position={[4, 6, 5]} intensity={1.5} castShadow
          shadow-mapSize-width={1024} shadow-mapSize-height={1024}
        />
        <directionalLight position={[-5, 3, -3]} intensity={0.5} color="#bcd3ff" />
        <Suspense fallback={null}>
          <group>
            <Body url="/models/body-skin.glb" />
            {ORGANS.filter(o => o.id !== 'kidneys').map(o => (
              <Organ key={o.id} id={o.id} url={o.file} color={o.color} />
            ))}
            <Kidneys url={kidneys.file} color={kidneys.color} />
          </group>
          <Environment preset="studio" environmentIntensity={0.6} />
        </Suspense>
        <ContactShadows position={[0, -0.93, 0]} opacity={0.4} blur={2.6} scale={3} far={2} />
        <OrbitControls
          makeDefault
          enableDamping
          target={[0, 0.45, 0]}
          autoRotate={selectedId === null}
          autoRotateSpeed={0.4}
          minDistance={0.8}
          maxDistance={6}
        />
      </Canvas>
      <HUD />
      <Loader />
    </div>
  )
}

ORGANS.forEach(o => useGLTF.preload(o.file))
useGLTF.preload('/models/body-skin.glb')
```

- [ ] **Step 2: Implement index.tsx**

Create `src/labs/anatomy/index.tsx`:

```tsx
import { useNavigate } from 'react-router-dom'
import { AnatomyScene } from './scene/AnatomyScene'
import { useAnatomyState } from './state/AnatomyState'
import { IntroScreen } from './ui/IntroScreen'
import { isWebGLAvailable } from '../../sdk/scene/webgl'
import { WebGLUnsupported } from '../../sdk/ui/WebGLUnsupported'

export const anatomyLabDefinition = {
  id: 'anatomy',
  title: 'Внутрішні органи людини',
}

export function AnatomyLab() {
  const phase = useAnatomyState(s => s.phase)
  const navigate = useNavigate()
  const webglOk = isWebGLAvailable()

  return (
    <>
      {phase === 'intro' && <IntroScreen />}
      {phase === 'in-progress' && (webglOk
        ? <AnatomyScene />
        : <WebGLUnsupported onHome={() => navigate('/')} />
      )}
    </>
  )
}
```

- [ ] **Step 3: Wire the /biology/anatomy route**

In `src/app/App.tsx`, add the import (after the `BiologyPage` import from Task 1):

```tsx
import { AnatomyLab } from '../labs/anatomy'
```

Add the route immediately after the `<Route path="/biology" element={<BiologyPage />} />` line:

```tsx
        <Route path="/biology/anatomy" element={<AnatomyLab />} />
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/labs/anatomy/scene/AnatomyScene.tsx src/labs/anatomy/index.tsx src/app/App.tsx
git commit -m "feat(anatomy): assemble scene + lab entry + /biology/anatomy route"
```

---

### Task 11: Full gates + browser smoke test

**Files:** none (verification only).

- [ ] **Step 1: Type-check + build**

Run: `npm run build`
Expected: `tsc` clean (strict + noUnusedLocals) and vite build succeeds.

- [ ] **Step 2: Run the full unit suite (scoped to anatomy + registry)**

Run: `npx vitest run src/labs/anatomy src/site/content/subjects.test.ts`
Expected: all tests pass (organs: 4, state: 7, subjects: 2).

- [ ] **Step 3: Local dev smoke**

Run: `npm run dev`, open `http://localhost:5173/biology/anatomy`.
Verify (desktop):
- Intro shows → "Почати" → scene loads (drei `Loader` bar appears first while the ~46 MB models download).
- Body is translucent; 5 organs sit in correct anatomical position; kidneys are a **pair**.
- Hovering an organ highlights it; cursor becomes a pointer.
- Clicking an organ (or its rail chip): it pops forward to the chest anchor + gently spins, the body and other organs fade, the info card appears with the organ's facts.
- "Повернути на місце" (and clicking empty space) returns the organ; body restores; auto-rotate resumes.
- Rail shows "ВИВЧЕНО N/5"; ticks fill as organs are opened; at 5/5 the "Готово" badge shows.
- "← Біологія" returns to `/biology`.

- [ ] **Step 4: Responsive + reduced-motion smoke**

- Narrow the window to phone width (<600 px): rail becomes a bottom horizontal strip, info card anchors above it. Verify no overlap with the back link.
- Enable OS "reduce motion": re-open the lab — organs snap (no spin / eased fly-out), body fade is instant, no auto-rotate. App remains fully usable.

- [ ] **Step 5: Commit (if any fixes were needed)**

```bash
git add -A
git commit -m "test(anatomy): verification fixes from smoke test"
```

(If no fixes were needed, skip this commit.)

---

### Task 12: Remove calibration spikes

**Files:**
- Delete: `src/labs/anatomy/HeartSlice.tsx`
- Delete: `src/labs/anatomy/AnatomySpike.tsx`
- Modify: `src/app/App.tsx`

- [ ] **Step 1: Delete the spike components**

```bash
git rm src/labs/anatomy/HeartSlice.tsx src/labs/anatomy/AnatomySpike.tsx
```

- [ ] **Step 2: Remove their imports + routes from App.tsx**

In `src/app/App.tsx`, delete these import lines:

```tsx
import { HeartSlice } from '../labs/anatomy/HeartSlice'
import { AnatomySpike } from '../labs/anatomy/AnatomySpike'
```

And delete these route lines:

```tsx
        <Route path="/biology/heart" element={<HeartSlice />} />
        <Route path="/biology/spike" element={<AnatomySpike />} />
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: succeeds with no unused-import or missing-module errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(anatomy): remove heart/assembly calibration spikes"
```

---

## Self-Review

**1. Spec coverage:**
- Free-explorer, 5 organs, extract/rotate/read/return → Tasks 6-10 (Organ/Kidneys animation + scene + info card). ✓
- Progress N/5 + completion badge → Task 3 (viewed set) + Task 9 (rail + HUD badge). ✓
- New `biology` subject + `/biology` page + `/biology/anatomy` route → Tasks 1, 10. ✓
- Auto-registration (no manual placement) → scene loads organs at baked positions; pivots from runtime bbox (Tasks 6-7, 10). ✓
- Occlusion solved by fade-on-select → `useFocusAnimation` opacity + Body fade (Tasks 5, 8). ✓
- Kidney mirrored to a pair → Task 7. ✓
- Lazy load + Loader for the 22 MB lungs → drei `<Loader/>` + `useGLTF.preload` (Task 10). _Route-level React.lazy is noted in the spec as a nice-to-have; the existing App.tsx imports labs eagerly and the bundle excludes the GLBs (served from public/), so eager import is acceptable and consistent with the other labs. Not splitting here keeps parity; revisit only if landing-page TTI regresses._
- SDK reuse (WebGL gate, Button, GlassPanel, useViewport, useReducedMotion, Loader) → Tasks 4, 6-10. ✓
- Reduced-motion + responsive + a11y (button chips, aria) → Tasks 5-9, verified Task 11. ✓
- Unit tests for state + data; R3F via smoke → Tasks 2, 3, 11. ✓
- Cleanup spikes → Task 12. ✓

**2. Placeholder scan:** No TBD/TODO; every code step is complete; facts are final copy. ✓

**3. Type consistency:** `OrganId` union identical in `organs.ts`, `AnatomyState.ts`, `Organ.tsx`, `Kidneys.tsx` (`'kidneys'`). `useAnatomyState` selectors match the store shape (`phase`, `selectedOrganId`, `viewedOrganIds`, `start`, `select`, `deselect`, `reset`). `useFocusAnimation` arg names match call sites in Organ + Kidneys. `getOrgan`/`ORGANS`/`ORGAN_IDS` exports match all importers. `Button`/`GlassPanel`/`useViewport`/`useReducedMotion` usages match their real signatures. ✓

**Note for implementer:** `useReducedMotion(): boolean` is verified — the `reduced` boolean usage in Tasks 5-8 is correct as written. All external signatures used in this plan were read from source.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-31-anatomy-lab.md`.

Recommended: **subagent-driven-development** — fresh subagent per task, two-stage review (spec compliance, then code quality) between tasks. Tasks 1-3 are mechanical (cheap model); Tasks 5-10 (R3F) warrant a standard model.
