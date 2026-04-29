import { Canvas } from '@react-three/fiber'
import { Lighting } from './Lighting'

export function LabScene() {
  return (
    <Canvas
      camera={{ position: [0, 1.5, 2.0], fov: 50 }}
      shadows
      style={{ position: 'fixed', inset: 0, background: '#2a2a2a' }}
    >
      <Lighting />
      <mesh castShadow position={[0, 0.5, 0]}>
        <boxGeometry args={[0.3, 0.3, 0.3]} />
        <meshStandardMaterial color="orange" />
      </mesh>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[5, 5]} />
        <meshStandardMaterial color="#404040" />
      </mesh>
    </Canvas>
  )
}
