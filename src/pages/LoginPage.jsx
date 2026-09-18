import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const DEFAULT_ERROR = "That email and password don't match. Check for typos, or ask the Skill Lab coordinator to reset your password."

export default function LoginPage() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const { login } = useAuth()
  const navigate  = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      await login(email, password)
      // Bug fix: this used to send trainers to /admin, which doesn't exist —
      // the catch-all route then bounced them straight back to the public page.
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || DEFAULT_ERROR)
    } finally { setLoading(false) }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--page)', padding: 24 }}>
      <div className="sheet" style={{ width: '100%', maxWidth: 400, padding: 36 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>Sign in to Skill Lab</h1>
        <p style={{ fontSize: 14, color: 'var(--ink-soft)', marginBottom: 26 }}>For SHEAT trainers and staff.</p>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="login-email">Email</label>
            <input id="login-email" type="email" className="ctl" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
          </div>
          <div className="field">
            <label htmlFor="login-password">Password</label>
            <input id="login-password" type="password" className="ctl" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>

          {error && <div className="banner banner--error" style={{ marginTop: 16 }}>{error}</div>}

          <button type="submit" className="btn btn--primary" disabled={loading} style={{ width: '100%', marginTop: 20 }}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p style={{ marginTop: 22, textAlign: 'center' }}>
          <Link to="/" className="btn btn--quiet" style={{ fontSize: 13 }}>View the Hall of Fame</Link>
        </p>
      </div>
    </div>
  )
}
