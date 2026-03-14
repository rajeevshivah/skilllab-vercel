import { useState, useEffect, useRef } from 'react'
import { studentsAPI } from '../api'
import { useAuth } from '../context/AuthContext'
import { useConfig } from '../context/useConfig'

const iStyle = { width:'100%',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',color:'white',padding:'9px 12px',borderRadius:8,fontSize:13,outline:'none',transition:'border-color 0.2s' }
const lStyle = { display:'block',fontSize:11,fontWeight:600,letterSpacing:'0.08em',textTransform:'uppercase',color:'var(--muted)',marginBottom:5 }

export default function AdminPage() {
  const { user, isSuperAdmin, isTrainer } = useAuth()
  const { opts, loading: configLoading } = useConfig()

  // All config options (for superadmin)
  const ALL_STREAMS  = opts('stream').length  ? opts('stream')  : ['AI / ML','MERN Stack','Java & Backend Arch.','C Programming Foundation']
  const ALL_COURSES  = opts('course').length  ? opts('course')  : ['B.Tech','BCA']
  const ALL_SEMS     = opts('sem').length     ? opts('sem')     : ['2nd Sem','4th Sem','6th Sem']
  const ALL_YEARS    = opts('year').length    ? opts('year')    : ['1st Year','2nd Year','3rd Year']
  const ALL_CYCLES   = opts('cycle').length   ? opts('cycle')   : ['Cycle 1','Cycle 2','Cycle 3','Cycle 4','Cycle 5']
  const ALL_SECTIONS = opts('section').length ? opts('section') : ['Sec A','Sec B','Sec C','F104']

  // For trainers — derive allowed options from their assignedSections
  const assignedSections = user?.assignedSections || []
  const isRestricted = !isSuperAdmin && assignedSections.length > 0

  // Filtered options based on current form stream selection
  function getAllowedOpts(key, currentForm) {
    if (isSuperAdmin || assignedSections.length === 0) {
      return { stream: ALL_STREAMS, course: ALL_COURSES, section: ALL_SECTIONS, year: ALL_YEARS, sem: ALL_SEMS }[key]
    }
    // Filter based on what's in assignedSections
    const relevant = assignedSections.filter(a => !currentForm?.stream || a.stream === currentForm.stream)
    const unique = (arr) => [...new Set(arr.filter(Boolean))]
    return {
      stream:  unique(assignedSections.map(a => a.stream)),
      course:  unique(relevant.map(a => a.course)),
      section: unique(relevant.filter(a => !currentForm?.course || a.course === currentForm.course).map(a => a.section)),
      year:    unique(relevant.filter(a => !currentForm?.course || a.course === currentForm.course).map(a => a.year).filter(y => y && y !== '')),
      sem:     unique(relevant.filter(a => !currentForm?.course || a.course === currentForm.course).map(a => a.sem).filter(s => s && s !== '')),
    }[key] || []
  }

  // Shorthand — use ALL_ for superadmin, filtered for trainers
  const CYCLES = ALL_CYCLES
  const [students, setStudents] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [alert,    setAlert]    = useState(null)
  const [editingId,setEditingId]= useState(null)
  const [filterCycle, setFilterCycle] = useState('')
  const [cycles, setCycles] = useState([])

  const firstSection = user?.assignedSections?.[0] || {}
  const [form, setForm] = useState({
    name:'', roll:'', rank:'1',
    stream:  firstSection.stream  || user?.assignedStream  || 'AI / ML',
    course:  firstSection.course  || user?.assignedCourse  || 'B.Tech',
    sem:     firstSection.sem     || '2nd Sem',
    section: firstSection.section || user?.assignedSection || '',
    year:    firstSection.year    || '1st Year',
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
      // Non-superadmins see students from all their assigned sections
      // (no section filter = fetch all, then filter client-side if needed)
      const { data } = await studentsAPI.list( )
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
    if (file.size > 5 * 1024 * 1024) { showAlert('Photo must be under 5MB', 'error'); return }
    // Resize image to max 400x400 to keep payload small
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const MAX = 400
      let w = img.width, h = img.height
      if (w > h) { if (w > MAX) { h = h * MAX / w; w = MAX } }
      else        { if (h > MAX) { w = w * MAX / h; h = MAX } }
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)
      const base64 = canvas.toDataURL('image/jpeg', 0.85)
      set('photo', base64)
      URL.revokeObjectURL(url)
    }
    img.src = url
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
    const fs = user?.assignedSections?.[0] || {}
    setForm({ name:'', roll:'', rank:'1',
      stream:  fs.stream  || user?.assignedStream  || 'AI / ML',
      course:  fs.course  || user?.assignedCourse  || 'B.Tech',
      sem:     fs.sem     || '2nd Sem',
      section: fs.section || user?.assignedSection || '',
      year:    fs.year    || '1st Year',
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
              <select style={iStyle} value={form.stream} onChange={e=>{set('stream',e.target.value); set('course',''); set('section','')}}>
                {getAllowedOpts('stream',form).map(s=><option key={s} value={s} style={{background:'#0A1628'}}>{s}</option>)}
              </select></div>
            <div><label style={lStyle}>Cycle *</label>
              <select style={iStyle} value={form.cycle} onChange={e=>set('cycle',e.target.value)}>
                {CYCLES.map(c=><option key={c} value={c} style={{background:'#0A1628'}}>{c}</option>)}
              </select></div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14,marginBottom:14}}>
            <div><label style={lStyle}>Course *</label>
              <select style={iStyle} value={form.course} onChange={e=>{set('course',e.target.value); set('section','')}}>
                {getAllowedOpts('course',form).map(c=><option key={c} value={c} style={{background:'#0A1628'}}>{c}</option>)}
              </select></div>
            <div><label style={lStyle}>Semester *</label>
              <select style={iStyle} value={form.sem} onChange={e=>set('sem',e.target.value)}>
                {(getAllowedOpts('sem',form).length ? getAllowedOpts('sem',form) : ALL_SEMS).map(s=><option key={s} value={s} style={{background:'#0A1628'}}>{s}</option>)}
              </select></div>
            <div><label style={lStyle}>Section *</label>
              <select style={iStyle} value={form.section} onChange={e=>set('section',e.target.value)}>
                <option value="" style={{background:'#0A1628'}}>Select section</option>
                {getAllowedOpts('section',form).map(s=><option key={s} value={s} style={{background:'#0A1628'}}>{s}</option>)}
              </select></div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
            <div><label style={lStyle}>Year</label>
              <select style={iStyle} value={form.year} onChange={e=>set('year',e.target.value)}>
                {(getAllowedOpts('year',form).length ? getAllowedOpts('year',form) : ALL_YEARS).map(y=><option key={y} value={y} style={{background:'#0A1628'}}>{y}</option>)}
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
