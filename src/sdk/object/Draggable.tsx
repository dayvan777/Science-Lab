import { ReactNode, useRef, useEffect } from 'react'
import { RigidBody, RapierRigidBody, BallCollider, CuboidCollider } from '@react-three/rapier'
import { useDrag } from '../physics/useDrag'
import { useStepEngine } from '../guided/StepEngine'
import { registerBody, notifyDragStart } from '../physics/bodyRegistry'

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
  // Half the vertical extent of the body — used by stacking layouts (lever pans).
  const halfHeight = shape.type === 'ball' ? shape.radius : shape.halfExtents[1]

  // Register body→{mass, halfHeight} on mount so other systems can read these
  // even for kinematic bodies. RigidBody ref may not be ready immediately —
  // poll until it is.
  useEffect(() => {
    let cancelled = false
    let unregister: (() => void) | null = null
    const tryRegister = () => {
      if (cancelled) return
      if (ref.current) {
        unregister = registerBody(ref.current, massKg, halfHeight, bodyId)
      } else {
        requestAnimationFrame(tryRegister)
      }
    }
    tryRegister()
    return () => {
      cancelled = true
      unregister?.()
    }
  }, [massKg, halfHeight, bodyId])

  const onPointerDown = (ev: React.PointerEvent) => {
    if (!enabled) return  // BLOCK pickup when not the active object
    if (bodyId) setDragging(bodyId)
    // Notify snap systems so they can release this body from any pan/platform tracking
    if (ref.current) notifyDragStart(ref.current)
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
      ccd
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
