import { useMemo, useEffect } from 'react'
import { Vector3, TubeGeometry, CatmullRomCurve3 } from 'three'
import { COIL_LENGTH, COIL_OUTER_RADIUS } from './Coil'

const WIRE_TUBE_RADIUS = 0.0025
const WIRE_RADIAL_SEGS = 6
const WIRE_PATH_SEGS = 32

// Galvanometer local terminal offsets — duplicated here as inline constants
// rather than re-exported from Galvanometer.tsx, because exporting them
// would invite cross-file coupling for what's effectively visual metadata.
// If Galvanometer's geometry changes, update these in sync.
const GALV_FACE_W = 0.13          // Galvanometer.tsx:12
const GALV_HOUSING_D = 0.06       // Galvanometer.tsx:11
const GALV_TERMINAL_X = GALV_FACE_W * 0.30   // 0.039 m from centre
const GALV_TERMINAL_Y_LOCAL = 0.012
const GALV_TERMINAL_Z = GALV_HOUSING_D / 2 + 0.005  // 0.035 m in front

const BULB_BASE_HEIGHT = 0.020    // Bulb.tsx:7
const BULB_GLASS_R = 0.025        // Bulb.tsx:6
const BULB_BASE_Y_LOCAL = BULB_BASE_HEIGHT / 2  // mid-base height
const BULB_ATTACH_OFFSET_Z = BULB_GLASS_R * 0.4  // ~1 cm

// Wire-drape parameters. Spec v2 reduced sag from 15% → 5% after live
// smoke-test showed the blue return wire dipping ~5.5 cm below the table.
// Y-clamp ensures the curve never goes below WIRE_MIN_Y regardless of
// distance — keeps the drape readable even for long horizontal spans.
const TABLE_TOP_Y = 0.85          // matches sdk/scene/Table.tsx surface
const WIRE_MIN_Y = TABLE_TOP_Y + 0.005  // 5 mm above table

const WIRE_SAG_FACTOR = 0.05      // was 0.15 in polish v1
const WIRE_QUARTER_DIP = 0.02     // was 0.05 in polish v1

type Props = {
  coilWorld: [number, number, number]
  galvanometerWorld: [number, number, number]
  bulbWorld: [number, number, number]
}

/**
 * Build a gentle catenary-like curve between two world points. Mid-point
 * is displaced downward by WIRE_SAG_FACTOR × distance, with two
 * intermediate control points nudged slightly below the straight line for
 * a natural drape. All three are clamped to ≥ WIRE_MIN_Y so the curve
 * never dips below the table surface. Returns a CatmullRomCurve3 of 5
 * points.
 */
function makeWireCurve(start: Vector3, end: Vector3): CatmullRomCurve3 {
  const dist = start.distanceTo(end)
  const sag = dist * WIRE_SAG_FACTOR
  const mid = new Vector3().addVectors(start, end).multiplyScalar(0.5)
  mid.y = Math.max(WIRE_MIN_Y, mid.y - sag)
  const quarter1 = new Vector3().lerpVectors(start, mid, 0.5)
  quarter1.y = Math.max(WIRE_MIN_Y, quarter1.y - dist * WIRE_QUARTER_DIP)
  const quarter2 = new Vector3().lerpVectors(mid, end, 0.5)
  quarter2.y = Math.max(WIRE_MIN_Y, quarter2.y - dist * WIRE_QUARTER_DIP)
  return new CatmullRomCurve3([start, quarter1, mid, quarter2, end], false, 'catmullrom', 0.5)
}

function buildTube(curve: CatmullRomCurve3): TubeGeometry {
  return new TubeGeometry(curve, WIRE_PATH_SEGS, WIRE_TUBE_RADIUS, WIRE_RADIAL_SEGS, false)
}

export function Wires({ coilWorld, galvanometerWorld, bulbWorld }: Props) {
  const coilCentre = new Vector3(...coilWorld)
  const galvCentre = new Vector3(...galvanometerWorld)
  const bulbCentre = new Vector3(...bulbWorld)

  // Coil end attach points (z ends, outer radius below coil top)
  // The wires emerge from the BOTTOM of the coil (radius * sin(-π/2)) so they
  // drop down to the table and curve toward the next instrument.
  const coilRightEnd = new Vector3(
    coilCentre.x,
    coilCentre.y - COIL_OUTER_RADIUS,
    coilCentre.z + COIL_LENGTH / 2,
  )
  const coilLeftEnd = new Vector3(
    coilCentre.x,
    coilCentre.y - COIL_OUTER_RADIUS,
    coilCentre.z - COIL_LENGTH / 2,
  )

  // Galvanometer terminal posts (world)
  const galvLeftTerminal = new Vector3(
    galvCentre.x - GALV_TERMINAL_X,
    galvCentre.y + GALV_TERMINAL_Y_LOCAL,
    galvCentre.z + GALV_TERMINAL_Z,
  )
  const galvRightTerminal = new Vector3(
    galvCentre.x + GALV_TERMINAL_X,
    galvCentre.y + GALV_TERMINAL_Y_LOCAL,
    galvCentre.z + GALV_TERMINAL_Z,
  )

  // Bulb base attach points — two opposite sides of the brass base
  const bulbAttachFront = new Vector3(
    bulbCentre.x,
    bulbCentre.y + BULB_BASE_Y_LOCAL,
    bulbCentre.z + BULB_ATTACH_OFFSET_Z,
  )
  const bulbAttachBack = new Vector3(
    bulbCentre.x,
    bulbCentre.y + BULB_BASE_Y_LOCAL,
    bulbCentre.z - BULB_ATTACH_OFFSET_Z,
  )

  // Build the three tube geometries once — only rebuild if instrument
  // positions actually change (they don't, after mount, but useMemo costs
  // nothing here).
  const { geomRed1, geomRed2, geomBlue } = useMemo(() => ({
    geomRed1: buildTube(makeWireCurve(coilRightEnd, galvLeftTerminal)),
    geomRed2: buildTube(makeWireCurve(galvRightTerminal, bulbAttachFront)),
    geomBlue: buildTube(makeWireCurve(bulbAttachBack, coilLeftEnd)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [coilCentre.x, coilCentre.y, coilCentre.z, galvCentre.x, galvCentre.y, galvCentre.z, bulbCentre.x, bulbCentre.y, bulbCentre.z])

  // Dispose geometries on unmount to free GPU memory.
  useEffect(() => {
    return () => {
      geomRed1.dispose()
      geomRed2.dispose()
      geomBlue.dispose()
    }
  }, [geomRed1, geomRed2, geomBlue])

  return (
    <group>
      <mesh geometry={geomRed1} receiveShadow>
        <meshStandardMaterial color="#cc4030" metalness={0.2} roughness={0.5} envMapIntensity={0.3} />
      </mesh>
      <mesh geometry={geomRed2} receiveShadow>
        <meshStandardMaterial color="#cc4030" metalness={0.2} roughness={0.5} envMapIntensity={0.3} />
      </mesh>
      <mesh geometry={geomBlue} receiveShadow>
        <meshStandardMaterial color="#3060cc" metalness={0.2} roughness={0.5} envMapIntensity={0.3} />
      </mesh>
    </group>
  )
}
