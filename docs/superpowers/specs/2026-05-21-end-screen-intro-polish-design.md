# End-Screen & Intro Mobile Polish — Design

**Date:** 2026-05-21
**Status:** Approved-in-concept (user picked top-pill "word + /" format + MC "✓/✕ icons + color"; confirmed MC compact only needed where MC is used)
**Scope:** PR-B of the audit follow-up. Six phone-layout / readability fixes across the lab overlays (intro, end-screen, milestone, multiple-choice, top-pill). All visual; no behavior or physics change.

## Background

The UX audit flagged a cluster of phone-layout and readability issues in the lab overlays that the prior mobile PRs didn't touch (they focused on the 3D scene controls). On a small phone these overlays — the first and last things a student sees — break:

1. **MilestoneOverlay** (mass-measurement) hard-codes `maxWidth: 520` with `left: 50%; transform: translateX(-50%)`. On a 375 px phone the 520 px box overflows both edges.
2. **EM RevealScene** uses `position: fixed; inset: 0; padding: 32; justifyContent: center` with NO `overflow`. The title (36 px) + three conclusion lines (22 px, lineHeight 1.5) + nav row (marginTop 56) can exceed viewport height on a phone → top/bottom content clipped with no way to scroll. (Mass-measurement's RevealScene already scrolls; EM's doesn't.)
3. **IntroScreen** (both labs) uses a fixed `fontSize: 56` headline with no phone breakpoint → wraps or overflows on small phones. Additionally, mass-measurement's headline + subtitle lack `textAlign: center` (they're left-aligned) while EM's are centered — an inconsistency.
4. **MultipleChoice** colors the correct answer green (`#34c759`) and wrong red (`#ff3b30`) with NO non-color indicator → red-green colorblind students can't tell them apart.
5. **MC choices cramped** in the EM task panel on phone (`padding: 14px 18px` × 3 buttons inside a 40 vh panel with header + hint).
6. **Top-pill text inconsistent**: EM shows "Сцена 3 / 5", mass shows "Лабораторна · 3 з 9" — different separators, and "Лабораторна · 3 з 9" mislabels 9 *tasks* as 9 *labs*.

Existing infrastructure: `useViewport()` gives `phone | tablet | desktop`. `MultipleChoice` is an SDK component used ONLY by the EM-induction HUD (mass-measurement uses `NumberInput`, confirmed by grep — no MC usage). EM's top-pill (`HUD.tsx` line ~80) already renders "Сцена {n} / {N}" — the correct spaced-slash format; only mass's pill needs changing.

## Non-goals

- Camera default zoom on phone (user declined earlier).
- Extracting the near-duplicate IntroScreen into an SDK component (that's PR-C — SDK extraction).
- Unifying the divergent visual themes of EM vs mass RevealScene (a separate design-tokens pass).
- Tablet-specific tuning (these fixes target phone; tablet inherits the larger sizes, which fit).
- New unit tests (visual changes, no test surface). 222-test suite is the regression gate.
- Touching mass-measurement's MC (it has none).
- Fixing the mass-measurement MilestoneOverlay content bug where the apple's milestone title says "Металева кулька" (metal ball) — that's a content issue, out of scope here.

## Architecture

Branch `feat/end-screen-intro-polish` from `master` at commit `e219cae`. Six slices, single merge.

| Slice | Files |
|---|---|
| **1** — MC colorblind icons + compact prop | `src/sdk/ui/MultipleChoice.tsx`, `src/labs/electromagnetic-induction/ui/HUD.tsx` (callsite) |
| **2** — EM RevealScene phone layout | `src/labs/electromagnetic-induction/ui/RevealScene.tsx` |
| **3** — IntroScreen responsive + centering | `src/labs/electromagnetic-induction/ui/IntroScreen.tsx`, `src/labs/mass-measurement/ui/IntroScreen.tsx` |
| **4** — MilestoneOverlay maxWidth | `src/labs/mass-measurement/ui/MilestoneOverlay.tsx` |
| **5** — Mass top-pill text | `src/labs/mass-measurement/ui/HUD.tsx` |
| **6** — Verify + merge | none |

7 files modified, 0 new. ~90 lines net.

---

## Slice 1 — MultipleChoice colorblind icons + compact

**Files:** `src/sdk/ui/MultipleChoice.tsx`, `src/labs/electromagnetic-induction/ui/HUD.tsx`

### 1A — Icons

The button currently renders `{c.label}`. Prepend a state icon: `✓ ` when `correct`, `✕ ` when `wrong`, nothing when `idle`. The icon is a leading `<span aria-hidden="true">` so it's decorative (the green/red + label already convey state to screen readers; the icon is the colorblind affordance for sighted users).

```tsx
function stateIcon(state: ButtonState): string {
  if (state === 'correct') return '✓ '
  if (state === 'wrong') return '✕ '
  return ''
}
```

In the button JSX:

```tsx
{choices.map((c, i) => (
  <button ...>
    <span aria-hidden="true">{stateIcon(states[i])}</span>
    {c.label}
  </button>
))}
```

### 1B — `compact` prop

Add an optional `compact?: boolean` prop. When true, shrink the button padding + font for tight phone panels.

```tsx
type Props = {
  question: string
  choices: Choice[]
  correctIndex: number
  onCorrect: (chosenIndex: number) => void
  /** Tighter padding + font for cramped phone panels. */
  compact?: boolean
}
```

In `buttonStyle`, the `padding` and `fontSize` become compact-aware:

```ts
const buttonStyle = (state: ButtonState): CSSProperties => {
  const base: CSSProperties = {
    padding: compact ? '10px 14px' : '14px 18px',
    borderRadius: 100,
    fontSize: compact ? 13 : 14,
    // ...rest unchanged
  }
  // ...correct/wrong/idle branches unchanged
}
```

### 1C — EM HUD callsite

The EM `HUD.tsx` renders `<MultipleChoice question="" choices={...} correctIndex={...} onCorrect={...} />`. Add `compact={breakpoint === 'phone'}`. `breakpoint` is already in scope in that component.

### Acceptance

1. Correct answer: green background + leading `✓`. Wrong: red + leading `✕`. Idle: no icon.
2. On phone, MC buttons are visibly tighter (10 px vertical padding, 13 px font); on tablet/desktop unchanged.
3. Screen readers still announce the choice label (icon is `aria-hidden`).
4. mass-measurement is unaffected (no MC usage).

---

## Slice 2 — EM RevealScene phone layout

**File:** `src/labs/electromagnetic-induction/ui/RevealScene.tsx`

Add `useViewport` and make the screen scrollable + phone-responsive.

### Root container

Change the root `<div>` style to allow scrolling without clipping:

```ts
// add: const { breakpoint } = useViewport()
// const isPhone = breakpoint === 'phone'

// root style changes:
overflowY: 'auto',
justifyContent: 'safe center',  // 'safe' keeps the top reachable when content overflows
padding: isPhone ? 20 : 32,
```

(`safe center` is supported in iOS Safari 11+ / Chromium 93+ — our target range. It centers when content fits and falls back to flex-start when it would overflow, so the top is never clipped.)

### Phone-responsive sizes

| Element | Desktop | Phone |
|---|---|---|
| "Висновки" title `fontSize` | 36 | 26 |
| title `marginBottom` | 40 | 24 |
| conclusions container `gap` | 22 | 14 |
| each conclusion `fontSize` | 22 | 16 |
| nav row `marginTop` | 56 | 32 |

Each is a `isPhone ? <phone> : <desktop>` ternary on the existing inline style.

### Acceptance

1. On iPhone SE (320×568) the end-screen shows the title, all 3 conclusions, and both nav buttons; if it still overflows, it scrolls and the top stays reachable.
2. On desktop the screen looks identical to before (36/22 px sizes, 32 padding).

---

## Slice 3 — IntroScreen responsive + centering

**Files:** `src/labs/electromagnetic-induction/ui/IntroScreen.tsx`, `src/labs/mass-measurement/ui/IntroScreen.tsx`

Both files are near-identical. For each:

### Responsive headline + subtitle

Add `useViewport`; on phone shrink:

| Element | Desktop | Phone |
|---|---|---|
| headline `fontSize` | 56 | 34 |
| subtitle `fontSize` | 32 | 22 |

### Centering consistency (mass-measurement only)

The mass-measurement headline (the `fontSize: 56` block) and subtitle (the `fontSize: 32` block) lack `textAlign: center`. Add `textAlign: 'center'` to both so it matches EM's centered layout. (EM already has `textAlign: 'center'` on both.)

### Acceptance

1. On iPhone SE the headline fits on at most two lines without horizontal overflow in both labs.
2. mass-measurement intro headline + subtitle are centered (like EM).
3. Desktop unchanged (56/32 px).

---

## Slice 4 — MilestoneOverlay maxWidth

**File:** `src/labs/mass-measurement/ui/MilestoneOverlay.tsx`

One-attribute change. Find:

```ts
        maxWidth: 520,
```

Replace with:

```ts
        maxWidth: 'min(520px, calc(100vw - 32px))',
```

### Acceptance

1. On a 375 px phone the milestone toast never touches the screen edges (16 px clearance each side).
2. On desktop it stays capped at 520 px as before.

---

## Slice 5 — Mass top-pill text

**File:** `src/labs/mass-measurement/ui/HUD.tsx`

Find the top-pill content (around line 151):

```tsx
        Лабораторна · {idx + 1} з {TOTAL}
```

Replace with:

```tsx
        Завдання {idx + 1} / {TOTAL}
```

EM's pill ("Сцена {n} / {N}") already uses the unified "word + spaced slash" format and is NOT changed.

### Acceptance

1. mass-measurement top-pill reads "Завдання 3 / 9" (was "Лабораторна · 3 з 9").
2. EM top-pill unchanged ("Сцена 3 / 5").

---

## Slice 6 — Verify + merge

No file changes. `npx tsc --noEmit` (0 errors), `npm run build` (success), `npm test -- --run` (222 passing — no test changes), commit-chain sanity, push, direct-merge to master, user smoke-test.

---

## File touch-list

| File | Slice | Change |
|---|---|---|
| `src/sdk/ui/MultipleChoice.tsx` | 1 | `stateIcon` helper + leading `aria-hidden` span; `compact?: boolean` prop adjusting padding/font. |
| `src/labs/electromagnetic-induction/ui/HUD.tsx` | 1 | Pass `compact={breakpoint === 'phone'}` to `<MultipleChoice>`. |
| `src/labs/electromagnetic-induction/ui/RevealScene.tsx` | 2 | `useViewport`; root `overflowY: auto` + `safe center` + phone padding; phone-responsive font/gap/margin. |
| `src/labs/electromagnetic-induction/ui/IntroScreen.tsx` | 3 | `useViewport`; phone headline/subtitle sizes. |
| `src/labs/mass-measurement/ui/IntroScreen.tsx` | 3 | `useViewport`; phone sizes + `textAlign: center` on headline + subtitle. |
| `src/labs/mass-measurement/ui/MilestoneOverlay.tsx` | 4 | `maxWidth` → `min(520px, calc(100vw - 32px))`. |
| `src/labs/mass-measurement/ui/HUD.tsx` | 5 | Top-pill text "Лабораторна · X з Y" → "Завдання X / Y". |

7 files modified, 0 new. ~90 lines net.

## Testing strategy

The 222-test suite is the regression gate (no new tests — pure visual). `npx tsc --noEmit` + `npm run build` stay clean. Human smoke-test after Vercel deploy:

1. iPhone SE (320 px) — both labs: intro headline fits + centered; complete EM lab → end-screen scrolls/fits with both buttons; mass-measurement → milestone toast within edges.
2. EM lab MC question — wrong answer shows ✕ + red, correct shows ✓ + green; buttons tighter on phone.
3. mass-measurement top-pill reads "Завдання N / 9".
4. Desktop — all overlays look as before.

## Risks

- **`justifyContent: 'safe center'` browser support.** iOS Safari 11+ / Chromium 93+. Older browsers fall back to treating `safe center` as `center` (the unsafe one) — same as today, no regression. Acceptable for the modern-phone target.
- **Phone font reduction makes text too small.** 26 px title / 16 px conclusions on the end-screen and 34 px headline on intro are still well above the 12 px readability floor. If a value reads too small in smoke-test, it's a one-number tweak.
- **The leading icon span adds a space even when idle returns `''`.** `stateIcon` returns empty string for idle, so the span renders nothing — no stray leading space. Verified by the empty-string return.
- **`compact` only consumed by EM HUD.** mass-measurement has no MC, so the prop is dormant there. This is intentional — the prop lives in the SDK component for any future MC consumer.

## Out of scope

- Camera zoom default.
- IntroScreen → SDK extraction (PR-C).
- RevealScene theme unification.
- MilestoneOverlay content/naming bug.
- Tablet-specific overlay tuning.

## Self-review checklist

- [x] Every slice has concrete acceptance criteria.
- [x] Internally consistent — each slice is independent; the only shared file (EM HUD) is touched by Slice 1 (MC callsite) only.
- [x] No "TBD" / "TODO" / placeholder text.
- [x] File touch-list matches the slices.
- [x] Existing tests NOT modified; 222 regression gate.
- [x] No new dependencies.
- [x] User's two picks (top-pill "word + /", MC "✓/✕ + color") both reflected; the "check mass MC" follow-up resolved (no MC there — documented).
- [x] Risks cover `safe center` support, font-size floor, the empty-icon edge, and the dormant `compact` prop.
- [x] Out-of-scope explicit.
