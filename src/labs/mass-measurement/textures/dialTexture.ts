import { CanvasTexture } from 'three'

// Texture canvas dimensions (px). Exported so `Dynamometer.tsx` can compute
// the physical plate geometry that aligns the painted labels with the
// pointer's actual travel range.
export const DIAL_TEXTURE_W = 256
export const DIAL_TEXTURE_H = 512

// Vertical reading area (px). Pixels above DIAL_READING_TOP_PX are the "title"
// margin (renders the "1 N" / "5 N" titles); pixels below DIAL_READING_BOTTOM_PX
// are the bottom padding. The pointer's "0 N" position must align with
// DIAL_READING_TOP_PX physically; the pointer's "1 N"/"5 N" position must
// align with DIAL_READING_BOTTOM_PX physically.
export const DIAL_READING_TOP_PX = 40
export const DIAL_READING_BOTTOM_PX = 472

/**
 * Draws an analog dynamometer scale plate with TWO scale strips on one
 * canvas: left = 0–1 N (fine resolution), right = 0–5 N (coarse). Both
 * strips share the same vertical y-mapping so a physical pointer at any
 * height reads a value on both strips simultaneously.
 *
 * Layout (canvas-px coordinates, 256×512):
 *   y =  40  → "0" on both strips
 *   y = 472  → "1" on left, "5" on right
 *   x ∈ [0, 128] → left strip
 *   x ∈ [128, 256] → right strip
 *   ticks are anchored at the BLOCK's left edge (left strip's at x=0,
 *   right strip's at x=128); labels render to the right of their ticks.
 *
 * Real ranges:
 *   Left  fine scale: minor 0.05 N, medium 0.1 N, major 0.5 N (labels 0 / 0.5 / 1)
 *   Right coarse scale: minor 0.1 N, medium 0.5 N, major 1 N (labels 0…5)
 */
export function createDialTexture(): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = DIAL_TEXTURE_W
  canvas.height = DIAL_TEXTURE_H
  const ctx = canvas.getContext('2d')!

  // Off-white plate background
  ctx.fillStyle = '#f5f5f7'
  ctx.fillRect(0, 0, DIAL_TEXTURE_W, DIAL_TEXTURE_H)
  ctx.strokeStyle = '#c8c8d0'
  ctx.lineWidth = 2
  ctx.strokeRect(2, 2, DIAL_TEXTURE_W - 4, DIAL_TEXTURE_H - 4)

  // Vertical separator between the two strips
  ctx.fillStyle = '#c8c8d0'
  ctx.fillRect(127, 8, 2, DIAL_TEXTURE_H - 16)

  // Title row at the top of each strip
  ctx.fillStyle = '#1d1d1f'
  ctx.font = 'bold 18px "SF Pro Display", "Inter", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('1 N', 64, 22)
  ctx.fillText('5 N', 192, 22)

  // Shared scale geometry — both strips use the same y range
  const TOP = DIAL_READING_TOP_PX
  const BOTTOM = DIAL_READING_BOTTOM_PX
  const SPAN = BOTTOM - TOP  // 432 px
  const yForFraction = (f: number) => TOP + f * SPAN

  ctx.font = 'bold 26px "SF Pro Display", "Inter", sans-serif'
  ctx.textAlign = 'left'

  // ──────────────────────────────────────────────────────────────────
  // LEFT strip — 0 to 1 N
  // x range [0, 128]; ticks left-anchored at x=8; labels at x=44
  // ──────────────────────────────────────────────────────────────────
  // Minor ticks every 0.05 N (skipping 0.5 / 0.1 multiples drawn below)
  ctx.fillStyle = '#3a3a40'
  for (let n20 = 0; n20 <= 20; n20++) {
    if (n20 % 2 === 0) continue // 0.1-multiples handled below
    const y = yForFraction(n20 / 20)
    ctx.fillRect(8, y - 0.5, 8, 1)
  }
  // Medium ticks every 0.1 N (skipping 0.5-multiples drawn below)
  for (let n10 = 1; n10 <= 9; n10++) {
    if (n10 % 5 === 0) continue
    const y = yForFraction(n10 / 10)
    ctx.fillRect(8, y - 1, 12, 2)
  }
  // Major ticks at 0, 0.5, 1.0 with labels
  const leftLabels = ['0', '0,5', '1']
  for (let i = 0; i < 3; i++) {
    const y = yForFraction(i / 2)
    ctx.fillStyle = '#1d1d1f'
    ctx.fillRect(8, y - 1.5, 18, 3)
    ctx.fillText(leftLabels[i], 30, y)
  }

  // ──────────────────────────────────────────────────────────────────
  // RIGHT strip — 0 to 5 N
  // x range [128, 256]; ticks left-anchored at x=136; labels at x=172
  // ──────────────────────────────────────────────────────────────────
  // Minor ticks every 0.1 N (skipping 0.5-multiples)
  ctx.fillStyle = '#3a3a40'
  for (let n10 = 0; n10 <= 50; n10++) {
    if (n10 % 5 === 0) continue
    const y = yForFraction(n10 / 50)
    ctx.fillRect(136, y - 0.5, 8, 1)
  }
  // Medium ticks every 0.5 N (skipping integer marks)
  for (let n2 = 1; n2 <= 9; n2 += 2) {
    const y = yForFraction(n2 / 10)
    ctx.fillRect(136, y - 1, 12, 2)
  }
  // Major ticks at 0..5 N with labels
  for (let i = 0; i <= 5; i++) {
    const y = yForFraction(i / 5)
    ctx.fillStyle = '#1d1d1f'
    ctx.fillRect(136, y - 1.5, 18, 3)
    ctx.fillText(`${i}`, 158, y)
  }

  return new CanvasTexture(canvas)
}
