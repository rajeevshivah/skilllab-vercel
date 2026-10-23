// Trainer feedback from students (replaces the Google Form).
// Admin: open a feedback form for chosen batches for N hours, close/extend it,
// read averages + comments. Trainer: own averages only (5+ answers), no names.
import { useEffect, useState } from 'react'
import api from '../api'
import { useAuth } from '../context/AuthContext'

const fmtDT = (d) => d ? new Date(d).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : ''
const color = (v) => v == null ? 'var(--ink-soft)' : v >= 4 ? 'var(--tick)' : v >= 3 ? 'var(--blue-ink)' : 'var(--red-ink)'

function Results({ id }) {
  const [d, setD] = useState(null)
  useEffect(() => { api.get(`/feedback/windows/${id}/results`).then(r => setD(r.data)).catch(() => setD({ error: true })) }, [id])
  if (!d) return <p className="muted">Loading…</p>
  if (d.error) return <p className="muted">Could not load results.</p>
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {d.rows.length === 0 && <p className="muted">No trainers to show.</p>}
      {d.rows.map(r => (
        <div key={`${r.batchId}-${r.trainerId}`} style={{ border: '1px solid var(--rule)', borderRadius: 8, padding: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <b>{r.trainer} · {r.batch}</b>
            <span className="muted" style={{ fontSize: 13 }}>{r.responses} of {r.students} students answered</span>
          </div>
          {r.averages ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 8, marginTop: 8 }}>
              <div><div className="muted" style={{ fontSize: 12 }}>Overall average</div><div style={{ fontSize: 22, fontWeight: 700, color: color(r.overall) }}>{r.overall} / 5</div></div>
              {d.questions.map(q => (
                <div key={q.key}><div className="muted" style={{ fontSize: 12 }}>{q.text}</div><div style={{ fontWeight: 700, color: color(r.averages[q.key]) }}>{r.averages[q.key]}</div></div>
              ))}
            </div>
          ) : <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>{r.hidden ? `Shown once ${d.minForTrainer} or more students have answered.` : 'No answers yet.'}</p>}
          {r.comments?.length > 0 && (
            <details style={{ marginTop: 8 }}><summary style={{ cursor: 'pointer', fontSize: 14 }}>{r.comments.length} comment(s) — only you see these</summary>
              <ul style={{ margin: '6px 0 0 18px', fontSize: 14 }}>{r.comments.map((c, i) => <li key={i} style={{ marginBottom: 4 }}>{c}</li>)}</ul></details>
          )}
        </div>
      ))}
    </div>
  )
}

export function FeedbackPanel() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'superadmin'
  const [data, setData] = useState(null)
  const [batches, setBatches] = useState([])
  const [pick, setPick] = useState({})
  const [title, setTitle] = useState('Trainer feedback')
  const [hours, setHours] = useState(48)
  const [open, setOpen] = useState(null)
  const [msg, setMsg] = useState(null)
  const flash = (t, ok = true) => { setMsg({ t, ok }); setTimeout(() => setMsg(null), 4000) }

  async function load() {
    const { data } = await api.get('/feedback/windows'); setData(data)
  }
  useEffect(() => {
    load()
    if (isAdmin) api.get('/batches').then(r => setBatches((r.data.batches || []).filter(b => b.semester?.status === 'active')))
  }, [isAdmin])

  async function create() {
    const ids = Object.keys(pick).filter(k => pick[k])
    try { await api.post('/feedback/windows', { title, batchIds: ids, hours }); setPick({}); flash('Feedback form opened. Students see it on their page now.'); load() }
    catch (e) { flash(e.response?.data?.message || 'Could not open', false) }
  }
  async function patch(id, body, t) {
    try { await api.patch(`/feedback/windows/${id}`, body); flash(t); load() } catch (e) { flash(e.response?.data?.message || 'Failed', false) }
  }

  if (!data) return <p className="muted">Loading…</p>
  return (
    <div>
      <p className="muted" style={{ marginTop: 0, marginBottom: 16 }}>
        Anonymous feedback from students about their trainers. {isAdmin ? 'You open a form for chosen batches; students answer on their own page.' : `You see your own averages once ${data.minForTrainer} or more students have answered — never who answered.`}
      </p>
      {msg && <div className={`banner ${msg.ok ? 'banner--success' : 'banner--error'}`}>{msg.t}</div>}

      {isAdmin && (
        <div className="sheet" style={{ padding: 16, marginBottom: 18, display: 'grid', gap: 12 }}>
          <b>Open a feedback form</b>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input className="ctl" style={{ maxWidth: 300 }} value={title} onChange={e => setTitle(e.target.value)} />
            <select className="ctl" style={{ width: 'auto' }} value={hours} onChange={e => setHours(Number(e.target.value))}>
              {[[24, 'Open for 1 day'], [48, 'Open for 2 days'], [72, 'Open for 3 days'], [168, 'Open for 7 days']].map(([h, l]) => <option key={h} value={h}>{l}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn--quiet btn--sm" onClick={() => setPick(Object.fromEntries(batches.map(b => [b._id, true])))}>All batches</button>
            {batches.map(b => (
              <label key={b._id} className={`tag ${pick[b._id] ? 'tag--blue' : 'tag--muted'}`} style={{ cursor: 'pointer' }}>
                <input type="checkbox" checked={!!pick[b._id]} onChange={e => setPick(p => ({ ...p, [b._id]: e.target.checked }))} style={{ marginRight: 6 }} />{b.name}
              </label>
            ))}
          </div>
          <div><button className="btn btn--primary btn--sm" disabled={!Object.values(pick).some(Boolean)} onClick={create}>Open feedback</button></div>
          <p className="muted" style={{ fontSize: 12 }}>Questions (1–5): {data.questions.map(q => q.text).join(' · ')} — plus an optional comment.</p>
        </div>
      )}

      <div style={{ display: 'grid', gap: 12 }}>
        {data.windows.length === 0 && <div className="sheet" style={{ padding: 16 }}><p className="muted">No feedback forms yet.</p></div>}
        {data.windows.map(w => (
          <div key={w._id} className="sheet" style={{ padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <div>
                <b>{w.title}</b> {w.open ? <span className="tag tag--tick">Open</span> : <span className="tag tag--muted">Closed</span>}
                <div className="muted" style={{ fontSize: 13 }}>{fmtDT(w.openFrom)} → {fmtDT(w.openUntil)} · {w.batches.map(b => b.name).join(', ')} · {w.responses} answers</div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {isAdmin && w.open && <button className="btn btn--secondary btn--sm" onClick={() => patch(w._id, { close: true }, 'Closed.')}>Close now</button>}
                {isAdmin && !w.open && <button className="btn btn--quiet btn--sm" onClick={() => patch(w._id, { hours: 24 }, 'Reopened for 1 day.')}>Reopen 1 day</button>}
                <button className="btn btn--secondary btn--sm" onClick={() => setOpen(open === w._id ? null : w._id)}>{open === w._id ? 'Hide results' : 'Results'}</button>
              </div>
            </div>
            {open === w._id && <div style={{ marginTop: 12 }}><Results id={w._id} /></div>}
          </div>
        ))}
      </div>
    </div>
  )
}
