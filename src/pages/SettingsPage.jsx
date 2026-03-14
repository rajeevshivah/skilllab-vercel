import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from './api-helper'

const TYPES = [
  { key:'stream',  label:'Streams / Labs',  icon:'🔬', hint:'e.g. AI / ML, MERN Stack' },
  { key:'course',  label:'Courses',          icon:'🎓', hint:'e.g. B.Tech, BCA' },
  { key:'section', label:'Sections',         icon:'🏫', hint:'e.g. Sec A, F104' },
  { key:'sem',     label:'Semesters',        icon:'📅', hint:'e.g. 2nd Sem, 4th Sem' },
  { key:'year',    label:'Years',            icon:'📆', hint:'e.g. 1st Year, 2nd Year' },
  { key:'cycle',   label:'Cycles',           icon:'🔄', hint:'e.g. Cycle 1, Cycle 2' },
]

const S = {
  page:    { maxWidth:900, margin:'0 auto', padding:'40px 24px' },
  card:    { background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:16, padding:24, marginBottom:20 },
  hdr:     { display:'flex', alignItems:'center', gap:10, marginBottom:16, paddingBottom:12, borderBottom:'1px solid rgba(255,255,255,0.07)' },
  hdrIcon: { fontSize:22 },
  hdrTitle:{ fontFamily:'var(--font-d)', fontSize:17, fontWeight:700 },
  hdrHint: { fontSize:12, color:'var(--muted)', marginLeft:'auto' },
  grid:    { display:'flex', flexWrap:'wrap', gap:8, marginBottom:14 },
  chip:    (active) => ({
    display:'inline-flex', alignItems:'center', gap:6,
    padding:'6px 12px', borderRadius:8, fontSize:13, fontWeight:500,
    background: active ? 'rgba(37,99,235,0.2)' : 'rgba(255,255,255,0.04)',
    border: `1px solid ${active ? 'rgba(37,99,235,0.4)' : 'rgba(255,255,255,0.08)'}`,
    color: active ? '#93C5FD' : 'rgba(255,255,255,0.35)',
    transition:'all 0.15s',
  }),
  chipBtn: { background:'none', border:'none', cursor:'pointer', padding:'0 2px', fontSize:11, color:'inherit', lineHeight:1 },
  addRow:  { display:'flex', gap:8, marginTop:4 },
  input:   { flex:1, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'white', padding:'8px 12px', borderRadius:8, fontSize:13, outline:'none', fontFamily:'var(--font-b)' },
  addBtn:  { padding:'8px 18px', background:'var(--blue)', color:'white', border:'none', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer' },
}

// ── Active Cycle Manager ─────────────────────────────────────────
function ActiveCycleManager({ config, onSaved }) {
  const CYCLES = (config['cycle'] || []).filter(c => c.isActive).map(c => c.value)
  const active = config['activeCycle'] || []

  // We support two entries: one for all courses, one for 1st year (different cycle)
  const mainActive  = active.find(a => a.order === 0) || { value: '', label: '' }
  const yearActive  = active.find(a => a.order === 1) || { value: '', label: '' }

  const [main,  setMain]  = useState({ cycle: mainActive.value, endDate: mainActive.label, id: mainActive._id })
  const [year1, setYear1] = useState({ cycle: yearActive.value, endDate: yearActive.label, id: yearActive._id })
  const [saving, setSaving] = useState(false)
  const token = localStorage.getItem('sl_token')

  async function save() {
    setSaving(true)
    try {
      const headers = { 'Content-Type':'application/json', Authorization:`Bearer ${token}` }
      // Save/update main active cycle
      if (main.id) {
        await fetch('/api/config', { method:'PATCH', headers, body: JSON.stringify({ id: main.id, value: main.cycle, label: main.endDate }) })
      } else {
        await fetch('/api/config', { method:'POST', headers, body: JSON.stringify({ type:'activeCycle', value: main.cycle, label: main.endDate, order: 0 }) })
      }
      // Save/update 1st year cycle if set
      if (year1.cycle) {
        if (year1.id) {
          await fetch('/api/config', { method:'PATCH', headers, body: JSON.stringify({ id: year1.id, value: year1.cycle, label: year1.endDate }) })
        } else {
          await fetch('/api/config', { method:'POST', headers, body: JSON.stringify({ type:'activeCycle', value: year1.cycle, label: year1.endDate, order: 1 }) })
        }
      }
      onSaved()
    } catch(e) { alert('Failed to save') }
    finally { setSaving(false) }
  }

  const iS = { background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',color:'white',padding:'9px 12px',borderRadius:8,fontSize:13,outline:'none' }
  const lS = { display:'block',fontSize:11,fontWeight:600,letterSpacing:'0.06em',textTransform:'uppercase',color:'rgba(255,255,255,0.4)',marginBottom:5 }

  return (
    <div style={{background:'rgba(234,179,8,0.06)',border:'1px solid rgba(234,179,8,0.2)',borderRadius:16,padding:24,marginBottom:20}}>
      <div style={{marginBottom:16,paddingBottom:12,borderBottom:'1px solid rgba(234,179,8,0.15)'}}>
        <p style={{fontFamily:'var(--font-d)',fontSize:17,fontWeight:700,margin:0}}>🏆 Active Cycle on Hall of Fame</p>
        <p style={{fontSize:12,color:'var(--muted)',margin:'4px 0 0'}}>Set which cycle visitors see by default. End date is shown as info on the page.</p>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:16}}>
        <div style={{background:'rgba(255,255,255,0.03)',borderRadius:12,padding:16,border:'1px solid rgba(255,255,255,0.06)'}}>
          <p style={{fontSize:13,fontWeight:600,marginBottom:12,color:'#93C5FD'}}>All Courses (default)</p>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <div>
              <label style={lS}>Active Cycle</label>
              <select style={{...iS,width:'100%'}} value={main.cycle} onChange={e=>setMain(m=>({...m,cycle:e.target.value}))}>
                <option value="" style={{background:'#0A1628'}}>Select cycle</option>
                {CYCLES.map(c=><option key={c} value={c} style={{background:'#0A1628'}}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={lS}>End Date</label>
              <input style={{...iS,width:'100%'}} placeholder="e.g. 27 March 2026" value={main.endDate}
                onChange={e=>setMain(m=>({...m,endDate:e.target.value}))} />
            </div>
          </div>
        </div>

        <div style={{background:'rgba(255,255,255,0.03)',borderRadius:12,padding:16,border:'1px solid rgba(255,255,255,0.06)'}}>
          <p style={{fontSize:13,fontWeight:600,marginBottom:12,color:'#86EFAC'}}>1st Year Students (if different)</p>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <div>
              <label style={lS}>Active Cycle</label>
              <select style={{...iS,width:'100%'}} value={year1.cycle} onChange={e=>setYear1(m=>({...m,cycle:e.target.value}))}>
                <option value="" style={{background:'#0A1628'}}>Same as above</option>
                {CYCLES.map(c=><option key={c} value={c} style={{background:'#0A1628'}}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={lS}>End Date</label>
              <input style={{...iS,width:'100%'}} placeholder="e.g. 27 March 2026" value={year1.endDate}
                onChange={e=>setYear1(m=>({...m,endDate:e.target.value}))} />
            </div>
          </div>
        </div>
      </div>

      <button onClick={save} disabled={saving}
        style={{padding:'10px 24px',background:'rgba(234,179,8,0.2)',border:'1px solid rgba(234,179,8,0.4)',
          color:'var(--gold)',borderRadius:10,fontSize:13,fontWeight:600,cursor:'pointer',opacity:saving?0.7:1}}>
        {saving ? 'Saving…' : '💾 Save Active Cycle Settings'}
      </button>
    </div>
  )
}

export default function SettingsPage() {
  const { isSuperAdmin } = useAuth()
  const navigate = useNavigate()
  const [config,  setConfig]  = useState({})
  const [loading, setLoading] = useState(true)
  const [inputs,  setInputs]  = useState({}) // { stream: '', course: '', ... }
  const [alert,   setAlert]   = useState(null)
  const [saving,  setSaving]  = useState({})

  useEffect(() => {
    if (!isSuperAdmin) { navigate('/'); return }
    fetchConfig()
  }, [])

  async function fetchConfig() {
    try {
      const { data } = await api.get('/api/config?all=1')
      setConfig(data.config)
    } catch { showAlert('Failed to load config', 'error') }
    finally { setLoading(false) }
  }

  async function addItem(type) {
    const value = (inputs[type] || '').trim()
    if (!value) return
    setSaving(s => ({ ...s, [type]: true }))
    try {
      const { data } = await api.post('/api/config', { type, value })
      setConfig(c => ({ ...c, [type]: [...(c[type] || []), data.item].sort((a,b) => a.value.localeCompare(b.value)) }))
      setInputs(i => ({ ...i, [type]: '' }))
      showAlert(`"${value}" added to ${type}s`, 'success')
    } catch (err) { showAlert(err.response?.data?.message || 'Failed', 'error') }
    finally { setSaving(s => ({ ...s, [type]: false })) }
  }

  async function toggleItem(item) {
    try {
      const { data } = await api.patch('/api/config', { id: item._id, isActive: !item.isActive })
      setConfig(c => {
        const updated = { ...c }
        updated[item.type] = updated[item.type].map(i => i._id === item._id ? { ...i, isActive: data.item.isActive } : i)
        return updated
      })
    } catch { showAlert('Failed to update', 'error') }
  }

  async function deleteItem(item) {
    if (!confirm(`Permanently delete "${item.value}"? This cannot be undone.`)) return
    try {
      await api.delete('/api/config', { data: { id: item._id } })
      setConfig(c => {
        const updated = { ...c }
        updated[item.type] = updated[item.type].filter(i => i._id !== item._id)
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
        <p style={{fontSize:13,color:'var(--muted)',marginTop:4}}>Manage dropdown options — no code changes needed</p>
      </div>

      <ActiveCycleManager config={config} onSaved={fetchConfig} />

      {alert && (
        <div style={{padding:'12px 16px',borderRadius:10,fontSize:13,marginBottom:20,
          background:alert.type==='success'?'rgba(22,163,74,0.15)':'rgba(220,38,38,0.15)',
          border:`1px solid ${alert.type==='success'?'rgba(22,163,74,0.3)':'rgba(220,38,38,0.3)'}`,
          color:alert.type==='success'?'#86EFAC':'#FCA5A5'}}>
          {alert.msg}
        </div>
      )}

      {TYPES.map(({ key, label, icon, hint }) => (
        <div key={key} style={S.card}>
          <div style={S.hdr}>
            <span style={S.hdrIcon}>{icon}</span>
            <span style={S.hdrTitle}>{label}</span>
            <span style={S.hdrHint}>{hint}</span>
          </div>

          <div style={S.grid}>
            {(config[key] || []).map(item => (
              <div key={item._id} style={S.chip(item.isActive)}>
                <span>{item.value}</span>
                <button style={S.chipBtn} title={item.isActive ? 'Deactivate' : 'Activate'} onClick={() => toggleItem({...item, type: key})}>
                  {item.isActive ? '👁' : '🚫'}
                </button>
                <button style={{...S.chipBtn, color:'#FCA5A5'}} title="Delete permanently" onClick={() => deleteItem({...item, type: key})}>
                  ✕
                </button>
              </div>
            ))}
            {(config[key] || []).length === 0 && (
              <span style={{fontSize:12,color:'var(--muted)'}}>No items yet</span>
            )}
          </div>

          <div style={S.addRow}>
            <input
              style={S.input}
              placeholder={`Add new ${key}… (${hint})`}
              value={inputs[key] || ''}
              onChange={e => setInputs(i => ({ ...i, [key]: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && addItem(key)}
            />
            <button style={S.addBtn} onClick={() => addItem(key)} disabled={saving[key]}>
              {saving[key] ? '…' : '+ Add'}
            </button>
          </div>

          <p style={{fontSize:11,color:'rgba(255,255,255,0.2)',marginTop:8}}>
            👁 = visible in dropdowns &nbsp;·&nbsp; 🚫 = hidden but kept &nbsp;·&nbsp; ✕ = permanently deleted
          </p>
        </div>
      ))}
    </div>
  )
}
