import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'

export default function GlobalSearch() {
  const [q, setQ] = useState('')
  const [results, setResults] = useState(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const boxRef = useRef(null)
  const inputRef = useRef(null)
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

  // "/" or Ctrl/Cmd+K focuses search from anywhere, unless already typing
  // somewhere else. Esc blurs and closes the panel.
  useEffect(() => {
    function onKey(e) {
      const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName) || document.activeElement?.isContentEditable
      if ((e.key === '/' && !typing) || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) {
        e.preventDefault()
        inputRef.current?.focus()
      } else if (e.key === 'Escape' && document.activeElement === inputRef.current) {
        inputRef.current?.blur(); setOpen(false)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  function go(path) { setOpen(false); setQ(''); nav(path) }

  const total = results ? (results.students.length + results.batches.length + results.cycles.length) : 0

  return (
    <div className="dropdown" style={{ width: 200 }} ref={boxRef}>
      <input
        ref={inputRef}
        className="ctl"
        style={{ height: 34, fontSize: 13 }}
        value={q}
        placeholder="Search… (press /)"
        onChange={e => setQ(e.target.value)}
        onFocus={() => results && setOpen(true)}
      />
      {open && q.trim().length >= 2 && (
        <div className="dropdown-panel" style={{ width: 320, maxHeight: 420, overflowY: 'auto', minWidth: 0 }}>
          {loading && <div style={{ padding: '12px 10px', color: 'var(--ink-soft)', fontSize: 13, textAlign: 'center' }}>Searching…</div>}
          {!loading && total === 0 && <div style={{ padding: '12px 10px', color: 'var(--ink-soft)', fontSize: 13, textAlign: 'center' }}>No matches for "{q}"</div>}

          {results?.students.length > 0 && <>
            <div className="dropdown-label">Students</div>
            {results.students.map(s => (
              <button key={s._id} onMouseDown={() => go(`/batch/${s.batchId}`)}>
                {s.name} <span style={{ color: 'var(--ink-soft)', fontWeight: 400 }}>{s.roll ? `· ${s.roll}` : ''} {s.batch ? `· ${s.batch}` : ''}</span>
              </button>
            ))}
          </>}

          {results?.batches.length > 0 && <>
            <div className="dropdown-label">Batches</div>
            {results.batches.map(b => (
              <button key={b._id} onMouseDown={() => go(`/batch/${b._id}`)}>
                {b.name} <span style={{ color: 'var(--ink-soft)', fontWeight: 400 }}>{b.track ? `· ${b.track}` : ''}</span>
              </button>
            ))}
          </>}

          {results?.cycles.length > 0 && <>
            <div className="dropdown-label">Cycles</div>
            {results.cycles.map(c => (
              <button key={c._id} onMouseDown={() => go(`/cycle/${c._id}`)}>
                Cycle {c.number}{c.name ? ` · ${c.name}` : ''} <span style={{ color: 'var(--ink-soft)', fontWeight: 400 }}>{c.batch ? `· ${c.batch}` : ''}</span>
              </button>
            ))}
          </>}
        </div>
      )}
    </div>
  )
}
