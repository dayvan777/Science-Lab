import { Html, Line } from '@react-three/drei'
import type { OrganelleDef } from '../../content/organelles'
import { A, B, C } from '../life'

const LAYER_ANCHORS: Record<string, [number, number, number]> = {
  cilia: [0, B + 0.1, 0],
  pellicle: [A * 0.7, 0.2, 0],
  trichocysts: [0, B * 0.7, C * 0.7],
}

export function OrganelleLabel({ def }: { def: OrganelleDef }) {
  const anchor = def.positions?.[0] ?? LAYER_ANCHORS[def.id] ?? [0, 0, 0]
  const end: [number, number, number] = [anchor[0] + 0.4, anchor[1] + 0.5, anchor[2] + 0.15]
  return (
    <group>
      <Line points={[anchor, end]} color={def.color} lineWidth={1} transparent opacity={0.7} />
      <Html position={end} center distanceFactor={6} zIndexRange={[20, 0]}>
        <div style={{
          pointerEvents: 'none', whiteSpace: 'nowrap', transform: 'translateY(-50%)',
          padding: '3px 9px', borderRadius: 999, fontSize: 13, fontWeight: 600,
          fontFamily: 'system-ui, sans-serif', color: '#06121a',
          background: def.color, boxShadow: '0 4px 14px -4px rgba(0,0,0,.5)',
        }}>{def.label}</div>
      </Html>
    </group>
  )
}
