import { Particle } from './particles'
import { DividerState } from './kinetics'

export const BOX_HALF_Y = 0.10

/**
 * Map the divider's handle Y (world-local, relative to box centre) to a
 * DividerState. The handle is mounted at the TOP edge of the divider
 * wall; as the student drags the handle up, openHeightY descends — i.e.
 * the gap above the divider grows from 0 (closed) to 2·BOX_HALF_Y (fully
 * open). Returns null when the handle has lifted above the box ceiling.
 */
export function dividerStateAt(handleY: number): DividerState {
  if (handleY > BOX_HALF_Y + 0.04) return null  // 4cm above box → fully removed
  const span = 2 * BOX_HALF_Y
  const fraction = Math.max(0, Math.min(1, (BOX_HALF_Y - handleY) / span))
  const openHeightY = -BOX_HALF_Y + fraction * span
  return { x: 0, openHeightY }
}

/**
 * "Mixed-ness" of two-colour particle population: 0 = fully segregated
 * (all red on one side, all blue on the other), 1 = perfectly balanced
 * (50/50 in each half). Intermediate values scale linearly.
 *
 * Used by Scene 3 motion trigger 'gases-mixed' — fires when >= 0.6.
 */
export function fractionMixed(particles: Particle[]): number {
  let redLeft = 0, redRight = 0, blueLeft = 0, blueRight = 0
  for (const p of particles) {
    const left = p.pos.x < 0
    if (p.kind === 'red')  left ? redLeft++  : redRight++
    if (p.kind === 'blue') left ? blueLeft++ : blueRight++
  }
  const redTotal = redLeft + redRight
  const blueTotal = blueLeft + blueRight
  if (redTotal === 0 || blueTotal === 0) return 0
  const redRightFrac = redRight / redTotal
  const blueLeftFrac = blueLeft / blueTotal
  return Math.min(1, (redRightFrac + blueLeftFrac) / 1.0)
}
