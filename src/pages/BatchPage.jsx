import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../api'
import { useAuth } from '../context/AuthContext'
import { ui, Alert, Bar, Empty } from '../components/ui'

const TABS = ['Daily Log', 'Roster', 'Plan', 'Toppers']

export default function BatchPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const [batch, setBatch] = useState(null)
  const [tab, setTab] = useState('Daily Log')
  const [alert, setAlert] = useState(null)
  const show = (msg, type='success') => { setAlert({ msg, type }); setTimeout(()=>setAlert(null), 3500) }

  useEffect(() => { load() }, [id])
  async function load() {
    try { const { data } = await api.get(`/batches/${id}`); setBatch(data.batch) }
    catch (e) { show(e.response?.data?.message || 'Failed to load batch', 'error') }
  }

  if (!batch) return <div style={{ ...ui.wrap, color:'var(--muted)' }}>Loading batch…</div>

  // Can this user edit this batch? Superadmin always; a trainer only if assigned to it.
  const myId = user?.id || user?._id
  const canEdit = user?.role === 'superadmin'
    || (batch.trainers || []).some(t => (t._id || t) === myId)

  return (
    <div style={ui.wrap}>
      <Link to="/batches" style={{ ...ui.sub, color:'var(--blue)' }}>← All batches</Link>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', flexWrap:'wrap', gap:8, marginTop:8 }}>
        <div>
          <h1 style={ui.h1}>{batch.name}</h1>
          <p style={ui.sub}>
            {batch.track && `${batch.track} · `}{batch.composition || 'No composition set'} · Trainers: {(batch.trainers||[]).map(t=>t.name).join(', ')||'none'}
          </p>
        </div>
      </div>

      {!canEdit && (
        <div style={{ background:'rgba(245,158,11,0.12)', border:'1px solid rgba(245,158,11,0.35)', color:'var(--gold)', padding:'10px 14px', borderRadius:9, fontSize:13, marginTop:14 }}>
          View only — you're not assigned to this batch, so you can't make changes here.
        </div>
      )}

      <div style={{ display:'flex', gap:4, borderBottom:'1px solid rgba(255,255,255,0.09)', margin:'18px 0 20px', flexWrap:'wrap' }}>
        {TABS.map(t => (
          <button key={t} onClick={()=>setTab(t)}
            style={{ padding:'10px 16px', background:'none', border:'none', borderBottom:`2px solid ${tab===t?'var(--gold)':'transparent'}`, color:tab===t?'var(--gold)':'rgba(255,255,255,0.5)', fontSize:13, fontWeight:600, cursor:'pointer' }}>
            {t}
          </button>
        ))}
      </div>

      <Alert alert={alert} />

      {tab === 'Daily Log' && <DailyLogTab batchId={id} show={show} canEdit={canEdit} />}
      {tab === 'Roster'    && <RosterTab batchId={id} user={user} show={show} canEdit={canEdit} />}
      {tab === 'Plan'      && <PlanTab batchId={id} show={show} canEdit={canEdit} />}
      {tab === 'Toppers'   && <ToppersTab batchId={id} user={user} show={show} canEdit={canEdit} />}
    </div>
  )
}

/* ─────────────── DAILY LOG ─────────────── */
function DailyLogTab({ batchId, show, canEdit }) {
  const today = new Date().toISOString().slice(0,10)
  const [date, setDate] = useState(today)
  const [plan, setPlan] = useState(null)
  const [roster, setRoster] = useState([])
  const [covered, setCovered] = useState([])
  const [status, setStatus] = useState('done')
  const [notes, setNotes] = useState('')
  const [prepLink, setPrepLink] = useState('')
  const [present, setPresent] = useState({}) // studentId -> bool
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadDay() }, [date])

  async function loadDay() {
    setLoading(true)
    try {
      const [p, r] = await Promise.all([
        api.get(`/plans/${batchId}`),
        api.get('/students', { params:{ batch: batchId } }),
      ])
      setPlan(p.data.plan)
      setRoster(r.data.students)
      // existing log for this date?
      const one = await api.get('/logs/one', { params:{ batch: batchId, date } })
      if (one.data.log) {
        const L = one.data.log
        setCovered(L.topicsCovered.map(String)); setStatus(L.status); setNotes(L.notes||''); setPrepLink(L.prepLink||'')
        const pmap = {}; L.attendance.forEach(a => pmap[a.student] = a.present); setPresent(pmap)
      } else {
        // default everyone present, nothing covered
        const pmap = {}; r.data.students.forEach(s => pmap[s._id] = true)
        setPresent(pmap); setCovered([]); setStatus('done'); setNotes(''); setPrepLink('')
      }
    } catch (e) { show(e.response?.data?.message || 'Failed to load day', 'error') }
    finally { setLoading(false) }
  }

  function toggleTopic(tid) { setCovered(c => c.includes(tid) ? c.filter(x=>x!==tid) : [...c, tid]) }
  function toggleAll(val) { const m={}; roster.forEach(s=>m[s._id]=val); setPresent(m) }

  async function save() {
    setSaving(true)
    try {
      await api.post('/logs', {
        batch: batchId, date, topicsCovered: covered, status, notes, prepLink,
        attendance: roster.map(s => ({ student: s._id, present: !!present[s._id] })),
      })
      show(`Log saved for ${date}.`)
    } catch (e) { show(e.response?.data?.message || 'Failed to save', 'error') }
    finally { setSaving(false) }
  }

  if (loading) return <div style={{ color:'var(--muted)' }}>Loading…</div>

  const nextTopic = plan?.topics?.find(t => t.status !== 'done')
  const presentCount = roster.filter(s => present[s._id]).length

  return (
    <fieldset disabled={!canEdit} style={{ border:'none', margin:0, padding:0, opacity: canEdit ? 1 : 0.6 }}>
    <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:18 }}>
      <div style={{ display:'flex', gap:14, alignItems:'center', flexWrap:'wrap' }}>
        <div><label style={ui.label}>Date</label>
          <input type="date" style={{ ...ui.input, width:'auto' }} value={date} onChange={e=>setDate(e.target.value)} /></div>
        {nextTopic && <div style={{ ...ui.cardSm, padding:'10px 14px' }}>
          <span style={ui.sub}>Suggested next topic: </span><span style={{ fontWeight:600 }}>{nextTopic.title}</span>
        </div>}
      </div>

      {/* Topics covered */}
      <div style={ui.card}>
        <h2 style={ui.h2}>Topics covered today</h2>
        {(!plan || plan.topics.length===0)
          ? <p style={ui.sub}>No plan yet. Add topics in the Plan tab.</p>
          : <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
              {plan.topics.map(t => (
                <button key={t._id} onClick={()=>toggleTopic(String(t._id))}
                  style={{ ...ui.btnGhost,
                    background: covered.includes(String(t._id)) ? 'var(--blue)' : t.status==='done' ? 'rgba(22,163,74,0.12)' : 'rgba(255,255,255,0.06)',
                    color: covered.includes(String(t._id)) ? '#fff' : t.status==='done' ? '#86EFAC' : 'rgba(255,255,255,0.8)' }}>
                  {t.status==='done' && '✓ '}{t.title}
                </button>
              ))}
            </div>}
        <div style={{ display:'flex', gap:8, marginTop:16 }}>
          {['done','partial','not-covered'].map(s => (
            <button key={s} onClick={()=>setStatus(s)}
              style={{ ...ui.btnGhost, background: status===s ? 'var(--gold)' : 'rgba(255,255,255,0.06)', color: status===s ? '#1a1200':'rgba(255,255,255,0.8)', fontWeight: status===s?700:400, textTransform:'capitalize' }}>
              {s.replace('-',' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Notes + prep */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', gap:14 }}>
        <div style={ui.card}>
          <label style={ui.label}>What was actually taught</label>
          <textarea style={{ ...ui.input, minHeight:80, resize:'vertical' }} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Short note on what happened in class…" />
        </div>
        <div style={ui.card}>
          <label style={ui.label}>Prep link (GitHub)</label>
          <input style={ui.input} value={prepLink} onChange={e=>setPrepLink(e.target.value)} placeholder="https://github.com/…" />
          <p style={{ ...ui.sub, marginTop:8 }}>Where you prepped / pushed today's example code.</p>
        </div>
      </div>

      {/* Attendance */}
      <div style={ui.card}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8 }}>
          <h2 style={{ ...ui.h2, marginBottom:0 }}>Attendance <span style={{ ...ui.sub, fontFamily:'var(--font-b)' }}>· {presentCount}/{roster.length} present</span></h2>
          <div style={{ display:'flex', gap:8 }}>
            <button style={ui.btnGhost} onClick={()=>toggleAll(true)}>All present</button>
            <button style={ui.btnGhost} onClick={()=>toggleAll(false)}>All absent</button>
          </div>
        </div>
        {roster.length === 0
          ? <p style={{ ...ui.sub, marginTop:12 }}>No students in this batch yet. Import them in the Roster tab.</p>
          : <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:8, marginTop:14 }}>
              {roster.map(s => (
                <button key={s._id} onClick={()=>setPresent(p=>({ ...p, [s._id]: !p[s._id] }))}
                  style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', borderRadius:8, cursor:'pointer', textAlign:'left',
                    background: present[s._id] ? 'rgba(22,163,74,0.15)' : 'rgba(220,38,38,0.12)',
                    border: `1px solid ${present[s._id] ? 'rgba(22,163,74,0.35)':'rgba(220,38,38,0.3)'}`, color:'#fff' }}>
                  <span style={{ fontSize:15 }}>{present[s._id] ? '✓' : '✕'}</span>
                  <span style={{ fontSize:13 }}>{s.roll && <span style={{ color:'var(--muted)' }}>{s.roll} </span>}{s.name}</span>
                </button>
              ))}
            </div>}
      </div>

      {canEdit && <div><button style={ui.btnGold} disabled={saving} onClick={save}>{saving?'Saving…':'Save daily log'}</button></div>}
    </div>
    </fieldset>
  )
}

/* ─────────────── ROSTER ─────────────── */
function RosterTab({ batchId, user, show, canEdit }) {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [paste, setPaste] = useState('')
  const [importing, setImporting] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [dupes, setDupes] = useState([])
  const blankAdd = { roll:'', name:'', course:'', sem:'', section:'' }
  const [addForm, setAddForm] = useState(blankAdd)

  const TEMPLATE_HEADER = 'Roll, Name, Course, Semester, Section'
  const TEMPLATE_SAMPLE = 'Roll, Name, Course, Semester, Section\nBCA2024001, Aman Kumar, BCA, 3rd, A\nBCA2024002, Priya Singh, BCA, 3rd, A'

  useEffect(() => { load() }, [])
  async function load() {
    setLoading(true)
    try { const { data } = await api.get('/students', { params:{ batch: batchId } }); setStudents(data.students) }
    catch (e) { show(e.response?.data?.message || 'Failed', 'error') }
    finally { setLoading(false) }
  }

  // Parse pasted rows. Accepts commas OR tabs. Columns in order:
  // Roll, Name, Course, Semester, Section. A header line (starts with "roll") is skipped.
  function parseRows(text) {
    return text.split('\n').map(l => l.trim()).filter(Boolean)
      .filter(line => !/^roll[\s,;\t]/i.test(line)) // skip header row if pasted
      .map(line => {
        const p = line.split(/[,\t;]/).map(x => x.trim())
        // If only one column, treat it as the name.
        if (p.length === 1) return { roll:'', name:p[0], course:'', sem:'', section:'' }
        return { roll:p[0]||'', name:p[1]||'', course:p[2]||'', sem:p[3]||'', section:p[4]||'' }
      })
      .filter(r => r.name)
  }

  function copyFormat() {
    navigator.clipboard?.writeText(TEMPLATE_HEADER)
    show('Format copied — paste into Excel row 1 as column headers.')
  }
  function downloadTemplate() {
    const blob = new Blob([TEMPLATE_SAMPLE], { type:'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'skilllab-student-template.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  async function doImport() {
    const rows = parseRows(paste)
    if (!rows.length) return show('Nothing to import', 'error')
    setImporting(true)
    try {
      const { data } = await api.post('/students/bulk', { batch: batchId, rows })
      setDupes(data.duplicates || [])
      if (data.duplicateCount)
        show(`Imported ${data.imported}. ${data.duplicateCount} student(s) also exist in another batch — flagged for admin.`)
      else
        show(`Imported ${data.imported} students.`)
      setPaste(''); setShowImport(false); load()
    } catch (e) { show(e.response?.data?.message || 'Import failed', 'error') }
    finally { setImporting(false) }
  }

  async function addOne() {
    if (!addForm.name.trim()) return show('Name required', 'error')
    try {
      await api.post('/students', { ...addForm, batch: batchId })
      show(`Added ${addForm.name}.`); setAddForm(blankAdd); setShowAdd(false); load()
    } catch (e) { show(e.response?.data?.message || 'Failed', 'error') }
  }

  async function toggleFlag(s) {
    try { await api.put(`/students/${s._id}`, { flagged: !s.flagged }); load() }
    catch (e) { show(e.response?.data?.message || 'Failed', 'error') }
  }
  async function remove(s) {
    if (!confirm(`Remove ${s.name} from this batch?`)) return
    try { await api.delete(`/students/${s._id}`); show('Removed.'); load() }
    catch (e) { show(e.response?.data?.message || 'Failed', 'error') }
  }

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14, flexWrap:'wrap', gap:10 }}>
        <p style={ui.sub}>{students.length} students</p>
        {canEdit && <div style={{ display:'flex', gap:8 }}>
          <button style={ui.btnGhost} onClick={()=>{ setShowAdd(v=>!v); setShowImport(false) }}>+ Add student</button>
          <button style={ui.btnGold} onClick={()=>{ setShowImport(v=>!v); setShowAdd(false) }}>Bulk import</button>
        </div>}
      </div>

      {dupes.length > 0 && (
        <div style={{ background:'rgba(245,158,11,0.12)', border:'1px solid rgba(245,158,11,0.35)', color:'var(--gold)', padding:'12px 14px', borderRadius:9, fontSize:13, marginBottom:16 }}>
          <b>Possible track overlaps</b> — these students are also in another batch this semester:
          <ul style={{ margin:'8px 0 0', paddingLeft:18 }}>
            {dupes.map((d,i) => <li key={i}>{d.roll} · {d.name} — already in <b>{d.otherBatch}</b>{d.otherTrack?` (${d.otherTrack})`:''}</li>)}
          </ul>
          <div style={{ marginTop:6, fontSize:12 }}>Imported anyway. The admin can resolve overlaps from the Duplicates screen before the track lock.</div>
        </div>
      )}

      {showAdd && canEdit && (
        <div style={{ ...ui.card, marginBottom:18 }}>
          <h2 style={ui.h2}>Add one student</h2>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:10 }}>
            <div><label style={ui.label}>Roll</label><input style={ui.input} value={addForm.roll} onChange={e=>setAddForm({...addForm,roll:e.target.value})} /></div>
            <div><label style={ui.label}>Name *</label><input style={ui.input} value={addForm.name} onChange={e=>setAddForm({...addForm,name:e.target.value})} /></div>
            <div><label style={ui.label}>Course</label><input style={ui.input} value={addForm.course} onChange={e=>setAddForm({...addForm,course:e.target.value})} placeholder="BCA" /></div>
            <div><label style={ui.label}>Semester</label><input style={ui.input} value={addForm.sem} onChange={e=>setAddForm({...addForm,sem:e.target.value})} placeholder="3rd" /></div>
            <div><label style={ui.label}>Section</label><input style={ui.input} value={addForm.section} onChange={e=>setAddForm({...addForm,section:e.target.value})} placeholder="A" /></div>
          </div>
          <div style={{ display:'flex', gap:10, marginTop:12 }}>
            <button style={ui.btn} onClick={addOne}>Add student</button>
            <button style={ui.btnGhost} onClick={()=>setShowAdd(false)}>Cancel</button>
          </div>
        </div>
      )}

      {showImport && canEdit && (
        <div style={{ ...ui.card, marginBottom:18 }}>
          <h2 style={ui.h2}>Import students</h2>
          <p style={{ ...ui.sub, marginBottom:8 }}>
            One student per line, in this column order: <b>Roll, Name, Course, Semester, Section</b>.
            Commas or tabs both work, so you can paste straight from Excel. A header row is auto-skipped.
            Only Roll and Name are required.
          </p>
          <div style={{ display:'flex', gap:8, marginBottom:10, flexWrap:'wrap' }}>
            <button style={ui.btnGhost} onClick={copyFormat}>Copy format</button>
            <button style={ui.btnGhost} onClick={downloadTemplate}>Download template (.csv)</button>
          </div>
          <textarea style={{ ...ui.input, minHeight:150, fontFamily:'var(--font-m)', resize:'vertical' }}
            value={paste} onChange={e=>setPaste(e.target.value)}
            placeholder={"Roll, Name, Course, Semester, Section\nBCA2024001, Aman Kumar, BCA, 3rd, A\nBCA2024002, Priya Singh, BCA, 3rd, A"} />
          <div style={{ display:'flex', gap:10, marginTop:12 }}>
            <button style={ui.btn} disabled={importing} onClick={doImport}>{importing?'Importing…':`Import ${parseRows(paste).length} students`}</button>
            <button style={ui.btnGhost} onClick={()=>setShowImport(false)}>Cancel</button>
          </div>
        </div>
      )}
      )}

      {loading ? <div style={{ color:'var(--muted)' }}>Loading…</div>
        : students.length === 0 ? <Empty icon="👥" title="No students yet" hint="Use bulk import to add the batch roster." />
        : (
          <div style={{ ...ui.card, padding:0, overflow:'hidden' }}>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', minWidth:640 }}>
                <thead><tr>
                  <th style={ui.th}>Roll</th><th style={ui.th}>Name</th>
                  <th style={ui.th}>Attendance</th><th style={ui.th}>Top-3</th><th style={ui.th}>Projects</th>
                  <th style={ui.th}>Flag</th><th style={ui.th}></th>
                </tr></thead>
                <tbody>
                  {students.map(s => (
                    <tr key={s._id}>
                      <td style={{ ...ui.td, color:'var(--muted)' }}>{s.roll||'—'}</td>
                      <td style={{ ...ui.td, fontWeight:600 }}>{s.name} {s.flagged && <span title="Flagged">⭐</span>}</td>
                      <td style={ui.td}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <Bar pct={s.attendancePct} /><span style={{ fontSize:12, color:'var(--muted)' }}>{s.attendancePct}%</span>
                        </div>
                      </td>
                      <td style={ui.td}>{s.stats?.topperCount||0}</td>
                      <td style={ui.td}>{s.stats?.projectCount||0}</td>
                      <td style={ui.td}>
                        {canEdit && <button style={ui.btnGhost} onClick={()=>toggleFlag(s)}>{s.flagged?'Unflag':'Flag'}</button>}
                      </td>
                      <td style={ui.td}>
                        {canEdit && user?.role!=='cotrainer' && <button style={ui.btnDanger} onClick={()=>remove(s)}>Remove</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
    </div>
  )
}

/* ─────────────── PLAN ─────────────── */
function PlanTab({ batchId, show, canEdit }) {
  const [topics, setTopics] = useState([])
  const [loading, setLoading] = useState(true)
  const [newTitle, setNewTitle] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])
  async function load() {
    setLoading(true)
    try { const { data } = await api.get(`/plans/${batchId}`); setTopics(data.plan?.topics || []) }
    catch (e) { show(e.response?.data?.message || 'Failed', 'error') }
    finally { setLoading(false) }
  }

  function addTopic() {
    if (!newTitle.trim()) return
    setTopics(t => [...t, { title:newTitle.trim(), order:t.length, status:'pending', _id:`tmp_${Date.now()}` }])
    setNewTitle('')
  }
  function move(i, dir) {
    const j = i+dir; if (j<0||j>=topics.length) return
    const copy=[...topics]; [copy[i],copy[j]]=[copy[j],copy[i]]; setTopics(copy)
  }
  function setStatus(i, status) { setTopics(t => t.map((x,idx)=> idx===i ? { ...x, status } : x)) }
  function del(i) { setTopics(t => t.filter((_,idx)=>idx!==i)) }

  async function save() {
    setSaving(true)
    try {
      const payload = topics.map((t,i) => ({ _id: (t._id && !String(t._id).startsWith('tmp_')) ? t._id : undefined, title:t.title, order:i, status:t.status }))
      const { data } = await api.put(`/plans/${batchId}`, { topics: payload })
      setTopics(data.plan.topics); show('Plan saved.')
    } catch (e) { show(e.response?.data?.message || 'Failed', 'error') }
    finally { setSaving(false) }
  }

  if (loading) return <div style={{ color:'var(--muted)' }}>Loading…</div>
  const done = topics.filter(t=>t.status==='done').length

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14, flexWrap:'wrap', gap:10 }}>
        <p style={ui.sub}>{done}/{topics.length} topics done · "next topic" on the dashboard is the first pending one.</p>
        {canEdit && <button style={ui.btnGold} disabled={saving} onClick={save}>{saving?'Saving…':'Save plan'}</button>}
      </div>

      {canEdit && <div style={{ ...ui.card, marginBottom:16 }}>
        <div style={{ display:'flex', gap:10 }}>
          <input style={ui.input} placeholder="Add a topic…" value={newTitle}
            onChange={e=>setNewTitle(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addTopic()} />
          <button style={ui.btn} onClick={addTopic}>Add</button>
        </div>
      </div>}

      {topics.length === 0 ? <Empty icon="📋" title="No topics yet" hint="Add the ordered topic list for this batch." />
        : <div style={{ display:'grid', gap:8 }}>
            {topics.map((t,i) => (
              <div key={t._id||i} style={{ ...ui.cardSm, display:'flex', alignItems:'center', gap:12 }}>
                <span style={{ color:'var(--muted)', fontFamily:'var(--font-m)', fontSize:12, minWidth:24 }}>{i+1}</span>
                <span style={{ flex:1, fontWeight:500, textDecoration: t.status==='done'?'line-through':'none', opacity:t.status==='done'?0.6:1 }}>{t.title}</span>
                <select style={{ ...ui.input, width:'auto', padding:'5px 8px' }} value={t.status} disabled={!canEdit} onChange={e=>setStatus(i, e.target.value)}>
                  <option value="pending">Pending</option>
                  <option value="in-progress">In progress</option>
                  <option value="done">Done</option>
                </select>
                {canEdit && <button style={ui.btnGhost} onClick={()=>move(i,-1)} title="Up">↑</button>}
                {canEdit && <button style={ui.btnGhost} onClick={()=>move(i,1)} title="Down">↓</button>}
                {canEdit && <button style={ui.btnDanger} onClick={()=>del(i)}>✕</button>}
              </div>
            ))}
          </div>}
    </div>
  )
}

/* ─────────────── TOPPERS ─────────────── */
function ToppersTab({ batchId, user, show, canEdit }) {
  const [toppers, setToppers] = useState([])
  const [roster, setRoster] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ student:'', rank:'1', cycle:'Cycle 1', project:'' })

  useEffect(() => { load() }, [])
  async function load() {
    setLoading(true)
    try {
      const [t, r] = await Promise.all([
        api.get('/toppers', { params:{ batch: batchId } }),
        api.get('/students', { params:{ batch: batchId } }),
      ])
      setToppers(t.data.toppers); setRoster(r.data.students)
    } catch (e) { show(e.response?.data?.message || 'Failed', 'error') }
    finally { setLoading(false) }
  }

  async function add() {
    if (!form.student) return show('Pick a student', 'error')
    try {
      await api.post('/toppers', { ...form, batch: batchId, rank: parseInt(form.rank) })
      show('Topper added.'); setForm({ ...form, student:'', project:'' }); load()
    } catch (e) { show(e.response?.data?.message || 'Failed', 'error') }
  }
  async function remove(id) {
    if (!confirm('Remove this topper entry?')) return
    try { await api.delete(`/toppers/${id}`); show('Removed.'); load() }
    catch (e) { show(e.response?.data?.message || 'Failed', 'error') }
  }

  if (loading) return <div style={{ color:'var(--muted)' }}>Loading…</div>

  return (
    <div>
      {canEdit && <div style={{ ...ui.card, marginBottom:18 }}>
        <h2 style={ui.h2}>Add top-3 for a cycle</h2>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:12 }}>
          <div><label style={ui.label}>Student</label>
            <select style={ui.input} value={form.student} onChange={e=>setForm({...form,student:e.target.value})}>
              <option value="">— select —</option>
              {roster.map(s => <option key={s._id} value={s._id}>{s.roll?`${s.roll} · `:''}{s.name}</option>)}
            </select></div>
          <div><label style={ui.label}>Rank</label>
            <select style={ui.input} value={form.rank} onChange={e=>setForm({...form,rank:e.target.value})}>
              <option value="1">1st</option><option value="2">2nd</option><option value="3">3rd</option>
            </select></div>
          <div><label style={ui.label}>Cycle</label>
            <input style={ui.input} value={form.cycle} onChange={e=>setForm({...form,cycle:e.target.value})} placeholder="Cycle 1" /></div>
          <div style={{ gridColumn:'1 / -1' }}><label style={ui.label}>Project link (optional)</label>
            <input style={ui.input} value={form.project} onChange={e=>setForm({...form,project:e.target.value})} placeholder="https://github.com/…" /></div>
        </div>
        <button style={{ ...ui.btn, marginTop:14 }} onClick={add}>Add topper</button>
        {roster.length===0 && <p style={{ ...ui.sub, marginTop:10 }}>Import students first (Roster tab) — toppers link to real students.</p>}
      </div>}

      {toppers.length === 0 ? <Empty icon="🏆" title="No toppers yet" />
        : <div style={{ display:'grid', gap:8 }}>
            {toppers.map(t => (
              <div key={t._id} style={{ ...ui.cardSm, display:'flex', alignItems:'center', gap:12 }}>
                <span style={{ fontSize:18 }}>{t.rank===1?'🥇':t.rank===2?'🥈':'🥉'}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:600 }}>{t.student?.name || '— deleted student —'}</div>
                  <div style={ui.sub}>{t.cycle}{t.project && ' · has project'}</div>
                </div>
                {t.project && <a href={t.project} target="_blank" rel="noreferrer"><button style={ui.btnGhost}>Project ↗</button></a>}
                {canEdit && user?.role!=='cotrainer' && <button style={ui.btnDanger} onClick={()=>remove(t._id)}>Remove</button>}
              </div>
            ))}
          </div>}
    </div>
  )
}
