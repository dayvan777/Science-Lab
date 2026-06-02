import type { ThreeEvent } from '@react-three/fiber'
import { useCursor, Line } from '@react-three/drei'
import { useState } from 'react'
import { usePerchState } from '../state/PerchState'
import { BODY } from './anatomy'
import { cutProgressFromDrag } from './cut'

const X0 = -1.0, X1 = 1.4          // belly cut span (head → vent)
const YB = -BODY.H * 0.92, ZB = BODY.W * 0.78
const DRAG_PX = 320                 // pixels of horizontal drag = full cut

export function Scalpel() {
  const phase = usePerchState(s => s.phase)
  const cutProgress = usePerchState(s => s.cutProgress)
  const setCut = usePerchState(s => s.setCut)
  const [hover, setHover] = useState(false)
  useCursor(hover && phase !== 'internal', 'grab')

  if (phase === 'internal') return null
  const hx = X0 + (X1 - X0) * cutProgress

  const onDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    const startX = e.nativeEvent.clientX
    const base = cutProgress
    const move = (ev: PointerEvent) => setCut(base + cutProgressFromDrag(ev.clientX - startX, DRAG_PX))
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  return (
    <group>
      <Line points={[[X0, YB, ZB], [X1, YB, ZB]]} color="#eafffb" lineWidth={1.5} dashed dashSize={0.1} gapSize={0.08} transparent opacity={0.7} />
      <group position={[hx, YB, ZB]} onPointerOver={() => setHover(true)} onPointerOut={() => setHover(false)} onPointerDown={onDown}>
        <mesh rotation={[0, 0, Math.PI * 0.18]}>
          <coneGeometry args={[0.06, 0.34, 4]} />
          <meshStandardMaterial color="#d3d9dd" metalness={0.6} roughness={0.3} />
        </mesh>
        <mesh position={[0.0, 0.22, 0]}>
          <boxGeometry args={[0.05, 0.18, 0.05]} />
          <meshStandardMaterial color="#5a3a22" roughness={0.7} />
        </mesh>
      </group>
    </group>
  )
}
