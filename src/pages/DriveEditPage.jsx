// New drive / edit drive. Who SEES it (programme, branch, passing year) and who
// may APPLY (rules on profile fields), with live counts while you change them.
// Saved as a draft; publishing is on the drive page.
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../api'
import { readAsDataUrl } from '../utils/files'

const MODES = [['onCampus', 'On campus'], ['virtual', 'Virtual'], ['offCampus', 'Off campus'], ['pool', 'Pool drive']]
const OPS = [['gte', 'at least'], ['lte', 'at most'], ['eq', 'exactly']]
const QTYPES = [['boolean', 'Yes / No'], ['text', 'Text'], ['number', 'Number'], ['select', 'One choice'], ['url', 'Link']]
const err = (e) => e.response?.data?.message || e.message || 'Something went wrong'
// India time <-> the datetime-local box
const toLocal = (d) => { if (!d) return ''; const x = new Date(new Date(d).getTime() + 5.5 * 3600e3); return x.toISOString().slice(0, 16) }
const fromLocal = (v) => v ? new Date(`${v}:00+05:30`).toISOString() : null

const blank = { company: '', title: '', description: '', ctc: { text: '', min: '', max: '' }, location: '', mode: 'onCampus', bond: '', schedule: '', applyBy: '',
  audience: { programmes: [], branches: [], passingYears: [] }, rules: [], verifiedOnly: false, resumeRequired: true, publicPreview: true, questions: [] }

function Section({ title, hint, children }) {
  return (
    <section className="sheet" style={{ padding: 18, display: 'grid', gap: 12 }}>
      <div><h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{title}</h2>{hint && <p className="muted" style={{ fontSize: 13, margin: '4px 0 0' }}>{hint}</p>}</div>
      {children}
    </section>
  )
}
const Field = ({ label, children, span }) => <div className="field" style={{ margin: 0, gridColumn: span ? '1 / -1' : undefined }}><label>{label}</label>{children}</div>
const Chip = ({ on, onClick, children }) => <button type="button" className={`btn btn--sm ${on ? 'btn--primary' : 'btn--secondary'}`} onClick={onClick}>{children}</button>
const toggle = (list, v) => list.includes(v) ? list.filter(x => x !== v) : [...list, v]

export default function DriveEditPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const [setup, setSetup] = useState(null), [d, setD] = useState(null), [counts, setCounts] = useState(null)
  const [msg, setMsg] = useState(null), [busy, setBusy] = useState(false), [newCo, setNewCo] = useState(''), [jd, setJd] = useState(null)
  const timer = useRef(null)

  useEffect(() => {
    (async () => {
      const s = (await api.get('/placement/setup')).data; setSetup(s)
      if (id) {
        const x = (await api.get(`/placement/drives/${id}`)).data.drive
        setJd(x.jd || null)
        setD({ ...blank, ...x, company: x.company?._id || x.company, applyBy: toLocal(x.applyBy),
          ctc: { text: x.ctc?.text || '', min: x.ctc?.min ?? '', max: x.ctc?.max ?? '' },
          audience: { programmes: (x.audience?.programmes || []).map(String), branches: x.audience?.branches || [], passingYears: x.audience?.passingYears || [] } })
      } else setD({ ...blank, applyBy: toLocal(Date.now() + 7 * 864e5).slice(0, 10) + 'T23:59' })
    })().catch(e => setMsg({ ok: false, t: err(e) }))
  }, [id])

  // live counts while the audience / rules change
  useEffect(() => {
    if (!d) return
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      const rules = d.rules.filter(r => r.field && r.value !== '').map(r => ({ ...r, value: Number(r.value) }))
      api.post('/placement/drives/check', { audience: d.audience, rules, verifiedOnly: d.verifiedOnly }).then(r => setCounts(r.data.counts)).catch(() => setCounts(null))
    }, 400)
    return () => clearTimeout(timer.current)
  }, [d?.audience, d?.rules, d?.verifiedOnly])

  if (!d || !setup) return <div className="page" style={{ padding: 24 }}>{msg ? <div className="banner banner--error">{msg.t}</div> : <p className="muted">Loading…</p>}</div>
  const set = (k, v) => setD(x => ({ ...x, [k]: v }))
  const setA = (k, v) => setD(x => ({ ...x, audience: { ...x.audience, [k]: v } }))
  const branches = setup.programmes.filter(p => !d.audience.programmes.length || d.audience.programmes.includes(String(p._id))).flatMap(p => p.branches.map(b => ({ ...b, prog: p.name })))

  async function addCompany() {
    try { const { data } = await api.post('/placement/companies', { name: newCo }); setSetup(s => ({ ...s, companies: [...s.companies, data.company] })); set('company', data.company._id); setNewCo('') }
    catch (e) { setMsg({ ok: false, t: err(e) }) }
  }
  async function save() {
    setBusy(true); setMsg(null)
    try {
      const body = { ...d, applyBy: fromLocal(d.applyBy), ctc: { text: d.ctc.text, min: d.ctc.min === '' ? null : Number(d.ctc.min), max: d.ctc.max === '' ? null : Number(d.ctc.max) },
        rules: d.rules.filter(r => r.field).map(r => ({ field: r.field, op: r.op, value: Number(r.value) })) }
      for (const k of ['_id', 'slug', 'status', 'jd', 'opens', 'publishedAt', 'createdAt', 'updatedAt', 'org', 'createdBy', 'updatedBy', '__v']) delete body[k]
      const { data } = id ? await api.patch(`/placement/drives/${id}`, body) : await api.post('/placement/drives', body)
      nav(`/placement/drive/${data.drive._id}`)
    } catch (e) { setMsg({ ok: false, t: err(e) }); window.scrollTo({ top: 0, behavior: 'smooth' }) }
    finally { setBusy(false) }
  }
  async function uploadJd(e) {
    const f = e.target.files?.[0]; e.target.value = ''
    if (!f) return
    try { const data = await readAsDataUrl(f); const r = await api.post(`/placement/drives/${id}/jd`, { data, name: f.name }); setJd(r.data.jd) }
    catch (er) { setMsg({ ok: false, t: err(er) }) }
  }

  return (
    <div className="page" style={{ maxWidth: 860, margin: '0 auto', padding: '24px 16px 80px', display: 'grid', gap: 14 }}>
      <div><button className="btn btn--quiet btn--sm" style={{ paddingLeft: 0 }} onClick={() => nav(id ? `/placement/drive/${id}` : '/placement')}>← Back</button>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: '4px 0 0' }}>{id ? 'Edit drive' : 'New drive'}</h1>
        <p className="muted" style={{ fontSize: 13, margin: '2px 0 0' }}>Saved as a draft — students see nothing until you publish it.</p></div>
      {msg && <div className={`banner ${msg.ok ? '' : 'banner--error'}`} style={{ margin: 0 }}>{msg.t}</div>}

      <Section title="The job">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          <Field label="Company *">
            <select className="ctl" value={d.company} onChange={e => set('company', e.target.value)}>
              <option value="">Choose…</option>{setup.companies.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <input className="ctl" placeholder="or add a new company" value={newCo} onChange={e => setNewCo(e.target.value)} />
              <button type="button" className="btn btn--secondary btn--sm" disabled={newCo.trim().length < 2} onClick={addCompany}>Add</button>
            </div>
          </Field>
          <Field label="Role *"><input className="ctl" value={d.title} onChange={e => set('title', e.target.value)} placeholder="Graduate Engineer Trainee" /></Field>
          <Field label="Package (as the company wrote it)"><input className="ctl" value={d.ctc.text} onChange={e => set('ctc', { ...d.ctc, text: e.target.value })} placeholder="₹6–8 LPA + bonus" /></Field>
          <Field label="Package in LPA (lowest – highest)">
            <div style={{ display: 'flex', gap: 6 }}><input className="ctl" inputMode="decimal" value={d.ctc.min} onChange={e => set('ctc', { ...d.ctc, min: e.target.value })} placeholder="6" />
              <input className="ctl" inputMode="decimal" value={d.ctc.max} onChange={e => set('ctc', { ...d.ctc, max: e.target.value })} placeholder="8" /></div>
          </Field>
          <Field label="Location"><input className="ctl" value={d.location} onChange={e => set('location', e.target.value)} placeholder="Pune / Noida" /></Field>
          <Field label="Mode"><select className="ctl" value={d.mode} onChange={e => set('mode', e.target.value)}>{MODES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
          <Field label="Last date to apply *"><input className="ctl" type="datetime-local" value={d.applyBy} onChange={e => set('applyBy', e.target.value)} /></Field>
          <Field label="Bond (if any)"><input className="ctl" value={d.bond} onChange={e => set('bond', e.target.value)} placeholder="1 year" /></Field>
          <Field label="Schedule" span><input className="ctl" value={d.schedule} onChange={e => set('schedule', e.target.value)} placeholder="Online test 8 Nov · Interviews 10 Nov (on campus)" /></Field>
          <Field label="Job description" span><textarea className="ctl" style={{ minHeight: 160 }} value={d.description} onChange={e => set('description', e.target.value)} placeholder="Paste the JD here" /></Field>
          {id && <Field label="JD file (PDF, optional)" span>
            <input className="ctl" type="file" accept="application/pdf,image/*" onChange={uploadJd} style={{ paddingTop: 6 }} />
            {jd && <span className="muted" style={{ fontSize: 12 }}>Attached: {jd.name}</span>}
          </Field>}
        </div>
      </Section>

      <Section title="Who can see it" hint="Leave a part empty to include everyone. Only students who are studying see drives.">
        <div><b style={{ fontSize: 13 }}>Programme</b><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
          {setup.programmes.map(p => <Chip key={p._id} on={d.audience.programmes.includes(String(p._id))} onClick={() => setA('programmes', toggle(d.audience.programmes, String(p._id)))}>{p.name}</Chip>)}</div></div>
        {branches.length > 0 && <div><b style={{ fontSize: 13 }}>Branch</b><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
          {branches.map(b => <Chip key={b.prog + b.code} on={d.audience.branches.includes(b.code)} onClick={() => setA('branches', toggle(d.audience.branches, b.code))}>{b.code}</Chip>)}</div></div>}
        <div><b style={{ fontSize: 13 }}>Passing year</b><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
          {setup.passingYears.map(y => <Chip key={y} on={d.audience.passingYears.includes(y)} onClick={() => setA('passingYears', toggle(d.audience.passingYears, y))}>{y}</Chip>)}</div></div>
      </Section>

      <Section title="Who can apply" hint="Rules on what students filled in their profile. No rules = everyone who can see it.">
        {d.rules.map((r, i) => (
          <div key={i} style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <select className="ctl" style={{ maxWidth: 240 }} value={r.field} onChange={e => set('rules', d.rules.map((x, j) => j === i ? { ...x, field: e.target.value } : x))}>
              <option value="">Choose…</option>{setup.ruleFields.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}</select>
            <select className="ctl" style={{ maxWidth: 130 }} value={r.op} onChange={e => set('rules', d.rules.map((x, j) => j === i ? { ...x, op: e.target.value } : x))}>
              {OPS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
            <input className="ctl" style={{ maxWidth: 100 }} inputMode="decimal" value={r.value} onChange={e => set('rules', d.rules.map((x, j) => j === i ? { ...x, value: e.target.value } : x))} />
            <button type="button" className="btn btn--quiet btn--sm" onClick={() => set('rules', d.rules.filter((_, j) => j !== i))}>Remove</button>
          </div>))}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn--secondary btn--sm" onClick={() => set('rules', [...d.rules, { field: 'cgpa', op: 'gte', value: '' }])}>+ Add a rule</button>
          {!d.rules.some(r => r.field === 'active_backlogs') && setup.ruleFields.some(f => f.key === 'active_backlogs') &&
            <button type="button" className="btn btn--quiet btn--sm" onClick={() => set('rules', [...d.rules, { field: 'active_backlogs', op: 'lte', value: 0 }])}>+ No active backlogs</button>}
        </div>
        <label style={{ fontSize: 14, display: 'flex', gap: 8, alignItems: 'flex-start' }}><input type="checkbox" checked={d.verifiedOnly} onChange={e => set('verifiedOnly', e.target.checked)} style={{ marginTop: 3 }} />
          <span><b>Verified details only</b> — students can apply only after the college has checked the values these rules use. Leave off to let them apply now and check the shortlisted ones.</span></label>
        {counts && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 13 }}>
            <span className="tag tag--blue">{counts.visible} see it</span>
            <span className="tag tag--tick">{counts.eligible} can apply</span>
            {counts.incomplete > 0 && <span className="tag tag--pencil">{counts.incomplete} must complete their profile</span>}
            {counts.needsVerification > 0 && <span className="tag tag--pencil">{counts.needsVerification} waiting for verification</span>}
            {counts.notEligible > 0 && <span className="tag tag--muted">{counts.notEligible} not eligible</span>}
          </div>)}
      </Section>

      <Section title="Asked when applying" hint="Only for this drive — answers go to you with the application.">
        {d.questions.map((q, i) => (
          <div key={i} style={{ display: 'grid', gap: 6, gridTemplateColumns: 'minmax(200px, 1fr) 140px auto auto', alignItems: 'center' }}>
            <input className="ctl" value={q.label} placeholder="Willing to relocate to Pune?" onChange={e => set('questions', d.questions.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} />
            <select className="ctl" value={q.type} onChange={e => set('questions', d.questions.map((x, j) => j === i ? { ...x, type: e.target.value } : x))}>{QTYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
            <label style={{ fontSize: 13 }}><input type="checkbox" checked={!!q.required} onChange={e => set('questions', d.questions.map((x, j) => j === i ? { ...x, required: e.target.checked } : x))} /> Required</label>
            <button type="button" className="btn btn--quiet btn--sm" onClick={() => set('questions', d.questions.filter((_, j) => j !== i))}>Remove</button>
            {q.type === 'select' && <input className="ctl" style={{ gridColumn: '1 / -1' }} placeholder="Choices, comma separated" value={(q.options || []).join(', ')}
              onChange={e => set('questions', d.questions.map((x, j) => j === i ? { ...x, options: e.target.value.split(',').map(s => s.trim()) } : x))} />}
          </div>))}
        <button type="button" className="btn btn--secondary btn--sm" style={{ justifySelf: 'start' }} disabled={d.questions.length >= 10}
          onClick={() => set('questions', [...d.questions, { label: '', type: 'boolean', required: true, options: [] }])}>+ Add a question</button>
        <label style={{ fontSize: 14 }}><input type="checkbox" checked={d.resumeRequired} onChange={e => set('resumeRequired', e.target.checked)} /> Resume needed</label>
        <label style={{ fontSize: 14 }}><input type="checkbox" checked={d.publicPreview} onChange={e => set('publicPreview', e.target.checked)} /> The shared link may show company, role and last date before sign-in</label>
      </Section>

      <div style={{ display: 'flex', gap: 10, position: 'sticky', bottom: 0, background: 'var(--page)', padding: '10px 0', borderTop: '1px solid var(--rule)' }}>
        <button className="btn btn--primary" disabled={busy || !d.company || !d.title.trim() || !d.applyBy} onClick={save}>{busy ? 'Saving…' : id ? 'Save changes' : 'Save draft'}</button>
        <button className="btn btn--secondary" onClick={() => nav(id ? `/placement/drive/${id}` : '/placement')}>Cancel</button>
      </div>
    </div>
  )
}
