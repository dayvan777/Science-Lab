import { useThree, useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { Vector3 } from 'three'
import { easeInOutCubic, clamp } from '../animation'
import { useCameraStore } from './cameraStore'
import { useReducedMotion } from '../a11y/useReducedMotion'

export type CameraPreset =
  | 'intro'
  | 'overview'      // existing default — kept for compatibility
  | 'workspace'     // front + slightly above
  | 'focus-scale'
  | 'focus-lever'
  | 'focus-dyn'
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
  'focus-dyn':   { position: [-0.25, 1.5, 1.8], lookAt: [-0.4, 0.9, 0] },
  reveal:        { position: [0, 3.0, 3.2],   lookAt: [0, 1.0, 0]    },
}

const DOLLY_DURATION_MS = 1500

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
  const zoomMul = useCameraStore(s => s.zoomMul)
  const reducedMotion = useReducedMotion()

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
    if (lastPreset.current === preset) return
    fromPos.current.copy(camera.position)
    const dir = new Vector3()
    camera.getWorldDirection(dir)
    fromLook.current.copy(camera.position).add(dir)
    const target = POSES[preset]
    targetLook.current.set(...target.lookAt)
    tweenStart.current = performance.now()
    lastPreset.current = preset
  }, [preset, camera])

  useFrame(() => {
    const target = POSES[preset]
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
