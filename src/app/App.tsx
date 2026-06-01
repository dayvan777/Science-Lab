import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { MassMeasurementLab } from '../labs/mass-measurement'
import { EMInductionLab } from '../labs/electromagnetic-induction'
import { BrownianDiffusionLab } from '../labs/brownian-diffusion'
import { LandingPage } from '../site/pages/LandingPage'
import { PhysicsPage } from '../site/pages/PhysicsPage'
import { BiologyPage } from '../site/pages/BiologyPage'
import { ComingSoonPage } from '../site/pages/ComingSoonPage'
import { ParameciumSpike } from '../labs/paramecium/ParameciumSpike'

const AnatomyLab = lazy(() => import('../labs/anatomy').then(m => ({ default: m.AnatomyLab })))
const ParameciumLab = lazy(() => import('../labs/paramecium').then(m => ({ default: m.ParameciumLab })))

const BenchmarkScene = import.meta.env.DEV
  ? lazy(() => import('../labs/brownian-diffusion/scene/BenchmarkScene').then(m => ({ default: m.BenchmarkScene })))
  : null

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/physics" element={<PhysicsPage />} />
        <Route path="/biology" element={<BiologyPage />} />
        <Route
          path="/biology/anatomy"
          element={
            <Suspense fallback={<div style={{ position: 'fixed', inset: 0, background: '#0a0a0c' }} />}>
              <AnatomyLab />
            </Suspense>
          }
        />
        <Route
          path="/biology/paramecium"
          element={
            <Suspense fallback={<div style={{ position: 'fixed', inset: 0, background: '#06121a' }} />}>
              <ParameciumLab />
            </Suspense>
          }
        />
        <Route path="/biology/paramecium-spike" element={<ParameciumSpike />} />
        <Route path="/physics/mass-measurement" element={<MassMeasurementLab />} />
        <Route path="/physics/em-induction" element={<EMInductionLab />} />
        <Route path="/physics/brownian-diffusion" element={<BrownianDiffusionLab />} />
        <Route path="/math" element={<ComingSoonPage subjectId="math" />} />
        <Route path="/history" element={<ComingSoonPage subjectId="history" />} />
        {import.meta.env.DEV && BenchmarkScene && (
          <Route
            path="/dev/diffusion-benchmark"
            element={
              <Suspense fallback={<div style={{ color: '#fff', padding: 24 }}>Loading benchmark…</div>}>
                <BenchmarkScene />
              </Suspense>
            }
          />
        )}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
