import { CanvasTexture, RepeatWrapping } from 'three'

export function createBaseballSeamTexture(): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 256
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#f5f5f0'
  ctx.fillRect(0, 0, 512, 256)
  // Red curved stitches (figure-8 seam pattern)
  ctx.strokeStyle = '#c0392b'
  ctx.lineWidth = 3
  ctx.lineCap = 'round'
  for (let x = 0; x < 512; x += 12) {
    const t = x / 512
    const y = 128 + Math.sin(t * Math.PI * 2) * 60
    ctx.beginPath()
    ctx.moveTo(x - 4, y - 6)
    ctx.lineTo(x + 4, y + 6)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(x - 4, y + 6)
    ctx.lineTo(x + 4, y - 6)
    ctx.stroke()
  }
  const texture = new CanvasTexture(canvas)
  texture.wrapS = texture.wrapT = RepeatWrapping
  return texture
}
