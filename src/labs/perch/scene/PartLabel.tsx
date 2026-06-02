import { Html, Line } from '@react-three/drei'
import type { PartDef } from '../content/parts'

export function PartLabel({ def }: { def: PartDef }) {
  const a = def.position
  const end: [number, number, number] = [a[0] + 0.45, a[1] + 0.55, a[2] + 0.2]
  return (
    <group>
      <Line points={[a, end]} color={def.color} lineWidth={1} transparent opacity={0.75} />
      <Html position={end} center distanceFactor={7} zIndexRange={[20, 0]}>
        <div style={{
          pointerEvents: 'none', whiteSpace: 'nowrap', transform: 'translateY(-50%)',
          padding: '3px 9px', borderRadius: 999, fontSize: 13, fontWeight: 600,
          fontFamily: 'system-ui, sans-serif', color: '#06121a', background: def.color,
          boxShadow: '0 4px 14px -4px rgba(0,0,0,.5)',
        }}>{def.label}</div>
      </Html>
    </group>
  )
}
