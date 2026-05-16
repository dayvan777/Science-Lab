# EM Induction Phase 3 — Turns + Magnet Strength Knobs Design

**Date:** 2026-05-14
**Status:** Approved-in-concept (Phase 3 of three; user said "по очереди" → "гоу")
**Scope:** Final phase of the EM induction lab redesign. Adds two student-controllable physics parameters — number of coil turns and magnet strength — both PhET-style discrete options. Compass tool intentionally deferred (could be a hypothetical Phase 4).

After this phase ships, the lab has functional parity with PhET's Faraday-induction module: drag the magnet, watch field lines + galvanometer + bulb + current arrows, AND adjust the two physics knobs to test hypotheses.

## Non-goals

- Compass tool (deferred).
- Continuous-slider for magnet strength (we use 3 discrete levels — simpler, more touch-friendly).
- AC source / electromagnet alternative (out of scope — that's PhET's "Electromagnet" tab, a different lab).
- Variable coil radius / length / wire gauge.
- Animated transitions when turns change (the helix snaps to new count on click — no morph).

---

## Reference

PhET Faraday Lab's "Bar Magnet" tab has two knobs in its sidebar:
- **Loops:** radio buttons for 1 / 2 / 3 loops.
- **Strength:** slider 0–100 % for the bar magnet's field strength.

Plus a "Show Field Lines" toggle (we already have it — Phase 2).

For NOVA EVRIKA's touch-first Promethean target, **cycle-pills** beat sliders/radios: one tap cycles through the discrete options, no popovers needed. Same affordance as the existing zoom +/− and sound toggle buttons.

## Architecture

### Two new pill buttons in the bottom-right control row

| Pill | States (cycle on click) | Default | Effect |
|---|---|---|---|
| **Витки** | `3` → `5` → `10` → `20` → (wraps) | `10` | Coil rebuilds with this many turns. EMF scales linearly with turns. |
| **Магніт** | `Слабкий` → `Звичайний` → `Сильний` → (wraps) | `Звичайний` | EMF_GAIN multiplied by `0.5` / `1.0` / `1.5`. Field-line opacity also scales — weaker magnet = fainter lines. |

Click on a pill cycles to the next state, plays the existing `tick` sound, persists to localStorage.

Visual: pills look identical to the existing "⊟ Поле" toggle. Label format: `Витки: 10` / `Магніт: Звич.` (abbreviated to fit).

### Single store, extended

Instead of creating yet another Zustand store, **extend the existing `VisualState.ts`** with two new fields:

```ts
type LabSettings = {
  fieldVisible: boolean
  coilTurns: 3 | 5 | 10 | 20
  magnetStrength: 'weak' | 'normal' | 'strong'
  setFieldVisible: (v: boolean) => void
  cycleCoilTurns: () => void
  cycleMagnetStrength: () => void
}
```

The file is renamed `VisualState.ts` → `LabSettingsState.ts` for naming accuracy. All five existing consumers update their imports:
- `FieldLines.tsx`
- `CurrentArrows.tsx`
- `FieldToggleButton.tsx`
- `LabScene.tsx`
- (new) `CoilTurnsButton.tsx` + `MagnetStrengthButton.tsx`

The persist key changes `'em-induction.visual-state'` → `'em-induction.lab-settings'`. Old localStorage entries from Phase 2 become orphans — they're tiny (single boolean) and Zustand's persist hydration gracefully falls back to defaults if the key is missing. No migration needed.

`useVisualState` is renamed `useLabSettings`. Pure mechanical rename.

### Coil rebuild on turn-count change

`Coil.tsx` currently has `COIL_TURNS = 16` baked in and builds geometry ONCE in `useMemo([])`. Phase 3 changes:

1. Replace `COIL_TURNS = 16` constant with a `turns: number` PROP on the `Coil` component.
2. `buildCoilGeometry` accepts `turns` as an argument.
3. `useMemo` deps on `[turns]` so the geometry rebuilds when the prop changes.
4. Dispose the old geometry in `useEffect` cleanup whenever it's replaced.

`LabScene` passes `<Coil position={COIL_WORLD} turns={turns} />` where `turns` comes from the settings store.

`CurrentArrows.tsx` also needs the turns value — its `computeArrowTransforms` already accepts it as a prop, so just thread the new value through.

`Wires.tsx` and `CoilStand.tsx` use `COIL_LENGTH` (unchanged) and `COIL_OUTER_RADIUS` (unchanged) — they don't depend on turns, no change needed.

The existing `COIL_TURNS` export from `Coil.tsx` (line 9) becomes a **default** value (`export const DEFAULT_COIL_TURNS = 10`). LabScene reads from the settings store, not the default. Tests still import the constant if they need it.

### EMF physics adjustment

Currently `computeEMF` uses a hardcoded `EMF_GAIN = 12.0`. Phase 3 makes EMF depend on:
- Number of turns (linear scaling — Faraday's law: `EMF = -N · dΦ/dt`).
- Magnet strength (linear scaling — proportional to the magnetic field `B`).

New signature:

```ts
export function computeEMF(
  magnetPos: Vector3,
  magnetVel: Vector3,
  turns: number,           // NEW — typical 1..20
  strengthMultiplier: number  // NEW — 0.5 / 1.0 / 1.5
): number {
  // ...existing inside-radius check + proximity calc...
  const turnsScale = turns / DEFAULT_COIL_TURNS  // 1.0 at default 10 turns
  const emf = EMF_GAIN * velAlongAxis * proximity * turnsScale * strengthMultiplier
  return Math.max(-EMF_MAX, Math.min(EMF_MAX, emf))
}
```

`DEFAULT_COIL_TURNS = 10` is the new module-level constant (replacing the old `COIL_TURNS = 16`). Default `turnsScale = 1.0`. With 20 turns: 2× EMF. With 3 turns: 0.3× EMF.

Tests need updating — existing tests pass `(pos, vel)`; new signature requires `(pos, vel, turns, strength)`. I'll update tests to use defaults: `turns = DEFAULT_COIL_TURNS, strength = 1.0` so existing assertions remain meaningful.

### `LabScene.SceneController` change

The per-frame `computeEMF` call adds the two new args:

```ts
const { coilTurns, magnetStrength } = useLabSettings.getState()
const strengthMul = magnetStrength === 'weak' ? 0.5 : magnetStrength === 'strong' ? 1.5 : 1.0
const emf = computeEMF(scratchPos.current, scratchVel.current, coilTurns, strengthMul)
```

Reading the store via `getState()` (not selector) avoids re-render on settings change — same pattern as the existing `useInductionReadings.getState()` calls.

### Field line opacity scales with magnet strength

`FieldLines.tsx` already reads `visible` as a prop. Extend the prop to include a scalar opacity multiplier OR pass `magnetStrength` as a separate prop. Cleanest: pass `opacityScale: number` as a new prop (1.0 normal, 0.5 weak, 1.5 strong). Field-line max opacity becomes `FIELD_OPACITY * opacityScale` clamped to 0..1.

LabScene computes: `opacityScale = magnetStrength === 'weak' ? 0.5 : magnetStrength === 'strong' ? 1.5 : 1.0`.

### File touch-list

| File | Change |
|---|---|
| `src/labs/electromagnetic-induction/state/VisualState.ts` | RENAMED → `LabSettingsState.ts`. Adds `coilTurns`, `magnetStrength`, `cycleCoilTurns`, `cycleMagnetStrength`. Persist key updated. |
| `src/labs/electromagnetic-induction/ui/FieldToggleButton.tsx` | Update import (`useVisualState` → `useLabSettings`). |
| `src/labs/electromagnetic-induction/ui/CoilTurnsButton.tsx` | NEW — pill cycling 3/5/10/20. |
| `src/labs/electromagnetic-induction/ui/MagnetStrengthButton.tsx` | NEW — pill cycling Слабкий/Звичайний/Сильний. |
| `src/labs/electromagnetic-induction/instruments/Coil.tsx` | `turns` becomes a prop, `buildCoilGeometry` takes it as arg, replace `COIL_TURNS` constant with `DEFAULT_COIL_TURNS = 10` export. |
| `src/labs/electromagnetic-induction/instruments/FieldLines.tsx` | New `opacityScale` prop, multiplies the lerp target. Update store import name. |
| `src/labs/electromagnetic-induction/instruments/CurrentArrows.tsx` | `coilTurns` prop (already exists but now driven by settings). Update store import name. |
| `src/labs/electromagnetic-induction/physics/induction.ts` | `computeEMF` accepts `turns` + `strengthMultiplier`. Module-level `DEFAULT_COIL_TURNS = 10`. |
| `src/labs/electromagnetic-induction/scene/LabScene.tsx` | Mount the 2 new pills. Pass `turns + opacityScale + strengthMul` props. Read settings store. |
| `tests/labs/em-induction.test.ts` | Update existing `computeEMF` calls to pass `(pos, vel, 10, 1.0)` defaults. Add 2 new tests: "more turns → more EMF" + "strong magnet → more EMF". |

### Acceptance criteria

1. From Scene 2 onward, the bottom-right control row shows two new pills: "Витки: 10" and "Магніт: Звич." (adjacent to the existing "⊟ Поле").
2. Clicking the Витки pill cycles `10 → 20 → 3 → 5 → 10`. The coil's visual helix rebuilds to match the chosen count.
3. Clicking the Магніт pill cycles `Звич. → Сильний → Слабкий → Звич.`. The field-line opacity scales accordingly (weaker = fainter).
4. Galvanometer needle deflection scales linearly with both turns AND magnet strength. Dragging the same speed with 20 turns + strong magnet gives a deflection ~6× larger than with 3 turns + weak magnet.
5. The bulb threshold (`BULB_THRESHOLD = 1.5`) interacts naturally: weak magnet at low turns barely lights it, strong magnet at high turns easily lights it.
6. State persists across page reload — refresh the page and the pills retain their last-clicked value (localStorage key `'em-induction.lab-settings'`).
7. Mass-measurement lab is unaffected. SDK unchanged.
8. Tests: 138 + 2 new = 140. `npx tsc --noEmit` clean, `npm run build` clean.

### Risks

- **TubeGeometry rebuild cost on turns change** — building a new 96-segment TubeGeometry with 6 radial segs is ~1 ms. Discrete click cadence (not animated), so the cost is one-frame jank at most. Acceptable.
- **Persist key change orphans old localStorage** — Phase 2's `'em-induction.visual-state'` entry becomes dead. Browser cleanup is automatic but the orphan persists until manually cleared. Negligible (tiny string). Mitigated by adding a small migration helper that reads the old key on first load if the new key is missing — actually skip, complexity not worth it for a single boolean.
- **Magnet-strength does NOT change the magnet's appearance** — only field-line opacity scales. A future polish could darken the bar magnet's emissive when "weak". Out of scope.
- **EMF clamping behaviour at strong + many turns** — with `EMF_MAX = 5.0` clamp, max possible EMF stays at ±5.0 N. So "strong + 20 turns" can hit the cap easily during fast drag. Acceptable — the cap is at the galvanometer's max needle deflection, which is meant to be visually saturable.

### Out of scope

- Compass tool.
- Continuous slider UI (we use discrete cycle pills).
- Visual scaling of the magnet's mesh (only field-line opacity scales).
- AC source / electromagnet mode.
- Smooth-morph animation when turns count changes (snap is fine).

### Self-review checklist

- [x] Every feature has concrete acceptance criteria.
- [x] No "TBD" / "TODO" / placeholder text.
- [x] All file changes are lab-local; no SDK touches.
- [x] Existing tests get an explicit signature update (`(pos, vel, 10, 1.0)`) — not silently broken.
- [x] Two new tests verify the new linear scaling (turns + strength).
- [x] Persist key is namespaced (`em-induction.*`) — no collision with future labs.
