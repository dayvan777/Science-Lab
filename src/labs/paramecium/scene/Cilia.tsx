import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { InstancedMesh, Object3D, Vector3, MeshStandardMaterial } from 'three'
import { useReducedMotion } from '../../../sdk/a11y/useReducedMotion'
import { A, B, C } from './life'

const COUNT = 420
const UP = new Vector3(0, 1, 0)

export function Cilia({ highlighted }: { highlighted: boolean }) {
  const ref = useRef<InstancedMesh>(null)
  const reduced = useReducedMotion()
  const dummy = useMemo(() => new Object3D(), [])
  const mat = useMemo(
    () => new MeshStandardMaterial({ color: '#bfeee2', transparent: true, opacity: 0.8 }),
    [],
  )
  const data = useMemo(() => {
    const pts: Vector3[] = [], nrm: Vector3[] = [], ph: number[] = []
    const golden = Math.PI * (3 - Math.sqrt(5))
    for (let i = 0; i < COUNT; i++) {
      const y = 1 - (i / (COUNT - 1)) * 2
      const r = Math.sqrt(Math.max(0, 1 - y * y))
      const th = golden * i
      const sx = Math.cos(th) * r, sy = y, sz = Math.sin(th) * r
      pts.push(new Vector3(sx * A, sy * B, sz * C))
      nrm.push(new Vector3(sx / A, sy / B, sz / C).normalize())
      ph.push(sx)
    }
    return { pts, nrm, ph }
  }, [])

  useFrame((state) => {
    const m = ref.current
    if (!m) return
    const t = state.clock.elapsedTime
    for (let i = 0; i < COUNT; i++) {
      dummy.position.copy(data.pts[i]).addScaledVector(data.nrm[i], 0.06)
      dummy.quaternion.setFromUnitVectors(UP, data.nrm[i])
      if (!reduced) dummy.rotateX(Math.sin(t * 6 + data.ph[i] * 3) * 0.6 + Math.sin(t * 3 + data.ph[i]) * 0.12)
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
    }
    m.instanceMatrix.needsUpdate = true
    mat.color.set(highlighted ? '#eafffb' : '#bfeee2')
    mat.emissive.set(highlighted ? '#5FE3D0' : '#000000')
    mat.emissiveIntensity = highlighted ? 0.6 : 0
  })

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, COUNT]} material={mat}>
      <coneGeometry args={[0.009, 0.17, 6]} />
    </instancedMesh>
  )
}
