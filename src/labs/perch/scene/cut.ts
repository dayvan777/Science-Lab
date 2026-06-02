/** Clamp to [0,1]. */
export function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x))
}

/** Eased flap-open angle (radians) from cut progress 0..1. */
export function flapAngle(cutProgress: number, maxRad = 1.95): number {
  const p = clamp01(cutProgress)
  return p * p * (3 - 2 * p) * maxRad
}

/** Cut progress from drag distance (px) over the full guide span (px). */
export function cutProgressFromDrag(dragPx: number, fullPx: number): number {
  if (fullPx <= 0) return 0
  return clamp01(dragPx / fullPx)
}
