import { useState, useEffect } from 'react'
import api from '../api'
import { useAuth } from '../context/AuthContext'
import { ui, Alert, Empty } from '../components/ui'

const ROLES = [['trainer', 'Trainer'], ['cotrainer', 'Co-trainer'], ['viewer', 'Management (read-only)'], ['superadmin', 'Admin']]
const roleOptions = ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)

export default function UsersPage() {
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [alert, setAlert] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const blank = { name:'', email:'', password:'', role:'trainer' }
  const [form, setForm] = useState(blank)

  const show = (msg, type='success') => { setAlert({ msg, type }); setTimeout(()=>setAlert(null),3500) }

  useEffect(() => { load() }, [])
  async function load() {
    setLoading(true)
    try { const { data } = await api.get('/auth/users'); setUsers(data.users) }
    catch (e) { show(e.response?.data?.message || 'Failed', 'error') }
    finally { setLoading(false) }
  }

  async function create() {
    if (!form.name || !form.email || !form.password) return show('All fields required', 'error')
    try { const { data } = await api.post('/auth/create-user', form); show(data.existing ? data.message : 'User created.'); setForm(blank); setShowForm(false); load() }
    catch (e) { show(e.response?.data?.message || 'Failed', 'error') }
  }
  async function toggleActive(u) {
    try { await api.patch(`/auth/users/${u._id}`, { isActive: !u.isActive }); load() }
    catch (e) { show(e.response?.data?.message || 'Failed', 'error') }
  }
  async function changeRole(u, role) {
    try { await api.patch(`/auth/users/${u._id}`, { role }); load() }
    catch (e) { show(e.response?.data?.message || 'Failed', 'error') }
  }
  // a new temporary password, shown once — share it privately
  const [newPw, setNewPw] = useState(null)
  async function resetPw(u) {
    if (!confirm(`Give ${u.name} a new temporary password? Their current password and every sign-in stop working.`)) return
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789', b = crypto.getRandomValues(new Uint8Array(12))
    const p = Array.from(b, x => chars[x % chars.length]).join(''), password = `${p.slice(0, 4)}-${p.slice(4, 8)}-${p.slice(8)}`
    try { await api.patch(`/auth/users/${u._id}`, { password }); setNewPw({ name: u.name, email: u.email, password }) }
    catch (e) { show(e.response?.data?.message || 'Failed', 'error') }
  }
  // end every sign-in of one person (password unchanged)
  async function signOut(u) {
    if (!confirm(`Sign ${u.name} out on every device? Their password does not change.`)) return
    try { const { data } = await api.post(`/auth/users/${u._id}/sign-out`); show(data.message) }
    catch (e) { show(e.response?.data?.message || 'Failed', 'error') }
  }
  // everyone of this college signs in again; you stay signed in
  const [allOpen, setAllOpen] = useState(false)
  const [allWho, setAllWho] = useState({ staff: true, students: false })
  async function signOutAll() {
    try {
      const { data } = await api.post('/auth/sign-out-all', allWho)
      show(`Signed out ${data.staff} staff login(s) and ${data.students} student(s).${data.skipped.length ? ` Not touched: ${data.skipped.join(', ')}.` : ''}`)
      setAllOpen(false)
    } catch (e) { show(e.response?.data?.message || 'Failed', 'error') }
  }
  async function remove(u) {
    if (!confirm(u.otherColleges ? `Remove ${u.name} from this college? (They keep their login for their other college.)` : `Delete ${u.name}?`)) return
    try { await api.delete(`/auth/users/${u._id}`); show('Deleted.'); load() }
    catch (e) { show(e.response?.data?.message || 'Failed', 'error') }
  }

  const me = user?.id || user?._id
  if (user?.role !== 'superadmin') return <div style={{ ...ui.wrap, color:'var(--muted)' }}>Superadmin only.</div>

  return (
    <div style={ui.wrap}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:14, flexWrap:'wrap', gap:10 }}>
        <div><h1 style={ui.h1}>Trainers & Users</h1><p style={ui.sub}>Assign them to batches from the Batches page. Management (read-only) sees every screen and cannot change anything.</p></div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          <button style={ui.btnGhost} onClick={()=>setAllOpen(v=>!v)}>Sign out everyone…</button>
          <button style={ui.btnGold} onClick={()=>setShowForm(v=>!v)}>+ New user</button>
        </div>
      </div>
      <Alert alert={alert} />
      {newPw && (
        <div style={{ ...ui.card, marginBottom: 16, borderColor: 'rgba(245,158,11,0.5)' }}>
          New password for <b>{newPw.name}</b> ({newPw.email}): <code style={{ fontSize: 16 }}>{newPw.password}</code> — shown only now. Share it privately.
          <button style={{ ...ui.btnGhost, marginLeft: 10 }} onClick={() => setNewPw(null)}>Done</button>
        </div>
      )}

      {allOpen && (
        <div style={{ ...ui.card, marginBottom:18 }}>
          <h2 style={ui.h2}>Sign out everyone</h2>
          <p style={ui.sub}>Use this if a password was shared or leaked. Everyone chosen must sign in again; passwords do not change. You stay signed in here. AI connections keep working.</p>
          <div style={{ display:'flex', gap:18, flexWrap:'wrap', margin:'10px 0 14px' }}>
            <label style={{ display:'flex', gap:6, alignItems:'center' }}><input type="checkbox" checked={allWho.staff} onChange={e=>setAllWho({ ...allWho, staff:e.target.checked })} /> All staff (trainers, admins, management)</label>
            <label style={{ display:'flex', gap:6, alignItems:'center' }}><input type="checkbox" checked={allWho.students} onChange={e=>setAllWho({ ...allWho, students:e.target.checked })} /> All students</label>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button style={ui.btnDanger} disabled={!allWho.staff && !allWho.students} onClick={signOutAll}>Sign them out</button>
            <button style={ui.btnGhost} onClick={()=>setAllOpen(false)}>Cancel</button>
          </div>
        </div>
      )}

      {showForm && (
        <div style={{ ...ui.card, marginBottom:18 }}>
          <h2 style={ui.h2}>Create user</h2>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:12 }}>
            <div><label style={ui.label}>Name</label><input style={ui.input} value={form.name} onChange={e=>setForm({...form,name:e.target.value})} /></div>
            <div><label style={ui.label}>Email</label><input style={ui.input} type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} /></div>
            <div><label style={ui.label}>Password (10+ characters)</label><input style={ui.input} value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder="not used if they already have a login" /></div>
            <div><label style={ui.label}>Role</label>
              <select style={ui.input} value={form.role} onChange={e=>setForm({...form,role:e.target.value})}>{roleOptions}</select></div>
          </div>
          <div style={{ display:'flex', gap:10, marginTop:14 }}>
            <button style={ui.btn} onClick={create}>Create</button>
            <button style={ui.btnGhost} onClick={()=>setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? <div style={{ color:'var(--muted)' }}>Loading…</div>
        : users.length === 0 ? <Empty icon="👥" title="No users yet" />
        : (
          <div style={{ ...ui.card, padding:0, overflow:'hidden' }}>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', minWidth:640 }}>
                <thead><tr>
                  <th style={ui.th}>Name</th><th style={ui.th}>Email</th><th style={ui.th}>Role</th>
                  <th style={ui.th}>Status</th><th style={ui.th}></th>
                </tr></thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u._id}>
                      <td style={{ ...ui.td, fontWeight:600 }}>{u.name}</td>
                      <td style={{ ...ui.td, color:'var(--muted)' }}>{u.email}{u.otherColleges > 0 && <div style={{ fontSize:11 }}>also works with another college</div>}</td>
                      <td style={ui.td}>
                        <select style={{ ...ui.input, width:'auto', padding:'5px 8px' }} value={u.role} onChange={e=>changeRole(u, e.target.value)} disabled={u._id===me}>{roleOptions}</select>
                      </td>
                      <td style={ui.td}>
                        <button style={ui.btnGhost} onClick={()=>toggleActive(u)}>{u.isActive?'Active':'Inactive'}</button>
                      </td>
                      <td style={{ ...ui.td, whiteSpace:'nowrap' }}>{u._id!==me && <>
                        {!u.otherColleges && <button style={{ ...ui.btnGhost, marginRight: 6 }} onClick={()=>resetPw(u)}>Reset password</button>}
                        <button style={{ ...ui.btnGhost, marginRight: 6 }} onClick={()=>signOut(u)}>Sign out</button>
                        <button style={ui.btnDanger} onClick={()=>remove(u)}>{u.otherColleges ? 'Remove' : 'Delete'}</button></>}</td>
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
