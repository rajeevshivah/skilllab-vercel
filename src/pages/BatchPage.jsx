import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../api'
import { useAuth } from '../context/AuthContext'

const TABS = ['Students', 'Plan', 'Toppers', 'Student login']

export default function BatchPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const [batch, setBatch] = useState(null)
  const [tab, setTab] = useState('Students')
  const [alert, setAlert] = useState(null)
  const [logOpen, setLogOpen] = useState(false)
  const show = (msg, type = 'success') => { setAlert({ msg, type }); setTimeout(() => setAlert(null), 3500) }

  useEffect(() => { load() }, [id])
  async function load() {
    try { const { data } = await api.get(`/batches/${id}`); setBatch(data.batch) }
    catch (e) { show(e.response?.data?.message || 'Failed to load batch', 'error') }
  }

  if (!batch) return <div className="page" style={{ color: 'var(--ink-soft)' }}>Loading batch…</div>

  const myId = user?.id || user?._id
  const canEdit = user?.role === 'superadmin'
    || (batch.trainers || []).some(t => (t._id || t) === myId)

  return (
    <div className="page">
      <Link to="/batches" className="btn btn--quiet" style={{ fontSize: 13 }}>← All batches</Link>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12, marginTop: 10 }}>
        <div>
          <h1 className="page-title">{batch.name}</h1>
          <p className="muted" style={{ fontSize: 14, marginTop: 2 }}>
            {batch.track && `${batch.track} · `}{batch.composition || 'No composition set'} · Trainers: {(batch.trainers || []).map(t => t.name).join(', ') || 'none'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {user?.role === 'superadmin' && (
            <>
              <span className={`tag ${batch.rosterLocked ? 'tag--tick' : 'tag--pencil'}`}>{batch.rosterLocked ? 'Roster locked' : 'Roster provisional'}</span>
              <button className="btn btn--secondary btn--sm" onClick={async () => {
                try {
                  const { data } = await api.patch(`/batches/${id}/roster-lock`, { locked: !batch.rosterLocked })
                  setBatch(b => ({ ...b, rosterLocked: data.batch.rosterLocked }))
                  show(data.batch.rosterLocked ? 'Roster locked — attendance now final.' : 'Roster unlocked.')
                } catch (e) { show(e.response?.data?.message || 'Failed', 'error') }
              }}>{batch.rosterLocked ? 'Unlock roster' : 'Lock roster'}</button>
            </>
          )}
          {canEdit && <button className="btn btn--primary" onClick={() => setLogOpen(true)}>Log today's class</button>}
        </div>
      </div>

      {!canEdit && (
        <div className="banner banner--pencil" style={{ marginTop: 14 }}>
          View only — you're not assigned to this batch, so you can't make changes here.
        </div>
      )}

      <div className="tabs" style={{ margin: '18px 0 20px' }}>
        {TABS.filter(t => t !== 'Student login' || canEdit).map(t => (
          <button key={t} className={tab === t ? 'is-active' : ''} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {alert && <div className={`banner banner--${alert.type === 'success' ? 'success' : 'error'}`}>{alert.msg}</div>}

      {tab === 'Students' && <StudentsTab batchId={id} user={user} show={show} canEdit={canEdit} />}
      {tab === 'Plan' && <PlanTab batchId={id} show={show} canEdit={canEdit} />}
      {tab === 'Toppers' && <ToppersTab batchId={id} user={user} show={show} canEdit={canEdit} />}
      {tab === 'Student login' && canEdit && <StudentAccessTab batchId={id} show={show} />}

      {logOpen && <DailyLogSheet batchId={id} canEdit={canEdit} show={show} onClose={() => setLogOpen(false)} />}
    </div>
  )
}

/* ─────────────── LOG TODAY'S CLASS (side sheet) ─────────────── */
function DailyLogSheet({ batchId, show, canEdit, onClose }) {
  const today = new Date().toISOString().slice(0, 10)
  const [date, setDate] = useState(today)
  const [plan, setPlan] = useState(null)
  const [roster, setRoster] = useState([])
  const [covered, setCovered] = useState([])
  const [status, setStatus] = useState('done')
  const [notes, setNotes] = useState('')
  const [prepLink, setPrepLink] = useState('')
  const [planned, setPlanned] = useState(null)
  const [planList, setPlanList] = useState([])
  const [planClass, setPlanClass] = useState('')
  const [github, setGithub] = useState('')
  const { user: me } = useAuth()
  const isAdmin = me?.role === 'superadmin'
  const [present, setPresent] = useState({})
  const [attQuery, setAttQuery] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadDay() }, [date])

  async function loadDay() {
    setLoading(true)
    try {
      // all four at once (they don't depend on each other)
      const [p, r, pl, one] = await Promise.all([
        api.get(`/plans/${batchId}`),
        api.get('/students', { params: { batch: batchId } }),
        api.get('/cycleplans/for-date/lookup', { params: { batch: batchId, date } }).catch(() => null),
        api.get('/logs/one', { params: { batch: batchId, date } }),
      ])
      setPlan(p.data.plan)
      setRoster(r.data.students)
      let plannedNo = ''
      if (pl) {
        setPlanned(pl.data.planned); setPlanList(pl.data.classes || [])
        plannedNo = pl.data.planned?.number ?? ''
      } else { setPlanned(null); setPlanList([]) }
      if (one.data.log) {
        const L = one.data.log
        setCovered(L.topicsCovered.map(String)); setStatus(L.status); setNotes(L.notes || ''); setPrepLink(L.prepLink || '')
        setPlanClass(L.planClass ?? plannedNo); setGithub(L.github || '')
        const pmap = {}; L.attendance.forEach(a => pmap[a.student] = a.present); setPresent(pmap)
      } else {
        const pmap = {}; r.data.students.forEach(s => pmap[s._id] = true)
        setPresent(pmap); setCovered([]); setStatus('done'); setNotes(''); setPrepLink('')
        setPlanClass(plannedNo); setGithub('')
      }
    } catch (e) { show(e.response?.data?.message || 'Failed to load day', 'error') }
    finally { setLoading(false) }
  }

  function toggleTopic(tid) { setCovered(c => c.includes(tid) ? c.filter(x => x !== tid) : [...c, tid]) }
  function toggleAll(val) { const m = {}; roster.forEach(s => m[s._id] = val); setPresent(m) }

  const noClass = status === 'no-class'
  const missing = noClass ? [] : [
    planClass === '' || planClass == null ? 'which planned class' : null,
    !github ? 'GitHub push' : null,
    status !== 'done' && !notes.trim() ? 'what was actually taught' : null,
  ].filter(Boolean)

  async function save() {
    if (noClass && !notes.trim()) { show('Write the reason (holiday, exam, cancelled…) in the note.', 'error'); return }
    setSaving(true)
    try {
      await api.post('/logs', {
        batch: batchId, date, topicsCovered: covered, status, notes, prepLink,
        planClass: noClass ? null : (planClass === '' ? null : Number(planClass)),
        github: noClass ? '' : github,
        attendance: noClass ? [] : roster.map(s => ({ student: s._id, present: !!present[s._id] })),
      })
      if (missing.length) show(`Saved, but incomplete — still missing: ${missing.join(', ')}. Complete it today for full credit.`, 'error')
      else
      show(`Log saved for ${date}.`)
      onClose()
    } catch (e) { show(e.response?.data?.message || 'Failed to save', 'error') }
    finally { setSaving(false) }
  }

  const nextTopic = plan?.topics?.find(t => t.status !== 'done')
  const presentCount = roster.filter(s => present[s._id]).length
  const aq = attQuery.trim().toLowerCase()
  const attShown = aq
    ? roster.filter(s => `${s.roll || ''} ${s.name || ''}`.toLowerCase().includes(aq))
    : roster

  return (
    <div className="sheet-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="sheet-panel" style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h2 className="section-title">Log today's class</h2>
          <button className="btn btn--secondary btn--sm" onClick={onClose}>Close</button>
        </div>

        {loading ? <div className="muted">Loading…</div> : (
          <fieldset disabled={!canEdit} style={{ border: 'none', margin: 0, padding: 0, opacity: canEdit ? 1 : 0.6 }}>
            <div style={{ display: 'grid', gap: 20 }}>
              <div className="field" style={{ maxWidth: 200 }}>
                <label htmlFor="log-date">Date</label>
                <input id="log-date" type="date" className="ctl" value={date} onChange={e => setDate(e.target.value)} />
              </div>
              {nextTopic && <p className="muted" style={{ fontSize: 13, marginTop: -10 }}>Suggested next topic: <b style={{ color: 'var(--ink)' }}>{nextTopic.title}</b></p>}

              {planned && (planned.title || planned.notes) && (
                <div className="banner" style={{ background: 'var(--blue-wash)', color: 'var(--blue-ink)', borderColor: 'rgba(30,77,183,0.25)', marginBottom: 0 }}>
                  <div style={{ fontSize: 12, marginBottom: 2 }}>Planned for today (from cycle plan):</div>
                  <div style={{ fontWeight: 700 }}>{planned.title || '(no title)'}</div>
                  {planned.notes && <div style={{ marginTop: 2, fontSize: 13 }}>{planned.notes}</div>}
                  {canEdit && !notes && (planned.title || planned.notes) && (
                    <button className="btn btn--quiet" style={{ marginTop: 8, color: 'var(--blue-ink)' }} type="button"
                      onClick={() => setNotes([planned.title, planned.notes].filter(Boolean).join(' — '))}>
                      Use as today's note
                    </button>
                  )}
                </div>
              )}

              <div>
                <h3 className="section-title" style={{ fontSize: 15, marginBottom: 10 }}>Topics covered today</h3>
                {(!plan || plan.topics.length === 0)
                  ? <p className="muted" style={{ fontSize: 13 }}>No plan yet. Add topics in the Plan tab.</p>
                  : <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {plan.topics.map(t => {
                      const on = covered.includes(String(t._id))
                      return (
                        <button key={t._id} type="button" onClick={() => toggleTopic(String(t._id))}
                          className={`tag ${on ? 'tag--blue' : t.status === 'done' ? 'tag--tick' : 'tag--muted'}`}
                          style={{ cursor: 'pointer', border: on ? '1px solid var(--blue-ink)' : undefined }}>
                          {t.status === 'done' && !on && 'Done · '}{t.title}
                        </button>
                      )
                    })}
                  </div>}
              </div>

              <div style={{ display: 'grid', gap: 14, padding: 14, border: '1px solid var(--rule-strong)', borderRadius: 8 }}>
                <div className="muted" style={{ fontSize: 12.5 }}>
                  <b style={{ color: 'var(--ink)' }}>Log rule:</b> save this on the class day (before midnight), by the trainer who taught.
                  Full credit needs: the planned class, how it went, GitHub push and attendance. If it was not done as planned, write what was taught.
                </div>
                <div className="field" style={{ margin: 0 }}>
                  <label htmlFor="log-planclass">Which planned class was this?</label>
                  <select id="log-planclass" className="ctl" value={planClass} disabled={noClass} onChange={e => setPlanClass(e.target.value === '' ? '' : Number(e.target.value))}>
                    <option value="">— choose —</option>
                    {planList.map(c => <option key={c.number} value={c.number}>Class {c.number}{c.title ? ` — ${c.title.slice(0, 60)}` : ''}{c.date ? ` (planned ${c.date.slice(8, 10)}/${c.date.slice(5, 7)})` : ''}</option>)}
                  </select>
                  {planList.length === 0 && <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>This cycle has no class plan yet — ask the admin.</p>}
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>How did it go?</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {[['done', 'Done as planned'], ['partial', 'Partly done'], ['not-covered', 'Not done'], ...(isAdmin ? [['no-class', 'No class (admin)']] : [])].map(([k, l]) => (
                      <button key={k} type="button" onClick={() => setStatus(k)}
                        className={`btn btn--sm ${status === k ? 'btn--primary' : 'btn--secondary'}`}>{l}</button>
                    ))}
                  </div>
                  {noClass && <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>No class that day (holiday, exam, cancelled). The day is not counted for anyone. Write the reason below.</p>}
                </div>
                {!noClass && <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Did students push today's code to GitHub?</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {[['all', 'All'], ['most', 'Most'], ['few', 'A few'], ['none', 'None'], ['na', 'Not needed today']].map(([k, l]) => (
                      <button key={k} type="button" onClick={() => setGithub(k)}
                        className={`btn btn--sm ${github === k ? 'btn--primary' : 'btn--secondary'}`}>{l}</button>
                    ))}
                  </div>
                </div>}
                {missing.length > 0
                  ? <div className="tag tag--pencil" style={{ justifySelf: 'start' }}>Still missing: {missing.join(', ')}</div>
                  : <div className="tag tag--tick" style={{ justifySelf: 'start' }}>{noClass ? 'Will be marked as no class' : 'Complete ✓'}</div>}
              </div>

              <div className="field">
                <label htmlFor="log-notes">{noClass ? 'Reason (holiday, exam, cancelled…)' : 'What was actually taught'}{status !== 'done' && !noClass ? ' — required' : ''}</label>
                <textarea id="log-notes" className="ctl" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Short note on what happened in class…" />
              </div>
              <div className="field">
                <label htmlFor="log-prep">Prep link (GitHub)</label>
                <input id="log-prep" className="ctl" value={prepLink} onChange={e => setPrepLink(e.target.value)} placeholder="https://github.com/…" />
              </div>

              {!noClass && <div>
                <h3 className="section-title" style={{ fontSize: 15, marginBottom: 10 }}>
                  Attendance <span className="muted" style={{ fontWeight: 400, fontSize: 13 }}>· {presentCount}/{roster.length} present</span>
                </h3>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                  <input className="ctl" style={{ width: 180, height: 34 }} placeholder="Find student…" value={attQuery} onChange={e => setAttQuery(e.target.value)} />
                  <button type="button" className="btn btn--secondary btn--sm" onClick={() => toggleAll(true)}>All present</button>
                  <button type="button" className="btn btn--secondary btn--sm" onClick={() => toggleAll(false)}>All absent</button>
                </div>
                {roster.length === 0
                  ? <p className="muted" style={{ fontSize: 13 }}>No students in this batch yet. Import them in the Students tab.</p>
                  : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 6 }}>
                    {attShown.map(s => (
                      <button key={s._id} type="button" onClick={() => setPresent(p => ({ ...p, [s._id]: !p[s._id] }))}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px', borderRadius: 6, cursor: 'pointer', textAlign: 'left',
                          background: present[s._id] ? 'var(--tick-wash)' : 'var(--red-wash)',
                          border: `1px solid ${present[s._id] ? 'rgba(44,122,75,0.3)' : 'rgba(184,50,42,0.25)'}`, fontSize: 13,
                        }}>
                        <span style={{ fontWeight: 700, color: present[s._id] ? 'var(--tick)' : 'var(--red-ink)' }}>{present[s._id] ? '✓' : '✕'}</span>
                        <span style={{ color: 'var(--ink)' }}>{s.roll && <span className="muted">{s.roll} </span>}{s.name}</span>
                      </button>
                    ))}
                  </div>}
              </div>}

              {canEdit && <div><button className="btn btn--primary" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save daily log'}</button></div>}
            </div>
          </fieldset>
        )}
      </div>
    </div>
  )
}

/* ─────────────── STUDENTS ─────────────── */
function StudentsTab({ batchId, user, show, canEdit }) {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [paste, setPaste] = useState('')
  const [importing, setImporting] = useState(false)
  const [checking, setChecking] = useState(false)
  const [preview, setPreview] = useState(null)
  const [showImport, setShowImport] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [dupes, setDupes] = useState([])
  const blankAdd = { roll: '', name: '', course: '', sem: '', section: '' }
  const [addForm, setAddForm] = useState(blankAdd)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState(blankAdd)
  const [savingEdit, setSavingEdit] = useState(false)

  const TEMPLATE_HEADER = 'Roll, Name, Course, Semester, Section'
  const TEMPLATE_SAMPLE = 'Roll, Name, Course, Semester, Section\nBCA2024001, Aman Kumar, BCA, 3rd, A\nBCA2024002, Priya Singh, BCA, 3rd, A'

  useEffect(() => { load() }, [])
  async function load() {
    setLoading(true)
    try { const { data } = await api.get('/students', { params: { batch: batchId } }); setStudents(data.students) }
    catch (e) { show(e.response?.data?.message || 'Failed', 'error') }
    finally { setLoading(false) }
  }

  function parseRows(text) {
    return text.split('\n').map(l => l.trim()).filter(Boolean)
      .filter(line => !/^roll[\s,;\t]/i.test(line))
      .map(line => {
        const p = line.split(/[,\t;]/).map(x => x.trim())
        if (p.length === 1) return { roll: '', name: p[0], course: '', sem: '', section: '' }
        return { roll: p[0] || '', name: p[1] || '', course: p[2] || '', sem: p[3] || '', section: p[4] || '' }
      })
  }

  function copyFormat() {
    navigator.clipboard?.writeText(TEMPLATE_HEADER)
    show('Format copied — paste into Excel row 1 as column headers.')
  }
  function downloadTemplate() {
    const blob = new Blob([TEMPLATE_SAMPLE], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'skilllab-student-template.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  async function checkImport() {
    const rows = parseRows(paste)
    if (!rows.length) return show('Nothing to check', 'error')
    setChecking(true); setPreview(null)
    try {
      const { data } = await api.post('/students/bulk', { batch: batchId, rows }, { params: { preview: 1 } })
      setPreview(data)
    } catch (e) { show(e.response?.data?.message || 'Check failed', 'error') }
    finally { setChecking(false) }
  }

  async function doImport() {
    const rows = parseRows(paste)
    if (!rows.length) return show('Nothing to import', 'error')
    setImporting(true)
    try {
      const { data } = await api.post('/students/bulk', { batch: batchId, rows })
      setDupes(data.duplicates || [])
      const bits = [`Imported ${data.imported}`]
      if (data.skippedCount) bits.push(`${data.skippedCount} skipped`)
      if (data.duplicateCount) bits.push(`${data.duplicateCount} also in another batch`)
      show(`${bits.join(' · ')}.`)
      setPaste(''); setPreview(null); setShowImport(false); load()
    } catch (e) { show(e.response?.data?.message || 'Import failed', 'error') }
    finally { setImporting(false) }
  }

  async function addOne() {
    if (!addForm.name.trim()) return show('Name required', 'error')
    try {
      await api.post('/students', { ...addForm, batch: batchId })
      show(`Added ${addForm.name}.`); setAddForm(blankAdd); setShowAdd(false); load()
    } catch (e) { show(e.response?.data?.message || 'Failed', 'error') }
  }

  function startEdit(s) {
    setEditingId(s._id)
    setEditForm({ roll: s.roll || '', name: s.name || '', course: s.course || '', sem: s.sem || '', section: s.section || '' })
  }
  async function saveEdit(s) {
    if (!editForm.name.trim()) return show('Name required', 'error')
    setSavingEdit(true)
    try {
      await api.put(`/students/${s._id}`, editForm)
      show(`Saved ${editForm.name}.`); setEditingId(null); load()
    } catch (e) { show(e.response?.data?.message || 'Could not save', 'error') }
    finally { setSavingEdit(false) }
  }

  async function toggleFlag(s) {
    try { await api.put(`/students/${s._id}`, { flagged: !s.flagged }); load() }
    catch (e) { show(e.response?.data?.message || 'Failed', 'error') }
  }

  async function remove(s, force = false) {
    if (!force && !confirm(`Remove ${s.name} from this batch?`)) return
    try {
      await api.delete(`/students/${s._id}`, { params: force ? { force: 1 } : {} })
      show('Removed.'); load()
    } catch (e) {
      const d = e.response?.data
      if (e.response?.status === 409 && d?.needsForce) {
        if (user?.role === 'superadmin'
          && confirm(`${d.message}\n\nDelete ${s.name} AND their ${d.markCount} mark record(s) permanently?`)) {
          return remove(s, true)
        }
        return show(d.message, 'error')
      }
      show(d?.message || 'Failed', 'error')
    }
  }

  const q = query.trim().toLowerCase()
  const shown = q
    ? students.filter(s => [s.roll, s.name, s.course, s.sem, s.section]
      .some(v => String(v || '').toLowerCase().includes(q)))
    : students

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <p className="muted" style={{ fontSize: 13 }}>{q ? `${shown.length} of ${students.length}` : `${students.length}`} students</p>
          <input className="ctl" style={{ width: 220, height: 34 }} placeholder="Search name / roll / section…"
            value={query} onChange={e => setQuery(e.target.value)} />
        </div>
        {canEdit && <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn--secondary btn--sm" onClick={() => { setShowAdd(v => !v); setShowImport(false) }}>Add student</button>
          <button className="btn btn--primary btn--sm" onClick={() => { setShowImport(v => !v); setShowAdd(false) }}>Bulk import</button>
        </div>}
      </div>

      {dupes.length > 0 && (
        <div className="banner banner--pencil">
          <b>Possible track overlaps</b> — these students are also in another batch this semester:
          <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
            {dupes.map((d, i) => <li key={i}>{d.roll} · {d.name} — already in <b>{d.otherBatch}</b>{d.otherTrack ? ` (${d.otherTrack})` : ''}</li>)}
          </ul>
          <div style={{ marginTop: 6, fontSize: 12 }}>Imported anyway. The admin can resolve overlaps from the Duplicates screen before the track lock.</div>
        </div>
      )}

      {showAdd && canEdit && (
        <div className="sheet" style={{ padding: 20, marginBottom: 18 }}>
          <h2 className="section-title" style={{ marginBottom: 12 }}>Add one student</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 10 }}>
            <div className="field"><label>Roll</label><input className="ctl" value={addForm.roll} onChange={e => setAddForm({ ...addForm, roll: e.target.value })} /></div>
            <div className="field"><label>Name *</label><input className="ctl" value={addForm.name} onChange={e => setAddForm({ ...addForm, name: e.target.value })} /></div>
            <div className="field"><label>Course</label><input className="ctl" value={addForm.course} onChange={e => setAddForm({ ...addForm, course: e.target.value })} placeholder="BCA" /></div>
            <div className="field"><label>Semester</label><input className="ctl" value={addForm.sem} onChange={e => setAddForm({ ...addForm, sem: e.target.value })} placeholder="3rd" /></div>
            <div className="field"><label>Section</label><input className="ctl" value={addForm.section} onChange={e => setAddForm({ ...addForm, section: e.target.value })} placeholder="A" /></div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button className="btn btn--primary" onClick={addOne}>Add student</button>
            <button className="btn btn--secondary" onClick={() => setShowAdd(false)}>Cancel</button>
          </div>
        </div>
      )}

      {showImport && canEdit && (
        <div className="sheet" style={{ padding: 20, marginBottom: 18 }}>
          <h2 className="section-title" style={{ marginBottom: 8 }}>Import students</h2>
          <p className="muted" style={{ fontSize: 13, marginBottom: 10 }}>
            One student per line, in this column order: <b style={{ color: 'var(--ink)' }}>Roll, Name, Course, Semester, Section</b>.
            Commas or tabs both work, so you can paste straight from Excel. A header row is auto-skipped.
            Only Roll and Name are required.
          </p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
            <button className="btn btn--secondary btn--sm" onClick={copyFormat}>Copy format</button>
            <button className="btn btn--secondary btn--sm" onClick={downloadTemplate}>Download template (.csv)</button>
          </div>
          <textarea className="ctl" style={{ minHeight: 150, fontFamily: 'var(--font-data)' }}
            value={paste} onChange={e => { setPaste(e.target.value); setPreview(null) }}
            placeholder={'Roll, Name, Course, Semester, Section\nBCA2024001, Aman Kumar, BCA, 3rd, A\nBCA2024002, Priya Singh, BCA, 3rd, A'} />

          {preview && (
            <div className="banner" style={{ background: 'var(--blue-wash)', color: 'var(--blue-ink)', borderColor: 'rgba(30,77,183,0.25)', marginTop: 12, marginBottom: 0 }}>
              <b>{preview.willImport} student(s) will be added.</b>
              {preview.skippedCount > 0 && (
                <div style={{ marginTop: 8 }}>
                  <span style={{ color: 'var(--pencil)' }}>{preview.skippedCount} row(s) will be skipped:</span>
                  <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                    {preview.skipped.slice(0, 10).map((s, i) => (
                      <li key={i}>Line {s.line}: {s.roll || '(no roll)'} {s.name ? `· ${s.name}` : ''} — {s.reason}</li>
                    ))}
                    {preview.skipped.length > 10 && <li>…and {preview.skipped.length - 10} more</li>}
                  </ul>
                </div>
              )}
              {preview.duplicateCount > 0 && (
                <div style={{ marginTop: 8, color: 'var(--pencil)' }}>
                  {preview.duplicateCount} of them are also in another batch — they'll import and be flagged.
                </div>
              )}
              {preview.sample?.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  First row reads as: <b>{preview.sample[0].name}</b>
                  {preview.sample[0].roll ? ` · roll ${preview.sample[0].roll}` : ' · no roll'}
                  {preview.sample[0].section ? ` · section ${preview.sample[0].section}` : ''}
                  {' '}— if that looks wrong, your columns are in a different order.
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
            <button className="btn btn--secondary" disabled={checking} onClick={checkImport}>
              {checking ? 'Checking…' : `Check ${parseRows(paste).length} rows`}
            </button>
            <button className="btn btn--primary" disabled={importing || !preview} onClick={doImport}
              title={preview ? '' : 'Run the check first'}>
              {importing ? 'Importing…' : preview ? `Import ${preview.willImport} students` : 'Import'}
            </button>
            <button className="btn btn--secondary" onClick={() => { setShowImport(false); setPreview(null) }}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? <div className="muted">Loading…</div>
        : students.length === 0 ? <div className="empty"><h2>No students yet</h2><p>Use bulk import to add the batch roster.</p></div>
          : shown.length === 0 ? <div className="empty"><h2>No match</h2><p>Nothing matches "{query}".</p></div>
            : (
              <div className="table-wrap sheet" style={{ borderRadius: 10 }}>
                <table className="table table--stack">
                  <thead><tr>
                    <th>Roll</th><th>Name</th>
                    <th>Course</th><th>Sem</th><th>Sec</th>
                    <th>Attendance</th><th className="num">Top-3</th><th className="num">Projects</th>
                    <th></th>
                  </tr></thead>
                  <tbody>
                    {shown.map(s => editingId === s._id ? (
                      <tr key={s._id} style={{ background: 'var(--blue-wash)' }}>
                        <td colSpan={9} style={{ padding: 14 }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 10 }}>
                            <div className="field"><label>Roll</label><input className="ctl" value={editForm.roll} onChange={e => setEditForm({ ...editForm, roll: e.target.value })} /></div>
                            <div className="field"><label>Name</label><input className="ctl" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} /></div>
                            <div className="field"><label>Course</label><input className="ctl" value={editForm.course} onChange={e => setEditForm({ ...editForm, course: e.target.value })} placeholder="BCA" /></div>
                            <div className="field"><label>Semester</label><input className="ctl" value={editForm.sem} onChange={e => setEditForm({ ...editForm, sem: e.target.value })} placeholder="3rd" /></div>
                            <div className="field"><label>Section</label><input className="ctl" value={editForm.section} onChange={e => setEditForm({ ...editForm, section: e.target.value })} placeholder="A" /></div>
                          </div>
                          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                            <button className="btn btn--primary btn--sm" disabled={savingEdit} onClick={() => saveEdit(s)}>{savingEdit ? 'Saving…' : 'Save'}</button>
                            <button className="btn btn--secondary btn--sm" onClick={() => setEditingId(null)}>Cancel</button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <tr key={s._id} className={s.attendancePct != null && s.attendancePct < 75 ? 'is-flagged' : ''}>
                        <td data-label="Roll" className="data muted">{s.roll || '—'}</td>
                        <td data-label="Name" style={{ fontWeight: 600 }}>{s.name} {s.flagged && <span className="tag tag--pencil" style={{ marginLeft: 6 }}>Flagged</span>}</td>
                        <td data-label="Course" className="muted">{s.course || '—'}</td>
                        <td data-label="Sem" className="muted">{s.sem || '—'}</td>
                        <td data-label="Sec" className="muted">{s.section || '—'}</td>
                        <td data-label="Attendance">
                          <div className="progress-line" style={{ maxWidth: 130 }}>
                            <span className={`progress-bar${s.attendancePct < 75 ? ' is-behind' : ''}`}><span style={{ width: `${Math.min(100, s.attendancePct)}%` }} /></span>
                            <span className="count">{s.attendancePct}%</span>
                          </div>
                        </td>
                        <td data-label="Top-3" className="num">{s.stats?.topperCount || 0}</td>
                        <td data-label="Projects" className="num">{s.stats?.projectCount || 0}</td>
                        <td data-label="">
                          {canEdit && <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                            <button className="btn btn--secondary btn--sm" onClick={() => startEdit(s)}>Edit</button>
                            <button className="btn btn--secondary btn--sm" onClick={() => toggleFlag(s)}>{s.flagged ? 'Unflag' : 'Flag'}</button>
                            {user?.role !== 'cotrainer' && <button className="btn btn--danger btn--sm" onClick={() => remove(s)}>Remove</button>}
                          </div>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
    </div>
  )
}

/* ─────────────── PLAN ─────────────── */
function PlanTab({ batchId, show, canEdit }) {
  const [topics, setTopics] = useState([])
  const [loading, setLoading] = useState(true)
  const [newTitle, setNewTitle] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])
  async function load() {
    setLoading(true)
    try { const { data } = await api.get(`/plans/${batchId}`); setTopics(data.plan?.topics || []) }
    catch (e) { show(e.response?.data?.message || 'Failed', 'error') }
    finally { setLoading(false) }
  }

  function addTopic() {
    if (!newTitle.trim()) return
    setTopics(t => [...t, { title: newTitle.trim(), order: t.length, status: 'pending', _id: `tmp_${Date.now()}` }])
    setNewTitle('')
  }
  function move(i, dir) {
    const j = i + dir; if (j < 0 || j >= topics.length) return
    const copy = [...topics]; [copy[i], copy[j]] = [copy[j], copy[i]]; setTopics(copy)
  }
  function setStatus(i, status) { setTopics(t => t.map((x, idx) => idx === i ? { ...x, status } : x)) }
  function del(i) { setTopics(t => t.filter((_, idx) => idx !== i)) }

  async function save() {
    setSaving(true)
    try {
      const payload = topics.map((t, i) => ({ _id: (t._id && !String(t._id).startsWith('tmp_')) ? t._id : undefined, title: t.title, order: i, status: t.status }))
      const { data } = await api.put(`/plans/${batchId}`, { topics: payload })
      setTopics(data.plan.topics); show('Plan saved.')
    } catch (e) { show(e.response?.data?.message || 'Failed', 'error') }
    finally { setSaving(false) }
  }

  if (loading) return <div className="muted">Loading…</div>
  const done = topics.filter(t => t.status === 'done').length
  const nextIdx = topics.findIndex(t => t.status !== 'done')

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <p className="muted" style={{ fontSize: 13 }}>{done}/{topics.length} topics done · "next topic" on Today is the first pending one.</p>
        {canEdit && <button className="btn btn--primary btn--sm" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save plan'}</button>}
      </div>

      {canEdit && <div className="sheet" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <input className="ctl" placeholder="Add a topic…" value={newTitle}
            onChange={e => setNewTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTopic()} />
          <button className="btn btn--secondary" onClick={addTopic}>Add</button>
        </div>
      </div>}

      {topics.length === 0 ? <div className="empty"><h2>No topics yet</h2><p>Add the ordered topic list for this batch.</p></div>
        : <div style={{ display: 'grid', gap: 2 }}>
          {topics.map((t, i) => {
            const isDone = t.status === 'done'
            const isNext = i === nextIdx
            return (
              <div key={t._id || i} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 6,
                background: isNext ? 'var(--blue-wash)' : 'transparent', borderBottom: '1px solid var(--rule)',
              }}>
                <span className="data" style={{ color: isDone ? 'var(--tick)' : 'var(--ink-soft)', fontSize: 13, minWidth: 22 }}>{isDone ? '✓' : i + 1}</span>
                <span style={{
                  flex: 1, fontWeight: isNext ? 700 : 500,
                  textDecoration: isDone ? 'line-through' : 'none',
                  color: isDone ? 'var(--ink-soft)' : isNext ? 'var(--ink)' : 'var(--ink-soft)',
                }}>{t.title}</span>
                <select className="ctl" style={{ width: 'auto', height: 30, padding: '0 8px' }} value={t.status} disabled={!canEdit} onChange={e => setStatus(i, e.target.value)}>
                  <option value="pending">Pending</option>
                  <option value="in-progress">In progress</option>
                  <option value="done">Done</option>
                </select>
                {canEdit && <button className="btn btn--secondary btn--sm" onClick={() => move(i, -1)} title="Move up">↑</button>}
                {canEdit && <button className="btn btn--secondary btn--sm" onClick={() => move(i, 1)} title="Move down">↓</button>}
                {canEdit && <button className="btn btn--danger btn--sm" onClick={() => del(i)}>Remove</button>}
              </div>
            )
          })}
        </div>}
    </div>
  )
}

/* ─────────────── TOPPERS ─────────────── */
// Top 3 of every cycle of this batch — the same list the public Hall of Fame shows.
// It fills itself from the marks; to change it or add photos, open the cycle report.
function ToppersTab({ batchId, show }) {
  const [d, setD] = useState(null)
  useEffect(() => {
    api.get('/toppers', { params: { batch: batchId } }).then(r => setD(r.data))
      .catch(e => { show(e.response?.data?.message || 'Failed', 'error'); setD({ cycles: [], legacy: [] }) })
  }, [batchId])
  if (!d) return <div className="muted">Loading…</div>
  const medal = (r) => r === 1 ? '🥇' : r === 2 ? '🥈' : '🥉'
  return (
    <div>
      <p className="muted" style={{ fontSize: 14, marginTop: 0 }}>
        Filled automatically from the marks once every student has a mark — the same Top 3 the public Hall of Fame shows.
        To add photos or change it, open the cycle report.
      </p>
      {d.cycles.length === 0 && <div className="empty"><h2>No cycles yet</h2></div>}
      <div style={{ display: 'grid', gap: 12 }}>
        {d.cycles.map(c => (
          <div key={c._id} className="sheet" style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <div>
                <b>Cycle {c.number}</b>{c.name ? ` · ${c.name}` : ''}
                <span className="muted" style={{ fontSize: 13 }}> · project day {c.projectDay}</span>
                {c.manual && <span className="tag tag--muted" style={{ marginLeft: 8 }}>chosen by hand</span>}
              </div>
              <Link to={`/cycle/${c._id}`} className="btn btn--secondary btn--sm">Cycle report</Link>
            </div>
            {c.top3.length ? (
              <div style={{ display: 'grid', gap: 6, marginTop: 10 }}>
                {c.top3.map(t => (
                  <div key={t.rank} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ fontSize: 18 }}>{medal(t.rank)}</span>
                    <span style={{ fontWeight: 600 }}>{t.name}</span>
                    <span className="muted" style={{ fontSize: 13 }}>{t.roll}</span>
                    {t.github && <a href={t.github} target="_blank" rel="noreferrer" style={{ fontSize: 13 }}>project ↗</a>}
                    {!t.hasPhoto && <span className="muted" style={{ fontSize: 12 }}>· no photo</span>}
                  </div>
                ))}
              </div>
            ) : <p className="muted" style={{ fontSize: 13, margin: '8px 0 0' }}>{c.marksDone ? 'No student scored above 0.' : 'Appears once every student has a mark.'}</p>}
          </div>
        ))}
      </div>
      {d.legacy.length > 0 && (
        <details style={{ marginTop: 18 }}>
          <summary className="muted" style={{ cursor: 'pointer', fontSize: 14 }}>Older entries typed by hand ({d.legacy.length})</summary>
          <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
            {d.legacy.map(t => <div key={t._id} style={{ fontSize: 14 }}>{medal(t.rank)} {t.name} <span className="muted">{t.roll} · {t.cycle}</span>{t.project && <> · <a href={t.project} target="_blank" rel="noreferrer">project ↗</a></>}</div>)}
          </div>
        </details>
      )}
    </div>
  )
}


/* ─────────────── STUDENT LOGIN (join code, who has set up, resets) ─────────────── */
function StudentAccessTab({ batchId, show }) {
  const [d, setD] = useState(null)
  const [big, setBig] = useState(false)
  const [q, setQ] = useState('')
  async function load() {
    try { const { data } = await api.get(`/student-admin/batch/${batchId}`); setD(data) }
    catch (e) { show(e.response?.data?.message || 'Failed to load', 'error') }
  }
  useEffect(() => { load() }, [batchId])
  if (!d) return <p className="muted">Loading…</p>
  const site = `${window.location.origin}/student`
  async function regen() {
    if (!window.confirm('Make a new code? The old code stops working (students already set up are not affected).')) return
    try { await api.post(`/student-admin/batch/${batchId}/join-code`); show('New code made.'); load() } catch (e) { show(e.response?.data?.message || 'Failed', 'error') }
  }
  // Profile photos also appear on the public Hall of Fame — trainers can take one down.
  async function removePhoto(s) {
    if (!confirm(`Remove ${s.name}'s profile photo? It also disappears from the Hall of Fame.`)) return
    try { await api.put(`/students/${s._id}`, { photo: null }); show('Photo removed.'); load() } catch (e) { show(e.response?.data?.message || 'Failed', 'error') }
  }
  async function reset(s) {
    if (!window.confirm(`Reset ${s.name}'s password? They will set up again with roll number + batch code.`)) return
    try { const { data } = await api.post(`/student-admin/student/${s._id}/reset-password`); show(data.message); load() } catch (e) { show(e.response?.data?.message || 'Failed', 'error') }
  }
  const ql = q.trim().toLowerCase()
  const rows = d.students.filter(s => !ql || `${s.roll} ${s.name}`.toLowerCase().includes(ql))
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div className="sheet" style={{ padding: 18, display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div>
          <div className="muted" style={{ fontSize: 12 }}>Batch code (show it in class)</div>
          <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: '.18em', fontFamily: 'monospace' }}>{d.joinCode}</div>
        </div>
        <div style={{ flex: 1, minWidth: 220, fontSize: 14 }}>
          Students open <b>{site}</b> → “First time? Set up” → roll number + this code + a password.<br />
          <b>{d.activated}</b> of {d.total} students have set up their sign-in.
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn--primary btn--sm" onClick={() => setBig(true)}>Show full screen</button>
          <button className="btn btn--secondary btn--sm" onClick={regen}>New code</button>
        </div>
      </div>

      <div className="table-wrap sheet" style={{ borderRadius: 10 }}>
        <div style={{ padding: '10px 12px' }}><input className="ctl" style={{ maxWidth: 260, height: 34 }} placeholder="Find student…" value={q} onChange={e => setQ(e.target.value)} /></div>
        <table className="table table--compact">
          <thead><tr><th>Roll</th><th>Name</th><th>Sign-in</th><th>Last sign-in</th><th>GitHub</th><th>Photo</th><th></th></tr></thead>
          <tbody>{rows.map(s => (
            <tr key={s._id}>
              <td>{s.roll}</td><td>{s.name}{s.demo && <span className="tag tag--muted" style={{ marginLeft: 6 }}>demo</span>}</td>
              <td>{s.activated ? <span className="tag tag--tick">Set up</span> : <span className="tag tag--muted">Not yet</span>}</td>
              <td className="muted">{s.lastLoginAt ? new Date(s.lastLoginAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '—'}</td>
              <td>{s.github ? <a href={s.github} target="_blank" rel="noreferrer">profile ↗</a> : <span className="muted">—</span>}</td>
              <td>{s.hasPhoto ? <button className="btn btn--quiet btn--sm" onClick={() => removePhoto(s)}>Remove photo</button> : <span className="muted">—</span>}</td>
              <td>{s.activated && <button className="btn btn--quiet btn--sm" onClick={() => reset(s)}>Reset password</button>}</td>
            </tr>))}</tbody>
        </table>
      </div>

      {big && (
        <div onClick={() => setBig(false)} style={{ position: 'fixed', inset: 0, background: '#0b1a33', color: '#fff', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, cursor: 'pointer', padding: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 22, opacity: .8 }}>Open <b>{site}</b> → “First time? Set up”</div>
          <div style={{ fontSize: 'min(22vw, 180px)', fontWeight: 800, letterSpacing: '.12em', fontFamily: 'monospace' }}>{d.joinCode}</div>
          <div style={{ fontSize: 18, opacity: .7 }}>Roll number + this code + your own password · click anywhere to close</div>
        </div>
      )}
    </div>
  )
}
