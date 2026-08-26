import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../api'
import { useAuth } from '../context/AuthContext'
import { ui, Alert } from '../components/ui'

export default function CyclePlanPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const [cycle, setCycle] = useState(null)
  const [trainers, setTrainers] = useState([])
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [alert, setAlert] = useState(null)
  const show = (msg, type='success') => { setAlert({ msg, type }); setTimeout(()=>setAlert(null), 3500) }

  useEffect(() => { load() }, [id])
  async function load() {
    setLoading(true)
    try {
      const { data } = await api.get(`/cycleplans/${id}`)
      setCycle(data.cycle); setTrainers(data.trainers)
      setClasses((data.classes || []).map(c => ({
        number: c.number, title: c.title||'', notes: c.notes||'',
        trainer: c.trainer?._id || c.trainer || '', date: c.date||'', time: c.time||'',
      })))
    } catch (e) { show(e.response?.data?.message || 'Failed to load', 'error') }
    finally { setLoading(false) }
  }

  const myId = user?.id || user?._id
  const canEdit = user?.role === 'superadmin'
    || (trainers || []).some(t => (t._id || t) === myId)

  function addClass() {
    setClasses(cs => [...cs, { number: cs.length+1, title:'', notes:'', trainer:'', date:'', time:'' }])
  }
  function update(i, field, value) {
    setClasses(cs => cs.map((c,idx) => idx===i ? { ...c, [field]: value } : c))
  }
  function removeClass(i) {
    setClasses(cs => cs.filter((_,idx)=>idx!==i).map((c,idx)=>({ ...c, number: idx+1 })))
  }
  function move(i, dir) {
    setClasses(cs => {
      const j = i + dir
      if (j < 0 || j >= cs.length) return cs
      const copy = [...cs]; [copy[i], copy[j]] = [copy[j], copy[i]]
      return copy.map((c,idx)=>({ ...c, number: idx+1 }))
    })
  }

  async function save() {
    setSaving(true)
    try {
      await api.put(`/cycleplans/${id}`, { classes: classes.map((c,i)=>({
        number: i+1, title: c.title, notes: c.notes,
        trainer: c.trainer || null, date: c.date, time: c.time,
      })) })
      show('Plan saved.'); load()
    } catch (e) { show(e.response?.data?.message || 'Failed to save', 'error') }
    finally { setSaving(false) }
  }

  if (loading) return <div style={{ ...ui.wrap, color:'var(--muted)' }}>Loading…</div>
  if (!cycle)  return <div style={{ ...ui.wrap, color:'var(--muted)' }}>Cycle not found.</div>

  return (
    <div style={ui.wrap}>
      <Link to="/cycles" style={{ ...ui.sub, color:'var(--blue)' }}>← All cycles</Link>
      <div style={{ marginTop:8, marginBottom:6 }}>
        <h1 style={ui.h1}>{cycle.batch?.name} — Cycle {cycle.number} · Plan</h1>
        <p style={ui.sub}>Lay out the classes for this cycle — add one row per class. Trainers can fill this in the planning meeting.</p>
      </div>

      <Alert alert={alert} />

      {classes.length === 0 && (
        <div style={{ ...ui.card, textAlign:'center', color:'var(--muted)' }}>
          No classes planned yet.{canEdit ? ' Add the first class below.' : ''}
        </div>
      )}

      <div style={{ display:'grid', gap:12, marginTop:14 }}>
        {classes.map((c, i) => (
          <div key={i} style={ui.card}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
              <span style={{ fontWeight:700, fontSize:15 }}>Class {i+1}</span>
              {canEdit && <div style={{ display:'flex', gap:6 }}>
                <button style={ui.btnGhost} onClick={()=>move(i,-1)} disabled={i===0}>↑</button>
                <button style={ui.btnGhost} onClick={()=>move(i,1)} disabled={i===classes.length-1}>↓</button>
                <button style={ui.btnDanger} onClick={()=>removeClass(i)}>Remove</button>
              </div>}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:10 }}>
              <div style={{ gridColumn:'1 / -1' }}>
                <label style={ui.label}>Title</label>
                <input style={ui.input} disabled={!canEdit} value={c.title} onChange={e=>update(i,'title',e.target.value)} placeholder="e.g. React useState & props" />
              </div>
              <div><label style={ui.label}>Trainer</label>
                <select style={ui.input} disabled={!canEdit} value={c.trainer} onChange={e=>update(i,'trainer',e.target.value)}>
                  <option value="">—</option>
                  {trainers.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                </select>
              </div>
              <div><label style={ui.label}>Date</label>
                <input style={ui.input} type="date" disabled={!canEdit} value={c.date} onChange={e=>update(i,'date',e.target.value)} /></div>
              <div><label style={ui.label}>Time</label>
                <input style={ui.input} type="time" disabled={!canEdit} value={c.time} onChange={e=>update(i,'time',e.target.value)} /></div>
              <div style={{ gridColumn:'1 / -1' }}>
                <label style={ui.label}>Notes (what to cover)</label>
                <textarea style={{ ...ui.input, minHeight:60, resize:'vertical' }} disabled={!canEdit} value={c.notes} onChange={e=>update(i,'notes',e.target.value)} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {canEdit && (
        <div style={{ display:'flex', gap:10, marginTop:16, flexWrap:'wrap' }}>
          <button style={ui.btnGhost} onClick={addClass}>+ Add class</button>
          <button style={ui.btnGold} disabled={saving} onClick={save}>{saving?'Saving…':'Save plan'}</button>
        </div>
      )}
    </div>
  )
}
