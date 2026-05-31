# Anatomy Lab — "Внутрішні органи людини" — Design Spec

**Date:** 2026-05-31
**Subject:** Biology (new) · **Lab id:** `anatomy` · **Route:** `/biology/anatomy`
**Status:** design approved (visual core validated via `/biology/spike`), pending spec review.

---

## 1. Goal

A free-exploration 3D biology lab: a semi-transparent human body with five internal
organs (brain, heart, lungs, liver, kidneys) sitting in correct anatomical position.
The student picks any organ, it **extracts** (floats out, the rest of the body fades),
**rotates** it freely, **reads** a short fact card, then **returns** it. No missions, no
gating, no quiz — pure "free explorer". Progress is a gentle "вивчено N/5" counter; when
all five have been viewed, a non-blocking "готово" badge appears.

This is the platform's first **GLTF-asset lab** (physics labs are procedural). The asset
pipeline + auto-registration are already proven (see §3, validated on `/biology/spike`).

## 2. Why this design (validated assumptions)

- **Quality:** the live R3F engine renders the real NIH models at reference quality
  (validated on `/biology/heart`).
- **Auto-registration:** all six models are HRA "Visible Human Male" reference organs in
  ONE coordinate space. Loaded WITHOUT re-centering, they assemble into a correct body
  (verified by world-bbox: brain y≈0.83 → heart/lungs y≈0.48 → liver y≈0.37 → kidney
  y≈0.29, all inside the 1.83 m skin). **No manual organ placement needed.**
- **Occlusion is solved by the UX, not by faking anatomy:** organs overlap at rest (the
  heart correctly sits in front of the lungs). Selecting an organ fades everything else,
  so each organ is always seen unobstructed.

## 3. Assets (already downloaded → `public/models/`)

All CC-BY 4.0, NIH 3D / HuBMAP HRA, Visible Human Male, Browne & Schlehlein.
Credited in `public/models/CREDITS.md` (already updated).

| File | Organ | Bytes | Notes |
|------|-------|-------|-------|
| `body-skin.glb` | body shell | 5,931,700 | rendered semi-transparent |
| `brain.glb` | brain | 11,977,312 | 283 sub-meshes |
| `heart.glb` | heart | 4,071,500 | |
| `lungs.glb` | lungs | 23,253,972 | heaviest; lazy-load + loader |
| `liver.glb` | liver | 1,135,892 | |
| `kidney.glb` | kidney (right) | 1,546,868 | **mirrored** (`scale=[-1,1,1]`) → pair |

- Models are loaded with `useGLTF` (drei auto Draco/meshopt). Materials are **overridden**
  in-app (most are untextured) for a cohesive "wet organ" look — see §7.
- **Total ~46 MB** committed to git (matches the existing `heart.glb` precedent). Acceptable
  for a dedicated, lazy-loaded 3D route. _Future optimization (out of scope): Git LFS or a
  CDN + Draco/meshopt compression to cut payload; `lungs.glb` is the obvious decimation
  target._

## 4. Architecture & file structure

Follows the established lab pattern (`src/labs/<id>/` + register in `subjects.ts` + route in
`App.tsx`). Reuses SDK where possible (`isWebGLAvailable`, `WebGLUnsupported`, `Button`,
`GlassPanel`, `BottomSheet`, `useViewport`, `useReducedMotion`, drei `Loader`).

```
src/site/content/subjects.ts      MODIFY  add 'biology' to SubjectId + SUBJECTS entry
src/app/App.tsx                    MODIFY  add /biology + /biology/anatomy routes;
                                           remove throwaway /biology/heart + /biology/spike
src/site/pages/BiologyPage.tsx     CREATE  clone of PhysicsPage (findSubject('biology'))

src/labs/anatomy/
  index.tsx            CREATE  AnatomyLab — phase machine (intro / in-progress)
  state/
    AnatomyState.ts    CREATE  Zustand store (phase, selectedOrganId, viewedOrganIds)
    AnatomyState.test.ts CREATE unit tests
  content/
    organs.ts          CREATE  ORGANS: OrganDef[] (id, file, label, color, facts[], focus)
    organs.test.ts     CREATE  sanity tests (5 organs, unique ids, non-empty facts)
  scene/
    AnatomyScene.tsx   CREATE  Canvas + lights + Environment + Body + Organs + OrbitControls
    Body.tsx           CREATE  translucent skin shell (fades when an organ is selected)
    Organ.tsx          CREATE  one organ: load, material, hover-highlight, click, extract/return
    Kidneys.tsx        CREATE  kidney + mirrored twin (uses Organ internals)
    useOrganAnimation.ts CREATE lerp organ home↔focus + camera-target ease (respects reduced-motion)
  ui/
    IntroScreen.tsx    CREATE  title + 1-2 lines + "Почати" (mirror existing IntroScreen)
    OrganRail.tsx      CREATE  5 organ chips + "вивчено N/5" + viewed ticks
    OrganInfoCard.tsx  CREATE  organ name + facts list + "Повернути"
    HUD.tsx            CREATE  composes rail + card + back link, responsive (BottomSheet on phone)

src/labs/anatomy/HeartSlice.tsx    DELETE  (throwaway calibration spike)
src/labs/anatomy/AnatomySpike.tsx  DELETE  (throwaway calibration spike)
```

Mounting: `AnatomyLab` mirrors `BrownianDiffusionLab` — `phase === 'intro'` → `IntroScreen`;
`phase === 'in-progress'` → `webglOk ? <AnatomyScene/> : <WebGLUnsupported/>`. No `RevealScene`
(free explorer has no end-gate); completion is a badge inside the HUD.

## 5. State model (`AnatomyState.ts`)

```ts
type Phase = 'intro' | 'in-progress'
type OrganId = 'brain' | 'heart' | 'lungs' | 'liver' | 'kidneys'

interface AnatomyState {
  phase: Phase
  selectedOrganId: OrganId | null      // which organ is currently extracted
  viewedOrganIds: OrganId[]            // organs the student has opened at least once
  start(): void                         // intro → in-progress
  select(id: OrganId): void             // extract organ; adds to viewed
  deselect(): void                      // "Повернути" → put back
  reset(): void                         // for tests / replay
}
```

- `select(id)` sets `selectedOrganId = id` and adds `id` to `viewedOrganIds` (deduped).
- `deselect()` sets `selectedOrganId = null`.
- Selecting organ B while A is extracted: A returns, B extracts (single-selection model).
- "All viewed" = `viewedOrganIds.length === 5` → HUD shows the completion badge.

**Unit-tested** (Vitest, like `LabState.test.ts`): start transition, select adds to viewed +
sets selected, re-select dedupes, switching organs, deselect clears, reset.

## 6. Organ data + content (`organs.ts`)

```ts
interface OrganDef {
  id: OrganId
  file: string        // '/models/heart.glb'
  label: string       // 'Серце'
  color: string       // material base color (hex)
  mirrored?: boolean  // kidneys render a mirrored twin
  facts: string[]     // 3-4 short UA facts (6-7 клас)
}
```

Facts (final copy — accurate, age-appropriate):

- **Мозок** (`#cbb4ad`): «Керує всім тілом — думками, рухами, відчуттями й пам'яттю.» ·
  «Має близько 86 мільярдів нервових клітин — нейронів.» · «Важить ~1.4 кг, але споживає
  майже п'яту частину всієї енергії тіла.» · «Поділений на дві півкулі — ліву і праву.»
- **Серце** (`#a8392f`): «М'яз завбільшки з твій кулак, що качає кров по всьому тілу.» ·
  «Б'ється 60-100 разів на хвилину — близько 100 000 разів на добу.» · «Має 4 камери: два
  передсердя і два шлуночки.» · «Ніколи не відпочиває — працює все життя без зупинки.»
- **Легені** (`#cf8a92`): «Дві губчасті частки, що дають крові кисень і виводять
  вуглекислий газ.» · «Права легеня більша (3 частки), ліва менша — поруч місце для серця.» ·
  «Усередині ~300-500 мільйонів крихітних пухирців — альвеол.» · «Якщо їх розкласти, площа
  була б як тенісний корт.»
- **Печінка** (`#6f4034`): «Найбільший внутрішній орган — важить близько 1.5 кг.» ·
  «Очищає кров від шкідливих речовин.» · «Виробляє жовч, яка допомагає перетравлювати їжу.» ·
  «Єдиний орган, що здатний сам відновлюватися.»
- **Нирки** (`#9c5446`, mirrored): «Пара органів у формі квасолин — фільтри тіла.» ·
  «Очищають кров і утворюють сечу.» · «За добу проганяють крізь себе ~180 літрів крові.» ·
  «Підтримують баланс води й солей в організмі.»

**Sanity-tested:** exactly 5 organs, unique ids, every organ has ≥3 non-empty facts, every
`file` exists under `public/models/`.

## 7. Visual & interaction design

**Resting (explore) state**
- Semi-transparent skin shell (`MeshPhysicalMaterial`, cool tint `#a8c2d4`, opacity ~0.2,
  `depthWrite:false`, `DoubleSide`). Organs inside in anatomical position.
- Organs: `MeshPhysicalMaterial` per-organ color + light clearcoat (wet look).
- Premium dark radial-gradient background (matches spike). `Environment preset="studio"`,
  ACES tone mapping, a key + cool fill light, `ContactShadows` under the feet.
- `OrbitControls` free orbit, gentle auto-rotate (stops on user interaction), target at the
  chest (~y 0.45), min/max distance clamp. Subtle `PostFX` bloom optional (low).

**Hover (desktop / pointer)**
- Organ under pointer → highlight (emissive bump or SDK `HighlightOutline`) + pointer cursor
  + small name tooltip. Skin does not intercept hover (raycast organs only).

**Select → extract** (click organ in 3D, or its chip in `OrganRail`)
- Selected organ lerps from its home transform to a **focus anchor** in front of the body
  (e.g. world ~[0, 0.5, 0.6]), scales up slightly, and gently auto-rotates.
- Body + the other four organs fade to ~5% opacity (the selected organ is always
  unobstructed — this resolves "an organ is hidden behind another").
- `OrbitControls` target eases to the focus anchor; user can still orbit the extracted organ.
- `OrganInfoCard` slides in (organ label + facts + "Повернути").

**Return** ("Повернути" or selecting another organ)
- Organ lerps back to home, body + others restore opacity, card closes, target eases back.

All transitions are short (~0.4-0.6 s) eased lerps in `useFrame`; **`useReducedMotion`
shortens/skips them** (snap to end state).

**HUD layout** (`useViewport` breakpoints)
- Desktop: `OrganRail` as a vertical/side chip list (5 organs + "вивчено N/5"); `OrganInfoCard`
  as a frosted panel on the opposite side; "← Усі предмети" back link top-left.
- Phone: rail as a horizontal scroll strip; info card as an SDK `BottomSheet`.
- Completion badge ("Готово — ти вивчив усі органи 🎉") appears in the HUD when N/5 == 5.

## 8. Performance

- Route is **lazy-loaded** (`React.lazy`) so the ~46 MB of models never touch other pages.
- drei `<Loader />` shows a progress bar during the first load (lungs dominate).
- `useGLTF.preload` for all six on the lab module.
- `dpr={[1,2]}`, 1024 shadow map — same budget as existing labs.
- Target: smooth on mid-range mobile after load; first-load time gated by network (note in
  smoke checklist, not a hard perf test).

## 9. Accessibility & responsiveness

- Organ chips are real buttons (keyboard-focusable, `aria-label`, Enter/Space select).
- Reduced-motion respected (no forced auto-rotate, instant transitions).
- WebGL-unsupported fallback via SDK `WebGLUnsupported`.
- Ukrainian throughout; colour choices keep text/contrast on the dark theme.

## 10. Testing strategy

- **Unit (Vitest):** `AnatomyState` (transitions, viewed set, single-selection), `organs.ts`
  (5 organs, unique ids, ≥3 facts each, files referenced). Consistent with the repo's
  "state + data unit-tested, R3F not unit-tested" convention.
- **Gates:** `tsc` (strict, noUnusedLocals) + `vite build` + scoped `vitest run` for the new
  files. R3F scene verified by **browser smoke test** on prod (the established method): body
  assembles, each organ extracts/rotates/returns, progress increments to 5/5, mobile sheet
  works, reduced-motion path.

## 11. Out of scope (future)

- Asset compression / Git LFS / CDN (note above).
- More than 5 organs; layered "peel" anatomy; quiz/assessment mode.
- Audio narration of facts (SDK `SoundManager` exists — could add later).
- Localisation beyond Ukrainian.

## 12. Cleanup

Remove the throwaway calibration spikes when the lab ships: delete `HeartSlice.tsx`,
`AnatomySpike.tsx`, and their `/biology/heart` + `/biology/spike` routes (done as a task in
the plan, after the real lab is verified).
