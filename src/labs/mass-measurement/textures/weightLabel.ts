import { CanvasTexture } from 'three'

export function createWeightLabel(text: string): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 128
  const ctx = canvas.getContext('2d')!
  // Background: subtle gradient to suggest engraved metal
  const grad = ctx.createLinearGradient(0, 0, 0, 128)
  grad.addColorStop(0, '#5a5a5d')
  grad.addColorStop(0.5, '#404043')
  grad.addColorStop(1, '#5a5a5d')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 256, 128)
  // Engraved-look text shadow
  ctx.fillStyle = '#1a1a1d'
  ctx.font = 'bold 56px "SF Pro Display", "Inter", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 128, 70)
  // Highlight to suggest engraving (offset by 1px)
  ctx.fillStyle = '#dddde0'
  ctx.fillText(text, 127, 65)
  return new CanvasTexture(canvas)
}
