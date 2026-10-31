// "My details" on the student Profile tab: mobile, personal email, GitHub,
// LinkedIn, portfolio and the college's own fields, with how complete the
// profile is. The first save asks for consent (the college uses it for
// training and placement). Mobile / email show "not verified" until a
// one-time code confirms them (coming later).
import { useEffect, useRef, useState } from 'react'
import studentApi from '../api/student'
import { readAsDataUrl, fetchFile } from '../utils/files'

export function CompletionBar({ c, compact }) {
  const tone = c.percent >= 100 ? 'var(--tick)' : c.percent >= 60 ? 'var(--blue-ink)' : 'var(--pencil)'
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
        <b>Profile {c.percent}% complete</b>
        {!compact && <span className="muted">{c.done} of {c.total}</span>}
      </div>
      <div style={{ height: 8, background: 'var(--rule)', borderRadius: 4, overflow: 'hidden' }} role="progressbar" aria-valuenow={c.percent} aria-valuemin={0} aria-valuemax={100}>
        <div style={{ width: `${c.percent}%`, height: '100%', background: tone, transition: 'width .3s' }} />
      </div>
      {c.missing?.length > 0 && <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>Missing: {c.missing.join(', ')}</div>}
    </div>
  )
}

const Unverified = () => <span className="tag tag--muted" style={{ marginLeft: 6, fontSize: 11 }} title="We will confirm this with a one-time code later">not verified</span>
const Verified = () => <span className="tag tag--tick" style={{ marginLeft: 6, fontSize: 11 }} title="Checked by your college">verified ✓</span>

// a file field (marksheet …): upload a PDF / photo, then it is saved with the profile
function FileInput({ value, onChange }) {
  const pick = useRef(null)
  const [busy, setBusy] = useState(false), [msg, setMsg] = useState('')
  async function upload(e) {
    const f = e.target.files?.[0]; e.target.value = ''
    if (!f) return
    setBusy(true); setMsg('')
    try { const data = await readAsDataUrl(f); const r = await studentApi.post('/student/placement/documents', { kind: 'marksheet', name: f.name, data }); onChange(r.data.document.id); setMsg(`${f.name} — press Save`) }
    catch (er) { setMsg(er.response?.data?.message || er.message) }
    finally { setBusy(false) }
  }
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', fontSize: 13 }}>
      {value && !msg && <><span>📄 Uploaded</span><button type="button" className="btn btn--quiet btn--sm" onClick={() => fetchFile(studentApi, `/student/placement/documents/${value}`, { open: true })}>View</button></>}
      <button type="button" className="btn btn--secondary btn--sm" disabled={busy} onClick={() => pick.current?.click()}>{busy ? 'Uploading…' : value ? 'Replace' : 'Upload (PDF / photo, max 2 MB)'}</button>
      {msg && <span className="muted">{msg}</span>}
      <input ref={pick} type="file" accept="application/pdf,image/jpeg,image/png" style={{ display: 'none' }} onChange={upload} />
    </div>
  )
}

function CustomInput({ f, value, onChange }) {
  const v = value ?? ''
  if (f.type === 'file') return <FileInput value={value} onChange={onChange} />
  if (f.type === 'boolean') return (
    <div style={{ display: 'flex', gap: 6 }}>
      {[['Yes', true], ['No', false]].map(([l, b]) => <button key={l} type="button" className={`btn btn--sm ${value === b ? 'btn--primary' : 'btn--secondary'}`} onClick={() => onChange(b)}>{l}</button>)}
    </div>)
  if (f.type === 'select') return (
    <select className="ctl" value={v} onChange={e => onChange(e.target.value || null)}>
      <option value="">Choose…</option>{f.options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>)
  if (f.type === 'multiselect') {
    const list = Array.isArray(value) ? value : []
    return (
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {f.options.map(o => { const on = list.includes(o); return (
          <button key={o} type="button" className={`btn btn--sm ${on ? 'btn--primary' : 'btn--secondary'}`}
            onClick={() => onChange(on ? list.filter(x => x !== o) : [...list, o])}>{o}</button>) })}
      </div>)
  }
  return <input className="ctl" value={v} onChange={e => onChange(e.target.value)}
    type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : f.type === 'url' ? 'url' : 'text'}
    {...(f.type === 'number' ? { min: f.min ?? undefined, max: f.max ?? undefined, step: 'any', inputMode: 'decimal' } : {})}
    {...(f.type === 'url' ? { placeholder: 'https://…', autoCapitalize: 'off' } : {})} />
}

export default function StudentProfileCard({ onSaved }) {
  const [p, setP] = useState(null), [form, setForm] = useState(null), [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false), [msg, setMsg] = useState(null)
  async function load() {
    const { data } = await studentApi.get('/student/profile')
    setP(data.profile)
    setForm({ phone: data.profile.phone, email: data.profile.email, github: data.profile.github, linkedin: data.profile.linkedin, portfolio: data.profile.portfolio, custom: { ...data.profile.custom } })
  }
  useEffect(() => { load().catch(e => setMsg({ ok: false, t: e.response?.data?.message || 'Could not load your profile' })) }, [])
  if (!p || !form) return <section className="sheet" style={{ padding: 18 }}><p className="muted" style={{ margin: 0 }}>{msg?.t || 'Loading your profile…'}</p></section>

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))
  const setCustom = (k, v) => setForm(f => ({ ...f, custom: { ...f.custom, [k]: v } }))
  const changed = ['phone', 'email', 'github', 'linkedin', 'portfolio'].some(k => (form[k] || '') !== (p[k] || '')) || JSON.stringify(form.custom) !== JSON.stringify(p.custom)
  async function save() {
    setBusy(true); setMsg(null)
    try {
      const custom = Object.fromEntries(Object.entries(form.custom).filter(([k, v]) => JSON.stringify(v) !== JSON.stringify(p.custom[k])))
      const { data } = await studentApi.put('/student/profile', { phone: form.phone, email: form.email, github: form.github, linkedin: form.linkedin, portfolio: form.portfolio,
        ...(Object.keys(custom).length ? { custom } : {}), ...(!p.consentGiven ? { consent } : {}) })
      if (data.demo) setMsg({ ok: true, t: data.message })
      else { setP(data.profile); setForm(f => ({ ...f, ...data.profile, custom: { ...data.profile.custom } })); setMsg({ ok: true, t: 'Saved.' }); onSaved?.() }
    } catch (e) { setMsg({ ok: false, t: e.response?.data?.message || 'Could not save' }) }
    finally { setBusy(false) }
  }
  const groups = [...new Set(p.fields.map(f => f.group || 'Other'))]
  const row = { display: 'grid', gap: 12 }

  return (
    <section className="sheet" data-tour="st-details" style={{ padding: 18 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>My details</h2>
      <div style={{ marginBottom: 14 }}><CompletionBar c={p.completion} /></div>
      <p className="muted" style={{ fontSize: 13, margin: '0 0 12px' }}>Only your college's staff see these — never other students or the public pages.</p>
      <div style={row}>
        <div className="field" style={{ margin: 0 }}><label>Mobile number{p.phone && !p.phoneVerified && <Unverified />}</label>
          <input className="ctl" value={form.phone} onChange={set('phone')} inputMode="tel" autoComplete="tel" placeholder="10-digit mobile" maxLength={16} /></div>
        <div className="field" style={{ margin: 0 }}><label>Personal email{p.email && !p.emailVerified && <Unverified />}</label>
          <input className="ctl" value={form.email} onChange={set('email')} type="email" inputMode="email" autoComplete="email" autoCapitalize="off" placeholder="you@gmail.com" /></div>
        <div className="field" style={{ margin: 0 }}><label>GitHub profile</label>
          <input className="ctl" value={form.github} onChange={set('github')} inputMode="url" autoCapitalize="off" placeholder="https://github.com/yourname" /></div>
        <div className="field" style={{ margin: 0 }}><label>LinkedIn profile</label>
          <input className="ctl" value={form.linkedin} onChange={set('linkedin')} inputMode="url" autoCapitalize="off" placeholder="https://www.linkedin.com/in/yourname" /></div>
        <div className="field" style={{ margin: 0 }}><label>Portfolio / website <span className="muted" style={{ fontWeight: 400 }}>(optional)</span></label>
          <input className="ctl" value={form.portfolio} onChange={set('portfolio')} inputMode="url" autoCapitalize="off" placeholder="https://…" /></div>

        {groups.map(g => (
          <div key={g} style={row}>
            <div style={{ fontWeight: 700, fontSize: 14, borderTop: '1px solid var(--rule)', paddingTop: 12 }}>{g}</div>
            {p.fields.filter(f => (f.group || 'Other') === g).map(f => (
              <div key={f.key} className="field" style={{ margin: 0 }}>
                <label>{f.label}{f.required ? ' *' : ''}{p.verified?.[f.key] ? <Verified /> : f.needsVerification && <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}> · checked by your college</span>}</label>
                <CustomInput f={f} value={form.custom[f.key]} onChange={v => setCustom(f.key, v)} />
                {f.help && <span className="muted" style={{ fontSize: 12 }}>{f.help}</span>}
              </div>
            ))}
          </div>
        ))}

        {!p.consentGiven && (
          <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13, lineHeight: 1.45 }}>
            <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} style={{ marginTop: 3 }} />
            <span>I agree that my college may use these details for training and placement.</span>
          </label>
        )}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn--primary" disabled={busy || !changed || (!p.consentGiven && !consent)} onClick={save}>{busy ? 'Saving…' : 'Save my details'}</button>
          {msg && <span style={{ fontSize: 13, color: msg.ok ? 'var(--tick)' : 'var(--red-ink)' }}>{msg.t}</span>}
        </div>
      </div>
    </section>
  )
}
