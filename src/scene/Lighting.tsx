import { Environment } from '@react-three/drei'

export function Lighting() {
  return (
    <>
      {/* Key — warm overhead */}
      <directionalLight
        position={[2, 4, 2]}
        intensity={1.5}
        color="#fff4e0"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-3}
        shadow-camera-right={3}
        shadow-camera-top={3}
        shadow-camera-bottom={-3}
      />
      {/* Fill */}
      <directionalLight position={[-2, 2, 3]} intensity={0.4} color="#e0e8ff" />
      {/* Rim — cooler back light */}
      <directionalLight position={[0, 3, -3]} intensity={0.6} color="#c0d0ff" />
      {/* Soft ambient + IBL */}
      <ambientLight intensity={0.2} />
      <Environment preset="warehouse" />
    </>
  )
}
