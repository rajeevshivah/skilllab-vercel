// Owner console (platform owner only): every college on Pramakra — its web
// addresses, the modules it has bought, its plan, pause / resume, and its admins.
import { useState, useEffect } from 'react'
import api from '../api'
import { useAuth } from '../context/AuthContext'
import { ui, Alert, Empty } from '../components/ui'

const MODULE_NAME = { training: 'Training (core)', hallOfFame: 'Hall of Fame', studentApp: 'Student app', ai: 'AI connections' }
const blank = { name: '', shortName: '', programName: 'Skill Lab', slug: '', hosts: '', adminName: '', adminEmail: '' }
const list = (s) => String(s || '').split(/[\s,]+/).filter(Boolean)
const ymd = (d) => d ? String(d).slice(0, 10) : ''

export default function PlatformPage() {
  const { user } = useAuth()
  const [orgs, setOrgs] = useState([])
  const [modules, setModules] = useState([])
  const [loading, setLoading] = useState(true)
  const [alert, setAlert] = useState(null)
  const [form, setForm] = useState(null)        // new college form
  const [open, setOpen] = useState(null)        // college id being edited
  const [draft, setDraft] = useState({})
  const [secret, setSecret] = useState(null)    // { email, password } shown once

  const show = (msg, type = 'success') => { setAlert({ msg, type }); setTimeout(() => setAlert(null), 4000) }
  const fail = (e) => show(e.response?.data?.message || 'Failed', 'error')

  useEffect(() => { load() }, [])
  async function load() {
    setLoading(true)
    try { const { data } = await api.get('/platform/orgs'); setOrgs(data.orgs); setModules(data.modules) }
    catch (e) { fail(e) } finally { setLoading(false) }
  }
  async function patch(o, body, msg) {
    try { await api.patch(`/platform/orgs/${o._id}`, body); if (msg) show(msg); load() } catch (e) { fail(e) }
  }
  async function create() {
    const f = form
    if (!f.name || !f.slug) return show('Name and short id are needed.', 'error')
    try {
      const { data } = await api.post('/platform/orgs', { name: f.name, shortName: f.shortName, programName: f.programName, slug: f.slug,
        hosts: list(f.hosts), ...(f.adminEmail ? { admin: { name: f.adminName, email: f.adminEmail } } : {}) })
      if (data.admin?.temporaryPassword) setSecret({ email: data.admin.email, password: data.admin.temporaryPassword })
      show(`${data.org.name} added.`); setForm(null); load()
    } catch (e) { fail(e) }
  }
  async function addAdmin(o) {
    if (!draft.adminEmail) return show('Email needed', 'error')
    try {
      const { data } = await api.post(`/platform/orgs/${o._id}/admins`, { name: draft.adminName, email: draft.adminEmail })
      if (data.admin.temporaryPassword) setSecret({ email: data.admin.email, password: data.admin.temporaryPassword })
      else show(`${data.admin.email} already had a login — now admin here too.`)
      setDraft(d => ({ ...d, adminName: '', adminEmail: '' }))
    } catch (e) { fail(e) }
  }
  function edit(o) {
    setOpen(open === o._id ? null : o._id)
    setDraft({ name: o.name, shortName: o.shortName, programName: o.programName, hosts: (o.hosts || []).join(', '),
      validUntil: ymd(o.plan?.validUntil), seats: o.plan?.seats ?? '', planName: o.plan?.name || '', notes: o.plan?.notes || '' })
  }
  const saveEdit = (o) => patch(o, { name: draft.name, shortName: draft.shortName, programName: draft.programName, hosts: list(draft.hosts),
    plan: { name: draft.planName, validUntil: draft.validUntil || null, seats: draft.seats === '' ? null : Number(draft.seats), notes: draft.notes } }, 'Saved.')

  if (!user?.platformOwner) return <div style={{ ...ui.wrap, color: 'var(--muted)' }}>Platform owner only.</div>
  const field = (label, key, props = {}) => (
    <div><label style={ui.label}>{label}</label><input style={ui.input} value={draft[key] ?? ''} onChange={e => setDraft({ ...draft, [key]: e.target.value })} {...props} /></div>)
  const formField = (label, key, props = {}) => (
    <div><label style={ui.label}>{label}</label><input style={ui.input} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} {...props} /></div>)

  return (
    <div style={ui.wrap}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <div><h1 style={ui.h1}>Colleges</h1><p style={ui.sub}>Pramakra owner console — each college opens on its own web address and sees only its own data.</p></div>
        <button style={ui.btnGold} onClick={() => setForm(form ? null : blank)}>+ New college</button>
      </div>
      <Alert alert={alert} />

      {secret && (
        <div className="banner banner--pencil" style={{ marginBottom: 16 }}>
          Temporary password for <b>{secret.email}</b>: <code style={{ fontSize: 15 }}>{secret.password}</code> — shown only now. Share it privately.
          <button style={{ ...ui.btnGhost, marginLeft: 10 }} onClick={() => setSecret(null)}>Done</button>
        </div>
      )}

      {form && (
        <div style={{ ...ui.card, marginBottom: 18 }}>
          <h2 style={ui.h2}>New college</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12 }}>
            {formField('College name', 'name', { placeholder: 'XYZ Institute of Technology' })}
            {formField('Short name', 'shortName', { placeholder: 'XYZIT' })}
            {formField('Program name', 'programName')}
            {formField('Short id (unique)', 'slug', { placeholder: 'xyzit' })}
            {formField('Web addresses', 'hosts', { placeholder: 'skilllab.xyzit.edu' })}
            {formField('First admin — name', 'adminName')}
            {formField('First admin — email', 'adminEmail', { type: 'email' })}
          </div>
          <p style={{ ...ui.sub, marginTop: 10 }}>Point each web address (DNS) to the website, then add it here. All modules start switched on.</p>
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button style={ui.btn} onClick={create}>Create college</button>
            <button style={ui.btnGhost} onClick={() => setForm(null)}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? <div style={{ color: 'var(--muted)' }}>Loading…</div>
        : orgs.length === 0 ? <Empty icon="🏫" title="No colleges yet" />
        : orgs.map(o => {
          const paused = o.status === 'suspended'
          const expired = o.plan?.validUntil && ymd(o.plan.validUntil) < new Date().toISOString().slice(0, 10)
          return (
            <div key={o._id} style={{ ...ui.card, marginBottom: 14, opacity: paused ? 0.75 : 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{o.name} {paused && <span style={{ color: 'var(--red, #b42318)', fontSize: 13 }}>· paused</span>}</div>
                  <div style={{ color: 'var(--muted)', fontSize: 13 }}>{o.shortName} {o.programName} · {(o.hosts || []).join(', ') || 'no web address yet'}</div>
                  <div style={{ fontSize: 13, marginTop: 4 }}>
                    {o.usage.students} students · {o.usage.batches} batches · {o.usage.staff} staff
                    {o.plan?.validUntil && <span style={{ color: expired ? 'var(--red, #b42318)' : 'var(--muted)' }}> · plan until {ymd(o.plan.validUntil)}{expired ? ' (ended)' : ''}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button style={ui.btnGhost} onClick={() => edit(o)}>{open === o._id ? 'Close' : 'Edit'}</button>
                  <button style={paused ? ui.btn : ui.btnDanger} onClick={() => (paused || confirm(`Pause ${o.name}? Nobody there can use the platform until resumed. Data is kept.`)) &&
                    patch(o, { status: paused ? 'active' : 'suspended' }, paused ? 'Resumed.' : 'Paused.')}>{paused ? 'Resume' : 'Pause'}</button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 12 }}>
                {modules.map(m => (
                  <label key={m} style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13 }}>
                    <input type="checkbox" checked={o.modules?.[m] !== false} onChange={e => patch(o, { modules: { [m]: e.target.checked } })} />
                    {MODULE_NAME[m] || m}
                  </label>
                ))}
              </div>

              {open === o._id && (
                <div style={{ borderTop: '1px solid var(--rule, #e5e5e5)', marginTop: 14, paddingTop: 14 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12 }}>
                    {field('College name', 'name')}
                    {field('Short name', 'shortName')}
                    {field('Program name', 'programName')}
                    {field('Web addresses (comma separated)', 'hosts')}
                    {field('Plan', 'planName', { placeholder: 'Annual' })}
                    {field('Plan valid until', 'validUntil', { type: 'date' })}
                    {field('Student seats', 'seats', { type: 'number', min: 0 })}
                    {field('Notes', 'notes')}
                  </div>
                  <button style={{ ...ui.btn, marginTop: 12 }} onClick={() => saveEdit(o)}>Save</button>
                  <h2 style={{ ...ui.h2, marginTop: 18 }}>Add an admin</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12, alignItems: 'end' }}>
                    {field('Name', 'adminName')}
                    {field('Email', 'adminEmail', { type: 'email' })}
                    <div><button style={ui.btn} onClick={() => addAdmin(o)}>Add admin</button></div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
    </div>
  )
}
