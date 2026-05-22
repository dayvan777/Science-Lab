/**
 * Returns true if the browser can create a WebGL rendering context.
 * Tries webgl2 first, then webgl. Used to gate the 3D Canvas behind a
 * friendly fallback for blocked/old environments (school proxies, old
 * Android WebViews, privacy browsers).
 *
 * Result is cached after the first call — WebGL availability does not
 * change within a page session.
 */
let cached: boolean | null = null

export function isWebGLAvailable(): boolean {
  if (cached !== null) return cached
  try {
    const canvas = document.createElement('canvas')
    cached = !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl2') || canvas.getContext('webgl'))
    )
  } catch {
    cached = false
  }
  return cached
}
