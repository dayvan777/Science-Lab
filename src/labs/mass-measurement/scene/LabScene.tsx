import { useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { ACESFilmicToneMapping } from 'three'
import { Environment } from '@react-three/drei'
import { CinematicLighting } from '../../../sdk/scene/CinematicLighting'
import { CameraRig } from '../../../sdk/scene/CameraRig'
import type { CameraPreset } from '../../../sdk/scene/CameraRig'
import { PostFX } from '../../../sdk/scene/PostFX'
import { Table, TABLE_TOP_Y } from '../../../sdk/scene/Table'
import { ObjectTray, TRAY_H, TRAY_TOP_Y } from './ObjectTray'
import { TennisBall, RADIUS as TENNIS_BALL_RADIUS } from '../objects/TennisBall'
import { Apple, RADIUS as APPLE_RADIUS } from '../objects/Apple'
import { Baseball, RADIUS as BASEBALL_RADIUS } from '../objects/Baseball'
import { Button } from '../../../sdk/ui/Button'
import { SoundToggle } from '../../../sdk/ui/SoundToggle'
import { ZoomControls } from '../../../sdk/ui/ZoomControls'
import { HUD } from '../ui/HUD'
import { IntroTitle } from '../ui/IntroTitle'
import { MilestoneOverlay } from '../ui/MilestoneOverlay'
import { DigitalScale } from '../instruments/DigitalScale'
import { Dynamometer } from '../instruments/Dynamometer'
import { LeverBalance } from '../instruments/LeverBalance'
import { Weights } from '../objects/Weights'
import { useLabState } from '../state/LabState'
import { tasks } from '../content/tasks'
import { GuidedOverlay } from '../../../sdk/guided/GuidedOverlay'
import { useGuidance, SkipGuidanceToggle } from '../../../sdk/guided/SkipGuidanceToggle'
import { setActiveInstrument } from '../../../sdk/physics/snapTargets'
import { useViewport } from '../../../sdk/a11y/useViewport'

function instrumentToPreset(id: string | null): CameraPreset {
  if (id === 'digital-scale') return 'focus-scale'
  if (id === 'lever-balance') return 'focus-lever'
  if (id === 'dynamometer')   return 'focus-dyn'
  return 'workspace'
}

export function LabScene() {
  const phase = useLabState(s => s.phase)
  const idx = useLabState(s => s.currentTaskIndex)
  const resetKey = useLabState(s => s.sessionId)
  const respawnObjects = useLabState(s => s.respawnObjects)
  const guidanceOn = useGuidance(s => s.enabled)
  const { breakpoint } = useViewport()
  const isPhone = breakpoint === 'phone'

  const currentTask = phase === 'in-progress' ? tasks[idx] : null
  const activeObjectId = currentTask?.objectId ?? null
  const activeInstrumentId = currentTask?.instrumentId ?? null

  // Intro flythrough — camera holds at the wide 'intro' preset for the
  // first ~3 seconds while the title fades, then dollies to the
  // task-driven focus preset.
  const [introActive, setIntroActive] = useState(true)
  useEffect(() => {
    const t = setTimeout(() => setIntroActive(false), 3000)
    return () => clearTimeout(t)
  }, [])

  const preset: CameraPreset = introActive ? 'intro' : instrumentToPreset(activeInstrumentId)

  // Milestone overlay — shown when an object's three measurements complete
  // (the next task's objectId differs from the previous one).
  const [milestoneObjectId, setMilestoneObjectId] = useState<string | null>(null)
  const prevTaskIdxRef = useRef(idx)
  useEffect(() => {
    const prev = prevTaskIdxRef.current
    prevTaskIdxRef.current = idx
    if (prev === idx) return
    if (prev < 0 || prev >= tasks.length || idx >= tasks.length) return
    const prevObjId = tasks[prev].objectId
    const currObjId = tasks[idx].objectId
    if (prevObjId !== currObjId) {
      // Only show milestone for objects with defined milestone text
      // (tennis-ball → apple transition, apple → baseball transition).
      // After baseball (last object) the final reveal scene takes over.
      setMilestoneObjectId(prevObjId)
    }
  }, [idx])

  // Keep snap filter in sync with current task's instrument
  useEffect(() => {
    setActiveInstrument(activeInstrumentId)
    return () => { setActiveInstrument(null) }
  }, [activeInstrumentId])

  // Auto-respawn objects when the active object changes between tasks
  // (e.g. tennis-ball → apple). Prevents previous object from being stuck
  // (kinematic-snapped) on an instrument and blocking the next experiment.
  const prevObjectIdRef = useRef<string | null>(null)
  useEffect(() => {
    const prev = prevObjectIdRef.current
    if (prev !== null && prev !== activeObjectId && activeObjectId !== null) {
      respawnObjects()
    }
    prevObjectIdRef.current = activeObjectId
  }, [activeObjectId, respawnObjects])

  return (
    <>
      <Canvas
        camera={{ position: [0, 1.5, 2.0], fov: 50 }}
        dpr={[1, 1.5]}
        shadows
        gl={{ toneMapping: ACESFilmicToneMapping, toneMappingExposure: 0.55 }}
        style={{ position: 'fixed', inset: 0, background: 'radial-gradient(ellipse at center, #2a2a30 0%, #1a1a1e 50%, #0a0a0c 100%)' }}
      >
        <CinematicLighting />
        <CameraRig preset={preset} />
        <Environment preset="studio" background={false} resolution={64} />
        <Physics key={resetKey} gravity={[0, -9.81, 0]} timeStep={1/60}>
          <Table />
          {/* Wooden tray sits on the table at z = 0.40 (slightly forward of
              the previous ball-row z = 0.35). Tray centre is placed so its
              top surface lands at TRAY_TOP_Y; balls spawn just above the
              tray's top surface (centre = tray top + ball radius + epsilon). */}
          <ObjectTray position={[0, TABLE_TOP_Y + TRAY_H / 2, 0.40]} />
          <TennisBall position={[-0.30, TRAY_TOP_Y + TENNIS_BALL_RADIUS + 0.005, 0.40]} enabled={activeObjectId === 'tennis-ball'} />
          <Apple      position={[ 0.00, TRAY_TOP_Y + APPLE_RADIUS       + 0.005, 0.40]} enabled={activeObjectId === 'apple'} />
          <Baseball   position={[ 0.30, TRAY_TOP_Y + BASEBALL_RADIUS    + 0.005, 0.40]} enabled={activeObjectId === 'baseball'} />
          {/* Instruments spread across the table, away from object spawn */}
          <Dynamometer position={[-0.55, 0.85, 0]} active={activeInstrumentId === 'dynamometer'} />
          <LeverBalance position={[0.05, 0.85, 0]} active={activeInstrumentId === 'lever-balance'} />
          <DigitalScale position={[0.75, 0.85, 0]} active={activeInstrumentId === 'digital-scale'} />
          {/* Weights — laid out as a vertical column on the FAR-RIGHT side
              of the table so they're easy to grab and don't sit behind the
              lever balance. Spreads along z from front to back at x≈1.05. */}
          <Weights
            startPosition={[1.05, 0.90, -0.42]}
            spreadAxis="z"
            spacing={0.085}
            weightsEnabled={activeInstrumentId === 'lever-balance'}
          />
          {guidanceOn && <GuidedOverlay />}
        </Physics>
        <PostFX />
      </Canvas>
      <HUD />
      <SkipGuidanceToggle />
      {introActive && <IntroTitle onComplete={() => { /* fade-out handled internally */ }} />}
      <MilestoneOverlay objectId={milestoneObjectId} onDismiss={() => setMilestoneObjectId(null)} />
      {/* Utility controls — desktop/tablet keep them in the bottom-right
          row alongside the input bar. On phone the input bar already
          occupies the full bottom strip, so we move the controls into a
          right-side vertical column starting just below the journal pill
          (top: 110), and shrink "Скинути предмети" to icon-only. */}
      <div
        style={
          isPhone
            ? {
                position: 'fixed',
                top: 110,
                right: 8,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                zIndex: 10,
              }
            : {
                position: 'fixed',
                bottom: 16,
                right: 16,
                display: 'flex',
                gap: 8,
                zIndex: 10,
              }
        }
      >
        <ZoomControls />
        <SoundToggle />
        <Button
          variant="secondary"
          onClick={() => respawnObjects()}
          aria-label="Скинути предмети"
          title="Скинути предмети"
        >
          {isPhone ? '↻' : '↻ Скинути предмети'}
        </Button>
      </div>
    </>
  )
}
