export type ObjectId = 'tennis-ball' | 'apple' | 'baseball'
export type InstrumentId = 'digital-scale' | 'lever-balance' | 'dynamometer'
export type InputUnit = 'g' | 'N'

export type Task = {
  id: string
  objectId: ObjectId
  instrumentId: InstrumentId
  /** Human-readable name shown in the journal (e.g. "Пінг-понговий м'ячик"). */
  displayName: string
  prompt: string
  hint: string
  expectedValue: number
  tolerance: number
  inputUnit: InputUnit
}

const G = 9.8
const massNewtons = (massGrams: number) => (massGrams / 1000) * G

// NOTE: internal objectIds ('tennis-ball', 'apple') stay unchanged for
// back-compat with Step DSL completion rules; only visuals/masses/labels are updated.
// 'tennis-ball' is now visually a ping-pong ball, 'apple' is now a metal ball.
const PING_PONG = 5    // grams — light plastic
const METAL_BALL = 250 // grams — dense steel
const BASEBALL = 145   // grams — unchanged

export const tasks: Task[] = [
  {
    id: 't1', objectId: 'tennis-ball', instrumentId: 'digital-scale',
    displayName: "Пінг-понговий м'ячик",
    prompt: "Виміряйте масу пінг-понгового м'ячика електронними вагами.",
    hint: "Покладіть м'ячик на платформу і прочитайте значення на LCD.",
    expectedValue: PING_PONG, tolerance: 0.20, inputUnit: 'g',
  },
  {
    id: 't2', objectId: 'tennis-ball', instrumentId: 'lever-balance',
    displayName: "Пінг-понговий м'ячик",
    prompt: "Виміряйте масу пінг-понгового м'ячика важільними терезами.",
    hint: "Покладіть м'ячик на ліву чашу. Додавайте гирьки на праву, поки балка не вирівняється.",
    expectedValue: PING_PONG, tolerance: 0.20, inputUnit: 'g',
  },
  {
    id: 't3', objectId: 'tennis-ball', instrumentId: 'dynamometer',
    displayName: "Пінг-понговий м'ячик",
    prompt: "Виміряйте вагу пінг-понгового м'ячика динамометром.",
    hint: "Чіпляйте м'ячик на гачок і прочитайте силу натягу в Ньютонах.",
    expectedValue: massNewtons(PING_PONG), tolerance: 0.20, inputUnit: 'N',
  },
  {
    id: 't4', objectId: 'apple', instrumentId: 'digital-scale',
    displayName: 'Металева кулька',
    prompt: 'Виміряйте масу металевої кульки електронними вагами.',
    hint: 'Покладіть кульку на платформу.',
    expectedValue: METAL_BALL, tolerance: 0.05, inputUnit: 'g',
  },
  {
    id: 't5', objectId: 'apple', instrumentId: 'lever-balance',
    displayName: 'Металева кулька',
    prompt: 'Виміряйте масу металевої кульки важільними терезами.',
    hint: 'Покладіть кульку ліворуч, підбирайте гирьки до балансу.',
    expectedValue: METAL_BALL, tolerance: 0.10, inputUnit: 'g',
  },
  {
    id: 't6', objectId: 'apple', instrumentId: 'dynamometer',
    displayName: 'Металева кулька',
    prompt: 'Виміряйте вагу металевої кульки динамометром.',
    hint: 'Чіпляйте кульку на гачок, читайте Ньютони.',
    expectedValue: massNewtons(METAL_BALL), tolerance: 0.10, inputUnit: 'N',
  },
  {
    id: 't7', objectId: 'baseball', instrumentId: 'digital-scale',
    displayName: "Бейсбольний м'яч",
    prompt: "Виміряйте масу бейсбольного м'яча електронними вагами.",
    hint: "Покладіть м'яч на платформу.",
    expectedValue: BASEBALL, tolerance: 0.05, inputUnit: 'g',
  },
  {
    id: 't8', objectId: 'baseball', instrumentId: 'lever-balance',
    displayName: "Бейсбольний м'яч",
    prompt: "Виміряйте масу бейсбольного м'яча важільними терезами.",
    hint: 'Підбирайте гирьки до балансу.',
    expectedValue: BASEBALL, tolerance: 0.10, inputUnit: 'g',
  },
  {
    id: 't9', objectId: 'baseball', instrumentId: 'dynamometer',
    displayName: "Бейсбольний м'яч",
    prompt: "Виміряйте вагу бейсбольного м'яча динамометром.",
    hint: 'Чіпляйте на гачок.',
    expectedValue: massNewtons(BASEBALL), tolerance: 0.10, inputUnit: 'N',
  },
]
