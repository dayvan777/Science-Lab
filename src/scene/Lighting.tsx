import { Environment } from '@react-three/drei'

export function Lighting() {
  return (
    <>
      {/* HDRI for PBR reflections only — not as background */}
      <Environment preset="studio" background={false} environmentIntensity={0.5} />

      {/* Key — large soft area light, top-front-right */}
      <directionalLight
        position={[3, 5, 3]}
        intensity={2.5}
        color="#ffffff"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-3}
        shadow-camera-right={3}
        shadow-camera-top={3}
        shadow-camera-bottom={-3}
        shadow-camera-near={0.1}
        shadow-camera-far={20}
        shadow-bias={-0.0005}
      />

      {/* Fill — softer, opposite side */}
      <directionalLight
        position={[-3, 3, 3]}
        intensity={0.8}
        color="#f0f4ff"
      />

      {/* Rim — back light to separate from background */}
      <directionalLight
        position={[0, 4, -4]}
        intensity={0.6}
        color="#ffffff"
      />

      {/* Subtle ambient (HDRI does most of fill) */}
      <ambientLight intensity={0.15} />
    </>
  )
}
