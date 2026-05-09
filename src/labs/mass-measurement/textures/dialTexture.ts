import { CanvasTexture } from 'three'

/**
 * Creates a dynamometer scale plate showing 0-5 N with tick marks.
 * Drawn once on init; doesn't change.
 */
export function createDialTexture(): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 96
  canvas.height = 384
  const ctx = canvas.getContext('2d')!
  // Off-white background
  ctx.fillStyle = '#f5f5f7'
  ctx.fillRect(0, 0, 96, 384)
  // Subtle border
  ctx.strokeStyle = '#d0d0d5'
  ctx.lineWidth = 2
  ctx.strokeRect(2, 2, 92, 380)
  // Title "N" at top
  ctx.fillStyle = '#1d1d1f'
  ctx.font = 'bold 22px "SF Pro Display", "Inter", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('N', 48, 28)
  // Major ticks (every 1 N) and minor (every 0.5 N)
  ctx.font = 'bold 18px "SF Pro Display", "Inter", sans-serif'
  ctx.textAlign = 'right'
  for (let i = 0; i <= 5; i++) {
    const y = 50 + (i / 5) * 320
    ctx.fillRect(20, y - 1.5, 28, 3)  // major tick
    ctx.fillText(`${i}`, 80, y + 6)
  }
  for (let i = 0.5; i < 5; i += 1) {
    const y = 50 + (i / 5) * 320
    ctx.fillRect(28, y - 1, 14, 2)  // minor tick
  }
  return new CanvasTexture(canvas)
}
