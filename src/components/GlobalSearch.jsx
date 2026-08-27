import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'

export default function GlobalSearch() {
  const [q, setQ] = useState('')
  const [results, setResults] = useState(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const boxRef = useRef(null)
  const nav = useNavigate()

  // debounce
  useEffect(() => {
    if (q.trim().length < 2) { setResults(null); return }
    setLoading(true)
    const t = setTimeout(async () => {
      try { const { data } = await api.get('/search', { params:{ q } }); setResults(data); setOpen(true) }
      catch { setResults(null) }
      finally { setLoading(false) }
    }, 300)
    return () => clearTimeout(t)
  }, [q])

  // click outside to close
  useEffect(() => {
    function onClick(e) { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  function go(path) { setOpen(false); setQ(''); nav(path) }

  const total = results ? (results.students.length + results.batches.length + results.cycles.length) : 0

  const S = {
    wrap: { position:'relative', width:200 },
    input: { width:'100%', padding:'7px 12px', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:8, color:'#fff', fontSize:13, outline:'none' },
    panel: { position:'absolute', top:'110%', right:0, width:320, maxHeight:420, overflowY:'auto', background:'#0F2033', border:'1px solid rgba(255,255,255,0.14)', borderRadius:10, boxShadow:'0 12px 40px rgba(0,0,0,0.5)', zIndex:200, padding:6 },
    section: { fontSize:10, textTransform:'uppercase', letterSpacing:0.5, color:'rgba(255,255,255,0.4)', padding:'8px 10px 4px' },
    item: { padding:'8px 10px', borderRadius:7, cursor:'pointer', color:'rgba(255,255,255,0.85)', fontSize:13 },
    sub: { fontSize:11, color:'rgba(255,255,255,0.45)' },
    empty: { padding:'14px 10px', color:'rgba(255,255,255,0.45)', fontSize:13, textAlign:'center' },
  }

  return (
    <div style={S.wrap} ref={boxRef}>
      <input style={S.input} value={q} placeholder="Search…"
        onChange={e=>setQ(e.target.value)} onFocus={()=>results && setOpen(true)} />
      {open && q.trim().length >= 2 && (
        <div style={S.panel}>
          {loading && <div style={S.empty}>Searching…</div>}
          {!loading && total === 0 && <div style={S.empty}>No matches for “{q}”</div>}

          {results?.students.length > 0 && <>
            <div style={S.section}>Students</div>
            {results.students.map(s => (
              <div key={s._id} style={S.item} onMouseDown={()=>go(`/batch/${s.batchId}`)}
                onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.08)'}
                onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                {s.name} <span style={S.sub}>{s.roll ? `· ${s.roll}` : ''} {s.batch ? `· ${s.batch}` : ''}</span>
              </div>
            ))}
          </>}

          {results?.batches.length > 0 && <>
            <div style={S.section}>Batches</div>
            {results.batches.map(b => (
              <div key={b._id} style={S.item} onMouseDown={()=>go(`/batch/${b._id}`)}
                onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.08)'}
                onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                {b.name} <span style={S.sub}>{b.track ? `· ${b.track}` : ''}</span>
              </div>
            ))}
          </>}

          {results?.cycles.length > 0 && <>
            <div style={S.section}>Cycles</div>
            {results.cycles.map(c => (
              <div key={c._id} style={S.item} onMouseDown={()=>go(`/cycle/${c._id}`)}
                onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.08)'}
                onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                Cycle {c.number}{c.name ? ` · ${c.name}` : ''} <span style={S.sub}>{c.batch ? `· ${c.batch}` : ''}</span>
              </div>
            ))}
          </>}
        </div>
      )}
    </div>
  )
}
