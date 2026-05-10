import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { MassMeasurementLab } from '../labs/mass-measurement'
import { LandingPage } from '../site/pages/LandingPage'
import { PhysicsPage } from '../site/pages/PhysicsPage'
import { ComingSoonPage } from '../site/pages/ComingSoonPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/physics" element={<PhysicsPage />} />
        <Route path="/physics/mass-measurement" element={<MassMeasurementLab />} />
        <Route path="/math" element={<ComingSoonPage subjectId="math" />} />
        <Route path="/history" element={<ComingSoonPage subjectId="history" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
