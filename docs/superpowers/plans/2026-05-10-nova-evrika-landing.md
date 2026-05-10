# NOVA EVRIKA Landing + Subject Routing — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the NOVA EVRIKA brand landing at `/`, a physics-subject page at `/physics` listing the existing mass-measurement lab, and "Coming soon" pages for math + history. Add SPA routing so the existing lab moves cleanly to `/physics/mass-measurement` without any internal changes.

**Architecture:** All new code lives under `src/site/`. The router (`react-router-dom@7`) replaces the direct lab mount in `src/app/App.tsx`. A subject + lab registry in `src/site/content/subjects.ts` is the single source of truth — adding the next lab is one entry. Visual language extends the lab's existing dark studio: `#08080a` background + four static radial blur-glows, glass pills, geometric brand mark (PNG file at `public/nova-evrika-logo.png` — used as `<img>`, never recreated).

**Tech Stack:** React 19, TypeScript 6, Vite 8, React Router 7, plain CSS-in-JS for styling (matches existing pattern). Two new Google Fonts via CDN: `Inter` (body) and `Saira` (display headings). No state-management additions. No new test files.

**Spec:** `docs/superpowers/specs/2026-05-10-nova-evrika-landing-design.md`

---

## File map

```
NEW
  src/site/content/subjects.ts                      task 2
  src/site/components/GlowBackground.tsx            task 3
  src/site/components/BrandHero.tsx                 task 4
  src/site/components/SubjectPill.tsx               task 5
  src/site/components/LabCard.tsx                   task 6
  src/site/pages/LandingPage.tsx                    task 7
  src/site/pages/PhysicsPage.tsx                    task 8
  src/site/pages/ComingSoonPage.tsx                 task 9
  src/site/styles/fonts.css                         task 10
  vercel.json                                       task 13

MODIFIED
  package.json                                      task 1 (npm install)
  package-lock.json                                 task 1 (npm install)
  src/app/App.tsx                                   task 11 (becomes router shell)
  src/main.tsx                                      task 12 (import fonts.css)
```

The existing `public/nova-evrika-logo.png` is already in place. The existing `src/labs/mass-measurement/` is untouched. The existing test suite is unchanged.

## Verification commands

```bash
npx tsc --noEmit                    # must be clean
npx vitest run                      # 183 tests, must remain 183
npm run build                       # must succeed
```

A manual smoke test happens at the end (Task 14): `npm run dev`, click through `/` → `/physics` → `/physics/mass-measurement` → back, then `/math` and `/history`.

---

## Task 1 — Install `react-router-dom`

**Files:**
- Modify: `package.json`, `package-lock.json` (npm-managed)

- [ ] **Step 1: Install**

```bash
npm install react-router-dom@^7
```

- [ ] **Step 2: Verify version landed**

```bash
node -e "console.log(require('./node_modules/react-router-dom/package.json').version)"
```

Expected: `7.x.x` (any 7.x major).

- [ ] **Step 3: Verify typecheck still clean (no consumer code yet)**

```bash
npx tsc --noEmit
```

Expected: clean.

---

## Task 2 — Subject + lab registry

**Files:**
- Create: `src/site/content/subjects.ts`

- [ ] **Step 1: Create the registry**

Write `src/site/content/subjects.ts` with the entire content below:

```ts
/**
 * Single source of truth for the navigation tree on the landing page +
 * the lab list on each subject page. Adding a new lab in the future is
 * a one-entry change here.
 */

export type LabStatus = 'available' | 'soon'

export type LabEntry = {
  id: string
  title: string
  /** Optional one-line subtitle shown under the title on a subject page card. */
  subtitle?: string
  path: string
  status: LabStatus
}

export type SubjectId = 'math' | 'history' | 'physics'

export type SubjectEntry = {
  id: SubjectId
  title: string
  path: string
  status: LabStatus
  labs: LabEntry[]
}

export const SUBJECTS: SubjectEntry[] = [
  {
    id: 'math',
    title: 'Математика',
    path: '/math',
    status: 'soon',
    labs: [],
  },
  {
    id: 'history',
    title: 'Історія',
    path: '/history',
    status: 'soon',
    labs: [],
  },
  {
    id: 'physics',
    title: 'Фізика',
    path: '/physics',
    status: 'available',
    labs: [
      {
        id: 'mass-measurement',
        title: 'Вимірювання маси тіл',
        subtitle: 'Електронні ваги · Важільні · Динамометр',
        path: '/physics/mass-measurement',
        status: 'available',
      },
    ],
  },
]

export function findSubject(id: SubjectId): SubjectEntry | undefined {
  return SUBJECTS.find(s => s.id === id)
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

Expected: clean.

---

## Task 3 — `GlowBackground` component

**Files:**
- Create: `src/site/components/GlowBackground.tsx`

The static four-glow overlay extracted into a reusable component used by every site page (Landing, Physics, ComingSoon). Spec-mandated colours and positions.

- [ ] **Step 1: Create the component**

Write `src/site/components/GlowBackground.tsx`:

```tsx
import { CSSProperties } from 'react'

/**
 * Full-bleed dark background with four radial blur-glow overlays.
 * Static (no animation) — explicit user choice during brainstorm.
 *
 * Colours match the lab's reveal-scene language:
 *   - Apple-blue, bottom-left
 *   - Soft green, bottom-right
 *   - Warm yellow, top-right
 *   - Deep blue, top-left
 *
 * Sits behind everything via `position: fixed; inset: 0; z-index: -1`.
 */
export function GlowBackground() {
  const layerStyle: CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: -1,
    background: '#08080a',
    pointerEvents: 'none',
  }

  const glowStyle: CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: -1,
    pointerEvents: 'none',
    background: `
      radial-gradient(circle at 12% 88%, rgba(10, 132, 255, 0.55) 0%, transparent 35%),
      radial-gradient(circle at 88% 18%, rgba(255, 220, 80, 0.30) 0%, transparent 30%),
      radial-gradient(circle at 75% 75%, rgba(80, 220, 130, 0.40) 0%, transparent 35%),
      radial-gradient(circle at 5% 30%, rgba(50, 80, 160, 0.30) 0%, transparent 30%)
    `,
    filter: 'blur(40px)',
  }

  return (
    <>
      <div style={layerStyle} aria-hidden="true" />
      <div style={glowStyle} aria-hidden="true" />
    </>
  )
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

Expected: clean.

---

## Task 4 — `BrandHero` component

**Files:**
- Create: `src/site/components/BrandHero.tsx`

Reusable hero block: kicker text + logo image + tagline. Used by `LandingPage` (large) and `ComingSoonPage` (medium). PhysicsPage uses a different smaller header pattern, so it doesn't reuse this.

- [ ] **Step 1: Create the component**

Write `src/site/components/BrandHero.tsx`:

```tsx
import { CSSProperties } from 'react'

type Props = {
  /** Kicker line above the logo (e.g. "ОСВІТНЯ ПЛАТФОРМА · 6–7 КЛАС · BETA"). */
  kicker?: string
  /** Tagline shown below the logo. Optional. */
  tagline?: string
  /** Visual size — affects logo height and gaps. */
  size?: 'large' | 'medium'
}

const KICKER_PARTS_SEPARATOR = '•'  // bullet "•"

export function BrandHero({ kicker, tagline, size = 'large' }: Props) {
  const logoHeight = size === 'large' ? 100 : 72
  const tagFontSize = size === 'large' ? 16 : 14
  const kickerFontSize = size === 'large' ? 12 : 11

  const wrapStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    color: '#fff',
    fontFamily: '"Inter", system-ui, sans-serif',
  }

  const kickerStyle: CSSProperties = {
    fontSize: kickerFontSize,
    letterSpacing: '0.3em',
    textTransform: 'uppercase',
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: 500,
    marginBottom: 28,
  }

  const dotStyle: CSSProperties = {
    color: 'rgba(255, 255, 255, 0.3)',
    margin: '0 10px',
  }

  const logoStyle: CSSProperties = {
    height: logoHeight,
    width: 'auto',
    userSelect: 'none',
    marginBottom: tagline ? 18 : 0,
  }

  const taglineStyle: CSSProperties = {
    fontSize: tagFontSize,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: 400,
    marginBottom: size === 'large' ? 44 : 24,
    maxWidth: 600,
    lineHeight: 1.5,
  }

  const kickerNodes = kicker
    ? kicker.split(KICKER_PARTS_SEPARATOR).map((part, i, arr) => (
        <span key={i}>
          {part.trim()}
          {i < arr.length - 1 ? <span style={dotStyle} aria-hidden="true">{KICKER_PARTS_SEPARATOR}</span> : null}
        </span>
      ))
    : null

  return (
    <div style={wrapStyle}>
      {kicker && <div style={kickerStyle}>{kickerNodes}</div>}
      <img
        src="/nova-evrika-logo.png"
        alt="NOVA EVRIKA"
        style={logoStyle}
        draggable={false}
      />
      {tagline && <div style={taglineStyle}>{tagline}</div>}
    </div>
  )
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

Expected: clean.

---

## Task 5 — `SubjectPill` component

**Files:**
- Create: `src/site/components/SubjectPill.tsx`

A pill-shaped link used as the three navigation buttons on the landing page. Renders as `<Link>` to navigate via React Router. Active = solid white pill with dark text + green badge; locked = glass pill with reduced opacity + grey badge. Both still navigate (locked subjects go to a "Coming soon" page).

- [ ] **Step 1: Create the component**

Write `src/site/components/SubjectPill.tsx`:

```tsx
import { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import type { SubjectEntry } from '../content/subjects'

type Props = {
  subject: SubjectEntry
}

export function SubjectPill({ subject }: Props) {
  const isAvailable = subject.status === 'available'

  const baseStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 10,
    padding: '16px 32px',
    borderRadius: 100,
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    fontFamily: '"Inter", system-ui, sans-serif',
    textDecoration: 'none',
    cursor: 'pointer',
    transition: 'transform 200ms ease, background 200ms ease, box-shadow 200ms ease',
    minHeight: 52,
  }

  const availableStyle: CSSProperties = {
    background: 'rgba(255, 255, 255, 0.96)',
    color: '#1d1d1f',
    border: 'none',
    boxShadow: '0 8px 28px rgba(0, 0, 0, 0.4)',
  }

  const lockedStyle: CSSProperties = {
    background: 'rgba(255, 255, 255, 0.08)',
    color: 'rgba(255, 255, 255, 0.55)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.10)',
  }

  const badgeBaseStyle: CSSProperties = {
    display: 'inline-block',
    fontSize: 9,
    padding: '3px 8px',
    borderRadius: 100,
    fontWeight: 700,
    letterSpacing: '0.05em',
  }

  const badgeStyle: CSSProperties = isAvailable
    ? { ...badgeBaseStyle, background: 'rgba(0, 0, 0, 0.10)', color: '#1d1d1f' }
    : { ...badgeBaseStyle, background: 'rgba(255, 255, 255, 0.10)', color: 'rgba(255, 255, 255, 0.55)' }

  const labCount = subject.labs.length
  const badgeText = isAvailable
    ? labCount === 1 ? '1 ЛАБА' : `${labCount} ЛАБ`
    : 'СКОРО'

  const style = { ...baseStyle, ...(isAvailable ? availableStyle : lockedStyle) }

  return (
    <Link to={subject.path} style={style} aria-label={`Перейти до предмету: ${subject.title}`}>
      <span>{subject.title}</span>
      <span style={badgeStyle}>{badgeText}</span>
    </Link>
  )
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

Expected: clean.

---

## Task 6 — `LabCard` component

**Files:**
- Create: `src/site/components/LabCard.tsx`

A glass card rendered on a subject page (currently only PhysicsPage). Shows lab title in Saira display font + subtitle + a "Почати" pill button. Click navigates to the lab's path.

- [ ] **Step 1: Create the component**

Write `src/site/components/LabCard.tsx`:

```tsx
import { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import type { LabEntry } from '../content/subjects'

type Props = {
  lab: LabEntry
}

export function LabCard({ lab }: Props) {
  const cardStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    padding: 32,
    borderRadius: 20,
    background: 'rgba(255, 255, 255, 0.06)',
    backdropFilter: 'blur(40px)',
    border: '1px solid rgba(255, 255, 255, 0.10)',
    color: '#fff',
    fontFamily: '"Inter", system-ui, sans-serif',
    maxWidth: 720,
    width: '100%',
  }

  const titleStyle: CSSProperties = {
    fontFamily: '"Saira", "Inter", system-ui, sans-serif',
    fontWeight: 800,
    fontSize: 32,
    letterSpacing: '-0.01em',
    lineHeight: 1.05,
    color: '#fff',
    textTransform: 'uppercase',
    margin: 0,
  }

  const subtitleStyle: CSSProperties = {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: 400,
    margin: 0,
  }

  const ctaWrapStyle: CSSProperties = {
    display: 'flex',
    justifyContent: 'flex-start',
    marginTop: 16,
  }

  const ctaStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '14px 28px',
    borderRadius: 100,
    background: '#0a84ff',
    color: '#fff',
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: '0.10em',
    textTransform: 'uppercase',
    textDecoration: 'none',
    boxShadow: '0 4px 20px rgba(10, 132, 255, 0.4)',
  }

  return (
    <article style={cardStyle}>
      <h2 style={titleStyle}>{lab.title}</h2>
      {lab.subtitle && <p style={subtitleStyle}>{lab.subtitle}</p>}
      <div style={ctaWrapStyle}>
        <Link to={lab.path} style={ctaStyle} aria-label={`Почати лабораторну: ${lab.title}`}>
          Почати лабораторну
        </Link>
      </div>
    </article>
  )
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

Expected: clean.

---

## Task 7 — `LandingPage`

**Files:**
- Create: `src/site/pages/LandingPage.tsx`

The brand entry point at `/`. Centered hero (BrandHero) above a row of three SubjectPills. Responsive: pills stack vertically below 600 px width.

- [ ] **Step 1: Create the page**

Write `src/site/pages/LandingPage.tsx`:

```tsx
import { CSSProperties } from 'react'
import { GlowBackground } from '../components/GlowBackground'
import { BrandHero } from '../components/BrandHero'
import { SubjectPill } from '../components/SubjectPill'
import { SUBJECTS } from '../content/subjects'

const KICKER = 'ОСВІТНЯ ПЛАТФОРМА • 6–7 КЛАС • BETA'
const TAGLINE = 'Інтерактивні предмети для шкільної програми'

export function LandingPage() {
  const wrapStyle: CSSProperties = {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 24px',
  }

  const pillsStyle: CSSProperties = {
    display: 'flex',
    gap: 14,
    flexWrap: 'wrap',
    justifyContent: 'center',
    maxWidth: 720,
  }

  return (
    <>
      <GlowBackground />
      <main style={wrapStyle}>
        <BrandHero kicker={KICKER} tagline={TAGLINE} size="large" />
        <nav style={pillsStyle} aria-label="Перейти до предмету">
          {SUBJECTS.map(s => (
            <SubjectPill key={s.id} subject={s} />
          ))}
        </nav>
      </main>
    </>
  )
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

Expected: clean.

---

## Task 8 — `PhysicsPage`

**Files:**
- Create: `src/site/pages/PhysicsPage.tsx`

The physics subject page at `/physics`. Lists physics labs as cards. Has a back-link to `/`. Reuses `BrandHero` in `medium` size as the header — without tagline, with a different kicker that names the subject.

- [ ] **Step 1: Create the page**

Write `src/site/pages/PhysicsPage.tsx`:

```tsx
import { CSSProperties } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { GlowBackground } from '../components/GlowBackground'
import { BrandHero } from '../components/BrandHero'
import { LabCard } from '../components/LabCard'
import { findSubject } from '../content/subjects'

const KICKER = 'ПРЕДМЕТ • ФІЗИКА'

export function PhysicsPage() {
  const subject = findSubject('physics')
  if (!subject) return <Navigate to="/" replace />

  const wrapStyle: CSSProperties = {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '40px 24px 64px',
  }

  const backStyle: CSSProperties = {
    alignSelf: 'flex-start',
    color: 'rgba(255, 255, 255, 0.6)',
    textDecoration: 'none',
    fontSize: 13,
    fontFamily: '"Inter", system-ui, sans-serif',
    fontWeight: 500,
    letterSpacing: '0.05em',
    padding: '8px 12px',
    borderRadius: 100,
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
  }

  const labsStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
    marginTop: 32,
    width: '100%',
    alignItems: 'center',
  }

  return (
    <>
      <GlowBackground />
      <main style={wrapStyle}>
        <Link to="/" style={backStyle} aria-label="Назад на головну">← Усі предмети</Link>
        <div style={{ marginTop: 32 }}>
          <BrandHero kicker={KICKER} size="medium" />
        </div>
        <div style={labsStyle}>
          {subject.labs.map(lab => (
            <LabCard key={lab.id} lab={lab} />
          ))}
        </div>
      </main>
    </>
  )
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

Expected: clean.

---

## Task 9 — `ComingSoonPage`

**Files:**
- Create: `src/site/pages/ComingSoonPage.tsx`

Renders for `/math` and `/history`. Same hero treatment as the landing but with a "Скоро" message and a back-link. Parametrised by subject id via the route element.

- [ ] **Step 1: Create the page**

Write `src/site/pages/ComingSoonPage.tsx`:

```tsx
import { CSSProperties } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { GlowBackground } from '../components/GlowBackground'
import { BrandHero } from '../components/BrandHero'
import { findSubject, type SubjectId } from '../content/subjects'

type Props = {
  subjectId: SubjectId
}

export function ComingSoonPage({ subjectId }: Props) {
  const subject = findSubject(subjectId)
  if (!subject) return <Navigate to="/" replace />

  const kicker = `ПРЕДМЕТ • ${subject.title.toUpperCase()}`

  const wrapStyle: CSSProperties = {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 24px',
    textAlign: 'center',
  }

  const messageStyle: CSSProperties = {
    fontFamily: '"Saira", "Inter", system-ui, sans-serif',
    fontSize: 38,
    fontWeight: 800,
    letterSpacing: '-0.01em',
    color: '#fff',
    textTransform: 'uppercase',
    margin: '0 0 16px',
  }

  const subStyle: CSSProperties = {
    fontFamily: '"Inter", system-ui, sans-serif',
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: 400,
    maxWidth: 480,
    lineHeight: 1.5,
    marginBottom: 32,
  }

  const backStyle: CSSProperties = {
    display: 'inline-block',
    padding: '14px 28px',
    borderRadius: 100,
    background: 'rgba(255, 255, 255, 0.96)',
    color: '#1d1d1f',
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: '0.10em',
    textTransform: 'uppercase',
    fontFamily: '"Inter", system-ui, sans-serif',
    textDecoration: 'none',
    boxShadow: '0 8px 28px rgba(0, 0, 0, 0.4)',
  }

  return (
    <>
      <GlowBackground />
      <main style={wrapStyle}>
        <BrandHero kicker={kicker} size="medium" />
        <h2 style={messageStyle}>Скоро</h2>
        <p style={subStyle}>
          Цей предмет з&apos;явиться найближчим часом. Поки що готова <strong>Фізика</strong> — там одна повноцінна лабораторна.
        </p>
        <Link to="/" style={backStyle} aria-label="Назад на головну">← На головну</Link>
      </main>
    </>
  )
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

Expected: clean.

---

## Task 10 — `fonts.css`

**Files:**
- Create: `src/site/styles/fonts.css`

Loads Inter (body) and Saira (display) from Google Fonts. Orbitron is intentionally NOT imported — the brand mark is a PNG image, no Orbitron text is rendered anywhere.

- [ ] **Step 1: Create the stylesheet**

Write `src/site/styles/fonts.css`:

```css
/*
 * Site-wide font imports.
 *
 * Inter — body text, kickers, taglines, pill labels (existing lab uses
 * SF Pro Display / Inter stack, this aligns).
 *
 * Saira — display headings: lab titles on cards, "Скоро" message on
 * placeholder pages. Closest free Google match to the heavy display
 * face from the user's first reference ("ВІРТУАЛЬНА ЛАБОРАТОРІЯ").
 *
 * Orbitron is intentionally NOT imported here — the brand mark is a
 * PNG image (public/nova-evrika-logo.png). Adding Orbitron would only
 * inflate the font payload without being rendered.
 */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Saira:wght@700;800;900&display=swap');
```

- [ ] **Step 2: Verify the file is valid CSS**

```bash
node -e "const fs = require('fs'); const c = fs.readFileSync('src/site/styles/fonts.css', 'utf8'); console.log(c.startsWith('/*') ? 'OK comment' : 'FAIL'); console.log(c.includes('Inter') && c.includes('Saira') ? 'OK fonts' : 'FAIL')"
```

Expected:
```
OK comment
OK fonts
```

---

## Task 11 — Router shell in `App.tsx`

**Files:**
- Modify: `src/app/App.tsx` (replace entire content)

The app shell becomes a `BrowserRouter` mapping the five paths defined in the spec.

- [ ] **Step 1: Replace the entire file content**

Replace `src/app/App.tsx` content with:

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { MassMeasurementLab } from '../labs/mass-measurement'
import { LandingPage } from '../site/pages/LandingPage'
import { PhysicsPage } from '../site/pages/PhysicsPage'
import { ComingSoonPage } from '../site/pages/ComingSoonPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/physics" element={<PhysicsPage />} />
        <Route path="/physics/mass-measurement" element={<MassMeasurementLab />} />
        <Route path="/math" element={<ComingSoonPage subjectId="math" />} />
        <Route path="/history" element={<ComingSoonPage subjectId="history" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
```

- [ ] **Step 2: Verify typecheck**

```bash
npx tsc --noEmit
```

Expected: clean.

---

## Task 12 — Import `fonts.css` in `main.tsx`

**Files:**
- Modify: `src/main.tsx` (add one import line)

- [ ] **Step 1: Add the import**

Open `src/main.tsx`. Find:

```tsx
import App from './app/App'
import './index.css'
```

Replace with:

```tsx
import App from './app/App'
import './index.css'
import './site/styles/fonts.css'
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
npm run build 2>&1 | tail -3
```

Expected: typecheck clean, build succeeds.

---

## Task 13 — `vercel.json` SPA rewrite

**Files:**
- Create: `vercel.json` (project root)

Without this, hard-refreshing `/physics/mass-measurement` returns 404 from Vercel because there's no static file at that path. The rewrite sends all paths to the SPA's index.html so React Router can pick them up.

- [ ] **Step 1: Create the config**

Write `vercel.json` at project root:

```json
{
  "rewrites": [
    { "source": "/((?!audio/|nova-evrika-logo|favicon|assets/).*)", "destination": "/" }
  ]
}
```

The negative lookahead excludes static assets (`audio/`, the logo PNG, favicon, Vite's `assets/` chunk folder) so they continue to serve directly. Everything else routes through the SPA.

- [ ] **Step 2: Validate the JSON**

```bash
node -e "const c = require('./vercel.json'); console.log(Array.isArray(c.rewrites) ? 'OK' : 'FAIL')"
```

Expected: `OK`.

---

## Task 14 — Verify + manual smoke + single commit

- [ ] **Step 1: Full verification**

```bash
npx tsc --noEmit
npx vitest run | tail -3
npm run build 2>&1 | tail -3
```

Expected: typecheck clean, **183/183** tests pass (no test changes), build succeeds.

- [ ] **Step 2: Manual smoke (optional but recommended for the controller)**

```bash
npm run dev
```

Open http://localhost:5173/ in a browser:
- `/` shows the NOVA EVRIKA hero with logo + 3 pills.
- Click "Фізика" → `/physics` shows lab card.
- Click "Почати лабораторну" → `/physics/mass-measurement` opens the existing lab (intro screen → enter → 3D scene works).
- Browser back to `/`, click "Математика" → `/math` shows "Скоро".
- `/history` works the same way.
- Hard-refresh `/physics/mass-measurement` (in dev this is auto-handled; in prod it needs the Vercel rewrite — verified post-deploy).

Stop the dev server (Ctrl+C).

- [ ] **Step 3: Commit (single atomic commit)**

```bash
git add package.json package-lock.json \
        src/app/App.tsx \
        src/main.tsx \
        src/site/ \
        vercel.json
git commit -m "feat(site): NOVA EVRIKA landing + subject routing

New top-level brand entry. /  → landing with logo + 3 subject pills.
/physics → list of physics labs (one card today, room for more).
/physics/mass-measurement → existing lab, internals untouched, just
moved from / to a deeper URL. /math + /history → polished 'Скоро'
placeholders so the platform shape is visible from day one.

src/site/ holds the new tree:
  content/subjects.ts  — registry, single source of truth for nav
  components/          — GlowBackground, BrandHero, SubjectPill, LabCard
  pages/               — LandingPage, PhysicsPage, ComingSoonPage
  styles/fonts.css     — Google Fonts: Inter (body) + Saira (display)

Brand mark uses public/nova-evrika-logo.png as-is (no SVG recreation
per user direction). Background is the static four-glow overlay
matching the lab's reveal-scene aesthetic — explicitly no animation
(rejected during brainstorm).

Single new dep: react-router-dom@7. vercel.json adds an SPA rewrite
so deep links survive hard refresh in production. No state, no test,
no lab-internals changes — 183/183 tests stay green."
```

- [ ] **Step 4: Verify clean tree**

```bash
git status
```

Expected: `nothing to commit, working tree clean`.

---

## Self-review

**Spec coverage:**
- §Routing → Task 11 (App.tsx router) + Task 13 (Vercel rewrite) ✓
- §File layout → Tasks 2–10 (every new file) ✓
- §Subject + lab registry → Task 2 (`subjects.ts` with exact contract) ✓
- §LandingPage description → Task 7 ✓
- §PhysicsPage description → Task 8 ✓
- §ComingSoonPage description → Task 9 ✓
- §Visual tokens (background, accent, fonts) → Task 3 (GlowBackground), Task 10 (fonts.css), inline in components ✓
- §Existing lab integration → Task 11 mounts the unchanged `<MassMeasurementLab/>` at `/physics/mass-measurement` ✓
- §File touch-list → matches one-to-one with the file map at the top of this plan ✓
- §Acceptance criteria 1–9 → covered by Task 14 verification + manual smoke ✓

**Placeholder scan:** every step has concrete file paths, complete code, and exact commands. No "TBD" / "implement later" / "similar to Task N" / "add appropriate handling".

**Type consistency:**
- `SubjectEntry`, `SubjectId`, `LabEntry`, `LabStatus` defined in Task 2 (`subjects.ts`).
- `SubjectPill` (Task 5), `LabCard` (Task 6), `LandingPage` (Task 7), `PhysicsPage` (Task 8), `ComingSoonPage` (Task 9) all import from `../content/subjects` and use the same names.
- `findSubject(id: SubjectId): SubjectEntry | undefined` exported from Task 2, consumed by Tasks 8 and 9 with that exact signature.
- `BrandHero` props `kicker?: string`, `tagline?: string`, `size?: 'large' | 'medium'` defined in Task 4. `LandingPage` uses `size="large"`; `PhysicsPage` and `ComingSoonPage` use `size="medium"`.
- Logo path `/nova-evrika-logo.png` referenced once in `BrandHero` (Task 4) and matches the file at `public/nova-evrika-logo.png`. `vercel.json` (Task 13) excludes this exact filename from the SPA rewrite via `(?!.*nova-evrika-logo.*)`.

No fixes needed.
