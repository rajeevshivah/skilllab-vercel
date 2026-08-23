import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'
import { useAuth } from '../context/AuthContext'
import { useSemester } from '../context/SemesterContext'
import { ui, Alert, Empty } from '../components/ui'

export default function BatchesPage() {
  const { user } = useAuth()
  const { semesters, selected, setSelected } = useSemester()
  const isAdmin = user?.role === 'superadmin'

  const [batches, setBatches] = useState([])
  const [trainers, setTrainers] = useState([])
  const [loading, setLoading] = useState(true)
  const [alert, setAlert] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)

  const blank = { name:'', composition:'', track:'', trainers:[], copyPlanFrom:'' }
  const [form, setForm] = useState(blank)

  const show = (msg, type='success') => { setAlert({ msg, type }); setTimeout(()=>setAlert(null), 3500) }

  useEffect(() => { if (selected) load() }, [selected])

  async function load() {
    setLoading(true)
    try {
      // Superadmin sees every batch in the selected semester.
      // Trainers/co-trainers see ONLY the batches they are assigned to (active semester).
      const { data } = isAdmin
        ? await api.get('/batches', { params:{ semester: selected._id } })
        : await api.get('/batches/mine')
      setBatches(data.batches)
      if (isAdmin) {
        const u = await api.get('/auth/users')
        setTrainers(u.data.users.filter(x => x.isActive))
      }
    } catch (e) { show(e.response?.data?.message || 'Failed to load', 'error') }
    finally { setLoading(false) }
  }

  function openCreate() { setEditing(null); setForm(blank); setShowForm(true) }
  function openEdit(b) {
    setEditing(b._id)
    setForm({ name:b.name, composition:b.composition||'', track:b.track||'', trainers:(b.trainers||[]).map(t=>t._id), copyPlanFrom:'' })
    setShowForm(true)
  }

  function toggleTrainer(id) {
    setForm(f => ({ ...f, trainers: f.trainers.includes(id) ? f.trainers.filter(x=>x!==id) : [...f.trainers, id] }))
  }

  async function save() {
    if (!form.name.trim()) return show('Batch name required', 'error')
    try {
      if (editing) {
        await api.patch(`/batches/${editing}`, { name:form.name, composition:form.composition, track:form.track, trainers:form.trainers })
        show('Batch updated.')
      } else {
        await api.post('/batches', { ...form, semester: selected._id })
        show('Batch created.')
      }
      setShowForm(false); load()
    } catch (e) { show(e.response?.data?.message || 'Failed', 'error') }
  }

  async function remove(b) {
    if (!confirm(`Delete "${b.name}" and ALL its students, plan, logs and toppers? This cannot be undone.`)) return
    try { await api.delete(`/batches/${b._id}`); show('Batch deleted.'); load() }
    catch (e) { show(e.response?.data?.message || 'Failed', 'error') }
  }

  return (
    <div style={ui.wrap}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', flexWrap:'wrap', gap:12, marginBottom:8 }}>
        <div>
          <h1 style={ui.h1}>Batches</h1>
          <p style={ui.sub}>A batch is one training group — one section, merged sections, or a track pool.</p>
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <select style={{ ...ui.input, width:'auto' }} value={selected?._id||''}
            onChange={e=>setSelected(semesters.find(s=>s._id===e.target.value))}>
            {semesters.map(s => <option key={s._id} value={s._id}>{s.name}{s.status==='active'?' (active)':''}</option>)}
          </select>
          {isAdmin && <button style={ui.btnGold} onClick={openCreate}>+ New Batch</button>}
        </div>
      </div>
      <div style={{ height:16 }} />
      <Alert alert={alert} />

      {showForm && (
        <div style={{ ...ui.card, marginBottom:20 }}>
          <h2 style={ui.h2}>{editing ? 'Edit batch' : 'Create batch'}</h2>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:14 }}>
            <div><label style={ui.label}>Batch name</label>
              <input style={ui.input} placeholder="BTech 3rd Sem Combined" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} /></div>
            <div><label style={ui.label}>Track (optional)</label>
              <input style={ui.input} placeholder="C++ / MERN / Spring Boot / Data Analysis" value={form.track} onChange={e=>setForm({...form,track:e.target.value})} /></div>
            <div style={{ gridColumn:'1 / -1' }}><label style={ui.label}>Composition (who's in it)</label>
              <input style={ui.input} placeholder="BTech 3rd Sem Sec A + Sec B" value={form.composition} onChange={e=>setForm({...form,composition:e.target.value})} /></div>
          </div>

          <div style={{ marginTop:16 }}>
            <label style={ui.label}>Assign trainers</label>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
              {trainers.length === 0 && <span style={ui.sub}>No trainers yet — create them under Users.</span>}
              {trainers.map(t => (
                <button key={t._id} onClick={()=>toggleTrainer(t._id)}
                  style={{ ...ui.btnGhost, background: form.trainers.includes(t._id) ? 'var(--blue)' : 'rgba(255,255,255,0.06)', color: form.trainers.includes(t._id) ? '#fff':'rgba(255,255,255,0.8)', border:'1px solid rgba(255,255,255,0.12)' }}>
                  {t.name} <span style={{ opacity:0.6, fontSize:11 }}>({t.role})</span>
                </button>
              ))}
            </div>
          </div>

          {!editing && (
            <div style={{ marginTop:16, maxWidth:360 }}>
              <label style={ui.label}>Copy plan from (optional)</label>
              <select style={ui.input} value={form.copyPlanFrom} onChange={e=>setForm({...form,copyPlanFrom:e.target.value})}>
                <option value="">— start with empty plan —</option>
                {batches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
              </select>
            </div>
          )}

          <div style={{ display:'flex', gap:10, marginTop:18 }}>
            <button style={ui.btn} onClick={save}>{editing?'Save changes':'Create batch'}</button>
            <button style={ui.btnGhost} onClick={()=>setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? <div style={{ color:'var(--muted)' }}>Loading…</div>
        : batches.length === 0 ? <Empty icon="🗂️" title="No batches in this semester" hint={isAdmin?'Create your first batch above.':''} />
        : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:14 }}>
            {batches.map(b => (
              <div key={b._id} style={ui.card}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
                  <div>
                    <div style={{ fontSize:16, fontWeight:700 }}>{b.name}</div>
                    {b.track && <span style={{ ...ui.pill('rgba(37,99,235,0.18)','#93C5FD'), marginTop:6 }}>{b.track}</span>}
                  </div>
                </div>
                {b.composition && <div style={{ ...ui.sub, marginTop:8 }}>{b.composition}</div>}
                <div style={{ ...ui.sub, marginTop:10 }}>
                  Trainers: {(b.trainers||[]).map(t=>t.name).join(', ') || <span style={{ color:'var(--danger)' }}>none assigned</span>}
                </div>
                <div style={{ display:'flex', gap:8, marginTop:14, flexWrap:'wrap' }}>
                  <Link to={`/batch/${b._id}`}><button style={ui.btn}>Open</button></Link>
                  {isAdmin && <button style={ui.btnGhost} onClick={()=>openEdit(b)}>Edit</button>}
                  {isAdmin && <button style={ui.btnDanger} onClick={()=>remove(b)}>Delete</button>}
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  )
}
