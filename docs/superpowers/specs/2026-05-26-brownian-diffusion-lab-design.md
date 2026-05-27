# Brownian Motion & Diffusion Lab — Design

**Date:** 2026-05-26
**Lab ID:** `brownian-diffusion`
**Title (UA):** Броунівський рух та дифузія
**Subject:** Physics, grade 7 (Ukrainian school)
**Status:** Brainstorm → Spec (this document)

---

## 1. Goal

Ship the third lab on NOVA EVRIKA covering the entire grade-7 chapter "Molecular structure of matter": molecular theory, Brownian motion, diffusion in three states of matter (gas / liquid / solid), and the temperature dependence of diffusion. Reference simulator: PhET Diffusion (https://phet.colorado.edu/sims/html/diffusion/latest/diffusion_all.html). The Ukrainian school version differs from PhET in two ways: (a) it runs in our 3D studio scene rather than 2D, and (b) it widens the scope from gas-only mixing to the full Brownian + 3-state + temperature arc.

## 2. Architecture Overview

Mirror the EM-induction pattern verbatim:

- New folder `src/labs/brownian-diffusion/` parallel to `src/labs/mass-measurement/` and `src/labs/electromagnetic-induction/`. Never imports from other labs.
- React 19 + @react-three/fiber for the 3D scene; @react-three/rapier for draggable objects; Zustand for state; vitest for tests.
- 6 guided scenes, each scene = sequence of `Step`s ending in a multiple-choice gate (`MultipleChoice` SDK primitive). Scene engine pattern from `sdk/guided/`; some steps use **motion triggers** (analogous to `magnet-near-coil` in EM) handled directly by `SceneController.tsx` rather than the SDK predicate engine.
- Phase machine: `intro` → `in-progress` → `finished` (the same shape as `LabState` in EM).
- 3D scene anchored on the same studio table (`sdk/scene/Table`); camera switches between 4 presets per scene; PostFX, lighting, sound, pinch-zoom — all reused from SDK.
- Particle simulator is **custom** (not Rapier) — kinetic gas simulator with elastic collisions, ≤150 instances, rendered via `InstancedMesh`. Rapier remains for draggable instruments only (pollen, divider, ink dropper).
- Zero new SDK primitives. Everything novel is lab-local. Extraction (à la PR-C) deferred until a future fourth lab repeats a pattern.

## 3. Scope

In scope:
- 6 guided scenes (see §4).
- All listed instruments (§5) with drag interactions where applicable.
- Custom particle engine + Rapier-based draggables (§7).
- Solid-state lattice with time-lapse interpolation (§8).
- Brownian molecule visibility toggle (§9).
- Cycle-pill temperature control with 4 levels (§10).
- LabState (6 scenes) + LabSettingsState (§11).
- HUD with task panel + journal (mirror EM HUD); mobile bottom-sheet for settings.
- Subject registry entry (§13).
- ~32 new unit tests (§14).

Out of scope:
- No real-time multi-user.
- No persistence between sessions (journal is in-memory; resets on full reload).
- No leaderboard, no scoring beyond the 6 MC answers.
- No video tutorials; explanations are text in `hintExplanation` and reveal screen.
- No accessibility audit beyond reusing existing SDK a11y helpers.
- No localization beyond Ukrainian.

## 4. The 6 Scenes

Each scene has a Ukrainian title (shown in the journal), an action sequence, a motion trigger (where applicable), and exactly one multiple-choice question gating advancement. Motion triggers used in this lab: `pollen-observed`, `gases-mixed`, `liquid-mixed-partial`, `temp-reached-hot`. They extend a lab-local `BdStep` type via a `motionTrigger` field — identical to how EM's `EmStep` extends `Step` with its own union (see `src/labs/electromagnetic-induction/content/scenes.ts`).

### Scene 1 — Знайомство з молекулами
**Concept:** Molecular theory — atoms exist and are always in motion.

**Mechanics:**
1. `intro-ack` — camera transitions from `overview` to `focus-box`. Glass box is full of ~60 multi-coloured small particles moving randomly. `hintTitle = "Зазирни в речовину"`, `hintExplanation` describes that matter is made of tiny particles in constant motion. `complete = { kind: 'submitted' }`.
2. `mc-always-moving` — MC question: «Чи завжди рухаються молекули?»
   - 0: «Так, завжди — навіть у твердих тілах» ← **correct**
   - 1: «Лише коли тепло»
   - 2: «Лише в газах»

### Scene 2 — Броунівський рух
**Concept:** The random motion of a visible particle is indirect evidence of invisible molecular bombardment.

**Mechanics:**
1. `pickup-pollen` — student picks up the big red "pollen" sphere from the front-left tray (drag). `complete = { kind: 'dragging', bodyPattern: 'pollen' }`.
2. `place-pollen-in-box` — student drops it inside the box; the simulator captures it as the Brownian particle. `complete` motion-triggered (pollen body settled inside box bounds). Trail rendering activates (a thin yellow polyline showing the pollen's recent path, decaying over time).
3. `observe-jiggle` — the molecules are **invisible** by default. Student watches the big particle jiggle hauntingly. A persistent control button «Показати причину» (reveal molecules) is offered in the HUD. After 4 s, motion-trigger `pollen-observed` advances. `complete = { kind: 'submitted' }`.
4. `mc-why-jiggle` — MC question: «Чому велика частинка стрибає?»
   - 0: «Її штовхають невидимі молекули з усіх боків» ← **correct**
   - 1: «Бо вона жива»
   - 2: «Бо в коробці протяг»

The reveal button toggles `showMolecules` in `LabSettingsState`. When on, the small molecules become visible (opacity 0.6, white-grey).

### Scene 3 — Дифузія в газах
**Concept:** Two different gases mix uniformly when allowed to.

**Mechanics:**
1. Setup: 40 red + 40 blue particles, separated by a vertical divider down the middle of the box.
2. `lift-divider` — student drags the divider's top handle upward; the divider lifts out of the box. `complete = { kind: 'dragging', bodyPattern: 'divider' }`.
3. `observe-mixing` — particles begin to cross. After both colours occupy both halves (motion trigger `gases-mixed`), advance. ~10 s in real time.
4. `mc-final-state` — MC question: «Що буде через певний час?»
   - 0: «Повне рівномірне змішування» ← **correct**
   - 1: «Все одно залишаться окремо»
   - 2: «Розділяться знову на 2 кольори»

### Scene 4 — Дифузія в рідинах
**Concept:** Diffusion happens in liquids too, but much more slowly than in gases.

**Mechanics:**
1. Scene swaps the box for a beaker containing 30 cyan water particles (slower kinetic params — see §7). The ink dropper sits on the right tray with a purple droplet; dropping ink spawns 30 purple ink particles at the release point. Total 60 particles in scene.
2. `pick-dropper` — student picks up the dropper. `complete = { kind: 'dragging', bodyPattern: 'dropper' }`.
3. `drop-ink` — student moves dropper over beaker and releases — a small cluster of purple ink particles spawns at the release point. `complete` motion-triggered (cluster spawned).
4. `observe-slow-mixing` — visible slow spread (~15 s real time, equivalent to many hours in real life — implied by slower per-frame velocity). Trigger `liquid-mixed-partial`.
5. `mc-where-faster` — MC question: «Де дифузія йде швидше?»
   - 0: «У газі — молекули вільніші й швидші» ← **correct**
   - 1: «У рідині — бо води більше»
   - 2: «Однаково»

### Scene 5 — Дифузія у твердих тілах (time-lapse)
**Concept:** Diffusion in solids is so slow that it takes years; observable through time-lapse.

**Mechanics:**
1. Scene swaps to the solid station (front-right of table). Two metal blocks pressed together: gold (top, `#f4c430`) on lead (bottom, `#8a8a92`). Each block is rendered as a crystalline grid of ~40 atoms (small spheres in a cubic lattice).
2. `press-blocks` — blocks are pre-placed; student taps the «Натиснути» button to confirm contact. `complete = { kind: 'submitted' }`.
3. `time-lapse` — slider with 4 stops: «1 рік», «10 років», «100 років», «1000 років». Each stop interpolates between pre-computed lattice snapshots. By 1000 years a visible fraction of gold atoms have migrated into the lead lattice (and vice-versa, but less). `complete` motion-triggered when student moves slider to ≥ "100 років".
4. `mc-solid-timescale` — MC question: «Скільки часу йде дифузія в твердому?»
   - 0: «Десятки-сотні років» ← **correct**
   - 1: «Декілька секунд»
   - 2: «Зовсім не йде — атоми не рухаються»

### Scene 6 — Залежність від температури (фінал)
**Concept:** Temperature increases molecular speed, which speeds up diffusion in any state.

**Mechanics:**
1. Scene returns to the gas box with 40 red + 40 blue particles. The divider is absent; particles begin half-mixed from a fresh start (kinetic state reset, not carried over from scene 3).
2. `cycle-temp` — student cycles the temperature pill: «Холодно» → «Норма» → «Тепло» → «Гаряче». Each step scales every particle's velocity by ×0.5 / ×1.0 / ×1.5 / ×2.5 of base. Particle speed visibly differs.
3. `reach-hot` — student must reach «Гаряче» at least once. `complete` motion-triggered (`temp-reached-hot`).
4. `mc-temp-relationship` — MC question: «Коли дифузія йде швидше?»
   - 0: «При вищій температурі — молекули енергійніші» ← **correct**
   - 1: «При нижчій температурі»
   - 2: «Температура не впливає»

After the MC of scene 6, `advanceScene()` transitions to `phase = 'finished'`. The reveal screen summarises the journal (6 entries).

## 5. Instruments Inventory

All instruments live in the same 3D table scene. Each scene shows only its needed instruments via `enabled`/visibility props, mirroring how EM-induction shows / hides the magnets per scene.

| Instrument | Component | World position | Used in scenes |
|---|---|---|---|
| Glass box (cube) | `instruments/GlassBox.tsx` | `[0, 0.85, 0]` (table top) | 1, 2, 3, 6 |
| Beaker | `instruments/Beaker.tsx` | `[0.40, 0.85, 0]` | 4 |
| Solid blocks (Au + Pb) | `instruments/SolidBlocks.tsx` | `[-0.40, 0.85, 0]` | 5 |
| Divider (movable wall) | `instruments/Divider.tsx` | inside box, x=0, half-up = removed | 3 |
| Pollen particle | `instruments/PollenParticle.tsx` | tray `[-0.40, 0.94, 0.30]`, drag into box | 2 |
| Ink dropper | `instruments/InkDropper.tsx` | tray `[0.40, 0.94, 0.30]`, drag over beaker | 4 |

All world positions in the table above refer to the **base centre** (bottom-face centre) of the instrument, in metres.

Box dimensions: 0.20 m × 0.20 m × 0.20 m cube, glass walls (transparent), base y=0.85, centre y=0.95.
Beaker dimensions: cylinder radius 0.06 m, height 0.14 m, base y=0.85.
Solid blocks: each 0.10 × 0.04 × 0.10 m, stacked at base y=0.85, gold on top.
Pollen sphere: radius 0.012 m (1.2 cm — visually exaggerated).
Molecule sphere (kinetic): radius 0.005 m (0.5 cm).

All world coordinates are in metres, matching the existing labs.

## 6. Camera Presets

Four presets registered with `sdk/scene/CameraRig`:

| Preset id | Position (rel. table) | Look-at | Use cases |
|---|---|---|---|
| `overview` | high, 3/4 angle | table centre | scene 1 intro, scene 6 conclusion |
| `focus-box` | top-down (or 3/4 fallback) | box centre | scenes 1, 2, 3, 6 |
| `focus-beaker` | 3/4 from front-right | beaker centre | scene 4 |
| `focus-solids` | top-down close | solid blocks centre | scene 5 |

`focus-box` defaults to top-down (clearest for counting particles, mirrors PhET). The scene index → preset mapping lives in `LabScene.tsx` as `sceneToPreset(idx)` (same pattern as EM's `sceneToPreset`).

`PinchZoomController` and the click-to-focus tap detector remain active per scene; manual focus overrides the preset until scene change (matches EM's behaviour).

## 7. Particle Engine

### Data model
```ts
// physics/particles.ts
export type ParticleKind = 'red' | 'blue' | 'water' | 'ink' | 'pollen' | 'gold' | 'lead'
export type Particle = {
  kind: ParticleKind
  pos: { x: number; y: number; z: number }
  vel: { x: number; y: number; z: number }
  mass: number   // kg (toy units)
  radius: number // metres
}
```

### Step function
```ts
// physics/kinetics.ts
export function step(
  particles: Particle[],
  walls: AABB,
  divider: DividerState | null,
  dt: number,
): void
```

Per frame (clamped `dt ≤ 1/60` to prevent tab-focus jumps):
1. **Integrate:** `pos += vel * dt` for every particle.
2. **Pair collisions:** O(n²) — for each unique pair `(i,j)` test `distance(pos_i, pos_j) < radius_i + radius_j`. If yes, perform 3D elastic collision exchanging normal-component velocities weighted by mass; tangent components preserved.
3. **Wall collisions:** clamp each particle inside the AABB; flip the appropriate velocity component on contact.
4. **Divider:** when `divider.openHeight < boxHeight`, the divider acts as an additional wall along `x=0` for `y < divider.openHeight`; particles bounce off it.

For 150 particles: ~22 250 pair checks per frame → trivial CPU. No spatial hashing needed.

### Rendering
A single `InstancedMesh` of unit sphere geometry per kind class:
- `red`, `blue`, `water`, `ink` share one geometry; per-instance colour via `instanceColor`.
- `pollen` is a separate `Mesh` (with trail polyline) — only one instance, so simple Mesh is fine.
- `gold`, `lead` are separate (lattice; static positions, animated via interpolation only).

`ParticleField.tsx` reads from the singleton simulator state via refs (not Zustand — too high-frequency) and updates `InstancedMesh.setMatrixAt(i, m4)` + `instanceColor.setXYZ(i, r, g, b)` each frame.

### Performance budget
- Phone target: 60 fps with 150 particles (Chrome DevTools mobile throttle ×4 baseline).
- Fallback: if early benchmark shows < 50 fps, drop default to 100 particles (kept tunable via `LabSettingsState.maxParticles`).
- Validation: a benchmark scene during development that runs 150 particles for 10 s and asserts `stats.fps.avg > 55`.

### Liquid-mode parameters
Scene 4 uses the same engine with:
- base velocity × 0.3
- linear drag: `vel *= (1 - drag * dt)` with `drag = 1.2`
- particles smaller and closer-packed

### Temperature scaling (scene 6)
On `LabSettingsState.temperatureLevel` change, multiply every particle's velocity vector by the ratio (new factor / old factor) so kinetic energy adjusts smoothly without resetting positions. Factors: cold ×0.5, normal ×1.0, warm ×1.5, hot ×2.5.

## 8. Solid-State Lattice (Scene 5)

No real-time simulation. Pre-computed snapshots at t ∈ {0, 1, 10, 100, 1000} years. Each snapshot is an array of `Particle` positions for the gold and lead lattices, with progressively more gold atoms displaced into the lead region and vice-versa (asymmetric — gold-into-lead is faster than the reverse, per Roberts-Austen 1896).

```ts
// physics/lattice.ts
export type LatticeSnapshot = { atoms: Array<{ pos: Vec3; kind: 'gold' | 'lead' }> }
export const SNAPSHOTS: { years: number; snapshot: LatticeSnapshot }[]
export function interpolate(yearsValue: number): LatticeSnapshot
```

Interpolation: piecewise linear position lerp between the two bracketing snapshots. Snapshots are hand-authored directly as a literal `const SNAPSHOTS` array in `physics/lattice.ts`. Positions are chosen to create a visible diffusion gradient: at t=0 every gold atom is in the top half; at t=1000 about a third of gold atoms occupy positions in the lead lattice, with progressively decreasing density deeper in.

## 9. Brownian Visibility Toggle

Scene 2 starts with `showMolecules = false`. The molecules are simulated but rendered with `opacity = 0` (still affect the pollen via collisions). A button «Показати причину» in the HUD toggles `showMolecules` in `LabSettingsState`; when true, molecules render at opacity 0.6 in a desaturated white-grey. The toggle is available throughout scene 2 (and only scene 2). `showMolecules` only affects scene 2's Brownian molecules — scenes 3-6 always render their named particles (red, blue, ink, water, gold, lead) at full opacity regardless of this toggle.

## 10. Temperature Cycle-Pill

A new lab-local component `ui/TemperatureButton.tsx` follows the exact cycle-pill pattern of `ui/MagnetStrengthButton.tsx` and `ui/CoilTurnsButton.tsx` in EM-induction. Four discrete states: cold / normal / warm / hot. Each tap advances to the next; long-press goes back. Stored in `LabSettingsState.temperatureLevel`.

## 11. State Machines

### `state/LabState.ts`
```ts
export type LabPhase = 'intro' | 'in-progress' | 'finished'
export type JournalEntry = {
  sceneTitle: string
  chosenIndex: number
  timestamp: number
}
const TOTAL_SCENES = 6  // (5 in EM)
```
Identical shape and methods to EM's `LabState` (`start`, `recordMCAnswer`, `advanceScene`, `reset`, `respawnObjects`, `sessionId` bump for physics-key remount).

### `state/LabSettingsState.ts`
```ts
type Settings = {
  temperatureLevel: 'cold' | 'normal' | 'warm' | 'hot'  // default 'normal'
  showMolecules: boolean                                 // default false
  timeLapseYears: 1 | 10 | 100 | 1000                    // default 1
  maxParticles: number                                   // default 150 — internal, no UI control, dev fallback
}
```
Methods: `setTemperature(level)`, `toggleMolecules()`, `setTimeLapse(years)`. Mirrors EM's `LabSettingsState`.

## 12. UI Components (lab-local)

| File | Purpose |
|---|---|
| `ui/IntroScreen.tsx` | Lab landing card; "Почати" button → `start()`. Same pattern as EM. |
| `ui/RevealScene.tsx` | Final summary with journal; "Спробувати знову" → `reset()`. Mirrors EM. |
| `ui/HUD.tsx` | Task panel + journal (CollapsibleGlassPanel from SDK); auto-collapses during drag (via `useForceCollapsed`). Mirrors EM's HUD. |
| `ui/TemperatureButton.tsx` | Cycle-pill for `LabSettingsState.temperatureLevel`. |
| `ui/ShowMoleculesToggle.tsx` | Toggle button for `showMolecules` (visible only during scene 2). |
| `ui/TimeLapseSlider.tsx` | 4-stop slider for `timeLapseYears` (visible only during scene 5). |

Mobile (`useViewport().breakpoint === 'phone' || 'tablet'`):
- bottom-right vertical stack: FocusResetButton, ZoomControls, SheetTriggerButton (sheet contains the lab settings + respawn button)
- bottom-sheet contains: Temperature pill, ShowMolecules toggle (scene 2), TimeLapseSlider (scene 5), SoundToggle, respawn button

Desktop (`≥900`):
- bottom-right inline row: ZoomControls, SoundToggle, TemperatureButton (scene 6 only), ShowMoleculesToggle (scene 2 only), TimeLapseSlider (scene 5 only), FocusResetButton, respawn

Conditional visibility per-scene matches EM's pattern of showing only relevant controls.

## 13. Subject Registry

In `src/site/content/subjects.ts`, append to the `physics` lab list:

```ts
{
  id: 'brownian-diffusion',
  title: 'Броунівський рух та дифузія',
  subtitle: 'Молекули · Дифузія · Температура',
  path: '/physics/brownian-diffusion',
  status: 'available',
}
```

Routes registration: follow the EM-induction precedent — grep the codebase for `em-induction` and add equivalent entries (lazy import + Route) for `brownian-diffusion` at every site.

## 14. Tests

Vitest unit tests, mirroring EM-induction's coverage strategy. R3F scenes, drag interactions, and camera transitions are **not** unit-tested — they are verified by manual smoke test in dev preview.

| Module | Tests | Approx count |
|---|---|---|
| `physics/kinetics.ts` | `step` integrates correctly; `collidePair` conserves KE & momentum; wall reflection flips correct axis; T-scaling preserves KE ratio; pollen collides like ordinary particle | ~10 |
| `physics/divider.ts` | Divider open height controls particle blocking; lift animation interpolation; particles inside cannot pass through closed section | ~4 |
| `physics/lattice.ts` | `interpolate` returns correct snapshot at exact years; lerps between adjacent snapshots; bracketing logic for arbitrary year values | ~4 |
| `state/LabState.ts` | Initial phase = intro; `start()` → in-progress; `advanceScene` from 5 → 6 transitions to finished; journal accumulates entries with sceneTitle; reset clears journal + sets intro; `respawnObjects` bumps sessionId without changing phase | ~6 |
| `state/LabSettingsState.ts` | Defaults; `setTemperature` cycles correctly; `toggleMolecules` flips; `setTimeLapse` clamps to allowed values | ~4 |
| `content/scenes.ts` | Exactly 6 scenes; each has ≥1 step; MC steps have ≥3 choices and valid correctIndex; all motionTrigger types are recognised | ~4 |
| **Total new tests** | | **~32** |

Total project test count progression: 222 → ~254.

## 15. Smoke Test Plan

Before merging to master, manually verify in `npm run dev` preview:

- Landing → physics → "Броунівський рух та дифузія" navigates and lab loads.
- Intro screen → "Почати" enters scene 1; camera transitions from overview to focus-box.
- Scene 1: see ~60 multicoloured particles bouncing. Answer MC → advance.
- Scene 2: drag pollen from tray into box; pollen jiggles visibly without molecules. Tap "Показати причину" → molecules appear; observe causal bombardment. Answer MC.
- Scene 3: see divider in centre; drag handle upward; particles begin crossing; mix completes. Answer MC.
- Scene 4: camera moves to beaker; pick dropper; drop ink; observe slow spread. Answer MC.
- Scene 5: camera moves to solid blocks; press button; drag time-lapse slider 1→100; observe gold atoms migrating. Answer MC.
- Scene 6: camera returns to box; cycle temperature pill cold→hot; observe speed change. Answer MC.
- RevealScene shows journal with 6 entries with Ukrainian scene titles.
- Reset → returns to intro.
- Touch test on a phone (iOS Safari, Android Chrome): drag interactions work; pinch-zoom works; bottom-sheet opens/closes; controls visible.
- WebGL-disabled fallback: returns `<WebGLUnsupported>` instead of crashing.
- Mobile perf: scene 3 with 80 particles + scene 6 hot temperature maintain ≥ 45 fps on a mid-range Android.

## 16. Risks

- **Mobile particle perf.** 150 particles × O(n²) on a low-end phone may dip below 60 fps. Mitigation: early benchmark with throttle ×4; fallback `maxParticles = 100`; spatial hashing as last resort (not anticipated).
- **Solid-state visual fidelity.** Hand-authored snapshots may look too uniform / random rather than physically realistic. Mitigation: snapshots authored to show a clear gradient (gold density decreasing into lead) with a few "outlier" atoms; iterated visually in the smoke test phase.
- **Drag handle on the divider.** A vertical wall inside a glass box may be hard to grab on a phone. Mitigation: a visible handle protruding above the box top with generous hit-radius (consistent with how draggable objects in EM and mass-measurement provide a generous hit-radius).
- **Brownian molecules being invisible by default is a leap of faith.** Students may not realise they can press the "show cause" button. Mitigation: the button pulses (subtle animation) until pressed; the hintExplanation explicitly names it: «натисни 'показати причину' коли захочеш зрозуміти».
- **Scene flow longer than EM (6 vs 5).** Slight extra time per session. Mitigation: each scene is designed to take 60-90 s; total ≤ 9 minutes. Acceptable for a single classroom period.

## 17. Done Definition

This lab is "done" when:
- All 32 new unit tests pass; total project test count is 254 (or as adjusted).
- `npx tsc --noEmit` returns zero errors.
- `npm run build` succeeds.
- Smoke test (§15) passes end-to-end on desktop + one mobile device.
- The lab appears in `/physics` listing with subtitle, opens at `/physics/brownian-diffusion`.
- Code review pass per `superpowers:requesting-code-review`.

## 18. Open Decisions

None. All UX, architectural, and scope decisions were resolved during the brainstorm session (5 design blocks, all approved by user). The implementation plan will derive directly from this spec.

## 19. References

- PhET Diffusion (reference simulator): https://phet.colorado.edu/sims/html/diffusion/latest/diffusion_all.html
- EM-induction lab (pattern source): `src/labs/electromagnetic-induction/`
- EM-induction spec (style reference): `docs/superpowers/specs/2026-05-11-em-induction-lab-design.md`
- Roberts-Austen 1896 (gold-lead diffusion, scene 5 inspiration): Roberts-Austen, W. C. (1896). "On the Diffusion of Metals." Phil. Trans. R. Soc. A.

---

**Word count target:** This spec is dense by design; it is meant to be drop-in implementable by a fresh subagent per slice, with no follow-up clarification required.
