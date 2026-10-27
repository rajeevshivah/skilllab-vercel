// Top students — who is doing well, worked out from marks, attendance and
// projects (backend: services/topStudents.js). Trainers see their own batches;
// admin and management see every batch, ranked together or batch by batch.
import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'
import { useAuth } from '../context/AuthContext'

const TIER = { excellent: ['Excellent', 'tag--tick'], good: ['Good', 'tag--blue'] }
const FILTERS = [['good', 'Good & above'], ['excellent', 'Excellent only'], ['all', 'Everyone']]
const pct = (v) => v == null ? '—' : `${Math.round(v)}%`

function ScoreBar({ v, w }) {
  if (v == null) return <span className="muted">—</span>
  const color = v >= w.excellent ? 'var(--tick)' : v >= w.good ? 'var(--blue-ink)' : 'var(--ink-soft)'
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <b style={{ minWidth: 26, textAlign: 'right', color }}>{v}</b>
      <span style={{ width: 70, height: 6, borderRadius: 3, background: 'var(--rule)', overflow: 'hidden' }}>
        <span style={{ display: 'block', height: '100%', width: `${v}%`, background: color }} />
      </span>
    </span>
  )
}

function Rows({ list, w, showBatch, start = 0 }) {
  return (<>
    {/* phones: one card per student */}
    <div className="only-mobile sheet" style={{ padding: 0 }}>
      {list.map((s, i) => (
        <div key={s.id} style={{ padding: '12px 14px', borderBottom: '1px solid var(--rule)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="muted" style={{ width: 22, textAlign: 'right', fontSize: 13 }}>{start + i + 1}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600 }}>{s.name} {s.flagged && '⭐'} {s.top3 > 0 && <span title="Top-3 finishes">🏆{s.top3 > 1 ? s.top3 : ''}</span>}</div>
              <div className="muted data" style={{ fontSize: 12 }}>{s.roll}{showBatch ? ` · ${s.batch.name}${s.batchRank ? ` #${s.batchRank}` : ''}` : ''}</div>
            </div>
            <ScoreBar v={s.score} w={w} />
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 6, paddingLeft: 32, fontSize: 12.5 }} className="muted">
            {s.tier ? <span className={`tag ${TIER[s.tier][1]}`}>{TIER[s.tier][0]}</span> : !s.cyclesEvaluated ? <span className="tag tag--muted">too early</span> : null}
            <span>Marks {pct(s.marks)}</span><span>Att. {pct(s.attendance)}</span>
            <span>Projects {s.projectsDue ? `${s.projectsSubmitted}/${s.projectsDue}` : '—'}</span>
          </div>
        </div>
      ))}
    </div>
    <div className="table-wrap sheet only-desktop" style={{ padding: 0 }}>
      <table className="table table--compact">
        <thead><tr>
          <th className="num">#</th><th>Student</th>{showBatch && <th>Batch</th>}<th>Score</th><th></th>
          <th className="num" title="Average cycle marks">Marks</th><th className="num">Attendance</th>
          <th className="num" title="Projects submitted / due">Projects</th><th className="num" title="Top-3 finishes">Top 3</th>
        </tr></thead>
        <tbody>
          {list.map((s, i) => (
            <tr key={s.id}>
              <td className="num muted">{start + i + 1}</td>
              <td>
                <div style={{ fontWeight: 600 }}>{s.name} {s.flagged && <span title="Flagged by the trainer">⭐</span>}</div>
                <div className="muted data" style={{ fontSize: 12 }}>{s.roll}{s.course ? ` · ${s.course}` : ''}{s.sem ? ` · sem ${s.sem}` : ''}</div>
              </td>
              {showBatch && <td><Link to={`/batch/${s.batch.id}`}>{s.batch.name}</Link>{s.batchRank && <div className="muted" style={{ fontSize: 12 }}>#{s.batchRank} in batch</div>}</td>}
              <td><ScoreBar v={s.score} w={w} /></td>
              <td>{s.tier ? <span className={`tag ${TIER[s.tier][1]}`}>{TIER[s.tier][0]}</span>
                : !s.cyclesEvaluated ? <span className="tag tag--muted" title="No cycle evaluated yet">too early</span> : null}</td>
              <td className="num" title={`${s.cyclesEvaluated} cycle(s) evaluated`}>{pct(s.marks)}</td>
              <td className="num" title={`${s.present}/${s.sessions} sessions`}>{pct(s.attendance)}</td>
              <td className="num">{s.projectsDue ? `${s.projectsSubmitted}/${s.projectsDue}` : '—'}</td>
              <td className="num">{s.top3 ? `🏆 ${s.top3}` : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </>)
}

export default function TopStudentsPage() {
  const { user } = useAuth()
  const [data, setData] = useState(null), [err, setErr] = useState('')
  const [batch, setBatch] = useState(''), [filter, setFilter] = useState('good')
  const [q, setQ] = useState(''), [grouped, setGrouped] = useState(false), [limit, setLimit] = useState(50)

  useEffect(() => {
    setErr('')
    api.get('/students/top', { params: batch ? { batch } : {} })
      .then(r => setData(r.data)).catch(e => setErr(e.response?.data?.message || 'Could not load'))
  }, [batch])

  const list = useMemo(() => {
    if (!data) return []
    const t = q.trim().toLowerCase()
    return data.students.filter(s =>
      (filter === 'all' || (filter === 'excellent' ? s.tier === 'excellent' : !!s.tier)) &&
      (!t || s.name.toLowerCase().includes(t) || (s.roll || '').toLowerCase().includes(t)))
  }, [data, filter, q])

  if (err) return <div className="page"><div className="banner banner--error">{err}</div></div>
  if (!data) return <div className="page muted">Loading…</div>
  const w = data.weights
  const many = data.batches.length > 1 && !batch
  const byBatch = data.batches.map(b => ({ ...b, rows: list.filter(s => String(s.batch.id) === String(b.id)) })).filter(b => b.rows.length)
  const everyoneEarly = data.students.length > 0 && data.students.every(s => !s.cyclesEvaluated)

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 className="page-title">Top students</h1>
          <p className="muted" style={{ fontSize: 14, marginTop: 4 }}>
            {user?.role === 'trainer' || user?.role === 'cotrainer' ? 'Your batches' : 'All batches'}{data.semester ? ` · ${data.semester.name}` : ''} ·{' '}
            <b>{data.counts.excellent}</b> excellent, <b>{data.counts.good}</b> good of {data.counts.students}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input className="ctl" style={{ width: 180 }} placeholder="Search name or roll" value={q} onChange={e => setQ(e.target.value)} />
          {data.batches.length > 1 && (
            <select className="ctl" style={{ width: 'auto' }} value={batch} onChange={e => { setBatch(e.target.value); setLimit(50) }}>
              <option value="">{user?.role === 'trainer' || user?.role === 'cotrainer' ? 'All my batches' : 'All batches'}</option>
              {data.batches.map(b => <option key={b.id} value={b.id}>{b.name}{b.track ? ` · ${b.track}` : ''}</option>)}
            </select>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', margin: '18px 0 14px' }}>
        <div className="tabs" style={{ borderBottom: 'none' }}>
          {FILTERS.map(([k, l]) => <button key={k} className={filter === k ? 'is-active' : ''} onClick={() => { setFilter(k); setLimit(50) }}>{l}</button>)}
        </div>
        {many && <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13 }}>
          <input type="checkbox" checked={grouped} onChange={e => setGrouped(e.target.checked)} /> Batch by batch
        </label>}
      </div>

      {everyoneEarly && <div className="banner banner--pencil">No cycle has marks yet, so nobody has a label yet. Scores so far come from attendance (and projects once a project day has passed).</div>}

      {!list.length ? <div className="sheet muted" style={{ padding: 24, textAlign: 'center' }}>
          {filter === 'all' ? 'No students yet.' : 'Nobody at this level yet — try "Everyone".'}</div>
        : grouped && many ? byBatch.map(b => (
          <section key={b.id} style={{ marginBottom: 22 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 8px' }}>{b.name} <span className="muted" style={{ fontWeight: 400, fontSize: 13 }}>{b.track} · {b.rows.length}</span></h2>
            <Rows list={b.rows.slice(0, 10)} w={w} showBatch={false} />
            {b.rows.length > 10 && <button className="btn btn--quiet btn--sm" style={{ marginTop: 6 }} onClick={() => { setBatch(String(b.id)); setGrouped(false) }}>See all {b.rows.length} →</button>}
          </section>
        ))
        : <>
          <Rows list={list.slice(0, limit)} w={w} showBatch={many} />
          {limit < list.length && <div style={{ textAlign: 'center', marginTop: 12 }}><button className="btn btn--secondary btn--sm" onClick={() => setLimit(l => l + 50)}>Show more ({list.length - limit} left)</button></div>}
        </>}

      <p className="muted" style={{ fontSize: 12.5, marginTop: 16, lineHeight: 1.6 }}>
        Score out of 100 = marks {w.marks} · attendance {w.attendance} · projects {w.projects} (weights). A part with no data yet is left out, not counted as zero.
        Excellent ≥ {w.excellent}, Good ≥ {w.good}; no label until a cycle is evaluated.
        {user?.role === 'superadmin' && <> <Link to="/settings?tab=Top%20students">Change these</Link>.</>}
      </p>
    </div>
  )
}
