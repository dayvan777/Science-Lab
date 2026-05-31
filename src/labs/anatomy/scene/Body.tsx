import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { DoubleSide, Mesh, MeshPhysicalMaterial, type Object3D } from 'three'
import { useAnatomyState } from '../state/AnatomyState'
import { useReducedMotion } from '../../../sdk/a11y/useReducedMotion'
import { BODY_REST_OPACITY, BODY_FADED_OPACITY, dampAlpha } from './focus'

export function Body({ url }: { url: string }) {
  const { scene } = useGLTF(url)
  const anySelected = useAnatomyState(s => s.selectedOrganId !== null)
  const reduced = useReducedMotion()

  const { model, materials } = useMemo(() => {
    const cloned = scene.clone(true)
    const mats: MeshPhysicalMaterial[] = []
    cloned.traverse((o: Object3D) => {
      const m = o as Mesh
      if (m.isMesh) {
        const mat = new MeshPhysicalMaterial({
          color: '#a8c2d4',
          transparent: true,
          opacity: BODY_REST_OPACITY,
          roughness: 0.35,
          metalness: 0,
          side: DoubleSide,
          depthWrite: false,
        })
        m.material = mat
        m.renderOrder = 3
        mats.push(mat)
      }
    })
    return { model: cloned, materials: mats }
  }, [scene])

  useFrame((_, dt) => {
    const a = reduced ? 1 : dampAlpha(dt)
    const target = anySelected ? BODY_FADED_OPACITY : BODY_REST_OPACITY
    for (const mat of materials) mat.opacity += (target - mat.opacity) * a
  })

  return <primitive object={model} />
}
