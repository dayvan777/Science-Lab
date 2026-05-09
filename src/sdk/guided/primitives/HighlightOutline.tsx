import { Outlines } from '@react-three/drei'

type Props = { color?: string; thickness?: number }

export function HighlightOutline({ color = '#0071e3', thickness = 4 }: Props) {
  return <Outlines thickness={thickness} color={color} />
}
