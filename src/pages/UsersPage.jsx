import { useState, useEffect } from 'react'
import api from '../api'
import { useAuth } from '../context/AuthContext'
import { ui, Alert, Empty } from '../components/ui'

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
    try { await api.post('/auth/create-user', form); show('User created.'); setForm(blank); setShowForm(false); load() }
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
  async function remove(u) {
    if (!confirm(`Delete ${u.name}?`)) return
    try { await api.delete(`/auth/users/${u._id}`); show('Deleted.'); load() }
    catch (e) { show(e.response?.data?.message || 'Failed', 'error') }
  }

  if (user?.role !== 'superadmin') return <div style={{ ...ui.wrap, color:'var(--muted)' }}>Superadmin only.</div>

  return (
    <div style={ui.wrap}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:14, flexWrap:'wrap', gap:10 }}>
        <div><h1 style={ui.h1}>Trainers & Users</h1><p style={ui.sub}>Assign them to batches from the Batches page.</p></div>
        <button style={ui.btnGold} onClick={()=>setShowForm(v=>!v)}>+ New user</button>
      </div>
      <Alert alert={alert} />

      {showForm && (
        <div style={{ ...ui.card, marginBottom:18 }}>
          <h2 style={ui.h2}>Create user</h2>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:12 }}>
            <div><label style={ui.label}>Name</label><input style={ui.input} value={form.name} onChange={e=>setForm({...form,name:e.target.value})} /></div>
            <div><label style={ui.label}>Email</label><input style={ui.input} type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} /></div>
            <div><label style={ui.label}>Password</label><input style={ui.input} value={form.password} onChange={e=>setForm({...form,password:e.target.value})} /></div>
            <div><label style={ui.label}>Role</label>
              <select style={ui.input} value={form.role} onChange={e=>setForm({...form,role:e.target.value})}>
                <option value="trainer">Trainer</option>
                <option value="cotrainer">Co-trainer</option>
                <option value="superadmin">Superadmin</option>
              </select></div>
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
                      <td style={{ ...ui.td, color:'var(--muted)' }}>{u.email}</td>
                      <td style={ui.td}>
                        <select style={{ ...ui.input, width:'auto', padding:'5px 8px' }} value={u.role} onChange={e=>changeRole(u, e.target.value)} disabled={u._id===user.id}>
                          <option value="trainer">Trainer</option>
                          <option value="cotrainer">Co-trainer</option>
                          <option value="superadmin">Superadmin</option>
                        </select>
                      </td>
                      <td style={ui.td}>
                        <button style={ui.btnGhost} onClick={()=>toggleActive(u)}>{u.isActive?'Active':'Inactive'}</button>
                      </td>
                      <td style={ui.td}>{u._id!==user.id && <button style={ui.btnDanger} onClick={()=>remove(u)}>Delete</button>}</td>
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
