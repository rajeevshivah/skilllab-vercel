import { useState, useEffect } from 'react'
import { useAuth }    from '../context/AuthContext'
import { reportsAPI } from '../api/index'

const BRAND = '#1A3C5E'

const S = {
  page:    { maxWidth: 800, margin: '40px auto', padding: '0 24px 60px' },
  title:   { fontFamily: 'var(--font-d)', fontSize: 26, fontWeight: 900, color: 'var(--gold)', marginBottom: 8 },
  sub:     { color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: 32 },
  card:    { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 28, marginBottom: 24 },
  secHead: { fontSize: 13, fontWeight: 700, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 },
  label:   { display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6, marginTop: 16 },
  input:   { width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: 14, boxSizing: 'border-box' },
  textarea:{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: 14, minHeight: 100, resize: 'vertical', boxSizing: 'border-box' },
  select:  { width: '100%', background: 'rgba(20,36,60,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: 14, boxSizing: 'border-box' },
  row2:    { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  row3:    { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 },
  btnRow:  { display: 'flex', gap: 12, marginTop: 32 },
  btnDraft:  { padding: '12px 28px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, color: '#fff', fontSize: 14, cursor: 'pointer', fontWeight: 600 },
  btnSubmit: { padding: '12px 28px', background: 'var(--gold)', border: 'none', borderRadius: 8, color: '#000', fontSize: 14, cursor: 'pointer', fontWeight: 700 },
  btnDis:    { opacity: 0.4, cursor: 'not-allowed' },
  badge: (s) => ({
    display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, marginLeft: 10,
    background: s === 'locked' ? 'rgba(192,57,43,0.25)' : s === 'submitted' ? 'rgba(39,174,96,0.2)' : 'rgba(255,255,255,0.07)',
    color: s === 'locked' ? '#e74c3c' : s === 'submitted' ? '#2ecc71' : 'rgba(255,255,255,0.5)',
  }),
  msgOk:  { padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13, background: 'rgba(39,174,96,0.15)', color: '#2ecc71', border: '1px solid #27ae60' },
  msgErr: { padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13, background: 'rgba(192,57,43,0.15)', color: '#e74c3c', border: '1px solid #c0392b' },
  secPick: { display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  secBtn:  (active) => ({ padding: '10px 18px', borderRadius: 8, border: `1px solid ${active ? 'var(--gold)' : 'rgba(255,255,255,0.1)'}`, background: active ? 'rgba(255,193,7,0.1)' : 'rgba(255,255,255,0.04)', color: active ? 'var(--gold)' : 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: 13, fontWeight: active ? 700 : 400 }),
}

const LEVELS = ['Low', 'Medium', 'High', 'Excellent']

const EMPTY = {
  coTrainerName: '', startDate: '', endDate: '',
  projectConducted: 'false',
  totalStudents: '', avgPercent: '',
  below40: '', mid: '', above70: '',
  avgMarks: '',
  engagementLevel: '', skillProgressLevel: '',
  topicsCovered: '',
  challenges: '', operationalChallenges: '',
  achievements: '',
  recommendations: '',
  summary: '',
}

function reportToForm(r) {
  return {
    coTrainerName:         r.coTrainerName || '',
    startDate:             r.startDate ? r.startDate.slice(0, 10) : '',
    endDate:               r.endDate   ? r.endDate.slice(0, 10)   : '',
    projectConducted:      String(r.projectConducted ?? 'false'),
    totalStudents:         r.attendance?.totalStudents ?? '',
    avgPercent:            r.attendance?.avgPercent    ?? '',
    below40:               r.marks?.below40 ?? '',
    mid:                   r.marks?.mid     ?? '',
    above70:               r.marks?.above70 ?? '',
    avgMarks:              r.avgMarks ?? '',
    engagementLevel:       r.engagementLevel    || '',
    skillProgressLevel:    r.skillProgressLevel || '',
    topicsCovered:         (r.topicsCovered || []).join('\n'),
    challenges:            r.challenges            || '',
    operationalChallenges: r.operationalChallenges || '',
    achievements:          r.achievements          || '',
    recommendations:       (r.recommendations || []).join('\n'),
    summary:               r.summary || '',
  }
}

function formToPayload(form, picked, cycle) {
  return {
    ...picked, cycle,
    coTrainerName:         form.coTrainerName,
    startDate:             form.startDate  || null,
    endDate:               form.endDate    || null,
    projectConducted:      form.projectConducted === 'true',
    attendance: {
      totalStudents: form.totalStudents !== '' ? Number(form.totalStudents) : null,
      avgPercent:    form.avgPercent    !== '' ? Number(form.avgPercent)    : null,
    },
    marks: {
      below40: form.below40 !== '' ? Number(form.below40) : null,
      mid:     form.mid     !== '' ? Number(form.mid)     : null,
      above70: form.above70 !== '' ? Number(form.above70) : null,
    },
    avgMarks:              form.avgMarks !== '' ? Number(form.avgMarks) : null,
    engagementLevel:       form.engagementLevel    || null,
    skillProgressLevel:    form.skillProgressLevel || null,
    topicsCovered:         form.topicsCovered.split('\n').map(s => s.trim()).filter(Boolean),
    challenges:            form.challenges,
    operationalChallenges: form.operationalChallenges,
    achievements:          form.achievements,
    recommendations:       form.recommendations.split('\n').map(s => s.trim()).filter(Boolean),
    summary:               form.summary,
  }
}

export default function ReportPage() {
  const { user } = useAuth()
  const [sections, setSections] = useState([])
  const [picked,   setPicked]   = useState(null)
  const [cycle,    setCycle]    = useState('')
  const [cycles,   setCycles]   = useState([])
  const [form,     setForm]     = useState(EMPTY)
  const [reportId, setReportId] = useState(null)
  const [status,   setStatus]   = useState('draft')
  const [msg,      setMsg]      = useState(null)  // { ok, text }
  const [saving,   setSaving]   = useState(false)

  // Build flat section list
  useEffect(() => {
    if (!user) return
    const flat = []
    ;(user.assignedSections || []).forEach(a => {
      ;(a.sections || []).forEach(sec => {
        flat.push({ stream: a.stream, course: a.course, year: a.year, sem: a.sem, section: sec })
      })
    })
    setSections(flat)
  }, [user])

  // Load cycles from config
  useEffect(() => {
    fetch('/api/config')
      .then(r => r.json())
      .then(d => setCycles((d.config?.cycle || []).map(c => c.value)))
      .catch(() => {})
  }, [])

  // Load existing report when section + cycle selected
  useEffect(() => {
    if (!picked || !cycle) return
    setMsg(null)
    reportsAPI.list({
      stream: picked.stream, course: picked.course,
      year: picked.year, sem: picked.sem,
      section: picked.section, cycle,
    })
      .then(res => {
        const r = Array.isArray(res.data) ? res.data[0] : null
        if (r) {
          setReportId(r._id)
          setStatus(r.status)
          setForm(reportToForm(r))
        } else {
          setReportId(null)
          setStatus('draft')
          setForm(EMPTY)
        }
      })
      .catch(() => {})
  }, [picked, cycle])

  const isLocked    = status === 'locked'
  const isSubmitted = status === 'submitted'
  const readOnly = isLocked

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  // ── Save Draft ─────────────────────────────────────────────────
  async function handleSave() {
    if (!picked || !cycle) return setMsg({ ok: false, text: 'Please select a section and cycle first.' })
    setSaving(true); setMsg(null)
    try {
      const payload = formToPayload(form, picked, cycle)
      let id = reportId
      if (!id) {
        const res = await reportsAPI.save(payload)
        id = res.data._id
        setReportId(id)
        setStatus(res.data.status)
      } else {
        const res = await reportsAPI.update(id, payload)
        setStatus(res.data.status)
      }
      setMsg({ ok: true, text: 'Draft saved successfully.' })
    } catch (e) {
      setMsg({ ok: false, text: e.response?.data?.error || 'Save failed.' })
    } finally { setSaving(false) }
  }

  // ── Submit ─────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!picked || !cycle) return setMsg({ ok: false, text: 'Please select a section and cycle first.' })
    setSaving(true); setMsg(null)
    try {
      const payload = formToPayload(form, picked, cycle)
      let id = reportId

      // Save/update first
      if (!id) {
        const res = await reportsAPI.save(payload)
        id = res.data._id
        setReportId(id)
      } else {
        await reportsAPI.update(id, payload)
      }

      // Then submit
      await reportsAPI.submit(id)
      setStatus('submitted')
      setMsg({ ok: true, text: 'Report submitted successfully!' })
    } catch (e) {
      setMsg({ ok: false, text: e.response?.data?.error || 'Submit failed.' })
    } finally { setSaving(false) }
  }

  if (!user) return null

  return (
    <div style={S.page}>
      <div style={S.title}>📋 Cycle Report</div>
      <div style={S.sub}>Submit your section report at the end of each cycle.</div>

      {/* Step 1 — Pick section */}
      <div style={S.card}>
        <div style={S.secHead}>Step 1 — Select Your Section</div>
        {sections.length === 0
          ? <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>No sections assigned. Contact superadmin.</div>
          : <div style={S.secPick}>
              {sections.map((s, i) => (
                <button key={i} style={S.secBtn(
                  picked?.section === s.section &&
                  picked?.stream  === s.stream  &&
                  picked?.course  === s.course
                )}
                  onClick={() => { setPicked(s); setReportId(null); setStatus('draft'); setForm(EMPTY); setCycle('') }}>
                  <strong>{s.section}</strong><br />
                  <span style={{ fontSize: 11, opacity: 0.6 }}>{s.stream}<br />{s.course} · {s.year}</span>
                </button>
              ))}
            </div>
        }

        {picked && (
          <>
            <label style={S.label}>Select Cycle</label>
            <select style={S.select} value={cycle} onChange={e => setCycle(e.target.value)}>
              <option value="">— Select cycle —</option>
              {cycles.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </>
        )}
      </div>

      {/* Step 2 — Form */}
      {picked && cycle && (
        <>
          {isLocked && (
            <div style={S.msgErr}>🔒 This report has been locked by the superadmin. No further edits are possible.</div>
          )}
          {isSubmitted && !isLocked && (
            <div style={S.msgOk}>✅ Report submitted. Waiting for superadmin review.</div>
          )}
          {msg && <div style={msg.ok ? S.msgOk : S.msgErr}>{msg.text}</div>}

          {/* Section info */}
          <div style={S.card}>
            <div style={S.secHead}>
              Section Info <span style={S.badge(status)}>{status}</span>
            </div>
            <div style={S.row2}>
              <div><label style={S.label}>Stream</label><input style={S.input} value={picked.stream}  readOnly /></div>
              <div><label style={S.label}>Course</label><input style={S.input} value={picked.course}  readOnly /></div>
              <div><label style={S.label}>Year</label>  <input style={S.input} value={picked.year}    readOnly /></div>
              <div><label style={S.label}>Semester</label><input style={S.input} value={picked.sem}   readOnly /></div>
              <div><label style={S.label}>Section</label><input style={S.input} value={picked.section} readOnly /></div>
              <div><label style={S.label}>Cycle</label>  <input style={S.input} value={cycle}         readOnly /></div>
            </div>
            <label style={S.label}>Co-Trainer Name</label>
            <input style={S.input} value={form.coTrainerName} disabled={readOnly}
              onChange={e => set('coTrainerName', e.target.value)}
              placeholder="Enter co-trainer name (if any)" />
          </div>

          {/* Cycle Dates */}
          <div style={S.card}>
            <div style={S.secHead}>Cycle Dates & Project</div>
            <div style={S.row2}>
              <div><label style={S.label}>Start Date</label>
                <input type="date" style={S.input} value={form.startDate} disabled={readOnly} onChange={e => set('startDate', e.target.value)} /></div>
              <div><label style={S.label}>End Date</label>
                <input type="date" style={S.input} value={form.endDate} disabled={readOnly} onChange={e => set('endDate', e.target.value)} /></div>
            </div>
            <label style={S.label}>Project Conducted?</label>
            <select style={S.select} value={form.projectConducted} disabled={readOnly}
              onChange={e => set('projectConducted', e.target.value)}>
              <option value="false">No</option>
              <option value="true">Yes</option>
            </select>
          </div>

          {/* Attendance */}
          <div style={S.card}>
            <div style={S.secHead}>Attendance</div>
            <div style={S.row2}>
              <div><label style={S.label}>Total Students</label>
                <input type="number" style={S.input} value={form.totalStudents} disabled={readOnly}
                  onChange={e => set('totalStudents', e.target.value)} /></div>
              <div><label style={S.label}>Average Attendance %</label>
                <input type="number" style={S.input} value={form.avgPercent} disabled={readOnly}
                  onChange={e => set('avgPercent', e.target.value)} /></div>
            </div>
          </div>

          {/* Marks */}
          <div style={S.card}>
            <div style={S.secHead}>Score Distribution & Average Marks</div>
            <div style={S.row3}>
              <div><label style={S.label}>Below 40</label>
                <input type="number" style={S.input} value={form.below40} disabled={readOnly}
                  onChange={e => set('below40', e.target.value)} /></div>
              <div><label style={S.label}>40 – 70</label>
                <input type="number" style={S.input} value={form.mid} disabled={readOnly}
                  onChange={e => set('mid', e.target.value)} /></div>
              <div><label style={S.label}>Above 70</label>
                <input type="number" style={S.input} value={form.above70} disabled={readOnly}
                  onChange={e => set('above70', e.target.value)} /></div>
            </div>
            <label style={S.label}>Average Marks (out of 100)</label>
            <input type="number" style={{ ...S.input, maxWidth: 200 }} value={form.avgMarks} disabled={readOnly}
              onChange={e => set('avgMarks', e.target.value)} placeholder="e.g. 67" />
          </div>

          {/* Engagement */}
          <div style={S.card}>
            <div style={S.secHead}>Engagement & Skill Progress</div>
            <div style={S.row2}>
              <div>
                <label style={S.label}>Engagement Level</label>
                <select style={S.select} value={form.engagementLevel} disabled={readOnly}
                  onChange={e => set('engagementLevel', e.target.value)}>
                  <option value="">— Select —</option>
                  {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label style={S.label}>Skill Progress Level</label>
                <select style={S.select} value={form.skillProgressLevel} disabled={readOnly}
                  onChange={e => set('skillProgressLevel', e.target.value)}>
                  <option value="">— Select —</option>
                  {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Topics */}
          <div style={S.card}>
            <div style={S.secHead}>Topics Covered</div>
            <label style={S.label}>Enter one topic per line</label>
            <textarea style={S.textarea} value={form.topicsCovered} disabled={readOnly}
              onChange={e => set('topicsCovered', e.target.value)}
              placeholder={'Introduction to Python\nData Structures\nMachine Learning Basics'} />
          </div>

          {/* Challenges */}
          <div style={S.card}>
            <div style={S.secHead}>Challenges Faced</div>
            <label style={S.label}>Academic Challenges</label>
            <textarea style={S.textarea} value={form.challenges} disabled={readOnly}
              onChange={e => set('challenges', e.target.value)}
              placeholder="Students struggling with concepts, weak foundations..." />
            <label style={S.label}>Operational Challenges</label>
            <textarea style={S.textarea} value={form.operationalChallenges} disabled={readOnly}
              onChange={e => set('operationalChallenges', e.target.value)}
              placeholder="Lab availability, scheduling issues, hardware problems..." />
          </div>

          {/* Achievements */}
          <div style={S.card}>
            <div style={S.secHead}>Key Achievements</div>
            <textarea style={S.textarea} value={form.achievements} disabled={readOnly}
              onChange={e => set('achievements', e.target.value)}
              placeholder="Notable student achievements, milestones reached this cycle..." />
          </div>

          {/* Recommendations */}
          <div style={S.card}>
            <div style={S.secHead}>Recommendations</div>
            <label style={S.label}>Enter one recommendation per line</label>
            <textarea style={S.textarea} value={form.recommendations} disabled={readOnly}
              onChange={e => set('recommendations', e.target.value)}
              placeholder={'Increase lab sessions\nProvide recorded lectures\nWeekly assessments'} />
          </div>

          {/* Conclusion */}
          <div style={S.card}>
            <div style={S.secHead}>Overall Conclusion</div>
            <label style={S.label}>Write a summary (each paragraph on a new line)</label>
            <textarea style={{ ...S.textarea, minHeight: 140 }} value={form.summary} disabled={readOnly}
              onChange={e => set('summary', e.target.value)}
              placeholder="Overall conclusion about this cycle..." />
          </div>

          {/* Buttons */}
          {!readOnly && (
            <div style={S.btnRow}>
              <button
                style={{ ...S.btnDraft, ...(saving ? S.btnDis : {}) }}
                onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : '💾 Save Draft'}
              </button>
              <button
                style={{ ...S.btnSubmit, ...(saving ? S.btnDis : {}) }}
                onClick={handleSubmit} disabled={saving}>
                {saving ? 'Submitting…' : '✅ Submit Report'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}