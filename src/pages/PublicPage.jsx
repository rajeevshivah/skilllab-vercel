import { useState, useEffect } from 'react'
import api from '../api'
import { ui, Empty } from '../components/ui'

const RANK = { 1:{ m:'🥇', label:'1st' }, 2:{ m:'🥈', label:'2nd' }, 3:{ m:'🥉', label:'3rd' } }

export default function PublicPage() {
  const [semesters, setSemesters] = useState([])
  const [semId, setSemId] = useState('')
  const [batches, setBatches] = useState([])
  const [toppers, setToppers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [batchFilter, setBatchFilter] = useState('')

  useEffect(() => {
    api.get('/semesters').then(({ data }) => {
      setSemesters(data.semesters)
      const active = data.semesters.find(s=>s.status==='active') || data.semesters[0]
      setSemId(active?._id || '')
    })
  }, [])

  useEffect(() => { if (semId) load() }, [semId])
  async function load() {
    setLoading(true)
    try {
      const [b, t] = await Promise.all([
        api.get('/batches', { params:{ semester: semId } }),
        api.get('/toppers', { params:{ semester: semId } }),
      ])
      setBatches(b.data.batches); setToppers(t.data.toppers)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  const filtered = toppers.filter(t => {
    if (batchFilter && t.batch?._id !== batchFilter) return false
    if (search) {
      const q = search.toLowerCase()
      if (!t.student?.name?.toLowerCase().includes(q) && !t.student?.roll?.toLowerCase().includes(q)) return false
    }
    return true
  })

  // group by batch -> cycle
  const grouped = {}
  filtered.forEach(t => {
    const bn = t.batch?.name || 'Unknown'
    grouped[bn] = grouped[bn] || {}
    grouped[bn][t.cycle] = grouped[bn][t.cycle] || []
    grouped[bn][t.cycle].push(t)
  })

  return (
    <div style={ui.wrap}>
      <div style={{ textAlign:'center', marginBottom:26 }}>
        <div style={{ fontSize:44, marginBottom:8 }}>🏆</div>
        <h1 style={{ ...ui.h1, fontSize:34 }}>Skill Lab Hall of Fame</h1>
        <p style={ui.sub}>Top performers across every batch — SHEAT College Skill Lab</p>
      </div>

      <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap', marginBottom:24 }}>
        <select style={{ ...ui.input, width:'auto' }} value={semId} onChange={e=>setSemId(e.target.value)}>
          {semesters.map(s => <option key={s._id} value={s._id}>{s.name}{s.status==='active'?' (active)':''}</option>)}
        </select>
        <select style={{ ...ui.input, width:'auto' }} value={batchFilter} onChange={e=>setBatchFilter(e.target.value)}>
          <option value="">All batches</option>
          {batches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
        </select>
        <input style={{ ...ui.input, width:'auto', minWidth:200 }} placeholder="Search name / roll…" value={search} onChange={e=>setSearch(e.target.value)} />
      </div>

      {loading ? <div style={{ textAlign:'center', color:'var(--muted)' }}>Loading…</div>
        : Object.keys(grouped).length === 0 ? <Empty icon="🏆" title="No toppers to show yet" hint="Winners appear here as cycles complete." />
        : Object.entries(grouped).map(([bn, cycles]) => (
          <div key={bn} style={{ marginBottom:30 }}>
            <h2 style={{ ...ui.h2, borderLeft:'3px solid var(--gold)', paddingLeft:12 }}>{bn}</h2>
            {Object.entries(cycles).sort().map(([cycle, list]) => (
              <div key={cycle} style={{ marginBottom:16 }}>
                <div style={{ ...ui.sub, marginBottom:8, textTransform:'uppercase', letterSpacing:'0.06em' }}>{cycle}</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:12 }}>
                  {list.sort((a,b)=>a.rank-b.rank).map(t => (
                    <div key={t._id} style={{ ...ui.card, display:'flex', alignItems:'center', gap:12 }}>
                      <div style={{ width:52, height:52, borderRadius:'50%', overflow:'hidden', background:'rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>
                        {t.student?.photo ? <img src={t.student.photo} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : (t.student?.name?.[0] || '?')}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:700 }}>{RANK[t.rank]?.m} {t.student?.name || '—'}</div>
                        {t.student?.roll && <div style={ui.sub}>{t.student.roll}</div>}
                        {t.project && <a href={t.project} target="_blank" rel="noreferrer" style={{ fontSize:12, color:'var(--blue)' }}>View project ↗</a>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
    </div>
  )
}
