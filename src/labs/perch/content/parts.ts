export type PartId =
  | 'dorsalFins' | 'caudalFin' | 'analFin' | 'pectoralFins' | 'pelvicFins'
  | 'operculum' | 'lateralLine' | 'scales' | 'head'
  | 'gills' | 'heart' | 'liver' | 'swimBladder' | 'stomach' | 'intestine' | 'kidney'

export type PartPhase = 'external' | 'internal'
export type PartKind = 'fin' | 'plate' | 'line' | 'region' | 'organ'

export interface PartDef {
  id: PartId
  label: string
  phase: PartPhase
  kind: PartKind
  color: string
  /** Label/leader anchor in body-local frame. */
  position: [number, number, number]
  facts: string[]
}

export const PARTS: PartDef[] = [
  // ── External ──
  { id: 'dorsalFins', label: 'Спинні плавці', phase: 'external', kind: 'fin', color: '#9aa86a', position: [0.1, 1.15, 0],
    facts: ["Два спинні плавці: передній з твердими колючками — захист, задній м'який — для рівноваги."] },
  { id: 'caudalFin', label: 'Хвостовий плавець', phase: 'external', kind: 'fin', color: '#9aa86a', position: [2.5, 0.1, 0],
    facts: ['Хвостовий плавець — головний «мотор»: штовхає рибу вперед і задає напрям руху.'] },
  { id: 'analFin', label: 'Анальний плавець', phase: 'external', kind: 'fin', color: '#c8623c', position: [1.0, -0.95, 0],
    facts: ['Непарний плавець під хвостом — допомагає триматися рівно й не перевертатися.'] },
  { id: 'pectoralFins', label: 'Грудні плавці', phase: 'external', kind: 'fin', color: '#c8623c', position: [-0.85, -0.1, 0.7],
    facts: ['Пара плавців по боках за головою; ними риба повертає, гальмує й зависає на місці.'] },
  { id: 'pelvicFins', label: 'Черевні плавці', phase: 'external', kind: 'fin', color: '#c8623c', position: [-0.5, -0.85, 0.5],
    facts: ['Пара плавців знизу — допомагають рухатися вгору-вниз і утримувати рівновагу.'] },
  { id: 'operculum', label: 'Зяброва кришка', phase: 'external', kind: 'plate', color: '#8a9a6a', position: [-1.2, 0.3, 0.6],
    facts: ['Кісткова кришка прикриває зябра й працює як насос, проганяючи воду крізь них.'] },
  { id: 'lateralLine', label: 'Бічна лінія', phase: 'external', kind: 'line', color: '#5c673f', position: [0.3, 0.2, 0.55],
    facts: ['Орган чуття вздовж тіла: відчуває рух і коливання води, навіть у темряві.'] },
  { id: 'scales', label: 'Луска', phase: 'external', kind: 'region', color: '#94a05e', position: [0.6, 0.45, 0.55],
    facts: ['Тіло вкрите кістковою лускою; вона росте все життя, і по кільцях визначають вік риби.'] },
  { id: 'head', label: 'Голова', phase: 'external', kind: 'region', color: '#7e8a5a', position: [-1.7, 0.2, 0.3],
    facts: ['На голові — очі без повік, ніздрі (лише для нюху) і рот із дрібними зубами.'] },
  // ── Internal ──
  { id: 'gills', label: 'Зябра', phase: 'internal', kind: 'organ', color: '#c0392b', position: [-1.15, 0.05, 0.18],
    facts: ['Червоні зяброві пелюстки; крізь них риба дихає, забираючи з води розчинений кисень.'] },
  { id: 'heart', label: 'Серце', phase: 'internal', kind: 'organ', color: '#b02a1e', position: [-0.92, -0.5, 0.12],
    facts: ['Двокамерне серце жене кров до зябер — у риби одне коло кровообігу.'] },
  { id: 'liver', label: 'Печінка', phase: 'internal', kind: 'organ', color: '#8c5a3c', position: [-0.5, -0.42, 0.12],
    facts: ['Велика печінка виробляє жовч для травлення й запасає поживні речовини.'] },
  { id: 'swimBladder', label: 'Плавальний міхур', phase: 'internal', kind: 'organ', color: '#d6dce0', position: [0.05, 0.32, 0.06],
    facts: ['Наповнений газом міхур регулює глибину — риба спливає чи занурюється, не витрачаючи сил.'] },
  { id: 'stomach', label: 'Шлунок', phase: 'internal', kind: 'organ', color: '#b89a6a', position: [-0.05, -0.46, 0.12],
    facts: ['У шлунку здобич (дрібна риба, личинки) починає перетравлюватися.'] },
  { id: 'intestine', label: 'Кишечник', phase: 'internal', kind: 'organ', color: '#b8a86a', position: [0.5, -0.5, 0.12],
    facts: ['У звивистому кишечнику поживні речовини всмоктуються в кров.'] },
  { id: 'kidney', label: 'Нирки', phase: 'internal', kind: 'organ', color: '#6a5a7a', position: [0.1, 0.5, -0.04],
    facts: ['Темні нирки вздовж хребта очищають кров і виводять зайву воду.'] },
]

export const PART_IDS: PartId[] = PARTS.map(p => p.id)

export function getPart(id: PartId): PartDef {
  const p = PARTS.find(x => x.id === id)
  if (!p) throw new Error(`Unknown part id: ${id}`)
  return p
}
