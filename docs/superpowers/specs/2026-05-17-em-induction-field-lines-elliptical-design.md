# EM Induction Field Lines — Smooth Elliptical Geometry

**Date:** 2026-05-17
**Status:** Approved-in-concept (user said "да" after design proposal)
**Scope:** Replace the kite-shaped CatmullRom field-line curves with true half-elliptical parameterization, and slightly increase line density. One-file fix.

## Background

User compared the lab's field lines side-by-side with a textbook reference image and reported the visuals look angular ("boxy", "kite-shaped") instead of the reference's smooth nested ellipses. The reference shows fine, smooth ellipse-like curves around a vertical bar magnet.

Root cause traced in code: `src/labs/electromagnetic-induction/instruments/FieldLines.tsx`'s `makeFieldLine` builds each field arc from 5 control points (N tip, two side-ups at the curve's mid-height, an apex, then mirror back to S tip). CatmullRom spline interpolation through these 5 points produces a curve that bulges sharply near the apex and dips lower at the sides — visually reading as "kite-shaped" rather than as an ellipse.

The user explicitly invoked the superpowers flow ("запусти superpowers") — this spec is the formal design before the plan and execution.

## Non-goals

- No color change. Amber `#ffc850` already reads well against the dark scene background.
- No tube-radius change.
- No new arrow markers (cone arrows already added in earlier PRs).
- No new tests. The 220-test suite stays as regression gate.
- No third magnet variant.
- No changes to the field's physics, the toggle, the fade animation, or `opacityScale`.
- No new files.

## Architecture

One slice in one PR. Branch `feat/em-induction-field-lines-elliptical` from `master` at commit `e94b74a`.

Single file modified: `src/labs/electromagnetic-induction/instruments/FieldLines.tsx`.

Two changes inside that file:
- **A.1 — `makeFieldLine` rewrite:** Replace the 5-control-point hand-laid polygon with a 17-point parametric half-ellipse. Same CatmullRom curve type for compatibility with the existing tube-geometry pipeline + arrow tangent computation.
- **A.2 — `LINE_EXTENTS` bump:** 4 levels `[0.04, 0.10, 0.20, 0.40]` → 5 levels `[0.04, 0.08, 0.14, 0.22, 0.32]`. Denser nesting in the inner shells, slightly lower outer ceiling (32 cm vs 40 cm) — the outer 40 cm shell was so distant it dominated the rendered scene without adding pedagogical value.

Total ~25 lines of net diff. No new helpers, no new dependencies.

---

## Slice A — Smooth elliptical curves + slightly denser density

### Problem

`makeFieldLine` currently uses 5 hand-laid control points:

```ts
[
  Vector3(-halfLength, 0, 0),              // N tip
  Vector3(-extent * 0.5, sign * yMax * 0.6, 0),  // side-up
  Vector3(0, sign * yMax, 0),              // apex
  Vector3(extent * 0.5, sign * yMax * 0.6, 0),   // side-up (mirror)
  Vector3(halfLength, 0, 0),               // S tip
]
```

Where `yMax = extent * 0.85`. CatmullRom interpolation through these 5 points produces a curve that's pulled toward the apex disproportionately — visually angular instead of smoothly curved.

### Fix

**A.1 — `makeFieldLine` rewrite.** Generate 17 control points along a true half-ellipse with semi-axes (`halfLength`, `extent`):

```ts
function makeFieldLine(extent: number, mirror: boolean, halfLength: number): CatmullRomCurve3 {
  const sign = mirror ? -1 : 1
  // Smooth half-ellipse from N tip to S tip, bulging out by `extent` at the
  // apex. 17 control points spaced along the true elliptical parameterization
  // give the spline enough samples to render as a visually smooth "textbook"
  // field line instead of the old 5-point kite-shaped approximation.
  const N_POINTS = 17
  const points: Vector3[] = []
  // Parametric angle: θ goes from -π/2 (N tip) through 0 (apex) to +π/2 (S tip).
  //   x = halfLength * sin(θ)    → starts at -halfLength, ends at +halfLength
  //   y = extent * cos(θ)        → 0 at the poles, +extent at the apex
  // The `sign` flips the curve below the magnet for `mirror = true`.
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

Verification of endpoint behaviour:
- At t=0 → θ = -π/2 → `x = halfLength*sin(-π/2) = -halfLength`, `y = sign*extent*cos(-π/2) = 0`. Exactly at the N tip ✓
- At t=0.5 → θ = 0 → `x = 0`, `y = sign*extent`. Exactly at the apex ✓
- At t=1 → θ = +π/2 → `x = +halfLength`, `y = 0`. Exactly at the S tip ✓

The curve is C¹-continuous (smooth derivative) at the endpoints and the apex, because cosine and sine are smooth functions. CatmullRom interpolation through 17 well-distributed points gives the rendered TubeGeometry an indistinguishably smooth profile.

**A.2 — `LINE_EXTENTS` bump.** Replace:

```ts
const LINE_EXTENTS = [0.04, 0.10, 0.20, 0.40] as const
```

with:

```ts
const LINE_EXTENTS = [0.04, 0.08, 0.14, 0.22, 0.32] as const
```

Five shells instead of four (with the mirror pairs → 10 lines instead of 8). Inner shells are spaced more closely (0.04, 0.08, 0.14) for a denser "near-field" look. The outer ceiling drops 0.40 → 0.32 m — the old outermost shell was visible far from the magnet, which made the field-line bundle dominate the entire 3D scene without adding pedagogical value.

### Cascade effects (none expected)

- `arrowTransforms` already uses `curve.getTangent(t)` at `t ∈ {0.2, 0.5, 0.8}` — works on any smooth `CatmullRomCurve3` regardless of control-point count. Arrows reposition automatically.
- The disposal `useEffect` (`for (const g of geometries) g.dispose()`) iterates the geometries array; the new 5-extent count → 10 TubeGeometries → still all disposed.
- Tube triangle budget: was 8 lines × 24 path × 4 radial ≈ 768 triangles. New 10 lines × 24 × 4 = 960 triangles. Negligible.
- Arrow count: was 8 lines × 3 arrows = 24 cones. New 10 × 3 = 30 cones. Still ~30 × 12 ≈ 360 triangles. Negligible.

### Acceptance

1. Field arcs look smoothly elliptical — no more "boxy" or "kite-shaped" outline.
2. With the field toggle on, 5 nested arcs visible above the magnet and 5 below — total 10 lines.
3. Cone arrows along each curve continue to point in the same direction as before (we're not touching arrows in this PR).
4. Toggle off/on still fades the field group correctly.
5. `magnetStrength` opacity scaling still works.
6. The field follows the magnet body during drag, as before.
7. 220 tests still pass.

---

## File touch-list

| File | Change |
|---|---|
| `src/labs/electromagnetic-induction/instruments/FieldLines.tsx` | Rewrite `makeFieldLine` to use 17-point elliptical parameterization. Change `LINE_EXTENTS` from `[0.04, 0.10, 0.20, 0.40]` to `[0.04, 0.08, 0.14, 0.22, 0.32]`. |

1 file modified, 0 new files. ~25 lines net.

## Testing strategy

No new unit tests. The 220-test suite stays as regression gate. Smoke-test (user, after Vercel deploy):

1. Open EM induction lab. Default view: 5 smooth nested elliptical arcs visible above the magnet, and 5 below (10 total). The arcs look like the textbook reference's smooth ellipses, no longer kite-shaped.
2. Toggle "⊟ Поле" → all 10 arcs fade out over ~250 ms.
3. Toggle on → fade in.
4. Drag the magnet → arcs follow with it (unchanged).
5. Switch active magnet (tap short magnet) → its 10 arcs appear, long magnet's fade out.
6. Galvanometer + bulb behaviour unchanged.

## Risks

- **Outer 32 cm shell vs 40 cm**: bringing the ceiling in slightly reduces visual sense of "extent of influence". If the user wants more outward reach, easy follow-up to bump back to `0.40`.
- **17 control points**: low risk of any visual artefact at endpoints. The spline tension is `0.5` (CatmullRom default-ish); the curve passes EXACTLY through each control point, so endpoint precision is guaranteed.
- **No color/opacity tweak**: if smoke-test shows the new lines look "too bright" or "too dim" compared to reference, follow-up is a single constant change (`FIELD_OPACITY` 0.55 → some other value).

## Out of scope

- Compass tool / direction indicator beyond the existing magnet poles.
- Color change to white/gray.
- Pinch-to-zoom or other gesture changes.
- Changes to the EMF physics or galvanometer behaviour.
- New magnet variants.

## Self-review checklist

- [x] Acceptance criteria are concrete (smooth elliptical, 5 nested shells per side, arrows unchanged).
- [x] No "TBD" / "TODO".
- [x] Math at curve endpoints verified explicitly.
- [x] Cascade effects (arrows, dispose, triangle budget) all explicit.
- [x] Single file, single slice — appropriate scope.
- [x] No new tests; rationale stated.
- [x] Out-of-scope items explicit.
