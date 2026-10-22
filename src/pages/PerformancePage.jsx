// Trainer Performance — what management sees, visible to every trainer too.
// Grouped by deadline period. Per batch: deadline, who finished report/marks/
// Top 3/plan and when (trainer or admin), lead + task owners, per-trainer
// scores, and "waiting on" requests that the admin approves.
import { Fragment, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'
import { useAuth } from '../context/AuthContext'
import PageHelp from '../components/PageHelp'

const IST = { timeZone: 'Asia/Kolkata' }
const fmtDT = (d) => d ? new Date(d).toLocaleString('en-IN', { ...IST, weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '—'
const fmtDay = (ymd) => ymd ? new Date(ymd + 'T12:00:00+05:30').toLocaleDateString('en-IN', { ...IST, weekday: 'short', day: 'numeric', month: 'short' }) : '—'
const toIstInput = (d) => d ? new Date(new Date(d).getTime() + 330 * 60000).toISOString().slice(0, 16) : ''
const TASKS = [['report', 'Cycle form'], ['marks', 'Marks'], ['top3', 'Top 3'], ['plan', 'Cycle plan']]
const periodLabel = (p) => `Due ${fmtDay(p.key)} · Cycle${p.numbers.length > 1 ? 's' : ''} ${p.numbers.join(', ')} · ${p.batches} batch${p.batches === 1 ? '' : 'es'}${p.tracked ? '' : ' (not tracked)'}`

const STATE = {
  'on-time': ['On time', 'tag--tick'],
  late:      ['Late', 'tag--red'],
  admin:     ['Done by admin', 'tag--pencil'],
  missing:   ['Not done', 'tag--red'],
  pending:   ['Pending', 'tag--muted'],
  excused:   ['Excused', 'tag--blue'],
  counted:   ['', 'tag--muted'],
}
function Tag({ state, extra }) {
  const [label, cls] = STATE[state] || [state, 'tag--muted']
  return <span className={`tag ${cls}`}>{label}{extra ? ` ${extra}` : ''}</span>
}
function ScoreBar({ score }) {
  if (score == null) return <span className="muted">—</span>
  const color = score >= 75 ? 'var(--tick)' : score >= 50 ? 'var(--blue-ink)' : score >= 35 ? 'var(--pencil)' : 'var(--red-ink)'
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <b style={{ color, minWidth: 28, textAlign: 'right' }}>{score}</b>
      <span style={{ width: 70, height: 6, borderRadius: 3, background: 'var(--rule)', overflow: 'hidden' }}>
        <span style={{ display: 'block', width: `${score}%`, height: '100%', background: color }} />
      </span>
    </span>
  )
}

function ItemLine({ label, item, who }) {
  const extra = item?.state === 'late' && item.lateDays ? `by ${item.lateDays} d` : ''
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', padding: '5px 0', borderBottom: '1px dashed var(--rule)' }}>
      <span style={{ width: 92, fontWeight: 600 }}>{label}</span>
      <Tag state={item?.state} extra={extra} />
      <span className="muted" style={{ fontSize: 13 }}>
        {who ? <>{who.admin ? <b style={{ color: 'var(--pencil)' }}>Updated by admin ({who.by})</b> : who.by} · {fmtDT(who.at)}</> : ''}
      </span>
      <span className="muted" style={{ marginLeft: 'auto', fontSize: 12 }}>{item?.max ? `${Math.round(item.points * 10) / 10}/${item.max}` : ''}</span>
    </div>
  )
}

function Owners({ r, isAdmin, save }) {
  const [lead, setLead] = useState(r.lead?.id || '')
  const [own, setOwn] = useState(Object.fromEntries(TASKS.map(([k]) => [k, r.owners?.[k]?.id || ''])))
  if (!r.trainers.length) return null
  if (!isAdmin || r.trainers.length < 2) return (
    <div style={{ fontSize: 13.5, margin: '0 0 10px' }}>
      <b>Lead:</b> {r.lead?.name || '—'}{r.trainers.length > 1 && <> · {TASKS.map(([k, l]) => <span key={k}>{l}: <b>{r.owners?.[k]?.name || '—'}</b>{k !== 'plan' ? ' · ' : ''}</span>)}</>}
    </div>
  )
  const sel = (v, on) => (
    <select className="ctl" style={{ height: 30, width: 'auto' }} value={v} onChange={e => on(e.target.value)}>
      {r.trainers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
    </select>
  )
  return (
    <div style={{ background: '#fff', border: '1px solid var(--rule)', borderRadius: 10, padding: 10, margin: '0 0 12px' }}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>Who is responsible (admin)</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', fontSize: 13 }}>
        <label>Lead {sel(lead, (v) => { setLead(v); setOwn(o => Object.fromEntries(Object.entries(o).map(([k, x]) => [k, x === lead ? v : x]))) })}</label>
        {TASKS.map(([k, l]) => <label key={k}>{l} {sel(own[k], (v) => setOwn(o => ({ ...o, [k]: v })))}</label>)}
        <button className="btn btn--primary btn--sm" onClick={() => save({ lead, owners: own })}>Save</button>
      </div>
      <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>Only the owner of a task is scored for it. Each class day counts for the trainer set on that class in the cycle plan.</div>
    </div>
  )
}

function Waits({ r, isAdmin, me, onSaved }) {
  const [item, setItem] = useState('')
  const [on, setOn] = useState('')
  const [note, setNote] = useState('')
  const [msg, setMsg] = useState('')
  const mine = ['report', 'marks', 'top3'].filter(k => r.owners?.[k]?.id === me && !r.items[k]?.at)
  const others = r.trainers.filter(t => t.id !== me)
  async function raise() {
    setMsg('Sending…')
    try { await api.post(`/performance/cycle/${r.cycleId}/wait`, { item, waitingOn: on, note }); setMsg('Sent — waiting for admin approval.'); onSaved() }
    catch (e) { setMsg(e.response?.data?.message || 'Could not send') }
  }
  async function decide(id, status) {
    try { await api.patch(`/performance/cycle/${r.cycleId}/wait/${id}`, { status }); onSaved() }
    catch (e) { setMsg(e.response?.data?.message || 'Could not save') }
  }
  if (!r.waits.length && !(mine.length && others.length)) return null
  const label = Object.fromEntries(TASKS)
  return (
    <div style={{ margin: '12px 0 0' }}>
      <div className="muted" style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Waiting on another trainer</div>
      {r.waits.map(w => (
        <div key={w.id} style={{ fontSize: 13.5, padding: '4px 0', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span className={`tag ${w.status === 'approved' ? 'tag--blue' : w.status === 'rejected' ? 'tag--muted' : 'tag--pencil'}`}>{w.status}</span>
          <span><b>{w.owner}</b> waiting on <b>{w.waitingOn}</b> for {label[w.item]} · {fmtDT(w.raisedAt)}{w.note ? ` — “${w.note}”` : ''}</span>
          {isAdmin && w.status === 'pending' && <>
            <button className="btn btn--primary btn--sm" onClick={() => decide(w.id, 'approved')}>Approve</button>
            <button className="btn btn--secondary btn--sm" onClick={() => decide(w.id, 'rejected')}>Reject</button>
          </>}
        </div>
      ))}
      {mine.length > 0 && others.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 6, fontSize: 13 }}>
          <select className="ctl" style={{ height: 30, width: 'auto' }} value={item} onChange={e => setItem(e.target.value)}>
            <option value="">My task…</option>{mine.map(k => <option key={k} value={k}>{label[k]}</option>)}
          </select>
          <select className="ctl" style={{ height: 30, width: 'auto' }} value={on} onChange={e => setOn(e.target.value)}>
            <option value="">is waiting on…</option>{others.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <input className="ctl" style={{ height: 30, width: 220 }} placeholder="What are you waiting for?" value={note} maxLength={300} onChange={e => setNote(e.target.value)} />
          <button className="btn btn--secondary btn--sm" disabled={!item || !on} onClick={raise}>Send to admin</button>
        </div>
      )}
      {msg && <div className="muted" style={{ fontSize: 12 }}>{msg}</div>}
    </div>
  )
}

function PerTrainer({ r }) {
  if (r.perTrainer.length < 2) return null
  const lbl = { report: 'form', marks: 'marks', top3: 'Top 3', plan: 'plan' }
  return (
    <div style={{ margin: '12px 0 0' }}>
      <div className="muted" style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Each trainer's own part</div>
      {r.perTrainer.map(p => {
        const blocked = Object.entries(p.items).filter(([, i]) => i.blocking).map(([k]) => lbl[k])
        return (
          <div key={p.id} style={{ fontSize: 13.5, padding: '3px 0', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <b style={{ minWidth: 150 }}>{p.name}{p.isLead ? ' ★ lead' : ''}</b>
            <span className="muted">owns: {p.owns.map(k => lbl[k]).join(', ') || 'none'} · class days: {p.items.logs?.days ?? 0}</span>
            {blocked.length > 0 && <span className="tag tag--red">held up: {blocked.join(', ')}</span>}
            <span style={{ marginLeft: 'auto' }}>{r.tracked ? <ScoreBar score={p.score} /> : <span className="muted">not tracked</span>}</span>
          </div>
        )
      })}
    </div>
  )
}

function Details({ r, isAdmin, me, onSaved }) {
  const [projectDate, setProjectDate] = useState(r.projectDate || '')
  const [deadline, setDeadline] = useState(toIstInput(r.deadline))
  const [excuse, setExcuse] = useState(r.excusedNote || '')
  const [msg, setMsg] = useState('')
  const L = r.items.logs, A = r.items.attendance, O = r.items.outcomes
  async function save(body) {
    setMsg('Saving…')
    try { await api.patch(`/performance/cycle/${r.cycleId}`, body); setMsg('Saved.'); onSaved() }
    catch (e) { setMsg(e.response?.data?.message || 'Could not save') }
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 18, padding: '6px 4px 4px' }}>
      <div>
        <Owners r={r} isAdmin={isAdmin} save={save} />
        <div className="muted" style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Cycle-end work (due {fmtDT(r.deadline)})</div>
        <ItemLine label="Cycle form" item={r.items.report} who={r.who.report} />
        <ItemLine label="Marks" item={r.items.marks} who={r.who.marks} />
        <ItemLine label="Top 3" item={r.items.top3} who={r.who.top3} />
        <div className="muted" style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', margin: '12px 0 4px' }}>During the cycle</div>
        <ItemLine label="Cycle plan" item={r.items.plan} who={r.who.plan} />
        <div style={{ fontSize: 13.5, lineHeight: 1.7, marginTop: 6 }}>
          <div><b>Daily logs:</b> {L.days ? <>{L.days} class day(s) — <span style={{ color: 'var(--tick)' }}>{L.onTime} same day</span>{L.late ? <>, <span style={{ color: 'var(--red-ink)' }}>{L.late} late</span></> : ''}{L.admin ? <>, <span style={{ color: 'var(--pencil)' }}>{L.admin} by admin</span></> : ''}{L.missing ? <>, <span style={{ color: 'var(--red-ink)' }}>{L.missing} not logged</span></> : ''}</> : 'no class days yet'}</div>
          <div><b>Attendance taken:</b> {A.days ? `${A.taken} of ${A.days} days` : '—'}</div>
          <div><b>Students Moderate or above:</b> {O.evaluated ? `${O.good} of ${O.evaluated} evaluated` : '—'}</div>
          {r.lateEdits > 0 && <div><b>Changes after the deadline:</b> {r.lateEdits}</div>}
          {r.excusedNote && <div><b>Excused:</b> {r.excusedNote}</div>}
        </div>
        <PerTrainer r={r} />
        <Waits r={r} isAdmin={isAdmin} me={me} onSaved={onSaved} />
      </div>
      {isAdmin && (
        <div style={{ background: 'var(--page)', border: '1px solid var(--rule)', borderRadius: 10, padding: 12, alignSelf: 'start' }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Admin: dates for this batch</div>
          <label style={{ display: 'block', fontSize: 13, marginBottom: 8 }}>Project day<br />
            <input className="ctl" type="date" value={projectDate} onChange={e => setProjectDate(e.target.value)} style={{ height: 32 }} />
          </label>
          <label style={{ display: 'block', fontSize: 13, marginBottom: 8 }}>Deadline (India time) — leave empty for “Saturday after project day, 7 PM”<br />
            <input className="ctl" type="datetime-local" value={deadline} onChange={e => setDeadline(e.target.value)} style={{ height: 32 }} />
          </label>
          <button className="btn btn--primary btn--sm" onClick={() => save({ projectDate, ...(deadline !== toIstInput(r.deadline) ? { deadline } : {}) })}>Save dates</button>{' '}
          <button className="btn btn--secondary btn--sm" onClick={() => { setDeadline(''); save({ projectDate, deadline: '' }) }}>Use default deadline</button>
          <label style={{ display: 'block', fontSize: 13, margin: '12px 0 8px' }}>Excuse (genuine reason — lateness not penalised, note is visible to all)<br />
            <input className="ctl" value={excuse} maxLength={300} onChange={e => setExcuse(e.target.value)} placeholder="e.g. Exam duty on Friday" style={{ height: 32, width: '100%' }} />
          </label>
          <button className="btn btn--secondary btn--sm" onClick={() => save({ excusedNote: excuse })}>{excuse ? 'Save excuse' : 'Clear excuse'}</button>
          {msg && <span className="muted" style={{ fontSize: 12, marginLeft: 8 }}>{msg}</span>}
        </div>
      )}
    </div>
  )
}

export default function PerformancePage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'superadmin'
  const [data, setData] = useState(null)
  const [period, setPeriod] = useState(null)
  const [open, setOpen] = useState(null)
  const [err, setErr] = useState('')
  const [roundDeadline, setRoundDeadline] = useState('')

  const me = String(user?.id || user?._id || '')
  async function load(p = period) {
    try {
      const { data } = await api.get('/performance', { params: p ? { period: p } : {} })
      setData(data); setPeriod(data.period); setErr('')
    } catch (e) { setErr(e.response?.data?.message || 'Could not load') }
  }
  useEffect(() => { load(null) }, [])

  async function patchRound(body) {
    try { await api.patch(`/performance/period/${period}`, body); await load(period) }
    catch (e) { setErr(e.response?.data?.message || 'Could not save') }
  }

  if (err && !data) return <div className="page"><div className="banner banner--error">{err}</div></div>
  if (!data) return <div className="page"><p className="muted">Loading…</p></div>

  const round = (data.periods || []).find(p => p.key === data.period)
  const rows = data.rows || []
  const count = (s) => rows.filter(r => r.overall === s).length

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <h1 className="page-title">Trainer Performance</h1>
        <PageHelp page="performance" role={user?.role} />
      </div>
      <p className="muted" style={{ fontSize: 14, marginTop: 2, marginBottom: 16 }}>
        {data.semester?.name || 'No active semester'} · Everyone sees this page exactly as management does.
      </p>
      {err && <div className="banner banner--error">{err}</div>}

      {!(data.periods || []).length ? <div className="empty"><h2>No cycles yet</h2><p>Cycles appear here once they are created.</p></div> : (<>
        <div data-tour="perf-cycle" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
          <label style={{ fontWeight: 600 }}>Show&nbsp;
            <select className="ctl" style={{ height: 34, width: 'auto' }} value={period || ''} onChange={e => { setOpen(null); load(e.target.value) }}>
              {data.periods.map(p => <option key={p.key} value={p.key}>{periodLabel(p)}</option>)}
            </select>
          </label>
          {round && !round.tracked && <span className="tag tag--muted">Not tracked — shown for information, no score</span>}
          {isAdmin && round && (
            <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginLeft: 'auto' }}>
              <button className="btn btn--secondary btn--sm" onClick={() => patchRound({ tracked: !round.tracked })}>
                {round.tracked ? 'Stop tracking these cycles' : 'Start tracking these cycles'}
              </button>
              <input className="ctl" type="datetime-local" value={roundDeadline} onChange={e => setRoundDeadline(e.target.value)} style={{ height: 30, width: 'auto' }} title="Same deadline for every batch (India time)" />
              <button className="btn btn--secondary btn--sm" disabled={!roundDeadline} onClick={() => patchRound({ deadline: roundDeadline })}>Set deadline for all</button>
            </span>
          )}
        </div>

        {rows.length > 0 && (
          <p data-tour="perf-summary" style={{ fontSize: 15, marginBottom: 14 }}>
            <b style={{ color: 'var(--tick)' }}>{count('on-time') + count('excused')} on time</b> ·{' '}
            <b style={{ color: 'var(--red-ink)' }}>{count('late')} late</b> ·{' '}
            <b style={{ color: 'var(--pencil)' }}>{count('admin')} done by admin</b> ·{' '}
            <b style={{ color: 'var(--red-ink)' }}>{count('missing')} not done</b>
            {count('pending') ? <> · <span className="muted">{count('pending')} not due yet</span></> : ''}
            <span className="muted"> — out of {rows.length} batch{rows.length === 1 ? '' : 'es'}</span>
          </p>
        )}

        <h2 style={{ fontSize: 17, fontWeight: 700, margin: '18px 0 8px' }}>Trainer scores</h2>
        <div className="table-wrap sheet" data-tour="perf-trainers" style={{ borderRadius: 10, marginBottom: 22 }}>
          <table className="table table--compact">
            <thead><tr><th>Trainer</th><th>Batches (this cycle)</th><th>This cycle</th><th>Semester average</th><th className="num">Cycles scored</th></tr></thead>
            <tbody>
              {data.trainers.length === 0 ? <tr><td colSpan={5} className="muted">No tracked cycles with scores yet.</td></tr> :
                data.trainers.map(t => (
                  <tr key={t.id} style={String(t.id) === String(user?.id || user?._id) ? { background: 'var(--blue-wash)' } : undefined}>
                    <td><b>{t.name}</b></td>
                    <td className="muted">{t.batches.join(', ') || '—'}</td>
                    <td><ScoreBar score={t.thisCycle} /></td>
                    <td><ScoreBar score={t.semesterAvg} /></td>
                    <td className="num">{t.cyclesScored}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <h2 style={{ fontSize: 17, fontWeight: 700, margin: '18px 0 8px' }}>Batches — due {fmtDay(data.period)}</h2>
        <div className="table-wrap sheet" data-tour="perf-batches" style={{ borderRadius: 10 }}>
          <table className="table table--compact">
            <thead><tr><th>Batch</th><th>Trainer(s) · ★ lead</th><th>Project day</th><th>Deadline</th><th>Completed</th><th>Status</th><th>Score</th><th></th></tr></thead>
            <tbody>
              {rows.map(r => (
                <Fragment key={r.cycleId}>
                  <tr className={r.overall === 'late' || r.overall === 'missing' ? 'is-flagged' : ''}>
                    <td><b>{r.batch}</b><div className="muted" style={{ fontSize: 12 }}>Cycle {r.number}{r.track ? ` · ${r.track}` : ''}</div></td>
                    <td>{r.trainers.map(t => t.id === r.lead?.id && r.trainers.length > 1 ? `★ ${t.name}` : t.name).join(', ') || '—'}
                      {r.waits.some(w => w.status === 'pending') && <div><span className="tag tag--pencil">waiting request</span></div>}</td>
                    <td>{fmtDay(r.projectDate)}</td>
                    <td>{fmtDT(r.deadline)}</td>
                    <td>{r.completedAt ? fmtDT(r.completedAt) : <span className="muted">—</span>}</td>
                    <td><Tag state={r.overall} extra={r.overall === 'late' && r.lateBy ? `by ${r.lateBy} d` : ''} /></td>
                    <td>{r.tracked ? <ScoreBar score={r.score} /> : <span className="muted">not tracked</span>}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button className="btn btn--secondary btn--sm" data-tour={r === rows[0] ? 'perf-details' : undefined}
                        onClick={() => setOpen(open === r.cycleId ? null : r.cycleId)}>{open === r.cycleId ? 'Hide ▴' : 'Details ▾'}</button>{' '}
                      <Link to={`/cycle/${r.cycleId}`}><button className="btn btn--quiet btn--sm">Report ▸</button></Link>
                    </td>
                  </tr>
                  {open === r.cycleId && (
                    <tr><td colSpan={8} style={{ background: 'var(--page)' }}>
                      <Details r={r} isAdmin={isAdmin} me={me} onSaved={() => load(period)} />
                    </td></tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </>)}
    </div>
  )
}
