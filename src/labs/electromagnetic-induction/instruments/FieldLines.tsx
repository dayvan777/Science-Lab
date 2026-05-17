import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  Vector3,
  TubeGeometry,
  CatmullRomCurve3,
  Group,
  MeshBasicMaterial,
} from 'three'
import { findBodyByTag } from '../../../sdk/physics/bodyRegistry'
import { MAGNET_HALF_LENGTH } from '../objects/BarMagnet'

/**
 * Eight amber field-line tubes around the bar magnet. Each line emerges
 * from the N pole tip (-x in magnet-local), arcs out into space, and
 * curves back into the S pole tip (+x). Four extents (0.04 / 0.10 / 0.20
 * / 0.40 m) produce inner-to-outer "shells"; each extent has a mirror
 * pair (one above, one below) for a total of 8 lines in the magnet's
 * local XY plane.
 *
 * The whole group's transform copies the magnet's world translation +
 * rotation each frame, so the lines stay locked to the magnet as the
 * student drags it.
 *
 * Geometry budget: 8 lines × 24 path × 4 radial = 768 triangles. Material
 * is `meshBasicMaterial` with `transparent + toneMapped:false` so the
 * lines glow softly without picking up bloom.
 */

const TUBE_RADIUS = 0.0015
const PATH_SEGMENTS = 24
const RADIAL_SEGMENTS = 4
const LINE_EXTENTS = [0.04, 0.10, 0.20, 0.40] as const
const FIELD_OPACITY = 0.55
const FADE_STIFFNESS = 4   // 1 / (250ms / 1000) = 4 — opacity converges in ~250ms

type Props = {
  /** Body-id of the bar magnet (matches Draggable.bodyId). */
  magnetBodyId: string
  /** When false, the entire group fades to opacity 0 over ~250 ms. */
  visible: boolean
  /** Multiplier on the field-line opacity (e.g. 0.5 weak, 1.0 normal, 1.5 strong). */
  opacityScale: number
}

/**
 * Build one closed-loop curve in the magnet's local frame.
 *   - 5 control points: N tip → arc up & out → mid → arc down & in → S tip.
 *   - `mirror = true` reflects across y=0 (the line goes BELOW the magnet).
 */
function makeFieldLine(extent: number, mirror: boolean): CatmullRomCurve3 {
  const sign = mirror ? -1 : 1
  const yMax = extent * 0.6
  return new CatmullRomCurve3(
    [
      new Vector3(-MAGNET_HALF_LENGTH, 0, 0),
      new Vector3(-extent * 0.5, sign * yMax * 0.6, 0),
      new Vector3(0, sign * yMax, 0),
      new Vector3(extent * 0.5, sign * yMax * 0.6, 0),
      new Vector3(MAGNET_HALF_LENGTH, 0, 0),
    ],
    false,
    'catmullrom',
    0.5,
  )
}

export function FieldLines({ magnetBodyId, visible, opacityScale }: Props) {
  const groupRef = useRef<Group>(null)

  const geometries = useMemo(() => {
    const out: TubeGeometry[] = []
    for (const extent of LINE_EXTENTS) {
      out.push(new TubeGeometry(makeFieldLine(extent, false), PATH_SEGMENTS, TUBE_RADIUS, RADIAL_SEGMENTS, false))
      out.push(new TubeGeometry(makeFieldLine(extent, true), PATH_SEGMENTS, TUBE_RADIUS, RADIAL_SEGMENTS, false))
    }
    return out
  }, [])

  const material = useMemo(
    () =>
      new MeshBasicMaterial({
        color: '#ffc850',
        transparent: true,
        opacity: visible ? FIELD_OPACITY : 0,
        toneMapped: false,
        depthWrite: false,
      }),
    // visible deliberately omitted — initial value only; runtime updates via useFrame
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  useEffect(() => {
    return () => {
      for (const g of geometries) g.dispose()
      material.dispose()
    }
  }, [geometries, material])

  useFrame((_, delta) => {
    const body = findBodyByTag(magnetBodyId)
    if (body && groupRef.current) {
      const t = body.translation()
      const r = body.rotation()
      groupRef.current.position.set(t.x, t.y, t.z)
      groupRef.current.quaternion.set(r.x, r.y, r.z, r.w)
    }
    const target = visible ? Math.min(1, FIELD_OPACITY * opacityScale) : 0
    const step = Math.min(1, delta * FADE_STIFFNESS)
    material.opacity += (target - material.opacity) * step
  })

  return (
    <group ref={groupRef}>
      {geometries.map((geometry, i) => (
        <mesh key={i} geometry={geometry} material={material} />
      ))}
    </group>
  )
}
