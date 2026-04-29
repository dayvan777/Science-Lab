export const G = 9.8

export function newtonsToGrams(n: number): number {
  return (n / G) * 1000
}

export function gramsToNewtons(g: number): number {
  return (g / 1000) * G
}

export function withinTolerance(value: number, expected: number, tolerance: number): boolean {
  if (expected === 0) return value === 0
  const delta = Math.abs(value - expected)
  return delta / Math.abs(expected) <= tolerance
}
