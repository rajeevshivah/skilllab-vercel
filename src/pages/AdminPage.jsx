import { useState, useEffect, useRef } from 'react'
import { authAPI, studentsAPI } from '../api'
import { useAuth } from '../context/AuthContext'

const STREAMS  = ['AI / ML','MERN Stack','Java & Backend Arch.','C Programming Foundation']
const COURSES  = ['B.Tech','BCA']
const SEMS     = ['2nd Sem','4th Sem','6th Sem']
const YEARS    = ['1st Year','2nd Year','3rd Year']
const CYCLES   = ['Cycle 1','Cycle 2','Cycle 3','Cycle 4','Cycle 5']
const SECTIONS = ['Sec A','Sec B','Sec C','F104','B.Tech','BCA']

const iStyle = { width:'100%',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',color:'white',padding:'9px 12px',borderRadius:8,fontSize:13,outline:'none',transition:'border-color 0.2s' }
const lStyle = { display:'block',fontSize:11,fontWeight:600,letterSpacing:'0.08em',textTransform:'uppercase',color:'var(--muted)',marginBottom:5 }

export default function AdminPage() {
  const { user, isSuperAdmin, isTrainer } = useAuth()
  const [students, setStudents] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [alert,    setAlert]    = useState(null)
  const [editingId,setEditingId]= useState(null)
  const [filterCycle, setFilterCycle] = useState('')
  const [cycles, setCycles] = useState([])

  const [form, setForm] = useState({
    name:'', roll:'', rank:'1', stream: user?.assignedStream || 'AI / ML',
    course: user?.assignedCourse || 'B.Tech', sem:'2nd Sem',
    section: user?.assignedSection || '', year:'1st Year',
    cycle:'Cycle 2', project:'', photo:''
  })

  const fileRef = useRef()
  const formRef = useRef()

  const canEdit = user?.role !== undefined

  useEffect(() => { fetchStudents() }, [filterCycle])

  async function fetchStudents() {
    setLoading(true)
    try {
      const params = {}
      if (filterCycle) params.cycle = filterCycle
      // Non-superadmins only see their section
      if (!isSuperAdmin && user?.assignedSection) {
        params.section = user.assignedSection
        params.stream  = user.assignedStream
        params.course  = user.assignedCourse
      }
      const { data } = await studentsAPI.list( { params })
      setStudents(data.students)
      const c = await studentsAPI.getCycles()
      setCycles(c.data.cycles)
    } catch (e) { showAlert(e.response?.data?.message || 'Failed to load', 'error') }
    finally { setLoading(false) }
  }

  function set(key, val) { setForm(f => ({ ...f, [key]: val })) }

  async function handlePhotoUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { showAlert('Photo must be under 2MB', 'error'); return }
    const reader = new FileReader()
    reader.onload = ev => set('photo', ev.target.result)
    reader.readAsDataURL(file)
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.name.trim()) { showAlert('Name required','error'); return }
    setSaving(true)
    try {
      const payload = { ...form, rank: parseInt(form.rank) }
      if (editingId) {
        await studentsAPI.update(editingId, payload)
        showAlert('Topper updated!', 'success')
      } else {
        await studentsAPI.create( payload)
        showAlert('Topper added!', 'success')
      }
      clearForm()
      fetchStudents()
    } catch (err) {
      showAlert(err.response?.data?.message || 'Save failed', 'error')
    } finally { setSaving(false) }
  }

  function handleEdit(s) {
    setEditingId(s._id)
    setForm({ name:s.name, roll:s.roll||'', rank:String(s.rank), stream:s.stream,
      course:s.course, sem:s.sem, section:s.section, year:s.year,
      cycle:s.cycle, project:s.project||'', photo:'' })
    formRef.current?.scrollIntoView({ behavior:'smooth' })
  }

  async function handleDelete(id) {
    if (!confirm('Delete this topper?')) return
    try {
      await studentsAPI.delete(id)
      showAlert('Deleted','success')
      fetchStudents()
    } catch (err) { showAlert(err.response?.data?.message || 'Delete failed','error') }
  }

  function clearForm() {
    setEditingId(null)
    setForm({ name:'', roll:'', rank:'1', stream: user?.assignedStream||'AI / ML',
      course: user?.assignedCourse||'B.Tech', sem:'2nd Sem',
      section: user?.assignedSection||'', year:'1st Year',
      cycle:'Cycle 2', project:'', photo:'' })
    if (fileRef.current) fileRef.current.value = ''
  }

  function showAlert(msg, type) {
    setAlert({ msg, type })
    setTimeout(() => setAlert(null), 3500)
  }

  const canDelete = isTrainer // trainers + superadmin can delete; cotrainers cannot

  return (
    <div style={{maxWidth:800,margin:'0 auto',padding:'40px 24px'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:32}}>
        <div>
          <h1 style={{fontFamily:'var(--font-d)',fontSize:28}}>⚙️ Manage Toppers</h1>
          {!isSuperAdmin && user?.assignedSection && (
            <p style={{fontSize:13,color:'var(--muted)',marginTop:4}}>
              Your section: <span style={{color:'var(--gold)'}}>{user.assignedStream} · {user.assignedCourse} · {user.assignedSection}</span>
            </p>
          )}
        </div>
      </div>

      {alert && (
        <div style={{padding:'12px 16px',borderRadius:10,fontSize:13,marginBottom:16,
          background: alert.type==='success'?'rgba(22,163,74,0.15)':'rgba(220,38,38,0.15)',
          border:`1px solid ${alert.type==='success'?'rgba(22,163,74,0.3)':'rgba(220,38,38,0.3)'}`,
          color: alert.type==='success'?'#86EFAC':'#FCA5A5'}}>
          {alert.msg}
        </div>
      )}

      {/* Form */}
      <div ref={formRef} style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:16,padding:28,marginBottom:28}}>
        <h3 style={{fontFamily:'var(--font-d)',fontSize:18,marginBottom:20,paddingBottom:12,borderBottom:'1px solid rgba(255,255,255,0.07)'}}>
          {editingId ? '✏️ Edit Topper' : '➕ Add Topper'}
        </h3>
        <form onSubmit={handleSave}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
            <div><label style={lStyle}>Full Name *</label><input style={iStyle} value={form.name} onChange={e=>set('name',e.target.value)} placeholder="e.g. Abhi Singh" required /></div>
            <div><label style={lStyle}>Roll Number</label><input style={iStyle} value={form.roll} onChange={e=>set('roll',e.target.value)} placeholder="e.g. 24CS001" /></div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14,marginBottom:14}}>
            <div><label style={lStyle}>Rank *</label>
              <select style={iStyle} value={form.rank} onChange={e=>set('rank',e.target.value)}>
                <option value="1" style={{background:'#0A1628'}}>1st — Pioneer</option>
                <option value="2" style={{background:'#0A1628'}}>2nd — Vanguard</option>
                <option value="3" style={{background:'#0A1628'}}>3rd — Trailblazer</option>
              </select></div>
            <div><label style={lStyle}>Stream *</label>
              <select style={iStyle} value={form.stream} onChange={e=>set('stream',e.target.value)} disabled={!isSuperAdmin && !!user?.assignedStream}>
                {STREAMS.map(s=><option key={s} value={s} style={{background:'#0A1628'}}>{s}</option>)}
              </select></div>
            <div><label style={lStyle}>Cycle *</label>
              <select style={iStyle} value={form.cycle} onChange={e=>set('cycle',e.target.value)}>
                {CYCLES.map(c=><option key={c} value={c} style={{background:'#0A1628'}}>{c}</option>)}
              </select></div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14,marginBottom:14}}>
            <div><label style={lStyle}>Course *</label>
              <select style={iStyle} value={form.course} onChange={e=>set('course',e.target.value)} disabled={!isSuperAdmin && !!user?.assignedCourse}>
                {COURSES.map(c=><option key={c} value={c} style={{background:'#0A1628'}}>{c}</option>)}
              </select></div>
            <div><label style={lStyle}>Semester *</label>
              <select style={iStyle} value={form.sem} onChange={e=>set('sem',e.target.value)}>
                {SEMS.map(s=><option key={s} value={s} style={{background:'#0A1628'}}>{s}</option>)}
              </select></div>
            <div><label style={lStyle}>Section *</label>
              <select style={iStyle} value={form.section} onChange={e=>set('section',e.target.value)} disabled={!isSuperAdmin && !!user?.assignedSection}>
                <option value="" style={{background:'#0A1628'}}>Select section</option>
                {SECTIONS.map(s=><option key={s} value={s} style={{background:'#0A1628'}}>{s}</option>)}
              </select></div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
            <div><label style={lStyle}>Year</label>
              <select style={iStyle} value={form.year} onChange={e=>set('year',e.target.value)}>
                {YEARS.map(y=><option key={y} value={y} style={{background:'#0A1628'}}>{y}</option>)}
              </select></div>
            <div><label style={lStyle}>Project Name</label><input style={iStyle} value={form.project} onChange={e=>set('project',e.target.value)} placeholder="e.g. Salary Calculator" /></div>
          </div>

          {/* Photo upload */}
          <div style={{marginBottom:20}}>
            <label style={lStyle}>Student Photo (max 2MB)</label>
            <div style={{display:'flex',alignItems:'center',gap:14}}>
              {form.photo && <img src={form.photo} alt="preview" style={{width:56,height:56,borderRadius:'50%',objectFit:'cover',border:'2px solid rgba(255,255,255,0.15)'}} />}
              <div>
                <button type="button" onClick={()=>fileRef.current?.click()}
                  style={{padding:'8px 16px',background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.12)',color:'rgba(255,255,255,0.7)',borderRadius:8,fontSize:12,cursor:'pointer'}}>
                  📷 {form.photo ? 'Change Photo' : 'Upload Photo'}
                </button>
                {form.photo && <button type="button" onClick={()=>{set('photo','');fileRef.current.value=''}}
                  style={{marginLeft:8,padding:'8px 14px',background:'rgba(220,38,38,0.1)',border:'1px solid rgba(220,38,38,0.2)',color:'#FCA5A5',borderRadius:8,fontSize:12,cursor:'pointer'}}>Remove</button>}
                <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={handlePhotoUpload} />
              </div>
            </div>
          </div>

          <div style={{display:'flex',gap:10}}>
            <button type="submit" disabled={saving}
              style={{padding:'11px 24px',background:'var(--gold)',color:'var(--navy)',border:'none',borderRadius:10,fontSize:14,fontWeight:600,cursor:'pointer',opacity:saving?0.7:1}}>
              {saving ? 'Saving…' : editingId ? '💾 Update' : '💾 Save Topper'}
            </button>
            <button type="button" onClick={clearForm}
              style={{padding:'11px 20px',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',color:'rgba(255,255,255,0.7)',borderRadius:10,fontSize:14,cursor:'pointer'}}>
              Clear
            </button>
          </div>
        </form>
      </div>

      {/* Table */}
      <div style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:16,padding:28}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20,paddingBottom:12,borderBottom:'1px solid rgba(255,255,255,0.07)'}}>
          <h3 style={{fontFamily:'var(--font-d)',fontSize:18}}>All Toppers <span style={{fontSize:14,color:'var(--muted)',fontFamily:'var(--font-b)',fontWeight:400}}>({students.length})</span></h3>
          <select value={filterCycle} onChange={e=>setFilterCycle(e.target.value)}
            style={{...iStyle,width:'auto',padding:'6px 12px',fontSize:12}}>
            <option value="" style={{background:'#0A1628'}}>All Cycles</option>
            {cycles.map(c=><option key={c} value={c} style={{background:'#0A1628'}}>{c}</option>)}
          </select>
        </div>

        {loading ? <p style={{color:'var(--muted)',fontSize:13}}>Loading…</p> : students.length === 0 ? (
          <p style={{textAlign:'center',color:'var(--muted)',padding:'32px 0',fontSize:13}}>No toppers yet. Add one above!</p>
        ) : (
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
              <thead>
                <tr>{['Name','Stream','Rank','Cycle',''].map(h=>(
                  <th key={h} style={{textAlign:'left',padding:'10px 12px',fontSize:10,fontWeight:600,letterSpacing:'0.08em',textTransform:'uppercase',color:'var(--muted)',borderBottom:'1px solid rgba(255,255,255,0.07)'}}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {students.map(s => {
                  const rankC = s.rank===1?'var(--gold)':s.rank===2?'var(--silver)':'var(--bronze)'
                  const init  = s.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()
                  return (
                    <tr key={s._id} style={{borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                      <td style={{padding:12}}>
                        <div style={{display:'flex',alignItems:'center',gap:10}}>
                          <div style={{width:32,height:32,borderRadius:'50%',background:'rgba(255,255,255,0.06)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:'var(--muted)',flexShrink:0}}>
                            {s.hasPhoto ? '📷' : init}
                          </div>
                          <div>
                            <div style={{fontWeight:600,color:'white'}}>{s.name}</div>
                            <div style={{fontSize:11,color:'var(--muted)'}}>{s.roll ? 'Roll: '+s.roll : ''} {s.course} · {s.sem} · {s.section}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{padding:12,color:'var(--muted)',fontSize:12}}>{s.stream}</td>
                      <td style={{padding:12}}><span style={{color:rankC,fontWeight:600}}>Rank {s.rank}</span></td>
                      <td style={{padding:12,color:'var(--muted)',fontSize:12}}>{s.cycle}</td>
                      <td style={{padding:12}}>
                        <div style={{display:'flex',gap:6}}>
                          <button onClick={()=>handleEdit(s)}
                            style={{padding:'5px 12px',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',color:'rgba(255,255,255,0.7)',borderRadius:6,fontSize:11,cursor:'pointer'}}>✏️ Edit</button>
                          {canDelete && (
                            <button onClick={()=>handleDelete(s._id)}
                              style={{padding:'5px 10px',background:'rgba(220,38,38,0.12)',border:'1px solid rgba(220,38,38,0.2)',color:'#FCA5A5',borderRadius:6,fontSize:11,cursor:'pointer'}}>🗑️</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
