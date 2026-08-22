import { useState } from 'react'
import api from '../api'
import { useAuth } from '../context/AuthContext'
import { useSemester } from '../context/SemesterContext'
import { ui, Alert, Empty } from '../components/ui'

export default function SemestersPage() {
  const { user } = useAuth()
  const { semesters, refresh } = useSemester()
  const [name, setName]   = useState('')
  const [alert, setAlert] = useState(null)
  const [saving, setSaving] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const isAdmin = user?.role === 'superadmin'
  const active = semesters.find(s => s.status === 'active')
  const show = (msg, type='success') => { setAlert({ msg, type }); setTimeout(()=>setAlert(null), 3500) }

  async function startNew() {
    if (!name.trim()) return show('Enter a semester name', 'error')
    setSaving(true)
    try {
      await api.post('/semesters', { name: name.trim() })
      setName(''); setConfirming(false)
      await refresh()
      show('New semester started. Previous one archived.')
    } catch (e) { show(e.response?.data?.message || 'Failed', 'error') }
    finally { setSaving(false) }
  }

  async function reactivate(id) {
    try { await api.patch(`/semesters/${id}`, { status:'active' }); await refresh(); show('Semester set active.') }
    catch (e) { show(e.response?.data?.message || 'Failed', 'error') }
  }
  async function archive(id) {
    try { await api.patch(`/semesters/${id}`, { status:'archived' }); await refresh(); show('Semester archived.') }
    catch (e) { show(e.response?.data?.message || 'Failed', 'error') }
  }

  return (
    <div style={ui.wrap}>
      <h1 style={ui.h1}>Semesters</h1>
      <p style={ui.sub}>Each semester is a fresh container — its own batches, trainers, plans, and records.</p>
      <div style={{ height:20 }} />
      <Alert alert={alert} />

      {isAdmin && (
        <div style={{ ...ui.card, marginBottom:24 }}>
          <h2 style={ui.h2}>Start a new semester</h2>
          <p style={{ ...ui.sub, marginBottom:14 }}>
            This archives the current active semester (its data stays viewable) and opens a clean one. You'll then create this semester's batches, assign trainers, and set plans.
          </p>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
            <input style={{ ...ui.input, maxWidth:340 }} placeholder="e.g. Odd Sem 2026–27"
              value={name} onChange={e=>setName(e.target.value)} />
            {!confirming ? (
              <button style={ui.btnGold} onClick={()=>{ if(!name.trim()) return show('Enter a name','error'); setConfirming(true) }}>Start New Semester</button>
            ) : (
              <>
                <button style={ui.btnGold} disabled={saving} onClick={startNew}>{saving?'Starting…':`Confirm: archive "${active?.name||'none'}" & start`}</button>
                <button style={ui.btnGhost} onClick={()=>setConfirming(false)}>Cancel</button>
              </>
            )}
          </div>
        </div>
      )}

      {semesters.length === 0 ? (
        <Empty icon="📚" title="No semesters yet" hint={isAdmin ? 'Start your first one above.' : ''} />
      ) : (
        <div style={{ display:'grid', gap:12 }}>
          {semesters.map(s => (
            <div key={s._id} style={{ ...ui.card, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}>
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontSize:16, fontWeight:700 }}>{s.name}</span>
                  <span style={ui.pill(
                    s.status==='active' ? 'rgba(22,163,74,0.18)' : 'rgba(255,255,255,0.08)',
                    s.status==='active' ? '#86EFAC' : 'var(--muted)'
                  )}>{s.status}</span>
                </div>
                <div style={{ ...ui.sub, marginTop:4 }}>
                  Started {new Date(s.startDate).toLocaleDateString()}
                  {s.endDate && ` · ended ${new Date(s.endDate).toLocaleDateString()}`}
                </div>
              </div>
              {isAdmin && (
                <div style={{ display:'flex', gap:8 }}>
                  {s.status === 'archived'
                    ? <button style={ui.btnGhost} onClick={()=>reactivate(s._id)}>Set active</button>
                    : <button style={ui.btnGhost} onClick={()=>archive(s._id)}>Archive</button>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
