import { useState, useEffect } from 'react'
import api from '../api'
import { useAuth } from '../context/AuthContext'
import { useSemester } from '../context/SemesterContext'
import { ui, Alert, Empty } from '../components/ui'

export default function DuplicatesPage() {
  const { user } = useAuth()
  const { semesters, selected, setSelected } = useSemester()
  const [groups, setGroups] = useState([])
  const [batches, setBatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [alert, setAlert] = useState(null)
  const show = (msg, type='success') => { setAlert({ msg, type }); setTimeout(()=>setAlert(null), 3500) }

  useEffect(() => { if (selected) load() }, [selected])
  async function load() {
    setLoading(true)
    try {
      const [d, b] = await Promise.all([
        api.get('/students/duplicates', { params:{ semester: selected._id } }),
        api.get('/batches', { params:{ semester: selected._id } }),
      ])
      setGroups(d.data.groups)
      setBatches(b.data.batches)
    } catch (e) { show(e.response?.data?.message || 'Failed to load', 'error') }
    finally { setLoading(false) }
  }

  // Keep this student in one batch by removing the OTHER copies
  async function keepHere(group, keepStudentId) {
    if (!confirm('Keep this entry and remove the student from the other batch(es)?')) return
    try {
      const toRemove = group.entries.filter(e => e.studentId !== keepStudentId)
      for (const e of toRemove) await api.delete(`/students/${e.studentId}`)
      show('Resolved — student now in one batch.'); load()
    } catch (e) { show(e.response?.data?.message || 'Failed', 'error') }
  }

  if (user?.role !== 'superadmin') return <div style={{ ...ui.wrap, color:'var(--muted)' }}>Admin only.</div>

  return (
    <div style={ui.wrap}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', flexWrap:'wrap', gap:12, marginBottom:8 }}>
        <div>
          <h1 style={ui.h1}>Duplicate Students</h1>
          <p style={ui.sub}>Students whose roll number appears in more than one batch — resolve before the track lock.</p>
        </div>
        <select style={{ ...ui.input, width:'auto' }} value={selected?._id||''}
          onChange={e=>setSelected(semesters.find(s=>s._id===e.target.value))}>
          {semesters.map(s => <option key={s._id} value={s._id}>{s.name}{s.status==='active'?' (active)':''}</option>)}
        </select>
      </div>
      <div style={{ height:16 }} />
      <Alert alert={alert} />

      {loading ? <div style={{ color:'var(--muted)' }}>Loading…</div>
        : groups.length === 0 ? <Empty icon="✅" title="No duplicates" hint="No student is in more than one batch this semester." />
        : (
          <div style={{ display:'grid', gap:14 }}>
            {groups.map((g,i) => (
              <div key={i} style={ui.card}>
                <div style={{ fontWeight:700, marginBottom:4 }}>Roll {g.roll}</div>
                <p style={{ ...ui.sub, marginBottom:12 }}>Appears in {g.entries.length} batches. Keep the correct one — the others will be removed.</p>
                <div style={{ display:'grid', gap:8 }}>
                  {g.entries.map(e => (
                    <div key={e.studentId} style={{ ...ui.cardSm, display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
                      <div>
                        <span style={{ fontWeight:600 }}>{e.name}</span>
                        <span style={{ ...ui.sub, marginLeft:8 }}>{e.batchName}{e.track?` · ${e.track}`:''}</span>
                      </div>
                      <button style={ui.btn} onClick={()=>keepHere(g, e.studentId)}>Keep here, remove others</button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  )
}
