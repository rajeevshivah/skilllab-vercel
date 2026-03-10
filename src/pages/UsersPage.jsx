import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { authAPI, studentsAPI } from '../api'
import { useAuth } from '../context/AuthContext'



const iStyle = { width:'100%',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',color:'white',padding:'9px 12px',borderRadius:8,fontSize:13,outline:'none' }
const lStyle = { display:'block',fontSize:11,fontWeight:600,letterSpacing:'0.08em',textTransform:'uppercase',color:'var(--muted)',marginBottom:5 }

export default function UsersPage() {
  const { isSuperAdmin } = useAuth()
  const { opts } = useConfig()
  const STREAMS  = opts('stream').length  ? opts('stream')  : ['AI / ML','MERN Stack','Java & Backend Arch.','C Programming Foundation']
  const COURSES  = opts('course').length  ? opts('course')  : ['B.Tech','BCA']
  const SECTIONS = opts('section').length ? opts('section') : ['Sec A','Sec B','Sec C','F104']
  const navigate = useNavigate()
  const [users,   setUsers]   = useState([])
  const [loading, setLoading] = useState(true)
  const [alert,   setAlert]   = useState(null)
  const [saving,  setSaving]  = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ name:'', email:'', password:'', role:'cotrainer', assignedStream:'AI / ML', assignedSection:'Sec A', assignedCourse:'B.Tech' })

  useEffect(() => { if (!isSuperAdmin) { navigate('/'); return } fetchUsers() }, [])

  async function fetchUsers() {
    try { const { data } = await authAPI.getUsers(); setUsers(data.users) }
    catch (e) { showAlert('Failed to load users','error') }
    finally { setLoading(false) }
  }

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      if (editingId) {
        const { password, email, ...rest } = form
        await authAPI.updateUser(editingId, rest)
        showAlert('User updated!','success')
      } else {
        if (!form.password) { showAlert('Password required','error'); setSaving(false); return }
        await authAPI.createUser( form)
        showAlert('User created!','success')
      }
      clearForm(); fetchUsers()
    } catch (err) { showAlert(err.response?.data?.message || 'Save failed','error') }
    finally { setSaving(false) }
  }

  function handleEdit(u) {
    setEditingId(u._id)
    setForm({ name:u.name, email:u.email, password:'', role:u.role,
      assignedStream: u.assignedStream||'AI / ML',
      assignedSection: u.assignedSection||'Sec A',
      assignedCourse: u.assignedCourse||'B.Tech' })
  }

  async function handleDelete(id) {
    if (!confirm('Delete this user?')) return
    try { await authAPI.deleteUser(id); showAlert('Deleted','success'); fetchUsers() }
    catch (err) { showAlert(err.response?.data?.message || 'Delete failed','error') }
  }

  async function toggleActive(u) {
    try {
      await authAPI.updateUser(u._id, { isActive: !u.isActive })
      showAlert(`User ${u.isActive ? 'deactivated' : 'activated'}`, 'success')
      fetchUsers()
    } catch { showAlert('Failed','error') }
  }

  function clearForm() {
    setEditingId(null)
    setForm({ name:'', email:'', password:'', role:'cotrainer', assignedStream:'AI / ML', assignedSection:'Sec A', assignedCourse:'B.Tech' })
  }

  function showAlert(msg, type) { setAlert({ msg, type }); setTimeout(() => setAlert(null), 3500) }

  const roleColor = { superadmin:'var(--gold)', trainer:'#86EFAC', cotrainer:'#93C5FD' }

  return (
    <div style={{maxWidth:800,margin:'0 auto',padding:'40px 24px'}}>
      <div style={{marginBottom:32}}>
        <h1 style={{fontFamily:'var(--font-d)',fontSize:28}}>👥 Manage Users</h1>
        <p style={{fontSize:13,color:'var(--muted)',marginTop:4}}>Create trainer and co-trainer accounts, assign them to sections</p>
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
            <div><label style={lStyle}>Full Name *</label><input style={iStyle} value={form.name} onChange={e=>set('name',e.target.value)} required placeholder="e.g. Mr. Lucky Sharma" /></div>
            <div><label style={lStyle}>Email *</label><input style={iStyle} type="email" value={form.email} onChange={e=>set('email',e.target.value)} required={!editingId} disabled={!!editingId} placeholder="trainer@sheat.ac.in" /></div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
            {!editingId && <div><label style={lStyle}>Password *</label><input style={iStyle} type="password" value={form.password} onChange={e=>set('password',e.target.value)} placeholder="Min 8 characters" /></div>}
            <div><label style={lStyle}>Role *</label>
              <select style={iStyle} value={form.role} onChange={e=>set('role',e.target.value)}>
                <option value="cotrainer" style={{background:'#0A1628'}}>Co-Trainer (add/edit, no delete)</option>
                <option value="trainer"   style={{background:'#0A1628'}}>Trainer (add/edit/delete)</option>
                <option value="superadmin" style={{background:'#0A1628'}}>Super Admin (full access)</option>
              </select>
            </div>
          </div>

          {form.role !== 'superadmin' && (
            <>
              <p style={{fontSize:12,color:'var(--muted)',marginBottom:12}}>
                ⚠️ Assign this user to their section — they will only be able to manage students in this section.
              </p>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14,marginBottom:14}}>
                <div><label style={lStyle}>Stream</label>
                  <select style={iStyle} value={form.assignedStream} onChange={e=>set('assignedStream',e.target.value)}>
                    {STREAMS.map(s=><option key={s} value={s} style={{background:'#0A1628'}}>{s}</option>)}
                  </select></div>
                <div><label style={lStyle}>Course</label>
                  <select style={iStyle} value={form.assignedCourse} onChange={e=>set('assignedCourse',e.target.value)}>
                    {COURSES.map(c=><option key={c} value={c} style={{background:'#0A1628'}}>{c}</option>)}
                  </select></div>
                <div><label style={lStyle}>Section</label>
                  <select style={iStyle} value={form.assignedSection} onChange={e=>set('assignedSection',e.target.value)}>
                    {SECTIONS.map(s=><option key={s} value={s} style={{background:'#0A1628'}}>{s}</option>)}
                  </select></div>
              </div>
            </>
          )}

          <div style={{display:'flex',gap:10}}>
            <button type="submit" disabled={saving}
              style={{padding:'11px 24px',background:'var(--blue)',color:'white',border:'none',borderRadius:10,fontSize:14,fontWeight:600,cursor:'pointer',opacity:saving?0.7:1}}>
              {saving?'Saving…': editingId?'💾 Update User':'➕ Create User'}
            </button>
            {editingId && <button type="button" onClick={clearForm}
              style={{padding:'11px 20px',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',color:'rgba(255,255,255,0.7)',borderRadius:10,fontSize:14,cursor:'pointer'}}>Cancel</button>}
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
                <tr>{['Name / Email','Role','Assigned Section','Status','Actions'].map(h=>(
                  <th key={h} style={{textAlign:'left',padding:'10px 12px',fontSize:10,fontWeight:600,letterSpacing:'0.08em',textTransform:'uppercase',color:'var(--muted)',borderBottom:'1px solid rgba(255,255,255,0.07)'}}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u._id} style={{borderBottom:'1px solid rgba(255,255,255,0.04)',opacity:u.isActive?1:0.5}}>
                    <td style={{padding:12}}>
                      <div style={{fontWeight:600,color:'white'}}>{u.name}</div>
                      <div style={{fontSize:11,color:'var(--muted)'}}>{u.email}</div>
                    </td>
                    <td style={{padding:12}}>
                      <span style={{fontSize:11,fontWeight:600,padding:'3px 10px',borderRadius:999,background:'rgba(255,255,255,0.07)',color:roleColor[u.role]||'white',textTransform:'capitalize'}}>
                        {u.role}
                      </span>
                    </td>
                    <td style={{padding:12,fontSize:12,color:'var(--muted)'}}>
                      {u.role === 'superadmin' ? <span style={{color:'var(--gold)'}}>All sections</span>
                        : u.assignedStream ? `${u.assignedStream} · ${u.assignedCourse} · ${u.assignedSection}` : '—'}
                    </td>
                    <td style={{padding:12}}>
                      <span style={{fontSize:11,fontWeight:600,padding:'3px 10px',borderRadius:999,
                        background: u.isActive?'rgba(22,163,74,0.15)':'rgba(220,38,38,0.15)',
                        color: u.isActive?'#86EFAC':'#FCA5A5'}}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{padding:12}}>
                      <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                        <button onClick={()=>handleEdit(u)}
                          style={{padding:'5px 10px',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',color:'rgba(255,255,255,0.7)',borderRadius:6,fontSize:11,cursor:'pointer'}}>✏️</button>
                        <button onClick={()=>toggleActive(u)}
                          style={{padding:'5px 10px',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',color:'rgba(255,255,255,0.7)',borderRadius:6,fontSize:11,cursor:'pointer'}}>
                          {u.isActive?'🔒':'🔓'}
                        </button>
                        <button onClick={()=>handleDelete(u._id)}
                          style={{padding:'5px 10px',background:'rgba(220,38,38,0.12)',border:'1px solid rgba(220,38,38,0.2)',color:'#FCA5A5',borderRadius:6,fontSize:11,cursor:'pointer'}}>🗑️</button>
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
