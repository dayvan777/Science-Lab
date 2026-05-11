import { CanvasTexture } from 'three'

export const DIAL_TEXTURE_W = 512
export const DIAL_TEXTURE_H = 512

/**
 * Draws an analog galvanometer dial face — a half-disc with tick marks
 * from -5 (far left) through 0 (top centre) to +5 (far right). Used by
 * the Galvanometer instrument's flat face plane.
 *
 * Coordinate system: x ∈ [0, W], y ∈ [0, H]. The arc's centre is at the
 * BOTTOM-CENTRE of the canvas (pivot of the needle). Ticks radiate
 * outward at angles from 30° (right side) through 90° (top) to 150°
 * (left side) — that's 60° per ±5N, so 12° per N unit.
 */
export function createGalvanometerDialTexture(): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = DIAL_TEXTURE_W
  canvas.height = DIAL_TEXTURE_H
  const ctx = canvas.getContext('2d')!

  // Off-white plate background
  ctx.fillStyle = '#f5f5f7'
  ctx.fillRect(0, 0, DIAL_TEXTURE_W, DIAL_TEXTURE_H)

  // Outer plate border
  ctx.strokeStyle = '#c8c8d0'
  ctx.lineWidth = 4
  ctx.strokeRect(4, 4, DIAL_TEXTURE_W - 8, DIAL_TEXTURE_H - 8)

  // Title at the top
  ctx.fillStyle = '#1d1d1f'
  ctx.font = 'bold 36px "SF Pro Display", "Inter", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('A', DIAL_TEXTURE_W / 2, 50)

  // Geometry: pivot at bottom centre, arc radius
  const pivotX = DIAL_TEXTURE_W / 2
  const pivotY = DIAL_TEXTURE_H * 0.92
  const innerR = DIAL_TEXTURE_W * 0.32
  const outerR = DIAL_TEXTURE_W * 0.40
  const labelR = DIAL_TEXTURE_W * 0.46

  // For each integer N in -5..+5, compute angle and draw tick + label
  // Angle convention: 0° = +x axis (right), counter-clockwise positive.
  // We want -5 at 150°, 0 at 90° (straight up), +5 at 30°.
  // angle(n) = 90° + (-n) * 12° → in radians: π/2 + (-n) * (12 * π / 180)
  const TICK_STEP_DEG = 12  // degrees per unit
  for (let n = -5; n <= 5; n++) {
    const angleDeg = 90 + (-n) * TICK_STEP_DEG
    const angle = (angleDeg * Math.PI) / 180

    const x1 = pivotX + innerR * Math.cos(angle)
    const y1 = pivotY - innerR * Math.sin(angle)
    const x2 = pivotX + outerR * Math.cos(angle)
    const y2 = pivotY - outerR * Math.sin(angle)

    // Major tick
    ctx.strokeStyle = '#1d1d1f'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()

    // Label
    const lx = pivotX + labelR * Math.cos(angle)
    const ly = pivotY - labelR * Math.sin(angle)
    ctx.fillStyle = '#1d1d1f'
    ctx.font = 'bold 30px "SF Pro Display", "Inter", sans-serif'
    ctx.fillText(`${n}`, lx, ly)
  }

  // Minor ticks every 1 unit between integers — at 0.5 step, but we keep
  // it simple here (already 11 major marks covers ±5 with 1-unit precision).

  // Arc outline between -5 and +5
  ctx.strokeStyle = '#1d1d1f'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(pivotX, pivotY, innerR, (30 * Math.PI) / 180, (150 * Math.PI) / 180, false)
  ctx.stroke()

  // Pivot dot
  ctx.fillStyle = '#1d1d1f'
  ctx.beginPath()
  ctx.arc(pivotX, pivotY, 8, 0, Math.PI * 2)
  ctx.fill()

  return new CanvasTexture(canvas)
}
