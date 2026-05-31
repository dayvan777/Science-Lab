import { useMemo, useRef, useState } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
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

  const extractRef = useRef<Group>(null)
  const spinRef = useRef<Group>(null)

  // Paint materials once and compute the world-space pivot (bbox centre).
  const { pivot, materials } = useMemo(() => {
    const mats: MeshPhysicalMaterial[] = []
    scene.traverse((o: Object3D) => {
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
    const center = new Box3().setFromObject(scene).getCenter(new Vector3())
    return { pivot: center, materials: mats }
  }, [scene, color])

  const anchorOffset = useMemo(
    () => new Vector3(...EXTRACT_ANCHOR).sub(pivot),
    [pivot],
  )
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
              object={scene}
              onPointerOver={(e: ThreeEvent<PointerEvent>) => {
                e.stopPropagation()
                setHovered(true)
                document.body.style.cursor = 'pointer'
              }}
              onPointerOut={() => {
                setHovered(false)
                document.body.style.cursor = 'auto'
              }}
              onPointerDown={(e: ThreeEvent<PointerEvent>) => {
                e.stopPropagation()
                select(id)
              }}
            />
          </group>
        </group>
      </group>
    </group>
  )
}
