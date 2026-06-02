import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  Group, SphereGeometry, CanvasTexture, RepeatWrapping, DoubleSide, BackSide, Shape,
  MeshPhysicalMaterial, MeshStandardMaterial,
} from 'three'
import { usePerchState } from '../state/PerchState'
import { useReducedMotion } from '../../../sdk/a11y/useReducedMotion'
import { BODY, COLORS, dampAlpha } from './anatomy'
import { flapAngle } from './cut'
import { bodyProfile, taperGeometry } from './shape'

/** Olive→pale gradient + scale arcs + form bars + lateral line; zero asset files. */
function makeSkin(): CanvasTexture {
  const w = 256, h = 128
  const c = document.createElement('canvas'); c.width = w; c.height = h
  const ctx = c.getContext('2d')!
  const g = ctx.createLinearGradient(0, 0, 0, h)
  g.addColorStop(0, COLORS.back); g.addColorStop(0.55, '#94a05e'); g.addColorStop(1, COLORS.belly)
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h)
  ctx.strokeStyle = 'rgba(60,75,30,0.20)'; ctx.lineWidth = 1
  for (let row = 0, y = 8; y < h * 0.82; y += 9, row++)
    for (let x = (row % 2 ? 5 : 0); x < w; x += 10) {
      ctx.beginPath(); ctx.arc(x, y + 6, 6, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke()
    }
  ctx.fillStyle = 'rgba(40,55,20,0.30)'
  for (let i = 0; i < 7; i++) ctx.fillRect(18 + i * 34, 0, 9, h * 0.72)
  ctx.strokeStyle = 'rgba(50,62,30,0.5)'; ctx.setLineDash([3, 4])
  ctx.beginPath(); ctx.moveTo(0, h * 0.42); ctx.lineTo(w, h * 0.40); ctx.stroke(); ctx.setLineDash([])
  const tex = new CanvasTexture(c); tex.wrapS = tex.wrapT = RepeatWrapping
  return tex
}

function Fin({ pts, position, rotation, color, rays }: { pts: [number, number][]; position: [number, number, number]; rotation?: [number, number, number]; color: string; rays?: [number, number, number, number][] }) {
  const geo = useMemo(() => {
    const s = new Shape(); s.moveTo(pts[0][0], pts[0][1])
    pts.slice(1).forEach(([x, y]) => s.lineTo(x, y)); s.closePath(); return s
  }, [pts])
  return (
    <group position={position} rotation={rotation}>
      <mesh>
        <shapeGeometry args={[geo]} />
        <meshPhysicalMaterial color={color} side={DoubleSide} roughness={0.6} clearcoat={0.5} clearcoatRoughness={0.4} transparent opacity={0.96} />
      </mesh>
      {(rays ?? []).map(([x1, y1, x2, y2], i) => (
        <mesh key={i} position={[(x1 + x2) / 2, (y1 + y2) / 2, 0.001]} rotation={[0, 0, Math.atan2(y2 - y1, x2 - x1)]}>
          <planeGeometry args={[Math.hypot(x2 - x1, y2 - y1), 0.006]} />
          <meshBasicMaterial color="#46522f" transparent opacity={0.5} side={DoubleSide} />
        </mesh>
      ))}
    </group>
  )
}

/** Body half-extent at a world-X, following the taper (for placing fins on the surface). */
const profAt = (wx: number) => bodyProfile((wx / BODY.L + 1) / 2)

export function PerchBody() {
  const reduced = useReducedMotion()
  const cutProgress = usePerchState(s => s.cutProgress)
  const flapRef = useRef<Group>(null)
  const bodyRef = useRef<Group>(null)
  const skin = useMemo(() => makeSkin(), [])

  const farGeo = useMemo(() => { const g = new SphereGeometry(1, 64, 44, Math.PI, Math.PI); taperGeometry(g); return g }, [])
  const flapGeo = useMemo(() => { const g = new SphereGeometry(1, 64, 44, 0, Math.PI); taperGeometry(g); return g }, [])
  const cavityGeo = useMemo(() => { const g = new SphereGeometry(1, 44, 30, Math.PI, Math.PI); taperGeometry(g); return g }, [])

  const skinMat = useMemo(() => new MeshPhysicalMaterial({ map: skin, roughness: 0.5, clearcoat: 0.55, clearcoatRoughness: 0.35, side: DoubleSide }), [skin])
  const flapMat = useMemo(() => new MeshPhysicalMaterial({ map: skin, roughness: 0.5, clearcoat: 0.55, clearcoatRoughness: 0.35, side: DoubleSide }), [skin])
  const liningMat = useMemo(() => new MeshStandardMaterial({ color: '#b07058', roughness: 0.85, side: BackSide }), [])
  const cavityMat = useMemo(() => new MeshStandardMaterial({ color: '#6e5a4c', roughness: 0.9, side: DoubleSide, emissive: '#2a1c14', emissiveIntensity: 0.3 }), [])

  useFrame((st, dt) => {
    const flap = flapRef.current
    if (flap) {
      const target = flapAngle(cutProgress)
      flap.rotation.x = reduced ? target : flap.rotation.x + (target - flap.rotation.x) * dampAlpha(dt, 9)
    }
    const body = bodyRef.current
    if (body) body.scale.setScalar(reduced ? 1 : 1 + Math.sin(st.clock.elapsedTime * 1.2) * 0.012)
  })

  const topY = (wx: number) => BODY.H * profAt(wx)
  const botY = (wx: number) => -BODY.H * profAt(wx)

  return (
    <group ref={bodyRef}>
      <mesh geometry={farGeo} scale={[BODY.L, BODY.H, BODY.W]} material={skinMat} />
      <mesh geometry={cavityGeo} scale={[BODY.L * 0.95, BODY.H * 0.94, BODY.W * 0.9]} material={cavityMat} />

      {/* near wall = FLAP (hinged at dorsal ridge) + inner muscle lining */}
      <group ref={flapRef} position={[0, BODY.H, 0]}>
        <mesh geometry={flapGeo} position={[0, -BODY.H, 0]} scale={[BODY.L, BODY.H, BODY.W]} material={flapMat} />
        <mesh geometry={flapGeo} position={[0, -BODY.H, 0]} scale={[BODY.L * 0.97, BODY.H * 0.97, BODY.W * 0.97]} material={liningMat} />
      </group>

      {/* soft interior light so organs read when the cavity is open */}
      <pointLight position={[0.2, 0, 0.28]} intensity={0.5} distance={2.6} decay={2} color="#ffe8cf" />

      {/* tail (forked) at the narrow peduncle */}
      <Fin pts={[[0, 0], [0.7, 0.42], [0.46, 0], [0.7, -0.42]]} position={[BODY.L * 0.98, 0, 0]} rotation={[Math.PI / 2, 0, 0]} color={COLORS.finOlive} rays={[[0.06, 0.03, 0.62, 0.37], [0.1, 0, 0.44, 0], [0.06, -0.03, 0.62, -0.37]]} />
      {/* dorsal fins follow the tapered back */}
      <Fin pts={[[0, 0], [0.18, 0.5], [0.5, 0.12], [0.7, 0]]} position={[-0.2, topY(-0.2) + 0.02, 0]} rotation={[Math.PI / 2, 0, 0]} color={COLORS.finOlive} rays={[[0.08, 0.06, 0.18, 0.46], [0.24, 0.04, 0.32, 0.30], [0.4, 0.04, 0.46, 0.16]]} />
      <Fin pts={[[0, 0], [0.22, 0.34], [0.5, 0]]} position={[0.7, topY(0.7) + 0.02, 0]} rotation={[Math.PI / 2, 0, 0]} color={COLORS.finOlive} rays={[[0.1, 0.04, 0.18, 0.3], [0.26, 0.02, 0.32, 0.22], [0.4, 0.02, 0.46, 0.1]]} />
      {/* anal + pelvic + pectoral (reddish) on the tapered belly/flank */}
      <Fin pts={[[0, 0], [0.18, -0.3], [0.42, 0]]} position={[0.7, botY(0.7) - 0.02, 0]} rotation={[Math.PI / 2, 0, 0]} color={COLORS.finRed} rays={[[0.07, -0.05, 0.16, -0.26], [0.2, -0.03, 0.3, -0.14]]} />
      <Fin pts={[[0, 0], [0.12, -0.28], [0.3, 0]]} position={[-0.5, botY(-0.5) - 0.02, 0.2]} rotation={[Math.PI / 2, 0, 0.3]} color={COLORS.finRed} rays={[[0.05, -0.05, 0.11, -0.24], [0.14, -0.03, 0.22, -0.12]]} />
      <Fin pts={[[0, 0], [0.26, -0.16], [0.28, 0.14]]} position={[-0.85, -0.1, BODY.W * profAt(-0.85) * 0.85]} rotation={[0, 0.5, -0.4]} color={COLORS.finRed} rays={[[0.07, -0.04, 0.24, -0.14], [0.09, 0.03, 0.25, 0.11]]} />

      {/* operculum (gill-cover plate) */}
      <mesh position={[-1.12, 0.05, BODY.W * profAt(-1.12) * 0.62]} rotation={[0, 0.5, 0]}>
        <boxGeometry args={[0.05, BODY.H * profAt(-1.12) * 1.5, 0.5]} />
        <meshPhysicalMaterial color={COLORS.operculum} roughness={0.45} clearcoat={0.5} />
      </mesh>
      {/* eye (clearcoat highlight) + pupil */}
      <mesh position={[-1.5, 0.16, BODY.W * profAt(-1.5) * 0.6]}>
        <sphereGeometry args={[0.12, 20, 16]} />
        <meshPhysicalMaterial color="#efe9d6" roughness={0.2} clearcoat={1} clearcoatRoughness={0.05} />
      </mesh>
      <mesh position={[-1.58, 0.16, BODY.W * profAt(-1.5) * 0.6 + 0.04]}>
        <sphereGeometry args={[0.06, 14, 12]} />
        <meshStandardMaterial color={COLORS.eye} />
      </mesh>
      {/* mouth slit + nostril */}
      <mesh position={[-1.95, -0.05, 0]} rotation={[0, 0, 0.12]}>
        <boxGeometry args={[0.24, 0.025, 0.42]} />
        <meshStandardMaterial color="#3a2e26" roughness={0.75} />
      </mesh>
      <mesh position={[-1.78, 0.06, BODY.W * profAt(-1.78) * 0.55]}>
        <sphereGeometry args={[0.022, 8, 8]} />
        <meshStandardMaterial color="#2a241e" />
      </mesh>
    </group>
  )
}
