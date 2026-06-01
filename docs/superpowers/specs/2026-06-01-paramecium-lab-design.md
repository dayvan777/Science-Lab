# Paramecium Lab — «Інфузорія-туфелька» — Design Spec

**Date:** 2026-06-01
**Subject:** Biology · **Lab id:** `paramecium` · **Route:** `/biology/paramecium`
**Status:** design approved (interaction concept A chosen via visual mockup), pending spec review.

---

## 1. Goal

A free-exploration 3D biology lab built around a single living cell. A *Paramecium*
(інфузорія-туфелька) drifts in a drop of pond water — **in its natural environment, not
isolated in empty space**. The student clicks the organism to **dive into the cell**: it
enlarges and turns semi-transparent, its organelles light up and become clickable, each
showing a short Ukrainian fact. Free explorer, progress "вивчено N/9", gentle completion
badge. The cell is **procedurally generated** (no 3D asset files) — like the physics labs,
unlike the GLTF-based anatomy lab.

## 2. Why this design (validated assumptions)

- **Interaction concept A** ("dive into the cell, organelles highlight + clickable") was
  chosen by the user over pin-labels (B) and extract-organelle (C) via a visual mockup.
- **Procedural over GLTF:** there is no good free 3D Paramecium model with separable
  organelles, and the organism is a simple, schematic slipper shape. Procedural geometry
  gives full control, is light, and can be *animated* (beating cilia, pulsing vacuoles,
  drifting cytoplasm) — matching the living, textbook-diagram feel the user approved.
- **Environment matters:** the user explicitly wants the cell shown in pond water, not a
  void. The watery microworld (particles, soft light, faint background microbes) is part
  of the brief, not decoration.

## 3. Asset approach — fully procedural (zero asset files)

- **Cell body:** a slipper-shaped ellipsoid (a scaled, slightly-asymmetric sphere),
  rendered with a translucent glass-like `MeshPhysicalMaterial` (transmission or
  transparent + clearcoat + a fresnel rim for the **pellicle**). Local frame ≈ ±1.4 X
  (long axis) · ±0.7 Y · ±0.6 Z.
- **Cilia (війки):** many short tapered hairs on the body surface, **InstancedMesh**
  (sampled points on the ellipsoid, oriented outward), animated with a travelling
  sine-wave beat (per-instance phase). The cilia layer is one selectable "part".
- **Organelles (internal blobs)** at fixed local positions:
  - macronucleus — large amber ellipsoid `[0.1, 0, 0]`
  - micronucleus — small darker sphere `[0.45, 0.15, 0.05]`
  - contractile vacuoles ×2 — light-blue translucent spheres `[-0.9, 0.25, 0]` (front) +
    `[0.95, -0.1, 0]` (back), **pulsing** scale animation
  - food vacuoles — several small greenish spheres, e.g. `[-0.3,-0.2,0.2]`, `[0.5,0.2,-0.2]`,
    `[0.8,-0.2,0.15]`, `[-0.1,0.3,-0.1]`
  - oral groove + gullet — a funnel/indent on the ventral side `[-0.2,-0.55,0.3]`
  - trichocysts — tiny dots layer just under the pellicle (selectable via rail)
- No `public/models/` files. No external assets. (Contrast: anatomy uses NIH GLTF.)

## 4. Architecture & file structure

Mirrors the lab pattern (`src/labs/<id>/` + register in `subjects.ts` + route in `App.tsx`).
Reuses SDK: `isWebGLAvailable`, `WebGLUnsupported`, `Button`, `GlassPanel`, `BottomSheet`,
`useViewport`, `useReducedMotion`, drei `Loader`, animation helpers (`lerp`, `easeInOutCubic`).

```
src/site/content/subjects.ts     MODIFY  add the paramecium lab to the existing biology subject
src/app/App.tsx                  MODIFY  add /biology/paramecium route

src/labs/paramecium/
  index.tsx            CREATE  ParameciumLab — phase machine (intro / in-progress)
  content/
    organelles.ts      CREATE  OrganelleId, OrganelleDef, ORGANELLES[9] (label,color,facts,pos,kind)
    organelles.test.ts CREATE  data sanity tests
  state/
    ParameciumState.ts CREATE  Zustand (phase, viewMode, selectedOrganelleId, viewedOrganelleIds)
    ParameciumState.test.ts CREATE store unit tests
  ui/
    IntroScreen.tsx    CREATE  staged intro (mirror brownian/anatomy intro)
    OrganelleRail.tsx  CREATE  9 organelle chips + "вивчено N/9" (only in cell view)
    InfoCard.tsx       CREATE  selected organelle label + facts + close
    HUD.tsx            CREATE  back link + "← краплина" (cell→env) + rail + info card + badge
  scene/
    ParameciumScene.tsx CREATE Canvas + Environment + Cell + OrbitControls + HUD + Loader
    Environment.tsx    CREATE  water background, drifting particle field, faint microbes, lights
    Cell.tsx           CREATE  procedural body + organelles; click body → enterCell; organelle hover/select
    Cilia.tsx          CREATE  instanced cilia + beat animation
    life.ts            CREATE  small helpers: drift, pulse, cilia-beat phase (respect reduced motion)
```

`ParameciumLab` mirrors `BrownianDiffusionLab`: `phase==='intro'` → `IntroScreen`;
`phase==='in-progress'` → `webglOk ? <ParameciumScene/> : <WebGLUnsupported/>`. No
`finished` phase; completion is a HUD badge. (The route may be eagerly imported — the lab
ships no heavy assets, unlike anatomy.)

## 5. State model (`ParameciumState.ts`)

```ts
type Phase = 'intro' | 'in-progress'
type ViewMode = 'environment' | 'cell'
type OrganelleId =
  | 'cilia' | 'pellicle' | 'oral' | 'foodVacuoles' | 'contractileVacuoles'
  | 'macronucleus' | 'micronucleus' | 'trichocysts' | 'analPore'

interface ParameciumState {
  phase: Phase
  viewMode: ViewMode
  selectedOrganelleId: OrganelleId | null
  viewedOrganelleIds: OrganelleId[]
  start(): void                  // intro → in-progress (viewMode 'environment')
  enterCell(): void              // 'environment' → 'cell'
  exitToEnvironment(): void      // 'cell' → 'environment', clears selection
  select(id: OrganelleId): void  // highlight organelle + add to viewed (implies cell view)
  deselect(): void               // clear selection (stay in cell view)
  reset(): void
}
```

- Clicking the cell body in `environment` mode calls `enterCell()`.
- `select(id)` sets `selectedOrganelleId`, dedupe-appends to `viewedOrganelleIds`, and (if
  somehow still in environment) sets `viewMode='cell'`.
- "All viewed" = `viewedOrganelleIds.length === 9` → HUD badge.
- **Unit-tested:** start, enterCell/exit transitions, select sets+records+dedupes, deselect
  keeps viewed, exit clears selection, reset.

## 6. Organelle data + content (`organelles.ts`)

```ts
interface OrganelleDef {
  id: OrganelleId
  label: string        // 'Війки'
  color: string        // hex
  kind: 'layer' | 'blob' | 'pair' | 'funnel'  // how it renders / whether 3D-clickable
  position?: [number, number, number]          // for blob/pair/funnel (local cell frame)
  facts: string[]      // 1-2 short UA facts (6-7 клас)
}
```

Final content (9 organelles):

- **Війки** (`cilia`, layer, `#bfeee2`): «Тонкі волоски по всьому тілу. Б'ються хвилями —
  клітина пливе, а ще вони женуть бактерій до рота.»
- **Пелікула** (`pellicle`, layer, `#9fe6d8`): «Щільна еластична оболонка. Тримає сталу
  форму «туфельки» й захищає клітину.»
- **Клітинний рот і глотка** (`oral`, funnel, `#7fc8c0`): «Заглибина з війками заганяє
  бактерій у глотку, де утворюється травна вакуоля.»
- **Травні вакуолі** (`foodVacuoles`, blob, `#a7c46a`): «Пухирці, що перетравлюють спійманих
  бактерій і всмоктують поживні речовини.»
- **Скоротливі вакуолі** (`contractileVacuoles`, pair, `#9ccdf2`): «Дві «помпи» — спереду й
  ззаду. Відкачують зайву воду, щоб клітина не луснула.»
- **Макронуклеус** (`macronucleus`, blob, `#f0be78`): «Велике ядро. Керує повсякденним
  життям клітини: рухом, живленням, виділенням.»
- **Мікронуклеус** (`micronucleus`, blob, `#caa06e`): «Мале ядро. Зберігає спадкову
  інформацію — головне для розмноження.»
- **Трихоцисти** (`trichocysts`, layer, `#dfeaf2`): «Захисні «стріли» під оболонкою.
  Вистрілюють назовні, коли клітину турбують.»
- **Порошиця** (`analPore`, blob, `#8fb0a8`): «Отвір ззаду, через який викидаються
  неперетравлені рештки їжі.»

**Sanity-tested:** exactly 9, unique ids, each ≥1 non-empty fact, `blob/pair/funnel` have a
`position`, colours are hex.

## 7. Visual & interaction design

**Environment view (default).** Dark teal radial water background; a drifting `InstancedMesh`
particle field (debris/bacteria); soft key + cool ambient light; 1–2 faint translucent
background microbes for life; subtle depth fog. The Paramecium gently **swims** (slow drift +
roll) with **beating cilia** and **pulsing contractile vacuoles**. The whole cell is one big
hover/click target ("придивитись" cursor).

**Dive-in (click the cell).** `enterCell()`: the cell eases to centre, scales up, slows its
swim, and its body opacity drops (clearer glass) so organelles read. Camera/`OrbitControls`
target eases to cell centre, distance closes in. Organelles become individually hoverable.

**Examine organelles (cell view).** Hover a blob organelle → emissive highlight + tooltip.
Click it (or its chip in `OrganelleRail`) → `select`: the organelle pulses/glows, the rest of
the cell dims slightly so it stands out (no extraction — it stays in place), and `InfoCard`
slides in with the label + facts. Layer parts (війки, пелікула, трихоцисти) are selected via
the rail and highlight their whole layer (e.g. all cilia glow). "← краплина" returns to the
environment view.

**Motion.** All life (swim, cilia beat, vacuole pulse, particle drift) and the dive-in/return
eases are short and **gated by `useReducedMotion`** (instant cuts, no idle motion when set).

**HUD (responsive via `useViewport`).** Desktop: `OrganelleRail` as a side chip list (9 +
"вивчено N/9", shown only in cell view); `InfoCard` as a frosted panel opposite; "← Біологія"
back link top-left; "← краплина" appears in cell view. Phone: rail as a bottom horizontal
strip, info card as a bottom sheet. Completion badge at 9/9.

## 8. Performance

- Procedural geometry only — tiny payload, no model downloads. (Route may be eagerly imported.)
- Cilia + particles via `InstancedMesh`; animations update instance matrices in `useFrame`
  without per-frame allocations.
- Transmission glass is the heaviest effect — if it costs FPS on mid mobile, fall back to a
  transparent `MeshPhysicalMaterial` (opacity + clearcoat + fresnel) instead of `transmission`.
- `dpr={[1,2]}`, modest lights, no heavy post-processing.

## 9. Accessibility & responsiveness

- Organelle chips are real `<button>`s (keyboard, `aria-pressed`, `aria-label`).
- `useReducedMotion` respected end-to-end (no idle swim/beat/pulse, instant transitions).
- WebGL-unsupported fallback via SDK `WebGLUnsupported`.
- Ukrainian throughout; colours keep contrast on the dark water background.

## 10. Testing strategy

- **Unit (Vitest):** `ParameciumState` (phase + viewMode transitions, selection, viewed set,
  dedupe), `organelles.ts` (9 organelles, unique ids, facts, positions for non-layer kinds).
- **Gates:** `tsc` (strict, noUnusedLocals) + `vite build` + scoped `vitest`. R3F verified by
  **browser smoke** on prod.

## 11. Out of scope (future)

- Trichocyst "fire on poke" interaction (fun, but a nice-to-have; not core).
- Reproduction animation (binary fission / conjugation).
- Audio narration; localisation beyond Ukrainian.
- A second microorganism lab (amoeba, euglena) reusing this procedural-cell engine.

## 12. Quality validation (first plan task)

Because procedural cell-in-water is a new visual, the **first implementation task is a
deployable spike**: the procedural Paramecium (glass body + instanced beating cilia +
organelle blobs + watery environment) on a throwaway route, deployed to prod so the user
judges the real 3D quality **before** the rest is built — the lesson learned from the anatomy
lab. If the look needs tuning (material, cilia, lighting, environment), we iterate the spike
first, then continue the plan.
