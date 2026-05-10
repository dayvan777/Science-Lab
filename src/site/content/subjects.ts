/**
 * Single source of truth for the navigation tree on the landing page +
 * the lab list on each subject page. Adding a new lab in the future is
 * a one-entry change here.
 */

export type LabStatus = 'available' | 'soon'

export type LabEntry = {
  id: string
  title: string
  /** Optional one-line subtitle shown under the title on a subject page card. */
  subtitle?: string
  path: string
  status: LabStatus
}

export type SubjectId = 'math' | 'history' | 'physics'

export type SubjectEntry = {
  id: SubjectId
  title: string
  path: string
  status: LabStatus
  labs: LabEntry[]
}

export const SUBJECTS: SubjectEntry[] = [
  {
    id: 'math',
    title: 'Математика',
    path: '/math',
    status: 'soon',
    labs: [],
  },
  {
    id: 'history',
    title: 'Історія',
    path: '/history',
    status: 'soon',
    labs: [],
  },
  {
    id: 'physics',
    title: 'Фізика',
    path: '/physics',
    status: 'available',
    labs: [
      {
        id: 'mass-measurement',
        title: 'Вимірювання маси тіл',
        subtitle: 'Електронні ваги · Важільні · Динамометр',
        path: '/physics/mass-measurement',
        status: 'available',
      },
    ],
  },
]

export function findSubject(id: SubjectId): SubjectEntry | undefined {
  return SUBJECTS.find(s => s.id === id)
}
