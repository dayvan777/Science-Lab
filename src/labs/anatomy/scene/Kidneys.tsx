import { useMemo, useRef, useState } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { useGLTF, useCursor } from '@react-three/drei'
import { Box3, Vector3, Group, Mesh, MeshPhysicalMaterial, Color, type Object3D } from 'three'
import { useAnatomyState } from '../state/AnatomyState'
import { useReducedMotion } from '../../../sdk/a11y/useReducedMotion'
import { EXTRACT_ANCHOR } from './focus'
import { useFocusAnimation } from './useFocusAnimation'

function paint(root: Object3D, color: string, sink: MeshPhysicalMaterial[]) {
  root.traverse((o: Object3D) => {
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
      sink.push(mat)
    }
  })
}

export function Kidneys({ url, color }: { url: string; color: string }) {
  const { scene } = useGLTF(url)
  const selectedId = useAnatomyState(s => s.selectedOrganId)
  const select = useAnatomyState(s => s.select)
  const reduced = useReducedMotion()
  const [hovered, setHovered] = useState(false)
  useCursor(hovered)

  const extractRef = useRef<Group>(null)
  const spinRef = useRef<Group>(null)

  const { pivot, right, left, materials } = useMemo(() => {
    const rightClone = scene.clone(true)
    const leftClone = scene.clone(true)
    const mats: MeshPhysicalMaterial[] = []
    paint(rightClone, color, mats)
    paint(leftClone, color, mats)
    rightClone.updateWorldMatrix(true, true)
    const center = new Box3().setFromObject(rightClone).getCenter(new Vector3())
    const pairPivot = new Vector3(0, center.y, center.z)
    return { pivot: pairPivot, right: rightClone, left: leftClone, materials: mats }
  }, [scene, color])

  const anchorOffset = useMemo(() => new Vector3(...EXTRACT_ANCHOR).sub(pivot), [pivot])
  const negPivot = useMemo(() => pivot.clone().negate(), [pivot])

  useFocusAnimation({
    extractRef, spinRef, materials, anchorOffset,
    isSelected: selectedId === 'kidneys',
    anySelected: selectedId !== null,
    hovered, reduced,
  })

  const onOver = (e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); setHovered(true) }
  const onOut = () => setHovered(false)
  const onDown = (e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); select('kidneys') }

  return (
    <group ref={extractRef}>
      <group position={pivot}>
        <group ref={spinRef}>
          <group position={negPivot}>
            <primitive object={right} onPointerOver={onOver} onPointerOut={onOut} onPointerDown={onDown} />
            <group scale={[-1, 1, 1]}>
              <primitive object={left} onPointerOver={onOver} onPointerOut={onOut} onPointerDown={onDown} />
            </group>
          </group>
        </group>
      </group>
    </group>
  )
}
