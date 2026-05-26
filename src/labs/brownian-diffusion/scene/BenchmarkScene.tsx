import { useEffect, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { InstancedMesh, Matrix4, Object3D } from 'three'
import { Particle, randomVelocity, PARTICLE_DEFAULTS } from '../physics/particles'
import { step, AABB } from '../physics/kinetics'

const COUNT = 150
const BOX: AABB = { min: { x: -0.1, y: -0.1, z: -0.1 }, max: { x: 0.1, y: 0.1, z: 0.1 } }

function makeParticles(n: number): Particle[] {
  const out: Particle[] = []
  for (let i = 0; i < n; i++) {
    const kind = i < n / 2 ? 'red' : 'blue'
    const def = PARTICLE_DEFAULTS[kind]
    out.push({
      kind,
      pos: {
        x: (Math.random() - 0.5) * 0.18,
        y: (Math.random() - 0.5) * 0.18,
        z: (Math.random() - 0.5) * 0.18,
      },
      vel: randomVelocity(0.3),
      mass: def.mass,
      radius: def.radius,
    })
  }
  return out
}

function ParticleSwarm({ onFps }: { onFps: (fps: number) => void }) {
  const meshRef = useRef<InstancedMesh>(null)
  const particles = useRef<Particle[]>(makeParticles(COUNT))
  const dummy = useRef(new Object3D())
  const tmp = useRef(new Matrix4())
  const frames = useRef(0)
  const lastReport = useRef(performance.now())

  useFrame((_state, delta) => {
    const dt = Math.min(delta, 1 / 60)
    step(particles.current, BOX, null, dt)

    const m = meshRef.current
    if (m) {
      for (let i = 0; i < particles.current.length; i++) {
        const p = particles.current[i]
        dummy.current.position.set(p.pos.x, p.pos.y, p.pos.z)
        dummy.current.scale.setScalar(p.radius * 2 * 100)
        dummy.current.updateMatrix()
        m.setMatrixAt(i, dummy.current.matrix)
      }
      m.instanceMatrix.needsUpdate = true
    }

    frames.current++
    const now = performance.now()
    if (now - lastReport.current >= 1000) {
      onFps(frames.current)
      frames.current = 0
      lastReport.current = now
    }
    tmp.current
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, COUNT]}>
      <sphereGeometry args={[1, 8, 6]} />
      <meshBasicMaterial color="#88c4ff" />
    </instancedMesh>
  )
}

export function BenchmarkScene() {
  const [fps, setFps] = useState(0)
  const [history, setHistory] = useState<number[]>([])
  useEffect(() => {
    if (fps > 0) setHistory(h => [...h.slice(-29), fps])
  }, [fps])
  const avg = history.length ? Math.round(history.reduce((a, b) => a + b, 0) / history.length) : 0

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0a0a0c' }}>
      <Canvas camera={{ position: [0, 0, 0.4], fov: 50 }} dpr={[1, 1.5]}>
        <ambientLight intensity={1.2} />
        <ParticleSwarm onFps={setFps} />
      </Canvas>
      <div style={{
        position: 'fixed', top: 16, left: 16, padding: '12px 16px',
        background: 'rgba(0,0,0,0.7)', color: '#fff', fontFamily: 'monospace',
        borderRadius: 8, fontSize: 14, lineHeight: 1.6,
      }}>
        <div>Particles: {COUNT}</div>
        <div>FPS (now): {fps}</div>
        <div>FPS (avg of last {history.length}): {avg}</div>
        <div style={{ opacity: 0.7, fontSize: 12, marginTop: 8 }}>
          Throttle CPU ×4 in DevTools to simulate mobile.
        </div>
      </div>
    </div>
  )
}
