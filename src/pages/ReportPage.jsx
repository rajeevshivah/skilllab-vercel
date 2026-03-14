import { useState, useEffect } from 'react'
import { useAuth }    from '../context/AuthContext'
import { reportsAPI } from '../api/index'

const S = {
  page:    { maxWidth: 800, margin: '40px auto', padding: '0 24px' },
  title:   { fontFamily: 'var(--font-d)', fontSize: 26, fontWeight: 900, color: 'var(--gold)', marginBottom: 8 },
  sub:     { color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: 32 },
  card:    { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 28, marginBottom: 24 },
  sectionHead: { fontSize: 13, fontWeight: 700, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 },
  label:   { display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6, marginTop: 16 },
  input:   { width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: 14, boxSizing: 'border-box' },
  textarea:{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: 14, minHeight: 100, resize: 'vertical', boxSizing: 'border-box' },
  select:  { width: '100%', background: 'rgba(20,36,60,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: 14, boxSizing: 'border-box' },
  row:     { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  btnRow:  { display: 'flex', gap: 12, marginTop: 32 },
  btnDraft:{ padding: '12px 28px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, color: '#fff', fontSize: 14, cursor: 'pointer', fontWeight: 600 },
  btnSubmit:{ padding: '12px 28px', background: 'var(--gold)', border: 'none', borderRadius: 8, color: '#000', fontSize: 14, cursor: 'pointer', fontWeight: 700 },
  btnDis:  { opacity: 0.4, cursor: 'not-allowed' },
  badge:   (s) => ({
    display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
    background: s === 'locked' ? '#c0392b' : s === 'submitted' ? '#27ae60' : 'rgba(255,255,255,0.1)',
    color: '#fff', marginLeft: 10,
  }),
  msg:     (ok) => ({ padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13, background: ok ? 'rgba(39,174,96,0.15)' : 'rgba(192,57,43,0.15)', color: ok ? '#2ecc71' : '#e74c3c', border: `1px solid ${ok ? '#27ae60' : '#c0392b'}` }),
  sectionPick: { display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  secBtn: (active) => ({ padding: '10px 18px', borderRadius: 8, border: `1px solid ${active ? 'var(--gold)' : 'rgba(255,255,255,0.1)'}`, background: active ? 'rgba(255,193,7,0.1)' : 'rgba(255,255,255,0.04)', color: active ? 'var(--gold)' : 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: 13, fontWeight: active ? 700 : 400 }),
}

const LEVELS = ['Low', 'Medium', 'High', 'Excellent']
const EMPTY_FORM = {
  coTrainerName: '', startDate: '', endDate: '', projectConducted: false,
  attendance: { totalStudents: '', avgPercent: '' },
  marks: { below40: '', mid: '', above70: '' },
  engagementLevel: '', skillProgressLevel: '',
  topicsCovered: '',      // textarea, split by newline on save
  challenges: '', operationalChallenges: '',
  achievements: '',
  recommendations: '',    // textarea, split by newline on save
  summary: '',
}

export default function ReportPage() {
  const { user } = useAuth()
  const [sections, setSections]   = useState([])   // flat list of all assigned sections
  const [picked, setPicked]       = useState(null)  // { stream, course, year, sem, section }
  const [cycle, setCycle]         = useState('')
  const [cycles, setCycles]       = useState([])
  const [form, setForm]           = useState(EMPTY_FORM)
  const [reportId, setReportId]   = useState(null)
  const [status, setStatus]       = useState('draft')
  const [msg, setMsg]             = useState(null)  // { ok, text }
  const [saving, setSaving]       = useState(false)

  // Build flat section list from user.assignedSections
  useEffect(() => {
    if (!user) return
    const flat = []
    ;(user.assignedSections || []).forEach(a => {
      (a.sections || []).forEach(sec => {
        flat.push({ stream: a.stream, course: a.course, year: a.year, sem: a.sem, section: sec })
      })
    })
    setSections(flat)
  }, [user])

  // Load available cycles from config
  useEffect(() => {
    fetch('/api/config?type=cycle')
      .then(r => r.json())
      .then(data => setCycles((data || []).filter(c => c.isActive).map(c => c.value)))
      .catch(() => {})
  }, [])

  // When section + cycle chosen, try to load existing report
  useEffect(() => {
    if (!picked || !cycle) return
    setMsg(null)
    reportsAPI.list({ stream: picked.stream, course: picked.course, year: picked.year, sem: picked.sem, section: picked.section, cycle })
      .then(res => {
        const r = res.data?.[0]
        if (r) {
          setReportId(r._id)
          setStatus(r.status)
          setForm({
            coTrainerName:         r.coTrainerName || '',
            startDate:             r.startDate ? r.startDate.slice(0,10) : '',
            endDate:               r.endDate   ? r.endDate.slice(0,10)   : '',
            projectConducted:      r.projectConducted || false,
            attendance:            { totalStudents: r.attendance?.totalStudents ?? '', avgPercent: r.attendance?.avgPercent ?? '' },
            marks:                 { below40: r.marks?.below40 ?? '', mid: r.marks?.mid ?? '', above70: r.marks?.above70 ?? '' },
            engagementLevel:       r.engagementLevel || '',
            skillProgressLevel:    r.skillProgressLevel || '',
            topicsCovered:         (r.topicsCovered || []).join('\n'),
            challenges:            r.challenges || '',
            operationalChallenges: r.operationalChallenges || '',
            achievements:          r.achievements || '',
            recommendations:       (r.recommendations || []).join('\n'),
            summary:               r.summary || '',
          })
        } else {
          setReportId(null)
          setStatus('draft')
          setForm(EMPTY_FORM)
        }
      })
      .catch(() => {})
  }, [picked, cycle])

  const isLocked = status === 'locked'
  const isSubmitted = status === 'submitted'
  const readOnly = isLocked || (isSubmitted && user?.role !== 'superadmin')

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }
  function setNested(parent, field, value) {
    setForm(f => ({ ...f, [parent]: { ...f[parent], [field]: value } }))
  }

  function buildPayload() {
    return {
      ...picked, cycle,
      coTrainerName:         form.coTrainerName,
      startDate:             form.startDate || null,
      endDate:               form.endDate   || null,
      projectConducted:      form.projectConducted,
      attendance: {
        totalStudents: form.attendance.totalStudents !== '' ? Number(form.attendance.totalStudents) : null,
        avgPercent:    form.attendance.avgPercent    !== '' ? Number(form.attendance.avgPercent)    : null,
      },
      marks: {
        below40: form.marks.below40 !== '' ? Number(form.marks.below40) : null,
        mid:     form.marks.mid     !== '' ? Number(form.marks.mid)     : null,
        above70: form.marks.above70 !== '' ? Number(form.marks.above70) : null,
      },
      engagementLevel:       form.engagementLevel    || null,
      skillProgressLevel:    form.skillProgressLevel  || null,
      topicsCovered:         form.topicsCovered.split('\n').map(s=>s.trim()).filter(Boolean),
      challenges:            form.challenges,
      operationalChallenges: form.operationalChallenges,
      achievements:          form.achievements,
      recommendations:       form.recommendations.split('\n').map(s=>s.trim()).filter(Boolean),
      summary:               form.summary,
    }
  }

  async function handleSave() {
    if (!picked || !cycle) return setMsg({ ok: false, text: 'Please select a section and cycle first.' })
    setSaving(true); setMsg(null)
    try {
      const payload = buildPayload()
      const res = reportId
        ? await reportsAPI.update(reportId, payload)
        : await reportsAPI.save(payload)
      setReportId(res.data._id)
      setStatus(res.data.status)
      setMsg({ ok: true, text: 'Draft saved successfully.' })
    } catch (e) {
      setMsg({ ok: false, text: e.response?.data?.error || 'Save failed.' })
    } finally { setSaving(false) }
  }

  async function handleSubmit() {
    if (!reportId) {
      // Save first, then submit
      setSaving(true); setMsg(null)
      try {
        const res = await reportsAPI.save(buildPayload())
        setReportId(res.data._id)
        await reportsAPI.submit(res.data._id)
        setStatus('submitted')
        setMsg({ ok: true, text: 'Report submitted successfully. You can no longer edit it.' })
      } catch (e) {
        setMsg({ ok: false, text: e.response?.data?.error || 'Submit failed.' })
      } finally { setSaving(false) }
      return
    }
    setSaving(true); setMsg(null)
    try {
      await reportsAPI.update(reportId, buildPayload())
      await reportsAPI.submit(reportId)
      setStatus('submitted')
      setMsg({ ok: true, text: 'Report submitted successfully. You can no longer edit it.' })
    } catch (e) {
      setMsg({ ok: false, text: e.response?.data?.error || 'Submit failed.' })
    } finally { setSaving(false) }
  }

  if (!user) return null

  return (
    <div style={S.page}>
      <div style={S.title}>📋 Cycle Report</div>
      <div style={S.sub}>Submit your section report at the end of each cycle.</div>

      {/* Step 1 — Pick Section */}
      <div style={S.card}>
        <div style={S.sectionHead}>Step 1 — Select Section</div>
        {sections.length === 0
          ? <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>No sections assigned to your account. Contact superadmin.</div>
          : <div style={S.sectionPick}>
              {sections.map((s, i) => (
                <button key={i} style={S.secBtn(picked === s)} onClick={() => { setPicked(s); setReportId(null); setStatus('draft'); setForm(EMPTY_FORM) }}>
                  {s.section}<br/>
                  <span style={{ fontSize: 10, opacity: 0.6 }}>{s.stream} · {s.course}</span>
                </button>
              ))}
            </div>
        }
        {picked && (
          <>
            <label style={S.label}>Cycle</label>
            <select style={S.select} value={cycle} onChange={e => setCycle(e.target.value)}>
              <option value="">— Select cycle —</option>
              {cycles.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </>
        )}
      </div>

      {/* Step 2 — Form (only shown when section + cycle picked) */}
      {picked && cycle && (
        <>
          {/* Status banner */}
          {(isSubmitted || isLocked) && (
            <div style={{ ...S.msg(isSubmitted && !isLocked), marginBottom: 16 }}>
              {isLocked   && '🔒 This report has been locked by the superadmin. No further edits are possible.'}
              {isSubmitted && !isLocked && '✅ This report has been submitted. Waiting for superadmin review.'}
            </div>
          )}
          {msg && <div style={S.msg(msg.ok)}>{msg.text}</div>}

          {/* Section info (read-only) */}
          <div style={S.card}>
            <div style={S.sectionHead}>Section Info <span style={S.badge(status)}>{status}</span></div>
            <div style={S.row}>
              <div><label style={S.label}>Stream</label><input style={S.input} value={picked.stream} readOnly /></div>
              <div><label style={S.label}>Course</label><input style={S.input} value={picked.course} readOnly /></div>
              <div><label style={S.label}>Year</label><input style={S.input} value={picked.year} readOnly /></div>
              <div><label style={S.label}>Semester</label><input style={S.input} value={picked.sem} readOnly /></div>
              <div><label style={S.label}>Section</label><input style={S.input} value={picked.section} readOnly /></div>
              <div><label style={S.label}>Cycle</label><input style={S.input} value={cycle} readOnly /></div>
            </div>
            <label style={S.label}>Co-Trainer Name</label>
            <input style={S.input} value={form.coTrainerName} disabled={readOnly} onChange={e => set('coTrainerName', e.target.value)} placeholder="Enter co-trainer name" />
          </div>

          {/* Cycle Dates */}
          <div style={S.card}>
            <div style={S.sectionHead}>Cycle Dates & Project</div>
            <div style={S.row}>
              <div><label style={S.label}>Start Date</label><input type="date" style={S.input} value={form.startDate} disabled={readOnly} onChange={e => set('startDate', e.target.value)} /></div>
              <div><label style={S.label}>End Date</label><input type="date" style={S.input} value={form.endDate} disabled={readOnly} onChange={e => set('endDate', e.target.value)} /></div>
            </div>
            <label style={S.label}>Project Conducted?</label>
            <select style={S.select} value={form.projectConducted} disabled={readOnly} onChange={e => set('projectConducted', e.target.value === 'true')}>
              <option value="false">No</option>
              <option value="true">Yes</option>
            </select>
          </div>

          {/* Attendance */}
          <div style={S.card}>
            <div style={S.sectionHead}>Attendance</div>
            <div style={S.row}>
              <div><label style={S.label}>Total Students</label><input type="number" style={S.input} value={form.attendance.totalStudents} disabled={readOnly} onChange={e => setNested('attendance','totalStudents',e.target.value)} /></div>
              <div><label style={S.label}>Average Attendance %</label><input type="number" style={S.input} value={form.attendance.avgPercent} disabled={readOnly} onChange={e => setNested('attendance','avgPercent',e.target.value)} /></div>
            </div>
          </div>

          {/* Marks */}
          <div style={S.card}>
            <div style={S.sectionHead}>Score Distribution</div>
            <div style={S.row}>
              <div><label style={S.label}>Below 40</label><input type="number" style={S.input} value={form.marks.below40} disabled={readOnly} onChange={e => setNested('marks','below40',e.target.value)} /></div>
              <div><label style={S.label}>40 – 70</label><input type="number" style={S.input} value={form.marks.mid} disabled={readOnly} onChange={e => setNested('marks','mid',e.target.value)} /></div>
              <div><label style={S.label}>Above 70</label><input type="number" style={S.input} value={form.marks.above70} disabled={readOnly} onChange={e => setNested('marks','above70',e.target.value)} /></div>
            </div>
          </div>

          {/* Engagement */}
          <div style={S.card}>
            <div style={S.sectionHead}>Engagement & Skill Progress</div>
            <div style={S.row}>
              <div>
                <label style={S.label}>Engagement Level</label>
                <select style={S.select} value={form.engagementLevel} disabled={readOnly} onChange={e => set('engagementLevel', e.target.value)}>
                  <option value="">— Select —</option>
                  {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label style={S.label}>Skill Progress Level</label>
                <select style={S.select} value={form.skillProgressLevel} disabled={readOnly} onChange={e => set('skillProgressLevel', e.target.value)}>
                  <option value="">— Select —</option>
                  {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Topics */}
          <div style={S.card}>
            <div style={S.sectionHead}>Topics Covered</div>
            <label style={S.label}>Enter one topic per line</label>
            <textarea style={S.textarea} value={form.topicsCovered} disabled={readOnly} onChange={e => set('topicsCovered', e.target.value)} placeholder={'Introduction to Python\nData Structures\nMachine Learning Basics'} />
          </div>

          {/* Challenges */}
          <div style={S.card}>
            <div style={S.sectionHead}>Challenges</div>
            <label style={S.label}>Academic Challenges</label>
            <textarea style={S.textarea} value={form.challenges} disabled={readOnly} onChange={e => set('challenges', e.target.value)} placeholder="Describe academic challenges faced..." />
            <label style={S.label}>Operational Challenges</label>
            <textarea style={S.textarea} value={form.operationalChallenges} disabled={readOnly} onChange={e => set('operationalChallenges', e.target.value)} placeholder="Infrastructure, scheduling, resource issues..." />
          </div>

          {/* Achievements */}
          <div style={S.card}>
            <div style={S.sectionHead}>Key Achievements</div>
            <textarea style={S.textarea} value={form.achievements} disabled={readOnly} onChange={e => set('achievements', e.target.value)} placeholder="Notable achievements this cycle..." />
          </div>

          {/* Recommendations */}
          <div style={S.card}>
            <div style={S.sectionHead}>Recommendations</div>
            <label style={S.label}>Enter one recommendation per line</label>
            <textarea style={S.textarea} value={form.recommendations} disabled={readOnly} onChange={e => set('recommendations', e.target.value)} placeholder={'Increase lab sessions\nProvide recorded lectures'} />
          </div>

          {/* Summary */}
          <div style={S.card}>
            <div style={S.sectionHead}>Overall Conclusion</div>
            <label style={S.label}>Write a summary (each paragraph on a new line)</label>
            <textarea style={{ ...S.textarea, minHeight: 140 }} value={form.summary} disabled={readOnly} onChange={e => set('summary', e.target.value)} placeholder="Overall conclusion about the cycle..." />
          </div>

          {/* Action buttons */}
          {!readOnly && (
            <div style={S.btnRow}>
              <button style={{ ...S.btnDraft, ...(saving ? S.btnDis : {}) }} onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : '💾 Save Draft'}
              </button>
              <button style={{ ...S.btnSubmit, ...(saving ? S.btnDis : {}) }} onClick={handleSubmit} disabled={saving}>
                {saving ? 'Submitting…' : '✅ Submit Report'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}