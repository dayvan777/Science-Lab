import { CanvasTexture } from 'three'

export function createLcdTexture(): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 96
  return new CanvasTexture(canvas)
}

/**
 * Draw the LCD value with a 7-segment-style monospace render and a strong green glow.
 * Combined with PostFX bloom, the glow blooms further for a premium electronic-display feel.
 */
export function drawLcd(texture: CanvasTexture, valueGrams: number) {
  const canvas = texture.image as HTMLCanvasElement
  const ctx = canvas.getContext('2d')!
  const W = canvas.width
  const H = canvas.height

  // Background — deep black, slightly inset
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = '#050505'
  ctx.fillRect(8, 8, W - 16, H - 16)

  // Faint scanlines
  ctx.fillStyle = 'rgba(127, 255, 96, 0.04)'
  for (let y = 0; y < H; y += 4) {
    ctx.fillRect(0, y, W, 1)
  }

  // The number — formatted with units
  const text = `${Math.round(valueGrams)} g`

  ctx.font = `bold ${Math.floor(H * 0.55)}px "Courier New", "Lucida Console", monospace`
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'right'

  // Outer halo (strong green glow)
  ctx.shadowColor = '#7fff60'
  ctx.shadowBlur = 24
  ctx.fillStyle = '#7fff60'
  ctx.fillText(text, W - 24, H / 2)

  // Inner crisp pass
  ctx.shadowBlur = 0
  ctx.fillStyle = '#c8ffaf'
  ctx.fillText(text, W - 24, H / 2)

  texture.needsUpdate = true
}
