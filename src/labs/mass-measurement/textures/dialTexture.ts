import { CanvasTexture } from 'three'

const W = 128
const H = 512

/**
 * Draws an analog dynamometer scale plate (0 N at the top, 5 N at the bottom).
 * Major graduations every 1 N (with numeric label), medium every 0.5 N,
 * minor every 0.1 N. The needle is a separate 3D mesh in Dynamometer.tsx —
 * this texture only renders the static scale.
 *
 * Layout (canvas-px coordinates, 128×512):
 *   y = 40   → 0 N   (top of usable scale)
 *   y = 472  → 5 N   (bottom of usable scale)
 *   ticks anchored on the LEFT side, labels to their right.
 */
export function createDialTexture(): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  // Off-white plate background
  ctx.fillStyle = '#f5f5f7'
  ctx.fillRect(0, 0, W, H)
  ctx.strokeStyle = '#c8c8d0'
  ctx.lineWidth = 2
  ctx.strokeRect(2, 2, W - 4, H - 4)

  // Title band at the very top
  ctx.fillStyle = '#1d1d1f'
  ctx.font = 'bold 22px "SF Pro Display", "Inter", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('N', W / 2, 22)

  // Scale geometry
  const TOP = 40
  const BOTTOM = 472
  const SPAN = BOTTOM - TOP  // 432 px for 5 N
  const yForN = (n: number) => TOP + (n / 5) * SPAN

  // Minor ticks every 0.1 N
  ctx.fillStyle = '#3a3a40'
  for (let n10 = 0; n10 <= 50; n10++) {
    if (n10 % 5 === 0) continue // skip — major/medium drawn below
    const y = yForN(n10 / 10)
    ctx.fillRect(28, y - 0.5, 8, 1)
  }

  // Medium ticks every 0.5 N (skipping integer marks)
  for (let n2 = 1; n2 <= 9; n2 += 2) {
    const y = yForN(n2 / 2)
    ctx.fillRect(24, y - 1, 14, 2)
  }

  // Major ticks every 1 N + numeric label
  ctx.font = 'bold 28px "SF Pro Display", "Inter", sans-serif'
  ctx.textAlign = 'left'
  for (let i = 0; i <= 5; i++) {
    const y = yForN(i)
    ctx.fillStyle = '#1d1d1f'
    ctx.fillRect(20, y - 1.5, 22, 3)
    ctx.fillText(`${i}`, 56, y)
  }

  return new CanvasTexture(canvas)
}
