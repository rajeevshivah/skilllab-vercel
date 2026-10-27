import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import PublicPage    from './pages/PublicPage'
import LoginPage     from './pages/LoginPage'
import Navbar        from './components/Navbar'
// Pages load on demand (the public Hall of Fame and the sign-in page don't download
// the whole staff app). After the first screen is up, the rest is fetched quietly
// in the background so moving between pages stays instant.
const pageLoaders = {
  DashboardPage: () => import('./pages/DashboardPage'),
  SemestersPage: () => import('./pages/SemestersPage'),
  BatchesPage: () => import('./pages/BatchesPage'),
  BatchPage: () => import('./pages/BatchPage'),
  TopStudentsPage: () => import('./pages/TopStudentsPage'),
  UsersPage: () => import('./pages/UsersPage'),
  DuplicatesPage: () => import('./pages/DuplicatesPage'),
  CyclesPage: () => import('./pages/CyclesPage'),
  CycleReportPage: () => import('./pages/CycleReportPage'),
  CycleMarksPage: () => import('./pages/CycleMarksPage'),
  CyclePlanPage: () => import('./pages/CyclePlanPage'),
  ConnectAIPage: () => import('./pages/ConnectAIPage'),
  PerformancePage: () => import('./pages/PerformancePage'),
  PlanBoardPage: () => import('./pages/PlanBoardPage'),
  SettingsPage: () => import('./pages/SettingsPage'),
  PlannerPage: () => import('./pages/PlannerPage'),
  MeetingPage: () => import('./pages/MeetingPage'),
  StudentLoginPage: () => import('./pages/StudentLoginPage'),
  StudentHomePage: () => import('./pages/StudentHomePage'),
  PlatformPage: () => import('./pages/PlatformPage'),
}
// After a new deploy an open tab may ask for a file that no longer exists:
// reload once to pick up the new version instead of showing a broken page.
const lazyPage = (load) => lazy(() => load().then(m => { try { sessionStorage.removeItem('sl_chunk_reload') } catch {} return m }).catch(err => {
  let again = false
  try { again = !sessionStorage.getItem('sl_chunk_reload'); sessionStorage.setItem('sl_chunk_reload', '1') } catch {}
  if (again) { window.location.reload(); return new Promise(() => {}) }
  throw err
}))
const DashboardPage = lazyPage(pageLoaders.DashboardPage)
const SemestersPage = lazyPage(pageLoaders.SemestersPage)
const BatchesPage = lazyPage(pageLoaders.BatchesPage)
const BatchPage = lazyPage(pageLoaders.BatchPage)
const TopStudentsPage = lazyPage(pageLoaders.TopStudentsPage)
const UsersPage = lazyPage(pageLoaders.UsersPage)
const DuplicatesPage = lazyPage(pageLoaders.DuplicatesPage)
const CyclesPage = lazyPage(pageLoaders.CyclesPage)
const CycleReportPage = lazyPage(pageLoaders.CycleReportPage)
const CycleMarksPage = lazyPage(pageLoaders.CycleMarksPage)
const CyclePlanPage = lazyPage(pageLoaders.CyclePlanPage)
const ConnectAIPage = lazyPage(pageLoaders.ConnectAIPage)
const PerformancePage = lazyPage(pageLoaders.PerformancePage)
const PlanBoardPage = lazyPage(pageLoaders.PlanBoardPage)
const SettingsPage = lazyPage(pageLoaders.SettingsPage)
const PlannerPage = lazyPage(pageLoaders.PlannerPage)
const MeetingPage = lazyPage(pageLoaders.MeetingPage)
const StudentLoginPage = lazyPage(pageLoaders.StudentLoginPage)
const StudentHomePage = lazyPage(pageLoaders.StudentHomePage)
const PlatformPage = lazyPage(pageLoaders.PlatformPage)


const Waiting = () => <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'60vh',color:'var(--ink-soft)' }}>Loading…</div>

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
  useEffect(() => {
    const warm = () => Object.values(pageLoaders).forEach(load => load().catch(() => {}))
    const t = window.requestIdleCallback ? window.requestIdleCallback(warm, { timeout: 4000 }) : setTimeout(warm, 2500)
    return () => (window.cancelIdleCallback && window.requestIdleCallback ? window.cancelIdleCallback(t) : clearTimeout(t))
  }, [])
  return (
    <>
      {!studentSide && <Navbar />}
      <Suspense fallback={<Waiting />}>
      <Routes>
        <Route path="/"          element={<PublicPage />} />
        <Route path="/login"     element={<LoginPage />} />
        <Route path="/dashboard" element={<Protected><DashboardPage /></Protected>} />
        <Route path="/batches"   element={<Protected><BatchesPage /></Protected>} />
        <Route path="/batch/:id" element={<Protected><BatchPage /></Protected>} />
        <Route path="/top-students" element={<Protected><TopStudentsPage /></Protected>} />
        <Route path="/placement" element={<Navigate to="/top-students" replace />} />
        <Route path="/cycles"     element={<Protected><CyclesPage /></Protected>} />
        <Route path="/cycle/:id"  element={<Protected><CycleReportPage /></Protected>} />
        <Route path="/cycle/:id/marks" element={<Protected><CycleMarksPage /></Protected>} />
        <Route path="/cycle/:id/plan"  element={<Protected><CyclePlanPage /></Protected>} />
        <Route path="/student"       element={<StudentHomePage />} />
        <Route path="/student/login" element={<StudentLoginPage />} />
        <Route path="/planner"    element={<Protected admin><PlannerPage /></Protected>} />
        <Route path="/meeting"    element={<Protected><MeetingPage /></Protected>} />
        <Route path="/settings"   element={<Protected admin><SettingsPage /></Protected>} />
        <Route path="/feedback"   element={<Navigate to="/meeting?tab=feedback" replace />} />
        <Route path="/plans"      element={<Protected><PlanBoardPage /></Protected>} />
        <Route path="/performance" element={<Protected><PerformancePage /></Protected>} />
        <Route path="/connect-ai" element={<Protected><ConnectAIPage /></Protected>} />
        <Route path="/semesters" element={<Protected admin><SemestersPage /></Protected>} />
        <Route path="/users"     element={<Protected admin><UsersPage /></Protected>} />
        <Route path="/duplicates" element={<Protected admin><DuplicatesPage /></Protected>} />
        <Route path="/platform"  element={<Protected><PlatformPage /></Protected>} />
        <Route path="*"          element={<Navigate to="/" />} />
      </Routes>
      </Suspense>
    </>
  )
}
