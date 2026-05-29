# Diffusion Lab Rework — "One Living Box" Design

**Status:** Approved direction (2026-05-29). Supersedes the interaction/flow design of
`2026-05-26-brownian-diffusion-lab-design.md`. The underlying **physics engine and SDK
guided-flow stay**; this rework changes *interaction, presentation, and structure*.

**Lab:** `src/labs/brownian-diffusion/` (route `/physics/brownian-diffusion`, title
«Броунівський рух та дифузія»). Audience: UA school, grade 7.

---

## 1. Why (the four pains)

A full smoke-test surfaced four simultaneous problems — one root cause, not four bugs:
the lab is a **rigid step-march** driven by **finicky 3D drag** and **invisible
win-conditions**, so it feels unclear, invisible, and boring at once.

| Pain | Fix in this rework |
|------|--------------------|
| **Drag/grab broken** — objects don't pick up/drop; invisible drop-zones; 4 s dwell | Remove all 3D drag. Every manipulation is a **panel control** (button/toggle/slider). Nothing to "fail to grab". |
| **Unclear step** — stalls, or "advanced by itself" | **No silent auto-advance.** Goal reached -> a **«Далі ->»** button lights up; the student taps to proceed. The current goal is always shown. |
| **Can't see the point** | A live **«Перемішаність»** meter (diffusion as a number) + **one stable camera** (no per-scene jumps). |
| **Boring scenario** | One cohesive **sandbox** (a single living box you control) + light **missions** + a final **free-play** mode. |

---

## 2. Format & architecture

**Hybrid: free sandbox + guided missions.** Approved architecture: **"one living box"**.

The whole lab is a **single glass box** on the table. A **control panel** drives it; a
**mixedness meter** reads it; a **mission card** (the existing HUD task panel) gives the
current goal. The box can switch material state (**Газ / Рідина / Тверде**) in place —
the same box, different medium — so the entire grade-7 curriculum (Brownian motion,
diffusion in gases/liquids/solids, temperature dependence) lives in one continuous scene.

```
            +------------- one stable camera -------------+
  Mission   |                                             |   Control panel
  card  <-- |            [ GLASS BOX ]                    | -->  (Газ/Рідина/Тверде,
  (HUD)     |   gas dots / liquid+ink / solid lattice     |      температура, лічильники,
            |            divider (kinematic)              |      перегородка, тестова
  Journal   |                                             |      частинка, показати молекули)
  (HUD)  <--|     «Перемішаність»  [#####.....]  62%      |
            +---------------------------------------------+
```

---

## 3. Material-state model (one box, three states)

`materialState: 'gas' | 'liquid' | 'solid'` (new, in `LabSettingsState`). The single
`GlassBox` is always mounted; its **contents** swap by state. **All physics is reused —
no new math.**

| State | Contents | Reused physics |
|-------|----------|----------------|
| **Газ** | Free fast particles (red/blue), optional amber **tracer** | `particles.ts`, `kinetics.ts` (`step`, walls, `reflectAtDivider`), `divider.ts` |
| **Рідина** | Dense slow particles + **ink** drop | same kinetics with `liquidDrag` (already a param), `spawnInk.ts` |
| **Тверде** | Crystal **lattice**, ultra-slow interdiffusion via time-lapse | `lattice.ts` + `timeLapseYears` interpolation |

`temperatureLevel` (cold/normal/warm/hot) remains the global velocity multiplier
(existing `T_VELOCITY_SCALE`), applied in gas & liquid.

Switching state re-seeds the box (same idiom as today's per-scene re-seed in
`LabScene` `useEffect`), keyed off `materialState` instead of `currentSceneIndex`.

**Retired** (no more separate props/instruments — everything happens *inside the one box*):
external Beaker, external SolidBlocks tray, and all drag instruments (see §8).

---

## 4. Control panel (`ui/ControlPanel.tsx`, NEW)

Replaces the finicky drag with reliable controls. Desktop: right rail. Phone: same
controls inside the existing `BottomSheet`.

| Control | Drives | Notes |
|---------|--------|-------|
| **Стан речовини** segmented | `materialState` | Газ / Рідина / Тверде |
| **Температура** slider (4 stops) | `temperatureLevel` | Холодно->Гаряче; reuses enum, add `setTemperature(level)` |
| **Молекули** two steppers | `redCount`, `blueCount` | range 5–40, default 20/20 |
| **Перегородка** toggle | `dividerRaised` | tap toggles; the 3D divider animates kinematically (no drag) |
| **＋ Тестова частинка** button | `addTracer()` | gas -> amber tracer grain; liquid -> ink drop; disabled in solid |
| **Показати молекули** switch | `showMolecules` | existing toggle, folded into the panel |
| **Час (роки)** slider | `timeLapseYears` | shown **only** in solid state |
| **↻ Скинути** | `respawnObjects()` | existing |

Existing `ShowMoleculesToggle`, `TemperatureButton`, `TimeLapseSlider` are absorbed into
`ControlPanel` (their store calls are reused; the standalone widgets may be retired).

---

## 5. Mixedness meter (`ui/MixednessMeter.tsx`, NEW)

The "see the point" element. A labelled bar (0–100%) plus a one-line breakdown,
positioned bottom-centre (desktop) / top of sheet (phone). Value via a `mixedness()`
selector:

- **Газ / Рідина:** `fractionMixed(particles)` × 100 (already exists in `divider.ts`).
- **Тверде:** interdiffusion fraction derived from `timeLapseYears` via `lattice.ts`.

The meter is the visible target for several missions (§6).

---

## 6. Mission arc

Missions reuse the existing guided machine: each mission is a `BdScene` with `BdStep[]`
(same shape, same HUD rendering). `content/scenes.ts` is **rewritten in place** with the
sequence below; UI copy "scene" -> **«Місія»**. No `dragging` steps remain.

| # | Mission | Student action (controls) | Completion predicate | MC check |
|---|---------|---------------------------|----------------------|----------|
| 1 | **Молекули не сплять** | Observe gas; optionally toggle «показати молекули» | intro acknowledged («Далі») | «Чи завжди рухаються молекули?» |
| 2 | **Броунівський рух** | ＋ тестова частинка in gas; watch it get knocked | `tracerActive && tracer displacement >= 0.05` | «Чому стрибає велика частинка?» |
| 3 | **Дифузія в газі** | Перегородка up; drive meter to 100% | `dividerRaised && mixedness >= 0.98` | «Що буде далі?» |
| 4 | **Дифузія в рідині** | Switch -> Рідина; ＋ крапля; slower mixing | `materialState==='liquid' && tracerActive && mixedness >= 0.5` | «Де швидше — газ чи рідина?» |
| 5 | **Дифузія у твердому** | Switch -> Тверде; час -> 100+ років; near-zero mixing | `materialState==='solid' && timeLapseYears >= 100` | «Скільки часу йде дифузія?» |
| 6 | **Температура вирішує** | In gas/liquid push температура -> Гаряче; mixing speeds up | `temperatureLevel==='hot'` | «Коли дифузія швидша?» |
| — | **Вільна пісочниця** | All controls unlocked, no goal | n/a (phase `sandbox`) | «Завершити роботу» -> finish |

The predicates above are exactly the kinds the lab already evaluates per-scene in
`LabScene.onTick` (`fractionMixed`, `timeLapseYears`, `temperatureLevel`,
`showMolecules`) — reused, retargeted to control state.

---

## 7. Completion & advancement model (central behaviour change)

Today, motion-trigger steps call `advanceStep()` directly (silent), and a scene
auto-advances 400 ms after its last step. **This is the "moved on by itself" feeling.**

New, lab-local model (no SDK change -> other labs untouched):

- Add `goalReached: boolean` + `setGoalReached` / reset to `LabState`.
- `LabScene.onTick` / `SceneController` evaluate the current step's predicate. When it
  first becomes true they call `setGoalReached(true)` **instead of** `advanceStep()`.
- The **HUD** shows the goal always; a **«Далі ->»** button is **enabled only when the
  step is satisfied**:
  - `submitted` (ack) -> always available (the tap is the action).
  - `mc-selected` -> enabled when the correct choice is picked (shows ✓).
  - motion/control goal -> enabled when `goalReached` is true (shows ✓ «Ціль досягнута»).
- `advanceStep()` (and `advanceScene()`) run **only** on the «Далі ->» tap; both reset
  `goalReached`.
- Removes the 400 ms silent scene auto-advance.

Result: never stuck (the goal + how to reach it is shown), never silent (the student
confirms every step).

---

## 8. File-level change map

**Reuse unchanged:** `physics/particles.ts`, `physics/kinetics.ts`, `physics/lattice.ts`,
`physics/divider.ts`, `physics/spawnInk.ts`, `instruments/GlassBox.tsx`,
`scene/ParticleField.tsx`, SDK `guided/StepEngine`, SDK HUD primitives, `RevealScene`,
`IntroScreen`, the 222-test suite.

**Modify:** `scene/LabScene.tsx` (one box always; state-driven contents; single camera;
remove drag instruments; tracer/divider via controls), `content/scenes.ts` (-> mission
sequence, no `dragging`), `state/LabSettingsState.ts` (add `materialState`,
`dividerRaised`, `redCount`, `blueCount`, `tracerActive`/`addTracer`, `setTemperature`,
`setMaterialState`, `setDividerRaised`), `state/LabState.ts` (add `goalReached`, `sandbox`
phase), `ui/HUD.tsx` (Далі-gating, «Місія» copy), `scene/SceneController.tsx` &
`scene/stepAdvance.ts` (predicate -> `setGoalReached`, drop `dragging`).

**New:** `ui/ControlPanel.tsx`, `ui/MixednessMeter.tsx`, `scene/LatticeField.tsx` (in-box
lattice renderer for the solid state).

**Retire (drag / per-scene instruments):** `instruments/PollenParticle.tsx`,
`instruments/InkDropper.tsx`, `instruments/Divider.tsx` (-> kinematic, control-driven),
`instruments/Beaker.tsx`, `instruments/SolidBlocks.tsx`. `PollenTrail.tsx` may be kept as
the tracer's path trail. `tsc noUnusedLocals` drives dead-import cleanup.

**Camera:** drop `sceneToPreset` per-scene switching; use one stable `focus-box` preset;
keep `PinchZoomController`.

---

## 9. UI layout

- **Desktop / tablet:** control panel as a right rail; mixedness meter bottom-centre;
  mission card + journal via existing HUD panels (left).
- **Phone:** controls + meter inside the existing `BottomSheet` (reuse the current mobile
  dock pattern); HUD panels collapsible as today.

---

## 10. Testing & safety

- **Regression gate:** all existing tests stay green (≈ physics math + state machines).
- **New unit tests:** `mixedness()` per state; each mission's completion predicate /
  `goalReached` transition; `LabSettingsState` reducers (materialState, divider, counts,
  tracer, temperature); `ControlPanel` + `MixednessMeter` (RTL) — including that «Далі ->»
  is **disabled until** the goal is satisfied.
- **Browser smoke (mandatory):** click through missions 1->6 + free play in a real
  browser; verify Далі-gating, meter movement, state switches, no console errors. (Direct
  lesson from the prior stuck-at-scene-1 bug: R3F + controls are not unit-tested.)

## 11. Risks & non-goals

- **Risk:** box state-transitions, divider animation, and camera are not unit-testable ->
  covered by the browser smoke.
- **Risk:** retiring instruments may leave dead code -> `tsc` + build catch it.
- **Non-goals:** no changes to the physics math; no new SDK primitives unless strictly
  required; **no changes to other labs** (mass-measurement, electromagnetic-induction).
