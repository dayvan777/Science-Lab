/**
 * 3-point cinematic lighting preset (Tesla unveiling vibe).
 * Warm key light, cool fill, warm rim, low ambient + subtle hemisphere.
 */
export function CinematicLighting({ shadows = true }: { shadows?: boolean }) {
  return (
    <>
      <ambientLight intensity={0.15} />
      <hemisphereLight args={['#2a3040', '#1a1208', 0.3]} />
      {/* Key */}
      <directionalLight
        position={[2, 4, 2]}
        intensity={2.5}
        color="#fff5e8"
        castShadow={shadows}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={0.1}
        shadow-camera-far={10}
        shadow-camera-left={-2}
        shadow-camera-right={2}
        shadow-camera-top={2}
        shadow-camera-bottom={-2}
      />
      {/* Fill */}
      <directionalLight position={[-2, 2, 1]} intensity={0.6} color="#b0c8e8" />
      {/* Rim */}
      <directionalLight position={[0, 1, -3]} intensity={1.5} color="#ffd0a0" />
    </>
  )
}
