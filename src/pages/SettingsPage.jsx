import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const TYPES = [
  { key:'stream',  label:'Streams / Labs',  icon:'🔬', hint:'e.g. AI / ML, MERN Stack' },
  { key:'course',  label:'Courses',          icon:'🎓', hint:'e.g. B.Tech, BCA' },
  { key:'section', label:'Sections',         icon:'🏫', hint:'e.g. Sec A, Sec B' },
  { key:'sem',     label:'Semesters',        icon:'📅', hint:'e.g. 2nd Sem, 4th Sem' },
  { key:'year',    label:'Years',            icon:'📆', hint:'e.g. 1st Year, 2nd Year' },
  { key:'cycle',   label:'Cycles',           icon:'🔄', hint:'e.g. Cycle 1, Cycle 2' },
]

const S = {
  page:    { maxWidth:900, margin:'0 auto', padding:'40px 24px' },
  card:    { background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:16, padding:24, marginBottom:20 },
  hdr:     { display:'flex', alignItems:'center', gap:10, marginBottom:16, paddingBottom:12, borderBottom:'1px solid rgba(255,255,255,0.07)' },
  hdrTitle:{ fontFamily:'var(--font-d)', fontSize:17, fontWeight:700 },
  hdrHint: { fontSize:12, color:'var(--muted)', marginLeft:'auto' },
  grid:    { display:'flex', flexWrap:'wrap', gap:8, marginBottom:14 },
  chip:    (active) => ({
    display:'inline-flex', alignItems:'center', gap:6,
    padding:'6px 12px', borderRadius:8, fontSize:13, fontWeight:500,
    background: active ? 'rgba(37,99,235,0.2)' : 'rgba(255,255,255,0.04)',
    border: `1px solid ${active ? 'rgba(37,99,235,0.4)' : 'rgba(255,255,255,0.08)'}`,
    color: active ? '#93C5FD' : 'rgba(255,255,255,0.35)',
  }),
  chipBtn: { background:'none', border:'none', cursor:'pointer', padding:'0 2px', fontSize:11, color:'inherit', lineHeight:1 },
  addRow:  { display:'flex', gap:8, marginTop:4 },
  input:   { flex:1, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'white', padding:'8px 12px', borderRadius:8, fontSize:13, outline:'none' },
  addBtn:  { padding:'8px 18px', background:'var(--blue)', color:'white', border:'none', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer' },
}

// ── In Progress Manager ───────────────────────────────────────────
function InProgressManager({ config, onSaved }) {
  const CYCLES   = (config['cycle'] || []).filter(c => c.isActive).map(c => c.value)
  const existing = config['inProgress'] || []
  const [rows,   setRows]   = useState(
    existing.length > 0
      ? existing.map(e => { const parts = (e.label||'').split('||'); return { id: e._id, cycle: e.value, desc: parts[0]||'', date: parts[1]||'' } })
      : [{ id: null, cycle: '', date: '' }]
  )
  const [saving, setSaving] = useState(false)
  const token = localStorage.getItem('sl_token')

  // Sync when config loads
  useEffect(() => {
    if (existing.length > 0) {
      setRows(existing.map(e => { const parts = (e.label||'').split('||'); return { id: e._id, cycle: e.value, desc: parts[0]||'', date: parts[1]||'' } }))
    }
  }, [config])

  function addRow()        { setRows(r => [...r, { id: null, cycle: '', date: '' }]) }
  function removeRow(i)    { setRows(r => r.filter((_,idx) => idx !== i)) }
  function update(i, k, v) { setRows(r => { const n=[...r]; n[i]={...n[i],[k]:v}; return n }) }

  async function save() {
    setSaving(true)
    try {
      const headers = { 'Content-Type':'application/json', Authorization:`Bearer ${token}` }
      for (const e of existing) {
        await fetch('/api/config', { method:'DELETE', headers, body: JSON.stringify({ id: e._id }) })
      }
      for (const row of rows.filter(r => r.cycle)) {
        await fetch('/api/config', { method:'POST', headers,
          body: JSON.stringify({ type:'inProgress', value: row.cycle, label: `${row.desc||''}||${row.date||''}`, order: 0 }) })
      }
      onSaved()
    } catch { alert('Failed to save') }
    finally { setSaving(false) }
  }

  const iS = { background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'white', padding:'9px 12px', borderRadius:8, fontSize:13, outline:'none' }
  const lS = { display:'block', fontSize:11, fontWeight:600, letterSpacing:'0.06em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)', marginBottom:5 }

  return (
    <div style={{background:'rgba(37,99,235,0.06)',border:'1px solid rgba(37,99,235,0.2)',borderRadius:16,padding:24,marginBottom:20}}>
      <div style={{marginBottom:16,paddingBottom:12,borderBottom:'1px solid rgba(37,99,235,0.15)'}}>
        <p style={{fontFamily:'var(--font-d)',fontSize:17,fontWeight:700,margin:0}}>⚡ Currently Running Cycles</p>
        <p style={{fontSize:12,color:'var(--muted)',margin:'4px 0 0'}}>
          Hall of Fame auto-shows the latest uploaded cycle per section. Add running cycles here to show visitors a "Results coming soon" banner.
        </p>
      </div>

      {rows.map((row, i) => (
        <div key={i} style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',
          borderRadius:10,padding:12,marginBottom:10}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr auto',gap:10}}>
            <div>
              {i === 0 && <label style={lS}>Running Cycle</label>}
              <select style={{...iS,width:'100%'}} value={row.cycle} onChange={e=>update(i,'cycle',e.target.value)}>
                <option value="" style={{background:'#0A1628'}}>Select cycle</option>
                {CYCLES.map(c=><option key={c} value={c} style={{background:'#0A1628'}}>{c}</option>)}
              </select>
            </div>
            <div>
              {i === 0 && <label style={lS}>For (who is it for)</label>}
              <input style={{...iS,width:'100%'}} placeholder="e.g. BCA 1st Year"
                value={row.desc||''} onChange={e=>update(i,'desc',e.target.value)} />
            </div>
            <div>
              {i === 0 && <label style={lS}>Results Expected Date</label>}
              <input style={{...iS,width:'100%'}} placeholder="e.g. 30 March 2026"
                value={row.date} onChange={e=>update(i,'date',e.target.value)} />
            </div>
            <div style={{display:'flex',alignItems: i===0 ? 'flex-end' : 'center'}}>
              {rows.length > 1 && (
                <button type="button" onClick={()=>removeRow(i)}
                  style={{padding:'9px 12px',background:'rgba(220,38,38,0.12)',border:'1px solid rgba(220,38,38,0.2)',
                    color:'#FCA5A5',borderRadius:8,fontSize:13,cursor:'pointer'}}>✕</button>
              )}
            </div>
          </div>
        </div>
      ))}

      <div style={{display:'flex',gap:10,marginTop:12}}>
        <button type="button" onClick={addRow}
          style={{padding:'8px 16px',background:'rgba(37,99,235,0.15)',border:'1px solid rgba(37,99,235,0.3)',
            color:'#93C5FD',borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer'}}>
          + Add Another
        </button>
        <button onClick={save} disabled={saving}
          style={{padding:'8px 24px',background:'rgba(37,99,235,0.3)',border:'1px solid rgba(37,99,235,0.5)',
            color:'white',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer',opacity:saving?0.7:1}}>
          {saving ? 'Saving…' : '💾 Save'}
        </button>
      </div>
      <p style={{fontSize:11,color:'rgba(255,255,255,0.2)',marginTop:10}}>
        💡 Once you upload toppers for a cycle, remove it from here — Hall of Fame switches automatically.
      </p>
    </div>
  )
}

// ── Main Settings Page ────────────────────────────────────────────
export default function SettingsPage() {
  const { isSuperAdmin } = useAuth()
  const navigate = useNavigate()
  const [config,  setConfig]  = useState({})
  const [loading, setLoading] = useState(true)
  const [inputs,  setInputs]  = useState({})
  const [alert,   setAlert]   = useState(null)
  const [saving,  setSaving]  = useState({})

  useEffect(() => {
    if (!isSuperAdmin) { navigate('/'); return }
    fetchConfig()
  }, [])

  async function fetchConfig() {
    try {
      const res  = await fetch('/api/config?all=1')
      const data = await res.json()
      setConfig(data.config)
    } catch { showAlert('Failed to load config', 'error') }
    finally { setLoading(false) }
  }

  async function addItem(type) {
    const value = (inputs[type] || '').trim()
    if (!value) return
    setSaving(s => ({ ...s, [type]: true }))
    try {
      const res  = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type':'application/json', Authorization:`Bearer ${localStorage.getItem('sl_token')}` },
        body: JSON.stringify({ type, value })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)
      setConfig(c => ({ ...c, [type]: [...(c[type] || []), data.item] }))
      setInputs(i => ({ ...i, [type]: '' }))
      showAlert(`"${value}" added`, 'success')
    } catch (err) { showAlert(err.message || 'Failed', 'error') }
    finally { setSaving(s => ({ ...s, [type]: false })) }
  }

  async function toggleItem(item, type) {
    try {
      await fetch('/api/config', {
        method: 'PATCH',
        headers: { 'Content-Type':'application/json', Authorization:`Bearer ${localStorage.getItem('sl_token')}` },
        body: JSON.stringify({ id: item._id, isActive: !item.isActive })
      })
      setConfig(c => {
        const updated = { ...c }
        updated[type] = updated[type].map(i => i._id === item._id ? { ...i, isActive: !item.isActive } : i)
        return updated
      })
    } catch { showAlert('Failed to update', 'error') }
  }

  async function deleteItem(item, type) {
    if (!confirm(`Permanently delete "${item.value}"?`)) return
    try {
      await fetch('/api/config', {
        method: 'DELETE',
        headers: { 'Content-Type':'application/json', Authorization:`Bearer ${localStorage.getItem('sl_token')}` },
        body: JSON.stringify({ id: item._id })
      })
      setConfig(c => {
        const updated = { ...c }
        updated[type] = updated[type].filter(i => i._id !== item._id)
        return updated
      })
      showAlert(`"${item.value}" deleted`, 'success')
    } catch { showAlert('Failed to delete', 'error') }
  }

  function showAlert(msg, type) { setAlert({ msg, type }); setTimeout(() => setAlert(null), 3000) }

  if (loading) return <div style={{textAlign:'center',padding:'80px',color:'var(--muted)'}}>Loading…</div>

  return (
    <div style={S.page}>
      <div style={{marginBottom:32}}>
        <h1 style={{fontFamily:'var(--font-d)',fontSize:28}}>⚙️ Settings</h1>
        <p style={{fontSize:13,color:'var(--muted)',marginTop:4}}>Manage dropdown options and cycle status — no code changes needed</p>
      </div>

      {alert && (
        <div style={{padding:'12px 16px',borderRadius:10,fontSize:13,marginBottom:20,
          background:alert.type==='success'?'rgba(22,163,74,0.15)':'rgba(220,38,38,0.15)',
          border:`1px solid ${alert.type==='success'?'rgba(22,163,74,0.3)':'rgba(220,38,38,0.3)'}`,
          color:alert.type==='success'?'#86EFAC':'#FCA5A5'}}>
          {alert.msg}
        </div>
      )}

      <InProgressManager config={config} onSaved={fetchConfig} />

      {TYPES.map(({ key, label, icon, hint }) => (
        <div key={key} style={S.card}>
          <div style={S.hdr}>
            <span style={{fontSize:22}}>{icon}</span>
            <span style={S.hdrTitle}>{label}</span>
            <span style={S.hdrHint}>{hint}</span>
          </div>

          <div style={S.grid}>
            {(config[key] || []).map(item => (
              <div key={item._id} style={S.chip(item.isActive)}>
                <span>{item.value}</span>
                <button style={S.chipBtn} title={item.isActive ? 'Deactivate' : 'Activate'} onClick={() => toggleItem(item, key)}>
                  {item.isActive ? '👁' : '🚫'}
                </button>
                <button style={{...S.chipBtn, color:'#FCA5A5'}} title="Delete permanently" onClick={() => deleteItem(item, key)}>
                  ✕
                </button>
              </div>
            ))}
            {(config[key] || []).length === 0 && (
              <span style={{fontSize:12,color:'var(--muted)'}}>No items yet</span>
            )}
          </div>

          <div style={S.addRow}>
            <input style={S.input} placeholder={`Add new ${key}… (${hint})`}
              value={inputs[key] || ''}
              onChange={e => setInputs(i => ({ ...i, [key]: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && addItem(key)} />
            <button style={S.addBtn} onClick={() => addItem(key)} disabled={saving[key]}>
              {saving[key] ? '…' : '+ Add'}
            </button>
          </div>
          <p style={{fontSize:11,color:'rgba(255,255,255,0.2)',marginTop:8}}>
            👁 = visible in dropdowns · 🚫 = hidden but kept · ✕ = permanently deleted
          </p>
        </div>
      ))}
    </div>
  )
}
