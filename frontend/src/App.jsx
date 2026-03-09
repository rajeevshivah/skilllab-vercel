import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import PublicPage  from './pages/PublicPage'
import LoginPage   from './pages/LoginPage'
import AdminPage   from './pages/AdminPage'
import UsersPage   from './pages/UsersPage'
import Navbar      from './components/Navbar'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',color:'rgba(255,255,255,0.4)',fontFamily:'var(--font-b)'}}>Loading…</div>
  if (!user)   return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/"       element={<PublicPage />} />
        <Route path="/login"  element={<LoginPage  />} />
        <Route path="/admin"  element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
        <Route path="/users"  element={<ProtectedRoute><UsersPage /></ProtectedRoute>} />
        <Route path="*"       element={<Navigate to="/" />} />
      </Routes>
    </>
  )
}
