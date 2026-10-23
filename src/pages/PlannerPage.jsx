// Cycle planner — the one place new cycles are made (admin).
// 1. Make groups of batches (e.g. "3rd–7th sem" and "1st year") and set each
//    group's dates on the calendar.  2. Click holidays.  3. Click project days
//    (per group, or per batch in the preview).  4. Preview → Create.
// Each batch gets its next cycle number and dated EMPTY plan rows (from its
// confirmed timetable minus holidays); trainers then fill the topics.
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'

const COLORS = ['#2563eb', '#16a34a', '#d97706', '#9333ea', '#db2777', '#0891b2']
const WD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const pad = (n) => String(n).padStart(2, '0')
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const todayYmd = () => new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10)
const fmtDay = (s) => s ? new Date(s + 'T12:00:00+05:30').toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short' }) : '—'
let gid = 1
const newGroup = (n) => ({ id: gid++, name: `Group ${n}`, batchIds: [], start: '', end: '', projectDay: '', projectDays: {} })

function Month({ year, month, dayInfo, onDay }) {
  const first = new Date(year, month, 1)
  const lead = (first.getDay() + 6) % 7
  const days = new Date(year, month + 1, 0).getDate()
  const cells = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => new Date(year, month, i + 1))]
  return (
    <div className="sheet" style={{ padding: 10 }}>
      <div style={{ fontWeight: 700, marginBottom: 6, textAlign: 'center' }}>{first.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, fontSize: 12 }}>
        {WD.map(w => <div key={w} className="muted" style={{ textAlign: 'center', fontWeight: 600 }}>{w}</div>)}
        {cells.map((d, i) => {
          if (!d) return <div key={i} />
          const k = ymd(d), info = dayInfo(k)
          return (
            <button key={i} type="button" onClick={() => onDay(k)} title={info.title}
              style={{ position: 'relative', minHeight: 44, borderRadius: 6, border: k === todayYmd() ? '2px solid var(--ink)' : '1px solid var(--rule)',
                background: info.holiday ? 'var(--red-wash)' : 'var(--sheet)', cursor: 'pointer', padding: '3px 3px 9px', textAlign: 'left', color: d.getDay() === 0 ? 'var(--ink-soft)' : 'var(--ink)' }}>
              <span style={{ fontWeight: 600 }}>{d.getDate()}</span>
              {info.project.length > 0 && <span style={{ position: 'absolute', top: 2, right: 4, fontSize: 13 }}>{info.project.map(c => <span key={c} style={{ color: c }}>★</span>)}</span>}
              {info.holiday && <div style={{ fontSize: 10, color: 'var(--red-ink)', lineHeight: 1.1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{info.holiday}</div>}
              <div style={{ position: 'absolute', left: 3, right: 3, bottom: 3, display: 'flex', gap: 2 }}>
                {info.groups.map(c => <span key={c} style={{ flex: 1, height: 4, borderRadius: 2, background: c }} />)}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function PlannerPage() {
  const [batches, setBatches] = useState([])
  const [tt, setTt] = useState({})                 // batchId → { days, source }
  const [existingHol, setExistingHol] = useState([])
  const [groups, setGroups] = useState(() => [newGroup(1)])
  const [hols, setHols] = useState([])             // draft holidays { from, to, title, batchIds: [] }
  const [holTitle, setHolTitle] = useState('Holiday')
  const [mode, setMode] = useState({ type: 'range', group: null })
  const [anchor, setAnchor] = useState(null)
  const [view, setView] = useState(() => { const t = new Date(); return { y: t.getFullYear(), m: t.getMonth() } })
  const [pv, setPv] = useState(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  const [done, setDone] = useState(null)

  useEffect(() => {
    api.get('/batches').then(r => setBatches((r.data.batches || []).filter(b => b.semester?.status === 'active' && b.isActive !== false)))
    api.get('/settings/timetables').then(r => setTt(Object.fromEntries(r.data.batches.map(b => [b._id, b]))))
    api.get('/settings/holidays').then(r => setExistingHol(r.data.holidays))
  }, [])
  useEffect(() => { if (!mode.group && groups[0]) setMode(m => ({ ...m, group: groups[0].id })) }, [groups])

  const color = (g) => COLORS[groups.findIndex(x => x.id === g.id) % COLORS.length]
  const used = useMemo(() => new Map(groups.flatMap(g => g.batchIds.map(b => [b, g.id]))), [groups])
  const setGroup = (id, patch) => { setGroups(gs => gs.map(g => g.id === id ? { ...g, ...patch } : g)); setPv(null) }
  const cur = groups.find(g => g.id === mode.group)

  function dayInfo(k) {
    const h = hols.find(x => k >= x.from && k <= x.to) || existingHol.find(x => k >= x.from && k <= x.to)
    return {
      holiday: h ? h.title : null,
      groups: groups.filter(g => g.start && k >= g.start && k <= (g.end || g.start)).map(color),
      project: groups.filter(g => g.projectDay === k || Object.values(g.projectDays).includes(k)).map(color),
      title: [h && `Holiday: ${h.title}`, ...groups.filter(g => g.start && k >= g.start && k <= (g.end || g.start)).map(g => g.name)].filter(Boolean).join(' · '),
    }
  }
  function onDay(k) {
    setPv(null)
    if (mode.type === 'holiday') {
      if (existingHol.some(x => k >= x.from && k <= x.to)) { setMsg({ t: 'That day is already a saved holiday (Settings → Holidays).', ok: false }); return }
      setHols(hs => hs.some(x => x.from === k) ? hs.filter(x => x.from !== k) : [...hs, { from: k, to: k, title: holTitle || 'Holiday', batchIds: [] }])
      return
    }
    if (!cur) return
    if (mode.type === 'project') { setGroup(cur.id, { projectDay: cur.projectDay === k ? '' : k }); return }
    if (!anchor) { setAnchor(k); setGroup(cur.id, { start: k, end: k }) }
    else { const [a, b] = anchor <= k ? [anchor, k] : [k, anchor]; setGroup(cur.id, { start: a, end: b }); setAnchor(null) }
  }
  const body = () => ({
    groups: groups.filter(g => g.batchIds.length).map(g => ({ name: g.name, batchIds: g.batchIds, start: g.start, end: g.end,
      projectDay: g.projectDay || undefined, projectDays: g.projectDays })),
    holidays: hols,
  })
  async function preview() {
    setBusy(true); setMsg(null)
    try { const { data } = await api.post('/cycles/planner/preview', body()); setPv(data) }
    catch (e) { setMsg({ t: e.response?.data?.message || 'Could not preview', ok: false }) }
    finally { setBusy(false) }
  }
  async function create() {
    setBusy(true)
    try { const { data } = await api.post('/cycles/planner', body()); setDone(data); setPv(null) }
    catch (e) { setMsg({ t: e.response?.data?.message || 'Could not create', ok: false }) }
    finally { setBusy(false) }
  }
  function setBatchProject(r, day) {
    const g = groups.find(x => x.name === r.group); if (!g) return
    setGroup(g.id, { projectDays: { ...g.projectDays, [r.batchId]: day } })
  }

  if (done) return (
    <div className="page">
      <h1 className="page-title">Cycles created</h1>
      <div className="banner banner--success" style={{ marginTop: 14 }}>{done.created.length} cycle(s) created{done.holidays ? `, ${done.holidays} holiday(s) marked` : ''}. Each has dated class rows — trainers now fill the topics.</div>
      <div className="table-wrap sheet" style={{ borderRadius: 10 }}>
        <table className="table table--compact"><thead><tr><th>Batch</th><th>Cycle</th><th>Dates</th><th>Project day</th><th className="num">Classes</th></tr></thead>
          <tbody>{done.created.map(c => <tr key={c.cycleId}><td>{c.batch}</td><td>Cycle {c.number}</td><td>{fmtDay(c.start)} – {fmtDay(c.end)}</td><td>{fmtDay(c.projectDay)}</td><td className="num">{c.classes}</td></tr>)}</tbody></table>
      </div>
      <p style={{ marginTop: 14 }}><Link to="/plans"><button className="btn btn--primary">Open Class plans</button></Link> <span className="muted" style={{ fontSize: 13 }}>— trainers can fill their empty rows now (no need to unlock).</span></p>
    </div>
  )

  return (
    <div className="page">
      <h1 className="page-title">Plan new cycles</h1>
      <p className="muted" style={{ marginTop: 4, marginBottom: 14 }}>Make groups of batches, mark each group’s dates, holidays and project days on the calendar, preview, then create. Batches with different timetables (e.g. 1st year) can share a group — each gets its own class days.</p>
      {msg && <div className={`banner ${msg.ok ? 'banner--success' : 'banner--error'}`}>{msg.t}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 360px) 1fr', gap: 16, alignItems: 'start' }} className="planner-grid">
        <div style={{ display: 'grid', gap: 12 }}>
          {groups.map((g, gi) => (
            <div key={g.id} className="sheet" style={{ padding: 12, borderLeft: `5px solid ${color(g)}`, ...(mode.group === g.id && mode.type !== 'holiday' ? { boxShadow: `0 0 0 2px ${color(g)}` } : {}) }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input className="ctl" style={{ height: 32, fontWeight: 600 }} value={g.name} onChange={e => setGroup(g.id, { name: e.target.value })} />
                {groups.length > 1 && <button className="btn btn--quiet btn--sm" style={{ color: 'var(--red-ink)' }} onClick={() => { setGroups(gs => gs.filter(x => x.id !== g.id)); setPv(null) }}>✕</button>}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, margin: '8px 0' }}>
                {batches.map(b => {
                  const on = g.batchIds.includes(b._id), other = used.has(b._id) && used.get(b._id) !== g.id, t = tt[b._id]
                  return (
                    <button key={b._id} type="button" disabled={other}
                      onClick={() => setGroup(g.id, { batchIds: on ? g.batchIds.filter(x => x !== b._id) : [...g.batchIds, b._id] })}
                      className={`tag ${on ? 'tag--blue' : 'tag--muted'}`} style={{ cursor: other ? 'not-allowed' : 'pointer', opacity: other ? .4 : 1, border: on ? `1px solid ${color(g)}` : undefined }}
                      title={t ? `Class days: ${t.days.map(d => WD[(d + 6) % 7]).join(', ') || 'not set'}${t.source !== 'saved' ? ' (not confirmed)' : ''}` : ''}>
                      {on ? '✓ ' : ''}{b.name}{t && t.source !== 'saved' ? ' ⚠' : ''}
                    </button>
                  )
                })}
              </div>
              {g.batchIds.some(id => tt[id]?.source !== 'saved') && <p style={{ fontSize: 12, color: 'var(--pencil)' }}>⚠ = class days not confirmed. <Link to="/settings">Confirm them in Settings</Link> first.</p>}
              <div style={{ fontSize: 13, display: 'grid', gap: 4 }}>
                <div><b>Dates:</b> {g.start ? `${fmtDay(g.start)} – ${fmtDay(g.end)}` : <span className="muted">not set</span>}</div>
                <div><b>Project day:</b> {g.projectDay ? fmtDay(g.projectDay) : <span className="muted">last class day of each batch</span>}</div>
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                <button className={`btn btn--sm ${mode.group === g.id && mode.type === 'range' ? 'btn--primary' : 'btn--secondary'}`} onClick={() => { setMode({ type: 'range', group: g.id }); setAnchor(null) }}>Set dates</button>
                <button className={`btn btn--sm ${mode.group === g.id && mode.type === 'project' ? 'btn--primary' : 'btn--secondary'}`} onClick={() => setMode({ type: 'project', group: g.id })}>★ Project day</button>
              </div>
            </div>
          ))}
          <button className="btn btn--secondary btn--sm" onClick={() => { const g = newGroup(groups.length + 1); setGroups(gs => [...gs, g]); setMode({ type: 'range', group: g.id }) }}>+ Add group</button>

          <div className="sheet" style={{ padding: 12, ...(mode.type === 'holiday' ? { boxShadow: '0 0 0 2px var(--red-ink)' } : {}) }}>
            <b>Holidays</b>
            <div style={{ display: 'flex', gap: 6, margin: '8px 0' }}>
              <input className="ctl" style={{ height: 32 }} value={holTitle} onChange={e => setHolTitle(e.target.value)} placeholder="Reason" />
              <button className={`btn btn--sm ${mode.type === 'holiday' ? 'btn--primary' : 'btn--secondary'}`} onClick={() => setMode(m => ({ ...m, type: 'holiday' }))}>Click days</button>
            </div>
            {hols.length === 0 ? <p className="muted" style={{ fontSize: 12 }}>New holidays apply to all batches. Saved holidays already show in red.</p>
              : <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>{hols.map(h => <li key={h.from}>{fmtDay(h.from)} — {h.title} <button className="btn btn--quiet" style={{ fontSize: 12 }} onClick={() => setHols(hs => hs.filter(x => x.from !== h.from))}>remove</button></li>)}</ul>}
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14 }}>
              {mode.type === 'holiday' ? <b style={{ color: 'var(--red-ink)' }}>Click days to mark / unmark holidays</b>
                : mode.type === 'project' ? <b>Click the project day for {cur?.name}</b>
                : <b>{anchor ? `Now click the END date for ${cur?.name}` : `Click the START date for ${cur?.name}`}</b>}
            </span>
            <span style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn--secondary btn--sm" onClick={() => setView(v => v.m === 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m: v.m - 1 })}>‹</button>
              <button className="btn btn--secondary btn--sm" onClick={() => setView(v => v.m === 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: v.m + 1 })}>›</button>
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12 }}>
            <Month year={view.y} month={view.m} dayInfo={dayInfo} onDay={onDay} />
            <Month year={view.m === 11 ? view.y + 1 : view.y} month={(view.m + 1) % 12} dayInfo={dayInfo} onDay={onDay} />
          </div>
          <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
            <button className="btn btn--primary" disabled={busy || !groups.some(g => g.batchIds.length && g.start)} onClick={preview}>Preview</button>
          </div>

          {pv && (
            <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
              {pv.errors.map((e, i) => <div key={i} className="banner banner--error">{e}</div>)}
              <div className="table-wrap sheet" style={{ borderRadius: 10 }}>
                <table className="table table--compact">
                  <thead><tr><th>Batch</th><th>Cycle</th><th>Class days</th><th>Classes</th><th>Project day</th><th>Notes</th></tr></thead>
                  <tbody>{pv.batches.map(r => (
                    <tr key={r.batchId} className={r.errors.length ? 'is-flagged' : ''}>
                      <td><b>{r.batch}</b><div className="muted" style={{ fontSize: 12 }}>{r.group} · {(r.days || []).join(', ')}</div></td>
                      <td>{r.number ? `Cycle ${r.number}` : '—'}</td>
                      <td>{r.classDays ? r.classDays.length : '—'}{r.holidays?.length ? <div className="muted" style={{ fontSize: 12 }}>{r.holidays.length} holiday(s) skipped</div> : null}</td>
                      <td>{r.firstClass ? `${r.firstClass}–${r.lastClass}` : '—'}</td>
                      <td>{r.classDays ? (
                        <select className="ctl" style={{ height: 30, width: 'auto' }} value={r.projectDay || ''} onChange={e => setBatchProject(r, e.target.value)}>
                          {!r.classDays.includes(r.projectDay) && r.projectDay && <option value={r.projectDay}>{fmtDay(r.projectDay)} (not a class day)</option>}
                          {r.classDays.map(d => <option key={d} value={d}>{fmtDay(d)}</option>)}
                        </select>) : '—'}</td>
                      <td style={{ fontSize: 13 }}>
                        {r.errors.map((e, i) => <div key={i} style={{ color: 'var(--red-ink)' }}>✕ {e}</div>)}
                        {r.warnings.map((w, i) => <div key={i} style={{ color: 'var(--pencil)' }}>{w}</div>)}
                      </td>
                    </tr>))}</tbody>
                </table>
              </div>
              {pv.affected.length > 0 && <div className="banner banner--pencil">New holidays fall on classes already planned: {pv.affected.map(x => `${x.batch} class ${x.number} (${fmtDay(x.date)})`).join(', ')}. They are not moved — re-plan them on the Class plans page.</div>}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button className="btn btn--primary" disabled={busy || !pv.ok} onClick={create}>Create {pv.batches.length} cycle(s)</button>
                {!pv.ok && <span style={{ fontSize: 13, color: 'var(--red-ink)' }}>Fix the red items first (changing a project day above updates the plan — press Preview again).</span>}
              </div>
            </div>
          )}
        </div>
      </div>
      <style>{`@media (max-width: 860px) { .planner-grid { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  )
}
