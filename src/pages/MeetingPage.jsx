// Meetings — the screens to run the two regular meetings on.
//   Daily review: after classes, batch by batch — plan vs what was logged vs
//                 what students said, with notes (open notes carry over).
//   Cycle review: end of cycle, trainer by trainer — every number that matters,
//                 with notes the trainer can see.
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api from '../api'
import { useAuth } from '../context/AuthContext'
import { FeedbackPanel } from './FeedbackPage'
import ClassHealth from './ClassHealth'

const IST = { timeZone: 'Asia/Kolkata' }
const fmtDay = (s) => s ? new Date(s + 'T12:00:00+05:30').toLocaleDateString('en-IN', { ...IST, weekday: 'short', day: 'numeric', month: 'short' }) : '—'
const fmtDT = (d) => d ? new Date(d).toLocaleString('en-IN', { ...IST, day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : ''
const todayYmd = () => new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10)
const shift = (s, n) => { const d = new Date(s + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }
const STATUS = { done: ['Done as planned', 'tag--tick'], partial: ['Partly done', 'tag--pencil'], 'not-covered': ['Not done', 'tag--red'], 'no-class': ['No class', 'tag--blue'] }

function Notes({ notes, onAdd, onToggle, canAdd, placeholder = 'Add a note / action…', me, isAdmin, onDelete }) {
  const [t, setT] = useState('')
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      {notes.map(n => (
        <div key={n._id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 14, opacity: n.status === 'done' ? .6 : 1 }}>
          <input type="checkbox" checked={n.status === 'done'} onChange={() => onToggle(n)} style={{ marginTop: 3 }} title="Mark done" />
          <div style={{ flex: 1 }}>
            <span style={{ textDecoration: n.status === 'done' ? 'line-through' : 'none' }}>{n.text}</span>
            <div className="muted" style={{ fontSize: 12 }}>{n.by}, {fmtDT(n.at)}{n.scope === 'day' && n.date ? ` · from ${fmtDay(n.date)}` : ''}{n.status === 'done' ? ` · done by ${n.doneBy}` : ''}</div>
          </div>
          {(isAdmin || n.byId === me) && <button className="btn btn--quiet" style={{ fontSize: 12, color: 'var(--red-ink)' }} onClick={() => onDelete(n)}>delete</button>}
        </div>
      ))}
      {canAdd && (
        <form onSubmit={e => { e.preventDefault(); if (t.trim()) { onAdd(t.trim()); setT('') } }} style={{ display: 'flex', gap: 6 }}>
          <input className="ctl" style={{ height: 34 }} value={t} onChange={e => setT(e.target.value)} placeholder={placeholder} />
          <button className="btn btn--secondary btn--sm" style={{ height: 34 }} disabled={!t.trim()}>Add</button>
        </form>
      )}
    </div>
  )
}

function Stepper({ items, value, onChange, label }) {
  const i = items.findIndex(x => x.key === value)
  return (
    <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
      <select className="ctl" style={{ width: 'auto', height: 34 }} value={value} onChange={e => onChange(e.target.value)}>
        <option value="">{label}</option>
        {items.map(x => <option key={x.key} value={x.key}>{x.label}</option>)}
      </select>
      {value && <>
        <button className="btn btn--secondary btn--sm" disabled={i <= 0} onClick={() => onChange(items[i - 1].key)}>‹ Prev</button>
        <button className="btn btn--secondary btn--sm" disabled={i >= items.length - 1} onClick={() => onChange(items[i + 1].key)}>Next ›</button>
      </>}
    </span>
  )
}

function DayTab({ me, isAdminUser, flash }) {
  const [date, setDate] = useState(todayYmd())
  const [d, setD] = useState(null)
  const [one, setOne] = useState('')
  async function load() { try { setD((await api.get('/meeting/day', { params: { date } })).data) } catch (e) { flash(e.response?.data?.message || 'Could not load', false) } }
  useEffect(() => { setD(null); load() }, [date])
  async function addNote(text, batchId) {
    try { await api.post('/meeting/notes', { scope: 'day', date, batchId, text }); load() } catch (e) { flash(e.response?.data?.message || 'Could not add', false) }
  }
  async function toggle(n) { try { await api.patch(`/meeting/notes/${n._id}`, { status: n.status === 'done' ? 'open' : 'done' }); load() } catch (e) { flash(e.response?.data?.message || 'Failed', false) } }
  async function del(n) { if (!window.confirm('Delete this note?')) return; try { await api.delete(`/meeting/notes/${n._id}`); load() } catch (e) { flash(e.response?.data?.message || 'Failed', false) } }

  const shown = d ? d.batches.filter(b => !one || String(b.batchId) === one) : []
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn btn--secondary btn--sm" onClick={() => setDate(shift(date, -1))}>‹</button>
        <input type="date" className="ctl" style={{ width: 170, height: 34 }} value={date} onChange={e => e.target.value && setDate(e.target.value)} />
        <button className="btn btn--secondary btn--sm" onClick={() => setDate(shift(date, 1))}>›</button>
        <b style={{ marginRight: 8 }}>{fmtDay(date)}{date === todayYmd() ? ' · Today' : ''}</b>
        {d && <Stepper items={d.batches.map(b => ({ key: String(b.batchId), label: b.batch }))} value={one} onChange={setOne} label="All batches" />}
      </div>
      {!d ? <p className="muted">Loading…</p> : d.batches.length === 0 ? <div className="sheet" style={{ padding: 16 }}><p className="muted">No classes that day.</p></div> : shown.map(b => {
        const notes = d.notes.filter(n => n.batch && String(n.batch._id) === String(b.batchId))
        const L = b.log
        return (
          <div key={b.batchId} className="sheet" style={{ padding: 14, borderLeft: `5px solid ${b.holiday ? 'var(--blue-ink)' : !L ? 'var(--red-ink)' : b.pulse?.mismatch || L.missing.length ? 'var(--pencil)' : 'var(--tick)'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
              <div><b style={{ fontSize: 16 }}>{b.batch}</b> <span className="muted" style={{ fontSize: 13 }}>· Cycle {b.cycle.number} · {b.trainers.join(', ')}</span></div>
              <Link to={`/batch/${b.batchId}`} className="btn btn--quiet btn--sm">Open batch ▸</Link>
            </div>
            {b.holiday && <div className="banner" style={{ margin: '8px 0 0', background: 'var(--blue-wash)', color: 'var(--blue-ink)' }}>Holiday: {b.holiday}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginTop: 10, fontSize: 14 }}>
              <div>
                <div className="muted" style={{ fontSize: 12, fontWeight: 600 }}>PLANNED</div>
                {b.planned.length ? b.planned.map(p => <div key={p.number}><b>Class {p.number}:</b> {p.title || <i className="muted">topic not filled</i>}</div>) : <span className="muted">No class planned</span>}
              </div>
              <div>
                <div className="muted" style={{ fontSize: 12, fontWeight: 600 }}>LOGGED BY TRAINER</div>
                {!L ? <span style={{ color: 'var(--red-ink)', fontWeight: 600 }}>Not logged</span> : <>
                  <span className={`tag ${STATUS[L.status]?.[1]}`}>{STATUS[L.status]?.[0]}</span>
                  {L.planClass != null && <span className="muted"> · class {L.planClass}{L.planClassTitle ? ` (${L.planClassTitle})` : ''}</span>}
                  {L.notes && <div style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}>{L.notes}</div>}
                  <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                    {L.by}{L.sameDay ? '' : ' · logged late'} · GitHub: {L.github || '—'} · Attendance: {L.attendance ? `${L.attendance.present}/${L.attendance.total}` : 'not taken'}
                  </div>
                  {L.missing.length > 0 && <div style={{ color: 'var(--pencil)', fontSize: 12 }}>Missing: {L.missing.join(', ')}</div>}
                </>}
              </div>
              <div>
                <div className="muted" style={{ fontSize: 12, fontWeight: 600 }}>STUDENTS SAY</div>
                {!b.pulse ? <span className="muted">No answers</span> : <>
                  <div style={{ color: b.pulse.mismatch ? 'var(--red-ink)' : 'inherit', fontWeight: b.pulse.mismatch ? 700 : 400 }}>
                    {b.pulse.mismatch ? '⚠ ' : ''}{b.pulse.coveredPct}% say covered</div>
                  <div>Understood {b.pulse.understanding}/5 <span className="muted">({b.pulse.responses} answers: {b.pulse.yes} yes · {b.pulse.partly} partly · {b.pulse.no} no)</span></div>
                </>}
              </div>
            </div>
            <div style={{ marginTop: 10, borderTop: '1px dashed var(--rule)', paddingTop: 8 }}>
              <Notes notes={notes} canAdd={isAdminUser || b.mine} me={me} isAdmin={isAdminUser}
                onAdd={(t) => addNote(t, b.batchId)} onToggle={toggle} onDelete={del} placeholder="Action / note for this batch…" />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ReviewTab({ me, isAdminUser, flash }) {
  const [period, setPeriod] = useState('')
  const [d, setD] = useState(null)
  const [one, setOne] = useState('')
  async function load(p) { try { const r = (await api.get('/meeting/review', { params: p ? { period: p } : {} })).data; setD(r); if (!p) setPeriod(r.period || '') } catch (e) { flash(e.response?.data?.message || 'Could not load', false) } }
  useEffect(() => { load(period) }, [period])
  async function addNote(text, trainerId) {
    try { await api.post('/meeting/notes', { scope: 'cycle', period: d.period, trainerId, text }); load(d.period) } catch (e) { flash(e.response?.data?.message || 'Could not add', false) }
  }
  async function toggle(n) { try { await api.patch(`/meeting/notes/${n._id}`, { status: n.status === 'done' ? 'open' : 'done' }); load(d.period) } catch (e) { flash(e.response?.data?.message || 'Failed', false) } }
  async function del(n) { if (!window.confirm('Delete this note?')) return; try { await api.delete(`/meeting/notes/${n._id}`); load(d.period) } catch (e) { flash(e.response?.data?.message || 'Failed', false) } }
  if (!d) return <p className="muted">Loading…</p>
  const shown = d.trainers.filter(t => !one || String(t.id) === one)
  const pct = (a, b) => b ? Math.round(100 * a / b) : 0
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <select className="ctl" style={{ width: 'auto', height: 34 }} value={d.period || ''} onChange={e => { setOne(''); setPeriod(e.target.value) }}>
          {d.periods.map(p => <option key={p.key} value={p.key}>Due {fmtDay(p.key)} · Cycle{p.numbers.length > 1 ? 's' : ''} {p.numbers.join(', ')}</option>)}
        </select>
        <Stepper items={d.trainers.map(t => ({ key: String(t.id), label: t.name }))} value={one} onChange={setOne} label="All trainers" />
      </div>
      {shown.length === 0 && <div className="sheet" style={{ padding: 16 }}><p className="muted">No tracked trainers in this period.</p></div>}
      {shown.map(t => (
        <div key={t.id} className="sheet" style={{ padding: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'baseline' }}>
            <b style={{ fontSize: 18 }}>{t.name}</b>
            <span>This cycle <b style={{ fontSize: 18 }}>{t.thisCycle ?? '—'}</b> · Semester avg <b>{t.semesterAvg ?? '—'}</b> <Link to="/performance" className="btn btn--quiet btn--sm">Details ▸</Link></span>
          </div>
          <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
            {t.batches.map(b => (
              <div key={b.cycleId} style={{ border: '1px solid var(--rule)', borderRadius: 8, padding: 10, fontSize: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                  <b>{b.batch} · Cycle {b.number}{b.isLead ? ' ★' : ''}</b>
                  <span>Score <b>{b.score ?? '—'}</b> · {b.overall === 'on-time' ? <span className="tag tag--tick">On time</span> : b.overall === 'late' ? <span className="tag tag--red">Late {b.lateBy ? `by ${b.lateBy} d` : ''}</span> : b.overall === 'admin' ? <span className="tag tag--pencil">Done by admin</span> : b.overall === 'missing' ? <span className="tag tag--red">Not done</span> : <span className="tag tag--muted">Pending</span>}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10, marginTop: 8 }}>
                  <div><div className="muted" style={{ fontSize: 12 }}>Classes ({b.plan.due} due)</div>
                    {b.plan.done} done · {b.plan.partial} partly · {b.plan.notDone} not done{b.plan.notLogged ? <span style={{ color: 'var(--red-ink)' }}> · {b.plan.notLogged} not logged</span> : ''}</div>
                  <div><div className="muted" style={{ fontSize: 12 }}>Marks ({b.marks.evaluated}/{b.marks.students} evaluated)</div>
                    <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', background: 'var(--rule)', margin: '4px 0' }} title="Excellent · Moderate · Basic · Zero">
                      {[['excellent', 'var(--tick)'], ['moderate', 'var(--blue-ink)'], ['basic', 'var(--pencil)'], ['zero', 'var(--red-ink)']].map(([k, c]) => <span key={k} style={{ width: `${pct(b.marks[k], b.marks.evaluated)}%`, background: c }} />)}
                    </div>
                    <span style={{ fontSize: 12 }}>{b.marks.excellent} exc · {b.marks.moderate} mod · {b.marks.basic} basic · {b.marks.zero} zero</span></div>
                  <div><div className="muted" style={{ fontSize: 12 }}>Students say</div>{b.pulse.days ? <>{b.pulse.coveredPct}% covered · understood {b.pulse.understanding}/5</> : <span className="muted">no answers</span>}</div>
                  <div><div className="muted" style={{ fontSize: 12 }}>Projects submitted online</div>{b.submissions.submitted}/{b.submissions.students}</div>
                  <div><div className="muted" style={{ fontSize: 12 }}>Student feedback</div>{b.feedback ? (b.feedback.overall != null ? <>{b.feedback.overall}/5 ({b.feedback.responses})</> : <span className="muted">{b.feedback.responses} answers (shown at 5+)</span>) : <span className="muted">no form</span>}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 10, borderTop: '1px dashed var(--rule)', paddingTop: 8 }}>
            <div className="muted" style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>REVIEW NOTES {isAdminUser ? '(the trainer can see these)' : ''}</div>
            <Notes notes={t.notes} canAdd={isAdminUser || String(t.id) === me} me={me} isAdmin={isAdminUser}
              onAdd={(text) => addNote(text, t.id)} onToggle={toggle} onDelete={del} placeholder="What went well / what to change next cycle…" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function MeetingPage() {
  const { user } = useAuth()
  const me = String(user?.id || user?._id || '')
  const isAdminUser = user?.role === 'superadmin'
  const [sp, setSp] = useSearchParams()
  const tab = ['day', 'review', 'feedback'].includes(sp.get('tab')) ? sp.get('tab') : 'health'
  const [msg, setMsg] = useState(null)
  const flash = (t, ok = true) => { setMsg({ t, ok }); setTimeout(() => setMsg(null), 4000) }
  return (
    <div className="page">
      <h1 className="page-title">Meetings &amp; class health</h1>
      <p className="muted" style={{ marginTop: 4 }}>How every class went, for a day, a week or a whole cycle — and the two regular meetings, with notes that stay with the batch / trainer.</p>
      <div className="tabs" style={{ margin: '16px 0 16px' }}>
        <button className={tab === 'health' ? 'is-active' : ''} onClick={() => setSp({})}>Class health</button>
        <button className={tab === 'day' ? 'is-active' : ''} onClick={() => setSp({ tab: 'day' })}>Daily review</button>
        <button className={tab === 'review' ? 'is-active' : ''} onClick={() => setSp({ tab: 'review' })}>Cycle review</button>
        <button className={tab === 'feedback' ? 'is-active' : ''} onClick={() => setSp({ tab: 'feedback' })}>Student feedback</button>
      </div>
      {msg && <div className={`banner ${msg.ok ? 'banner--success' : 'banner--error'}`}>{msg.t}</div>}
      {tab === 'health' && <ClassHealth isAdmin={isAdminUser} />}
      {tab === 'day' && <DayTab me={me} isAdminUser={isAdminUser} flash={flash} />}
      {tab === 'review' && <ReviewTab me={me} isAdminUser={isAdminUser} flash={flash} />}
      {tab === 'feedback' && <FeedbackPanel />}
    </div>
  )
}
