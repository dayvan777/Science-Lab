import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, InstancedMesh, Matrix4 } from 'three'
import { interpolateLattice } from '../physics/lattice'
import { useLabSettings } from '../state/LabSettingsState'

const GOLD = new Color('#d4af37')
const LEAD = new Color('#8a8f99')
const SCRATCH = new Matrix4()
const ATOM_R = 0.005

/** Renders the 100-atom gold/lead lattice for the solid state, interpolated by timeLapseYears. */
export function LatticeField({ position }: { position: [number, number, number] }) {
  const meshRef = useRef<InstancedMesh>(null)
  const years = useLabSettings(s => s.timeLapseYears)

  useFrame(() => {
    const m = meshRef.current
    if (!m) return
    const { atoms } = interpolateLattice(years)
    for (let i = 0; i < atoms.length; i++) {
      const a = atoms[i]
      SCRATCH.makeScale(ATOM_R, ATOM_R, ATOM_R)
      SCRATCH.setPosition(a.pos.x, a.pos.y, a.pos.z)
      m.setMatrixAt(i, SCRATCH)
      m.setColorAt(i, a.kind === 'gold' ? GOLD : LEAD)
    }
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  })

  return (
    <group position={position}>
      <instancedMesh ref={meshRef} args={[undefined, undefined, 100]}>
        <sphereGeometry args={[1, 12, 10]} />
        <meshStandardMaterial roughness={0.35} metalness={0.6} />
      </instancedMesh>
    </group>
  )
}
