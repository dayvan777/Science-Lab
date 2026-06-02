import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, CanvasTexture, RepeatWrapping, DoubleSide, Shape, MeshStandardMaterial } from 'three'
import { usePerchState } from '../state/PerchState'
import { useReducedMotion } from '../../../sdk/a11y/useReducedMotion'
import { BODY, COLORS, dampAlpha } from './anatomy'
import { flapAngle } from './cut'

/** Olive→pale gradient + dark vertical bars (perch markings); zero asset files. */
function makeSkin(): CanvasTexture {
  const w = 256, h = 128
  const c = document.createElement('canvas'); c.width = w; c.height = h
  const ctx = c.getContext('2d')!
  const g = ctx.createLinearGradient(0, 0, 0, h)
  g.addColorStop(0, COLORS.back); g.addColorStop(0.6, '#94a05e'); g.addColorStop(1, COLORS.belly)
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = 'rgba(40,55,20,0.34)'
  for (let i = 0; i < 7; i++) ctx.fillRect(18 + i * 34, 0, 10, h * 0.72)
  const tex = new CanvasTexture(c); tex.wrapS = tex.wrapT = RepeatWrapping
  return tex
}

/** A flat double-sided fin from 2D points, placed + rotated. */
function Fin({ pts, position, rotation, color }: { pts: [number, number][]; position: [number, number, number]; rotation?: [number, number, number]; color: string }) {
  const geo = useMemo(() => {
    const s = new Shape()
    s.moveTo(pts[0][0], pts[0][1])
    pts.slice(1).forEach(([x, y]) => s.lineTo(x, y))
    s.closePath()
    return s
  }, [pts])
  return (
    <mesh position={position} rotation={rotation}>
      <shapeGeometry args={[geo]} />
      <meshStandardMaterial color={color} side={DoubleSide} roughness={0.7} transparent opacity={0.95} />
    </mesh>
  )
}

export function PerchBody() {
  const reduced = useReducedMotion()
  const cutProgress = usePerchState(s => s.cutProgress)
  const flapRef = useRef<Group>(null)
  const skin = useMemo(() => makeSkin(), [])
  const bodyMat = useMemo(() => new MeshStandardMaterial({ map: skin, roughness: 0.55, side: DoubleSide }), [skin])
  const flapMat = useMemo(() => new MeshStandardMaterial({ map: skin, roughness: 0.55, side: DoubleSide }), [skin])
  const cavityMat = useMemo(() => new MeshStandardMaterial({ color: COLORS.cavity, roughness: 0.9, side: DoubleSide }), [])

  useFrame((_, dt) => {
    const g = flapRef.current
    if (!g) return
    const target = flapAngle(cutProgress)
    g.rotation.x = reduced ? target : g.rotation.x + (target - g.rotation.x) * dampAlpha(dt, 9)
  })

  return (
    <group>
      {/* far body wall (z<0 hemisphere) */}
      <mesh scale={[BODY.L, BODY.H, BODY.W]} material={bodyMat}>
        <sphereGeometry args={[1, 56, 36, Math.PI, Math.PI]} />
      </mesh>
      {/* dark cavity backing just inside the far wall */}
      <mesh scale={[BODY.L * 0.96, BODY.H * 0.95, BODY.W * 0.9]} material={cavityMat}>
        <sphereGeometry args={[1, 40, 28, Math.PI, Math.PI]} />
      </mesh>

      {/* near body wall = FLAP (z>0 hemisphere), hinged at the dorsal ridge */}
      <group ref={flapRef} position={[0, BODY.H, 0]}>
        <mesh position={[0, -BODY.H, 0]} scale={[BODY.L, BODY.H, BODY.W]} material={flapMat}>
          <sphereGeometry args={[1, 56, 36, 0, Math.PI]} />
        </mesh>
      </group>

      {/* tail (forked) */}
      <Fin pts={[[0, 0], [0.7, 0.42], [0.46, 0], [0.7, -0.42]]} position={[BODY.L * 0.98, 0, 0]} rotation={[Math.PI / 2, 0, 0]} color={COLORS.finOlive} />
      {/* dorsal fins (spiny + soft) */}
      <Fin pts={[[0, 0], [0.18, 0.5], [0.5, 0.12], [0.7, 0]]} position={[-0.2, BODY.H * 0.92, 0]} rotation={[Math.PI / 2, 0, 0]} color={COLORS.finOlive} />
      <Fin pts={[[0, 0], [0.22, 0.34], [0.5, 0]]} position={[0.7, BODY.H * 0.92, 0]} rotation={[Math.PI / 2, 0, 0]} color={COLORS.finOlive} />
      {/* anal + pelvic + pectoral (reddish) */}
      <Fin pts={[[0, 0], [0.18, -0.3], [0.42, 0]]} position={[0.7, -BODY.H * 0.9, 0]} rotation={[Math.PI / 2, 0, 0]} color={COLORS.finRed} />
      <Fin pts={[[0, 0], [0.12, -0.28], [0.3, 0]]} position={[-0.5, -BODY.H * 0.85, 0.2]} rotation={[Math.PI / 2, 0, 0.3]} color={COLORS.finRed} />
      <Fin pts={[[0, 0], [0.26, -0.16], [0.28, 0.14]]} position={[-0.85, -0.1, BODY.W * 0.8]} rotation={[0, 0.5, -0.4]} color={COLORS.finRed} />

      {/* operculum hint (gill-cover plate) */}
      <mesh position={[-1.15, 0.05, BODY.W * 0.55]} rotation={[0, 0.5, 0]}>
        <boxGeometry args={[0.05, 0.7, 0.5]} />
        <meshStandardMaterial color={COLORS.operculum} roughness={0.5} />
      </mesh>
      {/* eye */}
      <mesh position={[-1.55, 0.18, BODY.W * 0.55]}>
        <sphereGeometry args={[0.12, 16, 12]} />
        <meshStandardMaterial color="#f2efe0" />
      </mesh>
      <mesh position={[-1.63, 0.18, BODY.W * 0.58]}>
        <sphereGeometry args={[0.06, 12, 10]} />
        <meshStandardMaterial color={COLORS.eye} />
      </mesh>
    </group>
  )
}
