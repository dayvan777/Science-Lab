export type ObjectId = 'tennis-ball' | 'apple' | 'baseball'
export type InstrumentId = 'digital-scale' | 'lever-balance' | 'dynamometer'
export type InputUnit = 'g' | 'N'

export type Task = {
  id: string
  objectId: ObjectId
  instrumentId: InstrumentId
  prompt: string
  hint: string
  expectedValue: number
  tolerance: number
  inputUnit: InputUnit
}

const G = 9.8
const massNewtons = (massGrams: number) => (massGrams / 1000) * G

const TENNIS = 58
const APPLE = 180
const BASEBALL = 145

export const tasks: Task[] = [
  {
    id: 't1', objectId: 'tennis-ball', instrumentId: 'digital-scale',
    prompt: "Виміряйте масу тенісного м'яча електронними вагами.",
    hint: "Покладіть м'яч на платформу і прочитайте значення на LCD.",
    expectedValue: TENNIS, tolerance: 0.05, inputUnit: 'g',
  },
  {
    id: 't2', objectId: 'tennis-ball', instrumentId: 'lever-balance',
    prompt: "Виміряйте масу тенісного м'яча важільними терезами.",
    hint: "Покладіть м'яч на ліву чашу. Додавайте гирьки на праву, поки балка не вирівняється.",
    expectedValue: TENNIS, tolerance: 0.10, inputUnit: 'g',
  },
  {
    id: 't3', objectId: 'tennis-ball', instrumentId: 'dynamometer',
    prompt: "Виміряйте вагу тенісного м'яча динамометром.",
    hint: "Чіпляйте м'яч на гачок і прочитайте силу натягу в Ньютонах.",
    expectedValue: massNewtons(TENNIS), tolerance: 0.10, inputUnit: 'N',
  },
  {
    id: 't4', objectId: 'apple', instrumentId: 'digital-scale',
    prompt: 'Виміряйте масу яблука електронними вагами.',
    hint: 'Покладіть яблуко на платформу.',
    expectedValue: APPLE, tolerance: 0.05, inputUnit: 'g',
  },
  {
    id: 't5', objectId: 'apple', instrumentId: 'lever-balance',
    prompt: 'Виміряйте масу яблука важільними терезами.',
    hint: 'Підбирайте гирьки до балансу.',
    expectedValue: APPLE, tolerance: 0.10, inputUnit: 'g',
  },
  {
    id: 't6', objectId: 'apple', instrumentId: 'dynamometer',
    prompt: 'Виміряйте вагу яблука динамометром.',
    hint: 'Чіпляйте на гачок, читайте Ньютони.',
    expectedValue: massNewtons(APPLE), tolerance: 0.10, inputUnit: 'N',
  },
  {
    id: 't7', objectId: 'baseball', instrumentId: 'digital-scale',
    prompt: "Виміряйте масу бейсбольного м'яча електронними вагами.",
    hint: "Покладіть м'яч на платформу.",
    expectedValue: BASEBALL, tolerance: 0.05, inputUnit: 'g',
  },
  {
    id: 't8', objectId: 'baseball', instrumentId: 'lever-balance',
    prompt: "Виміряйте масу бейсбольного м'яча важільними терезами.",
    hint: 'Підбирайте гирьки.',
    expectedValue: BASEBALL, tolerance: 0.10, inputUnit: 'g',
  },
  {
    id: 't9', objectId: 'baseball', instrumentId: 'dynamometer',
    prompt: "Виміряйте вагу бейсбольного м'яча динамометром.",
    hint: 'Чіпляйте на гачок.',
    expectedValue: massNewtons(BASEBALL), tolerance: 0.10, inputUnit: 'N',
  },
]
