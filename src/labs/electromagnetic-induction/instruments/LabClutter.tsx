import { RoundedBox } from '@react-three/drei'

const NOTEBOOK_W = 0.14
const NOTEBOOK_D = 0.10
const NOTEBOOK_H = 0.008

type Props = {
  /** World position of the notebook (front of the table, near magnet tray). */
  notebookWorld: [number, number, number]
}

/**
 * Decorative lab notebook — purely visual, no physics. Adds the "lived-in
 * lab desk" feel. Spool + spare-magnet were removed (they read as duplicate
 * coil + magnet, confusing the scene).
 */
export function LabClutter({ notebookWorld }: Props) {
  return (
    <group>
      {/* Notebook — dark blue cover, slightly rotated */}
      <RoundedBox
        args={[NOTEBOOK_W, NOTEBOOK_H, NOTEBOOK_D]}
        radius={0.001}
        smoothness={2}
        position={notebookWorld}
        rotation={[0, Math.PI / 12, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color="#1a3060" roughness={0.70} envMapIntensity={0.30} />
      </RoundedBox>
      {/* Page-edge stripe sitting just above the notebook top face */}
      <mesh
        position={[notebookWorld[0], notebookWorld[1] + NOTEBOOK_H / 2 + 0.0005, notebookWorld[2]]}
        rotation={[0, Math.PI / 12, 0]}
      >
        <boxGeometry args={[NOTEBOOK_W * 0.98, 0.0008, NOTEBOOK_D * 0.98]} />
        <meshStandardMaterial color="#e0d8c0" roughness={0.9} />
      </mesh>
    </group>
  )
}
