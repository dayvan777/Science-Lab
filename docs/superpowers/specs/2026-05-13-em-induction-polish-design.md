# EM Induction Lab — Polish Pass Design

**Date:** 2026-05-13
**Status:** Approved (user accepted perf targets + wires proposal)
**Scope:** Performance optimization + visible circuit wires for the freshly-shipped electromagnetic induction lab. Single polish slice — one atomic commit. No new features, no SDK changes, no platform changes.

---

## Goal

Address two real complaints from the user's live smoke-test of `/physics/em-induction`:

1. **Performance:** "лагает очень сильно" — significant frame-rate drops on the live deployment. Four specific bottlenecks identified by code reading (not guesswork).
2. **Visual gap:** the reference photos show all three instruments (coil, galvanometer, bulb) connected by visible copper wires forming a closed circuit. The current implementation has them standing as disconnected objects on the table.

Target acceptance: **60 FPS on desktop, 30 FPS on iPhone 14**. Wires: 3 `TubeGeometry` curves forming a closed loop, decorative only (no physics).

## Non-goals

- No new lab content, scenes, or instruments.
- No SDK changes — all edits are lab-local under `src/labs/electromagnetic-induction/`.
- No state machine changes — `LabState`, `InductionReadings`, `SceneController`'s motion-trigger logic, and `HUD.tsx` all stay untouched (except the perf-related selector swap on the two consumer instruments).
- No test changes. The 13 physics tests stay green.
- No animated current-flow particles in the wires — they're static decorations.
- No new dependencies.

---

## Performance fixes (4 specific bottlenecks)

### 1. Coil geometry — 8192 → ~1152 triangles

**File:** `src/labs/electromagnetic-induction/instruments/Coil.tsx`

Current `buildCoilGeometry()`:

```ts
const SEGMENTS = 256
// ... loop builds 256 points
return new TubeGeometry(curve, SEGMENTS * 2, COIL_TUBE_RADIUS, 8, false)
//                            ^^^^^^^^^^^^^^                  ^
//                            512 path segments               8 radial segments
//                                                          = 8192 face triangles
```

**Change:**

```ts
const SEGMENTS = 96   // was 256
// loop unchanged in logic
return new TubeGeometry(curve, SEGMENTS * 2, COIL_TUBE_RADIUS, 6, false)
//                            192 path × 6 radial = 1152 face triangles
```

Visual quality is preserved at 16 turns: the helix's curve is dominated by the macro shape, not by tube smoothness at 6 vs 8 sides. The 7× geometry reduction translates directly to less rasterization, fewer shadow-map writes (if shadows are kept), and faster culling.

Side fix in the same file: remove `castShadow` from the coil's `<mesh>` (shadow from a wireframe-helical mesh looks artefactual and the cost is non-trivial). Keep nothing for shadows — the table receives shadows from the magnet+bulb which is what the eye actually notices.

### 2. Zustand selector → `getState()` in useFrame

**Files:**
- `src/labs/electromagnetic-induction/instruments/Galvanometer.tsx`
- `src/labs/electromagnetic-induction/instruments/Bulb.tsx`

Current pattern in `Galvanometer.tsx:23`:

```ts
const targetAngle = useInductionReadings(s => s.galvanometerAngle)
```

This is a Zustand selector subscription. Every time `setReadings(...)` fires in `LabScene.SceneController`'s `useFrame` (60Hz), `galvanometerAngle` changes, and the Galvanometer component re-renders. Same problem for `Bulb.tsx` reading `bulbBrightness`.

That's **120 React reconciliations per second** for two components that only need the value inside their own `useFrame`. Pure waste.

**Change:** drop the selectors at component-body level. Inside the existing `useFrame` callback, read via `useInductionReadings.getState().galvanometerAngle` (and `.bulbBrightness` for Bulb). The component renders once at mount and never again unless props change. Material refs + light intensity assignments still happen every frame — that's the right place.

This pattern is already used in the mass-measurement lab's `LeverBalance.tsx` (material refs for the red/green cone) — it's the project's established pattern for sub-frame updates without re-renders.

### 3. Hoist `Vector3` allocations out of useFrame

**Files:**
- `src/labs/electromagnetic-induction/scene/LabScene.tsx` (the `SceneController` inner component)
- `src/labs/electromagnetic-induction/physics/induction.ts`

Current in `LabScene.tsx`:

```ts
useFrame(({ clock }) => {
  const body = findBodyByTag('bar-magnet')
  if (!body) return
  const t = body.translation()
  const v = body.linvel()
  const pos = new Vector3(t.x, t.y, t.z)     // allocation 1
  const vel = new Vector3(v.x, v.y, v.z)     // allocation 2
  const emf = computeEMF(pos, vel)
  // ...
})
```

And inside `induction.ts`'s `computeEMF`:

```ts
const offset = new Vector3().subVectors(magnetPos, COIL_CENTER)   // allocation 3
```

Three new `Vector3`s per frame × 60Hz = 180 allocs/sec → JS GC pressure → micro-stutters every few seconds when V8 garbage collects.

**Change:** hoist scratch `Vector3` instances to module-level in `LabScene.tsx` and `induction.ts`. Reuse via `.set(x, y, z)`:

```ts
// LabScene.tsx — module level
const _scratchPos = new Vector3()
const _scratchVel = new Vector3()

// inside useFrame
_scratchPos.set(t.x, t.y, t.z)
_scratchVel.set(v.x, v.y, v.z)
const emf = computeEMF(_scratchPos, _scratchVel)
```

```ts
// induction.ts — module level (kept private to this module)
const _scratchOffset = new Vector3()

export function computeEMF(magnetPos: Vector3, magnetVel: Vector3): number {
  _scratchOffset.subVectors(magnetPos, COIL_CENTER)
  const distance = _scratchOffset.length()
  // rest of function uses _scratchOffset reads (length, dot)
  // ...
}
```

Allocations: 180/sec → 0. GC pressure drops to background-only.

### 4. (Already covered in #1) Remove `castShadow` from coil

Already described above. Listed as separate item because it's a distinct optimisation pass — shadow map writes are skipped entirely for the helix.

---

## Visible circuit wires

**File:** `src/labs/electromagnetic-induction/instruments/Wires.tsx` (NEW)
Mounted in `LabScene.tsx` alongside the other instruments.

Three decorative `TubeGeometry` curves forming a closed circuit:

| # | From | To | Colour | Purpose |
|---|---|---|---|---|
| 1 | Coil right end (world ≈ x = -0.05+, z = +0.06) | Galvanometer left terminal (world ≈ x = 0.21, z = +0.03) | Red `#cc4030` insulation | Coil → galvanometer |
| 2 | Galvanometer right terminal (≈ x = 0.34, z = +0.03) | Bulb base (≈ x = 0.55, y = 0.86, z = 0) | Red `#cc4030` insulation | Galvanometer → bulb |
| 3 | Bulb base (other side ≈ x = 0.55, y = 0.86, z = -0.01) | Coil left end (world ≈ x = -0.05, z = -0.06) | Blue `#3060cc` insulation | Bulb → back to coil (return path) |

Each wire is a `CatmullRomCurve3` of ~6 control points giving a gentle drape (slightly hanging mid-curve, ends terminating at the connection points). `TubeGeometry` parameters: ~32 path segments × 6 radial = 192 triangles per wire × 3 = **~576 triangles total** for the whole circuit — negligible cost.

Material: `meshStandardMaterial` with `metalness: 0.2, roughness: 0.5` to read as plastic-insulated copper rather than bare metal. Colour matches the schematic convention (red = positive, blue = negative).

### Wire path construction

`Wires.tsx` accepts the three world endpoints as props and builds the three TubeGeometries via `useMemo`. The mid-control points are computed by:

1. Compute midpoint `M = (start + end) / 2`.
2. Add a downward sag offset `y_sag = -|end - start| * 0.15` (15% of horizontal distance, droops down due to gravity-look).
3. Add 1–2 additional intermediate points slightly above/below the straight line for natural curve.

The curves don't intersect any of the instruments — they pass in front of the table top, anchored at the visible terminals.

```tsx
// Pseudocode for one wire's curve
function makeWireCurve(start: Vector3, end: Vector3): CatmullRomCurve3 {
  const mid = new Vector3().addVectors(start, end).multiplyScalar(0.5)
  const dist = start.distanceTo(end)
  mid.y -= dist * 0.15  // gentle drape
  // small lateral nudge so the curve doesn't intersect the table edge
  const quarter1 = new Vector3().lerpVectors(start, mid, 0.5).add(new Vector3(0, -dist * 0.05, 0))
  const quarter2 = new Vector3().lerpVectors(mid, end, 0.5).add(new Vector3(0, -dist * 0.05, 0))
  return new CatmullRomCurve3([start, quarter1, mid, quarter2, end], false, 'catmullrom', 0.5)
}
```

`TubeGeometry` is built once per wire in `useMemo` keyed on the endpoints. Disposed on unmount via `useEffect` cleanup (same pattern as the coil's geometry).

---

## File touch-list

| File | Change |
|---|---|
| `src/labs/electromagnetic-induction/instruments/Coil.tsx` | SEGMENTS 256→96, radial 8→6, drop `castShadow` |
| `src/labs/electromagnetic-induction/instruments/Galvanometer.tsx` | Replace `useInductionReadings(s => ...)` selector with `useInductionReadings.getState()` inside `useFrame` |
| `src/labs/electromagnetic-induction/instruments/Bulb.tsx` | Same selector→getState swap for `bulbBrightness` |
| `src/labs/electromagnetic-induction/instruments/Wires.tsx` | NEW — 3 wire curves |
| `src/labs/electromagnetic-induction/scene/LabScene.tsx` | Mount `<Wires />`, hoist `_scratchPos`/`_scratchVel` Vector3s to module level |
| `src/labs/electromagnetic-induction/physics/induction.ts` | Hoist `_scratchOffset` Vector3 to module level |

No tests change. No other files touched.

---

## Acceptance criteria

1. Open `/physics/em-induction` on desktop (1440×900, Chrome 120+) and complete Scene 1 → Scene 5 → Reveal. **Visual frame rate ≥ 60 FPS** through every scene (verified via the browser's built-in FPS meter or `requestAnimationFrame` deltas in DevTools).
2. Same flow on iPhone 14 portrait (393×852, mobile Safari): **frame rate ≥ 30 FPS** through every scene. The magnet drag responds to touch without dropping below this threshold.
3. Coil geometry is visually intact — the 16-turn helix reads as a tightly-wound copper solenoid; no obvious faceting.
4. Three wires are visible in the scene, forming a closed circuit Coil→Galvanometer→Bulb→Coil. Wires drape naturally (gentle catenary curve), not stick-straight.
5. Wire colors match the schematic: 2 red (Coil↔Galvanometer↔Bulb) and 1 blue (Bulb back to Coil) insulation. Materials read as plastic-insulated copper, not bare wire.
6. Wires don't visually intersect any of the three instruments or the magnet's drag path.
7. The galvanometer needle and bulb brightness still respond to magnet motion in real time — no regression from the perf fixes.
8. Existing tests stay at 138/138 green. `npx tsc --noEmit` clean. `npm run build` clean.

---

## Risks

- **Selector→getState swap could mask future bugs:** if a future contributor adds a piece of state to `InductionReadings` that genuinely needs to drive a re-render (e.g. a "scene complete" flag), they need to remember to use a selector for that field specifically. Mitigation: a clear comment in `Galvanometer.tsx` and `Bulb.tsx` explaining the intentional pattern, pointing at `LabState` as the correct place for state that drives re-renders.

- **TubeGeometry on a tightly-curved path:** if the wire curves are too tight (small radius bends), the `TubeGeometry` will self-intersect and look broken. The 0.15× sag factor was chosen to keep curves gentle; if the endpoint geometry changes later, the sag factor may need re-tuning. Acceptance criterion 6 catches this.

- **Vector3 hoisting + concurrent useFrame callers:** `_scratchPos` is shared across the SceneController's frame loop. If anything else mutates `_scratchPos` concurrently (other useFrame in the same component tree), reads will be corrupted. Currently the SceneController is the only consumer in the lab — but a hostile future change could break this. Mitigation: scope the scratch Vector3s to function-level closure (not module-level) — they're created once via `useMemo` and reused. This is slightly less efficient than true module-level but safer; the spec prefers this pattern.

  Actually, simplest: declare `_scratchPos` and `_scratchVel` inside `SceneController` via `useRef` so they're tied to the component instance and impossible to mutate from elsewhere. Same effect, scoped correctly.

  **Updated pattern (use this in the implementation):**

  ```tsx
  function SceneController() {
    const scratchPos = useRef(new Vector3())
    const scratchVel = useRef(new Vector3())
    // ... useFrame uses scratchPos.current.set(...) and scratchVel.current.set(...)
  }
  ```

  For `induction.ts`'s `_scratchOffset`, module-level is fine — it's a pure function called from one place per frame.

## Out of scope

- Reducing the bloom post-FX intensity or disabling it — same effect runs on mass-measurement without complaint.
- Throttling `setReadings` to 30Hz on mobile — the Zustand fix already removes the React-render cost, so this is overkill.
- Adding a fourth "neutral" wire or a battery icon. The closed loop with 2 red + 1 blue matches the standard schoolbook diagram.
- Insulation gloss / specular highlights on wires — the spec calls for plain `meshStandardMaterial`, photoreal copper-with-insulation isn't required.
- Animating the wires (sway, vibration) — purely static decoration.

---

## Self-review checklist

- [x] Every spec section has corresponding acceptance criteria.
- [x] Performance bottlenecks are each tied to a specific file:line and a measurable change.
- [x] Wire geometry is specified concretely (endpoint coords, curve construction, triangle count).
- [x] No "TBD" / "TODO" / placeholder text.
- [x] Single-spec scope — fits one polish slice, one atomic commit.
- [x] No ambiguous requirements — every fix has a numeric target or a code snippet showing the change.
- [x] Vector3 hoisting risk addressed inline (use `useRef` not module-level for `SceneController`-scoped scratch values).
