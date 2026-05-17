# Field Lines on Scene 1 — Design

**Date:** 2026-05-17
**Status:** Approved-in-concept (user said "да" after Approach 1 proposal)
**Scope:** Remove the Scene-1 visibility gate on the EM induction lab's field lines + current arrows. The user reported the "⊟ Поле" toggle button appeared broken — it cycles state correctly, but the visual field lines never render. Root cause is a deliberate Phase-2 gate (`&& idx > 0`) that hid the field on Scene 1 for pedagogical reasons.

## Background

User on Vercel-deployed live URL (now updated with merged Phase 3 + Touch+Responsive + Mobile v2 branches) opens the EM induction lab, lands on Scene 1, taps the "⊟ Поле" pill, and sees no change. They concluded the field-line feature is broken.

Reading `src/labs/electromagnetic-induction/scene/LabScene.tsx` line 207:

```ts
// Field + current arrows are hidden during Scene 1 (intro) regardless of
// the toggle — the student should see the bare equipment first. From
// Scene 2 onward, the toggle takes effect.
const fieldVisible = fieldVisibleToggle && idx > 0
```

The `&& idx > 0` clause forces `fieldVisible` to `false` on Scene 1 (`idx === 0`) regardless of the toggle. The intent was pedagogical — students see bare equipment first, then meet the field on Scene 2. In practice this creates a UI bug: the toggle pill exists, animates state, persists to localStorage, but visually nothing changes. Users conclude the feature is broken.

The pedagogical goal (show bare equipment first) is better served by trusting the student to tap the toggle if they want, or by the teacher controlling demonstration timing — not by hiding state behind a silent gate.

## Non-goals

- Adding any new component or HUD element.
- Changing the default `fieldVisible: true` in `LabSettingsState` (the field shows by default; users hide it if they want bare equipment).
- Adding tests — no new testable surface; existing 220-test suite remains the regression gate.
- Touching `CurrentArrows.tsx` or `FieldLines.tsx` themselves — both already react correctly to the `visible` prop and fade in/out smoothly.

## Architecture

One file changed: `src/labs/electromagnetic-induction/scene/LabScene.tsx`.

One code line:

```ts
// Before
const fieldVisible = fieldVisibleToggle && idx > 0

// After
const fieldVisible = fieldVisibleToggle
```

Three-line comment above is replaced with a one-line note that matches the new behaviour:

```ts
// Before (3 lines)
// Field + current arrows are hidden during Scene 1 (intro) regardless of
// the toggle — the student should see the bare equipment first. From
// Scene 2 onward, the toggle takes effect.

// After (2 lines)
// Field + current arrows visibility follows the user's toggle on every
// scene. Default is on (fieldVisible: true in LabSettingsState).
```

Total diff: ~5 lines (1 code line modified + 3 comment lines replaced with 2). No imports change, no new state, no architectural shift.

## Behaviour after the change

| Scenario | Before | After |
|---|---|---|
| Open lab, land on Scene 1 (default `fieldVisible: true`) | No field lines visible. Toggle pill shows "⊟ Поле" but tapping it has no visual effect. | Field lines visible immediately. Toggle pill toggles them on/off correctly. |
| Open lab, land on Scene 2+ | Field lines visible (toggle was true). | Same — unchanged. |
| User taps "⊟ Поле" on Scene 1 | State flips to false in store, persists to localStorage, but no visual change. Tapping again flips back, still no visual change. | Field lines fade out (~250 ms). Tap again → fade in. |
| User had previously hidden the field, refreshes the page | Stays hidden. Scene 1 looks the same as "default" because Scene 1 never showed it anyway. | Stays hidden — toggle state still persisted. User sees consistent behaviour. |

The existing FadeIn/fadeOut animation in `FieldLines.tsx` (`material.opacity += (target - material.opacity) * step` with `FADE_STIFFNESS = 4`) carries the visual transition smoothly on Scene 1 entry just as on Scene 2+. `CurrentArrows.tsx` has the same lerp pattern.

## Acceptance

1. Opening the EM induction lab on a fresh browser (no localStorage state) on Scene 1 — field lines visible immediately, "⊟ Поле" pill shown (collapsed icon).
2. Tapping "⊟ Поле" on Scene 1 → field lines fade out over ~250 ms, pill becomes "⊞ Поле".
3. Tapping "⊞ Поле" → field lines fade in over ~250 ms, pill becomes "⊟ Поле".
4. Same behaviour on Scenes 2, 3, 4, 5 (unchanged — already worked there).
5. `npx tsc --noEmit` clean; 220 tests still passing; `npm run build` succeeds.

## Risks

- **Pedagogical loss:** Phase 2's "students see bare equipment first" disappears. Acceptable — the toggle pill itself is the affordance, and a teacher running a lesson can hide the field manually before bringing students in.
- **No other risks.** Pure boolean simplification.

## Out of scope

- Changing the default field visibility (`fieldVisible: true` stays).
- Adding an onboarding hint or tour for the toggle.
- Touching CurrentArrows / FieldLines internals.
- Tests.

## Self-review checklist

- [x] Acceptance criteria are concrete and verifiable.
- [x] No "TBD" / "TODO" / placeholder text.
- [x] Single file change, single code line, single comment update.
- [x] No new dependencies.
- [x] Behaviour-after table covers all four meaningful state combinations.
