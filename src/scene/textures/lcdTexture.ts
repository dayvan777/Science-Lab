import { CanvasTexture } from 'three'

export function createLcdTexture(): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 96
  return new CanvasTexture(canvas)
}

export function drawLcd(texture: CanvasTexture, valueGrams: number) {
  const canvas = texture.image as HTMLCanvasElement
  const ctx = canvas.getContext('2d')!
  // Background: realistic green-gray LCD
  ctx.fillStyle = '#a8c4a8'
  ctx.fillRect(0, 0, 256, 96)
  // Subtle grid pattern (LCD pixel feel)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.04)'
  for (let x = 0; x < 256; x += 4) ctx.fillRect(x, 0, 1, 96)
  // Value
  ctx.fillStyle = '#1a1a1a'
  ctx.font = 'bold 56px "Courier New", monospace'
  ctx.textAlign = 'right'
  ctx.fillText(`${Math.round(valueGrams)} g`, 240, 70)
  texture.needsUpdate = true
}
