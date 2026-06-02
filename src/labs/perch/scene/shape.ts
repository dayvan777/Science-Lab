import { BufferGeometry, BufferAttribute } from 'three'
import { clamp01 } from './cut'

function smoothstep(e0: number, e1: number, x: number): number {
  if (e0 === e1) return x < e0 ? 0 : 1
  const t = clamp01((x - e0) / (e1 - e0))
  return t * t * (3 - 2 * t)
}

/** Fish girth profile along the body: t=0 snout … t=1 tail. Peaks just behind the head. */
export function bodyProfile(t: number): number {
  const tt = clamp01(t)
  const head = 0.42 + 0.58 * smoothstep(0, 0.30, tt)   // 0.42 → 1.0
  const tail = 1 - 0.88 * smoothstep(0.38, 1.0, tt)     // 1.0 → 0.12
  return head * tail
}

/** Taper a unit-sphere body half into a fusiform shape (scales y,z by bodyProfile(x)). In place. */
export function taperGeometry(geo: BufferGeometry): void {
  const pos = geo.getAttribute('position') as BufferAttribute
  for (let i = 0; i < pos.count; i++) {
    const f = bodyProfile((pos.getX(i) + 1) / 2)
    pos.setY(i, pos.getY(i) * f)
    pos.setZ(i, pos.getZ(i) * f)
  }
  pos.needsUpdate = true
  geo.computeVertexNormals()
}
