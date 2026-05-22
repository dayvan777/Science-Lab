import type { ReactNode } from 'react'

/**
 * A labelled section inside a BottomSheet — an uppercase caption above a
 * control slot. Shared by both labs' mobile settings sheets. Extracted from
 * the two LabScene files where it was byte-identical.
 */
export function SheetSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div
        style={{
          fontSize: 11,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: '#86868b',
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  )
}
