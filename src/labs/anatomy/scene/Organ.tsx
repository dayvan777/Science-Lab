import { useMemo, useRef, useState } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { useGLTF, useCursor } from '@react-three/drei'
import { Box3, Vector3, Group, Mesh, MeshPhysicalMaterial, Color, type Object3D } from 'three'
import { useAnatomyState } from '../state/AnatomyState'
import type { OrganId } from '../content/organs'
import { useReducedMotion } from '../../../sdk/a11y/useReducedMotion'
import { EXTRACT_ANCHOR } from './focus'
import { useFocusAnimation } from './useFocusAnimation'

export function Organ({ id, url, color }: { id: OrganId; url: string; color: string }) {
  const { scene } = useGLTF(url)
  const selectedId = useAnatomyState(s => s.selectedOrganId)
  const select = useAnatomyState(s => s.select)
  const reduced = useReducedMotion()
  const [hovered, setHovered] = useState(false)
  useCursor(hovered)

  const extractRef = useRef<Group>(null)
  const spinRef = useRef<Group>(null)

  // Clone the cached GLTF scene so material overrides never mutate the shared
  // useGLTF cache; paint materials once and compute the world-space pivot.
  const { model, pivot, materials } = useMemo(() => {
    const cloned = scene.clone(true)
    const mats: MeshPhysicalMaterial[] = []
    cloned.traverse((o: Object3D) => {
      const m = o as Mesh
      if (m.isMesh) {
        const mat = new MeshPhysicalMaterial({
          color, roughness: 0.55, metalness: 0,
          clearcoat: 0.35, clearcoatRoughness: 0.45,
          emissive: new Color(color), emissiveIntensity: 0,
          transparent: true, opacity: 1,
        })
        m.material = mat
        m.castShadow = true
        mats.push(mat)
      }
    })
    cloned.updateWorldMatrix(true, true)
    const center = new Box3().setFromObject(cloned).getCenter(new Vector3())
    return { model: cloned, pivot: center, materials: mats }
  }, [scene, color])

  const anchorOffset = useMemo(() => new Vector3(...EXTRACT_ANCHOR).sub(pivot), [pivot])
  const negPivot = useMemo(() => pivot.clone().negate(), [pivot])

  useFocusAnimation({
    extractRef, spinRef, materials, anchorOffset,
    isSelected: selectedId === id,
    anySelected: selectedId !== null,
    hovered, reduced,
  })

  return (
    <group ref={extractRef}>
      <group position={pivot}>
        <group ref={spinRef}>
          <group position={negPivot}>
            <primitive
              object={model}
              onPointerOver={(e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); setHovered(true) }}
              onPointerOut={() => setHovered(false)}
              onPointerDown={(e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); select(id) }}
            />
          </group>
        </group>
      </group>
    </group>
  )
}
