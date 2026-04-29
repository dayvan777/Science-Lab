import { Canvas } from '@react-three/fiber'

export function LabScene() {
  return (
    <Canvas
      camera={{ position: [0, 1.5, 2.0], fov: 50 }}
      shadows
      style={{ position: 'fixed', inset: 0, background: '#1a1a1a' }}
    >
      <ambientLight intensity={0.5} />
      <mesh>
        <boxGeometry args={[0.3, 0.3, 0.3]} />
        <meshStandardMaterial color="orange" />
      </mesh>
    </Canvas>
  )
}
