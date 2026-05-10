import type { SoundId } from '../audio/SoundManager'

export type StepTarget =
  | { kind: 'object'; id: string }
  | { kind: 'instrument'; id: string }
  | { kind: 'ui'; id: 'input' | 'submit' }

export type CompletionRule =
  | { kind: 'dragging'; bodyPattern: string }
  | { kind: 'snapped'; targetPrefix: string }
  | { kind: 'reading-stable'; instrument: string; minValue: number; durationMs: number }
  | {
      /**
       * Both pans non-empty AND |leftPanGrams - rightPanGrams| ≤ toleranceGrams.
       * Tilt angle is purely a visual cue and is not consulted — the truth is
       * the mass equality, which is what classical balance pedagogy teaches.
       */
      kind: 'lever-balanced'
      toleranceGrams: number
    }
  | { kind: 'input-focused' }
  | { kind: 'submitted' }

export type Step = {
  id: string
  target: StepTarget
  visualHint: 'arrow' | 'glow' | 'target-ring' | 'highlight'
  /** Legacy single-line hint. Prefer hintTitle + hintExplanation. */
  hintTemplate?: string
  /** Short instruction (what to do). Required for new content. */
  hintTitle?: string
  /** Educational "why" context shown below the title. Optional. */
  hintExplanation?: string
  /** Milliseconds to wait after completion before advancing. */
  micropause?: number
  /** Sound to play on completion. */
  sound?: SoundId
  complete: CompletionRule
}

export type TaskStepsMap = Record<string, Step[]>
