import { create } from 'zustand'

export type StepEngineState = {
  currentTaskIndex: number
  currentStepIndex: number
  draggingBodyId: string | null
  inputFocused: boolean
  lastSnapTargetId: string | null
  lastMCChoice: number | null
  readingStableSinceMs: number
  setDragging: (id: string | null) => void
  setInputFocused: (b: boolean) => void
  setLastSnap: (id: string | null) => void
  setLastMCChoice: (i: number | null) => void
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
  lastMCChoice: null,
  readingStableSinceMs: 0,
  setDragging: (id) => set({ draggingBodyId: id }),
  setInputFocused: (b) => set({ inputFocused: b }),
  setLastSnap: (id) => set({ lastSnapTargetId: id }),
  setLastMCChoice: (i) => set({ lastMCChoice: i }),
  setReadingStableSince: (ms) => set({ readingStableSinceMs: ms }),
  advanceStep: () => set(s => ({ currentStepIndex: s.currentStepIndex + 1 })),
  resetForTask: (taskIndex) => set({
    currentTaskIndex: taskIndex,
    currentStepIndex: 0,
    draggingBodyId: null,
    inputFocused: false,
    lastSnapTargetId: null,
    lastMCChoice: null,
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
    leverLeftPanGrams: number
    leverRightPanGrams: number
    lastMCChoice: number | null
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
      // Both pans must hold something, AND the masses must match within
      // toleranceGrams. The tilt angle is not consulted — it's a visual
      // cue only. This matches how a real balance is read: equal masses,
      // beam level. Half-gram tolerance covers floating-point drift in
      // the mass-summation while rejecting any meaningful imbalance.
      return (
        ctx.leverLeftPanGrams > 0 &&
        ctx.leverRightPanGrams > 0 &&
        Math.abs(ctx.leverLeftPanGrams - ctx.leverRightPanGrams) <= rule.toleranceGrams
      )
    case 'mc-selected':
      return ctx.lastMCChoice === rule.correctIndex
    case 'input-focused':
      return ctx.inputFocused
    case 'submitted':
      return ctx.submittedSinceMs > 0
  }
}
