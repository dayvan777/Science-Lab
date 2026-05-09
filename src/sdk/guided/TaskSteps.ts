export type StepTarget =
  | { kind: 'object'; id: string }
  | { kind: 'instrument'; id: string }
  | { kind: 'ui'; id: 'input' | 'submit' }

export type CompletionRule =
  | { kind: 'dragging'; bodyPattern: string }
  | { kind: 'snapped'; targetPrefix: string }
  | { kind: 'reading-stable'; instrument: string; minValue: number; durationMs: number }
  | { kind: 'lever-balanced'; toleranceTilt: number }
  | { kind: 'input-focused' }
  | { kind: 'submitted' }

export type Step = {
  id: string
  target: StepTarget
  visualHint: 'arrow' | 'glow' | 'target-ring' | 'highlight'
  hintTemplate: string
  complete: CompletionRule
}

export type TaskStepsMap = Record<string, Step[]>
