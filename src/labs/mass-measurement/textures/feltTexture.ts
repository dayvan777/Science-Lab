import { CanvasTexture, RepeatWrapping } from 'three'

export function createFeltTexture(): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#d8e043'
  ctx.fillRect(0, 0, 256, 256)
  // Felt noise (random small dots)
  for (let i = 0; i < 8000; i++) {
    const x = Math.random() * 256
    const y = Math.random() * 256
    const alpha = Math.random() * 0.3
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`
    ctx.fillRect(x, y, 1, 1)
  }
  // Curved seam line (white)
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(128, 128, 90, Math.PI * 0.2, Math.PI * 0.8)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(128, 128, 90, Math.PI * 1.2, Math.PI * 1.8)
  ctx.stroke()
  const texture = new CanvasTexture(canvas)
  texture.wrapS = texture.wrapT = RepeatWrapping
  return texture
}
