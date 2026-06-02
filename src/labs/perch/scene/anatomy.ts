/** Perch body ellipsoid half-extents: X=length (head −X → tail +X), Y=height, Z=half-width (near side +Z). */
export const BODY = { L: 2.2, H: 0.82, W: 0.52 }

/** Palette (procedural, zero assets). */
export const COLORS = {
  back: '#6b7b3a', belly: '#c8d3a0', flap: '#7e8c4c', cavity: '#34281f',
  finOlive: '#9aa86a', finRed: '#c8623c', operculum: '#8a9a6a', eye: '#1c1c16',
}

/** Frame-rate-independent damping alpha. */
export function dampAlpha(dt: number, smoothing = 6): number {
  return 1 - Math.exp(-smoothing * Math.max(dt, 0))
}
