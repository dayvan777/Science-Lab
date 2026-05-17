/**
 * CSS calc() helpers that combine a literal pixel offset with the device's
 * safe-area inset. Use these for elements pinned to the screen's top or
 * bottom edges so they clear the iOS notch / Android cutout / home indicator.
 *
 * The fallback inside env(..., 0px) preserves the literal offset on browsers
 * that don't expose env() (older Android Chrome, desktop) — those layouts
 * look identical to before.
 *
 * Requires `viewport-fit=cover` on the viewport meta tag, otherwise iOS
 * Safari resolves env() to 0 and the helpers are no-ops on iOS too.
 */
export const safeAreaTop = (px: number): string =>
  `calc(${px}px + env(safe-area-inset-top, 0px))`

export const safeAreaBottom = (px: number): string =>
  `calc(${px}px + env(safe-area-inset-bottom, 0px))`
