import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../api'
import { useAuth } from '../context/AuthContext'
import { ui, Alert, Empty } from '../components/ui'

const CAT = {
  excellent: ['Excellent', 'rgba(22,163,74,0.18)', '#86EFAC'],
  moderate:  ['Moderate',  'rgba(37,99,235,0.18)', '#93C5FD'],
  basic:     ['Basic',     'rgba(245,158,11,0.18)', '#FCD34D'],
  zero:      ['Zero',      'rgba(220,38,38,0.18)', '#FCA5A5'],
  '':        ['—', 'rgba(255,255,255,0.06)', 'var(--muted)'],
}

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
  // Rows touched since the filter last changed. They stay on screen even when
  // the edit no longer matches the filter — otherwise flipping a student to
  // "Evaluated" while filtering by "Not evaluated" made the row disappear
  // mid-typing.
  const [sticky, setSticky] = useState(() => new Set())
  const show = (msg, type='success') => { setAlert({ msg, type }); setTimeout(()=>setAlert(null), 4500) }

  useEffect(() => { load() }, [id])

  // Warn before losing unsaved marks — the sheet saves as one action, so a
  // closed tab used to take every edit with it.
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
    const t = (Number(a)||0) + (Number(p)||0), pct = t/200*100
    if (pct === 0) return 'zero'; if (pct >= 75) return 'excellent'; if (pct >= 50) return 'moderate'; return 'basic'
  }

  // Keep marks inside 0–100 as they are typed. The backend rejects the whole
  // sheet otherwise, and a rejected sheet is a lot of retyping.
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

  const total = (r) => r.status==='evaluated' ? (Number(r.assessment)||0)+(Number(r.project)||0) : null

  async function save() {
    setSaving(true)
    try {
      await api.put(`/marks/${id}`, { rows: rows.map(r => ({
        student: r.student, name: r.name, roll: r.roll, status: r.status,
        assessment: r.assessment, project: r.project,
        category: r.category, categoryOverridden: r.categoryOverridden, remark: r.remark,
      })) })
      setDirty(false)
      show('Marks saved.'); load()
    } catch (e) {
      const d = e.response?.data
      // The server validates the whole sheet before writing anything, so on a
      // rejection nothing was saved and the edits are still on screen.
      show(d?.errors?.length ? `${d.message} ${d.errors.join(' · ')}` : (d?.message || 'Failed to save'), 'error')
    }
    finally { setSaving(false) }
  }

  function changeFilter(next) { setFilter(next); setSticky(new Set()) }
  function changeQuery(next)  { setQuery(next);  setSticky(new Set()) }

  const q = query.trim().toLowerCase()
  const matches = (r) => {
    if (q && !`${r.roll || ''} ${r.name || ''}`.toLowerCase().includes(q)) return false
    if (filter === 'all') return true
    if (filter === 'not-evaluated') return r.status === 'not-evaluated'
    return r.status === 'evaluated' && r.category === filter
  }
  const shown = rows.filter(r => matches(r) || sticky.has(r.student))

  // Bulk helpers act on exactly what is on screen, so "search a student, mark
  // them evaluated, set everyone else to not evaluated" is two clicks.
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

  const counts = rows.reduce((a,r) => {
    if (r.status==='not-evaluated') a.notEval++
    else a[r.category] = (a[r.category]||0)+1
    return a
  }, { notEval:0 })

  if (loading) return <div style={{ ...ui.wrap, color:'var(--muted)' }}>Loading…</div>
  if (!cycle)  return <div style={{ ...ui.wrap, color:'var(--muted)' }}>Cycle not found.</div>

  return (
    <div style={ui.wrap}>
      <Link to="/cycles" style={{ ...ui.sub, color:'var(--blue)' }}>← All cycles</Link>
      <div style={{ marginTop:8, marginBottom:6 }}>
        <h1 style={ui.h1}>{cycle.batch?.name} — Cycle {cycle.number} · Marks</h1>
        <p style={ui.sub}>
          Assessment + Project out of 100 each. Category is auto from total — you can override it.
          {sessions != null && ` Attendance is out of ${sessions} session${sessions===1?'':'s'} held in this cycle.`}
        </p>
      </div>

      {!rosterLocked && (
        <div style={{ background:'rgba(245,158,11,0.12)', border:'1px solid rgba(245,158,11,0.35)', color:'var(--gold)', padding:'10px 14px', borderRadius:9, fontSize:13, marginBottom:16 }}>
          Roster not locked yet — attendance % is provisional. Lock the roster on the batch page once segregation is done.
        </div>
      )}

      {sessions === 0 && (
        <div style={{ background:'rgba(220,38,38,0.12)', border:'1px solid rgba(220,38,38,0.35)', color:'#FCA5A5', padding:'10px 14px', borderRadius:9, fontSize:13, marginBottom:16 }}>
          No attendance was recorded for any session in this cycle's dates, so every attendance % here reads "—".
        </div>
      )}

      <Alert alert={alert} />

      {/* search + filter chips */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:10, alignItems:'center' }}>
        <input style={{ ...ui.input, width:240 }} placeholder="Search name or roll…"
          value={query} onChange={e=>changeQuery(e.target.value)} />
        {query && <button style={ui.btnGhost} onClick={()=>changeQuery('')}>Clear</button>}
      </div>
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:14 }}>
        {[['all',`All (${rows.length})`], ['excellent',`Excellent (${counts.excellent||0})`],
          ['moderate',`Moderate (${counts.moderate||0})`], ['basic',`Basic (${counts.basic||0})`],
          ['zero',`Zero (${counts.zero||0})`], ['not-evaluated',`Not evaluated (${counts.notEval})`]].map(([k,label]) => (
          <button key={k} onClick={()=>changeFilter(k)}
            style={{ ...ui.btnGhost, background: filter===k ? 'var(--blue)' : 'rgba(255,255,255,0.06)', color: filter===k?'#fff':'rgba(255,255,255,0.8)' }}>
            {label}
          </button>
        ))}
      </div>

      {canEdit && rows.length > 0 && (
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:14, alignItems:'center' }}>
          <span style={{ ...ui.sub, fontSize:12 }}>Showing {shown.length} of {rows.length} —</span>
          <button style={ui.btnGhost} onClick={()=>bulkShown('evaluated')}>Mark these Evaluated</button>
          <button style={ui.btnGhost} onClick={()=>bulkShown('not-evaluated')}>Mark these Not evaluated</button>
          <button style={ui.btnGhost} onClick={bulkOthersNotEvaluated}>Set everyone else Not evaluated</button>
        </div>
      )}

      {dirty && (
        <div style={{ background:'rgba(245,158,11,0.12)', border:'1px solid rgba(245,158,11,0.35)', color:'var(--gold)', padding:'10px 14px', borderRadius:9, fontSize:13, marginBottom:14 }}>
          Unsaved changes — nothing is stored until you press <b>Save marks</b>.
        </div>
      )}

      {rows.length === 0 ? <Empty icon="📝" title="No students in this batch" hint="Import the roster in the batch's Roster tab first." />
        : (
          <>
            <div style={{ ...ui.card, padding:0, overflow:'hidden' }}>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', minWidth:820 }}>
                  <thead><tr>
                    <th style={ui.th}>Roll</th><th style={ui.th}>Name</th><th style={ui.th}>Att%</th>
                    <th style={ui.th}>Status</th><th style={ui.th}>Assess</th><th style={ui.th}>Project</th>
                    <th style={ui.th}>Total</th><th style={ui.th}>Category</th><th style={ui.th}>Remark</th>
                  </tr></thead>
                  <tbody>
                    {shown.length === 0 && (
                      <tr><td style={{ ...ui.td, color:'var(--muted)' }} colSpan={9}>
                        Nothing matches this search and filter.
                      </td></tr>
                    )}
                    {shown.map((r) => {
                      const [clabel,cbg,cfg] = CAT[r.category] || CAT['']
                      const offFilter = !matches(r)
                      return (
                        <tr key={r.student} style={offFilter ? { background:'rgba(37,99,235,0.07)' } : undefined}>
                          <td style={{ ...ui.td, color:'var(--muted)' }}>{r.roll||'—'}</td>
                          <td style={{ ...ui.td, fontWeight:600 }}>{r.name}</td>
                          <td style={ui.td}>{r.attendancePct==null?'—':`${r.attendancePct}%`}</td>
                          <td style={ui.td}>
                            <select style={{ ...ui.input, width:'auto', padding:'5px 8px' }} value={r.status} disabled={!canEdit}
                              onChange={e=>update(r.student,'status',e.target.value)}>
                              <option value="not-evaluated">Not eval</option>
                              <option value="evaluated">Evaluated</option>
                            </select>
                          </td>
                          <td style={ui.td}>
                            <input type="number" min="0" max="100" disabled={!canEdit || r.status!=='evaluated'}
                              style={{ ...ui.input, width:70, padding:'5px 8px' }}
                              value={r.assessment ?? ''} onChange={e=>update(r.student,'assessment',e.target.value)} />
                          </td>
                          <td style={ui.td}>
                            <input type="number" min="0" max="100" disabled={!canEdit || r.status!=='evaluated'}
                              style={{ ...ui.input, width:70, padding:'5px 8px' }}
                              value={r.project ?? ''} onChange={e=>update(r.student,'project',e.target.value)} />
                          </td>
                          <td style={{ ...ui.td, fontWeight:600 }}>{total(r)==null?'—':`${total(r)}/200`}</td>
                          <td style={ui.td}>
                            {r.status!=='evaluated' ? <span style={ui.pill(CAT[''][1],CAT[''][2])}>—</span> :
                            <select style={{ ...ui.input, width:'auto', padding:'5px 8px', color:cfg }} disabled={!canEdit}
                              value={r.category} onChange={e=>update(r.student,'category',e.target.value)}>
                              <option value="excellent">Excellent</option>
                              <option value="moderate">Moderate</option>
                              <option value="basic">Basic</option>
                              <option value="zero">Zero</option>
                            </select>}
                          </td>
                          <td style={ui.td}>
                            <input disabled={!canEdit} style={{ ...ui.input, width:160, padding:'5px 8px' }}
                              value={r.remark||''} onChange={e=>update(r.student,'remark',e.target.value)} placeholder="optional" />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            {canEdit && <div style={{ marginTop:16, display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
              <button style={ui.btnGold} disabled={saving} onClick={save}>{saving?'Saving…':'Save marks'}</button>
              <Link to={`/cycle/${id}`}><button style={ui.btnGhost}>Go to cycle report / Top 3</button></Link>
              {dirty && <span style={{ ...ui.sub, fontSize:12, color:'var(--gold)' }}>You have unsaved changes.</span>}
            </div>}
          </>
        )}
    </div>
  )
}
