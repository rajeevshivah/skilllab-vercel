// Change my own password (staff). Every other device is signed out; this one
// gets a fresh sign-in from the server.
import { useState } from 'react'
import api from '../api'

export default function ChangePassword({ onClose }) {
  const [cur, setCur] = useState(''), [pw, setPw] = useState(''), [pw2, setPw2] = useState('')
  const [busy, setBusy] = useState(false), [err, setErr] = useState(''), [done, setDone] = useState(false)
  async function save(e) {
    e.preventDefault(); setErr('')
    if (pw !== pw2) return setErr('The two new passwords do not match.')
    setBusy(true)
    try {
      const { data } = await api.put('/auth/password', { current: cur, password: pw })
      localStorage.setItem('sl_token', data.token)
      setDone(true)
    } catch (e2) { setErr(e2.response?.data?.message || 'Could not change the password.') }
    finally { setBusy(false) }
  }
  return (
    <div role="dialog" aria-modal="true" onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,20,18,.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <form className="sheet" onClick={e => e.stopPropagation()} onSubmit={save} style={{ maxWidth: 380, width: '100%', padding: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 14 }}>Change my password</h2>
        {done ? <>
          <div className="banner banner--success">Password changed. Every other device is now signed out.</div>
          <button type="button" className="btn btn--primary" style={{ width: '100%' }} onClick={onClose}>Done</button>
        </> : <>
          <div className="field"><label htmlFor="cp-cur">Current password</label><input id="cp-cur" type="password" className="ctl" value={cur} onChange={e => setCur(e.target.value)} required autoComplete="current-password" /></div>
          <div className="field"><label htmlFor="cp-new">New password (10+ characters)</label><input id="cp-new" type="password" className="ctl" value={pw} onChange={e => setPw(e.target.value)} required minLength={10} autoComplete="new-password" /></div>
          <div className="field"><label htmlFor="cp-new2">New password again</label><input id="cp-new2" type="password" className="ctl" value={pw2} onChange={e => setPw2(e.target.value)} required autoComplete="new-password" /></div>
          {err && <div className="banner banner--error" style={{ marginTop: 12 }}>{err}</div>}
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button className="btn btn--primary" disabled={busy}>{busy ? 'Saving…' : 'Change password'}</button>
            <button type="button" className="btn btn--secondary" onClick={onClose}>Cancel</button>
          </div>
        </>}
      </form>
    </div>
  )
}
