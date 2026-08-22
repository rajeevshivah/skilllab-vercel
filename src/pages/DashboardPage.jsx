import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'
import { useAuth } from '../context/AuthContext'
import { useSemester } from '../context/SemesterContext'
import { ui, Bar, Empty } from '../components/ui'

export default function DashboardPage() {
  const { user } = useAuth()
  const { selected } = useSemester()
  const [rows, setRows]       = useState([])
  const [semName, setSemName] = useState('')
  const [loading, setLoading] = useState(true)

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

  const notLogged = rows.filter(r => !r.loggedToday && r.totalTopics > 0).length
  const behind    = rows.filter(r => r.planPct < 40 && r.totalTopics > 0).length

  function fmtDate(d) {
    if (!d) return '—'
    const dt = new Date(d)
    const days = Math.floor((Date.now() - dt) / 86400000)
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    return `${days} days ago`
  }

  if (loading) return <div style={{ ...ui.wrap, color:'var(--muted)' }}>Loading dashboard…</div>

  return (
    <div style={ui.wrap}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', flexWrap:'wrap', gap:12, marginBottom:20 }}>
        <div>
          <h1 style={ui.h1}>Skill Lab Dashboard</h1>
          <p style={ui.sub}>{semName ? `Active semester: ${semName}` : 'No active semester yet'}</p>
        </div>
        {user?.role === 'superadmin' && (
          <div style={{ display:'flex', gap:10 }}>
            <Link to="/semesters"><button style={ui.btnGhost}>Semesters</button></Link>
            <Link to="/batches"><button style={ui.btnGold}>Manage Batches</button></Link>
          </div>
        )}
      </div>

      {!semName ? (
        <Empty icon="📚" title="No active semester" hint={user?.role==='superadmin' ? 'Start a new semester to begin.' : 'Ask the admin to start a semester.'} />
      ) : rows.length === 0 ? (
        <Empty icon="🗂️" title="No batches yet" hint={user?.role==='superadmin' ? 'Create batches from Manage Batches.' : 'No batches assigned to you yet.'} />
      ) : (
        <>
          {/* Summary strip */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:14, marginBottom:22 }}>
            <Stat label="Batches" value={rows.length} />
            <Stat label="Logged today" value={`${rows.filter(r=>r.loggedToday).length}/${rows.length}`} color={notLogged ? 'var(--gold)' : 'var(--success)'} />
            <Stat label="Not logged today" value={notLogged} color={notLogged ? 'var(--danger)' : 'var(--success)'} />
            <Stat label="Behind (<40%)" value={behind} color={behind ? 'var(--danger)' : 'var(--success)'} />
          </div>

          <div style={{ ...ui.card, padding:0, overflow:'hidden' }}>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', minWidth:820 }}>
                <thead>
                  <tr>
                    <th style={ui.th}>Batch</th>
                    <th style={ui.th}>Trainers</th>
                    <th style={ui.th}>Students</th>
                    <th style={ui.th}>Last log</th>
                    <th style={ui.th}>Plan progress</th>
                    <th style={ui.th}>Next topic</th>
                    <th style={ui.th}></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.batchId}>
                      <td style={ui.td}>
                        <div style={{ fontWeight:600 }}>{r.batchName}</div>
                        {r.track && <div style={{ fontSize:11, color:'var(--muted)' }}>{r.track}</div>}
                      </td>
                      <td style={{ ...ui.td, color:'var(--muted)' }}>{r.trainers.join(', ') || '—'}</td>
                      <td style={ui.td}>{r.studentCount}</td>
                      <td style={ui.td}>
                        <span style={ui.pill(
                          r.loggedToday ? 'rgba(22,163,74,0.18)' : 'rgba(220,38,38,0.18)',
                          r.loggedToday ? '#86EFAC' : '#FCA5A5'
                        )}>{fmtDate(r.lastLogDate)}</span>
                      </td>
                      <td style={ui.td}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <Bar pct={r.planPct} />
                          <span style={{ fontSize:12, color:'var(--muted)' }}>{r.doneTopics}/{r.totalTopics}</span>
                        </div>
                      </td>
                      <td style={{ ...ui.td, color:'rgba(255,255,255,0.75)', maxWidth:200 }}>{r.nextTopic}</td>
                      <td style={ui.td}>
                        <Link to={`/batch/${r.batchId}`}><button style={ui.btnGhost}>Open</button></Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function Stat({ label, value, color }) {
  return (
    <div style={ui.cardSm}>
      <div style={{ fontSize:11, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--muted)', marginBottom:6 }}>{label}</div>
      <div style={{ fontSize:26, fontWeight:800, fontFamily:'var(--font-d)', color: color || '#fff' }}>{value}</div>
    </div>
  )
}
