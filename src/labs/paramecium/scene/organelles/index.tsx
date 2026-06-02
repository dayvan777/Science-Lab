import { ORGANELLES, type OrganelleId } from '../../content/organelles'
import { OrganelleShell, type OrganelleRenderer } from './OrganelleShell'
import { Trichocysts } from './Trichocysts'
import { ContractileVacuoles } from './ContractileVacuoles'
import { FoodVacuoles } from './FoodVacuoles'
import { Macronucleus } from './Macronucleus'
import { Micronucleus } from './Micronucleus'
import { OralGroove } from './OralGroove'
import { AnalPore } from './AnalPore'

const POINT_ORGANELLES = ORGANELLES.filter(o => o.kind !== 'layer')

const RENDERERS: Partial<Record<OrganelleId, OrganelleRenderer>> = {
  contractileVacuoles: ContractileVacuoles,
  foodVacuoles: FoodVacuoles,
  macronucleus: Macronucleus,
  micronucleus: Micronucleus,
  oral: OralGroove,
  analPore: AnalPore,
}

export function Organelles() {
  return (
    <>
      {POINT_ORGANELLES.map(def => {
        const Renderer = RENDERERS[def.id]
        return Renderer ? <OrganelleShell key={def.id} def={def} Renderer={Renderer} /> : null
      })}
      <Trichocysts />
    </>
  )
}
