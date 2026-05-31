/** World-space point in front of the chest where an extracted organ is displayed. */
export const EXTRACT_ANCHOR: [number, number, number] = [0, 0.5, 0.55]

/** Opacity of organs that are NOT the selected one (when something is selected). */
export const ORGAN_FADED_OPACITY = 0.05
/** Resting opacity of the body skin shell. */
export const BODY_REST_OPACITY = 0.2
/** Body skin opacity while an organ is extracted. */
export const BODY_FADED_OPACITY = 0.035

/**
 * Frame-rate-independent damping alpha for lerping toward a target.
 * Larger `smoothing` => snappier. Returns a value in (0, 1].
 */
export function dampAlpha(dt: number, smoothing = 8): number {
  return 1 - Math.exp(-smoothing * Math.max(dt, 0))
}
