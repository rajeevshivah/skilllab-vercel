// Trainer Performance — what management sees, visible to every trainer too.
// Per cycle: deadline, who finished report/marks/Top 3/plan and when (trainer
// or admin), daily-log punctuality, and a score out of 100.
import { Fragment, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'
import { useAuth } from '../context/AuthContext'
import PageHelp from '../components/PageHelp'

const IST = { timeZone: 'Asia/Kolkata' }
const fmtDT = (d) => d ? new Date(d).toLocaleString('en-IN', { ...IST, weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '—'
const fmtDay = (ymd) => ymd ? new Date(ymd + 'T12:00:00+05:30').toLocaleDateString('en-IN', { ...IST, weekday: 'short', day: 'numeric', month: 'short' }) : '—'
const toIstInput = (d) => d ? new Date(new Date(d).getTime() + 330 * 60000).toISOString().slice(0, 16) : ''

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

function Details({ r, isAdmin, onSaved }) {
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
  const [number, setNumber] = useState(null)
  const [open, setOpen] = useState(null)
  const [err, setErr] = useState('')
  const [roundDeadline, setRoundDeadline] = useState('')

  async function load(n = number) {
    try {
      const { data } = await api.get('/performance', { params: n ? { number: n } : {} })
      setData(data); setNumber(data.number); setErr('')
    } catch (e) { setErr(e.response?.data?.message || 'Could not load') }
  }
  useEffect(() => { load(null) }, [])

  async function patchRound(body) {
    try { await api.patch(`/performance/round/${number}`, body); await load(number) }
    catch (e) { setErr(e.response?.data?.message || 'Could not save') }
  }

  if (err && !data) return <div className="page"><div className="banner banner--error">{err}</div></div>
  if (!data) return <div className="page"><p className="muted">Loading…</p></div>

  const round = data.rounds.find(r => r.number === data.number)
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

      {data.rounds.length === 0 ? <div className="empty"><h2>No cycles yet</h2><p>Cycles appear here once they are created.</p></div> : (<>
        <div data-tour="perf-cycle" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
          <label style={{ fontWeight: 600 }}>Cycle&nbsp;
            <select className="ctl" style={{ height: 34, width: 'auto' }} value={number || ''} onChange={e => { setOpen(null); load(Number(e.target.value)) }}>
              {data.rounds.map(r => <option key={r.number} value={r.number}>Cycle {r.number}{r.tracked ? '' : ' (not tracked)'}</option>)}
            </select>
          </label>
          {round && !round.tracked && <span className="tag tag--muted">Not tracked — shown for information, no score</span>}
          {isAdmin && round && (
            <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginLeft: 'auto' }}>
              <button className="btn btn--secondary btn--sm" onClick={() => patchRound({ tracked: !round.tracked })}>
                {round.tracked ? 'Stop tracking this cycle' : 'Start tracking this cycle'}
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

        <h2 style={{ fontSize: 17, fontWeight: 700, margin: '18px 0 8px' }}>Batches — Cycle {data.number}</h2>
        <div className="table-wrap sheet" data-tour="perf-batches" style={{ borderRadius: 10 }}>
          <table className="table table--compact">
            <thead><tr><th>Batch</th><th>Trainer(s)</th><th>Project day</th><th>Deadline</th><th>Completed</th><th>Status</th><th>Score</th><th></th></tr></thead>
            <tbody>
              {rows.map(r => (
                <Fragment key={r.cycleId}>
                  <tr className={r.overall === 'late' || r.overall === 'missing' ? 'is-flagged' : ''}>
                    <td><b>{r.batch}</b><div className="muted" style={{ fontSize: 12 }}>{r.track}</div></td>
                    <td>{r.trainers.map(t => t.name).join(', ') || '—'}</td>
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
                      <Details r={r} isAdmin={isAdmin} onSaved={() => load(number)} />
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
