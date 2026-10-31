// Placement — the placement officer's home (admin and management see it too).
// Three tabs: Drives (all drives, new drive), Companies, Student data
// (import marks from the college's records, the profile fields students fill).
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import api from '../api'
import { useAuth } from '../context/AuthContext'
import { parseTable } from '../utils/files'

const IST = { timeZone: 'Asia/Kolkata' }
export const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { ...IST, day: 'numeric', month: 'short', year: 'numeric' }) : '—'
export const STATUS = { draft: ['Draft', 'tag--muted'], published: ['Open', 'tag--tick'], closed: ['Closed', 'tag--pencil'] }
const err = (e) => e.response?.data?.message || e.message || 'Something went wrong'

function Drives({ canWrite }) {
  const nav = useNavigate()
  const [list, setList] = useState(null), [status, setStatus] = useState(''), [setup, setSetup] = useState(null), [msg, setMsg] = useState(null)
  async function load() {
    const [d, s] = await Promise.all([api.get('/placement/drives', { params: status ? { status } : {} }), api.get('/placement/setup')])
    setList(d.data.drives); setSetup(s.data)
  }
  useEffect(() => { load().catch(e => setMsg({ ok: false, t: err(e) })) }, [status])
  async function addStandard() {
    try { const { data } = await api.post('/placement/setup/standard-fields'); setMsg({ ok: true, t: `Added: ${data.added.length} field(s). Students now see them in their profile.` }); load() }
    catch (e) { setMsg({ ok: false, t: err(e) }) }
  }
  const late = (d) => d.status === 'published' && new Date(d.applyBy) < new Date()
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {setup?.standardFieldsMissing?.length > 0 && (
        <div className="banner" style={{ margin: 0, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ flex: 1, minWidth: 240 }}><b>First step:</b> add the academic fields students fill for placement — {setup.standardFieldsMissing.join(', ')}.</span>
          {canWrite && <button className="btn btn--primary btn--sm" onClick={addStandard}>Add them</button>}
        </div>
      )}
      {msg && <div className={`banner ${msg.ok ? '' : 'banner--error'}`} style={{ margin: 0 }}>{msg.t}</div>}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {[['', 'All'], ['published', 'Open'], ['draft', 'Drafts'], ['closed', 'Closed']].map(([k, l]) => (
          <button key={k} className={`btn btn--sm ${status === k ? 'btn--primary' : 'btn--secondary'}`} onClick={() => setStatus(k)}>{l}</button>))}
        <span style={{ flex: 1 }} />
        {canWrite && <button className="btn btn--primary" onClick={() => nav('/placement/drive/new')}>+ New drive</button>}
      </div>
      {!list ? <p className="muted">Loading…</p> : list.length === 0 ? (
        <div className="sheet" style={{ padding: 28, textAlign: 'center' }}>
          <p style={{ fontWeight: 600, margin: '0 0 6px' }}>No drives yet</p>
          <p className="muted" style={{ margin: 0, fontSize: 14 }}>When a company sends a JD, create a drive: who can see it, who can apply, the last date. Students apply from their phone.</p>
        </div>
      ) : (
        <div className="sheet" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="table">
            <thead><tr><th>Company · role</th><th>Package</th><th>Last date</th><th>Status</th><th className="num">Applied</th><th className="num">Link opens</th></tr></thead>
            <tbody>{list.map(d => (
              <tr key={d._id} style={{ cursor: 'pointer' }} onClick={() => nav(`/placement/drive/${d._id}`)}>
                <td><b>{d.company?.name}</b><div className="muted" style={{ fontSize: 13 }}>{d.title}{d.location ? ` · ${d.location}` : ''}</div></td>
                <td>{d.ctc?.text || '—'}</td>
                <td>{fmtDate(d.applyBy)}{late(d) && <div className="muted" style={{ fontSize: 12 }}>date passed</div>}</td>
                <td><span className={`tag ${STATUS[d.status][1]}`}>{STATUS[d.status][0]}</span></td>
                <td className="num">{d.applied}</td><td className="num">{d.opens}</td>
              </tr>))}</tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Companies({ canWrite }) {
  const [list, setList] = useState(null), [form, setForm] = useState({ name: '', website: '', industry: '', hr: '', email: '', phone: '' }), [msg, setMsg] = useState(null)
  const load = () => api.get('/placement/companies').then(r => setList(r.data.companies))
  useEffect(() => { load() }, [])
  async function add(e) {
    e.preventDefault(); setMsg(null)
    try {
      await api.post('/placement/companies', { name: form.name, website: form.website, industry: form.industry,
        contacts: form.hr || form.email || form.phone ? [{ name: form.hr, email: form.email, phone: form.phone, role: 'HR' }] : [] })
      setForm({ name: '', website: '', industry: '', hr: '', email: '', phone: '' }); setMsg({ ok: true, t: 'Company added.' }); load()
    } catch (er) { setMsg({ ok: false, t: err(er) }) }
  }
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {canWrite && (
        <form className="sheet" style={{ padding: 18, display: 'grid', gap: 10 }} onSubmit={add}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Add a company</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
            <input className="ctl" placeholder="Company name *" value={form.name} onChange={set('name')} />
            <input className="ctl" placeholder="Website" value={form.website} onChange={set('website')} />
            <input className="ctl" placeholder="Industry (IT services, product …)" value={form.industry} onChange={set('industry')} />
            <input className="ctl" placeholder="HR name" value={form.hr} onChange={set('hr')} />
            <input className="ctl" placeholder="HR email" value={form.email} onChange={set('email')} />
            <input className="ctl" placeholder="HR phone" value={form.phone} onChange={set('phone')} />
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button className="btn btn--primary btn--sm" disabled={!form.name.trim()}>Add company</button>
            {msg && <span style={{ fontSize: 13, color: msg.ok ? 'var(--tick)' : 'var(--red-ink)' }}>{msg.t}</span>}
          </div>
        </form>
      )}
      <div className="sheet" style={{ padding: 0, overflowX: 'auto' }}>
        <table className="table">
          <thead><tr><th>Company</th><th>Industry</th><th>Contact</th><th className="num">Drives</th></tr></thead>
          <tbody>{(list || []).map(c => (
            <tr key={c._id}><td><b>{c.name}</b>{c.website && <div style={{ fontSize: 12 }}><a href={c.website} target="_blank" rel="noreferrer">{c.website.replace(/^https?:\/\//, '')}</a></div>}</td>
              <td>{c.industry || '—'}</td>
              <td style={{ fontSize: 13 }}>{c.contacts?.[0] ? [c.contacts[0].name, c.contacts[0].email, c.contacts[0].phone].filter(Boolean).join(' · ') : '—'}</td>
              <td className="num">{c.drives}</td></tr>))}
            {list && !list.length && <tr><td colSpan={4} className="muted">No companies yet.</td></tr>}</tbody>
        </table>
      </div>
    </div>
  )
}

const TYPES = [['number', 'Number'], ['text', 'Text'], ['select', 'One choice'], ['boolean', 'Yes / No'], ['date', 'Date'], ['url', 'Link'], ['file', 'File (PDF / photo)']]

function StudentData({ canWrite }) {
  const [fields, setFields] = useState([]), [paste, setPaste] = useState(''), [preview, setPreview] = useState(null), [msg, setMsg] = useState(null), [busy, setBusy] = useState(false)
  const [nf, setNf] = useState({ label: '', type: 'number', options: '', required: false, student: true, verify: true })
  const load = () => api.get('/people/fields').then(r => setFields(r.data.fields))
  useEffect(() => { load() }, [])
  const numberish = fields.filter(f => f.type !== 'file' && f.isActive !== false)
  // header cells may be the field key or its label ("CGPA (till last semester)")
  const rows = useMemo(() => {
    const t = parseTable(paste); if (t.length < 2) return []
    const keyOf = (h) => { const x = h.toLowerCase(); if (['roll', 'roll no', 'roll number', 'rollno'].includes(x)) return 'roll'
      return numberish.find(f => f.key === x || f.label.toLowerCase() === x)?.key || h }
    const head = t[0].map(keyOf)
    return t.slice(1).map(r => Object.fromEntries(head.map((h, i) => [h, r[i] ?? '']).filter(([, v]) => v !== '')))
  }, [paste, fields])
  async function run(apply) {
    setBusy(true); setMsg(null)
    try {
      const { data } = await api.post('/placement/import', { rows, apply })
      setPreview(data)
      if (apply) { setMsg({ ok: true, t: `Saved for ${data.matched} student(s) — marked as verified.` }); setPaste('') }
    } catch (e) { setMsg({ ok: false, t: err(e) }); setPreview(null) }
    finally { setBusy(false) }
  }
  async function addField(e) {
    e.preventDefault(); setMsg(null)
    const key = nf.label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').replace(/^(\d)/, 'f_$1').slice(0, 40)
    try {
      await api.post('/people/fields', { key, label: nf.label, type: nf.type, group: 'Placement', required: nf.required, editableBy: nf.student ? 'student' : 'staff',
        needsVerification: nf.verify, options: nf.type === 'select' ? nf.options.split(',').map(x => x.trim()).filter(Boolean) : [] })
      setNf({ label: '', type: 'number', options: '', required: false, student: true, verify: true }); setMsg({ ok: true, t: 'Field added — students see it in their profile.' }); load()
    } catch (er) { setMsg({ ok: false, t: err(er) }) }
  }
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {msg && <div className={`banner ${msg.ok ? '' : 'banner--error'}`} style={{ margin: 0 }}>{msg.t}</div>}
      {canWrite && (
        <section className="sheet" style={{ padding: 18, display: 'grid', gap: 10 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Import marks from the college's records</h2>
          <p className="muted" style={{ fontSize: 13, margin: 0 }}>Copy from Excel and paste here, with a heading row: <b>roll</b> and any of {numberish.slice(0, 6).map(f => f.label).join(', ')}. Imported values are saved as <b>verified</b>.</p>
          <textarea className="ctl" style={{ minHeight: 120, fontFamily: 'monospace', fontSize: 12 }} value={paste} onChange={e => { setPaste(e.target.value); setPreview(null) }} placeholder={'roll\tcgpa\ttenth_percent\n2303840100001\t7.8\t86'} />
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn--secondary btn--sm" disabled={busy || !rows.length} onClick={() => run(false)}>Check {rows.length || ''} row(s)</button>
            {preview && !preview.applied && preview.matched > 0 && <button className="btn btn--primary btn--sm" disabled={busy} onClick={() => run(true)}>Save {preview.matched} student(s)</button>}
          </div>
          {preview && (
            <div style={{ fontSize: 13, display: 'grid', gap: 4 }}>
              <div><b>{preview.matched}</b> matched · <b>{preview.changes}</b> values · columns: {preview.columns.join(', ')}</div>
              {preview.notFound.length > 0 && <div style={{ color: 'var(--pencil)' }}>Roll not found: {preview.notFound.slice(0, 20).join(', ')}{preview.notFound.length > 20 ? ' …' : ''}</div>}
              {preview.problems.length > 0 && <div style={{ color: 'var(--red-ink)' }}>{preview.problems.slice(0, 10).map((p, i) => <div key={i}>{p}</div>)}</div>}
            </div>
          )}
        </section>
      )}
      <section className="sheet" style={{ padding: 18, display: 'grid', gap: 10 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>What students fill in their profile</h2>
        <div style={{ overflowX: 'auto' }}>
          <table className="table table--compact">
            <thead><tr><th>Field</th><th>Type</th><th>Who fills</th><th>Checked by college</th><th>Required</th></tr></thead>
            <tbody>{fields.filter(f => f.isActive !== false).map(f => (
              <tr key={f._id}><td>{f.label}<div className="muted" style={{ fontSize: 11 }}>{f.key} · {f.group}</div></td><td>{TYPES.find(t => t[0] === f.type)?.[1] || f.type}</td>
                <td>{f.editableBy === 'student' ? 'Student' : 'Staff'}</td><td>{f.needsVerification ? 'Yes' : '—'}</td><td>{f.required ? 'Yes' : '—'}</td></tr>))}</tbody>
          </table>
        </div>
        {canWrite && (
          <form onSubmit={addField} style={{ display: 'grid', gap: 8, borderTop: '1px solid var(--rule)', paddingTop: 12 }}>
            <b style={{ fontSize: 14 }}>Ask students for something more</b>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
              <input className="ctl" placeholder="Question, e.g. Gap years" value={nf.label} onChange={e => setNf({ ...nf, label: e.target.value })} />
              <select className="ctl" value={nf.type} onChange={e => setNf({ ...nf, type: e.target.value })}>{TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
              {nf.type === 'select' && <input className="ctl" placeholder="Choices, comma separated" value={nf.options} onChange={e => setNf({ ...nf, options: e.target.value })} />}
            </div>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 13 }}>
              <label><input type="checkbox" checked={nf.required} onChange={e => setNf({ ...nf, required: e.target.checked })} /> Required</label>
              <label><input type="checkbox" checked={nf.student} onChange={e => setNf({ ...nf, student: e.target.checked })} /> Students fill it</label>
              <label><input type="checkbox" checked={nf.verify} onChange={e => setNf({ ...nf, verify: e.target.checked })} /> College checks it</label>
            </div>
            <p className="muted" style={{ fontSize: 12, margin: 0 }}>Ask only what companies need — students fill short forms more readily, and the data law expects it.</p>
            <button className="btn btn--secondary btn--sm" style={{ justifySelf: 'start' }} disabled={nf.label.trim().length < 2}>Add field</button>
          </form>
        )}
      </section>
    </div>
  )
}

export default function PlacementPage() {
  const { user } = useAuth()
  const canWrite = ['superadmin', 'placement'].includes(user?.role)
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') || 'drives'
  return (
    <div className="page" style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px 60px' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Placement</h1>
      <p className="muted" style={{ marginBottom: 16, fontSize: 14 }}>Drives, companies and the student details companies ask for.</p>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, borderBottom: '1px solid var(--rule)' }} role="tablist">
        {[['drives', 'Drives'], ['companies', 'Companies'], ['data', 'Student data']].map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setParams({ tab: k })}
            style={{ background: 'none', border: 'none', padding: '10px 12px', fontSize: 14, cursor: 'pointer', fontWeight: tab === k ? 700 : 500,
              color: tab === k ? 'var(--blue-ink)' : 'var(--ink-soft)', borderBottom: `3px solid ${tab === k ? 'var(--blue-ink)' : 'transparent'}` }}>{l}</button>))}
      </div>
      {tab === 'drives' && <Drives canWrite={canWrite} />}
      {tab === 'companies' && <Companies canWrite={canWrite} />}
      {tab === 'data' && <StudentData canWrite={canWrite} />}
      <p className="muted" style={{ fontSize: 12, marginTop: 24 }}>Tip: you can also paste a JD into Claude (Connect AI) and ask it to create the drive. <Link to="/connect-ai">Connect AI →</Link></p>
    </div>
  )
}
