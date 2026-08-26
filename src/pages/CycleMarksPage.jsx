import { useState, useEffect } from 'react'
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
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [alert, setAlert] = useState(null)
  const [filter, setFilter] = useState('all')
  const show = (msg, type='success') => { setAlert({ msg, type }); setTimeout(()=>setAlert(null), 3500) }

  useEffect(() => { load() }, [id])
  async function load() {
    setLoading(true)
    try {
      const { data } = await api.get(`/marks/${id}`)
      setCycle(data.cycle); setRosterLocked(data.rosterLocked)
      setRows(data.rows)
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
  function update(i, field, value) {
    setRows(rs => rs.map((r, idx) => {
      if (idx !== i) return r
      const n = { ...r, [field]: value }
      if (field === 'status' && value === 'not-evaluated') { n.assessment=null; n.project=null; n.category=''; n.categoryOverridden=false }
      if (field === 'status' && value === 'evaluated' && !n.category) n.category = catFromMarks(n.assessment, n.project)
      if ((field === 'assessment' || field === 'project') && n.status === 'evaluated' && !n.categoryOverridden) {
        n.category = catFromMarks(field==='assessment'?value:n.assessment, field==='project'?value:n.project)
      }
      if (field === 'category') n.categoryOverridden = true
      return n
    }))
  }

  const total = (r) => r.status==='evaluated' ? (Number(r.assessment)||0)+(Number(r.project)||0) : null

  async function save() {
    setSaving(true)
    try {
      await api.put(`/marks/${id}`, { rows: rows.map(r => ({
        student: r.student, status: r.status,
        assessment: r.assessment, project: r.project,
        category: r.category, categoryOverridden: r.categoryOverridden, remark: r.remark,
      })) })
      show('Marks saved.'); load()
    } catch (e) { show(e.response?.data?.message || 'Failed to save', 'error') }
    finally { setSaving(false) }
  }

  const shown = rows.filter(r => filter==='all' ? true : filter==='not-evaluated' ? r.status==='not-evaluated' : r.category===filter)
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
        <p style={ui.sub}>Assessment + Project out of 100 each. Category is auto from total — you can override it.</p>
      </div>

      {!rosterLocked && (
        <div style={{ background:'rgba(245,158,11,0.12)', border:'1px solid rgba(245,158,11,0.35)', color:'var(--gold)', padding:'10px 14px', borderRadius:9, fontSize:13, marginBottom:16 }}>
          Roster not locked yet — attendance % is provisional. Lock the roster on the batch page once segregation is done.
        </div>
      )}

      <Alert alert={alert} />

      {/* filter chips */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:14 }}>
        {[['all',`All (${rows.length})`], ['excellent',`Excellent (${counts.excellent||0})`],
          ['moderate',`Moderate (${counts.moderate||0})`], ['basic',`Basic (${counts.basic||0})`],
          ['zero',`Zero (${counts.zero||0})`], ['not-evaluated',`Not evaluated (${counts.notEval})`]].map(([k,label]) => (
          <button key={k} onClick={()=>setFilter(k)}
            style={{ ...ui.btnGhost, background: filter===k ? 'var(--blue)' : 'rgba(255,255,255,0.06)', color: filter===k?'#fff':'rgba(255,255,255,0.8)' }}>
            {label}
          </button>
        ))}
      </div>

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
                    {shown.map((r) => {
                      const i = rows.indexOf(r)
                      const [clabel,cbg,cfg] = CAT[r.category] || CAT['']
                      return (
                        <tr key={r.student}>
                          <td style={{ ...ui.td, color:'var(--muted)' }}>{r.roll||'—'}</td>
                          <td style={{ ...ui.td, fontWeight:600 }}>{r.name}</td>
                          <td style={ui.td}>{r.attendancePct==null?'—':`${r.attendancePct}%`}</td>
                          <td style={ui.td}>
                            <select style={{ ...ui.input, width:'auto', padding:'5px 8px' }} value={r.status} disabled={!canEdit}
                              onChange={e=>update(i,'status',e.target.value)}>
                              <option value="not-evaluated">Not eval</option>
                              <option value="evaluated">Evaluated</option>
                            </select>
                          </td>
                          <td style={ui.td}>
                            <input type="number" min="0" max="100" disabled={!canEdit || r.status!=='evaluated'}
                              style={{ ...ui.input, width:70, padding:'5px 8px' }}
                              value={r.assessment ?? ''} onChange={e=>update(i,'assessment',e.target.value)} />
                          </td>
                          <td style={ui.td}>
                            <input type="number" min="0" max="100" disabled={!canEdit || r.status!=='evaluated'}
                              style={{ ...ui.input, width:70, padding:'5px 8px' }}
                              value={r.project ?? ''} onChange={e=>update(i,'project',e.target.value)} />
                          </td>
                          <td style={{ ...ui.td, fontWeight:600 }}>{total(r)==null?'—':`${total(r)}/200`}</td>
                          <td style={ui.td}>
                            {r.status!=='evaluated' ? <span style={ui.pill(CAT[''][1],CAT[''][2])}>—</span> :
                            <select style={{ ...ui.input, width:'auto', padding:'5px 8px', color:cfg }} disabled={!canEdit}
                              value={r.category} onChange={e=>update(i,'category',e.target.value)}>
                              <option value="excellent">Excellent</option>
                              <option value="moderate">Moderate</option>
                              <option value="basic">Basic</option>
                              <option value="zero">Zero</option>
                            </select>}
                          </td>
                          <td style={ui.td}>
                            <input disabled={!canEdit} style={{ ...ui.input, width:160, padding:'5px 8px' }}
                              value={r.remark||''} onChange={e=>update(i,'remark',e.target.value)} placeholder="optional" />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            {canEdit && <div style={{ marginTop:16, display:'flex', gap:10 }}>
              <button style={ui.btnGold} disabled={saving} onClick={save}>{saving?'Saving…':'Save marks'}</button>
              <Link to={`/cycle/${id}`}><button style={ui.btnGhost}>Go to cycle report / Top 3</button></Link>
            </div>}
          </>
        )}
    </div>
  )
}
