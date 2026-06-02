import { useMemo } from 'react'
import { useParameciumState } from '../../state/ParameciumState'

/** Sparse dots just under the pellicle; glow when trichocysts are selected. */
export function Trichocysts() {
  const selectedId = useParameciumState(s => s.selectedOrganelleId)
  const on = selectedId === 'trichocysts'
  const dots = useMemo(() => {
    const out: [number, number, number][] = []
    const golden = Math.PI * (3 - Math.sqrt(5))
    for (let i = 0; i < 60; i++) {
      const y = 1 - (i / 59) * 2, r = Math.sqrt(Math.max(0, 1 - y * y)), th = golden * i
      out.push([Math.cos(th) * r * 1.42, y * 0.71, Math.sin(th) * r * 0.57])
    }
    return out
  }, [])
  return (
    <group>
      {dots.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.03, 8, 8]} />
          <meshStandardMaterial color="#dfeaf2" emissive={on ? '#5FE3D0' : '#000000'} emissiveIntensity={on ? 0.8 : 0} transparent opacity={on ? 0.95 : 0.45} />
        </mesh>
      ))}
    </group>
  )
}
