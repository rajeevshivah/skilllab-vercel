// Shared style tokens + tiny presentational helpers, matching the existing dark-navy theme.
export const ui = {
  card:    { background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.09)', borderRadius:16, padding:24 },
  cardSm:  { background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.09)', borderRadius:12, padding:16 },
  input:   { width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'white', padding:'9px 12px', borderRadius:8, fontSize:13, outline:'none' },
  label:   { display:'block', fontSize:11, fontWeight:600, letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--muted)', marginBottom:5 },
  btn:     { padding:'10px 18px', background:'var(--blue)', color:'white', border:'none', borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer' },
  btnGhost:{ padding:'8px 14px', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:8, color:'rgba(255,255,255,0.8)', fontSize:12, cursor:'pointer' },
  btnDanger:{ padding:'8px 14px', background:'rgba(220,38,38,0.15)', border:'1px solid rgba(220,38,38,0.35)', borderRadius:8, color:'#FCA5A5', fontSize:12, cursor:'pointer' },
  btnGold: { padding:'10px 18px', background:'var(--gold)', color:'#1a1200', border:'none', borderRadius:9, fontSize:13, fontWeight:700, cursor:'pointer' },
  h1:      { fontFamily:'var(--font-d)', fontSize:28, fontWeight:900, marginBottom:4 },
  h2:      { fontFamily:'var(--font-d)', fontSize:20, fontWeight:700, marginBottom:12 },
  sub:     { color:'var(--muted)', fontSize:13 },
  wrap:    { maxWidth:1100, margin:'0 auto', padding:'28px 24px 80px' },
  pill:    (bg,fg) => ({ display:'inline-block', padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:600, background:bg, color:fg }),
  th:      { textAlign:'left', padding:'10px 12px', fontSize:11, letterSpacing:'0.06em', textTransform:'uppercase', color:'var(--muted)', borderBottom:'1px solid rgba(255,255,255,0.09)', fontWeight:600 },
  td:      { padding:'10px 12px', fontSize:13, borderBottom:'1px solid rgba(255,255,255,0.05)' },
}

export function Alert({ alert }) {
  if (!alert) return null
  const ok = alert.type === 'success'
  return (
    <div style={{
      background: ok ? 'rgba(22,163,74,0.15)' : 'rgba(220,38,38,0.15)',
      border: `1px solid ${ok ? 'rgba(22,163,74,0.35)' : 'rgba(220,38,38,0.35)'}`,
      color: ok ? '#86EFAC' : '#FCA5A5',
      padding:'10px 14px', borderRadius:9, fontSize:13, marginBottom:16,
    }}>{alert.msg}</div>
  )
}

export function Bar({ pct, color }) {
  const c = color || (pct >= 70 ? 'var(--success)' : pct >= 40 ? 'var(--gold)' : 'var(--danger)')
  return (
    <div style={{ background:'rgba(255,255,255,0.08)', borderRadius:20, height:8, overflow:'hidden', minWidth:80 }}>
      <div style={{ width:`${Math.min(100,pct)}%`, height:'100%', background:c, transition:'width 0.3s' }} />
    </div>
  )
}

export function Empty({ icon, title, hint }) {
  return (
    <div style={{ textAlign:'center', padding:'60px 20px', color:'var(--muted)' }}>
      <div style={{ fontSize:40, marginBottom:12, opacity:0.5 }}>{icon}</div>
      <div style={{ fontSize:15, color:'rgba(255,255,255,0.6)', marginBottom:6 }}>{title}</div>
      {hint && <div style={{ fontSize:13 }}>{hint}</div>}
    </div>
  )
}
