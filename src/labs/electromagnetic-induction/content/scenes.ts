import type { Step } from '../../../sdk/guided/TaskSteps'

/**
 * The 5 EM-induction scenes. Each scene has a list of Steps the student
 * works through. Three motion-aware step kinds are unique to this lab and
 * detected by LabScene's useFrame loop (not by the SDK predicate engine):
 *
 *   'magnet-near-coil'         — magnet enters INFLUENCE_RADIUS for >= 1.5 s
 *   'magnet-leaving-coil'      — magnet exits influence radius after being inside
 *   'magnet-stationary-in-coil' — magnet inside coil + speed < 0.02 m/s for >= 2.0 s
 *
 * These are NOT in CompletionRule. LabScene watches readings and calls
 * advanceStep() directly when the conditions are met. Each Step below
 * uses a placeholder { kind: 'submitted' } completion for scenes where the
 * actual advance is motion-driven — LabScene short-circuits before the
 * SDK predicate is ever evaluated for those steps.
 */
export type EmStep = Step & {
  /**
   * Lab-local completion override. When set, LabScene watches the
   * corresponding readings and calls advanceStep() directly instead of
   * relying on the SDK's isStepComplete predicate.
   */
  motionTrigger?: 'magnet-near-coil' | 'magnet-leaving-coil' | 'magnet-stationary-in-coil'
}

export const SCENES: EmStep[][] = [
  // Scene 1 — Знайомство (intro, single advance step)
  [
    {
      id: 'intro-ack',
      target: { kind: 'ui', id: 'submit' },
      visualHint: 'highlight',
      hintTitle: 'Знайомство з обладнанням',
      hintExplanation:
        "Перед тобою — котушка з мідного дроту, гальванометр зі стрілкою і лампочка в одному електричному колі. " +
        "Ми будемо рухати магніт біля котушки і дослідимо, коли в колі виникає струм.",
      complete: { kind: 'submitted' },
    },
  ],

  // Scene 2 — Повільний рух
  [
    {
      id: 'pickup-slow',
      target: { kind: 'object', id: 'bar-magnet' },
      visualHint: 'arrow',
      hintTitle: 'Візьми магніт',
      hintExplanation: 'Натисни і утримуй магніт, щоб взяти його.',
      complete: { kind: 'dragging', bodyPattern: 'bar-magnet' },
    },
    {
      id: 'move-slow',
      target: { kind: 'instrument', id: 'coil' },
      visualHint: 'target-ring',
      hintTitle: 'Повільно піднеси магніт до котушки',
      hintExplanation: 'Зверни увагу на стрілку гальванометра і на лампочку. Не поспішай.',
      complete: { kind: 'submitted' },
      motionTrigger: 'magnet-near-coil',
    },
    {
      id: 'mc-slow',
      target: { kind: 'ui', id: 'input' },
      visualHint: 'highlight',
      hintTitle: 'Що відбувається з лампочкою при повільному русі?',
      choices: [
        { id: 'dark', label: 'Не світиться' },
        { id: 'bright', label: 'Світиться яскраво' },
        { id: 'weak', label: 'Світиться слабо' },
      ],
      complete: { kind: 'mc-selected', correctIndex: 0 },
    },
  ],

  // Scene 3 — Швидкий рух
  [
    {
      id: 'pickup-fast',
      target: { kind: 'object', id: 'bar-magnet' },
      visualHint: 'arrow',
      hintTitle: 'Тепер рухай магніт ШВИДКО крізь котушку',
      hintExplanation: 'Сильним рухом протягни магніт через котушку.',
      complete: { kind: 'dragging', bodyPattern: 'bar-magnet' },
    },
    {
      id: 'observe-fast',
      target: { kind: 'instrument', id: 'coil' },
      visualHint: 'target-ring',
      hintTitle: 'Подивись, що відбувається з гальванометром і лампочкою',
      complete: { kind: 'submitted' },
      motionTrigger: 'magnet-near-coil',
    },
    {
      id: 'mc-fast',
      target: { kind: 'ui', id: 'input' },
      visualHint: 'highlight',
      hintTitle: 'При швидкому русі лампочка...',
      choices: [
        { id: 'dark', label: 'Не світиться' },
        { id: 'bright', label: 'Світиться яскраво' },
        { id: 'same', label: 'Світиться так само як раніше' },
      ],
      complete: { kind: 'mc-selected', correctIndex: 1 },
    },
  ],

  // Scene 4 — Зміна напрямку
  [
    {
      id: 'pull-away',
      target: { kind: 'instrument', id: 'coil' },
      visualHint: 'arrow',
      hintTitle: 'Відведи магніт від котушки',
      hintExplanation: 'Спостерігай за напрямком, у який відхиляється стрілка гальванометра.',
      complete: { kind: 'submitted' },
      motionTrigger: 'magnet-leaving-coil',
    },
    {
      id: 'mc-direction',
      target: { kind: 'ui', id: 'input' },
      visualHint: 'highlight',
      hintTitle: 'Куди відхиляється стрілка, коли магніт ВИХОДИТЬ з котушки?',
      choices: [
        { id: 'right', label: 'Так само вправо' },
        { id: 'left', label: 'Вліво (інший бік)' },
        { id: 'none', label: 'Не відхиляється' },
      ],
      complete: { kind: 'mc-selected', correctIndex: 1 },
    },
  ],

  // Scene 5 — Нерухомий магніт
  [
    {
      id: 'place-inside',
      target: { kind: 'instrument', id: 'coil' },
      visualHint: 'target-ring',
      hintTitle: 'Поклади магніт всередину котушки і відпусти',
      hintExplanation: 'Магніт має лежати нерухомо всередині котушки.',
      complete: { kind: 'submitted' },
      motionTrigger: 'magnet-stationary-in-coil',
    },
    {
      id: 'mc-stationary',
      target: { kind: 'ui', id: 'input' },
      visualHint: 'highlight',
      hintTitle: 'Чому струму немає, хоча магніт у котушці?',
      choices: [
        { id: 'weak', label: 'Магніт занадто слабкий' },
        { id: 'no-change', label: 'Бо немає РУХУ — потрібна зміна потоку' },
        { id: 'broken', label: 'Котушка зламана' },
      ],
      complete: { kind: 'mc-selected', correctIndex: 1 },
    },
  ],
]
