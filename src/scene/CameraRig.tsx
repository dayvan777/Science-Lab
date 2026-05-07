import { useRef, useEffect } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { Vector3 } from 'three'

export type CameraPreset = 'overview' | 'digital-scale' | 'lever-balance' | 'dynamometer'

const PRESETS: Record<CameraPreset, { pos: [number, number, number]; target: [number, number, number] }> = {
  'overview':      { pos: [0, 1.4, 1.5],    target: [0, 0.95, 0] },
  'digital-scale': { pos: [0.6, 1.2, 1.0],  target: [0.6, 0.9, 0] },
  'lever-balance': { pos: [0, 1.2, 1.0],    target: [0, 0.95, 0] },
  'dynamometer':   { pos: [-0.5, 1.3, 1.0], target: [-0.5, 1.0, 0] },
}

type Props = { preset: CameraPreset }

export function CameraRig({ preset }: Props) {
  const { camera } = useThree()
  const [px, py, pz] = PRESETS[preset].pos
  const [tx, ty, tz] = PRESETS[preset].target
  const targetPos = useRef(new Vector3(px, py, pz))
  const targetLook = useRef(new Vector3(tx, ty, tz))

  useEffect(() => {
    const [epx, epy, epz] = PRESETS[preset].pos
    const [etx, ety, etz] = PRESETS[preset].target
    targetPos.current.set(epx, epy, epz)
    targetLook.current.set(etx, ety, etz)
  }, [preset])

  useFrame((_, delta) => {
    camera.position.lerp(targetPos.current, Math.min(1, delta * 3))
    const currentLook = new Vector3()
    camera.getWorldDirection(currentLook)
    const desiredLook = targetLook.current.clone().sub(camera.position).normalize()
    const lerpedLook = currentLook.lerp(desiredLook, Math.min(1, delta * 3))
    camera.lookAt(camera.position.clone().add(lerpedLook))
  })

  return null
}
