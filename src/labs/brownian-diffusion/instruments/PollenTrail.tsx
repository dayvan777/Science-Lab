import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferAttribute, BufferGeometry, Line, LineBasicMaterial, Vector3 } from 'three'
import { findBodyByTag } from '../../../sdk/physics/bodyRegistry'

const TRAIL_LENGTH = 60   // ~3 seconds of history at 20 Hz
const SAMPLE_EVERY_MS = 50 // 20 Hz

type Props = {
  enabled: boolean
}

export function PollenTrail({ enabled }: Props) {
  const samples = useRef<Vector3[]>([])
  const lastSample = useRef(0)

  const { geometry, material } = useMemo(() => {
    const positions = new Float32Array(TRAIL_LENGTH * 3)
    const colors = new Float32Array(TRAIL_LENGTH * 3)
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(positions, 3))
    g.setAttribute('color', new BufferAttribute(colors, 3))
    const m = new LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9 })
    return { geometry: g, material: m }
  }, [])

  useFrame(() => {
    if (!enabled) {
      samples.current = []
      geometry.setDrawRange(0, 0)
      return
    }

    const body = findBodyByTag('pollen')
    if (!body) return

    const now = performance.now()
    if (now - lastSample.current >= SAMPLE_EVERY_MS) {
      const t = body.translation()
      samples.current.push(new Vector3(t.x, t.y, t.z))
      if (samples.current.length > TRAIL_LENGTH) samples.current.shift()
      lastSample.current = now
    }

    const positions = geometry.attributes.position as BufferAttribute
    const colors = geometry.attributes.color as BufferAttribute
    const arr = samples.current
    for (let i = 0; i < TRAIL_LENGTH; i++) {
      const v = arr[i] ?? arr[arr.length - 1] ?? new Vector3()
      positions.setXYZ(i, v.x, v.y, v.z)
      // Fade: oldest points (i=0) are dark, newest (i=TRAIL_LENGTH-1) are bright amber
      const fade = (i + 1) / TRAIL_LENGTH
      colors.setXYZ(i, 1.0 * fade, 0.82 * fade, 0.30 * fade) // amber
    }
    positions.needsUpdate = true
    colors.needsUpdate = true
    geometry.setDrawRange(0, Math.min(arr.length, TRAIL_LENGTH))
  })

  return <primitive object={new Line(geometry, material)} />
}
