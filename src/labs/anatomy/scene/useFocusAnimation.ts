import type { RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, Vector3, MeshPhysicalMaterial } from 'three'
import { ORGAN_FADED_OPACITY, dampAlpha } from './focus'

const REST = new Vector3(0, 0, 0)

/**
 * Drives one organ's extract translation, inspection spin, and fade.
 * - extractRef.position eases REST <-> anchorOffset (anchorOffset places the
 *   organ's pivot on EXTRACT_ANCHOR).
 * - spinRef.rotation.y spins while selected, eases back to 0 otherwise.
 * - every material opacity eases to full (selected / nothing selected) or faded,
 *   and emissiveIntensity eases up on hover (only in the resting state).
 * Respects reduced motion by snapping instead of easing and never spinning.
 */
export function useFocusAnimation(args: {
  extractRef: RefObject<Group | null>
  spinRef: RefObject<Group | null>
  materials: MeshPhysicalMaterial[]
  anchorOffset: Vector3
  isSelected: boolean
  anySelected: boolean
  hovered: boolean
  reduced: boolean
}) {
  const { extractRef, spinRef, materials, anchorOffset, isSelected, anySelected, hovered, reduced } = args

  useFrame((_, dt) => {
    const a = reduced ? 1 : dampAlpha(dt)

    extractRef.current?.position.lerp(isSelected ? anchorOffset : REST, a)

    if (spinRef.current) {
      if (isSelected && !reduced) spinRef.current.rotation.y += dt * 0.5
      else spinRef.current.rotation.y *= 1 - a
    }

    const targetOpacity = !anySelected || isSelected ? 1 : ORGAN_FADED_OPACITY
    const targetEmissive = hovered && !anySelected ? 0.3 : 0
    for (const mat of materials) {
      mat.opacity += (targetOpacity - mat.opacity) * a
      mat.emissiveIntensity += (targetEmissive - mat.emissiveIntensity) * a
      mat.depthWrite = mat.opacity > 0.5
    }
  })
}
