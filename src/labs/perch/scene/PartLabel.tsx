import { Html, Line } from '@react-three/drei'
import type { PartDef } from '../content/parts'

export function PartLabel({ def, ambient = false }: { def: PartDef; ambient?: boolean }) {
  const a = def.position
  const end: [number, number, number] = [a[0] + 0.45, a[1] + 0.55, a[2] + 0.2]
  return (
    <group>
      <Line points={[a, end]} color={def.color} lineWidth={ambient ? 0.8 : 1.2} transparent opacity={ambient ? 0.4 : 0.8} />
      <Html position={end} center distanceFactor={7} zIndexRange={ambient ? [10, 0] : [20, 0]}>
        <div style={{
          pointerEvents: 'none', whiteSpace: 'nowrap', transform: 'translateY(-50%)',
          padding: ambient ? '2px 7px' : '3px 9px', borderRadius: 999,
          fontSize: ambient ? 11 : 13, fontWeight: 600, fontFamily: 'system-ui, sans-serif',
          color: '#06121a', background: def.color, opacity: ambient ? 0.62 : 1,
          boxShadow: ambient ? 'none' : '0 4px 14px -4px rgba(0,0,0,.5)',
        }}>{def.label}</div>
      </Html>
    </group>
  )
}
