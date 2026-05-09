import { useState, useEffect, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { Lighting } from './Lighting'
import { CameraRig, CameraPreset } from './CameraRig'
import { Table } from './Table'
import { TennisBall } from './objects/TennisBall'
import { Apple } from './objects/Apple'
import { Baseball } from './objects/Baseball'
import { Button } from '../ui/Button'
import { HUD } from '../lab/HUD'
import { DigitalScale } from './instruments/DigitalScale'
import { Dynamometer } from './instruments/Dynamometer'
import { LeverBalance } from './instruments/LeverBalance'
import { Weights } from './objects/Weights'
import { useLabState } from '../lab/LabState'
import { tasks } from '../lab/tasks'
import { GuidedOverlay } from '../guided/GuidedOverlay'
import { useGuidance, SkipGuidanceToggle } from '../guided/SkipGuidanceToggle'
import { setActiveInstrument } from '../sdk/physics/snapTargets'

export function LabScene() {
  const [preset, setPreset] = useState<CameraPreset>('overview')
  const phase = useLabState(s => s.phase)
  const idx = useLabState(s => s.currentTaskIndex)
  const resetKey = useLabState(s => s.sessionId)
  const respawnObjects = useLabState(s => s.respawnObjects)
  const guidanceOn = useGuidance(s => s.enabled)

  const currentTask = phase === 'in-progress' ? tasks[idx] : null
  const activeObjectId = currentTask?.objectId ?? null
  const activeInstrumentId = currentTask?.instrumentId ?? null

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
        style={{ position: 'fixed', inset: 0, background: '#2a2a2a' }}
      >
        <Lighting />
        <CameraRig preset={preset} />
        <Physics key={resetKey} gravity={[0, -9.81, 0]} timeStep={1/60}>
          <Table />
          {/* Objects — only the active object for the current task is pickable */}
          <TennisBall position={[-0.3, 1.5, 0.3]} enabled={activeObjectId === 'tennis-ball'} />
          <Apple position={[0, 1.5, 0.3]} enabled={activeObjectId === 'apple'} />
          <Baseball position={[0.3, 1.5, 0.3]} enabled={activeObjectId === 'baseball'} />
          {/* Instruments spread across the table, away from object spawn */}
          <Dynamometer position={[-0.55, 0.85, 0]} active={activeInstrumentId === 'dynamometer'} />
          <LeverBalance position={[0.05, 0.85, 0]} active={activeInstrumentId === 'lever-balance'} />
          <DigitalScale position={[0.75, 0.85, 0]} active={activeInstrumentId === 'digital-scale'} />
          {/* Weights — only usable during lever-balance tasks */}
          <Weights startPosition={[-0.2, 1.0, -0.3]} weightsEnabled={activeInstrumentId === 'lever-balance'} />
          {guidanceOn && <GuidedOverlay />}
        </Physics>
      </Canvas>
      <HUD />
      <SkipGuidanceToggle />
      <div style={{ position: 'fixed', bottom: 16, right: 16, display: 'flex', gap: 8, zIndex: 10 }}>
        <Button variant="secondary" onClick={() => respawnObjects()}>↻ Скинути предмети</Button>
        <Button variant="secondary" onClick={() => setPreset('overview')}>Камера</Button>
      </div>
    </>
  )
}
