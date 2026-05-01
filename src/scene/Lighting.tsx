import { Environment } from '@react-three/drei'

export function Lighting() {
  return (
    <>
      {/* HDRI for PBR reflections only — not as background */}
      <Environment preset="studio" background={false} environmentIntensity={0.4} />

      {/* Key — large soft area light, top-front-right */}
      <directionalLight
        position={[3, 5, 3]}
        intensity={2.0}
        color="#ffffff"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-2.5}
        shadow-camera-right={2.5}
        shadow-camera-top={2.5}
        shadow-camera-bottom={-2.5}
        shadow-camera-near={0.1}
        shadow-camera-far={15}
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
