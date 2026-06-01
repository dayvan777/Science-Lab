export type OrganelleId =
  | 'cilia' | 'pellicle' | 'oral' | 'foodVacuoles' | 'contractileVacuoles'
  | 'macronucleus' | 'micronucleus' | 'trichocysts' | 'analPore'

export type OrganelleKind = 'layer' | 'blob' | 'pair' | 'funnel'

export interface OrganelleDef {
  id: OrganelleId
  label: string
  color: string
  kind: OrganelleKind
  /** Render points in the cell's local frame (A=1.5,B=0.75,C=0.6). Omitted for `layer`. */
  positions?: [number, number, number][]
  /** Sphere radius for blob/pair points. */
  radius?: number
  /** Optional ellipsoid scale for a blob (e.g. macronucleus). */
  scale?: [number, number, number]
  facts: string[]
}

export const ORGANELLES: OrganelleDef[] = [
  {
    id: 'cilia', label: 'Війки', color: '#bfeee2', kind: 'layer',
    facts: ["Тонкі волоски по всьому тілу. Б'ються хвилями — клітина пливе, а ще вони женуть бактерій до рота."],
  },
  {
    id: 'pellicle', label: 'Пелікула', color: '#9fe6d8', kind: 'layer',
    facts: ['Щільна еластична оболонка. Тримає сталу форму «туфельки» й захищає клітину.'],
  },
  {
    id: 'oral', label: 'Клітинний рот і глотка', color: '#7fc8c0', kind: 'funnel',
    positions: [[-0.2, -0.55, 0.3]], radius: 0.18,
    facts: ['Заглибина з війками заганяє бактерій у глотку, де утворюється травна вакуоля.'],
  },
  {
    id: 'foodVacuoles', label: 'Травні вакуолі', color: '#a7c46a', kind: 'blob',
    positions: [[-0.3, -0.2, 0.2], [0.5, 0.2, -0.2], [0.8, -0.2, 0.15], [-0.1, 0.3, -0.1]], radius: 0.13,
    facts: ['Пухирці, що перетравлюють спійманих бактерій і всмоктують поживні речовини.'],
  },
  {
    id: 'contractileVacuoles', label: 'Скоротливі вакуолі', color: '#9ccdf2', kind: 'pair',
    positions: [[-0.9, 0.25, 0], [0.95, -0.1, 0]], radius: 0.18,
    facts: ['Дві «помпи» — спереду й ззаду. Відкачують зайву воду, щоб клітина не луснула.'],
  },
  {
    id: 'macronucleus', label: 'Макронуклеус', color: '#f0be78', kind: 'blob',
    positions: [[0.1, 0, 0]], radius: 0.3, scale: [1.4, 0.9, 0.9],
    facts: ['Велике ядро. Керує повсякденним життям клітини: рухом, живленням, виділенням.'],
  },
  {
    id: 'micronucleus', label: 'Мікронуклеус', color: '#caa06e', kind: 'blob',
    positions: [[0.45, 0.15, 0.05]], radius: 0.1,
    facts: ['Мале ядро. Зберігає спадкову інформацію — головне для розмноження.'],
  },
  {
    id: 'trichocysts', label: 'Трихоцисти', color: '#dfeaf2', kind: 'layer',
    facts: ['Захисні «стріли» під оболонкою. Вистрілюють назовні, коли клітину турбують.'],
  },
  {
    id: 'analPore', label: 'Порошиця', color: '#8fb0a8', kind: 'blob',
    positions: [[1.2, -0.3, 0.1]], radius: 0.08,
    facts: ['Отвір ззаду, через який викидаються неперетравлені рештки їжі.'],
  },
]

export const ORGANELLE_IDS: OrganelleId[] = ORGANELLES.map(o => o.id)

export function getOrganelle(id: OrganelleId): OrganelleDef {
  const o = ORGANELLES.find(x => x.id === id)
  if (!o) throw new Error(`Unknown organelle id: ${id}`)
  return o
}
