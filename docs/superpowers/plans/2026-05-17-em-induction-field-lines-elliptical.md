# Field Lines Smooth Elliptical Geometry — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the kite-shaped 5-control-point field-line geometry with a true smooth half-ellipse (17 control points) and increase line density from 4 shells to 5.

**Architecture:** Single-file fix inside `FieldLines.tsx`. Two changes: rewrite `makeFieldLine` to compute control points along a parametric half-ellipse (`x = halfLength·sin(θ)`, `y = ±extent·cos(θ)` for θ ∈ [-π/2, +π/2]), and bump `LINE_EXTENTS` from `[0.04, 0.10, 0.20, 0.40]` to `[0.04, 0.08, 0.14, 0.22, 0.32]`.

**Tech Stack:** React 19, TypeScript, Three.js (`CatmullRomCurve3`, `TubeGeometry`, `Vector3`). No new dependencies.

**Spec:** `docs/superpowers/specs/2026-05-17-em-induction-field-lines-elliptical-design.md` (commit `580f180`).

**Branch:** `feat/em-induction-field-lines-elliptical` (from `master` at commit `580f180`).

---

## File Structure

1 file modified, 0 new files.

| File | Change |
|---|---|
| `src/labs/electromagnetic-induction/instruments/FieldLines.tsx` | Rewrite `makeFieldLine` body (uses parametric ellipse loop instead of 5-point literal); change `LINE_EXTENTS` from 4 levels to 5 levels. |

---

## Pre-flight

- [ ] **Step 0a: Confirm clean tree on master**

Run: `git status`
Expected: `nothing to commit, working tree clean`. HEAD at `580f180` on `master`.

- [ ] **Step 0b: Create feature branch**

Run: `git checkout -b feat/em-induction-field-lines-elliptical`
Expected: `Switched to a new branch 'feat/em-induction-field-lines-elliptical'`.

- [ ] **Step 0c: Baseline test run**

Run: `npm test -- --run`
Expected: `Tests 220 passed (220)`.

---

## Task 1: Smooth elliptical curves + denser shells

**File:** `src/labs/electromagnetic-induction/instruments/FieldLines.tsx`

- [ ] **Step 1.1: Bump LINE_EXTENTS**

Open `src/labs/electromagnetic-induction/instruments/FieldLines.tsx`. Find the constant (around line 34):

```ts
const LINE_EXTENTS = [0.04, 0.10, 0.20, 0.40] as const
```

Replace with:

```ts
const LINE_EXTENTS = [0.04, 0.08, 0.14, 0.22, 0.32] as const
```

- [ ] **Step 1.2: Rewrite makeFieldLine to use parametric half-ellipse**

Still in the same file. Find the `makeFieldLine` function (currently around lines 60–75):

```ts
function makeFieldLine(extent: number, mirror: boolean, halfLength: number): CatmullRomCurve3 {
  const sign = mirror ? -1 : 1
  const yMax = extent * 0.85
  return new CatmullRomCurve3(
    [
      new Vector3(-halfLength, 0, 0),
      new Vector3(-extent * 0.5, sign * yMax * 0.6, 0),
      new Vector3(0, sign * yMax, 0),
      new Vector3(extent * 0.5, sign * yMax * 0.6, 0),
      new Vector3(halfLength, 0, 0),
    ],
    false,
    'catmullrom',
    0.5,
  )
}
```

Replace the FULL function body with:

```ts
function makeFieldLine(extent: number, mirror: boolean, halfLength: number): CatmullRomCurve3 {
  const sign = mirror ? -1 : 1
  // Smooth half-ellipse from N tip to S tip, bulging out by `extent` at the
  // apex. 17 control points spaced along the true elliptical parameterization
  // give the spline enough samples to render as a visually smooth "textbook"
  // field line instead of the old 5-point kite-shaped approximation.
  //   x = halfLength * sin(θ)   → starts at -halfLength (N tip), ends at +halfLength (S tip)
  //   y = sign * extent * cos(θ) → 0 at the poles, ±extent at the apex
  // θ sweeps from -π/2 (N tip) through 0 (apex) to +π/2 (S tip).
  const N_POINTS = 17
  const points: Vector3[] = []
  for (let i = 0; i < N_POINTS; i++) {
    const t = i / (N_POINTS - 1)
    const theta = -Math.PI / 2 + t * Math.PI
    const x = halfLength * Math.sin(theta)
    const y = sign * extent * Math.cos(theta)
    points.push(new Vector3(x, y, 0))
  }
  return new CatmullRomCurve3(points, false, 'catmullrom', 0.5)
}
```

Verification (by inspection):
- At `i=0`: `t=0` → `θ=-π/2` → `sin(-π/2)=-1`, `cos(-π/2)=0` → `(-halfLength, 0, 0)` = N tip ✓
- At `i=8`: `t=0.5` → `θ=0` → `sin(0)=0`, `cos(0)=1` → `(0, sign*extent, 0)` = apex ✓
- At `i=16`: `t=1` → `θ=+π/2` → `sin(π/2)=1`, `cos(π/2)=0` → `(halfLength, 0, 0)` = S tip ✓

The new function signature matches the old one — same name, same params, same return type. Callers (`geometries` useMemo and `arrowTransforms` useMemo) need no changes.

- [ ] **Step 1.3: Type-check + test + build**

Run: `npx tsc --noEmit`
Expected: 0 errors.

Run: `npm test -- --run`
Expected: 220 tests passing.

Run: `npm run build`
Expected: build succeeds (pre-existing chunk-size warning unchanged).

- [ ] **Step 1.4: Commit**

```bash
git add -A
git commit -m "feat(em-induction): field lines use smooth parametric half-ellipse (17 points, 5 shells)"
```

---

## Task 2: Final verification + push + direct-merge to master

**Files:** None modified. Verification only.

- [ ] **Step 2.1: Full clean run**

Run: `npx tsc --noEmit`
Expected: 0 errors.

Run: `npm run build`
Expected: build succeeds, only the pre-existing chunk-size warning.

Run: `npm test -- --run`
Expected: 220 tests passing.

- [ ] **Step 2.2: Sanity-check the diff**

Run: `git log --oneline master..HEAD`
Expected to show 1 commit:
1. `feat(em-induction): field lines use smooth parametric half-ellipse (17 points, 5 shells)`

Run: `git diff master..HEAD --stat`
Expected: 1 file changed, ~25 lines net (additions + deletions).

- [ ] **Step 2.3: Push the branch**

Run: `git push -u origin feat/em-induction-field-lines-elliptical`
Expected: branch pushed to remote.

- [ ] **Step 2.4: Direct-merge to master**

```bash
git checkout master
git merge --no-ff feat/em-induction-field-lines-elliptical -m "Merge feat/em-induction-field-lines-elliptical: smooth elliptical field lines"
git push origin master
```

Expected: master fast-forwards onto a merge commit; pushed; Vercel triggers prod deploy.

- [ ] **Step 2.5: User smoke-test (after Vercel deploys)**

On iPhone or desktop, open `science-lab-phi.vercel.app` → EM induction lab:

1. Field arcs around the active magnet look smoothly elliptical (no more kite-shape).
2. 5 shells visible above and 5 below the magnet (10 total lines).
3. Cone arrows along each curve point in the same direction as before (no change).
4. Toggle "⊟ Поле" → all 10 arcs fade out over ~250 ms. Toggle back on → fade in.
5. Drag the magnet → arcs follow.
6. Switch active magnet → its 10 arcs appear, other's fade out.
7. Galvanometer + bulb behaviour unchanged.

---

## Self-Review Notes

**Spec coverage:**
- ✅ A.1 (parametric ellipse rewrite) — Task 1, Step 1.2.
- ✅ A.2 (LINE_EXTENTS bump) — Task 1, Step 1.1.
- ✅ Smoke-test list in Step 2.5 covers all 7 acceptance criteria.

**Placeholder scan:** No "TBD" / "TODO" / "fill in later". Every step shows full code or full command with expected output.

**Type consistency:** `makeFieldLine` signature unchanged (`(extent: number, mirror: boolean, halfLength: number) => CatmullRomCurve3`). Callers in `geometries` useMemo and `arrowTransforms` useMemo don't need any updates. `LINE_EXTENTS` is `readonly number[]` — bumping it to 5 elements doesn't change consumer code (the for-of loops iterate dynamically).

**No new tests:** Visual-only change; no unit-testable surface.

**Branch parallelism:** This work is on top of fresh master (`580f180`) which includes all prior merges. No conflicting open branches.
