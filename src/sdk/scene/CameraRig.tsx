import { useThree, useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { Vector3 } from 'three'
import { easeInOutCubic, clamp } from '../animation'

export type CameraPreset =
  | 'intro'
  | 'overview'      // existing default — kept for compatibility
  | 'workspace'     // front + slightly above
  | 'focus-scale'
  | 'focus-lever'
  | 'focus-dyn'
  | 'reveal'

type Pose = { position: [number, number, number]; lookAt: [number, number, number] }

const POSES: Record<CameraPreset, Pose> = {
  intro:         { position: [0, 2.5, 2.5],     lookAt: [0, 0.85, 0]    },
  overview:      { position: [0, 1.5, 2.0],     lookAt: [0, 0.85, 0]    },
  workspace:     { position: [0, 1.4, 1.8],     lookAt: [0, 0.9, 0]     },
  'focus-scale': { position: [0.75, 1.2, 1.2],  lookAt: [0.75, 0.95, 0] },
  'focus-lever': { position: [0.05, 1.3, 1.3],  lookAt: [0.05, 1.0, 0]  },
  'focus-dyn':   { position: [-0.55, 1.3, 1.3], lookAt: [-0.55, 1.05, 0] },
  reveal:        { position: [0, 3.5, 3.5],     lookAt: [0, 1.0, 0]     },
}

const DOLLY_DURATION_MS = 1500

type Props = { preset: CameraPreset }

export function CameraRig({ preset }: Props) {
  const { camera } = useThree()
  const tweenStart = useRef<number | null>(null)
  const fromPos = useRef(new Vector3())
  const fromLook = useRef(new Vector3())
  const targetLook = useRef(new Vector3())
  const lastPreset = useRef<CameraPreset | null>(null)

  useEffect(() => {
    if (lastPreset.current === preset) return
    fromPos.current.copy(camera.position)
    // Approximate "from look" as forward direction projected ahead of the camera:
    const dir = new Vector3()
    camera.getWorldDirection(dir)
    fromLook.current.copy(camera.position).add(dir)
    const target = POSES[preset]
    targetLook.current.set(...target.lookAt)
    tweenStart.current = performance.now()
    lastPreset.current = preset
  }, [preset, camera])

  useFrame(() => {
    if (tweenStart.current === null) return
    const elapsed = performance.now() - tweenStart.current
    const t = clamp(elapsed / DOLLY_DURATION_MS, 0, 1)
    const u = easeInOutCubic(t)
    const target = POSES[preset]
    camera.position.set(
      fromPos.current.x + (target.position[0] - fromPos.current.x) * u,
      fromPos.current.y + (target.position[1] - fromPos.current.y) * u,
      fromPos.current.z + (target.position[2] - fromPos.current.z) * u,
    )
    const lookX = fromLook.current.x + (targetLook.current.x - fromLook.current.x) * u
    const lookY = fromLook.current.y + (targetLook.current.y - fromLook.current.y) * u
    const lookZ = fromLook.current.z + (targetLook.current.z - fromLook.current.z) * u
    camera.lookAt(lookX, lookY, lookZ)
    if (t >= 1) {
      tweenStart.current = null
    }
  })

  return null
}
