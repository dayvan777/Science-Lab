# End-Screen & Intro Mobile Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix six phone-layout / readability issues across the lab overlays — MC colorblind icons + compaction, EM end-screen scroll + responsive fonts, intro responsive headlines + centering, milestone overflow clamp, and a unified top-pill label.

**Architecture:** Each fix is local to one or two files and gated on `useViewport()`'s `phone` breakpoint where responsive. The only SDK change is `MultipleChoice` (icons + a new `compact` prop); everything else is lab-local style tweaks.

**Tech Stack:** React 19, TypeScript, `useViewport()` hook. No new dependencies, no new tests.

**Spec:** `docs/superpowers/specs/2026-05-21-end-screen-intro-polish-design.md` (commit `6ba552b`).

**Branch:** `feat/end-screen-intro-polish` (already created from `master` at `e219cae`; spec commit `6ba552b` on it).

---

## File Structure

7 files modified, 0 new.

| File | Responsibility |
|---|---|
| `src/sdk/ui/MultipleChoice.tsx` | `stateIcon` helper + leading `aria-hidden` span; new `compact?: boolean` prop adjusting padding/font. |
| `src/labs/electromagnetic-induction/ui/HUD.tsx` | Pass `compact={breakpoint === 'phone'}` to `<MultipleChoice>`. |
| `src/labs/electromagnetic-induction/ui/RevealScene.tsx` | `useViewport`; scrollable root + phone-responsive sizes. |
| `src/labs/electromagnetic-induction/ui/IntroScreen.tsx` | `useViewport`; phone headline/subtitle sizes. |
| `src/labs/mass-measurement/ui/IntroScreen.tsx` | `useViewport`; phone sizes + `textAlign: center`. |
| `src/labs/mass-measurement/ui/MilestoneOverlay.tsx` | `maxWidth` clamp. |
| `src/labs/mass-measurement/ui/HUD.tsx` | Top-pill text. |

---

## Pre-flight

- [ ] **Step 0a: Confirm branch + clean tree**

Run: `git status`
Expected: `On branch feat/end-screen-intro-polish`, clean. HEAD at `6ba552b`.

- [ ] **Step 0b: Baseline test + types**

Run: `npm test -- --run` → `Tests 222 passed (222)`.
Run: `npx tsc --noEmit` → 0 errors.

---

## Task 1: MultipleChoice icons + compact (Slice 1)

**Files:**
- Modify: `src/sdk/ui/MultipleChoice.tsx`
- Modify: `src/labs/electromagnetic-induction/ui/HUD.tsx`

- [ ] **Step 1.1: Add `compact` to the `Props` type**

In `src/sdk/ui/MultipleChoice.tsx`, find:

```ts
type Props = {
  question: string
  choices: Choice[]
  /** Index (0-based) of the correct option. */
  correctIndex: number
  /** Fires when the student picks the correct answer. */
  onCorrect: (chosenIndex: number) => void
}
```

Replace with:

```ts
type Props = {
  question: string
  choices: Choice[]
  /** Index (0-based) of the correct option. */
  correctIndex: number
  /** Fires when the student picks the correct answer. */
  onCorrect: (chosenIndex: number) => void
  /** Tighter padding + font for cramped phone panels. */
  compact?: boolean
}
```

- [ ] **Step 1.2: Destructure `compact`**

Find:

```ts
export function MultipleChoice({ question, choices, correctIndex, onCorrect }: Props) {
```

Replace with:

```ts
export function MultipleChoice({ question, choices, correctIndex, onCorrect, compact = false }: Props) {
```

- [ ] **Step 1.3: Add the `stateIcon` helper**

Find the `ButtonState` type line:

```ts
type ButtonState = 'idle' | 'wrong' | 'correct'
```

Add a helper right after it (module scope, below the type):

```ts
type ButtonState = 'idle' | 'wrong' | 'correct'

function stateIcon(state: ButtonState): string {
  if (state === 'correct') return '✓ '
  if (state === 'wrong') return '✕ '
  return ''
}
```

- [ ] **Step 1.4: Make `buttonStyle` compact-aware**

Find:

```ts
  const buttonStyle = (state: ButtonState): CSSProperties => {
    const base: CSSProperties = {
      padding: '14px 18px',
      borderRadius: 100,
      fontSize: 14,
      fontWeight: 600,
      fontFamily: '"Inter", system-ui, sans-serif',
      textAlign: 'left',
      cursor: locked ? 'default' : 'pointer',
      transition: 'background 200ms ease, color 200ms ease, border-color 200ms ease',
      border: '1px solid rgba(0,0,0,0.10)',
    }
```

Replace with (only `padding` and `fontSize` become compact-aware):

```ts
  const buttonStyle = (state: ButtonState): CSSProperties => {
    const base: CSSProperties = {
      padding: compact ? '10px 14px' : '14px 18px',
      borderRadius: 100,
      fontSize: compact ? 13 : 14,
      fontWeight: 600,
      fontFamily: '"Inter", system-ui, sans-serif',
      textAlign: 'left',
      cursor: locked ? 'default' : 'pointer',
      transition: 'background 200ms ease, color 200ms ease, border-color 200ms ease',
      border: '1px solid rgba(0,0,0,0.10)',
    }
```

- [ ] **Step 1.5: Render the leading icon span**

Find the button JSX:

```tsx
      {choices.map((c, i) => (
        <button
          key={c.id}
          type="button"
          style={buttonStyle(states[i])}
          onClick={() => handleClick(i)}
          disabled={locked && states[i] !== 'correct'}
          aria-label={c.label}
        >
          {c.label}
        </button>
      ))}
```

Replace with (add the `aria-hidden` icon span before the label):

```tsx
      {choices.map((c, i) => (
        <button
          key={c.id}
          type="button"
          style={buttonStyle(states[i])}
          onClick={() => handleClick(i)}
          disabled={locked && states[i] !== 'correct'}
          aria-label={c.label}
        >
          <span aria-hidden="true">{stateIcon(states[i])}</span>
          {c.label}
        </button>
      ))}
```

- [ ] **Step 1.6: Pass `compact` from EM HUD**

Open `src/labs/electromagnetic-induction/ui/HUD.tsx`. Find the `<MultipleChoice>` usage:

```tsx
          <MultipleChoice
            question=""
            choices={step.choices}
            correctIndex={step.complete.correctIndex}
            onCorrect={(idx) => {
              recordMCAnswer(idx)
              setLastMCChoice(idx)
            }}
          />
```

Replace with (add `compact` prop):

```tsx
          <MultipleChoice
            question=""
            choices={step.choices}
            correctIndex={step.complete.correctIndex}
            compact={breakpoint === 'phone'}
            onCorrect={(idx) => {
              recordMCAnswer(idx)
              setLastMCChoice(idx)
            }}
          />
```

(`breakpoint` is already in scope in EM `HUD.tsx` via the existing `const { breakpoint } = useViewport()`.)

- [ ] **Step 1.7: Verify**

- `npx tsc --noEmit` — 0 errors.
- `npm run build` — succeeds.
- `npm test -- --run` — 222 passed.

- [ ] **Step 1.8: Commit**

```bash
git add src/sdk/ui/MultipleChoice.tsx src/labs/electromagnetic-induction/ui/HUD.tsx
git commit -m "$(cat <<'EOF'
feat(sdk): MultipleChoice colorblind icons + compact prop

Correct answer now shows a leading ✓, wrong shows ✕ (aria-hidden, so
the green/red is no longer the only signal — colorblind-safe). New
optional `compact` prop tightens padding (10px) + font (13px) for
cramped phone panels; EM HUD passes compact on the phone breakpoint.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: EM RevealScene phone layout (Slice 2)

**Files:**
- Modify: `src/labs/electromagnetic-induction/ui/RevealScene.tsx`

- [ ] **Step 2.1: Import `useViewport` + derive `isPhone`**

Find line 1-3:

```ts
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLabState } from '../state/LabState'
```

Replace with:

```ts
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLabState } from '../state/LabState'
import { useViewport } from '../../../sdk/a11y/useViewport'
```

Find:

```ts
export function RevealScene() {
  const [stage, setStage] = useState(0)
  const reset = useLabState(s => s.reset)
```

Replace with:

```ts
export function RevealScene() {
  const [stage, setStage] = useState(0)
  const reset = useLabState(s => s.reset)
  const { breakpoint } = useViewport()
  const isPhone = breakpoint === 'phone'
```

- [ ] **Step 2.2: Make `navWrapStyle.marginTop` phone-aware**

Find:

```ts
  const navWrapStyle: React.CSSProperties = {
    display: 'flex',
    gap: 16,
    marginTop: 56,
```

Replace with:

```ts
  const navWrapStyle: React.CSSProperties = {
    display: 'flex',
    gap: 16,
    marginTop: isPhone ? 32 : 56,
```

- [ ] **Step 2.3: Make the root scrollable + responsive padding**

Find the root container style:

```tsx
    <div style={{
      position: 'fixed', inset: 0,
      background: '#08080a',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      color: '#fff', padding: 32,
      fontFamily: '"Inter", system-ui, sans-serif',
    }}>
```

Replace with:

```tsx
    <div style={{
      position: 'fixed', inset: 0,
      background: '#08080a',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'safe center',
      overflowY: 'auto',
      color: '#fff', padding: isPhone ? 20 : 32,
      fontFamily: '"Inter", system-ui, sans-serif',
    }}>
```

- [ ] **Step 2.4: Make the title size + margin phone-aware**

Find the "Висновки" title block:

```tsx
      <div style={{
        opacity: stage >= 1 ? 1 : 0,
        transform: stage >= 1 ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 600ms ease, transform 600ms ease',
        fontFamily: '"Saira", "Inter", sans-serif',
        fontSize: 36, fontWeight: 800, letterSpacing: -0.02,
        marginBottom: 40, textTransform: 'uppercase', textAlign: 'center',
      }}>
        Висновки
      </div>
```

Replace with:

```tsx
      <div style={{
        opacity: stage >= 1 ? 1 : 0,
        transform: stage >= 1 ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 600ms ease, transform 600ms ease',
        fontFamily: '"Saira", "Inter", sans-serif',
        fontSize: isPhone ? 26 : 36, fontWeight: 800, letterSpacing: -0.02,
        marginBottom: isPhone ? 24 : 40, textTransform: 'uppercase', textAlign: 'center',
      }}>
        Висновки
      </div>
```

- [ ] **Step 2.5: Make the conclusions container gap + each line size phone-aware**

Find the conclusions block:

```tsx
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22, maxWidth: 760, textAlign: 'center' }}>
        {CONCLUSIONS.map((text, i) => (
          <div key={i} style={{
            opacity: stage >= i + 2 ? 1 : 0,
            transform: stage >= i + 2 ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 600ms ease, transform 600ms ease',
            fontSize: 22, fontWeight: 500, color: 'rgba(255,255,255,0.9)',
            lineHeight: 1.5,
          }}>
```

Replace with:

```tsx
      <div style={{ display: 'flex', flexDirection: 'column', gap: isPhone ? 14 : 22, maxWidth: 760, textAlign: 'center' }}>
        {CONCLUSIONS.map((text, i) => (
          <div key={i} style={{
            opacity: stage >= i + 2 ? 1 : 0,
            transform: stage >= i + 2 ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 600ms ease, transform 600ms ease',
            fontSize: isPhone ? 16 : 22, fontWeight: 500, color: 'rgba(255,255,255,0.9)',
            lineHeight: 1.5,
          }}>
```

- [ ] **Step 2.6: Verify**

- `npx tsc --noEmit` — 0 errors.
- `npm run build` — succeeds.
- `npm test -- --run` — 222 passed.

- [ ] **Step 2.7: Commit**

```bash
git add src/labs/electromagnetic-induction/ui/RevealScene.tsx
git commit -m "$(cat <<'EOF'
fix(em-induction): RevealScene scrolls + phone-responsive sizes

Root gets overflowY:auto + justifyContent:'safe center' so the end-
screen never clips its top/bottom on a short phone viewport. Title,
conclusions, gaps, and nav margin shrink on the phone breakpoint so
the three Faraday/Lenz conclusions + both nav buttons fit.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: IntroScreen responsive + centering (Slice 3)

**Files:**
- Modify: `src/labs/electromagnetic-induction/ui/IntroScreen.tsx`
- Modify: `src/labs/mass-measurement/ui/IntroScreen.tsx`

- [ ] **Step 3.1: EM IntroScreen — import + isPhone**

Open `src/labs/electromagnetic-induction/ui/IntroScreen.tsx`. Find:

```ts
import { useEffect, useState } from 'react'
import { useLabState } from '../state/LabState'
import { Button } from '../../../sdk/ui/Button'

export function IntroScreen() {
  const start = useLabState(s => s.start)
  const [stage, setStage] = useState(0)
```

Replace with:

```ts
import { useEffect, useState } from 'react'
import { useLabState } from '../state/LabState'
import { Button } from '../../../sdk/ui/Button'
import { useViewport } from '../../../sdk/a11y/useViewport'

export function IntroScreen() {
  const start = useLabState(s => s.start)
  const [stage, setStage] = useState(0)
  const { breakpoint } = useViewport()
  const isPhone = breakpoint === 'phone'
```

- [ ] **Step 3.2: EM IntroScreen — responsive headline**

Find:

```tsx
        fontSize: 56, fontWeight: 200, letterSpacing: -1.5,
        marginBottom: 8, textAlign: 'center',
```

Replace with:

```tsx
        fontSize: isPhone ? 34 : 56, fontWeight: 200, letterSpacing: -1.5,
        marginBottom: 8, textAlign: 'center',
```

- [ ] **Step 3.3: EM IntroScreen — responsive subtitle**

Find:

```tsx
        fontSize: 32, fontWeight: 400, color: '#0071e3',
        marginBottom: 40, textAlign: 'center',
```

Replace with:

```tsx
        fontSize: isPhone ? 22 : 32, fontWeight: 400, color: '#0071e3',
        marginBottom: 40, textAlign: 'center',
```

- [ ] **Step 3.4: Mass IntroScreen — import + isPhone**

Open `src/labs/mass-measurement/ui/IntroScreen.tsx`. Find:

```ts
import { useEffect, useState } from 'react'
import { useLabState } from '../state/LabState'
import { Button } from '../../../sdk/ui/Button'

export function IntroScreen() {
  const start = useLabState(s => s.start)
  const [stage, setStage] = useState(0)
```

Replace with:

```ts
import { useEffect, useState } from 'react'
import { useLabState } from '../state/LabState'
import { Button } from '../../../sdk/ui/Button'
import { useViewport } from '../../../sdk/a11y/useViewport'

export function IntroScreen() {
  const start = useLabState(s => s.start)
  const [stage, setStage] = useState(0)
  const { breakpoint } = useViewport()
  const isPhone = breakpoint === 'phone'
```

- [ ] **Step 3.5: Mass IntroScreen — responsive headline + centering**

Find:

```tsx
        fontSize: 56, fontWeight: 200, letterSpacing: -1.5,
        marginBottom: 8,
```

Replace with (size becomes responsive AND `textAlign: center` is added):

```tsx
        fontSize: isPhone ? 34 : 56, fontWeight: 200, letterSpacing: -1.5,
        marginBottom: 8, textAlign: 'center',
```

- [ ] **Step 3.6: Mass IntroScreen — responsive subtitle + centering**

Find:

```tsx
        fontSize: 32, fontWeight: 400, color: '#0071e3',
        marginBottom: 40,
```

Replace with:

```tsx
        fontSize: isPhone ? 22 : 32, fontWeight: 400, color: '#0071e3',
        marginBottom: 40, textAlign: 'center',
```

- [ ] **Step 3.7: Verify**

- `npx tsc --noEmit` — 0 errors.
- `npm run build` — succeeds.
- `npm test -- --run` — 222 passed.

- [ ] **Step 3.8: Commit**

```bash
git add src/labs/electromagnetic-induction/ui/IntroScreen.tsx src/labs/mass-measurement/ui/IntroScreen.tsx
git commit -m "$(cat <<'EOF'
fix(labs): IntroScreen responsive headlines + centering consistency

Both intro screens shrink the headline (56→34) and subtitle (32→22)
on the phone breakpoint so they don't overflow a small phone. The
mass-measurement headline + subtitle also gain textAlign:center to
match the EM intro (they were left-aligned).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: MilestoneOverlay maxWidth (Slice 4)

**Files:**
- Modify: `src/labs/mass-measurement/ui/MilestoneOverlay.tsx`

- [ ] **Step 4.1: Clamp maxWidth**

Find:

```ts
        maxWidth: 520,
```

Replace with:

```ts
        maxWidth: 'min(520px, calc(100vw - 32px))',
```

- [ ] **Step 4.2: Verify**

- `npx tsc --noEmit` — 0 errors.
- `npm test -- --run` — 222 passed.

- [ ] **Step 4.3: Commit**

```bash
git add src/labs/mass-measurement/ui/MilestoneOverlay.tsx
git commit -m "$(cat <<'EOF'
fix(mass-measurement): MilestoneOverlay clamps width on phone

maxWidth 520 → min(520px, calc(100vw - 32px)) so the milestone toast
keeps 16px clearance from the screen edges on a 375px phone instead
of overflowing.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Mass top-pill text (Slice 5)

**Files:**
- Modify: `src/labs/mass-measurement/ui/HUD.tsx`

- [ ] **Step 5.1: Change the top-pill label**

Find:

```tsx
        Лабораторна · {idx + 1} з {TOTAL}
```

Replace with:

```tsx
        Завдання {idx + 1} / {TOTAL}
```

- [ ] **Step 5.2: Verify**

- `npx tsc --noEmit` — 0 errors.
- `npm test -- --run` — 222 passed.

- [ ] **Step 5.3: Commit**

```bash
git add src/labs/mass-measurement/ui/HUD.tsx
git commit -m "$(cat <<'EOF'
fix(mass-measurement): top-pill «Завдання X / Y»

Was «Лабораторна · X з Y» which mislabels 9 tasks as 9 labs and uses
a different separator from EM induction's «Сцена X / Y». Now both labs
share the "word + spaced slash" format.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Verify + push + direct-merge to master (Slice 6)

**Files:** None modified. Verification + git only.

- [ ] **Step 6.1: Final type-check** — `npx tsc --noEmit` → 0 errors.
- [ ] **Step 6.2: Final build** — `npm run build` → succeeds, only pre-existing chunk-size warning.
- [ ] **Step 6.3: Final test** — `npm test -- --run` → `Tests 222 passed (222)`.
- [ ] **Step 6.4: Sanity-check commit chain**

Run: `git log --oneline master..HEAD`

Expected (5 commits + spec):

```
<sha> fix(mass-measurement): top-pill «Завдання X / Y»
<sha> fix(mass-measurement): MilestoneOverlay clamps width on phone
<sha> fix(labs): IntroScreen responsive headlines + centering consistency
<sha> fix(em-induction): RevealScene scrolls + phone-responsive sizes
<sha> feat(sdk): MultipleChoice colorblind icons + compact prop
6ba552b docs(specs): end-screen & intro mobile polish (PR-B)
```

- [ ] **Step 6.5: Push** — `git push -u origin feat/end-screen-intro-polish`.

- [ ] **Step 6.6: Direct-merge to master**

```bash
git checkout master
git merge --no-ff feat/end-screen-intro-polish -m "Merge feat/end-screen-intro-polish: end-screen & intro mobile polish"
git push origin master
```

- [ ] **Step 6.7: User smoke-test (after Vercel deploy, ~2 min)**

On `science-lab-phi.vercel.app`, ideally on an iPhone (or DevTools device toolbar at 320–390 px):

1. **MC icons (EM lab):** answer a scene's MC wrong → red button with leading ✕; answer correct → green with leading ✓. On phone the buttons are tighter than before.
2. **EM end-screen:** finish the EM lab → "Висновки" + 3 conclusions + both nav buttons all visible (or scrollable, top reachable) on phone.
3. **Intro screens:** open both labs on a 320 px phone → headline fits without horizontal overflow; both labs' headline/subtitle are centered.
4. **Milestone (mass lab):** finish an object's 3 measurements → the toast stays within the screen edges on phone.
5. **Top-pill (mass lab):** reads "Завдання 3 / 9"; EM still "Сцена 3 / 5".
6. **Desktop:** all overlays look as before merge.

If a step fails, the entry point is: MC→Task 1, end-screen→Task 2, intro→Task 3, milestone→Task 4, pill→Task 5.

---

## Self-Review Notes

**Spec coverage:**
- ✅ Slice 1 (MC icons + compact + EM callsite) — Task 1.
- ✅ Slice 2 (EM RevealScene scroll + responsive) — Task 2.
- ✅ Slice 3 (both IntroScreens responsive + mass centering) — Task 3.
- ✅ Slice 4 (MilestoneOverlay maxWidth) — Task 4.
- ✅ Slice 5 (mass top-pill) — Task 5.
- ✅ Slice 6 (verify + merge) — Task 6.
- ✅ Acceptance criteria covered in Task 6.7 smoke-test list.

**Placeholder scan:** No "TBD" / "TODO" / "implement later". Every code step shows a full Find/Replace block. Every command shows the exact CLI + expected output.

**Type consistency:**
- `compact?: boolean` defined on `MultipleChoice` Props (Task 1.1), destructured with default `false` (1.2), consumed in `buttonStyle` (1.4), passed by EM HUD (1.6).
- `stateIcon(state: ButtonState): string` (Task 1.3) used in the button JSX (1.5) — `ButtonState` is the existing type.
- `useViewport()` → `{ breakpoint }`, `isPhone = breakpoint === 'phone'` used identically in RevealScene (Task 2.1) and both IntroScreens (Tasks 3.1, 3.4). `breakpoint` already in EM HUD scope (Task 1.6).
- No renamed symbols across tasks.

**No new tests:** Spec carries the 222-test regression gate; all changes are visual. Each task re-runs the suite to confirm green.

**Branch parallelism:** `feat/end-screen-intro-polish` from fresh master (`e219cae`) + spec commit (`6ba552b`). No conflicting branches.

**Iteration order:** All five fix-tasks are independent (different files except EM HUD touched only by Task 1's callsite). Each type-checks + tests green on its own; any could be reverted independently. Task 6 verifies the whole branch.
