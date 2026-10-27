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
  const [loading, setLoading] = useState(true)
  const [alert, setAlert] = useState(null)
  const [edit, setEdit] = useState(null)     // { id, start, end } — admin fixing one cycle's dates

  const show = (msg, type='success') => { setAlert({ msg, type }); setTimeout(()=>setAlert(null), 4000) }

  useEffect(() => { if (selected) load() }, [selected])
  async function load() {
    setLoading(true)
    try {
      const c = await api.get('/cycles', { params:{ semester: selected._id } })
      setCycles(c.data.cycles)
    } catch (e) { show(e.response?.data?.message || 'Failed to load', 'error') }
    finally { setLoading(false) }
  }

  const ymdOf = (d) => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}` }
  async function saveDates() {
    try { await api.patch(`/cycles/${edit.id}`, { startDate: edit.start, endDate: edit.end }); show('Dates saved.'); setEdit(null); load() }
    catch (e) { show(e.response?.data?.message || 'Failed', 'error') }
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
        <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
          <select style={{ ...ui.input, width:'auto' }} value={selected?._id||''}
            onChange={e=>setSelected(semesters.find(s=>s._id===e.target.value))}>
            {semesters.map(s => <option key={s._id} value={s._id}>{s.name}{s.status==='active'?' (active)':''}</option>)}
          </select>
          <Link to="/plans"><button style={{ ...ui.btnGhost, whiteSpace:'nowrap' }}>📅 All class plans</button></Link>
          {isAdmin && <Link to="/planner"><button style={ui.btnGold}>+ Plan new cycles (calendar)</button></Link>}
        </div>
      </div>
      <div style={{ height:16 }} />
      <Alert alert={alert} />

      {loading ? <div style={{ color:'var(--muted)' }}>Loading…</div>
        : cycles.length === 0 ? <Empty icon="🔄" title="No cycles yet" hint={isAdmin?'Plan the first cycles with the calendar planner.':'No cycles for your batches yet.'} />
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
                      {edit?.id === c._id ? (
                        <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap', marginTop:6 }}>
                          <input style={{ ...ui.input, width:160 }} type="date" value={edit.start} onChange={e=>setEdit({ ...edit, start:e.target.value })} />
                          → <input style={{ ...ui.input, width:160 }} type="date" value={edit.end} onChange={e=>setEdit({ ...edit, end:e.target.value })} />
                          <button style={ui.btn} onClick={saveDates}>Save</button>
                          <button style={ui.btnGhost} onClick={()=>setEdit(null)}>Cancel</button>
                          <span style={ui.sub}>Planned classes keep their dates — move them on the Class plans page if needed.</span>
                        </div>
                      ) : (
                        <div style={{ ...ui.sub, marginTop:4 }}>{fmt(c.startDate)} → {fmt(c.endDate)}{c.batch?.track?` · ${c.batch.track}`:''}
                          {isAdmin && c.status !== 'closed' && <button style={{ ...ui.btnGhost, marginLeft:8, padding:'2px 8px' }} onClick={()=>setEdit({ id:c._id, start:ymdOf(c.startDate), end:ymdOf(c.endDate) })}>Edit dates</button>}</div>
                      )}
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
