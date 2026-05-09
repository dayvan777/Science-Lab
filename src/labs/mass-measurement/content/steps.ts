import type { Step, StepTarget, TaskStepsMap } from '../../../sdk/guided/TaskSteps'

const objectIdToTarget = (objId: string): StepTarget =>
  ({ kind: 'object', id: objId })

function makeDigitalScaleSteps(_taskId: string, objectId: string): Step[] {
  const obj = objectIdToTarget(objectId)
  return [
    { id: 'pickup', target: obj, visualHint: 'arrow',
      hintTemplate: `Натисни і потримай ${objectId === 'tennis-ball' ? 'тенісний м\'яч' : objectId === 'apple' ? 'яблуко' : 'бейсбольний м\'яч'}`,
      complete: { kind: 'dragging', bodyPattern: objectId } },
    { id: 'place', target: { kind: 'instrument', id: 'digital-scale' }, visualHint: 'target-ring',
      hintTemplate: 'Перетягни на платформу електронних ваг',
      complete: { kind: 'snapped', targetPrefix: 'digital-scale' } },
    { id: 'read', target: { kind: 'instrument', id: 'digital-scale' }, visualHint: 'highlight',
      hintTemplate: 'Дисплей показує {digitalScaleGrams} г',
      complete: { kind: 'reading-stable', instrument: 'digital-scale', minValue: 1, durationMs: 1500 } },
    { id: 'enter', target: { kind: 'ui', id: 'input' }, visualHint: 'arrow',
      hintTemplate: 'Введи {digitalScaleGrams} у поле нижче',
      complete: { kind: 'input-focused' } },
    { id: 'submit', target: { kind: 'ui', id: 'submit' }, visualHint: 'arrow',
      hintTemplate: 'Натисни "Записати"',
      complete: { kind: 'submitted' } },
  ]
}

function makeDynamometerSteps(_taskId: string, objectId: string): Step[] {
  const obj = objectIdToTarget(objectId)
  return [
    { id: 'pickup', target: obj, visualHint: 'arrow',
      hintTemplate: 'Візьми предмет',
      complete: { kind: 'dragging', bodyPattern: objectId } },
    { id: 'hang', target: { kind: 'instrument', id: 'dynamometer-hook' }, visualHint: 'target-ring',
      hintTemplate: 'Підвісь на гачок динамометра',
      complete: { kind: 'snapped', targetPrefix: 'dynamometer-hook' } },
    { id: 'read', target: { kind: 'instrument', id: 'dynamometer-hook' }, visualHint: 'highlight',
      hintTemplate: 'Шкала показує {dynamometerNewtons} N',
      complete: { kind: 'reading-stable', instrument: 'dynamometer', minValue: 0.05, durationMs: 1500 } },
    { id: 'enter', target: { kind: 'ui', id: 'input' }, visualHint: 'arrow',
      hintTemplate: 'Введи значення в Ньютонах',
      complete: { kind: 'input-focused' } },
    { id: 'submit', target: { kind: 'ui', id: 'submit' }, visualHint: 'arrow',
      hintTemplate: 'Натисни "Записати"',
      complete: { kind: 'submitted' } },
  ]
}

function makeLeverBalanceSteps(_taskId: string, objectId: string): Step[] {
  const obj = objectIdToTarget(objectId)
  return [
    { id: 'pickup-object', target: obj, visualHint: 'arrow',
      hintTemplate: 'Візьми предмет',
      complete: { kind: 'dragging', bodyPattern: objectId } },
    { id: 'place-left', target: { kind: 'instrument', id: 'lever-balance-left' }, visualHint: 'target-ring',
      hintTemplate: 'Поклади на ЛІВУ чашу',
      complete: { kind: 'snapped', targetPrefix: 'lever-left' } },
    { id: 'pickup-weight', target: { kind: 'object', id: 'weight-any' }, visualHint: 'arrow',
      hintTemplate: 'Візьми гирьку',
      complete: { kind: 'dragging', bodyPattern: 'weight' } },
    { id: 'place-right', target: { kind: 'instrument', id: 'lever-balance-right' }, visualHint: 'target-ring',
      hintTemplate: 'Поклади на ПРАВУ чашу',
      complete: { kind: 'snapped', targetPrefix: 'lever-right' } },
    { id: 'balance-loop', target: { kind: 'instrument', id: 'lever-balance-right' }, visualHint: 'highlight',
      hintTemplate: 'Праворуч {leverRightPanGrams} г — додай/прибери поки не вирівняється',
      complete: { kind: 'lever-balanced', toleranceTilt: 0.05 } },
    { id: 'enter', target: { kind: 'ui', id: 'input' }, visualHint: 'arrow',
      hintTemplate: 'Маса = {leverRightPanGrams} г. Введи у поле',
      complete: { kind: 'input-focused' } },
    { id: 'submit', target: { kind: 'ui', id: 'submit' }, visualHint: 'arrow',
      hintTemplate: 'Натисни "Записати"',
      complete: { kind: 'submitted' } },
  ]
}

export const TASK_STEPS: TaskStepsMap = {
  t1: makeDigitalScaleSteps('t1', 'tennis-ball'),
  t2: makeLeverBalanceSteps('t2', 'tennis-ball'),
  t3: makeDynamometerSteps('t3', 'tennis-ball'),
  t4: makeDigitalScaleSteps('t4', 'apple'),
  t5: makeLeverBalanceSteps('t5', 'apple'),
  t6: makeDynamometerSteps('t6', 'apple'),
  t7: makeDigitalScaleSteps('t7', 'baseball'),
  t8: makeLeverBalanceSteps('t8', 'baseball'),
  t9: makeDynamometerSteps('t9', 'baseball'),
}
