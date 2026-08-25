import { useState, useEffect } from 'react'
import api from '../api'
import { ui, Empty } from '../components/ui'

const MEDAL = { 1:'🥇', 2:'🥈', 3:'🥉' }

export default function PublicPage() {
  const [semesters, setSemesters] = useState([])
  const [semId, setSemId] = useState('')
  const [cycles, setCycles] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    api.get('/semesters').then(({ data }) => {
      setSemesters(data.semesters)
      const active = data.semesters.find(s=>s.status==='active') || data.semesters[0]
      setSemId(active?._id || '')
    }).catch(()=>{})
  }, [])

  useEffect(() => { if (semId) load() }, [semId])
  async function load() {
    setLoading(true)
    try {
      const { data } = await api.get('/cycles/halloffame', { params:{ semester: semId } })
      setCycles(data.cycles)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  const fmt = (d) => new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short' })

  // filter by search across the top3 names/rolls; drop cycles with no match
  const shown = cycles.map(c => ({
    ...c,
    top3: c.top3.filter(t => {
      if (!search) return true
      const q = search.toLowerCase()
      return (t.name||'').toLowerCase().includes(q) || (t.roll||'').toLowerCase().includes(q)
    })
  })).filter(c => c.top3.length)

  return (
    <div style={ui.wrap}>
      <div style={{ textAlign:'center', marginBottom:26 }}>
        <div style={{ fontSize:44, marginBottom:8 }}>🏆</div>
        <h1 style={{ ...ui.h1, fontSize:34 }}>Skill Lab Hall of Fame</h1>
        <p style={ui.sub}>Top performers by cycle — SHEAT College Skill Lab</p>
      </div>

      <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap', marginBottom:24 }}>
        <select style={{ ...ui.input, width:'auto' }} value={semId} onChange={e=>setSemId(e.target.value)}>
          {semesters.map(s => <option key={s._id} value={s._id}>{s.name}{s.status==='active'?' (active)':''}</option>)}
        </select>
        <input style={{ ...ui.input, width:'auto', minWidth:220 }} placeholder="Search name / roll…" value={search} onChange={e=>setSearch(e.target.value)} />
      </div>

      {loading ? <div style={{ textAlign:'center', color:'var(--muted)' }}>Loading…</div>
        : shown.length === 0 ? <Empty icon="🏆" title="No toppers yet" hint="Winners appear here once trainers submit a cycle's top 3." />
        : shown.map(c => (
          <div key={c._id} style={{ marginBottom:30 }}>
            <div style={{ display:'flex', alignItems:'baseline', gap:10, borderLeft:'3px solid var(--gold)', paddingLeft:12, marginBottom:14, flexWrap:'wrap' }}>
              <h2 style={{ ...ui.h2, marginBottom:0 }}>{c.batch?.name || 'Batch'} — Cycle {c.number}{c.name?` · ${c.name}`:''}</h2>
              <span style={ui.sub}>{fmt(c.startDate)} → {fmt(c.endDate)}{c.batch?.track?` · ${c.batch.track}`:''}</span>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:14 }}>
              {c.top3.map((t,i) => (
                <div key={i} style={{ ...ui.card, display:'flex', alignItems:'center', gap:14 }}>
                  <div style={{ width:60, height:60, borderRadius:'50%', overflow:'hidden', background:'rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    {t.photo ? <img src={t.photo} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : <span style={{ fontSize:24 }}>{MEDAL[t.rank]}</span>}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:700 }}>{MEDAL[t.rank]} {t.name || '—'}</div>
                    {t.roll && <div style={ui.sub}>{t.roll}</div>}
                    {t.github && <a href={t.github} target="_blank" rel="noreferrer" style={{ fontSize:12, color:'var(--blue)' }}>GitHub repo ↗</a>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
    </div>
  )
}
