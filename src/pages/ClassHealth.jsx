// Class health — every class of every batch for a day, a week or a cycle:
// was it logged on time, attendance, what students said, and what needs a look.
// One coloured square per class day; click a batch for the class-by-class view.
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'

const IST = { timeZone: 'Asia/Kolkata' }
const fmtDay = (s) => s ? new Date(s + 'T12:00:00+05:30').toLocaleDateString('en-IN', { ...IST, weekday: 'short', day: 'numeric', month: 'short' }) : '—'
const todayYmd = () => new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10)
const addDays = (s, n) => { const d = new Date(s + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }
const weekStart = (s) => { const d = new Date(s + 'T12:00:00Z'); const w = d.getUTCDay() || 7; return addDays(s, 1 - w) }

// What each class looks like on the strip
function look(c) {
  if (c.state === 'holiday') return { bg: 'var(--blue-wash)', bd: 'var(--blue-ink)', label: `Holiday${c.holiday ? ': ' + c.holiday : ''}` }
  if (c.state === 'upcoming') return { bg: 'transparent', bd: 'var(--rule-strong)', label: 'Coming up' }
  if (c.state === 'open') return { bg: 'transparent', bd: 'var(--red-ink)', label: 'Today, not logged yet' }
  if (c.state === 'missing') return { bg: 'var(--red-ink)', bd: 'var(--red-ink)', label: 'Not logged' }
  if (c.state === 'no-class') return { bg: 'var(--rule)', bd: 'var(--rule-strong)', label: 'No class (admin)' }
  if (c.state === 'not-covered') return { bg: 'var(--red-wash)', bd: 'var(--red-ink)', label: 'Not done' }
  const ok = c.state === 'done' && c.flags.length === 0
  return ok ? { bg: 'var(--tick)', bd: 'var(--tick)', label: 'Done, on time, no flags' }
    : { bg: 'var(--pencil-wash)', bd: 'var(--pencil)', label: `${c.state === 'partial' ? 'Partly done' : 'Done'} — ${c.flags.join(', ') || 'check'}` }
}
const STATE = { done: ['Done', 'tag--tick'], partial: ['Partly', 'tag--pencil'], 'not-covered': ['Not done', 'tag--red'], missing: ['Not logged', 'tag--red'],
  open: ['Not logged yet', 'tag--red'], holiday: ['Holiday', 'tag--blue'], upcoming: ['Coming up', 'tag--muted'], 'no-class': ['No class', 'tag--muted'] }
const tone = (v, good, bad) => v == null ? 'var(--ink-soft)' : v >= good ? 'var(--tick)' : v < bad ? 'var(--red-ink)' : 'var(--pencil)'

function Tile({ label, value, sub, color }) {
  return (
    <div className="sheet" style={{ padding: '12px 14px' }}>
      <div className="muted" style={{ fontSize: 12 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: color || 'var(--ink)', lineHeight: 1.25 }}>{value}</div>
      {sub && <div className="muted" style={{ fontSize: 12 }}>{sub}</div>}
    </div>
  )
}

function Strip({ classes }) {
  return (
    <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', maxWidth: 260 }}>
      {classes.map(c => { const l = look(c); return (
        <span key={c.date} title={`${fmtDay(c.date)}${c.number ? ` · class ${c.number}` : ''} — ${l.label}`}
          style={{ width: 14, height: 14, borderRadius: 3, background: l.bg, border: `1.5px solid ${l.bd}`, display: 'inline-block' }} />) })}
    </div>
  )
}

function BatchDetail({ b }) {
  return (
    <div className="table-wrap" style={{ marginTop: 8 }}>
      <table className="table table--compact">
        <thead><tr><th>Day</th><th>Class</th><th>Status</th><th>Log</th><th className="num">Present</th><th>Students said</th><th>Look at</th></tr></thead>
        <tbody>{b.classes.map(c => (
          <tr key={c.date}>
            <td style={{ whiteSpace: 'nowrap' }}>{fmtDay(c.date)}</td>
            <td style={{ maxWidth: 260 }}>{c.number ? <><span className="muted">{c.number} · </span>{c.title || <span className="muted">no topic</span>}</> : <span className="muted">—</span>}</td>
            <td><span className={`tag ${STATE[c.state]?.[1] || 'tag--muted'}`}>{STATE[c.state]?.[0] || c.state}</span></td>
            <td style={{ fontSize: 13 }}>{c.log ? <>{c.log.by}{' · '}<span style={{ color: c.log.onTime ? 'var(--tick)' : 'var(--pencil)' }}>{c.log.onTime ? 'on time' : 'late'}</span>{c.log.github ? ` · GitHub ${c.log.github}` : ''}{c.log.notes ? <div className="muted" style={{ fontSize: 12 }}>{c.log.notes.slice(0, 90)}</div> : null}</> : '—'}</td>
            <td className="num" style={{ color: tone(c.attendance?.pct, 75, 50) }}>{c.attendance ? `${c.attendance.present}/${c.attendance.total}` : '—'}</td>
            <td style={{ fontSize: 13 }}>{c.pulse ? <><b style={{ color: tone(c.pulse.coveredPct, 75, 50) }}>{c.pulse.coveredPct}%</b> covered · {c.pulse.understanding}/5 <span className="muted">({c.pulse.responses})</span></> : <span className="muted">—</span>}</td>
            <td>{c.flags.map(f => <span key={f} className="tag tag--pencil" style={{ marginRight: 4, marginBottom: 2 }}>{f}</span>)}</td>
          </tr>))}</tbody>
      </table>
    </div>
  )
}

export default function ClassHealth({ isAdmin }) {
  const t = todayYmd()
  const [range, setRange] = useState({ kind: 'today', from: t, to: t })
  const [scope, setScope] = useState('mine')          // mine | all | trainer:<id>
  const [d, setD] = useState(null), [err, setErr] = useState(null), [open, setOpen] = useState({})
  const [periods, setPeriods] = useState([])

  useEffect(() => {
    let off = false
    setErr(null)
    api.get('/meeting/health', { params: { from: range.from, to: range.to } })
      .then(r => { if (!off) { setD(r.data); if (r.data.periods?.length) setPeriods(r.data.periods) } })
      .catch(e => !off && setErr(e.response?.data?.message || 'Could not load'))
    return () => { off = true }
  }, [range.from, range.to])

  const trainers = useMemo(() => {
    const m = new Map(); (d?.batches || []).forEach(b => b.trainers.forEach(x => m.set(String(x.id), x.name)))
    return [...m].sort((a, b) => a[1].localeCompare(b[1]))
  }, [d])
  const shown = useMemo(() => (d?.batches || []).filter(b =>
    scope === 'all' ? true : scope === 'mine' ? b.mine : b.trainers.some(x => `trainer:${x.id}` === scope)), [d, scope])
  const mineCount = (d?.batches || []).filter(b => b.mine).length
  useEffect(() => { if (d && scope === 'mine' && mineCount === 0) setScope('all') }, [d, mineCount])

  // totals over what is shown
  const tot = useMemo(() => {
    const s = shown.map(b => b.summary), sum = (k) => s.reduce((a, x) => a + (x[k] || 0), 0)
    const ans = sum('answers'), seats = sum('seats')
    return { due: sum('due'), onTime: sum('onTime'), missing: sum('missing'), flags: sum('flags'), disagree: sum('disagree'), answers: ans,
      attendancePct: seats ? Math.round(100 * sum('present') / seats) : null,
      coveredPct: ans ? Math.round(s.reduce((a, x) => a + (x.coveredPct || 0) * x.answers, 0) / ans) : null,
      understanding: ans ? Math.round(10 * s.reduce((a, x) => a + (x.understanding || 0) * x.answers, 0) / ans) / 10 : null }
  }, [shown])

  const pick = (kind, from, to) => setRange({ kind, from, to })
  const btn = (k) => `btn btn--sm ${range.kind === k ? 'btn--primary' : 'btn--secondary'}`

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div className="sheet" style={{ padding: 14, display: 'grid', gap: 10 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <button className={btn('today')} onClick={() => pick('today', t, t)}>Today</button>
          <button className={btn('yesterday')} onClick={() => pick('yesterday', addDays(t, -1), addDays(t, -1))}>Yesterday</button>
          <button className={btn('week')} onClick={() => pick('week', weekStart(t), addDays(weekStart(t), 5))}>This week</button>
          <select className="ctl" style={{ width: 'auto', height: 32 }} value={range.kind.startsWith('cycle:') ? range.kind : ''}
            onChange={e => { const p = periods.find(x => `cycle:${x.key}` === e.target.value); if (p) pick(`cycle:${p.key}`, p.start, p.end) }}>
            <option value="">Whole cycle…</option>
            {[...periods].reverse().map(p => <option key={p.key} value={`cycle:${p.key}`}>Cycle {p.numbers.join('/')} · {fmtDay(p.start)} – {fmtDay(p.end)}</option>)}
          </select>
          <span className="muted" style={{ fontSize: 13, marginLeft: 4 }}>or</span>
          <input type="date" className="ctl" style={{ width: 'auto', height: 32 }} value={range.from} onChange={e => e.target.value && pick('custom', e.target.value, e.target.value > range.to ? e.target.value : range.to)} />
          <span className="muted">to</span>
          <input type="date" className="ctl" style={{ width: 'auto', height: 32 }} value={range.to} onChange={e => e.target.value && pick('custom', range.from, e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* a trainer only ever gets their own batches from the server; the filters are for admin / management */}
          {d?.seesAll ? <>
            {mineCount > 0 && <button className={`btn btn--sm ${scope === 'mine' ? 'btn--primary' : 'btn--secondary'}`} onClick={() => setScope('mine')}>My batches</button>}
            <button className={`btn btn--sm ${scope === 'all' ? 'btn--primary' : 'btn--secondary'}`} onClick={() => setScope('all')}>All batches</button>
            <select className="ctl" style={{ width: 'auto', height: 32 }} value={scope.startsWith('trainer:') ? scope : ''} onChange={e => setScope(e.target.value || 'all')}>
              <option value="">By trainer…</option>
              {trainers.map(([id, n]) => <option key={id} value={`trainer:${id}`}>{n}</option>)}
            </select>
          </> : <span className="muted" style={{ fontSize: 13 }}>Your batches</span>}
          <span className="muted" style={{ fontSize: 12, marginLeft: 'auto' }}>{fmtDay(range.from)}{range.to !== range.from ? ` – ${fmtDay(range.to)}` : ''}</span>
        </div>
      </div>

      {err && <div className="banner banner--error">{err}</div>}
      {!d ? <p className="muted">Loading…</p> : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
            <Tile label="Logged on time" value={tot.due ? `${Math.round(100 * tot.onTime / tot.due)}%` : '—'} sub={`${tot.onTime} of ${tot.due} classes`} color={tone(tot.due ? 100 * tot.onTime / tot.due : null, 90, 70)} />
            <Tile label="Not logged" value={tot.missing} sub="past classes" color={tot.missing ? 'var(--red-ink)' : 'var(--tick)'} />
            <Tile label="Attendance" value={tot.attendancePct != null ? `${tot.attendancePct}%` : '—'} sub="in logged classes" color={tone(tot.attendancePct, 75, 50)} />
            <Tile label="Students say covered" value={tot.coveredPct != null ? `${tot.coveredPct}%` : '—'} sub={`${tot.answers} answers`} color={tone(tot.coveredPct, 75, 50)} />
            <Tile label="Understood" value={tot.understanding != null ? `${tot.understanding}/5` : '—'} sub="students' own rating" color={tone(tot.understanding, 3.8, 3)} />
            <Tile label="To look at" value={tot.flags} sub={tot.disagree ? `${tot.disagree} where students disagree` : 'flags'} color={tot.flags ? 'var(--pencil)' : 'var(--tick)'} />
          </div>

          <div className="table-wrap sheet" style={{ borderRadius: 10 }}>
            <table className="table table--stack">
              <thead><tr><th>Batch</th><th>Every class</th><th className="num">On time</th><th className="num">Attendance</th><th className="num">Covered</th><th className="num">Understood</th><th className="num">Flags</th><th></th></tr></thead>
              <tbody>
                {shown.length === 0 && <tr><td colSpan={8} className="muted">No batches here.</td></tr>}
                {shown.map(b => { const s = b.summary, o = !!open[b.batchId]; return [
                  <tr key={b.batchId} style={{ cursor: 'pointer' }} onClick={() => setOpen(x => ({ ...x, [b.batchId]: !o }))}>
                    <td data-label="Batch"><b>{b.batch}</b><div className="muted" style={{ fontSize: 12 }}>{b.trainers.map(x => x.name).join(', ') || '—'}{b.cycles.length ? ` · cycle ${b.cycles.map(c => c.number).join('/')}` : ''}</div></td>
                    <td data-label="Every class">{b.classes.length ? <Strip classes={b.classes} /> : <span className="muted">no class</span>}</td>
                    <td data-label="On time" className="num" style={{ color: tone(s.due ? 100 * s.onTime / s.due : null, 90, 70) }}>{s.due ? `${s.onTime}/${s.due}` : '—'}{s.missing ? <div style={{ fontSize: 12, color: 'var(--red-ink)' }}>{s.missing} not logged</div> : null}</td>
                    <td data-label="Attendance" className="num" style={{ color: tone(s.attendancePct, 75, 50) }}>{s.attendancePct != null ? `${s.attendancePct}%` : '—'}</td>
                    <td data-label="Covered" className="num" style={{ color: tone(s.coveredPct, 75, 50) }}>{s.coveredPct != null ? `${s.coveredPct}%` : '—'}</td>
                    <td data-label="Understood" className="num" style={{ color: tone(s.understanding, 3.8, 3) }}>{s.understanding != null ? s.understanding : '—'}</td>
                    <td data-label="Flags" className="num" style={{ color: s.flags ? 'var(--pencil)' : 'var(--ink-soft)', fontWeight: s.flags ? 700 : 400 }}>{s.flags}</td>
                    <td data-label=""><span className="btn btn--quiet btn--sm">{o ? 'Hide ▴' : 'Classes ▾'}</span></td>
                  </tr>,
                  o && <tr key={b.batchId + '-d'}><td colSpan={8} style={{ background: 'var(--page)' }}>
                    <BatchDetail b={b} />
                    <div style={{ marginTop: 6, fontSize: 13 }}><Link to={`/batch/${b.batchId}`}>Open batch</Link>{b.cycles[0] && <> · <Link to={`/cycle/${b.cycles.at(-1).id}/plan`}>Cycle plan</Link></>}</div>
                  </td></tr>,
                ] })}
              </tbody>
            </table>
          </div>
          <div className="muted" style={{ fontSize: 12, display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
            {[['var(--tick)', 'var(--tick)', 'done, on time'], ['var(--pencil-wash)', 'var(--pencil)', 'done but late / flagged / partly'], ['var(--red-ink)', 'var(--red-ink)', 'not logged'], ['var(--red-wash)', 'var(--red-ink)', 'not done'], ['var(--blue-wash)', 'var(--blue-ink)', 'holiday'], ['transparent', 'var(--rule-strong)', 'coming up']].map(([bg, bd, l]) => (
              <span key={l} style={{ display: 'inline-flex', gap: 5, alignItems: 'center' }}><span style={{ width: 12, height: 12, borderRadius: 3, background: bg, border: `1.5px solid ${bd}` }} />{l}</span>))}
          </div>
        </>
      )}
    </div>
  )
}
