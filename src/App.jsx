import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import PublicPage       from './pages/PublicPage'
import LoginPage        from './pages/LoginPage'
import AdminPage        from './pages/AdminPage'
import UsersPage        from './pages/UsersPage'
import SettingsPage     from './pages/SettingsPage'
import ReportPage       from './pages/ReportPage'
import ReportsAdminPage from './pages/ReportsAdminPage'
import Navbar           from './components/Navbar'

function ProtectedRoute({ children, requireSuperadmin = false }) {
  const { user, loading } = useAuth()
  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',color:'rgba(255,255,255,0.4)',fontFamily:'var(--font-b)'}}>Loading…</div>
  if (!user) return <Navigate to="/login" replace />
  if (requireSuperadmin && user.role !== 'superadmin') return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/"        element={<PublicPage />} />
        <Route path="/login"   element={<LoginPage  />} />
        <Route path="/admin"   element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
        <Route path="/users"   element={<ProtectedRoute requireSuperadmin><UsersPage /></ProtectedRoute>} />
        <Route path="/settings"element={<ProtectedRoute requireSuperadmin><SettingsPage /></ProtectedRoute>} />
        <Route path="/report"  element={<ProtectedRoute><ReportPage /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute requireSuperadmin><ReportsAdminPage /></ProtectedRoute>} />
        <Route path="*"        element={<Navigate to="/" />} />
      </Routes>
    </>
  )
}