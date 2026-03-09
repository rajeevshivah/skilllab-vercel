import { useState, useEffect, useRef } from 'react'
import { authAPI, studentsAPI } from '../api'

const STREAM_COLORS = {
  'AI / ML':'#1E40AF','MERN Stack':'#7C3AED',
  'Java & Backend Arch.':'#065F46','C Programming Foundation':'#9A3412'
}
const RANK_LABELS = { 1:'Pioneer', 2:'Vanguard', 3:'Trailblazer' }
const STREAM_ORDER = ['AI / ML','MERN Stack','Java & Backend Arch.','C Programming Foundation']

export default function PublicPage() {
  const [students, setStudents] = useState([])
  const [cycles,   setCycles]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [filters,  setFilters]  = useState({ stream:'', cycle:'', year:'', search:'' })
  const photoCache = useRef({})

  useEffect(() => {
    Promise.all([
      studentsAPI.list(),
      studentsAPI.getCycles()
    ]).then(([sr, cr]) => {
      setStudents(sr.data.students)
      setCycles(cr.data.cycles)
    }).finally(() => setLoading(false))
  }, [])

  const filtered = students.filter(s => {
    if (filters.stream && s.stream !== filters.stream) return false
    if (filters.cycle  && s.cycle  !== filters.cycle)  return false
    if (filters.year   && s.year   !== filters.year)   return false
    if (filters.search) {
      const q = filters.search.toLowerCase()
      if (!s.name.toLowerCase().includes(q) && !s.roll?.toLowerCase().includes(q)) return false
    }
    return true
  })

  // Group
  const grouped = {}
  filtered.forEach(s => {
    if (!grouped[s.stream]) grouped[s.stream] = {}
    const k = `${s.course}|${s.sem}|${s.section}`
    if (!grouped[s.stream][k]) grouped[s.stream][k] = []
    grouped[s.stream][k].push(s)
  })

  async function getPhoto(id) {
    if (photoCache.current[id] !== undefined) return photoCache.current[id]
    try {
      // Fetch photo directly — avoids any routing conflicts
      const base = import.meta.env.VITE_API_URL || '/api'
      const res  = await fetch(`${base}/students/${id}?photo=1`, {
        headers: { 'Content-Type': 'application/json' }
      })
      if (!res.ok) { photoCache.current[id] = null; return null }
      const data = await res.json()
      photoCache.current[id] = data.photo || null
      return photoCache.current[id]
    } catch (e) {
      console.error('Photo fetch error:', e)
      photoCache.current[id] = null
      return null
    }
  }

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'60vh',color:'rgba(255,255,255,0.3)',fontSize:14}}>
      Loading toppers…
    </div>
  )

  return (
    <>
      {/* Hero */}
      <header style={{background:'linear-gradient(135deg,#060E1F,#0A1628,#0D1F4A)',borderBottom:'1px solid rgba(255,255,255,0.06)',position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',top:-80,left:'50%',transform:'translateX(-50%)',width:600,height:300,background:'radial-gradient(ellipse,rgba(37,99,235,0.18),transparent 70%)',pointerEvents:'none'}} />
        <div style={{maxWidth:1100,margin:'0 auto',padding:'48px 24px 40px',display:'flex',flexDirection:'column',alignItems:'center',textAlign:'center',position:'relative',zIndex:2}}>
          <div style={{display:'inline-flex',alignItems:'center',gap:8,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:999,padding:'6px 16px',fontSize:11,fontWeight:600,letterSpacing:'0.12em',color:'var(--sky)',textTransform:'uppercase',marginBottom:20}}>
            <span style={{width:6,height:6,background:'var(--gold)',borderRadius:'50%',display:'inline-block'}} />
            SHEAT College · Dept. of Computer Science
          </div>
          <h1 style={{fontFamily:'var(--font-d)',fontSize:'clamp(32px,6vw,58px)',fontWeight:900,lineHeight:1.05,background:'linear-gradient(135deg,#fff 30%,#93C5FD)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text',marginBottom:10}}>
            Skill Lab <span style={{background:'linear-gradient(135deg,var(--gold),#FCD34D)',WebkitBackgroundClip:'text',backgroundClip:'text'}}>Hall of Fame</span>
          </h1>
          <p style={{fontSize:15,color:'rgba(255,255,255,0.5)',marginBottom:32}}>
            Recognising top performers across all programming skill labs
          </p>
          <div style={{display:'flex',gap:12,flexWrap:'wrap',justifyContent:'center'}}>
            {[
              [new Set(students.map(s=>s.stream)).size, 'Streams'],
              [students.length, 'Toppers'],
              [new Set(students.map(s=>`${s.course}|${s.section}`)).size, 'Sections'],
              [cycles.length, 'Cycles'],
            ].map(([v, l]) => (
              <div key={l} style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:10,padding:'10px 20px',display:'flex',flexDirection:'column',alignItems:'center',minWidth:90}}>
                <strong style={{fontFamily:'var(--font-d)',fontSize:24,color:'var(--gold)',lineHeight:1}}>{v}</strong>
                <span style={{fontSize:10,color:'rgba(255,255,255,0.45)',letterSpacing:'0.08em',textTransform:'uppercase',marginTop:3}}>{l}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{position:'absolute',bottom:0,left:0,right:0,height:3,background:'linear-gradient(90deg,transparent,var(--gold),var(--blue),var(--gold),transparent)'}} />
      </header>

      <div style={{maxWidth:1100,margin:'0 auto',padding:'40px 24px'}}>
        {/* Filters */}
        <div style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:36,alignItems:'center'}}>
          <span style={{fontSize:12,color:'var(--muted)',letterSpacing:'0.06em',textTransform:'uppercase'}}>Filter:</span>
          {[
            { id:'stream', opts:['','AI / ML','MERN Stack','Java & Backend Arch.','C Programming Foundation'], labels:['All Streams','AI / ML','MERN Stack','Java','C Foundation'] },
            { id:'year',   opts:['','1st Year','2nd Year','3rd Year'], labels:['All Years','1st Year','2nd Year','3rd Year'] },
          ].map(({ id, opts, labels }) => (
            <select key={id} value={filters[id]} onChange={e => setFilters(f=>({...f,[id]:e.target.value}))}
              style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',color:'white',padding:'8px 14px',borderRadius:8,fontSize:13,cursor:'pointer',minWidth:130}}>
              {opts.map((o,i) => <option key={o} value={o} style={{background:'#0A1628'}}>{labels[i]}</option>)}
            </select>
          ))}
          <select value={filters.cycle} onChange={e => setFilters(f=>({...f,cycle:e.target.value}))}
            style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',color:'white',padding:'8px 14px',borderRadius:8,fontSize:13,cursor:'pointer',minWidth:120}}>
            <option value="" style={{background:'#0A1628'}}>All Cycles</option>
            {cycles.map(c => <option key={c} value={c} style={{background:'#0A1628'}}>{c}</option>)}
          </select>
          <input value={filters.search} onChange={e => setFilters(f=>({...f,search:e.target.value}))}
            placeholder="Search by name or roll…"
            style={{flex:1,minWidth:200,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',color:'white',padding:'8px 14px',borderRadius:8,fontSize:13}} />
        </div>

        {/* Content */}
        {filtered.length === 0 ? (
          <div style={{textAlign:'center',padding:'80px 20px',color:'var(--muted)'}}>
            <div style={{fontSize:48,marginBottom:16}}>🔍</div>
            <h3 style={{fontFamily:'var(--font-d)',fontSize:22,color:'rgba(255,255,255,0.3)',marginBottom:8}}>No toppers found</h3>
            <p>Try adjusting your filters</p>
          </div>
        ) : (
          STREAM_ORDER.filter(s => grouped[s]).map(stream => (
            <StreamSection key={stream} stream={stream} sections={grouped[stream]} getPhoto={getPhoto} />
          ))
        )}
      </div>
    </>
  )
}

function StreamSection({ stream, sections, getPhoto }) {
  const color = STREAM_COLORS[stream] || '#1A4FA0'
  const total = Object.values(sections).flat().length
  const multiSec = Object.keys(sections).length > 1

  return (
    <div style={{marginBottom:48}}>
      <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:20,paddingBottom:12,borderBottom:'1px solid rgba(255,255,255,0.07)'}}>
        <div style={{width:10,height:10,borderRadius:'50%',background:color,flexShrink:0}} />
        <h2 style={{fontFamily:'var(--font-d)',fontSize:20,fontWeight:700}}>{stream}</h2>
        <span style={{fontSize:12,color:'var(--muted)',marginLeft:'auto',fontFamily:'var(--font-m)'}}>{total} topper{total>1?'s':''}</span>
      </div>

      {Object.entries(sections).map(([key, students]) => {
        const sorted = [...students].sort((a,b) => a.rank - b.rank)
        const rep = sorted[0]
        return (
          <div key={key}>
            {multiSec && (
              <div style={{fontSize:11,fontWeight:600,letterSpacing:'0.1em',textTransform:'uppercase',color:'var(--muted)',margin:'20px 0 12px',display:'flex',alignItems:'center',gap:8}}>
                {rep.course} · {rep.sem} · {rep.section}
                <span style={{flex:1,height:1,background:'rgba(255,255,255,0.07)',display:'inline-block'}} />
              </div>
            )}
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:16}}>
              {sorted.map(s => <TopperCard key={s._id} student={s} streamColor={color} getPhoto={getPhoto} />)}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function TopperCard({ student: s, streamColor, getPhoto }) {
  const [photo, setPhoto] = useState(null)
  const rank = s.rank
  const rl = RANK_LABELS[rank] || ''
  const init = s.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()

  useEffect(() => {
    if (s.hasPhoto) getPhoto(s._id).then(setPhoto)
  }, [s._id, s.hasPhoto])

  const rankColors = {
    1: { border:'rgba(245,158,11,0.35)', stripe:'linear-gradient(90deg,var(--gold),#FCD34D)', badge:'var(--gold)', badgeFg:'var(--navy)', label:'var(--gold)' },
    2: { border:'rgba(148,163,184,0.35)', stripe:'linear-gradient(90deg,var(--silver),#CBD5E1)', badge:'var(--silver)', badgeFg:'#0A1628', label:'var(--silver)' },
    3: { border:'rgba(180,83,9,0.35)', stripe:'linear-gradient(90deg,var(--bronze),#D97706)', badge:'var(--bronze)', badgeFg:'white', label:'var(--bronze)' },
  }
  const rc = rankColors[rank]

  return (
    <div style={{background:'rgba(255,255,255,0.04)',border:`1px solid ${rc.border}`,borderRadius:16,overflow:'hidden',transition:'transform 0.25s, box-shadow 0.25s'}}
      onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-4px)';e.currentTarget.style.boxShadow='0 20px 40px rgba(0,0,0,0.4)'}}
      onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow=''}}>
      <div style={{height:3,background:rc.stripe}} />
      <div style={{padding:'18px 18px 16px'}}>
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:14}}>
          <div style={{width:62,height:62,borderRadius:'50%',overflow:'hidden',border:'2px solid rgba(255,255,255,0.15)',background:'rgba(255,255,255,0.06)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            {photo
              ? <img src={photo} alt={s.name} style={{width:'100%',height:'100%',objectFit:'cover'}} />
              : <span style={{fontFamily:'var(--font-d)',fontSize:22,fontWeight:700,color:'rgba(255,255,255,0.25)'}}>{init}</span>
            }
          </div>
          <div style={{display:'flex',flexDirection:'column',alignItems:'center'}}>
            <div style={{width:36,height:36,borderRadius:'50%',background:rc.badge,color:rc.badgeFg,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'var(--font-d)',fontSize:15,fontWeight:900}}>{rank}</div>
            <div style={{fontSize:9,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:rc.label,marginTop:3}}>{rl}</div>
          </div>
        </div>
        <div style={{fontFamily:'var(--font-d)',fontSize:16,fontWeight:700,color:'white',marginBottom:4,lineHeight:1.2}}>{s.name}</div>
        <div style={{fontFamily:'var(--font-m)',fontSize:10,color:'var(--muted)',marginBottom:10}}>{s.roll ? `Roll No. ${s.roll}` : '\u00a0'}</div>
        <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:10}}>
          <span style={{fontSize:10,fontWeight:600,letterSpacing:'0.06em',padding:'3px 8px',borderRadius:999,textTransform:'uppercase',background:'rgba(37,99,235,0.2)',color:'#93C5FD'}}>{s.course}</span>
          <span style={{fontSize:10,fontWeight:600,letterSpacing:'0.06em',padding:'3px 8px',borderRadius:999,textTransform:'uppercase',background:'rgba(255,255,255,0.07)',color:'rgba(255,255,255,0.5)'}}>{s.sem} · {s.section}</span>
          <span style={{fontSize:10,fontWeight:600,letterSpacing:'0.06em',padding:'3px 8px',borderRadius:999,textTransform:'uppercase',background:'rgba(245,158,11,0.15)',color:'#FCD34D'}}>{s.year}</span>
        </div>
        {s.project && (
          <div style={{display:'flex',alignItems:'flex-start',gap:6,padding:'8px 10px',borderRadius:8,background:'rgba(255,255,255,0.04)',borderLeft:'2px solid rgba(255,255,255,0.1)'}}>
            <span style={{fontSize:12,marginTop:1,flexShrink:0}}>💡</span>
            <div style={{fontSize:11,color:'rgba(255,255,255,0.6)',lineHeight:1.4}}>
              <strong style={{color:'rgba(255,255,255,0.85)',display:'block',fontSize:10,letterSpacing:'0.06em',textTransform:'uppercase',marginBottom:1}}>Project</strong>
              {s.project}
            </div>
          </div>
        )}
        <div style={{display:'inline-flex',alignItems:'center',gap:4,fontSize:9,fontWeight:600,letterSpacing:'0.08em',color:'var(--muted)',textTransform:'uppercase',marginTop:10}}>
          <span style={{width:4,height:4,borderRadius:'50%',background:'var(--muted)',display:'inline-block'}} />
          {s.cycle}
        </div>
      </div>
    </div>
  )
}
