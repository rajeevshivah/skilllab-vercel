// The student's own page: today's class question, project submission,
// trainer feedback, this cycle's plan, and their own progress. Phone-first.
import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import studentApi, { studentSignedIn, studentSignOut } from '../api/student'

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

// Shrink a picked image to at most 1280px wide JPEG (keeps uploads small on phones)
function readImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image(), url = URL.createObjectURL(file)
    img.onload = () => {
      const k = Math.min(1, 1280 / img.width), c = document.createElement('canvas')
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k)
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
      URL.revokeObjectURL(url)
      resolve({ data: c.toDataURL('image/jpeg', 0.82).split(',')[1], contentType: 'image/jpeg' })
    }
    img.onerror = () => reject(new Error('Could not read that image'))
    img.src = url
  })
}

function PulseCard({ p, onDone }) {
  const [covered, setCovered] = useState(p.mine?.covered || '')
  const [u, setU] = useState(p.mine?.understanding || 0)
  const [busy, setBusy] = useState(false), [msg, setMsg] = useState(null)
  async function send() {
    setBusy(true); setMsg(null)
    try { await studentApi.post('/student/pulse', { covered, understanding: u }); setMsg({ ok: true, t: 'Thanks! Your answer is saved.' }); onDone() }
    catch (e) { setMsg({ ok: false, t: e.response?.data?.message || 'Could not save' }) }
    finally { setBusy(false) }
  }
  return (
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
        <button className="btn btn--primary btn--sm" disabled={busy || !covered || !u} onClick={send}>{p.mine ? 'Update answer' : 'Send'}</button>
        {msg && <span style={{ fontSize: 13, color: msg.ok ? 'var(--tick)' : 'var(--red-ink)' }}>{msg.t}</span>}
      </div>
    </Card>
  )
}

function ProjectCard({ cycle, project, onDone }) {
  const s = project.submission
  const [gh, setGh] = useState(s?.githubUrl || ''), [live, setLive] = useState(s?.liveUrl || ''), [note, setNote] = useState(s?.note || '')
  const [shot, setShot] = useState(null), [busy, setBusy] = useState(false), [msg, setMsg] = useState(null)
  const canSubmit = project.state === 'open' || project.state === 'late'
  async function pick(e) {
    const f = e.target.files?.[0]; if (!f) return
    try { setShot(await readImage(f)) } catch (err) { setMsg({ ok: false, t: err.message }) }
  }
  async function send() {
    setBusy(true); setMsg(null)
    try {
      await studentApi.post('/student/submission', { cycleId: cycle.id, githubUrl: gh, liveUrl: live, note, ...(shot ? { screenshot: shot } : {}) })
      setMsg({ ok: true, t: 'Submitted. You can submit again to change it while the box is open.' }); setShot(null); onDone()
    } catch (e) { setMsg({ ok: false, t: e.response?.data?.message || 'Could not submit' }) }
    finally { setBusy(false) }
  }
  return (
    <Card title={`Cycle ${cycle.number} project`} accent={canSubmit ? 'var(--tick)' : undefined} tour="st-project">
      <p style={{ fontSize: 14, marginBottom: 10 }}>
        Project day: <b>{fmtDay(project.projectDay)}</b>.{' '}
        {project.state === 'not-yet' && <>Submission opens {fmtDT(project.from)}.</>}
        {project.state === 'open' && <>Submission is <b style={{ color: 'var(--tick)' }}>open</b> until {fmtDT(project.until)}.</>}
        {project.state === 'late' && <><b style={{ color: 'var(--red-ink)' }}>Late submission</b> — still accepted until {fmtDT(project.lateUntil)}, marked late.</>}
        {project.state === 'closed' && <>Submission is closed.</>}
      </p>
      {s && <div className="banner banner--success" style={{ marginBottom: 12 }}>
        Submitted {fmtDT(s.submittedAt)}{s.late ? ' (late)' : ''} — <a href={s.githubUrl} target="_blank" rel="noreferrer">{s.githubUrl}</a>{s.liveUrl && <> · <a href={s.liveUrl} target="_blank" rel="noreferrer">live</a></>}{s.hasScreenshot ? ' · screenshot ✓' : ''}
      </div>}
      {canSubmit && (
        <div style={{ display: 'grid', gap: 10 }}>
          <div className="field" style={{ margin: 0 }}><label>GitHub repository link *</label>
            <input className="ctl" value={gh} onChange={e => setGh(e.target.value)} placeholder="https://github.com/yourname/project" /></div>
          <div className="field" style={{ margin: 0 }}><label>Live link (if deployed)</label>
            <input className="ctl" value={live} onChange={e => setLive(e.target.value)} placeholder="https://…" /></div>
          <div className="field" style={{ margin: 0 }}><label>Screenshot of output</label>
            <input className="ctl" type="file" accept="image/*" onChange={pick} style={{ paddingTop: 6 }} />
            {shot && <span className="muted" style={{ fontSize: 12 }}>Image ready ✓</span>}</div>
          <div className="field" style={{ margin: 0 }}><label>Note for your trainer (optional)</label>
            <textarea className="ctl" value={note} onChange={e => setNote(e.target.value)} maxLength={500} style={{ minHeight: 60 }} /></div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn--primary" disabled={busy || !gh.trim()} onClick={send}>{busy ? 'Submitting…' : s ? 'Submit again' : 'Submit project'}</button>
            {msg && <span style={{ fontSize: 13, color: msg.ok ? 'var(--tick)' : 'var(--red-ink)' }}>{msg.t}</span>}
          </div>
        </div>
      )}
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
      await studentApi.post('/student/feedback', { windowId: f.windowId, trainerId: who, ratings: r, comment })
      setR({}); setComment(''); setMsg({ ok: true, t: 'Thank you — feedback sent.' }); onDone()
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

function Account({ me, onDone }) {
  const [gh, setGh] = useState(me.student.github), [cur, setCur] = useState(''), [pw, setPw] = useState(''), [msg, setMsg] = useState(null)
  async function saveGh() {
    try { await studentApi.put('/student/github', { github: gh }); setMsg({ ok: true, t: 'GitHub saved.' }); onDone() }
    catch (e) { setMsg({ ok: false, t: e.response?.data?.message || 'Could not save' }) }
  }
  async function savePw() {
    try { await studentApi.put('/student/password', { current: cur, password: pw }); setCur(''); setPw(''); setMsg({ ok: true, t: 'Password changed.' }) }
    catch (e) { setMsg({ ok: false, t: e.response?.data?.message || 'Could not change' }) }
  }
  return (
    <Card title="My account">
      <div style={{ display: 'grid', gap: 10 }}>
        <div className="field" style={{ margin: 0 }}><label>My GitHub profile</label>
          <div style={{ display: 'flex', gap: 8 }}><input className="ctl" value={gh} onChange={e => setGh(e.target.value)} placeholder="https://github.com/yourname" />
            <button className="btn btn--secondary btn--sm" style={{ height: 40 }} onClick={saveGh}>Save</button></div></div>
        <details><summary style={{ cursor: 'pointer', fontSize: 14 }}>Change password</summary>
          <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
            <input className="ctl" type="password" placeholder="Current password" value={cur} onChange={e => setCur(e.target.value)} />
            <input className="ctl" type="password" placeholder="New password (6+ characters)" value={pw} onChange={e => setPw(e.target.value)} />
            <button className="btn btn--secondary btn--sm" style={{ justifySelf: 'start' }} disabled={!cur || pw.length < 6} onClick={savePw}>Change password</button>
          </div></details>
        {msg && <span style={{ fontSize: 13, color: msg.ok ? 'var(--tick)' : 'var(--red-ink)' }}>{msg.t}</span>}
      </div>
    </Card>
  )
}

export default function StudentHomePage() {
  const [me, setMe] = useState(null), [err, setErr] = useState(null)
  async function load() {
    try { const { data } = await studentApi.get('/student/me'); setMe(data); setErr(null) }
    catch (e) { setErr(e.response?.data?.message || 'Could not load') }
  }
  useEffect(() => { if (studentSignedIn()) load() }, [])
  if (!studentSignedIn()) return <Navigate to="/student/login" replace />
  if (err && !me) return <div className="page"><div className="banner banner--error">{err}</div></div>
  if (!me) return <div className="page"><p className="muted">Loading…</p></div>

  const done = (me.cycle?.classes || []).filter(c => c.when === 'past').length
  return (
    <div style={{ background: 'var(--page)', minHeight: '100vh' }}>
      <header style={{ background: 'var(--sheet)', borderBottom: '1px solid var(--rule)' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <div>
            <div style={{ fontWeight: 700 }}>SHEAT Skill Lab</div>
            <div className="muted" style={{ fontSize: 13 }}>{me.student.name} · {me.student.roll} · {me.batch.name}</div>
          </div>
          <button className="btn btn--secondary btn--sm" onClick={studentSignOut}>Sign out</button>
        </div>
      </header>
      <main style={{ maxWidth: 760, margin: '0 auto', padding: '18px 16px 60px', display: 'grid', gap: 14 }}>
        {me.pulseToday && <PulseCard p={me.pulseToday} onDone={load} />}
        {me.feedback.map(f => <FeedbackCard key={f.windowId} f={f} questions={me.questions} onDone={load} />)}
        {me.cycle && me.project && <ProjectCard cycle={me.cycle} project={me.project} onDone={load} />}

        {me.cycle && (
          <Card title={`Cycle ${me.cycle.number} plan · ${fmtDay(me.cycle.start)} – ${fmtDay(me.cycle.end)}`} tour="st-plan">
            <p className="muted" style={{ fontSize: 13, marginBottom: 8 }}>{done} of {me.cycle.classes.length} classes done · Trainer{me.batch.trainers.length > 1 ? 's' : ''}: {me.batch.trainers.join(', ') || '—'}</p>
            {me.cycle.classes.length === 0 ? <p className="muted">The plan for this cycle is not ready yet.</p> : (
              <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {me.cycle.classes.map(c => (
                  <li key={c.number} style={{ display: 'grid', gridTemplateColumns: '92px 1fr auto', gap: 10, padding: '9px 0', borderTop: '1px solid var(--rule)', alignItems: 'baseline',
                    ...(c.when === 'today' ? { background: 'var(--blue-wash)', margin: '0 -18px', padding: '9px 18px' } : {}) }}>
                    <span className="muted" style={{ fontSize: 13 }}>{fmtDay(c.date)}</span>
                    <span style={{ fontWeight: c.when === 'today' ? 700 : 500, color: c.when === 'past' ? 'var(--ink-soft)' : 'var(--ink)' }}>
                      <span className="muted" style={{ fontSize: 12 }}>Class {c.number} · </span>{c.title}</span>
                    <span>{c.when === 'today' ? <span className="tag tag--blue">Today</span>
                      : c.when === 'past' ? (c.myPulse ? <span className="tag tag--tick" title="Your answer">{COVER[c.myPulse.covered]}</span> : <span className="tag tag--muted">Done</span>) : null}</span>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        )}

        <Card title="My progress" tour="st-progress">
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 12 }}>
            <div><div className="muted" style={{ fontSize: 12 }}>Attendance</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: me.attendance.pct != null && me.attendance.pct < 75 ? 'var(--red-ink)' : 'var(--ink)' }}>{me.attendance.pct != null ? `${me.attendance.pct}%` : '—'}</div>
              <div className="muted" style={{ fontSize: 12 }}>{me.attendance.present} of {me.attendance.total} classes</div></div>
            <div><div className="muted" style={{ fontSize: 12 }}>Latest category</div>
              <div style={{ marginTop: 6 }}>{(() => { const m = [...me.marks].reverse().find(x => x.category); return m ? <span className={`tag ${CAT[m.category]?.[1]}`}>{CAT[m.category]?.[0]}</span> : <span className="muted">—</span> })()}</div></div>
          </div>
          {me.marks.length === 0 ? <p className="muted" style={{ fontSize: 14 }}>Your cycle marks will show here after each project day.</p> : (
            <table className="table table--compact"><thead><tr><th>Cycle</th><th className="num">Score</th><th>Category</th></tr></thead>
              <tbody>{me.marks.map(m => (
                <tr key={m.cycle}><td>Cycle {m.cycle}</td>
                  <td className="num">{m.status === 'evaluated' ? `${m.total} / ${m.outOf}` : <span className="muted">Not evaluated</span>}</td>
                  <td>{m.category ? <span className={`tag ${CAT[m.category]?.[1]}`}>{CAT[m.category]?.[0]}</span> : '—'}</td></tr>
              ))}</tbody></table>
          )}
          {me.attendance.pct != null && me.attendance.pct < 75 && <p style={{ color: 'var(--red-ink)', fontSize: 13, marginTop: 10 }}>Your attendance is below 75%. Talk to your trainer.</p>}
        </Card>

        <Account me={me} onDone={load} />
      </main>
    </div>
  )
}
