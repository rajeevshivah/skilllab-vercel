import { useState, useEffect } from 'react'
import api from '../api'
import { useSemester } from '../context/SemesterContext'
import { ui, Bar, Empty } from '../components/ui'

export default function PlacementPage() {
  const { semesters, selected, setSelected } = useSemester()
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [limit, setLimit] = useState(15)

  useEffect(() => { if (selected) load() }, [selected])
  async function load() {
    setLoading(true)
    try { const { data } = await api.get('/students/placement', { params:{ semester: selected._id } }); setStudents(data.students) }
    catch { /* ignore */ }
    finally { setLoading(false) }
  }

  const shown = students.slice(0, limit)

  return (
    <div style={ui.wrap}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', flexWrap:'wrap', gap:12, marginBottom:8 }}>
        <div>
          <h1 style={ui.h1}>Placement Track</h1>
          <p style={ui.sub}>Auto-ranked across all batches — top-3 finishes, projects, attendance, and trainer flags.</p>
        </div>
        <select style={{ ...ui.input, width:'auto' }} value={selected?._id||''}
          onChange={e=>setSelected(semesters.find(s=>s._id===e.target.value))}>
          {semesters.map(s => <option key={s._id} value={s._id}>{s.name}{s.status==='active'?' (active)':''}</option>)}
        </select>
      </div>
      <div style={{ height:16 }} />

      {loading ? <div style={{ color:'var(--muted)' }}>Loading…</div>
        : students.length === 0 ? <Empty icon="🎯" title="No student data yet" hint="Once batches have attendance, projects and toppers, the ranking fills in." />
        : (
          <>
            <div style={{ ...ui.card, padding:0, overflow:'hidden' }}>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', minWidth:720 }}>
                  <thead><tr>
                    <th style={ui.th}>#</th><th style={ui.th}>Student</th><th style={ui.th}>Batch</th>
                    <th style={ui.th}>Score</th><th style={ui.th}>Top-3</th><th style={ui.th}>Projects</th>
                    <th style={ui.th}>Attendance</th>
                  </tr></thead>
                  <tbody>
                    {shown.map((s,i) => (
                      <tr key={s._id} style={ i<6 ? { background:'rgba(245,158,11,0.06)' } : {}}>
                        <td style={{ ...ui.td, fontWeight:700, color: i<3?'var(--gold)':'var(--muted)' }}>{i+1}</td>
                        <td style={{ ...ui.td, fontWeight:600 }}>
                          {s.name} {s.flagged && '⭐'}
                          <div style={{ ...ui.sub }}>{s.roll} {s.course && `· ${s.course}`} {s.sem && `· ${s.sem}`}</div>
                        </td>
                        <td style={{ ...ui.td, color:'var(--muted)' }}>{s.batch?.name || '—'}{s.batch?.track?` (${s.batch.track})`:''}</td>
                        <td style={{ ...ui.td }}><span style={{ fontWeight:700, color:'var(--gold)' }}>{s.score}</span></td>
                        <td style={ui.td}>{s.stats?.topperCount||0}</td>
                        <td style={ui.td}>{s.stats?.projectCount||0}</td>
                        <td style={ui.td}>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <Bar pct={s.attendancePct} /><span style={{ fontSize:12, color:'var(--muted)' }}>{s.attendancePct}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            {limit < students.length && (
              <div style={{ textAlign:'center', marginTop:16 }}>
                <button style={ui.btnGhost} onClick={()=>setLimit(l=>l+15)}>Show more</button>
              </div>
            )}
            <p style={{ ...ui.sub, marginTop:14 }}>Highlighted rows are the top 6 — your active placement focus. Score = top-3×5 + projects×3 + attendance×0.1 + flag×2.</p>
          </>
        )}
    </div>
  )
}
