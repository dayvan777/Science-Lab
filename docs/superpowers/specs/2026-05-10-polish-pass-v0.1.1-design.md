# Polish Pass v0.1.1 — Design

**Date:** 2026-05-10
**Status:** Design — pending user review
**Live demo at start of pass:** https://science-lab-phi.vercel.app/

This spec covers an 8-item polish pass driven by user feedback after the v0.1.0 "Gold Standard" release went live on Vercel. The mass-measurement lab is fully functional; this work refines visual reads, fixes a logical flaw in the weight set, and adds two long-requested features (mobile responsive + collapsible HUD panels).

## Goals

1. **Tighten visual reads** on the lever balance and dynamometer so the instruments look like real lab equipment, not procedural geometry.
2. **Fix the weight-set logic flaw** that prevents exact balancing of three objects (5 g and 145 g cannot currently be matched exactly with the available weights).
3. **Make the lab usable on smartphones** in both portrait and landscape orientations.
4. **Let the student hide HUD panels** that get in the way of looking at the 3D scene.

## Non-goals

- Redesigning the 3D scene's overall aesthetic (cinematic dark studio stays).
- Adding new instruments or new objects.
- Changing the 9-task pedagogical flow.
- Translating to languages other than Ukrainian.

---

## 1. Lever-balance pan rims — remove chrome torus rings

**Problem:** Each pan currently has a `<torusGeometry>` ring (PAN_RIM_TUBE = 0.004 m) on top of the truncated-cone bowl. Visually they read as bright chrome circles that distract from the bowl shape and can be misread as separate UI affordances.

**Decision:** **Delete the torus on each pan.** The pan body itself (truncated cone with bright top edge from the bowl mesh) is enough to communicate "round dish, place items here". Without the torus, the pan reads as a solid metal dish, closer to the reference image.

**File:** `src/labs/mass-measurement/instruments/LeverBalance.tsx` — remove the two `<mesh><torusGeometry/>...</mesh>` blocks inside the left and right pan groups. Delete the `PAN_RIM_TUBE` constant.

---

## 2. Lever balance — bigger red indicator + equilibrium reference

**Problem:** The existing red cone arrow at `position={[0, -BEAM_T/2 - 0.05, 0]}` is 6 mm × 70 mm and gets lost. The student has no reference point to know "is the beam level".

**Decision:** Two changes to the indicator system:

**(a) Bigger red needle:**
- Cone size 6 × 70 mm → **10 × 110 mm**
- Color stays `#ff3b30`, emissive intensity bumped to 0.6 (was 0.4) so it pops against the dark scene.
- Stays attached to the beam group (rotates with the beam — that's the whole point: it shows the deviation from vertical).

**(b) Static equilibrium reference on the column:**
- Add a thin vertical white tick mark on the front face of the column, immediately below the pivot, length ~30 mm.
- When the beam is level, the red needle aligns with this tick.
- When the beam tilts, the needle moves left/right of it — student sees the deviation directly.
- Position: front face of column, between pivot and bottom of column.

**Files:**
- `src/labs/mass-measurement/instruments/LeverBalance.tsx` — resize the existing cone, add the static tick on the column.

---

## 3. Dynamometer — analog scale with numbered graduations + needle

**Problem:** Current `dialTexture.ts` likely produces a basic procedural scale (text-only). Student should be able to **read off a value** from a real analog gauge — that's the pedagogy.

**Decision:**

**Scale layout:** Vertical scale, **0 to 5 N**, total height 240 mm (matches existing scale-plate dimensions in `Dynamometer.tsx`).
- **Major graduations every 1.0 N**, with bold tick + label (`0`, `1`, `2`, `3`, `4`, `5`).
- **Medium graduations every 0.5 N**, smaller tick, no label.
- **Minor graduations every 0.1 N**, hairline tick, no label.
- Numbers in white, monospace, large enough to read at table-camera distance.

**Needle:** A red triangular pointer attached to the spring's hook position. As the spring extends under load, the needle slides down the scale and points to the current N value. Student reads the value from where the needle aligns.

Implementation:
- Replace `dialTexture.ts` with a new render that draws the graduated scale.
- The needle is a separate red mesh (small triangle / arrow) positioned at the same y as the hook (`hookY` ref), to the LEFT of the spring (so the spring is visible alongside the indicator).
- Needle width 30 mm, vertical position synced to the hook every frame.

**Files:**
- `src/labs/mass-measurement/textures/dialTexture.ts` — rewrite with proper graduations.
- `src/labs/mass-measurement/instruments/Dynamometer.tsx` — add needle mesh, sync to hook y.

---

## 4. Object tray on the table

**Problem:** Three balls (ping-pong, metal, baseball) currently spawn directly on the table top at z = 0.35 with x = -0.3, 0, +0.3. Visually they look "loose" — like balls left on a table, not part of an organized lab kit.

**Decision:** Add a **wooden tray** with three circular indentations:
- Material: dark walnut (matches the table's `#3a2614`, slightly darker `#2a1c10`) — `meshStandardMaterial`, `metalness=0`, `roughness=0.7`.
- Footprint: 0.85 m × 0.20 m (wide enough for three 14 cm-wide indentations + margin).
- Height: 0.025 m thick.
- Three round indentations (cylindrical depressions), one per ball, scaled to each ball's diameter:
  - Ping-pong: indent radius 0.05 m
  - Metal ball: indent radius 0.055 m
  - Baseball: indent radius 0.085 m
- Indentation depth 0.012 m (visible recess but balls don't fully sink in).
- Position: at the front of the table, z = 0.40 (slightly forward of the previous ball spawn z).

Balls spawn slightly above their indentation centers and settle into them.

**Implementation note on physics:** The tray is a `<RigidBody type="fixed">` with a single CuboidCollider for the body. The indentations are visual-only (the spheres rest on top of the tray with normal physics, the indentation just provides visual nesting). For perfect bowl-fitting we'd need concave colliders (Rapier doesn't support them out of the box for static bodies efficiently); the visual-only approach is acceptable for v0.1.1.

**Files:**
- New: `src/labs/mass-measurement/scene/ObjectTray.tsx`
- Modify: `src/labs/mass-measurement/scene/LabScene.tsx` — mount the tray and update ball spawn positions to sit just above the indentations.

---

## 5. Lever balance highlight — move from base to active pan

**Problem:** When the lever balance is the active instrument, `<Outlines>` outlines the **base block** at the bottom of the column. The student doesn't put objects on the base — they put them on the LEFT pan (object) and the RIGHT pan (counter-weights). The highlight is in the wrong place.

**Decision:**
- **Remove** the `<Outlines>` from the base block.
- **Add** `<Outlines>` to the **left pan body** (the truncated-cone bowl) when the lever-balance task is active AND the student has not yet placed the object on it.
- Once the object is placed (`leftItems.current.length > 0`), the outline disappears.
- Color stays `accent-blue #0a84ff`, thickness 3.

For the right pan (where weights go), no outline by default — the visible row of weights on the table communicates "drag these here". If user feedback wants it later, easy to add a similar outline on the right pan.

**Files:**
- `src/labs/mass-measurement/instruments/LeverBalance.tsx` — move the `<Outlines>` from the base to the left pan body, gate by `active && leftItems.current.length === 0`.

---

## 6. Mobile / smartphone adaptation — portrait + landscape (Variant B)

**Problem:** The lab targets Promethean panels (large landscape touchscreens) but is also intended to run on student smartphones. Current HUD layout breaks on small screens — the left and right glass panels overflow.

**Decision:** **Variant B — full responsive support.** CSS-driven breakpoints. No JS-driven layout switching, no separate mobile component.

**Breakpoints:**
- **Desktop / tablet landscape (≥ 900 px):** current layout (top-left task panel + top-right journal).
- **Tablet portrait / large phone landscape (600–899 px):** panels move to bottom of screen as horizontal "tray". Journal becomes a tabbable section. Camera controls move to top-right corner.
- **Phone portrait (< 600 px):** single bottom drawer with current task; journal accessed via a bottom-tab "Журнал". Pull-up gesture to expand.

**Implementation strategy:**
- Add a `useViewport()` hook in `src/sdk/a11y/useViewport.ts` returning `{ width, height, breakpoint }` (`'desktop' | 'tablet' | 'phone'`).
- HUD reads breakpoint and renders different layouts. The data source is the same (`useLabState`, `useReadings`, etc.) — only the visual arrangement changes.
- Touch targets stay ≥ 44×44 px on every breakpoint.
- 3D canvas always full-screen. Camera FOV unchanged (lab equipment scales with viewport).

**Files:**
- New: `src/sdk/a11y/useViewport.ts`
- Modify: `src/labs/mass-measurement/ui/HUD.tsx` — three layouts gated by breakpoint.

---

## 7. Collapsible HUD panels — collapse to pill (Variant A)

**Problem:** On smaller screens (and even on landscape when student wants a clear view of the 3D scene), the two HUD panels obstruct the view. No way to dismiss them.

**Decision:** **Variant A — collapse-to-corner-pill button.**

- Each glass panel gets a small `‹‹` (collapse) button in its top-right corner (or top-left for the right panel — points outward).
- Click the button → panel animates (250 ms) to a tiny pill in the same corner showing only an icon (📋 for journal, 📝 for current task) and the panel's title in `<sr-only>`.
- Click the pill → expands back to full panel.
- State persisted to `localStorage` (`hud.taskPanel.collapsed`, `hud.journalPanel.collapsed`).
- On phone breakpoint (< 600 px), panels start collapsed by default.

**Files:**
- New: `src/sdk/ui/CollapsibleGlassPanel.tsx` — wraps `<GlassPanel>` with collapse button + state.
- Modify: `src/labs/mass-measurement/ui/HUD.tsx` — replace the two main panels with `<CollapsibleGlassPanel>`.

---

## 8. Complete weight set — exact balancing for all three objects

**Problem:** Current set is `1кг, 500г, 200г, 100г, 50г, 20г, 10г` (7 weights). Cannot exactly balance:
- **Ping-pong (5 g):** smallest weight is 10 g. Student cannot ever balance it.
- **Baseball (145 g):** closest reachable values are 140 g (100 + 20 + 10 + 10 — but only one 10 g exists, so unreachable) or 150 g (100 + 50 — overshoots by 5 g).

This breaks the lab's pedagogy: the whole point is "three methods, one mass". If the lever-balance method can't yield 145 g exactly, the conclusion is undermined.

**Decision:** Adopt the **standard school weight kit**: 11 weights covering 1–1880 g in 1 g increments.

| Mass | Quantity | Total |
|---|---|---|
| 1000 g | 1 | 1000 g |
| 500 g | 1 | 500 g |
| 200 g | 1 | 200 g |
| 100 g | 1 | 100 g |
| 50 g | 1 | 50 g |
| 20 g | **2** | 40 g |
| 10 g | 1 | 10 g |
| 5 g | 1 | 5 g |
| 2 g | 1 | 2 g |
| 1 g | 1 | 1 g |
| **Total** | **11** | **1908 g** |

**Verification — exact balance is now possible for all three objects:**
- Ping-pong (5 g): `5 g` ✓
- Baseball (145 g): `100 + 20 + 20 + 5 = 145 g` ✓
- Metal ball (250 g): `200 + 50 = 250 g` ✓ (already worked)

**Layout adjustment:** 11 weights along z-axis at x = 1.05 with spacing 0.09 m → total span 0.90 m, fits within table z-range [-0.45, +0.45]. Two duplicate 20 g weights need unique `bodyId` tags (`weight-20 г / 20 г A` and `weight-20 г / 20 г B`); their visual labels can both show "20 г".

**Files:**
- `src/labs/mass-measurement/objects/Weights.tsx` — extend the WEIGHTS array with the four new entries; ensure unique bodyId for duplicates; reduce spacing to 0.09 m.
- `src/labs/mass-measurement/scene/LabScene.tsx` — pass `spacing={0.09}` to `<Weights>`.

---

## Phasing

Sized for a single afternoon-evening pass:

| Slice | Items | Time |
|---|---|---|
| **A** Visual fixes (no architecture change) | 1, 2, 5, 8 | 1.5 h |
| **B** Analog dial + needle | 3 | 1.5 h |
| **C** Object tray | 4 | 1 h |
| **D** Mobile responsive | 6 | 2.5 h |
| **E** Collapsible panels | 7 | 1.5 h |
| **Verification + commit + push** |  | 0.5 h |
| **Total estimate** |  | **~8.5 h** |

Slices A through C ship first (most visual impact, lowest risk). D and E together complete the v0.1.1 release.

## Out of scope

- Custom CC0 sound assets (still placeholders).
- Friction lab (still v1.1).
- Backend journal storage.
- i18n / multi-language UI.
- Real Promethean panel testing.

## Open questions

None — every item has a decided implementation path.
