import { RoundedBox } from '@react-three/drei'

const NOTEBOOK_W = 0.14
const NOTEBOOK_D = 0.10
const NOTEBOOK_H = 0.008

const SPOOL_R = 0.025
const SPOOL_H = 0.030

const SPARE_MAGNET_L = 0.06
const SPARE_MAGNET_THICK = 0.024

type Props = {
  /** World position of the notebook (front of the table, near magnet tray). */
  notebookWorld: [number, number, number]
  /** World position of the copper wire spool. */
  spoolWorld: [number, number, number]
  /** World position of the spare bar magnet (decorative — no drag). */
  spareMagnetWorld: [number, number, number]
}

/**
 * Three decorative props sitting on the lab table — purely visual, no
 * physics. Adds the "lived-in lab desk" feel after the user reported the
 * stage looked sparse.
 *
 *   1. Notebook — dark-blue closed book with a thin paper-coloured stripe
 *      along the page edge, slightly rotated for a natural look.
 *   2. Copper wire spool — a brass-toned cylinder with darker end caps,
 *      echoing the coil material.
 *   3. Spare bar magnet — a non-draggable lookalike of the playable magnet,
 *      sitting at rest for visual decoration only.
 */
export function LabClutter({ notebookWorld, spoolWorld, spareMagnetWorld }: Props) {
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

      {/* Copper wire spool — cylinder + two darker end caps */}
      <group position={spoolWorld}>
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[SPOOL_R, SPOOL_R, SPOOL_H, 24]} />
          <meshStandardMaterial color="#b67333" metalness={0.75} roughness={0.30} envMapIntensity={0.7} />
        </mesh>
        <mesh position={[0, SPOOL_H / 2 + 0.001, 0]} castShadow>
          <cylinderGeometry args={[SPOOL_R * 1.05, SPOOL_R * 1.05, 0.003, 24]} />
          <meshStandardMaterial color="#3a2a1a" roughness={0.85} />
        </mesh>
        <mesh position={[0, -SPOOL_H / 2 - 0.001, 0]} castShadow>
          <cylinderGeometry args={[SPOOL_R * 1.05, SPOOL_R * 1.05, 0.003, 24]} />
          <meshStandardMaterial color="#3a2a1a" roughness={0.85} />
        </mesh>
      </group>

      {/* Spare bar magnet — visual only, NOT a Draggable.
          Oriented along z so it doesn't look like a duplicate of the
          playable magnet (which is along x). */}
      <group position={spareMagnetWorld} rotation={[0, Math.PI / 2, 0]}>
        <mesh position={[-SPARE_MAGNET_L / 4, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[SPARE_MAGNET_L / 2, SPARE_MAGNET_THICK, SPARE_MAGNET_THICK]} />
          <meshStandardMaterial color="#ff3b30" metalness={0.6} roughness={0.4} envMapIntensity={0.5} />
        </mesh>
        <mesh position={[SPARE_MAGNET_L / 4, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[SPARE_MAGNET_L / 2, SPARE_MAGNET_THICK, SPARE_MAGNET_THICK]} />
          <meshStandardMaterial color="#0a84ff" metalness={0.6} roughness={0.4} envMapIntensity={0.5} />
        </mesh>
      </group>
    </group>
  )
}
