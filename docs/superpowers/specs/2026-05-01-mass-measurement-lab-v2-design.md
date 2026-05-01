# Лабораторна "Вимірювання маси тіл" v2 — дизайн-документ

**Дата:** 2026-05-01
**Статус:** Draft → під рев'ю
**Базується на:** [v1 дизайн-док](2026-04-29-mass-measurement-lab-design.md) та [v1 implementation plan](../plans/2026-04-29-mass-measurement-lab-implementation.md)
**Поточний стан коду:** v1 MVP завершений (Tasks 0-19), плюс bugfix-патчі (правильні позиції об'єктів, snap targets, live readings, step hints).

---

## 1. Контекст і мотивація

### Що показав v1 MVP

- Усі 19 запланованих code-задач виконано, 17 тестів проходять.
- Працює: drag-and-drop з фізикою, 3 прилади, snap targets, lab journal, summary screen.
- Виявлені на live-тестуванні проблеми:
  1. **Виглядає не "дорого"** — placeholder сфери/коробки з простими кольорами далекі від обіцяної в v1 фотореалістичної естетики.
  2. **Незрозуміло що відбувається на 3 рівнях:**
     - Що треба робити (недостатній візуальний фокус)
     - Як взаємодіяти (немає tutorial)
     - Що відбувається фізично (немає пояснень)

### Що хочемо у v2

Преміум-виглядаюча інтерактивна лабораторна, де учень 7 класу **не потребує жодних додаткових інструкцій від вчителя** — система проводить через все сама. Виглядає як продуктовий showcase Apple, відчувається як пройдена професійна edtech.

### Що НЕ робимо в v2

- Не додаємо нові лабораторні (тема залишається "вимірювання маси тіл")
- Не додаємо аудіо / voice-over
- Не платимо за 3D моделі (бюджет = 0)
- Не переписуємо архітектуру з нуля — зберігаємо весь код v1, що працює
- Не додаємо акаунти / LMS / бекенд

---

## 2. Архітектурні рішення (v2)

| Питання | Рішення (v2) |
|---|---|
| Масштаб | Серйозна переробка UX + візуалу |
| Стиль | Apple Studio (преміум продуктовий) |
| Усунення плутанини | Persistent guided mode з 3D overlay |
| Стратегія ассетів | 75% процедурно в коді + 1 опційний AI GLB |
| Аудіо | Немає |
| Підхід до v1 → v2 | Інкрементальна полірування поверх існуючого MVP (зберігаємо ~80% коду) |

---

## 3. Архітектура — що зберігається, що додається

### Зберігаємо без змін

```
src/utils/units.ts                 ← N↔g, tolerance
src/lab/LabState.ts                ← Zustand: phase, currentTaskIndex, journal, sessionId
src/lab/InstrumentReadings.ts      ← live readings store
src/lab/tasks.ts                   ← 9 task definitions
src/physics/useDrag.ts             ← drag-to-kinematic
src/physics/snapTargets.ts         ← snap registry (X/Z distance)
src/scene/CameraRig.tsx            ← presets (трохи розширимо для guided focus)
тести                               ← 17 проходять, додаємо для нових модулів
```

### Переробляємо (visual / UX overhaul)

```
src/scene/Lighting.tsx             → Apple Studio 3-point soft + HDRI для PBR-відбиттів
src/scene/LabScene.tsx             → додає <PostProcessing>, <StudioBackdrop>, <GuidedOverlay>
src/scene/Table.tsx                → ВИДАЛЯЄМО (Apple Studio без столу)
src/scene/instruments/*            → процедурна геометрія + якісні PBR матеріали + canvas detail textures
src/scene/objects/*                → процедурні sphere з canvas seam textures (м'ячі); опційно AI apple
src/lab/HUD.tsx                    → glassmorphism, нова композиція з guided integration
src/lab/IntroScreen.tsx            → cinematic reveal, Apple-style
src/lab/SummaryScreen.tsx          → animated results card
src/ui/Button.tsx                  → Apple HIG (continuous corners, multi-shadow)
src/ui/NumberInput.tsx             → custom touch numeric keyboard на panel
```

### Додаємо нові модулі

```
src/scene/PostProcessing.tsx       ← DOF, SSAO, bloom, color grading, vignette
src/scene/StudioBackdrop.tsx       ← infinite ground plane + gradient sky
src/scene/textures/                ← фабрики canvas-textures (LCD, dial, label)
  lcdTexture.ts                    ← вже є в DigitalScale, виносимо
  dialTexture.ts                   ← для динамометра
  labelTexture.ts                  ← для гирьок
  feltTexture.ts                   ← для тенісного м'яча
  seamTexture.ts                   ← для бейсбольного м'яча

src/guided/                        ← НОВА папка для guided mode
  TaskSteps.ts                     ← мікрокроки для 9 завдань
  StepEngine.ts                    ← Zustand: current step + auto-detect
  GuidedOverlay.tsx                ← рендерить 3D візуали активного кроку
  GuidedHUD.tsx                    ← textual hint + animation координація
  primitives/
    Arrow3D.tsx                    ← пульсуюча 3D-стрілка
    GlowRing.tsx                   ← target ring при snap zones
    HighlightOutline.tsx           ← обводка активного об'єкта
    PulseEffect.tsx                ← пульсація на target

src/ui/
  GlassPanel.tsx                   ← переюзабельна Apple-style glass панель
  TouchNumberKeypad.tsx            ← кастомна клавіатура для числового введення
  Tooltip.tsx                      ← contextual tooltips
```

### Стек залишається

React 19 + TypeScript 6 + Vite 8 + R3F 9 + drei 10 + rapier 2 + Zustand 5 + html-to-image.

### Нові залежності

```json
{
  "@react-three/postprocessing": "^3.x",   // DOF, SSAO, bloom, color grading
  "maath": "^0.10",                         // smooth easings (опційно)
  "framer-motion": "^11"                    // UI transitions (опційно, базові можна на CSS)
}
```

---

## 4. Візуальний стиль — Apple Studio

### Палітра

| Призначення | Hex | Використання |
|---|---|---|
| BG Top | `#fafafa` | верх градієнт-фону сцени |
| BG Mid | `#e8e8ed` | середина |
| BG Floor | `#cdcdd2` | низ (де "горизонт" злегка темніший) |
| Text Primary | `#1d1d1f` | основний текст у HUD |
| Text Secondary | `#6e6e73` | вторинні підписи |
| Accent (CTA) | `#0071e3` | Apple Blue для кнопок-дій, live readings |
| Success | `#34c759` | зелені галочки в журналі |
| Warning | `#ff9500` | жовті галочки |
| Error | `#ff3b30` | червоні галочки |

### Ground / Background

- Безшовний vertical gradient `#fafafa → #cdcdd2`, без видимого горизонту.
- Велика ground plane під об'єктами **приймає тіні**.
- HDRI: drei `<Environment preset="studio" background={false} />` тільки для PBR-відбиттів.

### Освітлення

- **Key**: drei `<RectAreaLight>` зверху-спереду, intensity 1.5, soft shadow.
- **Fill**: менший `<RectAreaLight>` протилежний бік, intensity 0.5.
- **Rim**: `<directionalLight>` ззаду, intensity 0.4, без тіні.
- **Ambient**: 0.15 (низько, бо HDRI дає більшість заповнення).

### Матеріали (PBR)

| Поверхня | metalness | roughness | Інше |
|---|---|---|---|
| Метал приладів (housing, stand) | 0.85 | 0.25 | envMapIntensity 1.5 |
| Гирьки | 0.7 | 0.45 | subtle wear via roughness map |
| Скло LCD | 0 | 0 | transmission 0.95, ior 1.5, thickness 0.005 |
| Спружина динамометра | 0.9 | 0.15 | polished steel |
| Чаші терезів | 0.6 | 0.4 | brushed aluminum |
| Тенісний м'яч | 0 | 0.85 | velvet-like |
| Бейсбольний м'яч | 0 | 0.6 | leather-like |
| Яблуко | 0 | 0.4 | glossy surface, slight subsurface look |
| Ground plane | 0 | 0.7 | дуже тонка noise normal map |

### Post-processing pipeline

Через `@react-three/postprocessing`:

```tsx
<EffectComposer>
  <DepthOfField focusDistance={0.7} focalLength={0.05} bokehScale={2} />
  <N8AO halfRes intensity={0.5} aoRadius={0.4} />
  <Bloom intensity={0.4} luminanceThreshold={0.95} />
  <ToneMapping mode={ACESFilmicToneMapping} />
  <Vignette eskil={false} offset={0.1} darkness={0.4} />
</EffectComposer>
```

DOF фокусується **на активному приладі поточного завдання** (читаємо з LabState).

### Камера

- Default position: `(0, 1.5, 2.0)`, FOV **35°** (телефото для compressed look).
- При зміні завдання — плавний lerp до preset активного приладу + DOF focus змінюється.
- Subtle parallax: `±2°` rotation на основі pointer position (drei `<MouseParallaxProvider>` або custom).

### Типографія

- Font stack: `"SF Pro Display", "Inter", system-ui, sans-serif`.
- Headings: weight 600, letter-spacing -0.5px.
- Body: weight 400, line-height 1.5.
- Captions: 11-12px, opacity 0.6, weight 500.
- Live reading numbers: 32-48px, weight 700, monospace tabular-nums.

---

## 5. Стратегія ассетів — 75% процедурно

### Розподіл ассетів

| Об'єкт | Підхід | Деталі |
|---|---|---|
| Тенісний м'яч | Процедурно: SphereGeometry + canvas felt + curved seam line | 0 КБ |
| Яблуко | AI-GLB Meshy free tier АБО sphere з displacement (план Б) | ~500 КБ або 0 |
| Бейсбольний м'яч | Процедурно: sphere + canvas red-stitching seam | 0 КБ |
| 7 гирьок | Процедурно: cylinder + cone top + canvas engraved label | 0 КБ, точні номінали |
| Електронні ваги | Процедурно: rounded box housing + canvas LCD + тактильна кнопка | 0 КБ |
| Динамометр | Процедурно: stand + helix-spring TubeGeometry + canvas dial + torus hook | 0 КБ |
| Важільні терези | Процедурно: stand + beam (rounded box) + 2 pans + needle | 0 КБ |
| Ground plane | Процедурно: infinite plane + subtle noise normal | 0 КБ |

### Canvas-textures (фабрики)

Усі канвас-текстури — `useMemo` фабрики, рендеряться один раз. Розміри:

- LCD дисплей (digital scale): 256×96
- Dial face (dynamometer): 64×256
- Engraved label (weights): 128×64
- Felt (tennis ball): 256×256 (procedural noise)
- Seam (baseball): 512×256 (red curved stitches)

### План Б для AI-яблука

Якщо Meshy generation якісно не виходить — sphere з noise displacement + red glossy PBR material + small green stem (cylinder) on top. Виглядає як стилізоване яблуко, ідеально пасує Apple Studio мінімалізму.

### Procedural helix spring (динамометр)

`TubeGeometry` зі spline curve, що робить helix:
```ts
const HELIX_TURNS = 12
const points = []
for (let i = 0; i <= 100; i++) {
  const t = i / 100
  const angle = t * HELIX_TURNS * Math.PI * 2
  const y = t * springLength
  points.push(new Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius))
}
```

При натязі змінюється `springLength` — `TubeGeometry` перебудовується через `useMemo([springLength])`.

**План Б**: cylinder з UV-mapped "spring stripes" текстурою. Виглядає 90% так само, набагато простіше.

---

## 6. Persistent Guided Mode — серце v2

### Концепція

Кожне з 9 завдань ділиться на 4-7 мікрокроків. Активний крок підсвічується **в 3D-сцені** (стрілки, glow, target rings) та **в HUD** (текстова підказка). Auto-detection переходить між кроками без явної дії учня.

### Структура мікрокроку

```ts
type StepTarget =
  | { kind: 'object'; id: 'tennis-ball' | 'apple' | 'baseball' | `weight-${number}` }
  | { kind: 'instrument'; id: 'digital-scale' | 'lever-balance-left' | 'lever-balance-right' | 'dynamometer-hook' }
  | { kind: 'ui'; id: 'input' | 'submit' | 'next-task' }

type CompletionRule =
  | { kind: 'dragging'; bodyId: string }
  | { kind: 'snapped'; targetId: string }
  | { kind: 'reading-stable'; instrument: 'digital-scale' | 'dynamometer'; minValue?: number; durationMs: number }
  | { kind: 'lever-balanced'; tolerance: number; rightPanMass: number }
  | { kind: 'input-focused' }
  | { kind: 'submitted' }

type Step = {
  id: string
  target: StepTarget
  hint: (ctx: StepContext) => string  // dynamic hint, e.g. "На правій {N} г, додай ще..."
  visualHint: 'arrow' | 'glow' | 'target-ring' | 'highlight'
  complete: CompletionRule
}

type TaskGuidance = {
  taskId: string  // matches tasks.ts ids: t1..t9
  steps: Step[]
}
```

### Приклад: Завдання 1 (Digital Scale, Tennis Ball)

```ts
{
  taskId: 't1',
  steps: [
    {
      id: 'pickup',
      target: { kind: 'object', id: 'tennis-ball' },
      hint: () => 'Натисни і потримай тенісний м\'яч',
      visualHint: 'arrow',
      complete: { kind: 'dragging', bodyId: 'tennis-ball' },
    },
    {
      id: 'place',
      target: { kind: 'instrument', id: 'digital-scale' },
      hint: () => 'Перетягни м\'яч на платформу електронних ваг',
      visualHint: 'target-ring',
      complete: { kind: 'snapped', targetId: 'digital-scale' },
    },
    {
      id: 'read',
      target: { kind: 'instrument', id: 'digital-scale' },
      hint: ({ digitalScaleGrams }) => `Дисплей показує ${digitalScaleGrams} г`,
      visualHint: 'highlight',
      complete: { kind: 'reading-stable', instrument: 'digital-scale', durationMs: 1500 },
    },
    {
      id: 'enter',
      target: { kind: 'ui', id: 'input' },
      hint: ({ digitalScaleGrams }) => `Введи ${digitalScaleGrams} у поле нижче`,
      visualHint: 'arrow',
      complete: { kind: 'input-focused' },
    },
    {
      id: 'submit',
      target: { kind: 'ui', id: 'submit' },
      hint: () => 'Натисни "Записати"',
      visualHint: 'arrow',
      complete: { kind: 'submitted' },
    },
  ],
}
```

### Приклад: Завдання 5 (Lever Balance, Apple) — найскладніше

7 мікрокроків з адаптивним loop-кроком:

1. `pickup-apple` — взяти яблуко
2. `place-on-left` — покласти на ліву чашу (snapped: lever-balance-left)
3. `pickup-weight` — взяти будь-яку гирьку
4. `place-on-right` — покласти гирьку на праву чашу (snapped: lever-balance-right)
5. `balance-loop` — **адаптивний крок** з dynamic hint:
   - якщо `leverRightPanGrams === 0`: "Поклади гирьки на праву чашу"
   - якщо `leverBalanceTilt < -0.05` (ліва важча): "На правій {N} г, додай ще ~{180-N} г"
   - якщо `leverBalanceTilt > 0.05` (права важча): "На правій {N} г — забагато, прибери малу гирьку"
   - якщо `|tilt| < 0.05`: ✓ умова виконана, переходимо далі
6. `read-result` — "Балка вирівняна! Маса яблука = {leverRightPanGrams} г"
7. `enter` + `submit` — те саме що скрізь

### StepEngine (Zustand store)

```ts
type StepEngineState = {
  currentStepIndex: number
  inputFocused: boolean
  draggingBodyId: string | null
  setInputFocused: (b: boolean) => void
  setDragging: (id: string | null) => void
  // auto-advance викликається з useFrame в GuidedOverlay
  tryAdvance: (ctx: StepContext) => void
  // викликається при reset / новому завданні
  resetForTask: (taskIndex: number) => void
}
```

`StepContext` — об'єднання поточних reading-store значень + flags (dragging, focused, submitted-recently). Передається кожен кадр для перевірки `complete` правил.

### Visual primitives (3D)

#### Arrow3D
- 3D pulsing arrow, position computed from world-position of target object
- Animates: pulsing scale (1.0 ↔ 1.15) + bobbing y-offset (sin wave)
- Color: `#0071e3` (Apple Blue) для звичайного, `#34c759` (success) при наближенні до цілі
- Реалізовано через `<group>` з ConeGeometry + LineGeometry shaft + animation via useFrame

#### GlowRing
- Pulsing ring at snap target world position
- Two concentric rings: outer expands and fades (every 1.5s), inner stays, glowing
- Color: `#0071e3`, opacity animation

#### HighlightOutline
- Wraps a target mesh з drei `<Outlines>` (вже використовуємо для активного приладу)
- Цей primitive просто tweaks existing usage — змінюється колір з yellow на blue для guided context

#### PulseEffect (UI overlay)
- HTML/CSS animation навколо input field або submit button
- `box-shadow` pulse animation, 1s loop

### Skip guidance toggle

В HUD маленький pill-button: `🎓 Гід: Увімк` / `🎓 Гід: Вимк`. При вимкненні:
- GuidedOverlay перестає рендеритися
- HUD task panel показує тільки базову `prompt + hint` (як зараз)
- Live reading + step counter залишаються (вони корисні і без guidance)

Стан зберігається в `localStorage`. Default: ON (для нового учня).

---

## 7. UI Redesign — Apple HIG

### Принципи

- **Glassmorphism**: `background: rgba(255,255,255,0.7); backdrop-filter: blur(40px); border: 1px solid rgba(255,255,255,0.18)`
- **Continuous corners**: border-radius 16/12/8 — більший для більших елементів
- **Multi-layer shadows**: `0 1px 2px rgba(0,0,0,0.04), 0 8px 16px rgba(0,0,0,0.08), 0 30px 60px -10px rgba(0,0,0,0.15)`
- **Spring easings**: `cubic-bezier(0.34, 1.56, 0.64, 1)` для bounce, 200-400ms
- **Touch tap-targets**: мінімум 56px (раніше 56) → **80px на Promethean** для великих пальців і променевого зору на 75"

### IntroScreen (cinematic reveal)

- Чистий `#fafafa` фон, без gradient
- 3D-логотип через drei `<Text3D>` повільно обертається, потім morphs into 3D scene view
- Заголовок "Лабораторна робота" fade-in (300ms delay), thin weight 200, large 56px
- Subtitle "Вимірювання маси тіл" fade-in (500ms delay), 32px, weight 400
- Description fade-in (800ms delay)
- CTA "Почати" appear last, з micro-bounce, primary blue
- При натисканні CTA — camera dolly-in transition на overview ракурс LabScene

### HUD Layout (LabScene)

```
┌──────────────────────────────────────────────────────────┐
│      [Top floating pill: "Лабораторна · 3 з 9"]          │
│                                                            │
│  ┌──────────────────┐                ┌──────────────────┐│
│  │ Зараз робимо:    │                │ Лабжурнал        ││
│  │                  │     [3D]       │ ┌─────────────┐  ││
│  │ Перетягни м'яч   │                │ │ ✓ 1. tennis │  ││
│  │ на платформу     │                │ │ ✓ 2. tennis │  ││
│  │ ваг              │                │ │ → 3. apple  │  ││
│  │                  │                │ │   4. ...    │  ││
│  │ Прогрес: ●●○○○   │                │ └─────────────┘  ││
│  │                  │                │                  ││
│  │ Прилад показує:  │                │                  ││
│  │   180 г          │                │                  ││
│  └──────────────────┘                └──────────────────┘│
│                                                            │
│            ┌───────────────────────────────┐              │
│            │  [Введи: ___ г]  [Записати]   │              │
│            └───────────────────────────────┘              │
│                                                            │
│  [🎓 Гід: ON]                              [Камера ↺ ⊕]   │
└──────────────────────────────────────────────────────────┘
```

### TouchNumberKeypad

При тапі на input field викликається modal з кастомною клавіатурою:

```
┌────────────────────┐
│       180          │  ← display
├────────────────────┤
│  1   2   3         │
│  4   5   6         │
│  7   8   9         │
│  ←   0   ✓         │  ← back, zero, confirm
└────────────────────┘
```

- Кнопки 80×80px, glass background, big text
- ✓ закриває modal і submits value
- ← стирає останню цифру

### SummaryScreen — animated reveal

```
[Stage 1: 0-500ms]   "Лабораторну виконано" fade-in
[Stage 2: 500-1000ms] Big stat: "9 з 9 завдань" count-up animation
[Stage 3: 1000-1500ms] Color summary: "🟢 7  🟡 1  🔴 1" stagger-in
[Stage 4: 1500ms+]   Each row appears 100ms apart from top to bottom
[Stage 5: 2500ms]    CTA buttons appear: "📷 Скачати звіт" + "Почати знову"
[Background]         If exact >= 7/9: subtle confetti particles for 3s
```

Експорт у PNG через існуючий `html-to-image` — rendered card зберігає glassmorphism look.

### Buttons — Apple HIG

Primary:
```css
background: #0071e3;
color: white;
padding: 14px 32px;
border-radius: 12px;
font-weight: 600;
font-size: 16px;
box-shadow: 0 1px 2px rgba(0,0,0,0.1), 0 4px 12px rgba(0,113,227,0.3);
transition: transform 150ms cubic-bezier(0.34, 1.56, 0.64, 1);
:active { transform: scale(0.96); }
:focus-visible { outline: 3px solid rgba(0,113,227,0.3); outline-offset: 2px; }
```

Secondary (camera buttons):
```css
background: rgba(255,255,255,0.7);
backdrop-filter: blur(20px);
color: #0071e3;
border: 1px solid rgba(0,113,227,0.2);
```

### Transitions

`framer-motion` (опційно) для:
- IntroScreen → LabScene: title fade out + camera dolly-in (R3F side)
- Між мікрокроками: HUD hint slide-in left + slide-out left of previous (200ms)
- LabScene → SummaryScreen: 3D scene blur + summary card slide-up з низу

---

## 8. Фази впровадження

### Phase 1 — Visual Foundation (3-4 дні)

- Видалити `Table.tsx` з рендеру
- Створити `StudioBackdrop.tsx` (gradient + ground plane)
- Переробити `Lighting.tsx` (3-point soft + HDRI)
- Створити `PostProcessing.tsx` (DOF, SSAO, bloom, tone mapping, vignette)
- Тюнити PBR materials на існуючих placeholder примітивах
- **Контрольна точка**: сцена виглядає в 3 рази дорожче, навіть зі сферами

### Phase 2 — Procedural Assets (4-5 днів)

- Винести canvas-texture фабрики в `src/scene/textures/`
- Procedural digital scale (rounded box + LCD + button)
- Procedural dynamometer (stand + helix spring + dial + hook)
- Procedural lever balance (improved beam + needle + pans)
- Procedural weights (cylinder + cone top + canvas label)
- Procedural balls (felt/seam textures)
- AI yapple OR procedural displacement-sphere apple
- **Контрольна точка**: усі прилади виглядають справжніми

### Phase 3 — UI Redesign (3-4 дні)

- Створити `GlassPanel.tsx`
- Переробити Button.tsx (Apple HIG)
- Переробити NumberInput.tsx + TouchNumberKeypad
- Переробити HUD.tsx (нова композиція + glassmorphism)
- Переробити IntroScreen.tsx (cinematic reveal)
- Переробити SummaryScreen.tsx (animated reveal)
- **Контрольна точка**: UI виглядає преміум

### Phase 4 — Guided Core (5-6 днів)

- `TaskSteps.ts` (мікрокроки для всіх 9 завдань)
- `StepEngine.ts` (Zustand + auto-detection)
- `GuidedOverlay.tsx` + 4 primitives (Arrow3D, GlowRing, HighlightOutline, PulseEffect)
- Інтеграція з LabScene та HUD
- "Skip guidance" toggle + localStorage
- Тести для StepEngine (pure logic)
- **Контрольна точка**: учень проходить лабораторну вперше без вчителя

### Phase 5 — Guided Polish (2-3 дні)

- Адаптивні підказки для важільних терезів (loop step)
- Camera auto-zoom на активний прилад при зміні завдання
- Transition animations між мікрокроками (CSS keyframes; framer-motion тільки якщо CSS не дає бажаної якості — див. R6)
- DOF focus автоматично змінюється з активним приладом
- **Контрольна точка**: переходи плавні, "відчуття потоку"

### Phase 6 — Final polish (2-3 дні)

- Confetti particles на SummaryScreen
- Micro-interactions (button hover, ripples)
- Performance tuning (adaptive quality для Promethean)
- Manual QA на Promethean панелі
- Build + deploy на Cloudflare Pages
- **Контрольна точка**: реліз

**Загалом:** 19-25 днів роботи. 4-5 тижнів повного фокусу, 6-8 тижнів з overhead.

---

## 9. Ризики і mitigations

### R1: Post-processing просаджує FPS на Promethean

DOF + SSAO + bloom на 4K — серйозне навантаження.

**Mitigation:** Adaptive quality. На старті заміряти FPS через 3 секунди:
- FPS < 30 → відключаємо DOF, SSAO заміняємо на baked AO у текстурах, dpr знижуємо до 1.0
- FPS 30-50 → знижуємо dpr до 1.5, bloom ↓
- FPS > 50 → full quality

Стан зберігається в localStorage щоб не повторювати.

### R2: Procedural helix spring дає артефакти

TubeGeometry на тонкому радіусі може виглядати дивно при сильному натязі.

**Mitigation:** План Б — cylinder з UV-mapped texture "spring stripes". Виглядає 90% так само з розгляду на Promethean, набагато простіше реалізувати.

### R3: Auto-detection "user is reading the dial"

Чітко визначити "учень дивиться на прилад" неможливо без eye tracking.

**Mitigation:** Спрощено — крок "read" чекає 1.5 сек після reading стає ненульовим. Якщо учень не дивиться — нестрашно, наступний крок вимагає ввести значення.

### R4: Apple HIG не ідеально транслюється на Promethean

iPhone HIG для пальця-на-склі. Promethean — рука з 1м відстані на 75" 4K.

**Mitigation:** Збільшені tap-targets (56px → 80px), 18px base font (замість 14), потовщені stroke-widths іконок. Тестуємо рано на реальному пристрої (Phase 1 + Phase 4).

### R5: AI-generated apple виглядає дивно

Meshy free tier якість непередбачувана.

**Mitigation:** План Б — sphere з noise displacement + glossy red material + green stem cylinder. Виглядає як стилізоване яблуко, відповідає Apple Studio.

### R6: framer-motion збільшить bundle size

Bundle вже 3.4 МБ, додавання framer-motion (~80 KB) ще збільшить.

**Mitigation:** Більшість transitions можна на CSS animations. framer-motion використовуємо тільки якщо явно потрібен (e.g., spring physics на summary card). Опційна dep.

---

## 10. Тестування

### Unit (vitest)

- `StepEngine` — auto-detection rules для кожного типу complete умови
- `TaskSteps` — валідність декларацій (всі 9 task'ів мають step trees, всі step IDs унікальні в межах task'у)
- Існуючі 17 тестів зберігаються

### Manual QA — обов'язкові точки

Після кожної фази на Chrome desktop. Окремо на Promethean:
- Phase 1 (visual foundation) — перевіряємо FPS, post-processing якість
- Phase 4 (guided core) — повний прохід лабораторної без втручання
- Phase 6 (final polish) — повний release-test

### Performance benchmark

- Цільовий 60 FPS при максимальній якості на типовій Promethean (Snapdragon 8cx або Windows OPS Core i5+)
- Min acceptable 30 FPS на старіших панелях

---

## 11. Out of scope для v2

- Інші лабораторні роботи (це окремий v3)
- LMS / акаунти / вчительський dashboard
- Voice-over / sound effects
- Кастомний ground plane texture (e.g., school logo)
- Multi-language (тільки українська)

---

## 12. Що далі

Після затвердження цього дизайну — переходимо до writing-plans skill для створення детального implementation plan з task-by-task розбивкою.
