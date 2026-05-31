import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { MassMeasurementLab } from '../labs/mass-measurement'
import { EMInductionLab } from '../labs/electromagnetic-induction'
import { BrownianDiffusionLab } from '../labs/brownian-diffusion'
import { HeartSlice } from '../labs/anatomy/HeartSlice'
import { AnatomySpike } from '../labs/anatomy/AnatomySpike'
import { LandingPage } from '../site/pages/LandingPage'
import { PhysicsPage } from '../site/pages/PhysicsPage'
import { BiologyPage } from '../site/pages/BiologyPage'
import { AnatomyLab } from '../labs/anatomy'
import { ComingSoonPage } from '../site/pages/ComingSoonPage'

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
        <Route path="/biology/anatomy" element={<AnatomyLab />} />
        <Route path="/physics/mass-measurement" element={<MassMeasurementLab />} />
        <Route path="/physics/em-induction" element={<EMInductionLab />} />
        <Route path="/physics/brownian-diffusion" element={<BrownianDiffusionLab />} />
        <Route path="/biology/heart" element={<HeartSlice />} />
        <Route path="/biology/spike" element={<AnatomySpike />} />
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
