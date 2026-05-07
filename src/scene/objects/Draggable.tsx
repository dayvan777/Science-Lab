import { ReactNode, useRef } from 'react'
import { RigidBody, RapierRigidBody, BallCollider, CuboidCollider } from '@react-three/rapier'
import { useDrag } from '../../physics/useDrag'
import { useStepEngine } from '../../guided/StepEngine'

type Shape = { type: 'ball'; radius: number } | { type: 'cuboid'; halfExtents: [number, number, number] }

type Props = {
  position: [number, number, number]
  mass: number          // grams
  shape: Shape
  bodyId?: string       // for guided step detection
  enabled?: boolean     // if false, pointer-down is blocked (object not pickable)
  children: ReactNode
}

export function Draggable({ position, mass, shape, bodyId, enabled = true, children }: Props) {
  const ref = useRef<RapierRigidBody>(null)
  const setDragging = useStepEngine(s => s.setDragging)
  const { onPointerDown: rawDown, onPointerMove, onPointerUp: rawUp } = useDrag({ rigidBody: ref, bodyId })
  const massKg = mass / 1000

  const onPointerDown = (ev: React.PointerEvent) => {
    if (!enabled) return  // BLOCK pickup when not the active object
    if (bodyId) setDragging(bodyId)
    rawDown(ev as unknown as Parameters<typeof rawDown>[0])
  }

  const onPointerUp = (ev: React.PointerEvent) => {
    if (bodyId) setDragging(null)
    rawUp(ev as unknown as Parameters<typeof rawUp>[0])
  }

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
