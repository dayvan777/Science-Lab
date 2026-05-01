import { RigidBody } from '@react-three/rapier'

const FLOOR_Y = 0
const FLOOR_SIZE = 30  // very large infinite-feel plane

export function StudioBackdrop() {
  return (
    <>
      {/* Ground plane (collidable, receives shadows) */}
      <RigidBody type="fixed" colliders="cuboid" position={[0, FLOOR_Y - 0.05, 0]}>
        <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[FLOOR_SIZE, FLOOR_SIZE]} />
          <meshStandardMaterial color="#cdcdd2" roughness={0.7} metalness={0} />
        </mesh>
      </RigidBody>
      {/* Sky gradient — large vertical plane behind the camera target */}
      <mesh position={[0, 5, -8]}>
        <planeGeometry args={[40, 20]} />
        <shaderMaterial
          transparent
          uniforms={{
            topColor: { value: [0.98, 0.98, 0.97] },     // #fafafa
            midColor: { value: [0.91, 0.91, 0.93] },     // #e8e8ed
            bottomColor: { value: [0.80, 0.80, 0.82] },  // #cdcdd2
          }}
          vertexShader={`
            varying vec2 vUv;
            void main() {
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `}
          fragmentShader={`
            uniform vec3 topColor;
            uniform vec3 midColor;
            uniform vec3 bottomColor;
            varying vec2 vUv;
            void main() {
              vec3 color = mix(bottomColor, midColor, smoothstep(0.0, 0.5, vUv.y));
              color = mix(color, topColor, smoothstep(0.5, 1.0, vUv.y));
              gl_FragColor = vec4(color, 1.0);
            }
          `}
        />
      </mesh>
    </>
  )
}
