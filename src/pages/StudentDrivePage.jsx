// A placement drive, as a student sees it: the job, whether they can apply
// (and exactly why not), and the apply form — questions, resume, "my details
// are correct". After applying: what they sent, and Withdraw until the last date.
import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import studentApi, { studentSignedIn } from '../api/student'
import { readAsDataUrl, fetchFile } from '../utils/files'

const IST = { timeZone: 'Asia/Kolkata' }
const fmt = (d) => new Date(d).toLocaleString('en-IN', { ...IST, day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
const MODE = { onCampus: 'On campus', virtual: 'Virtual', offCampus: 'Off campus', pool: 'Pool drive' }
const OP = { gte: 'at least', lte: 'at most', eq: 'exactly' }
const err = (e) => e.response?.data?.message || e.message || 'Something went wrong'

function Answer({ q, value, onChange }) {
  if (q.type === 'boolean') return <div style={{ display: 'flex', gap: 6 }}>{[['Yes', true], ['No', false]].map(([l, v]) =>
    <button key={l} type="button" className={`btn btn--sm ${value === v ? 'btn--primary' : 'btn--secondary'}`} onClick={() => onChange(v)}>{l}</button>)}</div>
  if (q.type === 'select') return <select className="ctl" value={value ?? ''} onChange={e => onChange(e.target.value)}><option value="">Choose…</option>{q.options.map(o => <option key={o}>{o}</option>)}</select>
  return <input className="ctl" value={value ?? ''} onChange={e => onChange(e.target.value)} inputMode={q.type === 'number' ? 'decimal' : q.type === 'url' ? 'url' : 'text'} placeholder={q.type === 'url' ? 'https://…' : ''} />
}

export default function StudentDrivePage() {
  const { slug } = useParams()
  const [params] = useSearchParams()
  const nav = useNavigate()
  const [data, setData] = useState(null), [msg, setMsg] = useState(null), [busy, setBusy] = useState(false)
  const [answers, setAnswers] = useState({}), [resume, setResume] = useState(null), [declared, setDeclared] = useState(false), [done, setDone] = useState(null)
  const file = useRef(null)
  // the shared-link open is counted once, on the first load only
  async function load(first = false) {
    const { data } = await studentApi.get(`/student/placement/drives/${slug}`, { params: first && params.get('src') === 'share' ? { src: 'share' } : {} })
    setData(data); setResume(data.application?.resume || data.myResume || null)
  }
  useEffect(() => { if (studentSignedIn()) load(true).catch(e => setMsg({ ok: false, t: err(e) })) }, [slug])
  if (!studentSignedIn()) return <Navigate to={`/student/login?next=${encodeURIComponent(`/student/drive/${slug}`)}`} replace />
  if (!data) return <div className="page" style={{ padding: 20 }}>{msg ? <div className="banner banner--error">{msg.t}</div> : <p className="muted">Loading…</p>}</div>

  const back = <Link to="/student" style={{ fontSize: 14 }}>← Back</Link>
  if (data.hidden) return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: 20, display: 'grid', gap: 12 }}>{back}
      <section className="sheet" style={{ padding: 20 }}><h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{data.drive.company} — {data.drive.title}</h1>
        <p style={{ marginTop: 10 }}>{data.message}</p></section></div>)

  const d = data.drive, e = d.eligibility, app = data.application
  async function upload(ev) {
    const f = ev.target.files?.[0]; ev.target.value = ''
    if (!f) return
    setMsg(null)
    try { const dataUrl = await readAsDataUrl(f); const r = await studentApi.post('/student/placement/documents', { kind: 'resume', name: f.name, data: dataUrl }); setResume(r.data.document) }
    catch (er) { setMsg({ ok: false, t: err(er) }) }
  }
  async function apply() {
    setBusy(true); setMsg(null)
    try {
      const { data: r } = await studentApi.post(`/student/placement/drives/${slug}/apply`, { answers, resumeId: resume?.id, declaration: declared })
      setDone(r.demo ? r.message : `You have applied to ${d.company}. The placement office will tell you about the next steps.`)
      await load()
    } catch (er) { setMsg({ ok: false, t: err(er) }) }
    finally { setBusy(false) }
  }
  async function withdraw() {
    if (!window.confirm('Withdraw your application? You can apply again until the last date.')) return
    try { await studentApi.post(`/student/placement/drives/${slug}/withdraw`); await load() } catch (er) { setMsg({ ok: false, t: err(er) }) }
  }
  const missingRequired = (d.questions || []).some(q => q.required && (answers[q.key] === undefined || answers[q.key] === ''))

  return (
    <div style={{ background: 'var(--page)', minHeight: '100vh' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '16px 16px 60px', display: 'grid', gap: 14 }}>
        {back}
        <section className="sheet" style={{ padding: 20 }}>
          <div className="muted" style={{ fontSize: 13 }}>{d.company}</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: '2px 0 6px' }}>{d.title}</h1>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {d.ctc && <span className="tag tag--tick">{d.ctc}</span>}
            {d.location && <span className="tag tag--blue">{d.location}</span>}
            <span className="tag tag--muted">{MODE[d.mode]}</span>
          </div>
          <p style={{ fontSize: 14, margin: '10px 0 0' }}>Last date to apply: <b>{fmt(d.applyBy)}</b>{!d.open && <span style={{ color: 'var(--red-ink)' }}> — closed</span>}</p>
          {d.schedule && <p style={{ fontSize: 14, margin: '4px 0 0' }}>Schedule: {d.schedule}</p>}
          {d.bond && <p style={{ fontSize: 14, margin: '4px 0 0' }}>Bond: {d.bond}</p>}
        </section>

        {app?.status === 'applied' ? (
          <section className="sheet" style={{ padding: 18, borderLeft: '4px solid var(--tick)' }}>
            <b style={{ color: 'var(--tick)' }}>✓ You have applied</b> <span className="muted" style={{ fontSize: 13 }}>{fmt(app.appliedAt)}</span>
            {app.resume && <div style={{ fontSize: 13, marginTop: 6 }}>Resume: {app.resume.name}</div>}
            <p className="muted" style={{ fontSize: 13, margin: '6px 0 0' }}>Your placement office shares the next steps (test, interview).</p>
            {d.open && <button className="btn btn--quiet btn--sm" style={{ paddingLeft: 0, marginTop: 6 }} onClick={withdraw}>Withdraw</button>}
          </section>
        ) : !d.open ? (
          <section className="sheet" style={{ padding: 18 }}>Applications are closed.</section>
        ) : e.state === 'eligible' ? (
          <section className="sheet" style={{ padding: 18, display: 'grid', gap: 12, borderLeft: '4px solid var(--tick)' }}>
            <b style={{ color: 'var(--tick)' }}>✓ You can apply</b>
            {(d.questions || []).map(q => (
              <div key={q.key} className="field" style={{ margin: 0 }}><label>{q.label}{q.required ? ' *' : ''}</label>
                <Answer q={q} value={answers[q.key]} onChange={v => setAnswers(a => ({ ...a, [q.key]: v }))} /></div>))}
            <div className="field" style={{ margin: 0 }}>
              <label>Resume{d.resumeRequired ? ' *' : ' (optional)'}</label>
              {resume ? <div style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 14 }}>📄 {resume.name}
                <button type="button" className="btn btn--quiet btn--sm" onClick={() => fetchFile(studentApi, `/student/placement/documents/${resume.id}`, { open: true })}>View</button>
                <button type="button" className="btn btn--quiet btn--sm" onClick={() => file.current?.click()}>Change</button></div>
                : <button type="button" className="btn btn--secondary btn--sm" style={{ justifySelf: 'start' }} onClick={() => file.current?.click()}>Upload resume (PDF, max 2 MB)</button>}
              <input ref={file} type="file" accept="application/pdf" style={{ display: 'none' }} onChange={upload} />
            </div>
            <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13, lineHeight: 1.45 }}>
              <input type="checkbox" checked={declared} onChange={ev => setDeclared(ev.target.checked)} style={{ marginTop: 3 }} />
              <span>I confirm that the details in my profile are correct. If they are not, I can be removed from this drive.</span></label>
            <button className="btn btn--primary" disabled={busy || !declared || missingRequired || (d.resumeRequired && !resume)} onClick={apply}>{busy ? 'Applying…' : 'Apply'}</button>
            {e.unverified?.length > 0 && <p className="muted" style={{ fontSize: 12, margin: 0 }}>Some of your marks are not verified yet — the placement office may check your marksheets.</p>}
          </section>
        ) : (
          <section className="sheet" style={{ padding: 18, borderLeft: `4px solid ${e.state === 'notEligible' ? 'var(--red-ink)' : 'var(--pencil)'}` }}>
            {e.state === 'notEligible' && <><b>You are not eligible for this drive</b><ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 14 }}>{e.reasons.map(r => <li key={r}>{r}</li>)}</ul></>}
            {e.state === 'incomplete' && <><b>Complete your profile to check</b><p style={{ fontSize: 14, margin: '6px 0 10px' }}>Missing: {e.missing.join(', ')}</p>
              <button className="btn btn--primary btn--sm" onClick={() => { try { sessionStorage.setItem('sl_st_tab', 'profile') } catch {} nav('/student') }}>Complete my profile</button></>}
            {e.state === 'needsVerification' && <><b>Waiting for verification</b><p style={{ fontSize: 14, margin: '6px 0 0' }}>This company takes verified details only. Show your marksheets to the placement office so they can verify them.</p></>}
          </section>
        )}
        {msg && <div className={`banner ${msg.ok ? '' : 'banner--error'}`} style={{ margin: 0 }}>{msg.t}</div>}
        {done && <div className="banner" style={{ margin: 0 }}>{done}</div>}

        {d.rules?.length > 0 && <section className="sheet" style={{ padding: 18 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 6px' }}>Who can apply</h2>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14 }}>{d.rules.map((r, i) => <li key={i}>{r.label}: {OP[r.op]} {r.value}</li>)}</ul>
          {d.verifiedOnly && <p className="muted" style={{ fontSize: 13, margin: '6px 0 0' }}>Only details verified by the college count.</p>}
        </section>}
        <section className="sheet" style={{ padding: 18 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 6px' }}>About the job</h2>
          <div style={{ whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.55 }}>{d.description || <span className="muted">The placement office will share details.</span>}</div>
          {d.jd && <button className="btn btn--secondary btn--sm" style={{ marginTop: 10 }} onClick={() => fetchFile(studentApi, `/student/placement/documents/${d.jd.id}`, { open: true })}>Open the JD file</button>}
          {d.companyWebsite && <p style={{ fontSize: 13, margin: '10px 0 0' }}><a href={d.companyWebsite} target="_blank" rel="noreferrer">{d.company} website ↗</a></p>}
        </section>
      </div>
    </div>
  )
}
