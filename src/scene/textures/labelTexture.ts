import { CanvasTexture } from 'three'

export function createBrandLabel(text: string, w = 256, h = 64): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = 'rgba(0, 0, 0, 0)'
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = '#888'
  ctx.font = 'bold 18px "SF Pro Display", "Inter", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.letterSpacing = '2px'
  ctx.fillText(text, w / 2, h / 2)
  return new CanvasTexture(canvas)
}
