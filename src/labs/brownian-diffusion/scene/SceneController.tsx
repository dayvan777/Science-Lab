import { useFrame } from '@react-three/fiber'
import { MutableRefObject, useRef } from 'react'
import { Particle } from '../physics/particles'
import { step, AABB, DividerState } from '../physics/kinetics'

type Props = {
  particles: MutableRefObject<Particle[]>
  walls: AABB
  /** Returns the current divider state (or null = no divider). Re-evaluated each frame. */
  getDivider?: () => DividerState
  /** Velocity multiplier applied each frame BEFORE stepping. 1 = unchanged. */
  velocityMultiplier?: number
  /** Optional per-frame callback fired AFTER the physics step, with clamped dt. */
  onTick?: (dt: number) => void
  /** Liquid drag coefficient passed to step(). 0 = no drag (gas); >0 = liquid mode. */
  liquidDrag?: number
}

/**
 * Empty R3F-rendered component whose only job is to tick the
 * custom kinetic engine each frame. Lives INSIDE <Canvas> so
 * useFrame is available.
 */
export function SceneController({ particles, walls, getDivider, velocityMultiplier = 1, onTick, liquidDrag = 0 }: Props) {
  // Tracks the previous velocityMultiplier so a mid-scene change scales
  // velocities by ratio rather than re-applying the absolute value each frame.
  const carry = useRef(velocityMultiplier)

  useFrame((_state, delta) => {
    const dt = Math.min(delta, 1 / 60)
    if (velocityMultiplier !== carry.current) {
      const ratio = velocityMultiplier / carry.current
      for (const p of particles.current) {
        p.vel.x *= ratio
        p.vel.y *= ratio
        p.vel.z *= ratio
      }
      carry.current = velocityMultiplier
    }
    const divider = getDivider ? getDivider() : null
    step(particles.current, walls, divider, dt, liquidDrag)
    if (onTick) onTick(dt)
  })
  return null
}
