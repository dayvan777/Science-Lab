import type { Step } from '../../../sdk/guided/TaskSteps'

/**
 * Motion triggers unique to this lab. Same idiom as EM-induction:
 * SceneController watches lab state and calls advanceStep() directly
 * for these — the SDK predicate engine sees `complete: 'submitted'`.
 */
export type BdMotionTrigger =
  | 'pollen-observed'
  | 'gases-mixed'
  | 'liquid-mixed-partial'
  | 'time-lapse-reached'
  | 'temp-reached-hot'

export type BdStep = Step & { motionTrigger?: BdMotionTrigger }

export type BdScene = {
  title: string
  steps: BdStep[]
}

export const SCENES: BdScene[] = [
  // Scene 1 — Знайомство з молекулами
  {
    title: 'Знайомство з молекулами',
    steps: [
      {
        id: 'intro-ack',
        target: { kind: 'ui', id: 'submit' },
        visualHint: 'highlight',
        hintTitle: 'Зазирни в речовину',
        hintExplanation:
          'Уся матерія складається з крихітних частинок — молекул і атомів. ' +
          'Вони ніколи не зупиняються. Зараз ти бачиш збільшений шматочок газу.',
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

  // Scene 2 — Броунівський рух
  {
    title: 'Броунівський рух',
    steps: [
      {
        id: 'pickup-pollen',
        target: { kind: 'object', id: 'pollen' },
        visualHint: 'arrow',
        hintTitle: 'Візьми велику пилинку',
        hintExplanation: 'Натисни і утримуй пилинку на лотку зліва.',
        complete: { kind: 'dragging', bodyPattern: 'pollen' },
      },
      {
        id: 'place-pollen-in-box',
        target: { kind: 'instrument', id: 'glass-box' },
        visualHint: 'target-ring',
        hintTitle: 'Кинь її всередину коробки',
        complete: { kind: 'submitted' },
        motionTrigger: 'pollen-observed',
      },
      {
        id: 'observe-jiggle',
        target: { kind: 'ui', id: 'submit' },
        visualHint: 'highlight',
        hintTitle: 'Дивись, як пилинка хаотично смикається',
        hintExplanation:
          'Молекули газу невидимі — але вони штовхають пилинку з усіх боків. ' +
          'Натисни «Показати причину», щоб побачити їх.',
        complete: { kind: 'submitted' },
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

  // Scene 3 — Дифузія в газах
  {
    title: 'Дифузія в газах',
    steps: [
      {
        id: 'lift-divider',
        target: { kind: 'object', id: 'divider' },
        visualHint: 'arrow',
        hintTitle: 'Підніми перегородку догори',
        hintExplanation: 'Захопи ручку зверху і потягни вгору, щоб гази могли змішатись.',
        complete: { kind: 'dragging', bodyPattern: 'divider' },
      },
      {
        id: 'observe-mixing',
        target: { kind: 'instrument', id: 'glass-box' },
        visualHint: 'target-ring',
        hintTitle: 'Спостерігай, як гази повільно перемішуються',
        complete: { kind: 'submitted' },
        motionTrigger: 'gases-mixed',
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

  // Scene 4 — Дифузія в рідинах
  {
    title: 'Дифузія в рідинах',
    steps: [
      {
        id: 'pick-dropper',
        target: { kind: 'object', id: 'dropper' },
        visualHint: 'arrow',
        hintTitle: 'Візьми піпетку з чорнилом',
        complete: { kind: 'dragging', bodyPattern: 'dropper' },
      },
      {
        id: 'drop-ink',
        target: { kind: 'instrument', id: 'beaker' },
        visualHint: 'target-ring',
        hintTitle: 'Капни чорнило в мензурку з водою',
        complete: { kind: 'submitted' },
        motionTrigger: 'liquid-mixed-partial',
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

  // Scene 5 — Дифузія у твердих тілах
  {
    title: 'Дифузія у твердих тілах',
    steps: [
      {
        id: 'press-blocks',
        target: { kind: 'ui', id: 'submit' },
        visualHint: 'highlight',
        hintTitle: 'Метали притиснули один до одного',
        hintExplanation: 'Зверху — золото, знизу — олово. Натисни кнопку для початку експерименту.',
        complete: { kind: 'submitted' },
      },
      {
        id: 'time-lapse',
        target: { kind: 'ui', id: 'submit' },
        visualHint: 'highlight',
        hintTitle: 'Перетягни повзунок часу до 100 років і далі',
        hintExplanation: 'Дивись, як атоми золота повільно проникають у решітку олова.',
        complete: { kind: 'submitted' },
        motionTrigger: 'time-lapse-reached',
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

  // Scene 6 — Залежність від температури
  {
    title: 'Залежність від температури',
    steps: [
      {
        id: 'cycle-temp',
        target: { kind: 'ui', id: 'submit' },
        visualHint: 'highlight',
        hintTitle: 'Покрути «температуру» до «Гаряче»',
        hintExplanation: 'Кнопка-pill знизу праворуч. Дивись, як змінюється швидкість молекул.',
        complete: { kind: 'submitted' },
        motionTrigger: 'temp-reached-hot',
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
]
