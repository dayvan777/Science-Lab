import { useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { ACESFilmicToneMapping } from 'three'
import { Environment } from '@react-three/drei'
import { CinematicLighting } from '../../../sdk/scene/CinematicLighting'
import { CameraRig } from '../../../sdk/scene/CameraRig'
import type { CameraPreset } from '../../../sdk/scene/CameraRig'
import { PostFX } from '../../../sdk/scene/PostFX'
import { Table } from '../../../sdk/scene/Table'
import { CANVAS_BASE_STYLE } from '../../../sdk/scene/canvasStyle'
import { Button } from '../../../sdk/ui/Button'
import { SoundToggle } from '../../../sdk/ui/SoundToggle'
import { ZoomControls } from '../../../sdk/ui/ZoomControls'
import { BottomSheet } from '../../../sdk/ui/BottomSheet'
import { SheetTriggerButton } from '../../../sdk/ui/SheetTriggerButton'
import { SheetSection } from '../../../sdk/ui/SheetSection'
import { LoadingScreen } from '../../../sdk/ui/LoadingScreen'
import { PinchZoomController } from '../../../sdk/scene/PinchZoomController'
import { SceneController } from './SceneController'
import { setActiveInstrument } from '../../../sdk/physics/snapTargets'
import { useViewport } from '../../../sdk/a11y/useViewport'
import { safeAreaBottom } from '../../../sdk/a11y/safeArea'
import { Coil, COIL_LENGTH, COIL_OUTER_RADIUS } from '../instruments/Coil'
import { Galvanometer } from '../instruments/Galvanometer'
import { Bulb } from '../instruments/Bulb'
import { Wires } from '../instruments/Wires'
import { CoilStand } from '../instruments/CoilStand'
import { LabClutter } from '../instruments/LabClutter'
import { FieldLines } from '../instruments/FieldLines'
import { CurrentArrows } from '../instruments/CurrentArrows'
import { BarMagnet, LONG_MAGNET_HALF_LENGTH, SHORT_MAGNET_HALF_LENGTH } from '../objects/BarMagnet'
import { useLabState } from '../state/LabState'
import { useLabSettings } from '../state/LabSettingsState'
import { COIL_CENTER } from '../physics/induction'
import { HUD } from '../ui/HUD'
import { FieldToggleButton } from '../ui/FieldToggleButton'
import { CoilTurnsButton } from '../ui/CoilTurnsButton'
import { MagnetStrengthButton } from '../ui/MagnetStrengthButton'
import { useCameraStore } from '../../../sdk/scene/cameraStore'
import { useTapDetector } from '../../../sdk/object/useTapDetector'
import { FocusResetButton } from '../ui/FocusResetButton'

const COIL_WORLD: [number, number, number] = [COIL_CENTER.x, COIL_CENTER.y, COIL_CENTER.z]
const GALVANOMETER_WORLD: [number, number, number] = [0.30, 0.85, 0]
const BULB_WORLD: [number, number, number] = [0.55, 0.85, 0]
const MAGNET_TRAY_WORLD: [number, number, number] = [-0.40, 0.94, 0.30]
const SHORT_MAGNET_TRAY_WORLD: [number, number, number] = [-0.40, 0.94, 0.50]

// Decorative clutter position — chosen so it doesn't overlap any
// interactive object and doesn't intersect the camera's focus-coil framing.
const NOTEBOOK_WORLD: [number, number, number] = [-0.55, 0.86, 0.30]

function sceneToPreset(idx: number): CameraPreset {
  return idx === 0 ? 'overview' : 'focus-coil'
}

export function LabScene() {
  const phase = useLabState(s => s.phase)
  const idx = useLabState(s => s.currentSceneIndex)
  const resetKey = useLabState(s => s.sessionId)
  const respawnObjects = useLabState(s => s.respawnObjects)
  const { breakpoint } = useViewport()
  const isMobile = breakpoint === 'phone' || breakpoint === 'tablet'
  const [sheetOpen, setSheetOpen] = useState(false)
  const [ready, setReady] = useState(false)
  const preset: CameraPreset = sceneToPreset(idx)
  const fieldVisibleToggle = useLabSettings((s) => s.fieldVisible)
  const coilTurns = useLabSettings((s) => s.coilTurns)
  const magnetStrength = useLabSettings((s) => s.magnetStrength)
  const activeMagnet = useLabSettings((s) => s.activeMagnet)
  const opacityScale =
    magnetStrength === 'weak' ? 0.5
    : magnetStrength === 'strong' ? 1.5
    : 1.0
  // Field + current arrows visibility follows the user's toggle on every
  // scene. Default is on (fieldVisible: true in LabSettingsState).
  const fieldVisible = fieldVisibleToggle

  // Tell the snap-target system the active instrument is the coil — this
  // is a no-op since the magnet is free-form, but keeps the SDK happy.
  useEffect(() => {
    setActiveInstrument('coil')
    return () => { setActiveInstrument(null) }
  }, [])

  // Clear manual focus on scene change. The guided flow's scene-default
  // preset takes over; if the student wants a different focus, they tap
  // the instrument or the table again.
  const setFocusTarget = useCameraStore(s => s.setFocusTarget)
  const setFreeFocusPoint = useCameraStore(s => s.setFreeFocusPoint)
  useEffect(() => {
    setFocusTarget(null)
    setFreeFocusPoint(null)
  }, [idx, setFocusTarget, setFreeFocusPoint])

  // Click-to-focus: tap any point on the table surface and the camera
  // flies in close to that exact world position. Instrument taps (Coil,
  // Bulb, Galvanometer, BarMagnet) still take precedence because R3F's
  // raycasting picks the closest mesh first.
  const tableTap = useTapDetector((e) => {
    useCameraStore.getState().setFreeFocusPoint(e.point.clone())
  })

  return (
    <>
      <Canvas
        camera={{ position: [0, 1.5, 2.0], fov: 50 }}
        dpr={[1, 1.5]}
        shadows
        gl={{ toneMapping: ACESFilmicToneMapping, toneMappingExposure: 0.55 }}
        style={{ ...CANVAS_BASE_STYLE, background: 'radial-gradient(ellipse at center, #2a2a30 0%, #1a1a1e 50%, #0a0a0c 100%)' }}
        onCreated={() => setReady(true)}
      >
        <CinematicLighting />
        <CameraRig preset={preset} />
        <PinchZoomController />
        <Environment preset="studio" background={false} resolution={64} />
        <Physics key={resetKey} gravity={[0, -9.81, 0]} timeStep={1 / 60}>
          <group {...tableTap}>
            <Table />
          </group>
          <CoilStand coilWorld={COIL_WORLD} coilLength={COIL_LENGTH} coilOuterRadius={COIL_OUTER_RADIUS} />
          {/* No `active` prop — there's only one instrument in this lab, so the
              blue <Outlines> highlight from mass-measurement's pattern just looked
              like noise around the copper helix. */}
          <Coil position={COIL_WORLD} turns={coilTurns} />
          <CurrentArrows
            coilWorld={COIL_WORLD}
            coilLength={COIL_LENGTH}
            coilOuterRadius={COIL_OUTER_RADIUS}
            coilTurns={coilTurns}
            visible={fieldVisible}
          />
          <Galvanometer position={GALVANOMETER_WORLD} />
          <Bulb position={BULB_WORLD} />
          <Wires
            coilWorld={COIL_WORLD}
            galvanometerWorld={GALVANOMETER_WORLD}
            bulbWorld={BULB_WORLD}
          />
          <LabClutter notebookWorld={NOTEBOOK_WORLD} />
          <BarMagnet
            position={MAGNET_TRAY_WORLD}
            enabled={phase === 'in-progress'}
            halfLength={LONG_MAGNET_HALF_LENGTH}
            bodyId="bar-magnet-long"
            magnetSize="long"
          />
          <BarMagnet
            position={SHORT_MAGNET_TRAY_WORLD}
            enabled={phase === 'in-progress'}
            halfLength={SHORT_MAGNET_HALF_LENGTH}
            bodyId="bar-magnet-short"
            magnetSize="short"
          />
          <FieldLines
            magnetBodyId="bar-magnet-long"
            magnetHalfLength={LONG_MAGNET_HALF_LENGTH}
            visible={fieldVisible && activeMagnet === 'long'}
            opacityScale={opacityScale}
          />
          <FieldLines
            magnetBodyId="bar-magnet-short"
            magnetHalfLength={SHORT_MAGNET_HALF_LENGTH}
            visible={fieldVisible && activeMagnet === 'short'}
            opacityScale={opacityScale}
          />
          <SceneController />
        </Physics>
        <PostFX />
      </Canvas>
      <LoadingScreen done={ready} />
      <HUD />
      {isMobile ? (
        <>
          {/* Outside the sheet — bottom-right vertical stack on phone+tablet. */}
          <div
            style={{
              position: 'fixed',
              bottom: safeAreaBottom(16),
              right: 8,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              zIndex: 10,
            }}
          >
            <FocusResetButton />
            <ZoomControls />
            <SheetTriggerButton onClick={() => setSheetOpen(true)} />
          </div>

          {/* Sheet content — secondary settings + respawn action. */}
          <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)}>
            <SheetSection label="Магнітне поле">
              <FieldToggleButton />
            </SheetSection>
            <SheetSection label="Витки котушки">
              <CoilTurnsButton />
            </SheetSection>
            <SheetSection label="Сила магніту">
              <MagnetStrengthButton />
            </SheetSection>
            <SheetSection label="Звук">
              <SoundToggle />
            </SheetSection>
            <div style={{ marginTop: 8 }}>
              <Button
                variant="secondary"
                onClick={() => respawnObjects()}
                aria-label="Скинути предмети"
                title="Скинути предмети"
              >
                ↻ Скинути предмети
              </Button>
            </div>
          </BottomSheet>
        </>
      ) : (
        /* Desktop ≥900 — inline horizontal row, unchanged behaviour. */
        <div
          style={{
            position: 'fixed',
            bottom: safeAreaBottom(16),
            right: 16,
            display: 'flex',
            gap: 8,
            zIndex: 10,
          }}
        >
          <ZoomControls />
          <SoundToggle />
          <FieldToggleButton />
          <CoilTurnsButton />
          <MagnetStrengthButton />
          <FocusResetButton />
          <Button
            variant="secondary"
            onClick={() => respawnObjects()}
            aria-label="Скинути предмети"
            title="Скинути предмети"
          >
            ↻ Скинути предмети
          </Button>
        </div>
      )}
    </>
  )
}
