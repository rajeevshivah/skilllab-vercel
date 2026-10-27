// The student dashboard: profile (photo, GitHub), today's class question,
// project submission, trainer feedback, this cycle's plan and their progress.
// Phone-first, four tabs: Today · Plan · Progress · Profile.
import { useEffect, useRef, useState } from 'react'
import { Navigate, Link } from 'react-router-dom'
import studentApi, { studentSignedIn, studentSignOut } from '../api/student'
import { resizeImage, shrinkScreenshot } from '../utils/image'
import { CodeView, CodeFilesEditor } from '../components/CodeView'
import { useOrg } from '../context/OrgContext'

const IST = { timeZone: 'Asia/Kolkata' }
const fmtDay = (ymd) => ymd ? new Date(ymd + 'T12:00:00+05:30').toLocaleDateString('en-IN', { ...IST, weekday: 'short', day: 'numeric', month: 'short' }) : 'Date not set'
const fmtDT = (d) => d ? new Date(d).toLocaleString('en-IN', { ...IST, weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : ''
const CAT = { excellent: ['Excellent', 'tag--tick'], moderate: ['Moderate', 'tag--blue'], basic: ['Basic', 'tag--pencil'], zero: ['Zero', 'tag--red'] }
const COVER = { yes: 'Yes', partly: 'Partly', no: 'No' }

function Card({ title, children, accent, tour }) {
  return (
    <section className="sheet" data-tour={tour} style={{ padding: 18, borderLeft: accent ? `4px solid ${accent}` : undefined }}>
      {title && <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>{title}</h2>}
      {children}
    </section>
  )
}
function Scale({ value, onChange, labels = ['1', '2', '3', '4', '5'] }) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {labels.map((l, i) => (
        <button key={i} type="button" onClick={() => onChange(i + 1)} aria-label={`${i + 1} of 5`}
          className={`btn btn--sm ${value === i + 1 ? 'btn--primary' : 'btn--secondary'}`} style={{ minWidth: 40 }}>{l}</button>
      ))}
    </div>
  )
}

// "Thank you" pop-up after a student sends something (class check-in, project).
function ThanksModal({ title = 'Thank you!', text, onClose }) {
  return (
    <div role="dialog" aria-modal="true" onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,20,18,.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="sheet" onClick={e => e.stopPropagation()} style={{ maxWidth: 340, width: '100%', padding: '28px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 40, lineHeight: 1 }}>🙏</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: '12px 0 6px' }}>{title}</h2>
        <p className="muted" style={{ fontSize: 14, marginBottom: 18 }}>{text}</p>
        <button className="btn btn--primary" style={{ width: '100%' }} autoFocus onClick={onClose}>OK</button>
      </div>
    </div>
  )
}

// Today's class check-in. Once answered, the questions fold away into one line
// (with "Change" until midnight), and a thank-you pop-up confirms it.
function PulseCard({ p, onDone }) {
  const [covered, setCovered] = useState(p.mine?.covered || '')
  const [u, setU] = useState(p.mine?.understanding || 0)
  const [editing, setEditing] = useState(!p.mine)
  const [busy, setBusy] = useState(false), [err, setErr] = useState('')
  const [thanks, setThanks] = useState(null)
  async function send() {
    setBusy(true); setErr('')
    try {
      const { data } = await studentApi.post('/student/pulse', { covered, understanding: u })
      setThanks({ demo: data.demo, text: data.demo ? data.message : null })
      setEditing(false); onDone()
    } catch (e) { setErr(e.response?.data?.message || 'Could not save') }
    finally { setBusy(false) }
  }
  const answered = p.mine || (thanks && !thanks.demo ? { covered, understanding: u } : null)
  return (
    <>
      {editing ? (
        <Card title="Today's class" accent="var(--blue-ink)" tour="st-today">
          <div style={{ fontWeight: 600 }}>Class {p.number} — {p.title}</div>
          <p className="muted" style={{ fontSize: 13, margin: '4px 0 12px' }}>Answer after class (until midnight). Anonymous — your trainer sees only the class total.</p>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Did we cover today's topic?</label>
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            {Object.entries(COVER).map(([k, l]) => <button key={k} type="button" className={`btn btn--sm ${covered === k ? 'btn--primary' : 'btn--secondary'}`} onClick={() => setCovered(k)}>{l}</button>)}
          </div>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 6 }}>How well did you understand it? <span className="muted" style={{ fontWeight: 400 }}>(1 = not at all, 5 = fully)</span></label>
          <Scale value={u} onChange={setU} />
          <div style={{ marginTop: 14, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn--primary btn--sm" disabled={busy || !covered || !u} onClick={send}>{busy ? 'Sending…' : p.mine ? 'Update answer' : 'Send'}</button>
            {p.mine && <button className="btn btn--quiet btn--sm" onClick={() => setEditing(false)}>Cancel</button>}
            {err && <span style={{ fontSize: 13, color: 'var(--red-ink)' }}>{err}</span>}
          </div>
        </Card>
      ) : answered ? (
        <div className="sheet" style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, borderLeft: '3px solid var(--tick)' }}>
          <span style={{ flex: 1, fontSize: 14, lineHeight: 1.45 }}>
            <b style={{ color: 'var(--tick)' }}>✓ Today's class answered</b><br />
            <span className="muted">Covered: {COVER[answered.covered]} · understanding {answered.understanding}/5</span>
          </span>
          <button className="btn btn--quiet btn--sm" onClick={() => setEditing(true)}>Change</button>
        </div>
      ) : null}
      {thanks && <ThanksModal text={thanks.demo ? thanks.text : 'Your answer for today\'s class is saved. It helps your trainer see how the class went.'} onClose={() => setThanks(null)} />}
    </>
  )
}

// Project submission. A GitHub link, OR the code pasted file by file (for anyone
// who could not push), or both. Once submitted the form folds into a summary
// ("Edit my submission" while it is still open) and a thank-you pop-up confirms it.
function ProjectCard({ cycle, project, onDone }) {
  const s = project.submission
  const canSubmit = project.state === 'open'
  const [editing, setEditing] = useState(canSubmit && !s)
  const [gh, setGh] = useState(s?.githubUrl || ''), [live, setLive] = useState(s?.liveUrl || ''), [note, setNote] = useState(s?.note || '')
  const [files, setFiles] = useState(s?.files || [])
  const [showCode, setShowCode] = useState(!!s?.files?.length)
  const [shot, setShot] = useState(null), [busy, setBusy] = useState(false), [err, setErr] = useState('')
  const [thanks, setThanks] = useState(null), [openFile, setOpenFile] = useState(null)
  useEffect(() => { if (!canSubmit) setEditing(false); else if (!s) setEditing(true) }, [canSubmit])
  const filled = files.filter(f => f.code.trim())
  async function pick(e) {
    const f = e.target.files?.[0]; if (!f) return
    setErr('')
    try { setShot(await shrinkScreenshot(f)) } catch (er) { setErr(er.message); e.target.value = '' }
  }
  async function send() {
    setBusy(true); setErr('')
    try {
      const { data } = await studentApi.post('/student/submission', { cycleId: cycle.id, githubUrl: gh, liveUrl: live, note,
        files: filled.map(({ name, language, code }) => ({ name, language, code })), ...(shot ? { screenshot: shot } : {}) })
      setThanks(data.demo ? data.message : `Your Cycle ${cycle.number} project is submitted. Your trainer will see it on the marks page.`)
      setShot(null); setEditing(false); onDone()
    } catch (e) { setErr(e.response?.data?.message || 'Could not submit') }
    finally { setBusy(false) }
  }
  return (
    <Card title={`Cycle ${cycle.number} project`} accent={canSubmit ? 'var(--tick)' : undefined} tour="st-project">
      <p style={{ fontSize: 14, marginBottom: 10 }}>
        Project day: <b>{fmtDay(project.projectDay)}</b>.{' '}
        {canSubmit ? <>Submission is <b style={{ color: 'var(--tick)' }}>open</b> until {fmtDT(project.closesAt)}.</>
          : <>Submission is closed — your trainer opens it in class on project day.</>}
      </p>

      {s && !editing && (
        <div style={{ borderLeft: '3px solid var(--tick)', paddingLeft: 12, display: 'grid', gap: 6 }}>
          <div style={{ fontSize: 14 }}><b style={{ color: 'var(--tick)' }}>✓ Project submitted</b> <span className="muted">{fmtDT(s.submittedAt)}{s.late ? ' (after project day)' : ''}</span></div>
          <div style={{ fontSize: 13, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {s.githubUrl && <a href={s.githubUrl} target="_blank" rel="noreferrer">GitHub ↗</a>}
            {s.liveUrl && <a href={s.liveUrl} target="_blank" rel="noreferrer">Live ↗</a>}
            {s.hasScreenshot && <span className="muted">screenshot ✓</span>}
          </div>
          {s.files?.length > 0 && <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {s.files.map((f, i) => <button key={i} type="button" className={`btn btn--sm ${openFile === i ? 'btn--primary' : 'btn--secondary'}`} onClick={() => setOpenFile(openFile === i ? null : i)}>{f.name}</button>)}
          </div>}
          {openFile != null && s.files?.[openFile] && <CodeView file={s.files[openFile]} maxHeight={300} />}
          {canSubmit && <div><button className="btn btn--quiet btn--sm" style={{ paddingLeft: 0 }} onClick={() => { setEditing(true); setOpenFile(null) }}>Edit my submission</button></div>}
        </div>
      )}

      {canSubmit && editing && (
        <div style={{ display: 'grid', gap: 12 }}>
          <div className="field" style={{ margin: 0 }}><label>GitHub repository link {filled.length ? <span className="muted" style={{ fontWeight: 400 }}>(optional — you pasted code)</span> : '*'}</label>
            <input className="ctl" value={gh} onChange={e => setGh(e.target.value)} placeholder="https://github.com/yourname/project" inputMode="url" autoCapitalize="off" /></div>
          {!showCode
            ? <button type="button" className="btn btn--quiet btn--sm" style={{ justifySelf: 'start', paddingLeft: 0 }} onClick={() => { setShowCode(true); if (!files.length) setFiles([{ name: '', language: 'javascript', code: '' }]) }}>Couldn't push to GitHub? Paste your code instead →</button>
            : <div className="field" style={{ margin: 0 }}>
                <label>Your code <span className="muted" style={{ fontWeight: 400 }}>(optional — one box per file, up to 10)</span></label>
                <CodeFilesEditor files={files} onChange={setFiles} />
              </div>}
          <div className="field" style={{ margin: 0 }}><label>Live link (if deployed)</label>
            <input className="ctl" value={live} onChange={e => setLive(e.target.value)} placeholder="https://…" inputMode="url" autoCapitalize="off" /></div>
          <div className="field" style={{ margin: 0 }}><label>Screenshot of output (optional)</label>
            <input className="ctl" type="file" accept="image/*" onChange={pick} style={{ paddingTop: 6 }} />
            {shot && <span className="muted" style={{ fontSize: 12 }}>Image ready ✓ ({Math.round(shot.data.length * 0.75 / 1024)} KB)</span>}
            {!shot && s?.hasScreenshot && <span className="muted" style={{ fontSize: 12 }}>Your earlier screenshot stays unless you pick a new one.</span>}</div>
          <div className="field" style={{ margin: 0 }}><label>Note for your trainer (optional)</label>
            <textarea className="ctl" value={note} onChange={e => setNote(e.target.value)} maxLength={500} style={{ minHeight: 60 }} /></div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn--primary" disabled={busy || (!gh.trim() && !filled.length)} onClick={send}>{busy ? 'Submitting…' : s ? 'Save changes' : 'Submit project'}</button>
            {s && <button className="btn btn--quiet btn--sm" onClick={() => setEditing(false)}>Cancel</button>}
            {err && <span style={{ fontSize: 13, color: 'var(--red-ink)' }}>{err}</span>}
          </div>
        </div>
      )}
      {thanks && <ThanksModal text={thanks} onClose={() => setThanks(null)} />}
    </Card>
  )
}

function FeedbackCard({ f, questions, onDone }) {
  const pending = f.trainers.filter(t => !t.done)
  const [who, setWho] = useState(pending[0]?.id || '')
  const [r, setR] = useState({}), [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false), [msg, setMsg] = useState(null)
  async function send() {
    setBusy(true); setMsg(null)
    try {
      const { data } = await studentApi.post('/student/feedback', { windowId: f.windowId, trainerId: who, ratings: r, comment })
      setR({}); setComment(''); setMsg({ ok: true, t: data.demo ? data.message : 'Thank you — feedback sent.' }); onDone()
    } catch (e) { setMsg({ ok: false, t: e.response?.data?.message || 'Could not send' }) }
    finally { setBusy(false) }
  }
  return (
    <Card title={f.title} accent="var(--pencil)" tour="st-feedback">
      <p className="muted" style={{ fontSize: 13, marginBottom: 10 }}>Anonymous — trainers never see who answered, only the class average. Open until {fmtDT(f.until)}.</p>
      {pending.length === 0 ? <p style={{ color: 'var(--tick)', fontWeight: 600 }}>Done — thank you for your feedback.</p> : (
        <div style={{ display: 'grid', gap: 12 }}>
          {f.trainers.length > 1 && <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {f.trainers.map(t => <button key={t.id} type="button" disabled={t.done} className={`btn btn--sm ${who === t.id ? 'btn--primary' : 'btn--secondary'}`} onClick={() => setWho(t.id)}>{t.name}{t.done ? ' ✓' : ''}</button>)}
          </div>}
          <div style={{ fontWeight: 600 }}>About {f.trainers.find(t => t.id === who)?.name}:</div>
          {questions.map(q => (
            <div key={q.key}>
              <div style={{ fontSize: 14, marginBottom: 6 }}>{q.text}</div>
              <Scale value={r[q.key]} onChange={v => setR(o => ({ ...o, [q.key]: v }))} />
            </div>
          ))}
          <div className="field" style={{ margin: 0 }}><label>Anything else? (optional)</label>
            <textarea className="ctl" value={comment} onChange={e => setComment(e.target.value)} maxLength={1000} style={{ minHeight: 60 }} /></div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn--primary btn--sm" disabled={busy || !who || questions.some(q => !r[q.key])} onClick={send}>Send feedback</button>
            {msg && <span style={{ fontSize: 13, color: msg.ok ? 'var(--tick)' : 'var(--red-ink)' }}>{msg.t}</span>}
          </div>
        </div>
      )}
    </Card>
  )
}

const initials = (n) => String(n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('')
const MEDAL = { 1: '🥇', 2: '🥈', 3: '🥉' }
const daysBetween = (a, b) => Math.round((new Date(b + 'T12:00:00Z') - new Date(a + 'T12:00:00Z')) / 864e5)

function Avatar({ photo, name, size = 76, onClick }) {
  const [bad, setBad] = useState(false)
  useEffect(() => setBad(false), [photo])
  if (bad) photo = null                                   // unreadable picture → initials
  const style = { width: size, height: size, borderRadius: '50%', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'var(--blue-wash)', color: 'var(--blue-ink)', fontWeight: 700, fontSize: size * 0.36, border: '3px solid var(--sheet)', boxShadow: '0 1px 4px rgba(27,36,34,.18)',
    cursor: onClick ? 'pointer' : 'default', padding: 0 }
  const inner = photo ? <img src={photo} alt="" onError={() => setBad(true)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials(name)
  return onClick ? <button type="button" onClick={onClick} style={style} aria-label="Change profile photo">{inner}</button> : <div style={style}>{inner}</div>
}

function Stat({ label, value, sub, tone, bar }) {
  return (
    <div className="sheet" style={{ padding: '12px 14px' }}>
      <div className="muted" style={{ fontSize: 12 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.25, color: tone || 'var(--ink)' }}>{value}</div>
      {bar != null && <div style={{ height: 6, background: 'var(--rule)', borderRadius: 3, marginTop: 6, overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(100, bar)}%`, height: '100%', background: 'var(--tick)' }} /></div>}
      {sub && <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

function PhotoCard({ me, onDone }) {
  const input = useRef(null)
  const [busy, setBusy] = useState(false), [msg, setMsg] = useState(null)
  const photo = me.student.photo
  async function pick(e) {
    const f = e.target.files?.[0]; e.target.value = ''
    if (!f) return
    setBusy(true); setMsg(null)
    try {
      const dataUrl = await resizeImage(f, 480, 0.85)
      const { data } = await studentApi.put('/student/photo', { photo: dataUrl })
      setMsg({ ok: true, t: data.hallOfFame ? 'Photo saved — also updated on the Hall of Fame.' : 'Photo saved.' }); onDone()
    } catch (err) { setMsg({ ok: false, t: err.response?.data?.message || err.message || 'Could not save' }) }
    finally { setBusy(false) }
  }
  async function remove() {
    setBusy(true); setMsg(null)
    try { await studentApi.put('/student/photo', { photo: null }); setMsg({ ok: true, t: 'Photo removed.' }); onDone() }
    catch (err) { setMsg({ ok: false, t: err.response?.data?.message || 'Could not remove' }) }
    finally { setBusy(false) }
  }
  return (
    <Card title="Profile photo" tour="st-photo">
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <Avatar photo={photo} name={me.student.name} size={96} onClick={() => input.current?.click()} />
        <div style={{ flex: 1, minWidth: 200 }}>
          <p style={{ fontSize: 14, margin: '0 0 10px' }}>
            If you make it to a cycle's <b>Top 3</b>, this photo is shown on the public <Link to="/">Hall of Fame</Link>. Use a clear photo of your face.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn--primary btn--sm" disabled={busy} onClick={() => input.current?.click()}>{busy ? 'Saving…' : photo ? 'Change photo' : 'Add photo'}</button>
            {photo && <button className="btn btn--secondary btn--sm" disabled={busy} onClick={remove}>Remove</button>}
          </div>
          <input ref={input} type="file" accept="image/*" onChange={pick} style={{ display: 'none' }} />
          {msg && <div style={{ fontSize: 13, marginTop: 8, color: msg.ok ? 'var(--tick)' : 'var(--red-ink)' }}>{msg.t}</div>}
        </div>
      </div>
    </Card>
  )
}

function Account({ me, onDone }) {
  const [gh, setGh] = useState(me.student.github), [cur, setCur] = useState(''), [pw, setPw] = useState(''), [msg, setMsg] = useState(null)
  async function saveGh() {
    try { await studentApi.put('/student/github', { github: gh }); setMsg({ ok: true, t: 'GitHub saved.' }); onDone() }
    catch (e) { setMsg({ ok: false, t: e.response?.data?.message || 'Could not save' }) }
  }
  async function savePw() {
    try {
      const { data } = await studentApi.put('/student/password', { current: cur, password: pw })
      if (data.token) localStorage.setItem('sl_student_token', data.token)   // other devices are signed out; this one stays
      setCur(''); setPw(''); setMsg({ ok: true, t: 'Password changed. Other devices are signed out.' })
    }
    catch (e) { setMsg({ ok: false, t: e.response?.data?.message || 'Could not change' }) }
  }
  return (
    <Card title="Account">
      <div style={{ display: 'grid', gap: 12 }}>
        <div className="muted" style={{ fontSize: 14 }}>{[me.student.course, me.student.sem, me.student.section, `Roll ${me.student.roll}`].filter(Boolean).join(' · ')}</div>
        <div className="field" style={{ margin: 0 }}><label>My GitHub profile</label>
          <div style={{ display: 'flex', gap: 8 }}><input className="ctl" value={gh} onChange={e => setGh(e.target.value)} placeholder="https://github.com/yourname" />
            <button className="btn btn--secondary btn--sm" style={{ height: 40 }} onClick={saveGh}>Save</button></div></div>
        <details><summary style={{ cursor: 'pointer', fontSize: 14 }}>Change password</summary>
          <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
            <input className="ctl" type="password" placeholder="Current password" value={cur} onChange={e => setCur(e.target.value)} />
            <input className="ctl" type="password" placeholder="New password (8+ characters)" value={pw} onChange={e => setPw(e.target.value)} />
            <button className="btn btn--secondary btn--sm" style={{ justifySelf: 'start' }} disabled={!cur || pw.length < 8} onClick={savePw}>Change password</button>
          </div></details>
        {msg && <span style={{ fontSize: 13, color: msg.ok ? 'var(--tick)' : 'var(--red-ink)' }}>{msg.t}</span>}
        <button className="btn btn--secondary btn--sm" style={{ justifySelf: 'start' }} onClick={studentSignOut}>Sign out</button>
      </div>
    </Card>
  )
}

function PlanList({ cycle, trainers }) {
  const done = cycle.classes.filter(c => c.when === 'past' && !c.holiday).length
  const total = cycle.classes.filter(c => !c.holiday).length
  return (
    <Card title={`Cycle ${cycle.number} plan · ${fmtDay(cycle.start)} – ${fmtDay(cycle.end)}`} tour="st-plan">
      <p className="muted" style={{ fontSize: 13, marginBottom: 8 }}>{done} of {total} classes done · Trainer{trainers.length > 1 ? 's' : ''}: {trainers.join(', ') || '—'}</p>
      {cycle.classes.length === 0 ? <p className="muted">The plan for this cycle is not ready yet.</p> : (
        <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {cycle.classes.map(c => (
            <li key={c.number} style={{ display: 'grid', gridTemplateColumns: '92px 1fr auto', gap: 10, padding: '9px 0', borderTop: '1px solid var(--rule)', alignItems: 'baseline',
              ...(c.when === 'today' ? { background: 'var(--blue-wash)', margin: '0 -18px', padding: '9px 18px' } : {}) }}>
              <span className="muted" style={{ fontSize: 13 }}>{fmtDay(c.date)}</span>
              <span style={{ fontWeight: c.when === 'today' ? 700 : 500, color: c.when === 'past' ? 'var(--ink-soft)' : 'var(--ink)' }}>
                <span className="muted" style={{ fontSize: 12 }}>Class {c.number} · </span>{c.title || 'Topic coming soon'}</span>
              <span>{c.holiday ? <span className="tag tag--pencil" title={c.holiday}>Holiday</span> : c.when === 'today' ? <span className="tag tag--blue">Today</span>
                : c.when === 'past' ? (c.myPulse ? <span className="tag tag--tick" title="Your answer">{COVER[c.myPulse.covered]}</span> : <span className="tag tag--muted">Done</span>) : null}</span>
            </li>
          ))}
        </ol>
      )}
    </Card>
  )
}

function Progress({ me }) {
  const ev = me.marks.filter(m => m.status === 'evaluated' && m.total != null)
  return (
    <>
      <Card title="My scores" tour="st-progress">
        {me.marks.length === 0 ? <p className="muted" style={{ fontSize: 14 }}>Your cycle marks show here after each project day.</p> : (
          <>
            {ev.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, height: 130, padding: '6px 4px 0', marginBottom: 14, borderBottom: '1px solid var(--rule)' }} aria-label="Score per cycle">
                {ev.map(m => { const pct = Math.round(100 * m.total / m.outOf); return (
                  <div key={m.cycle} style={{ flex: 1, maxWidth: 56, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                    <span style={{ fontSize: 12, fontWeight: 700 }}>{pct}%</span>
                    <div style={{ width: '100%', height: `${Math.max(4, pct)}%`, borderRadius: '4px 4px 0 0', background: m.category === 'excellent' ? 'var(--tick)' : m.category === 'moderate' ? 'var(--blue-ink)' : m.category === 'basic' ? 'var(--pencil)' : 'var(--red-ink)' }} />
                    <span className="muted" style={{ fontSize: 11 }}>C{m.cycle}</span>
                  </div>) })}
              </div>
            )}
            <table className="table table--compact"><thead><tr><th>Cycle</th><th className="num">Score</th><th>Category</th></tr></thead>
              <tbody>{me.marks.map(m => (
                <tr key={m.cycle}><td>Cycle {m.cycle}</td>
                  <td className="num">{m.status === 'evaluated' ? `${m.total} / ${m.outOf}` : <span className="muted">Not evaluated</span>}</td>
                  <td>{m.category ? <span className={`tag ${CAT[m.category]?.[1]}`}>{CAT[m.category]?.[0]}</span> : '—'}</td></tr>
              ))}</tbody></table>
          </>
        )}
      </Card>
      <Card title="Attendance">
        <div style={{ fontSize: 26, fontWeight: 700, color: me.attendance.pct != null && me.attendance.pct < 75 ? 'var(--red-ink)' : 'var(--ink)' }}>{me.attendance.pct != null ? `${me.attendance.pct}%` : '—'}</div>
        <div className="muted" style={{ fontSize: 13 }}>{me.attendance.present} of {me.attendance.total} classes this semester</div>
        {me.attendance.pct != null && me.attendance.pct < 75 && <p style={{ color: 'var(--red-ink)', fontSize: 13, marginTop: 8 }}>Your attendance is below 75%. Talk to your trainer.</p>}
      </Card>
      <Card title="Hall of Fame">
        {me.achievements.length ? (
          <div style={{ display: 'grid', gap: 6 }}>
            {me.achievements.map(a => <div key={a.cycle} style={{ fontSize: 15 }}>{MEDAL[a.rank]} Rank {a.rank} · Cycle {a.cycle}</div>)}
            <Link to="/" style={{ fontSize: 14, marginTop: 4 }}>See the Hall of Fame →</Link>
          </div>
        ) : <p className="muted" style={{ fontSize: 14, margin: 0 }}>Finish in your batch's Top 3 on project day and your name and photo go up on the <Link to="/">Hall of Fame</Link>.</p>}
      </Card>
    </>
  )
}

const TABS = [['today', 'Today'], ['plan', 'Plan'], ['progress', 'Progress'], ['profile', 'Profile']]

export default function StudentHomePage() {
  const { brand } = useOrg()
  const [me, setMe] = useState(null), [err, setErr] = useState(null)
  const [tab, setTab] = useState(() => { try { return sessionStorage.getItem('sl_st_tab') || 'today' } catch { return 'today' } })
  const go = (t) => { setTab(t); try { sessionStorage.setItem('sl_st_tab', t) } catch {} window.scrollTo({ top: 0 }) }
  async function load() {
    try { const { data } = await studentApi.get('/student/me'); setMe(data); setErr(null) }
    catch (e) { setErr(e.response?.data?.message || 'Could not load') }
  }
  useEffect(() => { if (studentSignedIn()) load() }, [])
  if (!studentSignedIn()) return <Navigate to="/student/login" replace />
  if (err && !me) return <div className="page"><div className="banner banner--error">{err}</div></div>
  if (!me) return <div className="page"><p className="muted">Loading…</p></div>

  const classes = (me.cycle?.classes || []).filter(c => !c.holiday)
  const done = classes.filter(c => c.when === 'past').length
  const next = classes.find(c => c.when === 'today') || classes.find(c => c.when === 'upcoming')
  const latest = [...me.marks].reverse().find(m => m.status === 'evaluated' && m.total != null)
  const pd = me.project?.projectDay, toProject = pd ? daysBetween(me.today, pd) : null
  const todo = (me.pulseToday && !me.pulseToday.mine ? 1 : 0) + me.feedback.filter(f => f.trainers.some(t => !t.done)).length + (me.project?.state === 'open' && !me.project.submission ? 1 : 0)
  const first = me.student.name.split(' ')[0]

  return (
    <div style={{ background: 'var(--page)', minHeight: '100vh' }}>
      <header style={{ background: 'linear-gradient(180deg, var(--blue-wash), var(--page))' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '14px 16px 6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>{brand}</span>
            <Link to="/" style={{ fontSize: 13 }}>Hall of Fame</Link>
          </div>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <Avatar photo={me.student.photo} name={me.student.name} onClick={() => go('profile')} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.2 }}>Hi, {first}</div>
              <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>{me.student.roll} · {me.batch.name}{me.batch.track ? ` · ${me.batch.track}` : ''}</div>
              {me.achievements.length > 0 && <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {me.achievements.map(a => <span key={a.cycle} className="tag tag--pencil">{MEDAL[a.rank]} Top 3 · Cycle {a.cycle}</span>)}
              </div>}
              {!me.student.photo && <button type="button" className="btn btn--quiet btn--sm" style={{ padding: 0, marginTop: 4, fontSize: 13 }} onClick={() => go('profile')}>+ Add your photo</button>}
            </div>
          </div>
        </div>
        <nav style={{ position: 'sticky', top: 0, zIndex: 5, background: 'var(--page)', borderBottom: '1px solid var(--rule)' }}>
          <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 8px', display: 'flex' }} role="tablist">
            {TABS.map(([k, l]) => (
              <button key={k} role="tab" aria-selected={tab === k} onClick={() => go(k)}
                style={{ flex: 1, background: 'none', border: 'none', padding: '12px 4px 10px', fontSize: 14, fontWeight: tab === k ? 700 : 500, cursor: 'pointer',
                  color: tab === k ? 'var(--blue-ink)' : 'var(--ink-soft)', borderBottom: `3px solid ${tab === k ? 'var(--blue-ink)' : 'transparent'}`, position: 'relative' }}>
                {l}{k === 'today' && todo > 0 && <span style={{ marginLeft: 6, background: 'var(--red-ink)', color: '#fff', borderRadius: 9, fontSize: 11, padding: '1px 6px' }}>{todo}</span>}
              </button>
            ))}
          </div>
        </nav>
      </header>

      <main style={{ maxWidth: 760, margin: '0 auto', padding: '16px 16px 60px', display: 'grid', gap: 14 }}>
        {me.student.demo && <div className="banner banner--pencil" style={{ margin: 0 }}><b>Demo account.</b> Everything works as for a real student, but answers, feedback and submissions are not saved and this account is not in any roster.</div>}
        {tab === 'today' && <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
            <Stat label="Attendance" value={me.attendance.pct != null ? `${me.attendance.pct}%` : '—'} sub={`${me.attendance.present} of ${me.attendance.total} classes`}
              tone={me.attendance.pct != null && me.attendance.pct < 75 ? 'var(--red-ink)' : undefined} />
            {me.cycle && <Stat label={`Cycle ${me.cycle.number}`} value={`${done} / ${classes.length}`} sub="classes done" bar={classes.length ? 100 * done / classes.length : 0} />}
            {pd && <Stat label="Project day" value={toProject > 1 ? `in ${toProject} days` : toProject === 1 ? 'Tomorrow' : toProject === 0 ? 'Today' : fmtDay(pd)} sub={fmtDay(pd)}
              tone={toProject != null && toProject >= 0 && toProject <= 2 ? 'var(--pencil)' : undefined} />}
            <Stat label="Last score" value={latest ? `${Math.round(100 * latest.total / latest.outOf)}%` : '—'} sub={latest ? `Cycle ${latest.cycle} · ${CAT[latest.category]?.[0] || ''}` : 'after project day'} />
          </div>
          {me.holidayToday && <Card accent="var(--blue-ink)"><b>No class today</b> — {me.holidayToday}.</Card>}
          {me.pulseToday && <PulseCard p={me.pulseToday} onDone={load} />}
          {me.feedback.map(f => <FeedbackCard key={f.windowId} f={f} questions={me.questions} onDone={load} />)}
          {me.cycle && me.project && <ProjectCard cycle={me.cycle} project={me.project} onDone={load} />}
          {!me.pulseToday && !me.holidayToday && next && (
            <Card title="Next class" accent="var(--rule-strong)">
              <div style={{ fontWeight: 600 }}>Class {next.number} — {next.title || 'Topic coming soon'}</div>
              <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>{fmtDay(next.date)}</div>
            </Card>
          )}
        </>}
        {tab === 'plan' && (me.cycle ? <PlanList cycle={me.cycle} trainers={me.batch.trainers} /> : <Card><p className="muted" style={{ margin: 0 }}>No cycle planned yet.</p></Card>)}
        {tab === 'progress' && <Progress me={me} />}
        {tab === 'profile' && <>
          <PhotoCard me={me} onDone={load} />
          <Account me={me} onDone={load} />
        </>}
      </main>
    </div>
  )
}
