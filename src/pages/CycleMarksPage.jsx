import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../api'
import { useAuth } from '../context/AuthContext'

const CAT = {
  excellent: ['Excellent', 'tag--tick'],
  moderate:  ['Moderate',  'tag--blue'],
  basic:     ['Basic',     'tag--pencil'],
  zero:      ['Zero',      'tag--red'],
  '':        ['—', 'tag--muted'],
}
const NAV_COLS = 5 // status, assessment, project, category, remark

export default function CycleMarksPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const [cycle, setCycle] = useState(null)
  const [rows, setRows] = useState([])
  const [rosterLocked, setRosterLocked] = useState(false)
  const [sessions, setSessions] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [alert, setAlert] = useState(null)
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [dirty, setDirty] = useState(false)
  const [sticky, setSticky] = useState(() => new Set())
  const cellRefs = useRef({})
  const show = (msg, type = 'success') => { setAlert({ msg, type }); setTimeout(() => setAlert(null), 4500) }

  useEffect(() => { load() }, [id])

  useEffect(() => {
    const warn = (e) => { if (dirty) { e.preventDefault(); e.returnValue = '' } }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  async function load() {
    setLoading(true)
    try {
      const { data } = await api.get(`/marks/${id}`)
      setCycle(data.cycle); setRosterLocked(data.rosterLocked)
      setSessions(data.sessionsInCycle ?? null)
      setRows(data.rows); setDirty(false); setSticky(new Set())
    } catch (e) { show(e.response?.data?.message || 'Failed to load', 'error') }
    finally { setLoading(false) }
  }

  const myId = user?.id || user?._id
  const canEdit = user?.role === 'superadmin'
    || (cycle?.batch?.trainers || []).some(t => (t._id || t) === myId)

  function catFromMarks(a, p) {
    const t = (Number(a) || 0) + (Number(p) || 0), pct = t / 200 * 100
    if (pct === 0) return 'zero'; if (pct >= 75) return 'excellent'; if (pct >= 50) return 'moderate'; return 'basic'
  }

  function clampMark(v) {
    if (v === '' || v == null) return null
    const n = Number(v)
    if (!Number.isFinite(n)) return null
    return Math.max(0, Math.min(100, n))
  }

  function applyEdit(r, field, value) {
    const n = { ...r, [field]: value }
    if (field === 'status' && value === 'not-evaluated') {
      n.assessment = null; n.project = null; n.category = ''; n.categoryOverridden = false
    }
    if (field === 'status' && value === 'evaluated' && !n.category) {
      n.category = catFromMarks(n.assessment, n.project)
    }
    if ((field === 'assessment' || field === 'project') && n.status === 'evaluated' && !n.categoryOverridden) {
      n.category = catFromMarks(n.assessment, n.project)
    }
    if (field === 'category') n.categoryOverridden = true
    return n
  }

  function update(studentId, field, value) {
    const v = (field === 'assessment' || field === 'project') ? clampMark(value) : value
    setRows(rs => rs.map(r => r.student === studentId ? applyEdit(r, field, v) : r))
    setSticky(s => new Set(s).add(studentId))
    setDirty(true)
  }

  const total = (r) => r.status === 'evaluated' ? (Number(r.assessment) || 0) + (Number(r.project) || 0) : null

  async function save() {
    setSaving(true)
    try {
      await api.put(`/marks/${id}`, {
        rows: rows.map(r => ({
          student: r.student, name: r.name, roll: r.roll, status: r.status,
          assessment: r.assessment, project: r.project,
          category: r.category, categoryOverridden: r.categoryOverridden, remark: r.remark,
        }))
      })
      setDirty(false)
      show('Marks saved.'); load()
    } catch (e) {
      const d = e.response?.data
      show(d?.errors?.length ? `${d.message} ${d.errors.join(' · ')}` : (d?.message || 'Failed to save'), 'error')
    }
    finally { setSaving(false) }
  }

  function changeFilter(next) { setFilter(next); setSticky(new Set()) }
  function changeQuery(next) { setQuery(next); setSticky(new Set()) }

  const q = query.trim().toLowerCase()
  const matches = (r) => {
    if (q && !`${r.roll || ''} ${r.name || ''}`.toLowerCase().includes(q)) return false
    if (filter === 'all') return true
    if (filter === 'not-evaluated') return r.status === 'not-evaluated'
    return r.status === 'evaluated' && r.category === filter
  }
  const shown = rows.filter(r => matches(r) || sticky.has(r.student))

  function setStatusFor(predicate, status) {
    let n = 0
    setRows(rs => rs.map(r => {
      if (!predicate(r)) return r
      n++
      return applyEdit(r, 'status', status)
    }))
    setDirty(true)
    return n
  }
  function bulkShown(status) {
    const ids = new Set(shown.map(r => r.student))
    const n = setStatusFor(r => ids.has(r.student), status)
    setSticky(s => { const next = new Set(s); ids.forEach(i => next.add(i)); return next })
    show(`${n} student(s) set to ${status === 'evaluated' ? 'Evaluated' : 'Not evaluated'}. Not saved yet.`)
  }
  function bulkOthersNotEvaluated() {
    const ids = new Set(shown.map(r => r.student))
    const n = setStatusFor(r => !ids.has(r.student) && r.status !== 'not-evaluated', 'not-evaluated')
    show(`${n} student(s) outside this view set to Not evaluated. Not saved yet.`)
  }

  // Keyboard-first grid: arrow keys move between cells; Enter behaves like
  // down-arrow (spreadsheet convention). Tab already moves in DOM order for
  // free. Disabled cells (marks locked to "not evaluated") are skipped.
  function focusCell(r, c) {
    if (r < 0 || r >= shown.length || c < 0 || c >= NAV_COLS) return
    const el = cellRefs.current[`${r}-${c}`]
    if (!el) return
    if (el.disabled) {
      // keep moving in whichever direction got us here isn't tracked here,
      // so just try the next row at the same column, once.
      const next = cellRefs.current[`${r + 1}-${c}`]
      if (next && !next.disabled) { next.focus(); return }
      return
    }
    el.focus(); el.select?.()
  }
  function onCellKeyDown(e, r, c) {
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); focusCell(r + 1, c); break
      case 'ArrowUp': e.preventDefault(); focusCell(r - 1, c); break
      case 'ArrowRight': if (e.target.tagName !== 'INPUT' || e.target.selectionStart === e.target.value.length) { e.preventDefault(); focusCell(r, c + 1) } break
      case 'ArrowLeft': if (e.target.tagName !== 'INPUT' || e.target.selectionStart === 0) { e.preventDefault(); focusCell(r, c - 1) } break
      case 'Enter': e.preventDefault(); focusCell(r + 1, c); break
      default: break
    }
  }

  const counts = rows.reduce((a, r) => {
    if (r.status === 'not-evaluated') a.notEval++
    else a[r.category] = (a[r.category] || 0) + 1
    return a
  }, { notEval: 0 })

  if (loading) return <div className="page" style={{ color: 'var(--ink-soft)' }}>Loading…</div>
  if (!cycle) return <div className="page" style={{ color: 'var(--ink-soft)' }}>Cycle not found.</div>

  return (
    <div className="page">
      <Link to="/cycles" className="btn btn--quiet" style={{ fontSize: 13 }}>← All cycles</Link>
      <div style={{ marginTop: 8, marginBottom: 6 }}>
        <h1 className="page-title">{cycle.batch?.name} — Cycle {cycle.number} · Marks</h1>
        <p className="muted" style={{ fontSize: 14, marginTop: 2 }}>
          Assessment + Project out of 100 each. Category is auto from total — you can override it.
          {sessions != null && ` Attendance is out of ${sessions} session${sessions === 1 ? '' : 's'} held in this cycle.`}
        </p>
      </div>

      {!rosterLocked && (
        <div className="banner banner--pencil">
          Roster not locked yet — attendance % is provisional. Lock the roster on the batch page once segregation is done.
        </div>
      )}
      {sessions === 0 && (
        <div className="banner banner--error">
          No attendance was recorded for any session in this cycle's dates, so every attendance % here reads "—".
        </div>
      )}
      {alert && <div className={`banner banner--${alert.type === 'success' ? 'success' : 'error'}`}>{alert.msg}</div>}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10, alignItems: 'center' }}>
        <input className="ctl" style={{ width: 240, height: 34 }} placeholder="Search name or roll…"
          value={query} onChange={e => changeQuery(e.target.value)} />
        {query && <button className="btn btn--secondary btn--sm" onClick={() => changeQuery('')}>Clear</button>}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        {[['all', `All (${rows.length})`], ['excellent', `Excellent (${counts.excellent || 0})`],
        ['moderate', `Moderate (${counts.moderate || 0})`], ['basic', `Basic (${counts.basic || 0})`],
        ['zero', `Zero (${counts.zero || 0})`], ['not-evaluated', `Not evaluated (${counts.notEval})`]].map(([k, label]) => (
          <button key={k} onClick={() => changeFilter(k)} className={`btn btn--sm ${filter === k ? 'btn--primary' : 'btn--secondary'}`}>
            {label}
          </button>
        ))}
      </div>

      {canEdit && rows.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14, alignItems: 'center' }}>
          <span className="muted" style={{ fontSize: 12 }}>Showing {shown.length} of {rows.length} —</span>
          <button className="btn btn--secondary btn--sm" onClick={() => bulkShown('evaluated')}>Mark these Evaluated</button>
          <button className="btn btn--secondary btn--sm" onClick={() => bulkShown('not-evaluated')}>Mark these Not evaluated</button>
          <button className="btn btn--secondary btn--sm" onClick={bulkOthersNotEvaluated}>Set everyone else Not evaluated</button>
        </div>
      )}

      {dirty && (
        <div className="banner banner--pencil">
          Unsaved changes — nothing is stored until you press <b>Save marks</b>.
        </div>
      )}

      {rows.length === 0 ? <div className="empty"><h2>No students in this batch</h2><p>Import the roster in the batch's Students tab first.</p></div>
        : (
          <>
            <div className="table-wrap sheet" style={{ borderRadius: 10 }}>
              <table className="table table--compact">
                <thead><tr>
                  <th>Roll</th><th>Name</th><th className="num">Att%</th>
                  <th>Status</th><th className="num">Assess</th><th className="num">Project</th>
                  <th className="num">Total</th><th>Category</th><th>Remark</th>
                </tr></thead>
                <tbody>
                  {shown.length === 0 && (
                    <tr><td className="muted" colSpan={9}>Nothing matches this search and filter.</td></tr>
                  )}
                  {shown.map((r, ri) => {
                    const [clabel, ctag] = CAT[r.category] || CAT['']
                    const offFilter = !matches(r)
                    const evaluated = r.status === 'evaluated'
                    return (
                      <tr key={r.student} style={offFilter ? { background: 'var(--blue-wash)' } : undefined}>
                        <td className="data muted">{r.roll || '—'}</td>
                        <td style={{ fontWeight: 600 }}>{r.name}</td>
                        <td className="num">{r.attendancePct == null ? '—' : `${r.attendancePct}%`}</td>
                        <td>
                          <select
                            ref={el => cellRefs.current[`${ri}-0`] = el}
                            onKeyDown={e => onCellKeyDown(e, ri, 0)}
                            className="ctl" style={{ width: 'auto', height: 30, padding: '0 6px' }} value={r.status} disabled={!canEdit}
                            onChange={e => update(r.student, 'status', e.target.value)}>
                            <option value="not-evaluated">Not eval</option>
                            <option value="evaluated">Evaluated</option>
                          </select>
                        </td>
                        <td>
                          <input
                            ref={el => cellRefs.current[`${ri}-1`] = el}
                            onKeyDown={e => onCellKeyDown(e, ri, 1)}
                            type="number" min="0" max="100" disabled={!canEdit || !evaluated}
                            className="ctl" style={{ width: 64, height: 30, padding: '0 6px' }}
                            value={r.assessment ?? ''} onChange={e => update(r.student, 'assessment', e.target.value)} />
                        </td>
                        <td>
                          <input
                            ref={el => cellRefs.current[`${ri}-2`] = el}
                            onKeyDown={e => onCellKeyDown(e, ri, 2)}
                            type="number" min="0" max="100" disabled={!canEdit || !evaluated}
                            className="ctl" style={{ width: 64, height: 30, padding: '0 6px' }}
                            value={r.project ?? ''} onChange={e => update(r.student, 'project', e.target.value)} />
                        </td>
                        <td className="num" style={{ fontWeight: 600 }}>{total(r) == null ? '—' : `${total(r)}/200`}</td>
                        <td>
                          {!evaluated ? <span className="tag tag--muted">—</span> :
                            <select
                              ref={el => cellRefs.current[`${ri}-3`] = el}
                              onKeyDown={e => onCellKeyDown(e, ri, 3)}
                              className="ctl" style={{ width: 'auto', height: 30, padding: '0 6px' }} disabled={!canEdit}
                              value={r.category} onChange={e => update(r.student, 'category', e.target.value)}>
                              <option value="excellent">Excellent</option>
                              <option value="moderate">Moderate</option>
                              <option value="basic">Basic</option>
                              <option value="zero">Zero</option>
                            </select>}
                          {' '}<span className={`tag ${ctag}`} style={{ marginLeft: 4 }}>{evaluated ? clabel : ''}</span>
                        </td>
                        <td>
                          <input
                            ref={el => cellRefs.current[`${ri}-4`] = el}
                            onKeyDown={e => onCellKeyDown(e, ri, 4)}
                            disabled={!canEdit} className="ctl" style={{ width: 160, height: 30, padding: '0 6px' }}
                            value={r.remark || ''} onChange={e => update(r.student, 'remark', e.target.value)} placeholder="optional" />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {canEdit && <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <button className="btn btn--primary" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save marks'}</button>
              <Link to={`/cycle/${id}`}><button className="btn btn--secondary">Go to cycle report / Top 3</button></Link>
              {dirty && <span className="muted" style={{ fontSize: 12, color: 'var(--pencil)' }}>You have unsaved changes.</span>}
            </div>}
          </>
        )}
    </div>
  )
}
