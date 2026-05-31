export type OrganId = 'brain' | 'heart' | 'lungs' | 'liver' | 'kidneys'

export interface OrganDef {
  id: OrganId
  /** Public path to the GLB under public/models. */
  file: string
  /** Ukrainian display name. */
  label: string
  /** Base material colour (hex). */
  color: string
  /** Render a mirrored twin (for the kidney pair). */
  mirrored?: boolean
  /** 3-4 short Ukrainian facts (6-7 клас). */
  facts: string[]
}

export const ORGANS: OrganDef[] = [
  {
    id: 'brain',
    file: '/models/brain.glb',
    label: 'Мозок',
    color: '#cbb4ad',
    facts: [
      'Керує всім тілом — думками, рухами, відчуттями й пам’яттю.',
      'Має близько 86 мільярдів нервових клітин — нейронів.',
      'Важить ~1.4 кг, але споживає майже п’яту частину всієї енергії тіла.',
      'Поділений на дві півкулі — ліву і праву.',
    ],
  },
  {
    id: 'heart',
    file: '/models/heart.glb',
    label: 'Серце',
    color: '#a8392f',
    facts: [
      'М’яз завбільшки з твій кулак, що качає кров по всьому тілу.',
      'Б’ється 60-100 разів на хвилину — близько 100 000 разів на добу.',
      'Має 4 камери: два передсердя і два шлуночки.',
      'Ніколи не відпочиває — працює все життя без зупинки.',
    ],
  },
  {
    id: 'lungs',
    file: '/models/lungs.glb',
    label: 'Легені',
    color: '#cf8a92',
    facts: [
      'Дві губчасті частки, що дають крові кисень і виводять вуглекислий газ.',
      'Права легеня більша (3 частки), ліва менша — поруч місце для серця.',
      'Усередині ~300-500 мільйонів крихітних пухирців — альвеол.',
      'Якщо їх розкласти, площа була б як тенісний корт.',
    ],
  },
  {
    id: 'liver',
    file: '/models/liver.glb',
    label: 'Печінка',
    color: '#6f4034',
    facts: [
      'Найбільший внутрішній орган — важить близько 1.5 кг.',
      'Очищає кров від шкідливих речовин.',
      'Виробляє жовч, яка допомагає перетравлювати їжу.',
      'Єдиний орган, що здатний сам відновлюватися.',
    ],
  },
  {
    id: 'kidneys',
    file: '/models/kidney.glb',
    label: 'Нирки',
    color: '#9c5446',
    mirrored: true,
    facts: [
      'Пара органів у формі квасолин — фільтри тіла.',
      'Очищають кров і утворюють сечу.',
      'За добу проганяють крізь себе ~180 літрів крові.',
      'Підтримують баланс води й солей в організмі.',
    ],
  },
]

export const ORGAN_IDS: OrganId[] = ORGANS.map(o => o.id)

export function getOrgan(id: OrganId): OrganDef {
  const o = ORGANS.find(x => x.id === id)
  if (!o) throw new Error(`Unknown organ id: ${id}`)
  return o
}
