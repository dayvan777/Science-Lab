import { useFrame } from '@react-three/fiber'
import { MutableRefObject } from 'react'
import { Particle } from '../physics/particles'
import { step, AABB, DividerState } from '../physics/kinetics'

type Props = {
  particles: MutableRefObject<Particle[]>
  walls: AABB
  /** Returns the current divider state (or null = no divider). Re-evaluated each frame. */
  getDivider?: () => DividerState
  /** Velocity multiplier applied each frame BEFORE stepping. 1 = unchanged. */
  velocityMultiplier?: number
}

/**
 * Empty R3F-rendered component whose only job is to tick the
 * custom kinetic engine each frame. Lives INSIDE <Canvas> so
 * useFrame is available.
 */
export function SceneController({ particles, walls, getDivider, velocityMultiplier = 1 }: Props) {
  useFrame((_state, delta) => {
    const dt = Math.min(delta, 1 / 60)
    if (velocityMultiplier !== 1) {
      for (const p of particles.current) {
        p.vel.x *= velocityMultiplier
        p.vel.y *= velocityMultiplier
        p.vel.z *= velocityMultiplier
      }
    }
    const divider = getDivider ? getDivider() : null
    step(particles.current, walls, divider, dt)
  })
  return null
}
