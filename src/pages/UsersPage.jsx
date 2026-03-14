import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { authAPI } from '../api'
import { useAuth } from '../context/AuthContext'
import { useConfig } from '../context/useConfig'

const iStyle = { width:'100%',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',color:'white',padding:'9px 12px',borderRadius:8,fontSize:13,outline:'none' }
const lStyle = { display:'block',fontSize:11,fontWeight:600,letterSpacing:'0.08em',textTransform:'uppercase',color:'var(--muted)',marginBottom:5 }
const EMPTY_ROW = { stream:'', course:'', sections:[], year:'', sem:'' }

export default function UsersPage() {
  const { isSuperAdmin } = useAuth()
  const { opts } = useConfig()
  const STREAMS  = opts('stream').length  ? opts('stream')  : ['AI / ML','MERN Stack','Java & Backend Arch.','C Programming Foundation']
  const COURSES  = opts('course').length  ? opts('course')  : ['B.Tech','BCA']
  const SECTIONS = opts('section').length ? opts('section') : ['Sec A','Sec B','Sec C']
  const YEARS    = opts('year').length    ? opts('year')    : ['1st Year','2nd Year','3rd Year']
  const SEMS     = opts('sem').length     ? opts('sem')     : ['2nd Sem','4th Sem','6th Sem']

  const navigate = useNavigate()
  const [users,     setUsers]     = useState([])
  const [loading,   setLoading]   = useState(true)
  const [alert,     setAlert]     = useState(null)
  const [saving,    setSaving]    = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ name:'', email:'', password:'', role:'trainer', assignedSections:[{...EMPTY_ROW}] })

  useEffect(() => { if (!isSuperAdmin) { navigate('/'); return } fetchUsers() }, [])

  async function fetchUsers() {
    try { const { data } = await authAPI.getUsers(); setUsers(data.users) }
    catch { showAlert('Failed to load users','error') }
    finally { setLoading(false) }
  }

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function addRow() { setForm(f => ({ ...f, assignedSections: [...f.assignedSections, {...EMPTY_ROW}] })) }
  function removeRow(i) { setForm(f => ({ ...f, assignedSections: f.assignedSections.filter((_,idx) => idx !== i) })) }
  function updateRow(i, key, val) {
    setForm(f => { const s = [...f.assignedSections]; s[i] = { ...s[i], [key]: val }; return { ...f, assignedSections: s } })
  }
  function toggleSection(i, sec) {
    setForm(f => {
      const s = [...f.assignedSections]
      const current = s[i].sections || []
      s[i] = { ...s[i], sections: current.includes(sec) ? current.filter(x => x !== sec) : [...current, sec] }
      return { ...f, assignedSections: s }
    })
  }

  async function handleSave(e) {
    e.preventDefault()
    const validSections = form.assignedSections.filter(a => a.stream && a.course)
    if (form.role !== 'superadmin' && validSections.length === 0) {
      showAlert('Add at least one stream assignment','error'); return
    }
    setSaving(true)
    try {
      const payload = { name: form.name, role: form.role, assignedSections: form.role !== 'superadmin' ? validSections : [] }
      if (editingId) {
        if (form.password) payload.password = form.password
        await authAPI.updateUser(editingId, payload)
        showAlert('User updated!','success')
      } else {
        if (!form.password) { showAlert('Password required','error'); setSaving(false); return }
        await authAPI.createUser({ ...payload, email: form.email, password: form.password })
        showAlert('User created!','success')
      }
      clearForm(); fetchUsers()
    } catch (err) { showAlert(err.response?.data?.message || 'Save failed','error') }
    finally { setSaving(false) }
  }

  function handleEdit(u) {
    setEditingId(u._id)
    // Migrate old single-section format to new
    let secs = u.assignedSections && u.assignedSections.length > 0
      ? u.assignedSections.map(a => ({
          stream: a.stream||'', course: a.course||'',
          sections: a.sections?.length ? a.sections : (a.section ? [a.section] : []),
          year: a.year||'', sem: a.sem||''
        }))
      : u.assignedStream
        ? [{ stream: u.assignedStream, course: u.assignedCourse||'', sections: u.assignedSection ? [u.assignedSection] : [], year:'', sem:'' }]
        : [{...EMPTY_ROW}]
    setForm({ name:u.name, email:u.email, password:'', role:u.role, assignedSections: secs })
  }

  async function handleDelete(id) {
    if (!confirm('Delete this user?')) return
    try { await authAPI.deleteUser(id); showAlert('Deleted','success'); fetchUsers() }
    catch (err) { showAlert(err.response?.data?.message || 'Delete failed','error') }
  }

  async function toggleActive(u) {
    try { await authAPI.updateUser(u._id, { isActive: !u.isActive }); fetchUsers() }
    catch { showAlert('Failed','error') }
  }

  function clearForm() { setEditingId(null); setForm({ name:'', email:'', password:'', role:'trainer', assignedSections:[{...EMPTY_ROW}] }) }
  function showAlert(msg, type) { setAlert({ msg, type }); setTimeout(() => setAlert(null), 3500) }

  const roleColor = { superadmin:'var(--gold)', trainer:'#86EFAC', cotrainer:'#93C5FD' }

  function formatSections(u) {
    if (u.role === 'superadmin') return <span style={{color:'var(--gold)'}}>All sections</span>
    const secs = u.assignedSections?.length > 0 ? u.assignedSections
      : u.assignedStream ? [{ stream:u.assignedStream, course:u.assignedCourse, sections:[u.assignedSection], year:'', sem:'' }] : []
    if (!secs.length) return '—'
    return (
      <div style={{display:'flex',flexDirection:'column',gap:3}}>
        {secs.map((a,i) => (
          <span key={i} style={{fontSize:11,padding:'2px 8px',borderRadius:6,background:'rgba(255,255,255,0.07)',color:'rgba(255,255,255,0.7)'}}>
            {a.stream} · {a.course}{a.year ? ' · '+a.year : ''}{a.sem ? ' · '+a.sem : ''}
            {a.sections?.length > 0 && <span style={{color:'#93C5FD'}}> [{a.sections.join(', ')}]</span>}
          </span>
        ))}
      </div>
    )
  }

  return (
    <div style={{maxWidth:960,margin:'0 auto',padding:'40px 24px'}}>
      <div style={{marginBottom:32}}>
        <h1 style={{fontFamily:'var(--font-d)',fontSize:28}}>👥 Manage Users</h1>
        <p style={{fontSize:13,color:'var(--muted)',marginTop:4}}>Create trainer accounts and assign them to streams and sections</p>
      </div>

      {alert && (
        <div style={{padding:'12px 16px',borderRadius:10,fontSize:13,marginBottom:16,
          background:alert.type==='success'?'rgba(22,163,74,0.15)':'rgba(220,38,38,0.15)',
          border:`1px solid ${alert.type==='success'?'rgba(22,163,74,0.3)':'rgba(220,38,38,0.3)'}`,
          color:alert.type==='success'?'#86EFAC':'#FCA5A5'}}>{alert.msg}
        </div>
      )}

      {/* Form */}
      <div style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:16,padding:28,marginBottom:28}}>
        <h3 style={{fontFamily:'var(--font-d)',fontSize:18,marginBottom:20,paddingBottom:12,borderBottom:'1px solid rgba(255,255,255,0.07)'}}>
          {editingId ? '✏️ Edit User' : '➕ Create User'}
        </h3>
        <form onSubmit={handleSave}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
            <div><label style={lStyle}>Full Name *</label>
              <input style={iStyle} value={form.name} onChange={e=>set('name',e.target.value)} required placeholder="e.g. Mr Lucky Sharma" />
            </div>
            <div><label style={lStyle}>Email *</label>
              <input style={iStyle} type="email" value={form.email} onChange={e=>set('email',e.target.value)}
                required={!editingId} disabled={!!editingId} placeholder="trainer@sheat.ac.in" />
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:20}}>
            <div><label style={lStyle}>{editingId?'New Password (leave blank to keep)':'Password *'}</label>
              <input style={iStyle} type="password" value={form.password} onChange={e=>set('password',e.target.value)}
                placeholder={editingId?'Leave blank to keep current':'Min 8 characters'} />
            </div>
            <div><label style={lStyle}>Role *</label>
              <select style={iStyle} value={form.role} onChange={e=>set('role',e.target.value)}>
                <option value="cotrainer"  style={{background:'#0A1628'}}>Co-Trainer (add/edit only)</option>
                <option value="trainer"    style={{background:'#0A1628'}}>Trainer (add/edit/delete)</option>
                <option value="superadmin" style={{background:'#0A1628'}}>Super Admin (full access)</option>
              </select>
            </div>
          </div>

          {form.role !== 'superadmin' && (
            <div style={{borderTop:'1px solid rgba(255,255,255,0.07)',paddingTop:20}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
                <div>
                  <p style={{fontSize:13,fontWeight:600,color:'white',margin:0}}>📌 Stream Assignments</p>
                  <p style={{fontSize:12,color:'var(--muted)',margin:'4px 0 0'}}>Add one row per stream. Select which sections within that stream.</p>
                </div>
                <button type="button" onClick={addRow}
                  style={{padding:'7px 16px',background:'rgba(37,99,235,0.2)',border:'1px solid rgba(37,99,235,0.4)',
                    color:'#93C5FD',borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer'}}>
                  + Add Stream
                </button>
              </div>

              {form.assignedSections.map((row, i) => (
                <div key={i} style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',
                  borderRadius:12,padding:16,marginBottom:12}}>
                  {/* Row 1: Stream, Course, Year, Sem */}
                  <div style={{display:'grid',gridTemplateColumns:'1.5fr 1fr 1fr 1fr auto',gap:10,marginBottom:12}}>
                    <div>
                      <label style={lStyle}>Stream</label>
                      <select style={iStyle} value={row.stream} onChange={e=>updateRow(i,'stream',e.target.value)}>
                        <option value="" style={{background:'#0A1628'}}>Select stream</option>
                        {STREAMS.map(s=><option key={s} value={s} style={{background:'#0A1628'}}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={lStyle}>Course</label>
                      <select style={iStyle} value={row.course} onChange={e=>updateRow(i,'course',e.target.value)}>
                        <option value="" style={{background:'#0A1628'}}>Select</option>
                        {COURSES.map(c=><option key={c} value={c} style={{background:'#0A1628'}}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={lStyle}>Year</label>
                      <select style={iStyle} value={row.year} onChange={e=>updateRow(i,'year',e.target.value)}>
                        <option value="" style={{background:'#0A1628'}}>Any</option>
                        {YEARS.map(y=><option key={y} value={y} style={{background:'#0A1628'}}>{y}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={lStyle}>Semester</label>
                      <select style={iStyle} value={row.sem} onChange={e=>updateRow(i,'sem',e.target.value)}>
                        <option value="" style={{background:'#0A1628'}}>Any</option>
                        {SEMS.map(s=><option key={s} value={s} style={{background:'#0A1628'}}>{s}</option>)}
                      </select>
                    </div>
                    <div style={{display:'flex',alignItems:'flex-end'}}>
                      {form.assignedSections.length > 1 && (
                        <button type="button" onClick={()=>removeRow(i)}
                          style={{padding:'9px 12px',background:'rgba(220,38,38,0.12)',border:'1px solid rgba(220,38,38,0.2)',
                            color:'#FCA5A5',borderRadius:8,fontSize:13,cursor:'pointer'}}>✕</button>
                      )}
                    </div>
                  </div>

                  {/* Row 2: Section checkboxes */}
                  <div>
                    <label style={{...lStyle, marginBottom:8}}>Sections (select all that apply)</label>
                    <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                      {SECTIONS.map(sec => {
                        const checked = row.sections?.includes(sec)
                        return (
                          <label key={sec} style={{display:'flex',alignItems:'center',gap:6,padding:'6px 12px',
                            borderRadius:8,cursor:'pointer',fontSize:13,
                            background: checked ? 'rgba(37,99,235,0.2)' : 'rgba(255,255,255,0.05)',
                            border: `1px solid ${checked ? 'rgba(37,99,235,0.5)' : 'rgba(255,255,255,0.1)'}`,
                            color: checked ? '#93C5FD' : 'rgba(255,255,255,0.6)',
                            transition:'all 0.15s'}}>
                            <input type="checkbox" checked={!!checked} onChange={()=>toggleSection(i,sec)}
                              style={{accentColor:'#3B82F6',width:14,height:14}} />
                            {sec}
                          </label>
                        )
                      })}
                      <label style={{display:'flex',alignItems:'center',gap:6,padding:'6px 12px',
                        borderRadius:8,cursor:'pointer',fontSize:13,
                        background: row.sections?.length===0 ? 'rgba(234,179,8,0.15)' : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${row.sections?.length===0 ? 'rgba(234,179,8,0.4)' : 'rgba(255,255,255,0.1)'}`,
                        color: row.sections?.length===0 ? 'var(--gold)' : 'rgba(255,255,255,0.6)'}}>
                        <input type="checkbox" checked={row.sections?.length===0} onChange={()=>updateRow(i,'sections',[])}
                          style={{accentColor:'#EAB308',width:14,height:14}} />
                        All sections
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{display:'flex',gap:10,marginTop:20}}>
            <button type="submit" disabled={saving}
              style={{padding:'11px 24px',background:'var(--blue)',color:'white',border:'none',borderRadius:10,fontSize:14,fontWeight:600,cursor:'pointer',opacity:saving?0.7:1}}>
              {saving?'Saving…':editingId?'💾 Update User':'➕ Create User'}
            </button>
            {editingId && (
              <button type="button" onClick={clearForm}
                style={{padding:'11px 20px',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',color:'rgba(255,255,255,0.7)',borderRadius:10,fontSize:14,cursor:'pointer'}}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Users Table */}
      <div style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:16,padding:28}}>
        <h3 style={{fontFamily:'var(--font-d)',fontSize:18,marginBottom:20,paddingBottom:12,borderBottom:'1px solid rgba(255,255,255,0.07)'}}>
          All Users <span style={{fontSize:14,color:'var(--muted)',fontFamily:'var(--font-b)',fontWeight:400}}>({users.length})</span>
        </h3>
        {loading ? <p style={{color:'var(--muted)',fontSize:13}}>Loading…</p> : (
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
              <thead>
                <tr>{['Name / Email','Role','Assigned Streams','Status','Actions'].map(h=>(
                  <th key={h} style={{textAlign:'left',padding:'10px 12px',fontSize:10,fontWeight:600,
                    letterSpacing:'0.08em',textTransform:'uppercase',color:'var(--muted)',
                    borderBottom:'1px solid rgba(255,255,255,0.07)'}}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u._id} style={{borderBottom:'1px solid rgba(255,255,255,0.04)',opacity:u.isActive?1:0.5}}>
                    <td style={{padding:12}}>
                      <div style={{fontWeight:600}}>{u.name}</div>
                      <div style={{fontSize:11,color:'var(--muted)'}}>{u.email}</div>
                    </td>
                    <td style={{padding:12}}>
                      <span style={{fontSize:11,fontWeight:600,padding:'3px 10px',borderRadius:999,
                        background:'rgba(255,255,255,0.07)',color:roleColor[u.role]||'white',textTransform:'capitalize'}}>
                        {u.role}
                      </span>
                    </td>
                    <td style={{padding:12}}>{formatSections(u)}</td>
                    <td style={{padding:12}}>
                      <span style={{fontSize:11,fontWeight:600,padding:'3px 10px',borderRadius:999,
                        background:u.isActive?'rgba(22,163,74,0.15)':'rgba(220,38,38,0.15)',
                        color:u.isActive?'#86EFAC':'#FCA5A5'}}>
                        {u.isActive?'Active':'Inactive'}
                      </span>
                    </td>
                    <td style={{padding:12}}>
                      <div style={{display:'flex',gap:6}}>
                        <button onClick={()=>handleEdit(u)} style={{padding:'5px 10px',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',color:'rgba(255,255,255,0.7)',borderRadius:6,fontSize:11,cursor:'pointer'}}>✏️</button>
                        <button onClick={()=>toggleActive(u)} style={{padding:'5px 10px',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',color:'rgba(255,255,255,0.7)',borderRadius:6,fontSize:11,cursor:'pointer'}}>{u.isActive?'🔒':'🔓'}</button>
                        <button onClick={()=>handleDelete(u._id)} style={{padding:'5px 10px',background:'rgba(220,38,38,0.12)',border:'1px solid rgba(220,38,38,0.2)',color:'#FCA5A5',borderRadius:6,fontSize:11,cursor:'pointer'}}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
