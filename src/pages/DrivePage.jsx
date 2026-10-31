// One drive: publish / close, the share link (WhatsApp message, QR code), how
// many students see it and can apply, and the applicants — with what they had
// when they applied, which values are not verified yet (verify the shortlisted
// ones), their answers and resume. Downloads: the list (Excel) and all resumes (zip).
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import QRCode from 'qrcode'
import api from '../api'
import { useAuth } from '../context/AuthContext'
import { fetchFile } from '../utils/files'
import { fmtDate, STATUS } from './PlacementPage'

const err = (e) => e.response?.data?.message || e.message || 'Something went wrong'
const MODE = { onCampus: 'On campus', virtual: 'Virtual', offCampus: 'Off campus', pool: 'Pool drive' }
const STATE = { eligible: ['Eligible', 'tag--tick'], notEligible: ['Not eligible now', 'tag--red'], incomplete: ['Profile incomplete', 'tag--pencil'], needsVerification: ['Needs verification', 'tag--pencil'], hidden: ['Not in the audience now', 'tag--muted'] }

function SharePanel({ drive }) {
  const link = `${window.location.origin}/d/${drive.slug}`
  const day = new Date(drive.applyBy).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short' })
  const message = `📢 ${drive.company?.name} is hiring — ${drive.title}${drive.ctc?.text ? `\n💰 ${drive.ctc.text}` : ''}${drive.location ? `\n📍 ${drive.location}` : ''}\n🗓 Apply by ${day}\n👉 Check if you are eligible and apply: ${link}`
  const [qr, setQr] = useState(null), [copied, setCopied] = useState('')
  useEffect(() => { QRCode.toDataURL(link, { width: 220, margin: 1 }).then(setQr).catch(() => setQr(null)) }, [link])
  const copy = async (t, what) => { try { await navigator.clipboard.writeText(t); setCopied(what); setTimeout(() => setCopied(''), 2000) } catch { window.prompt('Copy this:', t) } }
  return (
    <section className="sheet" style={{ padding: 18, display: 'grid', gap: 12 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Share with students</h2>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 260, display: 'grid', gap: 8 }}>
          <div style={{ display: 'flex', gap: 6 }}><input className="ctl" readOnly value={link} onFocus={e => e.target.select()} />
            <button className="btn btn--secondary btn--sm" onClick={() => copy(link, 'link')}>{copied === 'link' ? 'Copied ✓' : 'Copy link'}</button></div>
          <textarea className="ctl" readOnly value={message} style={{ minHeight: 120, fontSize: 13 }} />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn--secondary btn--sm" onClick={() => copy(message, 'msg')}>{copied === 'msg' ? 'Copied ✓' : 'Copy message'}</button>
            <a className="btn btn--primary btn--sm" href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer">Share on WhatsApp</a>
          </div>
          <p className="muted" style={{ fontSize: 12, margin: 0 }}>Students who open it sign in and land on this drive. Opened {drive.opens || 0} time(s) so far.</p>
        </div>
        {qr && <div style={{ textAlign: 'center' }}><img src={qr} alt="QR code for the drive link" width={160} height={160} style={{ display: 'block' }} />
          <a href={qr} download={`${drive.slug}-qr.png`} style={{ fontSize: 12 }}>Download QR (for notices)</a></div>}
      </div>
    </section>
  )
}

export default function DrivePage() {
  const { id } = useParams()
  const nav = useNavigate()
  const { user } = useAuth()
  const canWrite = ['superadmin', 'placement'].includes(user?.role)
  const [data, setData] = useState(null), [apps, setApps] = useState(null), [show, setShow] = useState('applied'), [msg, setMsg] = useState(null), [busy, setBusy] = useState(false), [open, setOpen] = useState(null)
  async function load() {
    const [d, a] = await Promise.all([api.get(`/placement/drives/${id}`), api.get(`/placement/drives/${id}/applicants`, { params: { status: show } })])
    setData(d.data); setApps(a.data)
  }
  useEffect(() => { load().catch(e => setMsg({ ok: false, t: err(e) })) }, [id, show])
  if (!data) return <div className="page" style={{ padding: 24 }}>{msg ? <div className="banner banner--error">{msg.t}</div> : <p className="muted">Loading…</p>}</div>
  const { drive, counts } = data

  async function setStatus(status, confirmText) {
    if (confirmText && !window.confirm(confirmText)) return
    setBusy(true); setMsg(null)
    try { await api.post(`/placement/drives/${id}/status`, { status }); await load(); setMsg({ ok: true, t: status === 'published' ? 'Published — students who can see it now have it on their dashboard. Share the link below.' : status === 'closed' ? 'Closed — no more applications.' : 'Back to draft.' }) }
    catch (e) { setMsg({ ok: false, t: err(e) }) }
    finally { setBusy(false) }
  }
  async function verify(a, keys) {
    try { await api.post('/placement/verify', { personId: a.person._id, keys }); await load() }
    catch (e) { setMsg({ ok: false, t: err(e) }) }
  }
  const download = (path) => fetchFile(api, path).catch(async e => setMsg({ ok: false, t: e.response?.data instanceof Blob ? JSON.parse(await e.response.data.text()).message : err(e) }))
  const labelOf = (k) => apps?.fields?.find(f => f.key === k)?.label || k

  return (
    <div className="page" style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px 60px', display: 'grid', gap: 14 }}>
      <div>
        <button className="btn btn--quiet btn--sm" style={{ paddingLeft: 0 }} onClick={() => nav('/placement')}>← All drives</button>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap', marginTop: 4 }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{drive.company?.name} — {drive.title}</h1>
            <p className="muted" style={{ fontSize: 14, margin: '4px 0 0' }}>{[drive.ctc?.text, drive.location, MODE[drive.mode], `apply by ${fmtDate(drive.applyBy)}`].filter(Boolean).join(' · ')}</p>
          </div>
          <span className={`tag ${STATUS[drive.status][1]}`} style={{ fontSize: 13 }}>{STATUS[drive.status][0]}</span>
        </div>
        {canWrite && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
          <button className="btn btn--secondary btn--sm" onClick={() => nav(`/placement/drive/${id}/edit`)}>Edit</button>
          {drive.status !== 'published' && <button className="btn btn--primary btn--sm" disabled={busy} onClick={() => setStatus('published', `Publish? ${counts.visible} student(s) will see it on their dashboard.`)}>{drive.status === 'closed' ? 'Re-open' : 'Publish'}</button>}
          {drive.status === 'published' && <button className="btn btn--secondary btn--sm" disabled={busy} onClick={() => setStatus('closed', 'Close the drive? No more applications.')}>Close applications</button>}
          {drive.status === 'published' && counts.applied === 0 && <button className="btn btn--quiet btn--sm" disabled={busy} onClick={() => setStatus('draft')}>Back to draft</button>}
        </div>}
      </div>
      {msg && <div className={`banner ${msg.ok ? '' : 'banner--error'}`} style={{ margin: 0 }}>{msg.t}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
        {[['See it', counts.visible], ['Can apply', counts.eligible], ['Applied', counts.applied], ['Profile incomplete', counts.incomplete], ['Not eligible', counts.notEligible],
          ...(counts.needsVerification ? [['Waiting verification', counts.needsVerification]] : [])].map(([l, v]) => (
          <div key={l} className="sheet" style={{ padding: '12px 14px' }}><div className="muted" style={{ fontSize: 12 }}>{l}</div><div style={{ fontSize: 22, fontWeight: 700 }}>{v}</div></div>))}
      </div>

      {drive.status === 'published' && <SharePanel drive={drive} />}

      <section className="sheet" style={{ padding: 18, display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, flex: 1 }}>Applicants</h2>
          {[['applied', 'Applied'], ['withdrawn', 'Withdrew'], ['all', 'All']].map(([k, l]) => <button key={k} className={`btn btn--sm ${show === k ? 'btn--primary' : 'btn--secondary'}`} onClick={() => setShow(k)}>{l}</button>)}
          <button className="btn btn--secondary btn--sm" disabled={!counts.applied} onClick={() => download(`/placement/drives/${id}/export.csv`)}>Download list (Excel)</button>
          <button className="btn btn--secondary btn--sm" disabled={!counts.applied} onClick={() => download(`/placement/drives/${id}/resumes.zip`)}>Download resumes (zip)</button>
        </div>
        {!apps ? <p className="muted">Loading…</p> : apps.applicants.length === 0 ? <p className="muted" style={{ margin: 0 }}>No one yet.</p> : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead><tr><th>Student</th><th>Programme</th>{apps.fields.map(f => <th key={f.key} className="num">{f.label}</th>)}<th>Now</th><th>Resume</th><th></th></tr></thead>
              <tbody>{apps.applicants.map(a => {
                const s = a.snapshot || {}, unv = a.now?.unverified || []
                return [
                  <tr key={a._id}>
                    <td><b>{s.name}</b><div className="muted" style={{ fontSize: 12 }}>{s.roll}{a.status === 'withdrawn' ? ' · withdrew' : ''}</div></td>
                    <td style={{ fontSize: 13 }}>{[s.programme, s.branch, s.passingYear].filter(Boolean).join(' · ')}</td>
                    {apps.fields.map(f => <td key={f.key} className="num">{s.fields?.[f.key] ?? '—'}{s.fields?.[f.key] !== undefined && !unv.includes(f.key) ? <span title="Verified" style={{ color: 'var(--tick)' }}> ✓</span> : ''}</td>)}
                    <td>{a.now && <span className={`tag ${STATE[a.now.state]?.[1]}`} title={(a.now.reasons || []).join('; ')}>{STATE[a.now.state]?.[0]}</span>}
                      {unv.length > 0 && <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>not verified: {unv.map(labelOf).join(', ')}</div>}</td>
                    <td>{a.resume ? <button className="btn btn--quiet btn--sm" style={{ paddingLeft: 0 }} onClick={() => fetchFile(api, `/placement/documents/${a.resume.id}`, { open: true })}>Open</button> : '—'}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {canWrite && unv.length > 0 && <button className="btn btn--secondary btn--sm" onClick={() => verify(a, unv)}>Mark verified</button>}
                      <button className="btn btn--quiet btn--sm" onClick={() => setOpen(open === a._id ? null : a._id)}>{open === a._id ? 'Less' : 'More'}</button>
                    </td>
                  </tr>,
                  open === a._id && <tr key={a._id + 'x'}><td colSpan={5 + apps.fields.length} style={{ background: 'var(--blue-wash)', fontSize: 13 }}>
                    <div style={{ display: 'grid', gap: 4 }}>
                      <div>{[s.phone && `📞 ${s.phone}`, s.email && `✉ ${s.email}`].filter(Boolean).join(' · ') || 'No contact details'}</div>
                      <div>{[s.github && <a key="g" href={s.github} target="_blank" rel="noreferrer">GitHub</a>, s.linkedin && <a key="l" href={s.linkedin} target="_blank" rel="noreferrer">LinkedIn</a>].filter(Boolean).reduce((x, y, i) => i ? [...x, ' · ', y] : [y], [])}</div>
                      {apps.questions.map(q => <div key={q.key}><b>{q.label}</b> {a.answers?.[q.key] === true ? 'Yes' : a.answers?.[q.key] === false ? 'No' : String(a.answers?.[q.key] ?? '—')}</div>)}
                      <div className="muted">Applied {new Date(a.appliedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}{(a.now?.reasons || []).length ? ` · now: ${a.now.reasons.join('; ')}` : ''}</div>
                    </div></td></tr>,
                ]
              })}</tbody>
            </table>
          </div>
        )}
        <p className="muted" style={{ fontSize: 12, margin: 0 }}>Tip: check the marksheets of the shortlisted students only, then mark them verified — that is all the company needs.</p>
      </section>

      <section className="sheet" style={{ padding: 18 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 8px' }}>Job description</h2>
        {drive.schedule && <p style={{ fontSize: 14 }}><b>Schedule:</b> {drive.schedule}</p>}
        {drive.bond && <p style={{ fontSize: 14 }}><b>Bond:</b> {drive.bond}</p>}
        <div style={{ whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.5 }}>{drive.description || <span className="muted">No description.</span>}</div>
        {drive.jd && <button className="btn btn--secondary btn--sm" style={{ marginTop: 10 }} onClick={() => fetchFile(api, `/placement/documents/${drive.jd._id}`, { open: true })}>Open JD file</button>}
      </section>
    </div>
  )
}
