import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'
import { useAuth } from '../context/AuthContext'

const TRACK_COLOR = {
  'AI/ML': 'var(--track-aiml)', 'MERN': 'var(--track-mern)',
  'Java': 'var(--track-java)', 'C': 'var(--track-c)',
}

function fmtDate(d) {
  if (!d) return '—'
  const dt = new Date(d)
  const days = Math.floor((Date.now() - dt) / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return `${days} days ago`
}

function fmtToday() {
  return new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [rows, setRows]       = useState([])
  const [semName, setSemName] = useState('')
  const [loading, setLoading] = useState(true)
  const [onlyFlagged, setOnlyFlagged] = useState(false)
  const isAdmin = user?.role === 'superadmin'

  useEffect(() => { load() }, [])
  async function load() {
    setLoading(true)
    try {
      const { data } = await api.get('/logs/oversight')
      setRows(data.rows || [])
      setSemName(data.semester?.name || '')
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  const isFlagged = (r) => r.totalTopics > 0 && (!r.loggedToday || r.planPct < 40)

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const fa = isFlagged(a), fb = isFlagged(b)
      if (fa !== fb) return fa ? -1 : 1
      const ta = a.track || '', tb = b.track || ''
      if (ta !== tb) return ta.localeCompare(tb)
      return (a.batchName || '').localeCompare(b.batchName || '')
    })
  }, [rows])

  const shown = onlyFlagged ? sorted.filter(isFlagged) : sorted
  const notLogged = rows.filter(r => !r.loggedToday && r.totalTopics > 0)
  const behind    = rows.filter(r => r.planPct < 40 && r.totalTopics > 0)
  const flaggedCount = new Set([...notLogged, ...behind].map(r => r.batchId)).size

  if (loading) return <div className="page" style={{ color: 'var(--ink-soft)' }}>Loading…</div>

  return (
    <div className="page">
      <div style={{ marginBottom: 22 }}>
        <h1 className="page-title">Today, {fmtToday()}</h1>
        <p className="muted" style={{ fontSize: 14, marginTop: 2 }}>{semName ? semName : 'No active semester yet'}</p>
      </div>

      {!semName ? (
        <div className="empty">
          <h2>No active semester</h2>
          <p>{isAdmin ? 'Start a new semester to begin.' : 'Ask the admin to start a semester.'}</p>
          {isAdmin && <Link to="/semesters"><button className="btn btn--primary">Go to Semesters</button></Link>}
        </div>
      ) : rows.length === 0 ? (
        <div className="empty">
          <h2>No batches yet</h2>
          <p>{isAdmin ? 'Batches hold students and a syllabus plan for one track this semester.' : 'No batches assigned to you yet.'}</p>
          {isAdmin && <Link to="/batches"><button className="btn btn--primary">Create a batch</button></Link>}
        </div>
      ) : (
        <>
          <div style={{ paddingBottom: 16, marginBottom: 4 }}>
            {flaggedCount === 0 ? (
              <p style={{ fontSize: 18, color: 'var(--tick)', fontWeight: 600 }}>
                All {rows.length} {rows.length === 1 ? 'batch has' : 'batches have'} logged today. Nobody is behind plan.
              </p>
            ) : isAdmin ? (
              <p style={{ fontSize: 18, color: 'var(--ink)' }}>
                <span style={{ color: 'var(--red-ink)', fontWeight: 700 }}>{notLogged.length} of {rows.length}</span> batches haven't logged today.{' '}
                {behind.length > 0 && <><span style={{ color: 'var(--red-ink)', fontWeight: 700 }}>{behind.length}</span> {behind.length === 1 ? 'is' : 'are'} behind plan.</>}
              </p>
            ) : (
              <p style={{ fontSize: 18, color: 'var(--ink)' }}>
                You haven't logged {notLogged.map(r => r.batchName).join(', ') || 'a batch'} today.
              </p>
            )}
            {flaggedCount > 0 && (
              isAdmin
                ? <button className="btn btn--secondary btn--sm" style={{ marginTop: 10 }} onClick={() => setOnlyFlagged(v => !v)}>
                    {onlyFlagged ? 'Show all batches' : 'Show only these'}
                  </button>
                : notLogged[0] && <Link to={`/batch/${notLogged[0].batchId}`}>
                    <button className="btn btn--primary" style={{ marginTop: 10 }}>Log today's class</button>
                  </Link>
            )}
          </div>

          <div className="table-wrap sheet" style={{ borderRadius: 10 }}>
            <table className="table table--stack">
              <thead>
                <tr>
                  <th>Batch</th><th>Trainers</th><th className="num">Students</th>
                  <th>Status</th><th>Plan progress</th><th>Next topic</th><th></th>
                </tr>
              </thead>
              <tbody>
                {shown.map(r => (
                  <tr key={r.batchId} className={isFlagged(r) ? 'is-flagged' : ''}>
                    <td data-label="Batch">
                      <div style={{ fontWeight: 700 }}>{r.batchName}</div>
                      {r.track && <div style={{ fontSize: 12, color: TRACK_COLOR[r.track] || 'var(--ink-soft)' }}>{r.track}</div>}
                    </td>
                    <td data-label="Trainers" className="muted">{r.trainers.join(', ') || '—'}</td>
                    <td data-label="Students" className="num">{r.studentCount}</td>
                    <td data-label="Status">
                      <span className={`tag ${r.loggedToday ? 'tag--tick' : 'tag--red'}`}>{r.loggedToday ? 'Logged' : 'Not logged'}</span>
                      <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 4 }}>{fmtDate(r.lastLogDate)}</div>
                    </td>
                    <td data-label="Plan progress">
                      <div className="progress-line" style={{ maxWidth: 160 }}>
                        <span className="count">{r.doneTopics} of {r.totalTopics}</span>
                        <span className={`progress-bar${r.planPct < 40 ? ' is-behind' : ''}`}><span style={{ width: `${Math.min(100, r.planPct)}%` }} /></span>
                      </div>
                    </td>
                    <td data-label="Next topic" title={r.nextTopic || ''} style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.nextTopic || '—'}</td>
                    <td data-label="">
                      <Link to={`/batch/${r.batchId}`}><button className="btn btn--secondary btn--sm">Open</button></Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
