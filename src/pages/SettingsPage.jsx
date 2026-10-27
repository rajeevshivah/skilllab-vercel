// Admin Settings — holidays (with preview, auto-shift and undo), each batch's
// weekly timetable (which the holiday shift uses) and how Top students are scored.
import { useEffect, useState } from 'react'
import api from '../api'

const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const fmtDay = (ymd) => ymd ? new Date(ymd + 'T12:00:00+05:30').toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short' }) : '—'
const fmtDate = (d) => d ? new Date(d).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : ''

function Timetables({ flash }) {
  const [rows, setRows] = useState(null)
  const [edit, setEdit] = useState({})
  async function load() { const { data } = await api.get('/settings/timetables'); setRows(data.batches); setEdit({}) }
  useEffect(() => { load() }, [])
  async function save(b) {
    try { await api.put(`/settings/timetables/${b._id}`, { days: edit[b._id] ?? b.days }); flash(`${b.name}: timetable saved.`); load() }
    catch (e) { flash(e.response?.data?.message || 'Could not save', false) }
  }
  if (!rows) return <p className="muted">Loading…</p>
  return (
    <div className="table-wrap sheet" style={{ borderRadius: 10 }}>
      <table className="table table--compact">
        <thead><tr><th>Batch</th><th>Class days</th><th></th></tr></thead>
        <tbody>{rows.map(b => {
          const days = edit[b._id] ?? b.days, dirty = edit[b._id] !== undefined
          return (
            <tr key={b._id}>
              <td><b>{b.name}</b>{b.track && <div className="muted" style={{ fontSize: 12 }}>{b.track}</div>}</td>
              <td>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {WD.map((w, i) => i === 0 ? null : (
                    <button key={i} type="button" className={`btn btn--sm ${days.includes(i) ? 'btn--primary' : 'btn--secondary'}`} style={{ minWidth: 46 }}
                      onClick={() => setEdit(e => ({ ...e, [b._id]: days.includes(i) ? days.filter(x => x !== i) : [...days, i].sort() }))}>{w}</button>
                  ))}
                </div>
                {b.source === 'guessed' && !dirty && <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>Guessed from the class plans — check and save.</div>}
              </td>
              <td>{(dirty || b.source === 'guessed') && <button className="btn btn--secondary btn--sm" onClick={() => save(b)}>Save</button>}</td>
            </tr>
          )
        })}</tbody>
      </table>
    </div>
  )
}

function Holidays({ flash }) {
  const [list, setList] = useState(null)
  const [batches, setBatches] = useState([])
  const [f, setF] = useState({ from: '', to: '', title: '', mode: 'keep', makeupDate: '', all: true, pick: {} })
  const [pv, setPv] = useState(null)
  const [busy, setBusy] = useState(false)
  async function load() { const { data } = await api.get('/settings/holidays'); setList(data.holidays) }
  useEffect(() => {
    load()
    api.get('/batches').then(r => setBatches((r.data.batches || []).filter(b => b.semester?.status === 'active')))
  }, [])
  const body = () => ({ from: f.from, to: f.mode === 'makeup' ? f.from : (f.to || f.from), title: f.title || 'Holiday', mode: f.mode, makeupDate: f.mode === 'makeup' ? f.makeupDate : null,
    batchIds: f.all ? [] : Object.keys(f.pick).filter(k => f.pick[k]) })
  const set = (k, v) => { setF(o => ({ ...o, [k]: v })); setPv(null) }

  async function preview() {
    setBusy(true)
    try { const { data } = await api.post('/settings/holidays/preview', body()); setPv(data) }
    catch (e) { flash(e.response?.data?.message || 'Could not preview', false) }
    finally { setBusy(false) }
  }
  async function apply() {
    setBusy(true)
    try {
      const { data } = await api.post('/settings/holidays', body())
      flash(`Holiday saved. ${data.moved} class(es) moved${data.merged ? `, ${data.merged} merged` : ''}${data.cycleChanges ? `, ${data.cycleChanges} cycle date(s) changed` : ''}.`)
      setPv(null); setF({ from: '', to: '', title: '', mode: 'keep', makeupDate: '', all: true, pick: {} }); load()
    } catch (e) { flash(e.response?.data?.message || 'Could not save', false) }
    finally { setBusy(false) }
  }
  async function remove(h) {
    if (!window.confirm(`Remove "${h.title}"?${h.moved || h.merged ? ` Classes it moved${h.merged ? ' or merged' : ''} go back as they were.` : ''}`)) return
    try {
      const { data } = await api.delete(`/settings/holidays/${h._id}`)
      flash(`Removed.${data.skipped.length ? ` Not moved back (changed since): ${data.skipped.join(', ')}.` : ''}`); load()
    } catch (e) { flash(e.response?.data?.message || 'Could not remove', false) }
  }

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div className="sheet" style={{ padding: 16, display: 'grid', gap: 12 }}>
        <b>Mark a holiday / no-class day</b>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'end' }}>
          <div className="field" style={{ margin: 0 }}><label>From</label><input type="date" className="ctl" value={f.from} onChange={e => set('from', e.target.value)} /></div>
          {f.mode !== 'makeup' && <div className="field" style={{ margin: 0 }}><label>To (same day if one day)</label><input type="date" className="ctl" value={f.to} onChange={e => set('to', e.target.value)} /></div>}
          <div className="field" style={{ margin: 0, flex: 1, minWidth: 200 }}><label>Reason</label><input className="ctl" placeholder="e.g. Annual function" value={f.title} onChange={e => set('title', e.target.value)} /></div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>Batches:</span>
          <button type="button" className={`btn btn--sm ${f.all ? 'btn--primary' : 'btn--secondary'}`} onClick={() => set('all', true)}>All batches</button>
          <button type="button" className={`btn btn--sm ${!f.all ? 'btn--primary' : 'btn--secondary'}`} onClick={() => set('all', false)}>Choose</button>
          {!f.all && batches.map(b => (
            <label key={b._id} className={`tag ${f.pick[b._id] ? 'tag--blue' : 'tag--muted'}`} style={{ cursor: 'pointer' }}>
              <input type="checkbox" checked={!!f.pick[b._id]} onChange={e => set('pick', { ...f.pick, [b._id]: e.target.checked })} style={{ marginRight: 6 }} />{b.name}
            </label>))}
        </div>
        <div style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>Planned classes on these days:</span>
          {[['keep', 'Move them forward, but keep the project day', 'Each class moves to the next class day. The class that no longer fits before the project day is merged into the one before it (both topics in one class). Project day and deadline stay. Usually the best choice for one lost day.'],
            ['makeup', 'The classes happen on another day instead (make-up day)', 'For example Monday’s classes held on Saturday. Only that day’s classes move; nothing else changes. One day only.'],
            ['shift', 'Move everything forward, project day too', 'Order is kept. If they go past the cycle end, the end date, project day and deadline move too. Not allowed if it runs into the next cycle.'],
            ['mark', 'Don’t move anything — I’ll re-plan by hand', 'The classes stay and are flagged on the Class plans page for you to change.']].map(([k, t, d]) => (
            <label key={k} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', cursor: 'pointer', fontSize: 14 }}>
              <input type="radio" checked={f.mode === k} onChange={() => set('mode', k)} style={{ marginTop: 3 }} />
              <span><b>{t}</b><br /><span className="muted" style={{ fontSize: 13 }}>{d}</span></span>
            </label>))}
        </div>
        {f.mode === 'makeup' && <div className="field" style={{ margin: 0, maxWidth: 260 }}><label>Classes happen instead on</label><input type="date" className="ctl" value={f.makeupDate} onChange={e => set('makeupDate', e.target.value)} /></div>}
        <p className="muted" style={{ fontSize: 12 }}>Whichever you pick: no log is expected on these days (nobody loses score), students get no class question, and the plan pages show the holiday.</p>
        <div><button className="btn btn--secondary btn--sm" disabled={busy || !f.from || (f.mode === 'makeup' && !f.makeupDate) || (!f.all && !Object.values(f.pick).some(Boolean))} onClick={preview}>Preview changes</button></div>

        {pv && (
          <div style={{ borderTop: '1px solid var(--rule)', paddingTop: 12, display: 'grid', gap: 10 }}>
            <b>Preview — {pv.title}, {fmtDay(pv.from)}{pv.to !== pv.from ? ` – ${fmtDay(pv.to)}` : ''}{pv.makeupDate ? ` · held on ${fmtDay(pv.makeupDate)}` : ''}</b>
            {pv.batches.map(r => (
              <div key={r.batchId} style={{ border: `1px solid ${r.conflict ? 'var(--red-ink)' : 'var(--rule)'}`, borderRadius: 8, padding: 10, fontSize: 14 }}>
                <b>{r.batch}</b> <span className="muted" style={{ fontSize: 12 }}>· class days {r.days.join(', ') || 'not set'}{r.source === 'guessed' ? ' (guessed)' : ''}</span>
                {r.conflict && <div style={{ color: 'var(--red-ink)', marginTop: 4 }}>✕ {r.conflict}</div>}
                {r.note && <div style={{ color: 'var(--pencil)', marginTop: 4 }}>{r.note}</div>}
                {r.moves.length === 0 && !(r.merges || []).length && r.onHoliday.length === 0 && !r.conflict && <div className="muted">No planned classes affected.</div>}
                {r.moves.length > 0 && <ul style={{ margin: '6px 0 0 18px' }}>{r.moves.map((m, i) => <li key={i}>Class {m.number} {m.title ? `(${m.title.slice(0, 50)})` : ''}: {fmtDay(m.from)} → <b>{fmtDay(m.to)}</b></li>)}</ul>}
                {(r.merges || []).length > 0 && <ul style={{ margin: '6px 0 0 18px', color: 'var(--pencil)' }}>{r.merges.map((g, i) => <li key={i}>Class {g.removed.map(x => x.number).join(', ')} {g.removed.length > 1 ? 'are' : 'is'} merged into class {g.into} on <b>{fmtDay(g.date)}</b> ({[g.intoTitle, ...g.removed.map(x => x.title)].filter(Boolean).map(t => t.slice(0, 40)).join(' + ')})</li>)}</ul>}
                {r.onHoliday.length > 0 && <ul style={{ margin: '6px 0 0 18px', color: 'var(--pencil)' }}>{r.onHoliday.map((m, i) => <li key={i}>Class {m.number} on {fmtDay(m.date)} needs re-planning</li>)}</ul>}
                {r.cycleChanges.map((c, i) => (
                  <div key={i} style={{ marginTop: 6 }}>Cycle {c.cycle}:{c.endTo && <> end {fmtDay(c.endFrom)} → <b>{fmtDay(c.endTo)}</b>;</>}{c.projectTo && <> project day {fmtDay(c.projectFrom)} → <b>{fmtDay(c.projectTo)}</b>;</>}{c.deadlineTo && <> deadline → <b>{fmtDate(c.deadlineTo)}</b></>}</div>
                ))}
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn--primary btn--sm" disabled={busy || !pv.ok} onClick={apply}>{pv.mode === 'mark' ? 'Mark holiday' : pv.mode === 'makeup' ? 'Mark holiday and move to make-up day' : 'Mark holiday and move classes'}</button>
              <button className="btn btn--quiet btn--sm" onClick={() => setPv(null)}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      <div className="table-wrap sheet" style={{ borderRadius: 10 }}>
        <table className="table table--compact">
          <thead><tr><th>Dates</th><th>Reason</th><th>Batches</th><th>Classes</th><th>Added</th><th></th></tr></thead>
          <tbody>
            {!list ? <tr><td colSpan={6} className="muted">Loading…</td></tr> : list.length === 0 ? <tr><td colSpan={6} className="muted">No holidays marked this semester.</td></tr>
              : list.map(h => (
                <tr key={h._id}>
                  <td>{fmtDay(h.from)}{h.to !== h.from ? ` – ${fmtDay(h.to)}` : ''}</td>
                  <td><b>{h.title}</b></td>
                  <td>{h.batches.length ? h.batches.join(', ') : 'All batches'}</td>
                  <td>{h.mode === 'mark' ? 'not moved' : h.mode === 'makeup' ? `held on ${fmtDay(h.makeupDate)}` : `${h.moved} moved${h.merged ? `, ${h.merged} merged` : ''}`}</td>
                  <td className="muted">{h.by}</td>
                  <td><button className="btn btn--quiet btn--sm" style={{ color: 'var(--red-ink)' }} onClick={() => remove(h)}>Remove</button></td>
                </tr>))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const SCORE_FIELDS = [['marks', 'Marks (average cycle %)'], ['attendance', 'Attendance %'], ['projects', 'Projects submitted %']]
function StudentScore({ flash }) {
  const [v, setV] = useState(null), [defaults, setDefaults] = useState(null), [busy, setBusy] = useState(false)
  useEffect(() => { api.get('/settings/student-score').then(r => { setV(r.data.studentScore); setDefaults(r.data.defaults) }) }, [])
  if (!v) return <p className="muted">Loading…</p>
  const set = (k, x) => setV({ ...v, [k]: x === '' ? '' : Number(x) })
  const total = SCORE_FIELDS.reduce((s, [k]) => s + (Number(v[k]) || 0), 0)
  async function save(body = v) {
    setBusy(true)
    try { const r = await api.put('/settings/student-score', body); setV(r.data.studentScore); flash('Saved. Top students now use these rules.') }
    catch (e) { flash(e.response?.data?.message || 'Could not save', false) } finally { setBusy(false) }
  }
  return (
    <div className="sheet" style={{ padding: 20, maxWidth: 620 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>How a student's score is made</h2>
      <p className="muted" style={{ fontSize: 13, marginBottom: 14 }}>Score out of 100. Weights are relative — they don't need to add up to 100. A part with no data yet (e.g. no cycle marked) is left out for that student.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
        {SCORE_FIELDS.map(([k, l]) => (
          <div key={k} className="field" style={{ margin: 0 }}><label>{l}</label>
            <input type="number" min="0" max="100" className="ctl" value={v[k]} onChange={e => set(k, e.target.value)} />
            <div className="muted" style={{ fontSize: 12, marginTop: 3 }}>{total ? `${Math.round(100 * (Number(v[k]) || 0) / total)}% of the score` : ''}</div>
          </div>
        ))}
      </div>
      <h2 style={{ fontSize: 16, fontWeight: 700, margin: '18px 0 8px' }}>Labels</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
        <div className="field" style={{ margin: 0 }}><label>"Good" from score</label><input type="number" min="0" max="100" className="ctl" value={v.good} onChange={e => set('good', e.target.value)} /></div>
        <div className="field" style={{ margin: 0 }}><label>"Excellent" from score</label><input type="number" min="0" max="100" className="ctl" value={v.excellent} onChange={e => set('excellent', e.target.value)} /></div>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
        <button className="btn btn--primary btn--sm" disabled={busy} onClick={() => save()}>Save</button>
        <button className="btn btn--quiet btn--sm" disabled={busy} onClick={() => save(defaults)}>Reset to default ({defaults.marks}/{defaults.attendance}/{defaults.projects}, {defaults.good}/{defaults.excellent})</button>
      </div>
    </div>
  )
}

const TABS = ['Holidays', 'Batch timetables', 'Top students']
export default function SettingsPage() {
  const [tab, setTab] = useState(() => { const t = new URLSearchParams(window.location.search).get('tab'); return TABS.includes(t) ? t : 'Holidays' })
  const [msg, setMsg] = useState(null)
  const flash = (t, ok = true) => { setMsg({ t, ok }); setTimeout(() => setMsg(null), 6000) }
  return (
    <div className="page">
      <h1 className="page-title">Settings</h1>
      <p className="muted" style={{ marginTop: 4 }}>Holidays, each batch’s class days, and how top students are scored.</p>
      <div className="tabs" style={{ margin: '16px 0 18px' }}>
        {TABS.map(t => <button key={t} className={tab === t ? 'is-active' : ''} onClick={() => setTab(t)}>{t}</button>)}
      </div>
      {msg && <div className={`banner ${msg.ok ? 'banner--success' : 'banner--error'}`}>{msg.t}</div>}
      {tab === 'Holidays' ? <Holidays flash={flash} /> : tab === 'Batch timetables' ? <Timetables flash={flash} /> : <StudentScore flash={flash} />}
    </div>
  )
}
