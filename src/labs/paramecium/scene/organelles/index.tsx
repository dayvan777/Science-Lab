import { ORGANELLES, type OrganelleId } from '../../content/organelles'
import { OrganelleShell, type OrganelleRenderer } from './OrganelleShell'
import { GenericBlob } from './GenericBlob'
import { Trichocysts } from './Trichocysts'
import { ContractileVacuoles } from './ContractileVacuoles'
import { FoodVacuoles } from './FoodVacuoles'

const POINT_ORGANELLES = ORGANELLES.filter(o => o.kind !== 'layer')

/** id → specialized renderer. Anything not listed falls back to GenericBlob. */
const RENDERERS: Partial<Record<OrganelleId, OrganelleRenderer>> = {
  contractileVacuoles: ContractileVacuoles,
  foodVacuoles: FoodVacuoles,
}

export function Organelles() {
  return (
    <>
      {POINT_ORGANELLES.map(def => (
        <OrganelleShell key={def.id} def={def} Renderer={RENDERERS[def.id] ?? GenericBlob} />
      ))}
      <Trichocysts />
    </>
  )
}
