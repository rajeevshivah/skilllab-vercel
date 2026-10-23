import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
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
import CyclePlanPage   from './pages/CyclePlanPage'
import ConnectAIPage   from './pages/ConnectAIPage'
import PerformancePage from './pages/PerformancePage'
import PlanBoardPage   from './pages/PlanBoardPage'
import FeedbackPage    from './pages/FeedbackPage'
import SettingsPage    from './pages/SettingsPage'
import StudentLoginPage from './pages/StudentLoginPage'
import StudentHomePage  from './pages/StudentHomePage'
import Navbar        from './components/Navbar'

function Protected({ children, admin }) {
  const { user, loading } = useAuth()
  if (loading) return <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',color:'var(--ink-soft)' }}>Loading…</div>
  if (!user) return <Navigate to="/login" replace />
  if (admin && user.role !== 'superadmin') return <Navigate to="/dashboard" replace />
  return children
}

export default function App() {
  const loc = useLocation()
  const studentSide = loc.pathname === '/student' || loc.pathname.startsWith('/student/')
  return (
    <>
      {!studentSide && <Navbar />}
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
        <Route path="/cycle/:id/plan"  element={<Protected><CyclePlanPage /></Protected>} />
        <Route path="/student"       element={<StudentHomePage />} />
        <Route path="/student/login" element={<StudentLoginPage />} />
        <Route path="/settings"   element={<Protected admin><SettingsPage /></Protected>} />
        <Route path="/feedback"   element={<Protected><FeedbackPage /></Protected>} />
        <Route path="/plans"      element={<Protected><PlanBoardPage /></Protected>} />
        <Route path="/performance" element={<Protected><PerformancePage /></Protected>} />
        <Route path="/connect-ai" element={<Protected><ConnectAIPage /></Protected>} />
        <Route path="/semesters" element={<Protected admin><SemestersPage /></Protected>} />
        <Route path="/users"     element={<Protected admin><UsersPage /></Protected>} />
        <Route path="/duplicates" element={<Protected admin><DuplicatesPage /></Protected>} />
        <Route path="*"          element={<Navigate to="/" />} />
      </Routes>
    </>
  )
}
