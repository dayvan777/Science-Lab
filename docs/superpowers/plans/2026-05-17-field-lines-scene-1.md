# Field Lines on Scene 1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the `&& idx > 0` Scene-1 visibility gate so the "⊟ Поле" toggle correctly shows/hides the magnetic field lines on every scene of the EM induction lab.

**Architecture:** One file changed. One code-line modified (`fieldVisibleToggle && idx > 0` → `fieldVisibleToggle`). The adjacent 3-line comment is replaced with a 2-line note that describes the new behaviour. No new files, no new tests, no architectural shift.

**Tech Stack:** React, TypeScript. The `useLabSettings` store (already exists from Phase 3) and `useLabState.currentSceneIndex` (already exists) — both untouched. Pure consumer-side simplification.

**Spec:** `docs/superpowers/specs/2026-05-17-field-lines-scene-1-design.md` (commit `1b41e8d`).

**Branch:** `fix/field-lines-scene-1` (from `master` at commit `1b41e8d`).

---

## File Structure

| File | Change |
|---|---|
| `src/labs/electromagnetic-induction/scene/LabScene.tsx` | MODIFY — drop `&& idx > 0` from `fieldVisible` derivation; replace stale 3-line comment with 2-line note. |

That's the entire diff. No new files, no test files, no other consumers.

---

## Pre-flight

- [ ] **Step 0a: Confirm clean tree on master**

Run: `git status`
Expected: `nothing to commit, working tree clean`. HEAD at `1b41e8d` on `master`.

- [ ] **Step 0b: Create feature branch**

Run: `git checkout -b fix/field-lines-scene-1`
Expected: `Switched to a new branch 'fix/field-lines-scene-1'`.

- [ ] **Step 0c: Baseline test run**

Run: `npm test -- --run`
Expected: `Tests 220 passed (220)`.

---

## Task 1: Remove Scene-1 visibility gate

**Files:**
- Modify: `src/labs/electromagnetic-induction/scene/LabScene.tsx` (around lines 204–207)

- [ ] **Step 1.1: Edit LabScene.tsx**

Open `src/labs/electromagnetic-induction/scene/LabScene.tsx`. Find this block (lines 204–207):

```ts
  // Field + current arrows are hidden during Scene 1 (intro) regardless of
  // the toggle — the student should see the bare equipment first. From
  // Scene 2 onward, the toggle takes effect.
  const fieldVisible = fieldVisibleToggle && idx > 0
```

Replace with:

```ts
  // Field + current arrows visibility follows the user's toggle on every
  // scene. Default is on (fieldVisible: true in LabSettingsState).
  const fieldVisible = fieldVisibleToggle
```

The `idx` selector at line ~191 (`const idx = useLabState(s => s.currentSceneIndex)`) is still used elsewhere in this component (e.g. `sceneToPreset(idx)` on line ~196 and the `preset` derivation), so it stays — don't remove it.

- [ ] **Step 1.2: Type-check + test + build**

Run: `npx tsc --noEmit`
Expected: 0 errors.

Run: `npm test -- --run`
Expected: 220 tests passing (baseline preserved).

Run: `npm run build`
Expected: build succeeds (pre-existing chunk-size warning unchanged).

- [ ] **Step 1.3: Commit**

```bash
git add -A
git commit -m "fix(em-induction): field-line toggle now works on Scene 1"
```

- [ ] **Step 1.4: Push branch (no PR — direct merge to master after smoke-test)**

Run: `git push -u origin fix/field-lines-scene-1`
Expected: branch pushed to remote.

Stop here. After Vercel preview deploys, smoke-test on iPhone:
1. Open EM induction lab → Scene 1 → field lines visible immediately.
2. Tap "⊟ Поле" → field lines fade out over ~250 ms; pill becomes "⊞ Поле".
3. Tap "⊞ Поле" → field lines fade in; pill becomes "⊟ Поле".
4. Move to Scene 2+ via guided flow — same toggle behaviour, unchanged.

---

## Self-Review Notes

**Spec coverage check:**
- ✅ The one code-line change is in Step 1.1.
- ✅ The 3→2 line comment update is in the same step.
- ✅ Acceptance criteria from the spec (Scene 1 field visible by default; tap toggle to fade; Scene 2+ unchanged) all follow naturally from removing the gate; no additional task needed.
- ✅ "No new tests" — confirmed; this is a purely behavioural simplification with no test surface.

**Placeholder scan:** No "TBD" / "TODO" / "fill in later". Both before/after code blocks shown in full.

**Type consistency:** `fieldVisibleToggle` (boolean from `useLabSettings.fieldVisible`) returns `boolean`. The new `fieldVisible` is just that same boolean, no narrowing or widening. Downstream consumers (`<CurrentArrows visible={fieldVisible} />` and `<FieldLines ... visible={fieldVisible} />`) already accept `boolean` — no signature change.

**`idx` retained:** Confirmed — `idx` is consumed by `sceneToPreset(idx)` on line ~196 elsewhere in this file. Removing it from the `fieldVisible` line does NOT make it unused.

**Branch parallelism:** This is a small fix on top of the freshly-merged master (which contains Phase 3 + Touch+Responsive + Mobile v2). No other un-merged branches touch the same line.
