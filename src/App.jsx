import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import PublicPage    from './pages/PublicPage'
import LoginPage     from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import SemestersPage from './pages/SemestersPage'
import BatchesPage   from './pages/BatchesPage'
import BatchPage     from './pages/BatchPage'
import PlacementPage from './pages/PlacementPage'
import UsersPage     from './pages/UsersPage'
import DuplicatesPage from './pages/DuplicatesPage'
import CyclesPage     from './pages/CyclesPage'
import CycleReportPage from './pages/CycleReportPage'
import CycleMarksPage  from './pages/CycleMarksPage'
import Navbar        from './components/Navbar'

function Protected({ children, admin }) {
  const { user, loading } = useAuth()
  if (loading) return <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',color:'rgba(255,255,255,0.4)' }}>Loading…</div>
  if (!user) return <Navigate to="/login" replace />
  if (admin && user.role !== 'superadmin') return <Navigate to="/dashboard" replace />
  return children
}

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/"          element={<PublicPage />} />
        <Route path="/login"     element={<LoginPage />} />
        <Route path="/dashboard" element={<Protected><DashboardPage /></Protected>} />
        <Route path="/batches"   element={<Protected><BatchesPage /></Protected>} />
        <Route path="/batch/:id" element={<Protected><BatchPage /></Protected>} />
        <Route path="/placement" element={<Protected><PlacementPage /></Protected>} />
        <Route path="/cycles"     element={<Protected><CyclesPage /></Protected>} />
        <Route path="/cycle/:id"  element={<Protected><CycleReportPage /></Protected>} />
        <Route path="/cycle/:id/marks" element={<Protected><CycleMarksPage /></Protected>} />
        <Route path="/semesters" element={<Protected admin><SemestersPage /></Protected>} />
        <Route path="/users"     element={<Protected admin><UsersPage /></Protected>} />
        <Route path="/duplicates" element={<Protected admin><DuplicatesPage /></Protected>} />
        <Route path="*"          element={<Navigate to="/" />} />
      </Routes>
    </>
  )
}
