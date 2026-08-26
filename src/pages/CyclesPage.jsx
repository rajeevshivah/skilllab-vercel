import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'
import { useAuth } from '../context/AuthContext'
import { useSemester } from '../context/SemesterContext'
import { ui, Alert, Empty } from '../components/ui'

const STATUS_PILL = {
  'active':      ['rgba(37,99,235,0.18)', '#93C5FD', 'Active'],
  'report-open': ['rgba(245,158,11,0.18)', '#FCD34D', 'Report open'],
  'closed':      ['rgba(107,114,128,0.2)', '#9CA3AF', 'Closed'],
}

export default function CyclesPage() {
  const { user } = useAuth()
  const { semesters, selected, setSelected } = useSemester()
  const isAdmin = user?.role === 'superadmin'
  const [cycles, setCycles] = useState([])
  const [batches, setBatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [alert, setAlert] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [multi, setMulti] = useState(false)                // multi-batch mode
  const [pickedBatches, setPickedBatches] = useState([])   // for multi mode
  const blank = { batch:'', number:'', name:'', startDate:'', endDate:'' }
  const [form, setForm] = useState(blank)

  const show = (msg, type='success') => { setAlert({ msg, type }); setTimeout(()=>setAlert(null), 4000) }

  useEffect(() => { if (selected) load() }, [selected])
  async function load() {
    setLoading(true)
    try {
      const c = await api.get('/cycles', { params:{ semester: selected._id } })
      setCycles(c.data.cycles)
      if (isAdmin) {
        const b = await api.get('/batches', { params:{ semester: selected._id } })
        setBatches(b.data.batches)
      }
    } catch (e) { show(e.response?.data?.message || 'Failed to load', 'error') }
    finally { setLoading(false) }
  }

  async function pickBatch(batchId) {
    setForm(f => ({ ...f, batch: batchId, number:'' }))
    if (batchId) {
      try { const { data } = await api.get('/cycles/next-number', { params:{ batch: batchId } }); setForm(f => ({ ...f, number: String(data.next) })) }
      catch { /* ignore */ }
    }
  }

  async function create() {
    if (!form.batch || !form.startDate || !form.endDate) return show('Batch, start and end dates required', 'error')
    try {
      await api.post('/cycles', { ...form, number: form.number ? parseInt(form.number) : undefined })
      show('Cycle created.'); setForm(blank); setShowForm(false); load()
    } catch (e) { show(e.response?.data?.message || 'Failed', 'error') }
  }

  function toggleBatch(id) {
    setPickedBatches(p => p.includes(id) ? p.filter(x=>x!==id) : [...p, id])
  }
  async function createMulti() {
    if (!pickedBatches.length || !form.startDate || !form.endDate) return show('Pick batches and dates', 'error')
    try {
      const { data } = await api.post('/cycles/bulk', {
        batches: pickedBatches, name: form.name, startDate: form.startDate, endDate: form.endDate,
      })
      let msg = `Created ${data.createdCount} cycle(s).`
      if (data.skippedCount) msg += ` Skipped ${data.skippedCount}: ` + data.skipped.map(s=>`${s.name||'?'} (${s.reason})`).join(', ')
      show(msg, data.skippedCount ? 'error' : 'success')
      setForm(blank); setPickedBatches([]); setShowForm(false); load()
    } catch (e) { show(e.response?.data?.message || 'Failed', 'error') }
  }
  async function openReport(c) {
    try { await api.post(`/cycles/${c._id}/open`); show('Report opened for trainers.'); load() }
    catch (e) { show(e.response?.data?.message || 'Failed', 'error') }
  }
  async function closeCycle(c) {
    if (!confirm(`Close ${cLabel(c)}? Its numbers will be frozen into the report.`)) return
    try { await api.post(`/cycles/${c._id}/close`); show('Cycle closed and report frozen.'); load() }
    catch (e) { show(e.response?.data?.message || 'Failed', 'error') }
  }
  async function remove(c) {
    if (!confirm(`Delete ${cLabel(c)}? This removes its report too.`)) return
    try { await api.delete(`/cycles/${c._id}`); show('Deleted.'); load() }
    catch (e) { show(e.response?.data?.message || 'Failed', 'error') }
  }

  const cLabel = (c) => `Cycle ${c.number}${c.name ? ` · ${c.name}` : ''}`
  const fmt = (d) => new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short' })

  return (
    <div style={ui.wrap}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', flexWrap:'wrap', gap:12, marginBottom:8 }}>
        <div>
          <h1 style={ui.h1}>Cycles</h1>
          <p style={ui.sub}>Each batch runs its own cycles (2–4 weeks). Cycle numbers are per batch.</p>
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <select style={{ ...ui.input, width:'auto' }} value={selected?._id||''}
            onChange={e=>setSelected(semesters.find(s=>s._id===e.target.value))}>
            {semesters.map(s => <option key={s._id} value={s._id}>{s.name}{s.status==='active'?' (active)':''}</option>)}
          </select>
          {isAdmin && <button style={ui.btnGold} onClick={()=>{ setShowForm(v=>!v); setForm(blank) }}>+ New Cycle</button>}
        </div>
      </div>
      <div style={{ height:16 }} />
      <Alert alert={alert} />

      {showForm && isAdmin && (
        <div style={{ ...ui.card, marginBottom:20 }}>
          <div style={{ display:'flex', gap:8, marginBottom:14 }}>
            <button style={{ ...ui.btnGhost, background: !multi?'var(--blue)':'rgba(255,255,255,0.06)', color: !multi?'#fff':'rgba(255,255,255,0.8)' }} onClick={()=>setMulti(false)}>One batch</button>
            <button style={{ ...ui.btnGhost, background: multi?'var(--blue)':'rgba(255,255,255,0.06)', color: multi?'#fff':'rgba(255,255,255,0.8)' }} onClick={()=>setMulti(true)}>Multiple batches (same dates)</button>
          </div>

          {!multi ? (
            <>
              <h2 style={ui.h2}>Create cycle</h2>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:12 }}>
                <div><label style={ui.label}>Batch</label>
                  <select style={ui.input} value={form.batch} onChange={e=>pickBatch(e.target.value)}>
                    <option value="">— select batch —</option>
                    {batches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                  </select></div>
                <div><label style={ui.label}>Cycle number</label>
                  <input style={ui.input} type="number" value={form.number} onChange={e=>setForm({...form,number:e.target.value})} placeholder="auto" /></div>
                <div><label style={ui.label}>Name (optional)</label>
                  <input style={ui.input} value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="e.g. React basics" /></div>
                <div><label style={ui.label}>Start date</label>
                  <input style={ui.input} type="date" value={form.startDate} onChange={e=>setForm({...form,startDate:e.target.value})} /></div>
                <div><label style={ui.label}>End date</label>
                  <input style={ui.input} type="date" value={form.endDate} onChange={e=>setForm({...form,endDate:e.target.value})} /></div>
              </div>
              <p style={{ ...ui.sub, marginTop:8 }}>Number is auto-suggested for the chosen batch — override if needed. Dates can't overlap another cycle in the same batch (a cycle ending the 24th means the next starts the 25th).</p>
              <div style={{ display:'flex', gap:10, marginTop:14 }}>
                <button style={ui.btn} onClick={create}>Create cycle</button>
                <button style={ui.btnGhost} onClick={()=>setShowForm(false)}>Cancel</button>
              </div>
            </>
          ) : (
            <>
              <h2 style={ui.h2}>Create cycle for multiple batches</h2>
              <p style={{ ...ui.sub, marginBottom:12 }}>Same dates applied to each selected batch. Each batch gets its own next cycle number automatically (e.g. Cycle 3 for a 3rd-year batch, Cycle 1 for a 1st-year batch). Any batch that already has a cycle on these dates is skipped.</p>
              <label style={ui.label}>Select batches</label>
              <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:14 }}>
                {batches.length === 0 && <span style={ui.sub}>No batches in this semester.</span>}
                {batches.map(b => (
                  <button key={b._id} onClick={()=>toggleBatch(b._id)}
                    style={{ ...ui.btnGhost,
                      background: pickedBatches.includes(b._id) ? 'var(--blue)' : 'rgba(255,255,255,0.06)',
                      color: pickedBatches.includes(b._id) ? '#fff' : 'rgba(255,255,255,0.8)' }}>
                    {pickedBatches.includes(b._id) ? '✓ ' : ''}{b.name}{b.track?` (${b.track})`:''}
                  </button>
                ))}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:12 }}>
                <div><label style={ui.label}>Name (optional)</label>
                  <input style={ui.input} value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="applies to all" /></div>
                <div><label style={ui.label}>Start date</label>
                  <input style={ui.input} type="date" value={form.startDate} onChange={e=>setForm({...form,startDate:e.target.value})} /></div>
                <div><label style={ui.label}>End date</label>
                  <input style={ui.input} type="date" value={form.endDate} onChange={e=>setForm({...form,endDate:e.target.value})} /></div>
              </div>
              <div style={{ display:'flex', gap:10, marginTop:14 }}>
                <button style={ui.btn} onClick={createMulti}>Create for {pickedBatches.length} batch{pickedBatches.length===1?'':'es'}</button>
                <button style={ui.btnGhost} onClick={()=>setShowForm(false)}>Cancel</button>
              </div>
            </>
          )}
        </div>
      )}

      {loading ? <div style={{ color:'var(--muted)' }}>Loading…</div>
        : cycles.length === 0 ? <Empty icon="🔄" title="No cycles yet" hint={isAdmin?'Create the first cycle for a batch.':'No cycles for your batches yet.'} />
        : (
          <div style={{ display:'grid', gap:12 }}>
            {cycles.map(c => {
              const [bg,fg,label] = STATUS_PILL[c.status] || STATUS_PILL['active']
              return (
                <div key={c._id} style={ui.card}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:10 }}>
                    <div>
                      <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                        <span style={{ fontSize:16, fontWeight:700 }}>{c.batch?.name} — {cLabel(c)}</span>
                        <span style={ui.pill(bg,fg)}>{label}</span>
                        {c.report?.submitted && <span style={ui.pill('rgba(22,163,74,0.18)','#86EFAC')}>Report filled</span>}
                      </div>
                      <div style={{ ...ui.sub, marginTop:4 }}>{fmt(c.startDate)} → {fmt(c.endDate)}{c.batch?.track?` · ${c.batch.track}`:''}</div>
                    </div>
                    <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                      <Link to={`/cycle/${c._id}`}><button style={ui.btn}>{c.status==='closed' ? 'View report' : 'Open report form'}</button></Link>
                      <Link to={`/cycle/${c._id}/plan`}><button style={ui.btnGhost}>Plan</button></Link>
                      <Link to={`/cycle/${c._id}/marks`}><button style={ui.btnGhost}>Marks</button></Link>
                      {isAdmin && c.status==='active' && <button style={ui.btnGhost} onClick={()=>openReport(c)}>Open for trainers</button>}
                      {isAdmin && c.status==='report-open' && <button style={ui.btnGold} onClick={()=>closeCycle(c)}>Close & freeze</button>}
                      {isAdmin && c.status==='closed' && <button style={ui.btnGhost} onClick={()=>openReport(c)}>Reopen</button>}
                      {isAdmin && <button style={ui.btnDanger} onClick={()=>remove(c)}>Delete</button>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
    </div>
  )
}
