// ─────────────────────────────────────────────────────────────────────
//  "Explain this page" button + guided tour (no extra library).
//
//  Usage:  <PageHelp page="marks" />
//  Text for each page lives in ../help/content.js.
//  Tour steps point at elements marked  data-tour="<name>"  in the page.
//  Steps whose element isn't on screen (e.g. trainer-only buttons for a
//  viewer) are skipped automatically.
//  First visit to a page starts the tour once; after that only on click.
// ─────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react'
import HELP from '../help/content'

const seenKey = (page) => `skilllab-help-seen:${page}`
const getSeen = (page) => { try { return localStorage.getItem(seenKey(page)) === '1' } catch { return true } }
const setSeen = (page) => { try { localStorage.setItem(seenKey(page), '1') } catch {} }

const css = {
  btn:   { display:'inline-flex', alignItems:'center', gap:6, padding:'6px 12px', borderRadius:999, border:'1px solid var(--blue-ink, #1E4DB7)',
           background:'var(--blue-wash, #E8EEFB)', color:'var(--blue-ink, #1E4DB7)', fontSize:13, fontWeight:600, cursor:'pointer' },
  shade: { position:'fixed', inset:0, background:'rgba(15,23,22,.45)', zIndex:9000 },
  panel: { position:'fixed', top:0, right:0, bottom:0, width:'min(420px, 100vw)', background:'#fff', color:'#1B2422', zIndex:9001,
           boxShadow:'-8px 0 30px rgba(0,0,0,.18)', padding:'20px 20px 28px', overflowY:'auto', fontSize:14, lineHeight:1.55 },
  h:     { fontSize:18, fontWeight:700, margin:'0 0 6px' },
  sec:   { fontSize:12, fontWeight:700, letterSpacing:'.06em', textTransform:'uppercase', color:'#56625E', margin:'18px 0 6px' },
  key:   { background:'#FFF8E6', border:'1px solid #F0D68A', borderRadius:10, padding:'10px 12px', margin:'8px 0' },
  primary:{ padding:'8px 14px', borderRadius:8, border:0, background:'#1E4DB7', color:'#fff', fontWeight:600, cursor:'pointer' },
  ghost: { padding:'8px 14px', borderRadius:8, border:'1px solid #CBD5D1', background:'#fff', color:'#1B2422', cursor:'pointer' },
  ring:  { position:'fixed', zIndex:9002, borderRadius:10, boxShadow:'0 0 0 4px #F5B700, 0 0 0 9999px rgba(15,23,22,.55)',
           pointerEvents:'none', transition:'all .2s ease' },
  tip:   { position:'fixed', zIndex:9003, width:'min(340px, calc(100vw - 32px))', background:'#fff', color:'#1B2422', borderRadius:12,
           boxShadow:'0 10px 30px rgba(0,0,0,.25)', padding:'14px 16px', fontSize:14, lineHeight:1.5 },
}

function Tour({ steps, onClose }) {
  // keep only steps whose element exists right now
  const [list] = useState(() => steps.filter(s => document.querySelector(`[data-tour="${s.el}"]`)))
  const [i, setI] = useState(0)
  const [box, setBox] = useState(null)

  const measure = useCallback(() => {
    const s = list[i]; if (!s) return
    const el = document.querySelector(`[data-tour="${s.el}"]`); if (!el) return
    const r = el.getBoundingClientRect()
    setBox({ top: r.top - 6, left: r.left - 6, width: r.width + 12, height: Math.min(r.height + 12, window.innerHeight - 40) })
  }, [i, list])

  useEffect(() => {
    const s = list[i]; if (!s) return
    const el = document.querySelector(`[data-tour="${s.el}"]`)
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    const t = setTimeout(measure, 350)
    window.addEventListener('resize', measure); window.addEventListener('scroll', measure, true)
    return () => { clearTimeout(t); window.removeEventListener('resize', measure); window.removeEventListener('scroll', measure, true) }
  }, [i, list, measure])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); if (e.key === 'ArrowRight') setI(n => Math.min(n + 1, list.length - 1)); if (e.key === 'ArrowLeft') setI(n => Math.max(n - 1, 0)) }
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey)
  }, [list.length, onClose])

  if (!list.length) { onClose(); return null }
  const s = list[i], last = i === list.length - 1
  // tooltip below the highlight if there is room, else above
  let tipStyle = { ...css.tip, left: 16 }
  if (box) {
    const below = box.top + box.height + 12
    tipStyle.left = Math.max(16, Math.min(box.left, window.innerWidth - 356))
    if (below + 200 < window.innerHeight) tipStyle.top = below
    else tipStyle.bottom = Math.max(16, window.innerHeight - box.top + 12)
  } else { tipStyle.top = '40%' }

  return (
    <>
      <div style={{ position:'fixed', inset:0, zIndex:9001 }} onClick={onClose} />
      {box && <div style={{ ...css.ring, ...box }} />}
      <div style={tipStyle} role="dialog" aria-label={s.title}>
        <div style={{ fontSize:12, color:'#56625E', marginBottom:2 }}>Step {i + 1} of {list.length}</div>
        <div style={{ fontWeight:700, marginBottom:4 }}>{s.title}</div>
        <div>{s.text}</div>
        <div style={{ display:'flex', gap:8, marginTop:12, justifyContent:'flex-end' }}>
          <button style={css.ghost} onClick={onClose}>{last ? 'Close' : 'Skip'}</button>
          {i > 0 && <button style={css.ghost} onClick={() => setI(i - 1)}>Back</button>}
          {!last && <button style={css.primary} onClick={() => setI(i + 1)}>Next</button>}
          {last && <button style={css.primary} onClick={onClose}>Done</button>}
        </div>
      </div>
    </>
  )
}

export default function PageHelp({ page, role }) {
  const h = HELP[page]
  const [open, setOpen] = useState(false)
  const [touring, setTouring] = useState(false)
  const steps = (h?.steps || []).filter(s => !s.adminOnly || role === 'superadmin')

  // first visit: start the tour once, after the page has rendered
  useEffect(() => {
    if (!h || getSeen(page)) return
    const t = setTimeout(() => { setSeen(page); setTouring(true) }, 900)
    return () => clearTimeout(t)
  }, [page, h])

  if (!h) return null
  const startTour = () => { setOpen(false); setSeen(page); setTimeout(() => setTouring(true), 150) }

  return (
    <>
      <button type="button" style={css.btn} onClick={() => setOpen(true)} aria-label="Explain this page">
        <span aria-hidden="true" style={{ fontWeight:800 }}>?</span> Explain this page
      </button>

      {open && (
        <>
          <div style={css.shade} onClick={() => setOpen(false)} />
          <aside style={css.panel} role="dialog" aria-label={`About: ${h.title}`}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'start', gap:12 }}>
              <h2 style={css.h}>{h.title}</h2>
              <button style={{ ...css.ghost, padding:'4px 10px' }} onClick={() => setOpen(false)} aria-label="Close">✕</button>
            </div>
            <p style={{ margin:0 }}>{h.what}</p>

            <div style={{ display:'flex', gap:8, marginTop:14, flexWrap:'wrap' }}>
              {steps.length > 0 && <button style={css.primary} onClick={startTour}>▶ Show me around</button>}
              {h.video && <a href={h.video} target="_blank" rel="noreferrer"><button style={css.ghost}>🎬 Watch video</button></a>}
            </div>

            {h.why && <><div style={css.sec}>Why it matters</div><p style={{ margin:0 }}>{h.why}</p></>}

            {h.rules?.length > 0 && <>
              <div style={css.sec}>Rules the system follows</div>
              {h.rules.map((r, k) => <div key={k} style={css.key}><b>{r.t}</b><div>{r.d}</div></div>)}
            </>}

            {h.flow?.length > 0 && <>
              <div style={css.sec}>How it connects</div>
              <ol style={{ margin:0, paddingLeft:20 }}>{h.flow.map((f, k) => <li key={k} style={{ marginBottom:4 }}>{f}</li>)}</ol>
            </>}
          </aside>
        </>
      )}

      {touring && <Tour steps={steps} onClose={() => setTouring(false)} />}
    </>
  )
}
