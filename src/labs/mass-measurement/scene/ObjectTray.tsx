import { RigidBody, CuboidCollider } from '@react-three/rapier'
import { TABLE_TOP_Y } from '../../../sdk/scene/Table'

const TRAY_W = 0.85
const TRAY_D = 0.20
export const TRAY_H = 0.025

/**
 * Top surface y of the tray when its centre is placed at TABLE_TOP_Y +
 * TRAY_H / 2 (i.e. the tray sitting flat on the table). Balls spawn at
 * TRAY_TOP_Y + ballRadius (+ small epsilon).
 */
export const TRAY_TOP_Y = TABLE_TOP_Y + TRAY_H

const INDENTATION_DEPTH = 0.012

/**
 * Three indentations along the tray's centre line (one per ball type).
 * Positions are tray-local (origin at the tray's centre).
 */
const INDENTATIONS: { x: number; radius: number }[] = [
  { x: -0.30, radius: 0.05  },  // tennis ball (radius 0.04)
  { x:  0.00, radius: 0.055 },  // apple       (radius 0.045)
  { x:  0.30, radius: 0.085 },  // baseball    (radius 0.075)
]

type Props = { position: [number, number, number] }

/**
 * Wooden tray with three round indentations — visual home for the three
 * lab objects. Single fixed cuboid collider; the indentations are visual
 * recesses only (Rapier doesn't support concave colliders cheaply, and
 * for the lab's pedagogy a flat collider that the balls rest on is fine).
 */
export function ObjectTray({ position }: Props) {
  return (
    <RigidBody type="fixed" colliders={false} position={position}>
      {/* Solid collider for the tray slab */}
      <CuboidCollider args={[TRAY_W / 2, TRAY_H / 2, TRAY_D / 2]} />

      {/* Tray slab body */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[TRAY_W, TRAY_H, TRAY_D]} />
        <meshStandardMaterial color="#2a1c10" roughness={0.7} envMapIntensity={0.25} />
      </mesh>

      {/* Visual indentations — disc darker than the tray top, sitting just
          above the tray top surface so they're visible without z-fighting. */}
      {INDENTATIONS.map((it, i) => (
        <mesh
          key={i}
          position={[it.x, TRAY_H / 2 - INDENTATION_DEPTH / 2 + 0.0005, 0]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[it.radius * 0.7, it.radius, 32]} />
          <meshStandardMaterial color="#1a0e06" roughness={0.85} envMapIntensity={0.15} side={2} />
        </mesh>
      ))}
    </RigidBody>
  )
}
