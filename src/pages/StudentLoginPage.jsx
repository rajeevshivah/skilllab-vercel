import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import studentApi from '../api/student'

export default function StudentLoginPage() {
  const [mode, setMode] = useState('login')     // login | setup
  const [roll, setRoll] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function submit(e) {
    e.preventDefault(); setError('')
    if (mode === 'setup' && password !== password2) { setError('The two passwords do not match.'); return }
    setLoading(true)
    try {
      const { data } = mode === 'login'
        ? await studentApi.post('/student/login', { roll, password })
        : await studentApi.post('/student/activate', { roll, code, password })
      localStorage.setItem('sl_student_token', data.token)
      navigate('/student')
    } catch (err) { setError(err.response?.data?.message || 'Something went wrong. Try again.') }
    finally { setLoading(false) }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--page)', padding: 16 }}>
      <div className="sheet" style={{ width: '100%', maxWidth: 400, padding: 30 }}>
        <div className="muted" style={{ fontSize: 13, fontWeight: 600, letterSpacing: '.04em' }}>SHEAT SKILL LAB</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: '4px 0 18px' }}>Student sign in</h1>

        <div style={{ display: 'flex', border: '1px solid var(--rule-strong)', borderRadius: 6, overflow: 'hidden', marginBottom: 20 }}>
          {[['login', 'Sign in'], ['setup', 'First time? Set up']].map(([k, l]) => (
            <button key={k} type="button" onClick={() => { setMode(k); setError('') }}
              className={`btn btn--sm ${mode === k ? 'btn--primary' : 'btn--secondary'}`} style={{ flex: 1, borderRadius: 0, border: 'none' }}>{l}</button>
          ))}
        </div>

        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="s-roll">Roll number</label>
            <input id="s-roll" className="ctl" value={roll} onChange={e => setRoll(e.target.value)} required autoFocus autoComplete="username" />
          </div>
          {mode === 'setup' && (
            <div className="field">
              <label htmlFor="s-code">Batch code <span className="muted" style={{ fontWeight: 400 }}>(your trainer shows it in class)</span></label>
              <input id="s-code" className="ctl" value={code} onChange={e => setCode(e.target.value.toUpperCase())} required maxLength={6}
                style={{ letterSpacing: '.2em', fontWeight: 700, textTransform: 'uppercase' }} />
            </div>
          )}
          <div className="field">
            <label htmlFor="s-pass">{mode === 'setup' ? 'Choose a password (6+ characters)' : 'Password'}</label>
            <input id="s-pass" type="password" className="ctl" value={password} onChange={e => setPassword(e.target.value)} required minLength={mode === 'setup' ? 6 : 1}
              autoComplete={mode === 'setup' ? 'new-password' : 'current-password'} />
          </div>
          {mode === 'setup' && (
            <div className="field">
              <label htmlFor="s-pass2">Type the password again</label>
              <input id="s-pass2" type="password" className="ctl" value={password2} onChange={e => setPassword2(e.target.value)} required autoComplete="new-password" />
            </div>
          )}
          {error && <div className="banner banner--error" style={{ marginTop: 14 }}>{error}</div>}
          <button type="submit" className="btn btn--primary" disabled={loading} style={{ width: '100%', marginTop: 18 }}>
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Set up my account'}
          </button>
        </form>
        <p className="muted" style={{ fontSize: 13, marginTop: 16 }}>Forgot your password? Ask your trainer to reset it, then use “First time? Set up” again.</p>
        <p style={{ marginTop: 10, textAlign: 'center' }}><Link to="/login" className="btn btn--quiet" style={{ fontSize: 13 }}>Trainer / staff sign in</Link></p>
      </div>
    </div>
  )
}
