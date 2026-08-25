import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../api'
import { useAuth } from '../context/AuthContext'
import { ui, Alert } from '../components/ui'

export default function CycleReportPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const [cycle, setCycle] = useState(null)
  const [live, setLive] = useState(null)
  const [form, setForm] = useState({})
  const [roster, setRoster] = useState([])
  const [top3, setTop3] = useState([
    { rank:1, student:'', name:'', roll:'', github:'', photo:null },
    { rank:2, student:'', name:'', roll:'', github:'', photo:null },
    { rank:3, student:'', name:'', roll:'', github:'', photo:null },
  ])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [alert, setAlert] = useState(null)
  const show = (msg, type='success') => { setAlert({ msg, type }); setTimeout(()=>setAlert(null), 3500) }

  useEffect(() => { load() }, [id])
  async function load() {
    setLoading(true)
    try {
      const { data } = await api.get(`/cycles/${id}`)
      setCycle(data.cycle); setLive(data.live)
      // load roster for the top-3 picker
      const batchId = data.cycle.batch?._id || data.cycle.batch
      if (batchId) {
        try { const r = await api.get('/students', { params:{ batch: batchId } }); setRoster(r.data.students) } catch { /* ignore */ }
      }
      // seed top3 from saved report if present
      const saved = data.cycle.report?.top3 || []
      if (saved.length) {
        setTop3([1,2,3].map(rank => {
          const e = saved.find(x => x.rank === rank) || {}
          return { rank, student: e.student || '', name: e.name || '', roll: e.roll || '', github: e.github || '',
            photo: e.photo?.data ? `data:${e.photo.contentType};base64,${e.photo.data}` : (typeof e.photo === 'string' ? e.photo : null) }
        }))
      }
      // seed the form: use saved report values, else fall back to live-computed
      const r = data.cycle.report || {}
      const L = data.live || {}
      setForm({
        avgAttendance:   r.avgAttendance ?? L.avgAttendance ?? '',
        sessionsHeld:    r.sessionsHeld ?? L.sessionsHeld ?? '',
        topicsPlanned:   r.topicsPlanned ?? L.topicsPlanned ?? '',
        topicsCompleted: r.topicsCompleted ?? L.topicsCompleted ?? '',
        syllabusCoverage: r.syllabusCoverage || '',
        coverageNote:    r.coverageNote || '',
        submittedCount:  r.submittedCount ?? '',
        totalStudents:   r.totalStudents ?? L.totalStudents ?? '',
        performanceRating: r.performanceRating ?? '',
        trainerConfidence: r.trainerConfidence ?? '',
        problemsFaced:   r.problemsFaced || '',
        improvementNeeded: r.improvementNeeded || '',
        standoutStudents: r.standoutStudents || '',
        strugglingStudents: r.strugglingStudents || '',
        topicsNotCovered: r.topicsNotCovered || '',
        reflection:      r.reflection || '',
        projectTitle:    r.projectTitle || '',
        projectNote:     r.projectNote || '',
      })
    } catch (e) { show(e.response?.data?.message || 'Failed to load', 'error') }
    finally { setLoading(false) }
  }

  if (loading) return <div style={{ ...ui.wrap, color:'var(--muted)' }}>Loading…</div>
  if (!cycle)  return <div style={{ ...ui.wrap, color:'var(--muted)' }}>Cycle not found.</div>

  const myId = user?.id || user?._id
  const assigned = user?.role === 'superadmin' || (cycle.batch?.trainers || []).some(t => (t._id || t) === myId)
  const closed = cycle.status === 'closed'
  const canFill = assigned && !closed && (cycle.status === 'report-open' || user?.role === 'superadmin')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const numOrNull = (v) => v === '' || v == null ? null : Number(v)

  function setTopField(rank, field, value) {
    setTop3(arr => arr.map(t => {
      if (t.rank !== rank) return t
      const next = { ...t, [field]: value }
      // when a student is picked, auto-fill name+roll from roster
      if (field === 'student') {
        const s = roster.find(x => x._id === value)
        if (s) { next.name = s.name; next.roll = s.roll || '' }
      }
      return next
    }))
  }
  function setTopPhoto(rank, file) {
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { show('Photo too large (max 2MB)', 'error'); return }
    const reader = new FileReader()
    reader.onload = () => setTop3(arr => arr.map(t => t.rank===rank ? { ...t, photo: reader.result } : t))
    reader.readAsDataURL(file)
  }

  async function save() {
    setSaving(true)
    try {
      await api.put(`/cycles/${id}/report`, {
        avgAttendance: numOrNull(form.avgAttendance),
        sessionsHeld: numOrNull(form.sessionsHeld),
        topicsPlanned: numOrNull(form.topicsPlanned),
        topicsCompleted: numOrNull(form.topicsCompleted),
        syllabusCoverage: form.syllabusCoverage,
        coverageNote: form.coverageNote,
        submittedCount: numOrNull(form.submittedCount),
        totalStudents: numOrNull(form.totalStudents),
        performanceRating: numOrNull(form.performanceRating),
        trainerConfidence: numOrNull(form.trainerConfidence),
        problemsFaced: form.problemsFaced,
        improvementNeeded: form.improvementNeeded,
        standoutStudents: form.standoutStudents,
        strugglingStudents: form.strugglingStudents,
        topicsNotCovered: form.topicsNotCovered,
        reflection: form.reflection,
        projectTitle: form.projectTitle,
        projectNote: form.projectNote,
        top3: top3
          .filter(t => t.student || t.name)   // only ranks that were filled
          .map(t => ({ rank: t.rank, student: t.student || null, name: t.name, roll: t.roll, github: t.github, photo: t.photo })),
      })
      show('Report saved.')
      load()
    } catch (e) { show(e.response?.data?.message || 'Failed to save', 'error') }
    finally { setSaving(false) }
  }

  const cLabel = `Cycle ${cycle.number}${cycle.name ? ` · ${cycle.name}` : ''}`
  const Field = ({ label, children }) => (
    <div><label style={ui.label}>{label}</label>{children}</div>
  )
  const Rating = ({ value, onChange }) => (
    <div style={{ display:'flex', gap:6 }}>
      {[1,2,3,4,5].map(n => (
        <button key={n} type="button" disabled={!canFill}
          onClick={()=>onChange(n)}
          style={{ width:36, height:36, borderRadius:8, cursor:canFill?'pointer':'default',
            background: Number(value)>=n ? 'var(--gold)' : 'rgba(255,255,255,0.06)',
            color: Number(value)>=n ? '#1a1200' : 'rgba(255,255,255,0.6)',
            border:'1px solid rgba(255,255,255,0.12)', fontWeight:700 }}>{n}</button>
      ))}
    </div>
  )

  return (
    <div style={ui.wrap}>
      <Link to="/cycles" style={{ ...ui.sub, color:'var(--blue)' }}>← All cycles</Link>
      <div style={{ marginTop:8, marginBottom:6 }}>
        <h1 style={ui.h1}>{cycle.batch?.name} — {cLabel}</h1>
        <p style={ui.sub}>
          {new Date(cycle.startDate).toLocaleDateString('en-GB')} → {new Date(cycle.endDate).toLocaleDateString('en-GB')}
          {' · '}Status: {cycle.status}
        </p>
      </div>

      {closed && <div style={{ background:'rgba(107,114,128,0.15)', border:'1px solid rgba(107,114,128,0.4)', color:'#D1D5DB', padding:'10px 14px', borderRadius:9, fontSize:13, marginBottom:16 }}>
        This cycle is closed — the numbers below are the frozen record. Ask admin to reopen if a correction is needed.
      </div>}
      {!closed && !assigned && <div style={{ background:'rgba(245,158,11,0.12)', border:'1px solid rgba(245,158,11,0.35)', color:'var(--gold)', padding:'10px 14px', borderRadius:9, fontSize:13, marginBottom:16 }}>
        View only — you're not assigned to this batch.
      </div>}
      {!closed && assigned && cycle.status==='active' && user?.role!=='superadmin' && <div style={{ background:'rgba(245,158,11,0.12)', border:'1px solid rgba(245,158,11,0.35)', color:'var(--gold)', padding:'10px 14px', borderRadius:9, fontSize:13, marginBottom:16 }}>
        The report isn't open yet. You'll be able to fill it once admin opens it for this cycle.
      </div>}

      <Alert alert={alert} />

      <fieldset disabled={!canFill} style={{ border:'none', margin:0, padding:0, opacity: canFill ? 1 : 0.75 }}>

        {/* Auto-filled numbers */}
        <div style={{ ...ui.card, marginBottom:16 }}>
          <h2 style={ui.h2}>Cycle data <span style={{ ...ui.sub, fontFamily:'var(--font-b)' }}>· auto-filled from the app, edit if needed</span></h2>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:12 }}>
            <Field label="Avg attendance %"><input style={ui.input} type="number" value={form.avgAttendance} onChange={e=>set('avgAttendance',e.target.value)} /></Field>
            <Field label="Sessions held"><input style={ui.input} type="number" value={form.sessionsHeld} onChange={e=>set('sessionsHeld',e.target.value)} /></Field>
            <Field label="Topics planned"><input style={ui.input} type="number" value={form.topicsPlanned} onChange={e=>set('topicsPlanned',e.target.value)} /></Field>
            <Field label="Topics completed"><input style={ui.input} type="number" value={form.topicsCompleted} onChange={e=>set('topicsCompleted',e.target.value)} /></Field>
          </div>
          {live && !closed && <p style={{ ...ui.sub, marginTop:8 }}>Live from logs: {live.avgAttendance ?? '—'}% attendance · {live.sessionsHeld} sessions · {live.topicsCompleted}/{live.topicsPlanned} topics done.</p>}
        </div>

        {/* Structured / trackable */}
        <div style={{ ...ui.card, marginBottom:16 }}>
          <h2 style={ui.h2}>Progress</h2>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:14 }}>
            <Field label="Syllabus coverage">
              <select style={ui.input} value={form.syllabusCoverage} onChange={e=>set('syllabusCoverage',e.target.value)}>
                <option value="">—</option><option value="on-track">On track</option>
                <option value="behind">Behind</option><option value="ahead">Ahead</option>
              </select>
            </Field>
            <Field label="Coverage note"><input style={ui.input} value={form.coverageNote} onChange={e=>set('coverageNote',e.target.value)} placeholder="short note" /></Field>
            <Field label="Projects submitted"><input style={ui.input} type="number" value={form.submittedCount} onChange={e=>set('submittedCount',e.target.value)} /></Field>
            <Field label="Total students"><input style={ui.input} type="number" value={form.totalStudents} onChange={e=>set('totalStudents',e.target.value)} /></Field>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:14, marginTop:14 }}>
            <Field label="Overall batch performance (1–5)"><Rating value={form.performanceRating} onChange={v=>set('performanceRating',v)} /></Field>
            <Field label="Your confidence with this topic (1–5)"><Rating value={form.trainerConfidence} onChange={v=>set('trainerConfidence',v)} /></Field>
          </div>
        </div>

        {/* Project */}
        <div style={{ ...ui.card, marginBottom:16 }}>
          <h2 style={ui.h2}>Project</h2>
          <div style={{ display:'grid', gap:12 }}>
            <Field label="Project title"><input style={ui.input} value={form.projectTitle} onChange={e=>set('projectTitle',e.target.value)} /></Field>
            <Field label="How the project went"><textarea style={{ ...ui.input, minHeight:60, resize:'vertical' }} value={form.projectNote} onChange={e=>set('projectNote',e.target.value)} /></Field>
          </div>
        </div>

        {/* Free text */}
        <div style={{ ...ui.card, marginBottom:16 }}>
          <h2 style={ui.h2}>Notes</h2>
          <div style={{ display:'grid', gap:12 }}>
            <Field label="Problems faced this cycle"><textarea style={{ ...ui.input, minHeight:60, resize:'vertical' }} value={form.problemsFaced} onChange={e=>set('problemsFaced',e.target.value)} /></Field>
            <Field label="Where students need improvement"><textarea style={{ ...ui.input, minHeight:60, resize:'vertical' }} value={form.improvementNeeded} onChange={e=>set('improvementNeeded',e.target.value)} /></Field>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:12 }}>
              <Field label="Standout students"><textarea style={{ ...ui.input, minHeight:50, resize:'vertical' }} value={form.standoutStudents} onChange={e=>set('standoutStudents',e.target.value)} placeholder="names" /></Field>
              <Field label="Students struggling"><textarea style={{ ...ui.input, minHeight:50, resize:'vertical' }} value={form.strugglingStudents} onChange={e=>set('strugglingStudents',e.target.value)} placeholder="names" /></Field>
            </div>
            <Field label="Topics we couldn't cover"><textarea style={{ ...ui.input, minHeight:50, resize:'vertical' }} value={form.topicsNotCovered} onChange={e=>set('topicsNotCovered',e.target.value)} /></Field>
            <Field label="Your reflection / what you'd do differently"><textarea style={{ ...ui.input, minHeight:60, resize:'vertical' }} value={form.reflection} onChange={e=>set('reflection',e.target.value)} /></Field>
          </div>
        </div>

        {/* Top 3 */}
        <div style={{ ...ui.card, marginBottom:16 }}>
          <h2 style={ui.h2}>Top 3 <span style={{ ...ui.sub, fontFamily:'var(--font-b)' }}>· shown on the public Hall of Fame</span></h2>
          <div style={{ display:'grid', gap:14 }}>
            {top3.map(t => (
              <div key={t.rank} style={{ ...ui.cardSm, display:'grid', gridTemplateColumns:'auto 1fr', gap:14, alignItems:'start' }}>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:22 }}>{t.rank===1?'🥇':t.rank===2?'🥈':'🥉'}</div>
                  <div style={{ width:64, height:64, borderRadius:'50%', overflow:'hidden', background:'rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'center', margin:'6px auto 0' }}>
                    {t.photo ? <img src={t.photo} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : <span style={{ fontSize:20, color:'var(--muted)' }}>{t.name?.[0] || '?'}</span>}
                  </div>
                  {canFill && <label style={{ ...ui.btnGhost, display:'inline-block', marginTop:6, fontSize:11, cursor:'pointer' }}>
                    Photo<input type="file" accept="image/*" style={{ display:'none' }} onChange={e=>setTopPhoto(t.rank, e.target.files[0])} />
                  </label>}
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:10 }}>
                  <div><label style={ui.label}>Rank {t.rank} — student</label>
                    <select style={ui.input} value={t.student} onChange={e=>setTopField(t.rank,'student',e.target.value)}>
                      <option value="">— select —</option>
                      {roster.map(s => <option key={s._id} value={s._id}>{s.roll?`${s.roll} · `:''}{s.name}</option>)}
                    </select>
                  </div>
                  <div><label style={ui.label}>GitHub repo</label>
                    <input style={ui.input} value={t.github} onChange={e=>setTopField(t.rank,'github',e.target.value)} placeholder="https://github.com/…" /></div>
                </div>
              </div>
            ))}
          </div>
          {roster.length===0 && <p style={{ ...ui.sub, marginTop:10 }}>No students in this batch roster yet — import them in the batch's Roster tab first.</p>}
        </div>

        {canFill && <button style={ui.btnGold} disabled={saving} onClick={save}>{saving?'Saving…':'Save report'}</button>}
      </fieldset>
    </div>
  )
}
