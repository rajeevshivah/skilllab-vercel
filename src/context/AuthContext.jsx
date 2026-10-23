import { createContext, useContext, useState, useEffect } from 'react'
import api from '../api'

const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(() => { try { return JSON.parse(localStorage.getItem('sl_user') || 'null') } catch { return null } })
  // With a saved login the app opens at once and the check below runs in the
  // background (a sleeping server must not mean a blank "Loading…" page).
  const [loading, setLoading] = useState(() => !!localStorage.getItem('sl_token') && !localStorage.getItem('sl_user'))

  useEffect(() => {
    const token = localStorage.getItem('sl_token')
    if (!token) { setLoading(false); return }
    api.get('/auth/me')
      .then(r => { setUser(r.data.user); localStorage.setItem('sl_user', JSON.stringify(r.data.user)) })
      .catch(err => {
        // Only a real "not signed in" logs you out — not a slow or unreachable server.
        if (err.response && [401, 403].includes(err.response.status)) {
          localStorage.removeItem('sl_token'); localStorage.removeItem('sl_user'); setUser(null)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })
    localStorage.setItem('sl_token', data.token)
    localStorage.setItem('sl_user',  JSON.stringify(data.user))
    setUser(data.user)
    return data.user
  }

  const logout = () => {
    localStorage.removeItem('sl_token')
    localStorage.removeItem('sl_user')
    setUser(null)
  }

  const isSuperAdmin = user?.role === 'superadmin'
  const isTrainer    = user?.role === 'trainer' || user?.role === 'superadmin'

  return (
    <AuthCtx.Provider value={{ user, login, logout, loading, isSuperAdmin, isTrainer }}>
      {children}
    </AuthCtx.Provider>
  )
}

export const useAuth = () => useContext(AuthCtx)
