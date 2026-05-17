import { useThree, useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { Vector3, PerspectiveCamera } from 'three'
import { easeInOutCubic, clamp } from '../animation'
import { useCameraStore } from './cameraStore'
import { useReducedMotion } from '../a11y/useReducedMotion'
import { useViewport } from '../a11y/useViewport'

export type CameraPreset =
  | 'intro'
  | 'overview'      // existing default — kept for compatibility
  | 'workspace'     // front + slightly above
  | 'focus-scale'
  | 'focus-lever'
  | 'focus-dyn'
  | 'focus-coil'
  | 'focus-magnet'
  | 'focus-galv'
  | 'focus-bulb'
  | 'reveal'

type Pose = { position: [number, number, number]; lookAt: [number, number, number] }

// Camera presets — focus-* poses are SUBTLE pans (slight lateral shift + slight
// dolly-in) from the overview so the user always retains spatial orientation
// and can interact with the whole table. Aggressive close-ups break drag-pickup.
const POSES: Record<CameraPreset, Pose> = {
  intro:         { position: [0, 2.0, 2.4],   lookAt: [0, 0.85, 0]   },
  overview:      { position: [0, 1.5, 2.0],   lookAt: [0, 0.85, 0]   },
  workspace:     { position: [0, 1.5, 2.0],   lookAt: [0, 0.85, 0]   },
  'focus-scale': { position: [0.25, 1.5, 1.8], lookAt: [0.4, 0.9, 0] },
  'focus-lever': { position: [0.05, 1.5, 1.8], lookAt: [0.05, 0.9, 0] },
  'focus-dyn':   { position: [-0.25, 1.55, 1.8], lookAt: [-0.4, 1.05, 0] },
  'focus-coil':   { position: [-0.05, 1.35, 1.1], lookAt: [-0.05, 0.95, 0] },
  'focus-magnet': { position: [-0.30, 1.35, 1.1], lookAt: [-0.30, 0.95, 0] },
  'focus-galv':   { position: [0.30, 1.35, 1.1],  lookAt: [0.30, 0.95, 0]  },
  'focus-bulb':   { position: [0.55, 1.35, 1.1],  lookAt: [0.55, 0.95, 0]  },
  reveal:        { position: [0, 3.0, 3.2],   lookAt: [0, 1.0, 0]    },
}

const DOLLY_DURATION_MS = 1500

// Per-breakpoint camera adjustment. Default Canvas FOV is 50° (calibrated
// for a 16:9 desktop). On a portrait phone the auto-derived horizontal FOV
// is much narrower, which left instruments cut off the sides of the frame.
// Widening the vertical FOV plus pulling the camera back gives the scene
// enough horizontal room on portrait viewports.
const FOV_DESKTOP = 50
const FOV_TABLET  = 56
const FOV_PHONE   = 70

// Multiplier on the camera-to-lookAt distance, layered on top of the user's
// manual zoomMul. On phone the camera sits 15 % farther; on tablet 10 %.
const DISTANCE_MUL_TABLET = 1.10
const DISTANCE_MUL_PHONE  = 1.15

type Props = { preset: CameraPreset }

/**
 * Apply manual zoomMul to a preset position by scaling the offset from lookAt.
 * zoomMul = 1.0 → preset default. < 1 → closer. > 1 → farther.
 */
function applyZoom(
  position: [number, number, number],
  lookAt: [number, number, number],
  zoomMul: number,
): [number, number, number] {
  return [
    lookAt[0] + (position[0] - lookAt[0]) * zoomMul,
    lookAt[1] + (position[1] - lookAt[1]) * zoomMul,
    lookAt[2] + (position[2] - lookAt[2]) * zoomMul,
  ]
}

export function CameraRig({ preset }: Props) {
  const { camera, gl } = useThree()
  const tweenStart = useRef<number | null>(null)
  const fromPos = useRef(new Vector3())
  const fromLook = useRef(new Vector3())
  const targetLook = useRef(new Vector3())
  const lastPreset = useRef<CameraPreset | null>(null)
  const userZoomMul = useCameraStore(s => s.zoomMul)
  const focusTarget = useCameraStore(s => s.focusTarget)
  const reducedMotion = useReducedMotion()
  const { breakpoint } = useViewport()

  // User-driven focus override. When a focusTarget is set, it wins over
  // the scene-driven `preset` prop. Tap-on-instrument dispatches set this
  // via useCameraStore; FocusResetButton or a scene change clears it.
  const effectivePreset: CameraPreset =
    focusTarget === 'magnet' ? 'focus-magnet' :
    focusTarget === 'coil'   ? 'focus-coil'   :
    focusTarget === 'bulb'   ? 'focus-bulb'   :
    focusTarget === 'galv'   ? 'focus-galv'   :
    preset

  // Compose user zoom with the per-breakpoint distance multiplier.
  const deviceZoomMul =
    breakpoint === 'phone'  ? DISTANCE_MUL_PHONE  :
    breakpoint === 'tablet' ? DISTANCE_MUL_TABLET :
    1.0
  const zoomMul = userZoomMul * deviceZoomMul

  // Set the camera's vertical FOV per breakpoint. The default Canvas FOV
  // (50°) is preserved on desktop; portrait phones get 70° so all three
  // instruments fit horizontally.
  useEffect(() => {
    if (!(camera instanceof PerspectiveCamera)) return
    const targetFov =
      breakpoint === 'phone'  ? FOV_PHONE  :
      breakpoint === 'tablet' ? FOV_TABLET :
      FOV_DESKTOP
    if (camera.fov !== targetFov) {
      camera.fov = targetFov
      camera.updateProjectionMatrix()
    }
  }, [camera, breakpoint])

  // Mouse-wheel zoom on the canvas — listener is attached once.
  useEffect(() => {
    const dom = gl.domElement
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const factor = e.deltaY > 0 ? 1.08 : 0.92
      useCameraStore.getState().zoomBy(factor)
    }
    dom.addEventListener('wheel', onWheel, { passive: false })
    return () => dom.removeEventListener('wheel', onWheel)
  }, [gl])

  // Start a tween whenever the active preset changes.
  useEffect(() => {
    if (lastPreset.current === effectivePreset) return
    fromPos.current.copy(camera.position)
    const dir = new Vector3()
    camera.getWorldDirection(dir)
    fromLook.current.copy(camera.position).add(dir)
    const target = POSES[effectivePreset]
    targetLook.current.set(...target.lookAt)
    tweenStart.current = performance.now()
    lastPreset.current = effectivePreset
  }, [effectivePreset, camera])

  useFrame(() => {
    const target = POSES[effectivePreset]
    const targetPos = applyZoom(target.position, target.lookAt, zoomMul)

    if (tweenStart.current !== null) {
      // Reduced-motion users get an instant cut to the new pose
      // instead of a 1.5-second dolly.
      if (reducedMotion) {
        camera.position.set(targetPos[0], targetPos[1], targetPos[2])
        camera.lookAt(target.lookAt[0], target.lookAt[1], target.lookAt[2])
        tweenStart.current = null
        return
      }
      // Active preset-change tween — interpolate from saved start to zoom-adjusted target.
      const elapsed = performance.now() - tweenStart.current
      const t = clamp(elapsed / DOLLY_DURATION_MS, 0, 1)
      const u = easeInOutCubic(t)
      camera.position.set(
        fromPos.current.x + (targetPos[0] - fromPos.current.x) * u,
        fromPos.current.y + (targetPos[1] - fromPos.current.y) * u,
        fromPos.current.z + (targetPos[2] - fromPos.current.z) * u,
      )
      const lookX = fromLook.current.x + (targetLook.current.x - fromLook.current.x) * u
      const lookY = fromLook.current.y + (targetLook.current.y - fromLook.current.y) * u
      const lookZ = fromLook.current.z + (targetLook.current.z - fromLook.current.z) * u
      camera.lookAt(lookX, lookY, lookZ)
      if (t >= 1) tweenStart.current = null
    } else {
      // No preset tween in progress — apply zoom every frame so wheel scroll
      // updates the camera position smoothly without a tween restart.
      camera.position.set(targetPos[0], targetPos[1], targetPos[2])
      camera.lookAt(target.lookAt[0], target.lookAt[1], target.lookAt[2])
    }
  })

  return null
}
