import { useMemo, useRef, useState } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { useFrame } from '@react-three/fiber'
import { useCursor } from '@react-three/drei'
import { Group, Vector3, MeshPhysicalMaterial, Color, DoubleSide } from 'three'
import { useParameciumState } from '../state/ParameciumState'
import { useReducedMotion } from '../../../sdk/a11y/useReducedMotion'
import { A, B, C, dampAlpha } from './life'
import { Cilia } from './Cilia'
import { Organelles } from './Organelles'

const ZERO = new Vector3(0, 0, 0)

export function Cell() {
  const viewMode = useParameciumState(s => s.viewMode)
  const selectedId = useParameciumState(s => s.selectedOrganelleId)
  const enterCell = useParameciumState(s => s.enterCell)
  const reduced = useReducedMotion()
  const [hovered, setHovered] = useState(false)
  useCursor(hovered && viewMode === 'environment')

  const groupRef = useRef<Group>(null)
  const bodyMat = useMemo(() => new MeshPhysicalMaterial({
    color: '#9fe6d8', transparent: true, opacity: 0.22, roughness: 0.12, metalness: 0,
    clearcoat: 0.6, clearcoatRoughness: 0.25, ior: 1.33, side: DoubleSide, depthWrite: false,
    emissive: new Color('#5FE3D0'), emissiveIntensity: 0,
  }), [])

  useFrame((state, dt) => {
    const g = groupRef.current
    if (!g) return
    const a = reduced ? 1 : dampAlpha(dt)
    const inCell = viewMode === 'cell'
    const targetScale = inCell ? 1.6 : 1
    g.scale.setScalar(g.scale.x + (targetScale - g.scale.x) * a)
    const targetOpacity = inCell ? (selectedId ? 0.1 : 0.16) : 0.22
    bodyMat.opacity += (targetOpacity - bodyMat.opacity) * a
    bodyMat.emissiveIntensity += ((selectedId === 'pellicle' ? 0.5 : 0) - bodyMat.emissiveIntensity) * a
    if (!inCell && !reduced) {
      const t = state.clock.elapsedTime
      g.position.set(Math.sin(t * 0.3) * 0.4, Math.cos(t * 0.23) * 0.25, Math.sin(t * 0.17) * 0.2)
      g.rotation.z = Math.sin(t * 0.2) * 0.15
      g.rotation.y += dt * 0.15
    } else if (inCell) {
      g.position.lerp(ZERO, a)
    }
  })

  return (
    <group ref={groupRef}>
      <mesh
        material={bodyMat}
        scale={[A, B, C]}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => { if (viewMode === 'environment') { e.stopPropagation(); setHovered(true) } }}
        onPointerOut={() => setHovered(false)}
        onPointerDown={(e: ThreeEvent<PointerEvent>) => { if (viewMode === 'environment') { e.stopPropagation(); enterCell() } }}
      >
        <sphereGeometry args={[1, 64, 48]} />
      </mesh>
      <Cilia highlighted={selectedId === 'cilia'} />
      <Organelles />
    </group>
  )
}
