import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  Vector3,
  TubeGeometry,
  CatmullRomCurve3,
  ConeGeometry,
  Group,
  MeshBasicMaterial,
  Quaternion,
} from 'three'
import { findBodyByTag } from '../../../sdk/physics/bodyRegistry'

/**
 * Ten amber field-line tubes around the bar magnet. Each line emerges
 * from the N pole tip (-x in magnet-local), arcs out into space, and
 * curves back into the S pole tip (+x). Five extents (0.04 / 0.08 / 0.14
 * / 0.22 / 0.32 m) produce inner-to-outer "shells"; each extent has a mirror
 * pair (one above, one below) for a total of 10 lines in the magnet's
 * local XY plane.
 *
 * The whole group's transform copies the magnet's world translation +
 * rotation each frame, so the lines stay locked to the magnet as the
 * student drags it.
 *
 * Geometry budget: 10 lines × 24 path × 4 radial ≈ 960 triangles. Material
 * is `meshBasicMaterial` with `transparent + toneMapped:false` so the
 * lines glow softly without picking up bloom.
 */

const TUBE_RADIUS = 0.0015
const PATH_SEGMENTS = 24
const RADIAL_SEGMENTS = 4
const LINE_EXTENTS = [0.04, 0.08, 0.14, 0.22, 0.32] as const
const FIELD_OPACITY = 0.55
const FADE_STIFFNESS = 4   // 1 / (250ms / 1000) = 4 — opacity converges in ~250ms

const ARROW_T_VALUES = [0.2, 0.5, 0.8] as const   // parameter values along each curve
const ARROW_RADIUS = TUBE_RADIUS * 1.6              // ~2.4 mm — visible at scene scale
const ARROW_HEIGHT = TUBE_RADIUS * 4                 // ~6 mm
const ARROW_RADIAL_SEGMENTS = 6                      // low-poly cones; 24 cones × 12 tris ≈ 288 triangles total

type Props = {
  /** Body-id of the bar magnet (matches Draggable.bodyId). */
  magnetBodyId: string
  /** When false, the entire group fades to opacity 0 over ~250 ms. */
  visible: boolean
  /** Multiplier on the field-line opacity (e.g. 0.5 weak, 1.0 normal, 1.5 strong). */
  opacityScale: number
  /** Half-length of the magnet this field belongs to. Used to place the
   *  N/S tip points of each curve. Long magnet: 0.09; short magnet: 0.045. */
  magnetHalfLength: number
}

/**
 * Build one half-ellipse curve in the magnet's local frame.
 *   - 17 control points along parametric half-ellipse from N tip to S tip.
 *   - `mirror = true` reflects across y=0 (the line goes BELOW the magnet).
 */
function makeFieldLine(extent: number, mirror: boolean, halfLength: number): CatmullRomCurve3 {
  const sign = mirror ? -1 : 1
  // Smooth half-ellipse from N tip to S tip, bulging out by `extent` at the
  // apex. 17 control points spaced along the true elliptical parameterization
  // give the spline enough samples to render as a visually smooth "textbook"
  // field line instead of the old 5-point kite-shaped approximation.
  //   x = halfLength * sin(θ)   → starts at -halfLength (N tip), ends at +halfLength (S tip)
  //   y = sign * extent * cos(θ) → 0 at the poles, ±extent at the apex
  // θ sweeps from -π/2 (N tip) through 0 (apex) to +π/2 (S tip).
  const N_POINTS = 17
  const points: Vector3[] = []
  for (let i = 0; i < N_POINTS; i++) {
    const t = i / (N_POINTS - 1)
    const theta = -Math.PI / 2 + t * Math.PI
    const x = halfLength * Math.sin(theta)
    const y = sign * extent * Math.cos(theta)
    points.push(new Vector3(x, y, 0))
  }
  return new CatmullRomCurve3(points, false, 'catmullrom', 0.5)
}

export function FieldLines({ magnetBodyId, visible, opacityScale, magnetHalfLength }: Props) {
  const groupRef = useRef<Group>(null)

  const geometries = useMemo(() => {
    const out: TubeGeometry[] = []
    for (const extent of LINE_EXTENTS) {
      out.push(new TubeGeometry(makeFieldLine(extent, false, magnetHalfLength), PATH_SEGMENTS, TUBE_RADIUS, RADIAL_SEGMENTS, false))
      out.push(new TubeGeometry(makeFieldLine(extent, true, magnetHalfLength), PATH_SEGMENTS, TUBE_RADIUS, RADIAL_SEGMENTS, false))
    }
    return out
  }, [magnetHalfLength])

  // Pre-compute arrow transforms once per mount. Each line gets 3 arrows
  // at evenly-spaced parameter values. Cone is oriented along the curve's
  // tangent at that point so the apex points N→S externally.
  const arrowTransforms = useMemo(() => {
    const out: Array<{ position: Vector3; quaternion: Quaternion }> = []
    const up = new Vector3(0, 1, 0)  // coneGeometry default axis
    for (const extent of LINE_EXTENTS) {
      for (const mirror of [false, true]) {
        const curve = makeFieldLine(extent, mirror, magnetHalfLength)
        for (const t of ARROW_T_VALUES) {
          const position = curve.getPoint(t)
          const tangent = curve.getTangent(t).normalize().negate()
          const quaternion = new Quaternion().setFromUnitVectors(up, tangent)
          out.push({ position, quaternion })
        }
      }
    }
    return out
  }, [magnetHalfLength])

  // Single shared cone geometry — disposed alongside the tubes.
  const arrowGeometry = useMemo(
    () => new ConeGeometry(ARROW_RADIUS, ARROW_HEIGHT, ARROW_RADIAL_SEGMENTS),
    [],
  )

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
      arrowGeometry.dispose()
      material.dispose()
    }
  }, [geometries, arrowGeometry, material])

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
        <mesh key={`tube-${i}`} geometry={geometry} material={material} />
      ))}
      {arrowTransforms.map((tr, i) => (
        <mesh
          key={`arrow-${i}`}
          geometry={arrowGeometry}
          material={material}
          position={tr.position}
          quaternion={tr.quaternion}
        />
      ))}
    </group>
  )
}
