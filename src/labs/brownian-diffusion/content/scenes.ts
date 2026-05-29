import type { Step } from '../../../sdk/guided/TaskSteps'

/**
 * Mission goals unique to this lab. LabScene.onTick watches lab + settings
 * state and calls setGoalReached(true) when the current goal step's trigger
 * is met. The SDK predicate engine sees `complete: 'submitted'`; the HUD
 * enables «Далі →» only once goalReached is true (no silent auto-advance).
 */
export type BdMotionTrigger =
  | 'molecules-shown'
  | 'tracer-jiggled'
  | 'gas-mixed'
  | 'liquid-mixed'
  | 'timelapse-reached'
  | 'temp-hot'

export type BdStep = Step & { motionTrigger?: BdMotionTrigger }
export type BdScene = { title: string; steps: BdStep[] }

export const SCENES: BdScene[] = [
  // 1 — Молекули не сплять
  {
    title: 'Молекули не сплять',
    steps: [
      {
        id: 'intro-ack',
        target: { kind: 'ui', id: 'submit' },
        visualHint: 'highlight',
        hintTitle: 'Зазирни в речовину',
        hintExplanation:
          'Уся матерія складається з крихітних частинок, що ніколи не зупиняються. ' +
          'Зараз ти бачиш збільшений шматочок газу. Покрути модель, познайомся.',
        complete: { kind: 'submitted' },
      },
      {
        id: 'mc-always-moving',
        target: { kind: 'ui', id: 'input' },
        visualHint: 'highlight',
        hintTitle: 'Чи завжди рухаються молекули?',
        choices: [
          { id: 'always', label: 'Так, завжди — навіть у твердих тілах' },
          { id: 'hot-only', label: 'Лише коли тепло' },
          { id: 'gas-only', label: 'Лише в газах' },
        ],
        complete: { kind: 'mc-selected', correctIndex: 0 },
      },
    ],
  },

  // 2 — Броунівський рух
  {
    title: 'Броунівський рух',
    steps: [
      {
        id: 'add-tracer',
        target: { kind: 'ui', id: 'submit' },
        visualHint: 'highlight',
        hintTitle: 'Додай тестову частинку',
        hintExplanation:
          'Натисни «＋ Тестова частинка». Велика пилинка застрибає — її штовхають ' +
          'невидимі молекули. Увімкни «Показати молекули», щоб переконатись.',
        complete: { kind: 'submitted' },
        motionTrigger: 'tracer-jiggled',
      },
      {
        id: 'mc-why-jiggle',
        target: { kind: 'ui', id: 'input' },
        visualHint: 'highlight',
        hintTitle: 'Чому велика частинка стрибає?',
        choices: [
          { id: 'invisible', label: 'Її штовхають невидимі молекули з усіх боків' },
          { id: 'alive', label: 'Бо вона жива' },
          { id: 'wind', label: 'Бо в коробці протяг' },
        ],
        complete: { kind: 'mc-selected', correctIndex: 0 },
      },
    ],
  },

  // 3 — Дифузія в газі
  {
    title: 'Дифузія в газі',
    steps: [
      {
        id: 'raise-divider',
        target: { kind: 'ui', id: 'submit' },
        visualHint: 'highlight',
        hintTitle: 'Підніми перегородку і доведи до повного змішування',
        hintExplanation:
          'Тумблер «Перегородка» прибере стінку. Стеж за шкалою «Перемішаність» — ' +
          'доведи її до 100%.',
        complete: { kind: 'submitted' },
        motionTrigger: 'gas-mixed',
      },
      {
        id: 'mc-final-state',
        target: { kind: 'ui', id: 'input' },
        visualHint: 'highlight',
        hintTitle: 'Що буде через певний час?',
        choices: [
          { id: 'uniform', label: 'Повне рівномірне змішування' },
          { id: 'separated', label: 'Залишаться окремо' },
          { id: 'reseparate', label: 'Розділяться знову на 2 кольори' },
        ],
        complete: { kind: 'mc-selected', correctIndex: 0 },
      },
    ],
  },

  // 4 — Дифузія в рідині
  {
    title: 'Дифузія в рідині',
    steps: [
      {
        id: 'drop-ink',
        target: { kind: 'ui', id: 'submit' },
        visualHint: 'highlight',
        hintTitle: 'Капни чорнило і поспостерігай',
        hintExplanation:
          'Колба вже з водою. Натисни «＋ Тестова частинка» — крапля чорнила повільно ' +
          'розходиться. У рідині дифузія повільніша, ніж у газі.',
        complete: { kind: 'submitted' },
        motionTrigger: 'liquid-mixed',
      },
      {
        id: 'mc-where-faster',
        target: { kind: 'ui', id: 'input' },
        visualHint: 'highlight',
        hintTitle: 'Де дифузія йде швидше?',
        choices: [
          { id: 'gas', label: 'У газі — молекули вільніші й швидші' },
          { id: 'liquid', label: 'У рідині — бо води більше' },
          { id: 'same', label: 'Однаково' },
        ],
        complete: { kind: 'mc-selected', correctIndex: 0 },
      },
    ],
  },

  // 5 — Дифузія у твердому
  {
    title: 'Дифузія у твердому',
    steps: [
      {
        id: 'time-lapse',
        target: { kind: 'ui', id: 'submit' },
        visualHint: 'highlight',
        hintTitle: 'Перемотай час до 100+ років',
        hintExplanation:
          'Зверху золото, знизу олово. Посунь повзунок «Час» до 100 років і далі — ' +
          'атоми ледь-ледь проникають один в одного. Дифузія в твердому дуже повільна.',
        complete: { kind: 'submitted' },
        motionTrigger: 'timelapse-reached',
      },
      {
        id: 'mc-solid-timescale',
        target: { kind: 'ui', id: 'input' },
        visualHint: 'highlight',
        hintTitle: 'Скільки часу йде дифузія в твердому?',
        choices: [
          { id: 'years', label: 'Десятки-сотні років' },
          { id: 'seconds', label: 'Декілька секунд' },
          { id: 'never', label: 'Зовсім не йде' },
        ],
        complete: { kind: 'mc-selected', correctIndex: 0 },
      },
    ],
  },

  // 6 — Температура вирішує
  {
    title: 'Температура вирішує',
    steps: [
      {
        id: 'heat-up',
        target: { kind: 'ui', id: 'submit' },
        visualHint: 'highlight',
        hintTitle: 'Зроби «Гаряче» і поспостерігай',
        hintExplanation:
          'Посунь повзунок «Температура» до «Гаряче». Молекули прискорюються, ' +
          'дифузія йде швидше.',
        complete: { kind: 'submitted' },
        motionTrigger: 'temp-hot',
      },
      {
        id: 'mc-temp-relationship',
        target: { kind: 'ui', id: 'input' },
        visualHint: 'highlight',
        hintTitle: 'Коли дифузія йде швидше?',
        choices: [
          { id: 'higher', label: 'При вищій температурі — молекули енергійніші' },
          { id: 'lower', label: 'При нижчій температурі' },
          { id: 'none', label: 'Температура не впливає' },
        ],
        complete: { kind: 'mc-selected', correctIndex: 0 },
      },
    ],
  },

  // 7 — Вільна пісочниця
  {
    title: 'Вільна пісочниця',
    steps: [
      {
        id: 'free-play',
        target: { kind: 'ui', id: 'submit' },
        visualHint: 'highlight',
        hintTitle: 'Грай вільно',
        hintExplanation:
          'Усі контроли відкриті — перемикай стани, грій, додавай молекули. ' +
          'Натисни «Далі →», коли закінчиш.',
        complete: { kind: 'submitted' },
      },
    ],
  },
]
