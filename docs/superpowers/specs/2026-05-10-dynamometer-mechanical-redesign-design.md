# Dynamometer — Mechanical Pointer + Dual Scale Redesign

**Date:** 2026-05-10
**Status:** Approved (final revision on the mass-measurement lab v0.1)
**Scope:** Single-instrument visual + mechanical redesign of `Dynamometer.tsx`. No state, content, or step-engine contract changes.

---

## Goal

Replace the dynamometer's current "abstract" needle (a separate triangular mesh on the scale plate) with a **physically attached mechanical pointer** that moves with the spring's bottom — the way a real classroom dynamometer works. Provide **two scale ranges** (0–1 N and 0–5 N) so all three lab objects (5 g / 145 g / 250 g) yield a readable measurement. Make the device **1.5 × taller** so the dual scale fits with comfortable spacing.

This is the final visual revision on the mass-measurement lab; after this the dynamometer "looks and reads like the photo in the textbook."

## Non-goals

- No physics changes. Spring stiffness `SPRING_K = 50` stays.
- No HUD or step-engine changes. `dynamometerNewtons` reading is computed exactly as today.
- No new tests. The change is visual; existing physics/animation tests still cover behaviour.
- No effect on the other two instruments (digital scale, lever balance).

---

## Reference

Real-world classroom spring dynamometer:

- Fixed top mount on a vertical column.
- Helical spring suspended from the mount.
- A rigid horizontal pointer attached to the spring's bottom coil — a thin metal arm extending sideways with a sharp red tip.
- A vertical scale strip mounted alongside the spring (parallel to it) that the pointer's tip sweeps across.
- A thin rigid rod continues *below* the pointer down to the hook, which hangs *below* the scale.
- Two-range models: two scale strips printed side by side on a single backplate, sharing the same physical pointer travel — one strip uses fine gradations for the low-force range, the other coarse gradations for the high-force range.

The current sim has the pointer floating against a single 0–5 N plate and the hook is *above* the scale plate, both unlike a real instrument.

---

## Architecture

### Geometry (lever-local coords, all in metres)

| Constant | Old | New | Notes |
|---|---|---|---|
| `STAND_H` | 0.40 | **0.60** | column + base height (× 1.5) |
| `SPRING_TOP_Y` | 0.40 | **0.55** | spring's fixed top — small offset below the top cap |
| `HOOK_REST_Y` | 0.20 | **0.35** | hook's at-rest y; spring natural length stays 0.20 m |
| `HOOK_AT_FIVE_N` | 0.10 | **0.25** | hook position at full 5 N load (extension 0.10 m) |
| `BACKPLATE_TOP_Y` | — | **0.35** | aligns with the "0 N" tick (= rest hook y) |
| `BACKPLATE_BOTTOM_Y` | — | **0.25** | aligns with "5 N" / "1 N" full-scale tick |
| `BACKPLATE_HEIGHT` | — | **0.10** | = `BACKPLATE_TOP_Y − BACKPLATE_BOTTOM_Y` |
| `POINTER_ARM_LEN` | — | **0.05** | horizontal arm from spring's bottom to scale tip |
| `ROD_BELOW_POINTER_LEN` | — | **0.13** | thin rod from pointer down to hook |

Spring physics is unchanged — extension 0.0–0.10 m corresponds to 0–5 N at `SPRING_K=50`.

### Backplate (the dual scale)

A single flat plane behind the spring, `0.10 m` tall × `~0.10 m` wide, with one canvas texture rendering both scale strips:

```
canvas (256 × 512 px), origin at top-left:

┌─────────────┬─────────────┐
│   1 N MAX   │   5 N MAX   │
├─────────────┼─────────────┤
│ 0 ╶─────    │ 0 ╶─────    │   y_top  → "0" on both
│   │         │   │         │
│ 0.5 ╶───    │ 1 ╶─────    │
│   │         │ 2 ╶─────    │
│   │         │ 3 ╶─────    │
│   │         │ 4 ╶─────    │
│ 1.0 ╶───    │ 5 ╶─────    │   y_bot  → "1" on left, "5" on right
└─────────────┴─────────────┘
```

**Left strip (0–1 N):**
- Major ticks every 0.5 N (labels: 0, 0.5, 1)
- Medium ticks every 0.1 N
- Minor ticks every 0.05 N
- Spans the full 0.10 m physical height (so 1 N maps to the whole strip)

**Right strip (0–5 N):**
- Major ticks every 1 N (labels: 0, 1, 2, 3, 4, 5)
- Medium ticks every 0.5 N
- Minor ticks every 0.1 N
- Spans the full 0.10 m physical height (so 5 N maps to the whole strip)

Both strips share the same `y → force` calibration:
- `y_top` (top of plate) = "0 N" on both
- `y_bot` (bottom of plate) = "1 N" on left strip = "5 N" on right strip

This means at any physical pointer position the two strips are simultaneously consistent — left reads `f * 1` if extension fraction is `f * (1/1)`; right reads `f * 5` if extension fraction is `f * (1/5)`. Any pointer in the top fifth of the plate is readable on **both** strips and they agree.

A pointer below the top fifth has gone past the left strip's "1 N" mark — visually clear that the load exceeds the left strip's range, the student switches to the right strip.

### Mechanical pointer

A `<group>` whose y-position tracks the spring's bottom (the existing `hookY` state, since hook = spring bottom in the current model):

1. **Horizontal arm**: thin metal `boxGeometry` `0.05 × 0.003 × 0.005`, attached at the spring's bottom, extending toward the scale (negative x direction). Material: `meshStandardMaterial color="#9aa0a8" metalness=0.7 roughness=0.35`.
2. **Red triangular tip**: `coneGeometry args=[0.005, 0.014, 3]` rotated `-π/2` around z so the apex points along +x toward the scale. Positioned at the LEFT end of the arm, with the tip's apex at the scale's left edge. Material: `meshStandardMaterial color="#ff3b30" emissive="#ff3b30" emissiveIntensity=0.7 toneMapped=false` — same red palette as the lever-balance arrow.
3. **Rod below**: thin `cylinderGeometry` `R=0.0015, length=ROD_BELOW_POINTER_LEN`, between the pointer arm's bottom and the hook. Same material as the arm. This is what the user actually grabs visually to "pull the spring down" — but the existing drag-target stays on the hook itself.

Whole group's y-position = `hookY` (in lever-local). At rest: pointer at scale's "0" line. Under 5 N: pointer at scale's "5" line.

### Hook

The hook itself moves further down (y_world = position[1] + hookY − ROD_BELOW_POINTER_LEN ≈ 0.85 + 0.35 − 0.13 = 1.07 at rest, vs current 1.05). World snap-target position (`dynamometer-hook` in `TARGET_POSITIONS`) recomputed for the new geometry.

### Camera

The dynamometer is now ~0.20 m taller. Verify it still fits the existing camera presets (`focus-dyn` etc.) without re-framing. If the top of the spring goes outside the camera's frame, the camera preset's offset gets nudged.

---

## File touch-list

| File | Change |
|---|---|
| `src/labs/mass-measurement/instruments/Dynamometer.tsx` | scale all geometry constants × 1.5; replace single scale plate + cone needle with dual-scale backplate + mechanical pointer group; rewire `hookY` → pointer-group y; ensure hook still hangs from `hookY` minus rod offset |
| `src/labs/mass-measurement/textures/dialTexture.ts` | full rewrite for 2-column layout, 256 × 512 canvas |
| `src/sdk/guided/GuidedOverlay.tsx` | recompute `TARGET_POSITIONS['dynamometer-hook']` for new world y of the hook (≈ 1.07) |
| `src/sdk/scene/cameraStore.ts` *(or wherever `focus-dyn` is defined)* | nudge offset/zoom of the dynamometer camera preset if needed (likely small Y bump) |

No state files change. No step-engine changes. No new tests required.

---

## Acceptance criteria

1. The pointer is rigidly attached to the spring — moves with `hookY` per frame.
2. At rest (no load): pointer's red tip aligns with the "0" mark on **both** scale strips.
3. At 5 N (full extension): pointer aligns with "5" on the right strip; below the bottom of the left strip's reading area.
4. At 1 N: pointer aligns with "1" on the left strip AND "1" on the right strip (top fifth of right strip).
5. The hook hangs *below* the scale plate, attached via a thin visible rod from the pointer.
6. The dynamometer fits in the existing focus camera preset without clipping.
7. Existing tests stay green: `npx vitest run` reports all 183 tests passing.
8. `npx tsc --noEmit` clean. `npm run build` clean.

---

## Risks

- **Spring + pointer alignment** — the pointer needs to be at the spring's actual bottom each frame; with the current spring rendering using `springYCenter` and `currentSpringLen`, the bottom is at `springYCenter − currentSpringLen / 2`. Need to use that exact value (or just `hookY`, which the existing physics maintains as the spring's bottom-coil y). Trivially correct.
- **Camera framing** — the +0.20 m height bump may push the spring top out of the `focus-dyn` preset's frame. If so, the preset's target-y shifts up by ~0.10 m. Quick visual check during execution.
- **Texture readability** — at 0.10 m of physical height with two columns sharing the canvas, the major-tick labels need to be ≥ 18 px in the texture (otherwise they alias on a 256 × 512 source rendered onto a small physical plane). Acceptance criterion (4) catches this.

## Out of scope

- Animating the spring's coil count to match extension (already in `useMemo` rebuild — fine).
- Adding labels like "1 N MAX" / "5 N MAX" in additional 3D Text geometries (the canvas labels in the texture suffice).
- Switching to a single-pointer-multi-scale where each scale has its own physical pointer (overkill).
- Changing the lab's tasks/objects.

---

## Self-review checklist

- [x] Every spec item has an acceptance criterion mapped to it
- [x] No "TBD" or "TODO" anywhere
- [x] No internal contradictions (height bumps, y-coords, and acceptance points all consistent)
- [x] Single-spec scope (one instrument file + one texture file + small wiring updates) — fits one implementation plan
- [x] No ambiguous requirements (every constant has a numeric value; every position has a formula)
