import { createContext, useContext, useState, useEffect } from 'react'
import { authAPI } from '../api'

const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(() => JSON.parse(localStorage.getItem('sl_user') || 'null'))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('sl_token')
    if (!token) { setLoading(false); return }
    authAPI.me()
      .then(r => { setUser(r.data.user); localStorage.setItem('sl_user', JSON.stringify(r.data.user)) })
      .catch(() => { localStorage.removeItem('sl_token'); localStorage.removeItem('sl_user'); setUser(null) })
      .finally(() => setLoading(false))
  }, [])

  const login = async (email, password) => {
    const { data } = await authAPI.login( { email, password })
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
