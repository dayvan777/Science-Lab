import { Suspense, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Environment as DreiEnvironment, Loader } from '@react-three/drei'
import {
  ACESFilmicToneMapping, Group, InstancedMesh, Object3D, Vector3, Points,
  BufferGeometry, Float32BufferAttribute,
} from 'three'

/** QUALITY SPIKE — not the final lab. Procedural Paramecium drifting in pond water. */
const A = 1.5, B = 0.75, C = 0.6
const UP = new Vector3(0, 1, 0)
const CILIA = 420

function Cilia() {
  const ref = useRef<InstancedMesh>(null)
  const dummy = useMemo(() => new Object3D(), [])
  const data = useMemo(() => {
    const pts: Vector3[] = [], nrm: Vector3[] = [], ph: number[] = []
    const golden = Math.PI * (3 - Math.sqrt(5))
    for (let i = 0; i < CILIA; i++) {
      const y = 1 - (i / (CILIA - 1)) * 2
      const r = Math.sqrt(Math.max(0, 1 - y * y))
      const th = golden * i
      const sx = Math.cos(th) * r, sy = y, sz = Math.sin(th) * r
      pts.push(new Vector3(sx * A, sy * B, sz * C))
      nrm.push(new Vector3(sx / A, sy / B, sz / C).normalize())
      ph.push(sx)
    }
    return { pts, nrm, ph }
  }, [])
  useFrame((state) => {
    const m = ref.current
    if (!m) return
    const t = state.clock.elapsedTime
    for (let i = 0; i < CILIA; i++) {
      dummy.position.copy(data.pts[i]).addScaledVector(data.nrm[i], 0.06)
      dummy.quaternion.setFromUnitVectors(UP, data.nrm[i])
      dummy.rotateX(Math.sin(t * 6 + data.ph[i] * 3) * 0.5)
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
    }
    m.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, CILIA]}>
      <coneGeometry args={[0.018, 0.13, 5]} />
      <meshStandardMaterial color="#bfeee2" transparent opacity={0.85} />
    </instancedMesh>
  )
}

function Blob({ p, r, color, scale }: { p: [number, number, number]; r: number; color: string; scale?: [number, number, number] }) {
  return (
    <mesh position={p} scale={scale}>
      <sphereGeometry args={[r, 24, 20]} />
      <meshStandardMaterial color={color} roughness={0.5} transparent opacity={0.85} />
    </mesh>
  )
}

function Cell() {
  const g = useRef<Group>(null)
  useFrame((state, dt) => {
    if (!g.current) return
    const t = state.clock.elapsedTime
    g.current.position.set(Math.sin(t * 0.3) * 0.4, Math.cos(t * 0.23) * 0.25, Math.sin(t * 0.17) * 0.2)
    g.current.rotation.z = Math.sin(t * 0.2) * 0.15
    g.current.rotation.y += dt * 0.15
  })
  return (
    <group ref={g}>
      <mesh scale={[A, B, C]}>
        <sphereGeometry args={[1, 64, 48]} />
        <meshPhysicalMaterial color="#9fe6d8" transparent opacity={0.22} roughness={0.12} clearcoat={0.6} clearcoatRoughness={0.25} ior={1.33} depthWrite={false} />
      </mesh>
      <Cilia />
      <Blob p={[0.1, 0, 0]} r={0.3} color="#f0be78" scale={[1.4, 0.9, 0.9]} />
      <Blob p={[0.45, 0.15, 0.05]} r={0.1} color="#caa06e" />
      <Blob p={[-0.9, 0.25, 0]} r={0.18} color="#9ccdf2" />
      <Blob p={[0.95, -0.1, 0]} r={0.18} color="#9ccdf2" />
      <Blob p={[-0.3, -0.2, 0.2]} r={0.13} color="#a7c46a" />
      <Blob p={[0.5, 0.2, -0.2]} r={0.13} color="#a7c46a" />
      <Blob p={[0.8, -0.2, 0.15]} r={0.13} color="#a7c46a" />
      <mesh position={[-0.2, -0.55, 0.3]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.22, 0.4, 20, 1, true]} />
        <meshStandardMaterial color="#7fc8c0" roughness={0.4} transparent opacity={0.6} side={2} />
      </mesh>
    </group>
  )
}

function Particles() {
  const ref = useRef<Points>(null)
  const geo = useMemo(() => {
    const N = 240, arr: number[] = []
    for (let i = 0; i < N; i++) arr.push((Math.random() - 0.5) * 14, (Math.random() - 0.5) * 9, (Math.random() - 0.5) * 8)
    const g = new BufferGeometry()
    g.setAttribute('position', new Float32BufferAttribute(arr, 3))
    return g
  }, [])
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.y += dt * 0.02 })
  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial color="#bfeee8" size={0.05} sizeAttenuation transparent opacity={0.5} />
    </points>
  )
}

export function ParameciumSpike() {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(ellipse at 50% 35%, #11383d 0%, #0a1c26 55%, #06121a 100%)' }}>
      <Canvas dpr={[1, 2]} camera={{ position: [0, 0.5, 5.5], fov: 45 }} gl={{ toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1.1 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[4, 6, 5]} intensity={1.2} />
        <directionalLight position={[-5, -2, -3]} intensity={0.4} color="#9fd8ff" />
        <Suspense fallback={null}>
          <Cell />
          <Particles />
          <DreiEnvironment preset="city" environmentIntensity={0.4} />
        </Suspense>
        <OrbitControls makeDefault enableDamping autoRotate autoRotateSpeed={0.5} minDistance={2} maxDistance={11} />
      </Canvas>
      <div style={{ position: 'fixed', top: 18, left: 18, maxWidth: 400, color: '#EAF6F4', fontFamily: 'Inter, system-ui, sans-serif', pointerEvents: 'none' }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>Інфузорія-туфелька · spike</div>
        <div style={{ fontSize: 13, color: '#9fc4c0', marginTop: 5, lineHeight: 1.5 }}>
          Процедурна клітина в краплині води: скляне тіло, війки, що б'ються, органели. Перевірка 3D-якості, не фінальна лаба.
        </div>
      </div>
      <Loader />
    </div>
  )
}
