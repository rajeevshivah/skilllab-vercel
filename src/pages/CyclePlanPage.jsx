import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../api'
import { useAuth } from '../context/AuthContext'
import { ui, Alert } from '../components/ui'
import PageHelp from '../components/PageHelp'
import { useOrg } from '../context/OrgContext'

export default function CyclePlanPage() {
  const { brand } = useOrg()
  const { id } = useParams()
  const { user } = useAuth()
  const [cycle, setCycle] = useState(null)
  const [trainers, setTrainers] = useState([])
  const [classes, setClasses] = useState([])
  const [lock, setLock] = useState({ planOpen: false, canEdit: false })
  const [version, setVersion] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [alert, setAlert] = useState(null)
  const show = (msg, type='success') => { setAlert({ msg, type }); setTimeout(()=>setAlert(null), 3500) }

  useEffect(() => { load() }, [id])
  async function load() {
    setLoading(true)
    try {
      const { data } = await api.get(`/cycleplans/${id}`)
      setCycle(data.cycle); setTrainers(data.trainers); setLock({ planOpen: !!data.planOpen, canEdit: !!data.canEdit }); setVersion(data.version ?? null)
      setClasses((data.classes || []).map(c => ({
        number: c.number, title: c.title||'', notes: c.notes||'',
        trainer: c.trainer?._id || c.trainer || '', date: c.date||'', time: c.time||'',
      })))
    } catch (e) { show(e.response?.data?.message || 'Failed to load', 'error') }
    finally { setLoading(false) }
  }

  const isAdmin = user?.role === 'superadmin'
  const canEdit = lock.canEdit
  async function toggleOpen() {
    try {
      await api.patch('/cycleplans/board/open', { cycleId: id, open: !lock.planOpen })
      show(lock.planOpen ? 'Plan locked — trainers can only view.' : 'Trainers can edit this plan now. Lock it when planning is done.'); load()
    } catch (e) { show(e.response?.data?.message || 'Could not change', 'error') }
  }
  // Class numbers continue across cycles (e.g. Cycle 4 starts at 44) — never renumber from 1.
  const nextNumber = (cs) => cs.length ? Math.max(...cs.map(c => Number(c.number) || 0)) + 1 : 1

  function addClass() {
    setClasses(cs => [...cs, { number: nextNumber(cs), title:'', notes:'', trainer:'', date:'', time:'' }])
  }
  function update(i, field, value) {
    setClasses(cs => cs.map((c,idx) => idx===i ? { ...c, [field]: value } : c))
  }
  function removeClass(i) {
    setClasses(cs => cs.filter((_,idx)=>idx!==i))
  }
  function move(i, dir) {
    setClasses(cs => {
      const j = i + dir
      if (j < 0 || j >= cs.length) return cs
      const copy = [...cs]; [copy[i], copy[j]] = [copy[j], copy[i]]
      // swap positions but keep the numbers in order
      const nums = cs.map(c => c.number)
      return copy.map((c,idx)=>({ ...c, number: nums[idx] }))
    })
  }

  async function save() {
    setSaving(true)
    try {
      await api.put(`/cycleplans/${id}`, { classes: classes.map((c,i)=>({
        number: Number(c.number) || i+1, title: c.title, notes: c.notes,
        trainer: c.trainer || null, date: c.date, time: c.time,
      })), version })
      show('Plan saved.'); load()
    } catch (e) { show(e.response?.data?.message || 'Failed to save', 'error') }
    finally { setSaving(false) }
  }

  function exportPlan() {
    // every value typed by someone is escaped before it goes into the printable page
    const esc = (x) => String(x ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch])
    const trainerName = (tid) => esc(trainers.find(t => t._id === tid)?.name || '')
    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : ''
    const rows = classes.map((c,i) => `
      <tr>
        <td style="text-align:center">${esc(c.number || i+1)}</td>
        <td>${esc(c.title)}</td>
        <td>${esc(c.notes)}</td>
        <td>${fmtDate(c.date)}${c.time?` · ${esc(c.time)}`:''}</td>
        <td>${trainerName(c.trainer)}</td>
      </tr>`).join('')
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Cycle ${esc(cycle.number)} Plan — ${esc(cycle.batch?.name)}</title>
      <style>
        body{font-family:Arial,Helvetica,sans-serif;color:#111;padding:32px;max-width:800px;margin:0 auto}
        h1{font-size:20px;margin:0 0 4px} .sub{color:#666;font-size:13px;margin-bottom:20px}
        table{width:100%;border-collapse:collapse;font-size:13px}
        th,td{border:1px solid #ccc;padding:8px 10px;text-align:left;vertical-align:top}
        th{background:#f3f4f6} tr:nth-child(even) td{background:#fafafa}
        .foot{margin-top:24px;color:#888;font-size:11px}
      </style></head><body>
      <h1>${esc(cycle.batch?.name)} — Cycle ${esc(cycle.number)}${cycle.name?` · ${esc(cycle.name)}`:''} — Training Plan</h1>
      <div class="sub">${cycle.startDate?new Date(cycle.startDate).toLocaleDateString('en-GB'):''} to ${cycle.endDate?new Date(cycle.endDate).toLocaleDateString('en-GB'):''}${cycle.batch?.track?` · ${esc(cycle.batch.track)}`:''}</div>
      <table><thead><tr><th>#</th><th>Topic</th><th>What we'll cover</th><th>Date &amp; time</th><th>Trainer</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="5" style="text-align:center;color:#999">No classes planned</td></tr>'}</tbody></table>
      <div class="foot">${esc(brand)} · shared with students</div>
      </body></html>`
    const w = window.open('', '_blank')
    if (!w) { show('Allow pop-ups to export', 'error'); return }
    w.document.write(html); w.document.close(); w.focus()
    setTimeout(() => w.print(), 400)
  }

  if (loading) return <div style={{ ...ui.wrap, color:'var(--muted)' }}>Loading…</div>
  if (!cycle)  return <div style={{ ...ui.wrap, color:'var(--muted)' }}>Cycle not found.</div>

  return (
    <div style={ui.wrap}>
      <Link to="/cycles" style={{ ...ui.sub, color:'var(--blue)' }}>← All cycles</Link>
      <div style={{ marginTop:8, marginBottom:6 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, flexWrap:'wrap' }}>
          <h1 style={ui.h1} data-tour="plan-title">{cycle.batch?.name} — Cycle {cycle.number} · Plan</h1>
          <span data-tour="plan-help"><PageHelp page="plan" role={user?.role} /></span>
        </div>
        <p style={ui.sub}>Lay out the classes for this cycle — add one row per class. Trainers can fill this in the planning meeting.</p>
      </div>

      <Alert alert={alert} />

      <div style={{ ...ui.card, display:'flex', gap:12, alignItems:'center', flexWrap:'wrap', marginTop:10, padding:'10px 14px' }}>
        <span style={{ flex:1, minWidth:220, fontSize:14 }}>
          {isAdmin ? (lock.planOpen ? <><b>Open for trainers.</b> Lock it again when planning is done.</> : <><b>Locked for trainers.</b> Only you can edit.</>)
            : canEdit ? <><b>Editing is open.</b> Every change is recorded with your name.</>
            : <><b>Locked.</b> To change this plan, ask the admin — editing is opened during planning meetings.</>}
        </span>
        {isAdmin && <button style={ui.btnGhost} onClick={toggleOpen}>{lock.planOpen ? 'Lock plan' : 'Let trainers edit'}</button>}
        <Link to="/plans"><button style={ui.btnGhost}>All class plans ▸</button></Link>
      </div>

      {classes.length === 0 && (
        <div style={{ ...ui.card, textAlign:'center', color:'var(--muted)' }}>
          No classes planned yet.{canEdit ? ' Add the first class below.' : ''}
        </div>
      )}

      <div style={{ display:'grid', gap:12, marginTop:14 }} data-tour="plan-classes">
        {classes.map((c, i) => (
          <div key={i} style={ui.card}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
              <span style={{ fontWeight:700, fontSize:15 }}>Class {c.number}</span>
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
        <div style={{ display:'flex', gap:10, marginTop:16, flexWrap:'wrap' }} data-tour="plan-actions">
          <button style={ui.btnGhost} onClick={addClass}>+ Add class</button>
          <button style={ui.btnGold} disabled={saving} onClick={save}>{saving?'Saving…':'Save plan'}</button>
          {classes.length > 0 && <button style={ui.btnGhost} onClick={exportPlan}>Export / print for students</button>}
        </div>
      )}
      {!canEdit && classes.length > 0 && (
        <div style={{ marginTop:16 }}>
          <button style={ui.btnGhost} onClick={exportPlan}>Export / print for students</button>
        </div>
      )}
    </div>
  )
}
