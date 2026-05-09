import { create } from 'zustand'

export type StepEngineState = {
  currentTaskIndex: number
  currentStepIndex: number
  draggingBodyId: string | null
  inputFocused: boolean
  lastSnapTargetId: string | null
  readingStableSinceMs: number
  setDragging: (id: string | null) => void
  setInputFocused: (b: boolean) => void
  setLastSnap: (id: string | null) => void
  setReadingStableSince: (ms: number) => void
  advanceStep: () => void
  resetForTask: (taskIndex: number) => void
}

export const useStepEngine = create<StepEngineState>((set) => ({
  currentTaskIndex: 0,
  currentStepIndex: 0,
  draggingBodyId: null,
  inputFocused: false,
  lastSnapTargetId: null,
  readingStableSinceMs: 0,
  setDragging: (id) => set({ draggingBodyId: id }),
  setInputFocused: (b) => set({ inputFocused: b }),
  setLastSnap: (id) => set({ lastSnapTargetId: id }),
  setReadingStableSince: (ms) => set({ readingStableSinceMs: ms }),
  advanceStep: () => set(s => ({ currentStepIndex: s.currentStepIndex + 1 })),
  resetForTask: (taskIndex) => set({
    currentTaskIndex: taskIndex,
    currentStepIndex: 0,
    draggingBodyId: null,
    inputFocused: false,
    lastSnapTargetId: null,
    readingStableSinceMs: 0,
  }),
}))

/**
 * Pure function — given current state, current step's completion rule, and reading values,
 * decide whether the step is complete.
 */
export function isStepComplete(
  rule: import('./TaskSteps').CompletionRule,
  ctx: {
    draggingBodyId: string | null
    lastSnapTargetId: string | null
    digitalScaleGrams: number
    dynamometerNewtons: number
    leverBalanceTilt: number
    leverRightPanGrams: number
    readingStableSinceMs: number
    nowMs: number
    inputFocused: boolean
    submittedSinceMs: number  // 0 if not submitted; ms since submission otherwise
  }
): boolean {
  switch (rule.kind) {
    case 'dragging':
      return ctx.draggingBodyId !== null && ctx.draggingBodyId.includes(rule.bodyPattern)
    case 'snapped':
      return ctx.lastSnapTargetId !== null && ctx.lastSnapTargetId.startsWith(rule.targetPrefix)
    case 'reading-stable': {
      const value = rule.instrument === 'digital-scale' ? ctx.digitalScaleGrams : ctx.dynamometerNewtons
      return value >= rule.minValue && (ctx.nowMs - ctx.readingStableSinceMs) >= rule.durationMs
    }
    case 'lever-balanced':
      return Math.abs(ctx.leverBalanceTilt) < rule.toleranceTilt && ctx.leverRightPanGrams > 0
    case 'input-focused':
      return ctx.inputFocused
    case 'submitted':
      return ctx.submittedSinceMs > 0
  }
}
