export function Lighting() {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 5, 3]} intensity={1.0} color="#ffffff" />
      <directionalLight position={[-3, 3, 3]} intensity={0.4} color="#f0f4ff" />
    </>
  )
}
