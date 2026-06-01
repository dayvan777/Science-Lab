/** Cell ellipsoid radii (long axis = X). Shared by Cell, Cilia, Organelles. */
export const A = 1.5
export const B = 0.75
export const C = 0.6

/** Frame-rate-independent damping alpha for lerping toward a target. */
export function dampAlpha(dt: number, smoothing = 6): number {
  return 1 - Math.exp(-smoothing * Math.max(dt, 0))
}
