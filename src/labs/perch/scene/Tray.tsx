/** Dissection tray + watery-teal lighting (procedural). */
export function Tray() {
  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[4, 7, 5]} intensity={1.2} castShadow />
      <directionalLight position={[-5, 2, -3]} intensity={0.4} color="#9fd8ff" />
      <directionalLight position={[-3, 4, -6]} intensity={0.7} color="#cfe8ff" />
      <fog attach="fog" args={['#0b2530', 12, 30]} />
      <mesh position={[0, -1.0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[9, 5]} />
        <meshStandardMaterial color="#16323a" roughness={0.9} metalness={0.1} />
      </mesh>
      <mesh position={[0, -0.95, 0]}>
        <torusGeometry args={[3.4, 0.06, 8, 48]} />
        <meshStandardMaterial color="#2a4a52" roughness={0.6} />
      </mesh>
    </>
  )
}
