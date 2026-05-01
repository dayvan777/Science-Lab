export function Lighting() {
  return (
    <>
      {/* Bright ambient — no HDRI, no shadows for performance */}
      <ambientLight intensity={0.8} />

      {/* Main directional — no shadow */}
      <directionalLight
        position={[3, 5, 3]}
        intensity={1.2}
        color="#ffffff"
      />

      {/* Fill */}
      <directionalLight
        position={[-3, 3, 3]}
        intensity={0.5}
        color="#f0f4ff"
      />
    </>
  )
}
