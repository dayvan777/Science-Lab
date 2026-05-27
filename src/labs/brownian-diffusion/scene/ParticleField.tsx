import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, InstancedMesh, Matrix4, Object3D } from 'three'
import { Particle, PARTICLE_DEFAULTS } from '../physics/particles'

/**
 * Encode a particle's position + radius into a Three.js Matrix4 in
 * the form expected by InstancedMesh.setMatrixAt. Scale = radius
 * because the sphere geometry is built with radius=1.
 *
 * Exported for unit testability.
 */
export function writeParticleMatrix(out: Matrix4, p: Particle): void {
  out.makeScale(p.radius, p.radius, p.radius)
  out.setPosition(p.pos.x, p.pos.y, p.pos.z)
}

type Props = {
  /** Live particle array (mutated by SceneController each frame). */
  particles: React.MutableRefObject<Particle[]>
  /** Number of slots — usually `particles.current.length` at mount. Cannot grow. */
  capacity: number
  /** Position of the field's origin in world space (centre of containing box). */
  position: [number, number, number]
  /** Per-frame: should this particle be visible? Default: always true. */
  isVisible?: (p: Particle) => boolean
}

const SCRATCH = new Matrix4()
const COLOR = new Color()

export function ParticleField({ particles, capacity, position, isVisible }: Props) {
  const meshRef = useRef<InstancedMesh>(null)
  const hiddenRef = useRef(new Object3D())

  // Set per-instance colors once at mount.
  useEffect(() => {
    const m = meshRef.current
    if (!m) return
    for (let i = 0; i < capacity; i++) {
      const p = particles.current[i]
      if (!p) continue
      const [r, g, b] = PARTICLE_DEFAULTS[p.kind].color
      COLOR.setRGB(r, g, b)
      m.setColorAt(i, COLOR)
    }
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  }, [particles, capacity])

  useFrame(() => {
    const m = meshRef.current
    if (!m) return
    const list = particles.current
    for (let i = 0; i < capacity; i++) {
      const p = list[i]
      if (!p || (isVisible && !isVisible(p))) {
        // Hide by scaling to 0 at origin
        hiddenRef.current.scale.setScalar(0)
        hiddenRef.current.position.set(0, 0, 0)
        hiddenRef.current.updateMatrix()
        m.setMatrixAt(i, hiddenRef.current.matrix)
        continue
      }
      writeParticleMatrix(SCRATCH, p)
      m.setMatrixAt(i, SCRATCH)
    }
    m.instanceMatrix.needsUpdate = true
  })

  return (
    <group position={position}>
      <instancedMesh ref={meshRef} args={[undefined, undefined, capacity]}>
        <sphereGeometry args={[1, 10, 8]} />
        <meshStandardMaterial roughness={0.3} metalness={0} vertexColors={false} />
      </instancedMesh>
    </group>
  )
}
