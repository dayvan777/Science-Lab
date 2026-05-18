# EM Induction Final Polish — Design

**Date:** 2026-05-17
**Status:** Approved-in-concept (user said "гоу" after design proposal)
**Scope:** Three final polish items so the EM induction lab is finished:
1. Add a SECOND magnet (short 9 cm) on the table alongside the existing long one (18 cm). Only one magnet is "active" at a time; tapping or dragging a magnet selects it.
2. Remove the background clutter spool + spare magnet (they read as "another coil" and "another magnet" — confusing).
3. Re-anchor the galvanometer needle: pivot at the TOP of the dial face, needle hangs down, tip swings at the bottom (clock-pendulum style).

User explicitly asked for final polish — this PR closes out the EM induction lab work.

## Background

Live URL `science-lab-phi.vercel.app` is current with all prior merges (Phase 3 + Touch+Responsive + Mobile-v2 + field-lines + coil-physics + Polish v3 + Focus Nav). User tested on iPhone and reported three remaining issues via screenshot:

- "Хочу иметь два магнита: первый длиннее, второй обычного размера, чтобы можно было использовать оба." → wants to compare magnets.
- "Задний фон, там катушка и магнит — нужно убрать." → background decoration (spool + spare-magnet) reads as duplicate equipment, removes it.
- "Стрелочка на гальванометре должна быть закреплена в одной точке сверху" → wants the needle anchored at the TOP of the face, currently it appears to rotate around its middle.

## Non-goals

- No new instruments.
- No new tests. The 220-test suite stays as regression gate.
- No third magnet variant. Two is enough.
- No notebook removal (user only mentioned coil + magnet decorations).
- No physics-formula changes. computeEMF stays the same — only the BODY it reads from changes (active magnet).
- No additional camera presets. Existing `focus-magnet` preset covers both magnets (both sit in the same general area of the table).
- No magnet swap animation. Field lines fade in/out via the existing FieldLines fade animation.

## Architecture

Four independent slices in one PR. Branch `feat/em-induction-final-polish` from `master` at commit `036087c`.

| Slice | File(s) | Net diff |
|---|---|---|
| A. Two magnets + activeMagnet state | `BarMagnet.tsx`, `LabSettingsState.ts`, `LabScene.tsx` | ~40 lines |
| B. Remove background spool + spare-magnet | `LabClutter.tsx`, `LabScene.tsx` | ~20 lines (deletes) |
| C. Galvanometer needle pivot at TOP | `Galvanometer.tsx` | ~15 lines |
| D. Wire active magnet to FieldLines + computeEMF | `LabScene.tsx`, `FieldLines.tsx` | ~25 lines |

Total ~100 lines net across 5 files. No new files.

---

## Slice A — Two magnets + activeMagnet state

### Problem

Currently `BarMagnet.tsx` exports a single magnet with hard-coded `MAGNET_HALF_LENGTH = 0.09` (18 cm). The user wants two magnets — a long one (existing 18 cm) and a short one (9 cm). Only one should be "active" (drives EMF + shows field lines) at any moment.

### Fix — three changes

**A.1 — Extend `LabSettingsState.ts`** with `activeMagnet` field:

```ts
export type ActiveMagnet = 'long' | 'short'

type LabSettings = {
  fieldVisible: boolean
  coilTurns: CoilTurns
  magnetStrength: MagnetStrength
  activeMagnet: ActiveMagnet
  setFieldVisible: (v: boolean) => void
  cycleCoilTurns: () => void
  cycleMagnetStrength: () => void
  setActiveMagnet: (m: ActiveMagnet) => void
}
```

Default `activeMagnet: 'long'` (matches existing behaviour where the single magnet is the long one). Persisted via the existing `zustand/middleware persist`.

**A.2 — Generalize `BarMagnet.tsx`** to accept props instead of hard-coded constants:

```tsx
type Props = {
  position: [number, number, number]
  enabled?: boolean
  halfLength: number              // 0.09 (long) or 0.045 (short)
  bodyId: string                  // 'bar-magnet-long' or 'bar-magnet-short'
  magnetSize: ActiveMagnet        // dispatched to setActiveMagnet on interaction
}
```

The `BAR_MAGNET_BODY_ID` constant is removed (replaced by per-mount IDs).
`MAGNET_HALF_LENGTH` becomes `LONG_MAGNET_HALF_LENGTH = 0.09` + new `SHORT_MAGNET_HALF_LENGTH = 0.045`.
`CORRIDOR_HALF_LENGTH` becomes a function `corridorHalfLength(magnetHalfLength: number)` since the corridor depends on the specific magnet's length.

`onTap` of each magnet sets `setActiveMagnet(props.magnetSize)` AND `setFocusTarget('magnet')`.

**A.3 — `LabScene.tsx`** mounts two BarMagnets:

```tsx
<BarMagnet
  position={[-0.40, 0.94, 0.30]}     // existing tray position
  halfLength={LONG_MAGNET_HALF_LENGTH}
  bodyId="bar-magnet-long"
  magnetSize="long"
  enabled={phase === 'in-progress'}
/>
<BarMagnet
  position={[-0.40, 0.94, 0.50]}     // 4cm behind long magnet
  halfLength={SHORT_MAGNET_HALF_LENGTH}
  bodyId="bar-magnet-short"
  magnetSize="short"
  enabled={phase === 'in-progress'}
/>
```

Both share the same drag-corridor center (COIL_CENTER) but with different `halfLength` arguments so the corridor activation scales per magnet.

### Acceptance

1. Two magnets visible on table — long (18 cm) at z=0.30, short (9 cm) at z=0.50.
2. Tap either → it becomes active; `useLabSettings.activeMagnet` updates.
3. Drag either → drag works; tap-vs-drag still works per Focus Nav PR.
4. State persists across reload (zustand persist).

---

## Slice B — Remove background spool + spare-magnet

### Problem

`LabClutter.tsx` renders three decorative objects: notebook, spool (small coil-like prop), spare-magnet (bar-magnet-shaped prop). User reports the spool + spare-magnet read as "another coil and another magnet" — confusing because they look like duplicate equipment but aren't interactable.

### Fix — two files

**B.1 — `LabClutter.tsx`** drops the spool and spare-magnet mesh definitions. Props for them are removed from the component's Props type. Only the notebook remains:

```tsx
type Props = {
  notebookWorld: [number, number, number]
  // spoolWorld + spareMagnetWorld REMOVED
}

export function LabClutter({ notebookWorld }: Props) {
  return (
    <>
      {/* notebook only — existing mesh */}
    </>
  )
}
```

**B.2 — `LabScene.tsx`** removes the `SPOOL_WORLD` and `SPARE_MAGNET_WORLD` constants and the corresponding props from the `<LabClutter>` element:

```tsx
// Before:
<LabClutter
  notebookWorld={NOTEBOOK_WORLD}
  spoolWorld={SPOOL_WORLD}
  spareMagnetWorld={SPARE_MAGNET_WORLD}
/>

// After:
<LabClutter notebookWorld={NOTEBOOK_WORLD} />
```

### Acceptance

1. Background no longer shows a small coil-shaped prop or a magnet-shaped prop.
2. Notebook still visible (user didn't ask for it to be removed).
3. Mass-measurement lab unaffected (LabClutter is EM-induction-specific).

---

## Slice C — Galvanometer needle pivot at TOP

### Problem

`NEEDLE_PIVOT_Y_LOCAL = -FACE_H/2 + 0.005` (≈ -0.060) places the pivot near the BOTTOM of the dial face. With the needle mesh centered at its local origin, the visible needle appears to rotate around its middle (or near its lower end). User wants the needle anchored at a single point at the TOP of the face, swinging like a clock pendulum.

### Fix — two changes in `Galvanometer.tsx`

**C.1 — Move pivot to TOP**: change `NEEDLE_PIVOT_Y_LOCAL` from `-FACE_H/2 + 0.005` to `+FACE_H/2 - 0.005` (≈ +0.060). Add a clarifying comment.

**C.2 — Restructure needle JSX** so rotation happens around the pivot point with the needle hanging DOWN:

```tsx
// Wrap the needle mesh in a group positioned at the pivot.
// Rotation goes on the GROUP; needle mesh inside is offset DOWN by NEEDLE_LEN/2
// so its TOP aligns with the group origin (the pivot point).
<group
  position={[0, NEEDLE_PIVOT_Y_LOCAL, FACE_DEPTH_OFFSET]}
  ref={needleRef}
>
  <mesh position={[0, -NEEDLE_LEN / 2, 0]}>
    <boxGeometry args={[NEEDLE_WIDTH, NEEDLE_LEN, NEEDLE_DEPTH]} />
    <meshStandardMaterial color="#1a1a1a" metalness={0.7} roughness={0.3} />
  </mesh>
  {/* tiny pivot dot at the group origin (the pivot point itself) */}
  <mesh>
    <sphereGeometry args={[NEEDLE_WIDTH * 1.2, 8, 8]} />
    <meshStandardMaterial color="#0a0a0a" metalness={0.8} roughness={0.2} />
  </mesh>
</group>
```

`needleRef` now points at the group (used to apply `rotation.z = displayedAngle` in `useFrame`). The needle mesh sits below the group origin so its TOP coincides with the pivot point. The small sphere marks the pivot visually.

The existing `useFrame` setting `needleRef.current.rotation.z = displayedAngle` still works — Three.js rotates the group around its origin (the pivot point).

Note: the rotation sign or direction may need to flip since the needle now hangs DOWN instead of pointing UP. If positive EMF previously rotated CW (visible from camera), the needle now needs the OPPOSITE sign to keep "positive EMF = right deflection" from the student's perspective. Implementer will verify by visual smoke-test; flip via negation in `computeGalvanometerAngle` if needed, OR by setting `rotation.z = -displayedAngle`.

### Acceptance

1. Needle pivots from a single point at the TOP of the dial face (visible black sphere marks the pivot).
2. Needle hangs DOWN from the pivot, tip in the BOTTOM half of the face.
3. Positive EMF → needle tip swings to the RIGHT side (from camera view). Negative EMF → LEFT. (Sign flip applied as needed during implementation smoke-test.)

---

## Slice D — Wire active magnet to FieldLines + computeEMF

### Problem

Currently FieldLines is mounted once with `magnetBodyId={BAR_MAGNET_BODY_ID}`. SceneController's `findBodyByTag(BAR_MAGNET_BODY_ID)` reads from that one body. With two magnets we need to mount two FieldLines instances (one per magnet) and have SceneController switch which body it reads from based on the active magnet.

FieldLines also has hard-coded `MAGNET_HALF_LENGTH` in `makeFieldLine` for the N/S tip positions. Different magnet lengths need different tip positions.

### Fix — two files

**D.1 — `FieldLines.tsx`** accepts `magnetHalfLength: number` as a new required prop. The internal `makeFieldLine(extent, mirror)` becomes `makeFieldLine(extent, mirror, halfLength)` and uses `halfLength` for the N/S tip x-coordinates. The hard-coded `MAGNET_HALF_LENGTH` import is dropped.

**D.2 — `LabScene.tsx`** mounts TWO FieldLines, one per magnet:

```tsx
<FieldLines
  magnetBodyId="bar-magnet-long"
  magnetHalfLength={LONG_MAGNET_HALF_LENGTH}
  visible={fieldVisible && activeMagnet === 'long'}
  opacityScale={opacityScale}
/>
<FieldLines
  magnetBodyId="bar-magnet-short"
  magnetHalfLength={SHORT_MAGNET_HALF_LENGTH}
  visible={fieldVisible && activeMagnet === 'short'}
  opacityScale={opacityScale}
/>
```

The `visible` toggle uses the existing fade-in/out animation in FieldLines (~250 ms) so swapping magnets is smooth.

**D.3 — SceneController updates**:

- Read `activeMagnet` from `useLabSettings.getState()` each frame.
- Compute `activeMagnetBodyId = activeMagnet === 'long' ? 'bar-magnet-long' : 'bar-magnet-short'`.
- `findBodyByTag(activeMagnetBodyId)` for the EMF computation.
- Watch `useStepEngine.draggingBodyId`: if it changes to one of the magnet IDs and the active magnet doesn't match, call `useLabSettings.getState().setActiveMagnet(...)` to sync. (Belt-and-suspenders with the BarMagnet's onTap dispatch.)

`CurrentArrows.tsx` is unchanged — it reads from `useInductionReadings.currentEMF` which is updated by SceneController based on the active magnet. So the current arrows always reflect the active magnet's effect.

### Acceptance

1. Default: long magnet active → its field lines visible (with current `opacityScale`).
2. Tap short magnet → its field lines fade in over ~250 ms, long magnet's fade out.
3. Galvanometer + bulb + current arrows respond only to the active magnet's motion.
4. Persistence: reload → active magnet is whichever was last selected.

---

## File touch-list

| File | Slice | Change |
|---|---|---|
| `src/labs/electromagnetic-induction/state/LabSettingsState.ts` | A | Add `ActiveMagnet` type, `activeMagnet` field (default `'long'`), `setActiveMagnet` action. |
| `src/labs/electromagnetic-induction/objects/BarMagnet.tsx` | A | Generalize to take `halfLength`, `bodyId`, `magnetSize` props. Export `LONG_MAGNET_HALF_LENGTH` + `SHORT_MAGNET_HALF_LENGTH`. Drop `BAR_MAGNET_BODY_ID` constant; replace with two bodyIds in LabScene. `onTap` dispatches both `setActiveMagnet` and `setFocusTarget`. |
| `src/labs/electromagnetic-induction/instruments/FieldLines.tsx` | D | Accept `magnetHalfLength: number` prop. Drop hard-coded `MAGNET_HALF_LENGTH` import. `makeFieldLine` takes `halfLength` as third arg. |
| `src/labs/electromagnetic-induction/instruments/LabClutter.tsx` | B | Drop spool + spare-magnet mesh definitions and their Props fields. Keep notebook only. |
| `src/labs/electromagnetic-induction/instruments/Galvanometer.tsx` | C | Flip `NEEDLE_PIVOT_Y_LOCAL` to top of face. Wrap needle in `<group>` at pivot; mesh offset DOWN by `NEEDLE_LEN/2`. Add small pivot dot. Verify rotation sign in smoke-test. |
| `src/labs/electromagnetic-induction/scene/LabScene.tsx` | A + B + D | Drop `BAR_MAGNET_BODY_ID` reference (use string literals for body IDs). Remove `SPOOL_WORLD` + `SPARE_MAGNET_WORLD` constants and `<LabClutter>` props. Mount two `<BarMagnet>` + two `<FieldLines>`. Update `<FieldLines>` and `<BarMagnet>` reference patterns. Update SceneController to read `activeMagnet` and use the corresponding body ID. Watch `draggingBodyId` for sync. |

6 files modified, 0 new files. ~100 lines net (some additions, some deletes).

## Testing strategy

No new unit tests. The 220-test suite stays as the regression gate. Smoke-test (user, on Vercel after deploy):

1. Open EM induction lab → two magnets visible on table (long in front, short behind).
2. Drag long magnet through coil → galvanometer responds, field lines visible around the long magnet only.
3. Tap short magnet → field lines swap (long fades out, short fades in).
4. Drag short magnet through coil → galvanometer responds, field lines around short magnet.
5. Background: no spool, no spare-magnet. Notebook still on table.
6. Galvanometer needle hangs from top of face, tip swings at bottom. Positive EMF → right deflection.
7. Refresh page → last-active magnet persists.
8. Mass-measurement lab → all balls/weights still draggable, no regression.

## Risks

- **Slice C rotation sign**: moving the pivot from bottom to top inverts the needle's "up" direction. Without changing the rotation formula, positive EMF could swing the needle in the WRONG direction. The plan instructs the implementer to verify and flip the sign if needed. Easy fix during smoke-test if wrong.
- **Slice A persistence collision**: when student switches from long to short between sessions, the persisted `activeMagnet` survives. If the bodyIds change in a future PR, persisted values become stale. Zustand persist defaults to `null` on schema mismatch — safe.
- **Slice D dual FieldLines mounted**: both FieldLines components run their `useFrame` every frame, lerping opacity. The hidden one (opacity → 0) still runs the lerp tick. Negligible perf cost (~2 lerp computations per frame).
- **Slice B notebook position**: deleting LabClutter's spoolWorld + spareMagnetWorld leaves the notebook alone but in the same spot. Spec doesn't require relocating it.

## Out of scope

- Pinch-to-zoom or new gestures.
- Visual highlight on the inactive magnet (e.g., desaturation). It just sits there normally.
- A third magnet variant.
- Magnetic-strength variation per magnet (long vs short being physically different). Both share `magnetStrength` from the pill.
- Notebook removal or repositioning.
- Camera POSE adjustments for the second magnet's position (existing `focus-magnet` preset covers the area).

## Self-review checklist

- [x] Acceptance criteria are concrete for each slice.
- [x] No "TBD" / "TODO" / placeholder.
- [x] All four slices have explicit file lists.
- [x] Persistence implications noted (Slice A).
- [x] Rotation sign caveat called out (Slice C).
- [x] Mass-measurement lab regression risk addressed (Slice B specific to EM-induction).
- [x] FieldLines `magnetHalfLength` prop introduction explained (Slice D).
- [x] No new tests; rationale clear.
