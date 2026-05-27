import { Draggable } from '../../../sdk/object/Draggable'
import { PARTICLE_DEFAULTS } from '../physics/particles'

const POLLEN = PARTICLE_DEFAULTS.pollen
//  mass: 30, radius: 0.012, color: [0.90, 0.29, 0.23]

type Props = {
  /** Position when not held — the tray. */
  trayPosition: [number, number, number]
  enabled: boolean
}

export function PollenParticle({ trayPosition, enabled }: Props) {
  return (
    <Draggable
      position={trayPosition}
      mass={POLLEN.mass}
      shape={{ type: 'ball', radius: POLLEN.radius * 2 }}
      bodyId="pollen"
      enabled={enabled}
      dragHeight={0.94}
    >
      <mesh castShadow>
        <sphereGeometry args={[POLLEN.radius * 2, 16, 12]} />
        <meshStandardMaterial
          color={`rgb(${Math.round(POLLEN.color[0] * 255)}, ${Math.round(POLLEN.color[1] * 255)}, ${Math.round(POLLEN.color[2] * 255)})`}
          roughness={0.4}
        />
      </mesh>
    </Draggable>
  )
}
