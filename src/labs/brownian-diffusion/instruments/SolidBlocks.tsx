import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { InstancedMesh, Matrix4 } from 'three'
import { useLabSettings } from '../state/LabSettingsState'
import { interpolateLattice, LatticeSnapshot } from '../physics/lattice'

const SCRATCH = new Matrix4()

type Props = {
  position: [number, number, number]
}

export function SolidBlocks({ position }: Props) {
  const years = useLabSettings(s => s.timeLapseYears)
  const goldMeshRef = useRef<InstancedMesh>(null)
  const leadMeshRef = useRef<InstancedMesh>(null)

  // Pre-compute count of atoms per kind from the first snapshot
  const { goldCount, leadCount } = useMemo(() => {
    const s = interpolateLattice(0)
    return {
      goldCount: s.atoms.filter(a => a.kind === 'gold').length,
      leadCount: s.atoms.filter(a => a.kind === 'lead').length,
    }
  }, [])

  // Track the previously-rendered snapshot to detect re-render needs.
  const lastYearsRef = useRef(-1)
  const cachedSnapRef = useRef<LatticeSnapshot | null>(null)

  useFrame(() => {
    if (years !== lastYearsRef.current) {
      cachedSnapRef.current = interpolateLattice(years)
      lastYearsRef.current = years
    }
    const snap = cachedSnapRef.current
    if (!snap) return

    let gi = 0, li = 0
    for (const atom of snap.atoms) {
      SCRATCH.makeScale(0.005, 0.005, 0.005)
      SCRATCH.setPosition(atom.pos.x, atom.pos.y, atom.pos.z)
      if (atom.kind === 'gold' && goldMeshRef.current) {
        goldMeshRef.current.setMatrixAt(gi++, SCRATCH)
      } else if (atom.kind === 'lead' && leadMeshRef.current) {
        leadMeshRef.current.setMatrixAt(li++, SCRATCH)
      }
    }
    if (goldMeshRef.current) goldMeshRef.current.instanceMatrix.needsUpdate = true
    if (leadMeshRef.current) leadMeshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <group position={position}>
      <instancedMesh ref={goldMeshRef} args={[undefined, undefined, goldCount]}>
        <sphereGeometry args={[1, 10, 8]} />
        <meshStandardMaterial color="#f4c430" roughness={0.4} metalness={0.5} />
      </instancedMesh>
      <instancedMesh ref={leadMeshRef} args={[undefined, undefined, leadCount]}>
        <sphereGeometry args={[1, 10, 8]} />
        <meshStandardMaterial color="#8a8a92" roughness={0.6} metalness={0.4} />
      </instancedMesh>
    </group>
  )
}
