import { ReactNode, useRef } from 'react'
import { RigidBody, RapierRigidBody, BallCollider, CuboidCollider } from '@react-three/rapier'
import { useDrag } from '../../physics/useDrag'

type Shape = { type: 'ball'; radius: number } | { type: 'cuboid'; halfExtents: [number, number, number] }

type Props = {
  position: [number, number, number]
  mass: number          // grams
  shape: Shape
  children: ReactNode
}

export function Draggable({ position, mass, shape, children }: Props) {
  const ref = useRef<RapierRigidBody>(null)
  const { onPointerDown, onPointerMove, onPointerUp } = useDrag({ rigidBody: ref })
  const massKg = mass / 1000

  return (
    <RigidBody
      ref={ref}
      colliders={false}
      position={position}
      type="dynamic"
      restitution={0.2}
      friction={0.6}
    >
      {shape.type === 'ball' ? (
        <BallCollider args={[shape.radius]} mass={massKg} />
      ) : (
        <CuboidCollider args={shape.halfExtents} mass={massKg} />
      )}
      <group
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        {children}
      </group>
    </RigidBody>
  )
}
