import { describe, it, expect } from 'vitest'
import { tasks } from '../../src/lab/tasks'

describe('tasks', () => {
  it('has exactly 9 tasks (3 objects × 3 instruments)', () => {
    expect(tasks).toHaveLength(9)
  })
  it('each task has unique id', () => {
    const ids = tasks.map(t => t.id)
    expect(new Set(ids).size).toBe(9)
  })
  it('covers all 3 objects × 3 instruments combinations', () => {
    const pairs = tasks.map(t => `${t.objectId}-${t.instrumentId}`)
    expect(new Set(pairs).size).toBe(9)
  })
  it('every task has positive expectedValue and tolerance in (0, 1)', () => {
    for (const t of tasks) {
      expect(t.expectedValue).toBeGreaterThan(0)
      expect(t.tolerance).toBeGreaterThan(0)
      expect(t.tolerance).toBeLessThan(1)
    }
  })
  it('dynamometer tasks use Newton input unit', () => {
    const dynTasks = tasks.filter(t => t.instrumentId === 'dynamometer')
    for (const t of dynTasks) {
      expect(t.inputUnit).toBe('N')
    }
  })
  it('non-dynamometer tasks use gram input unit', () => {
    const others = tasks.filter(t => t.instrumentId !== 'dynamometer')
    for (const t of others) {
      expect(t.inputUnit).toBe('g')
    }
  })
})
