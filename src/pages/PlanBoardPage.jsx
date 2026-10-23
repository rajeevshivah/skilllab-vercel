// All class plans — every batch's cycle plan for one cycle period, day by day
// (or batch by batch), with editing. Admin always edits; trainers edit only
// while the admin has opened editing (e.g. in the planning meeting). Every
// change is recorded (who, when, what). Each past class shows whether its
// daily log was saved and whether it meets the logging rule.
import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'
import { useAuth } from '../context/AuthContext'
import PageHelp from '../components/PageHelp'

const IST = { timeZone: 'Asia/Kolkata' }
const fmtDay = (ymd) => ymd ? new Date(ymd + 'T12:00:00+05:30').toLocaleDateString('en-IN', { ...IST, weekday: 'short', day: 'numeric', month: 'short' }) : 'No date'
const fmtDT = (d) => d ? new Date(d).toLocaleString('en-IN', { ...IST, day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : ''
const todayYmd = () => new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10)
const periodLabel = (p) => `${fmtDay(p.start)} – ${fmtDay(p.end)} · Cycle${p.numbers.length > 1 ? 's' : ''} ${p.numbers.join(', ')} · ${p.batches} batch${p.batches === 1 ? '' : 'es'}`

function LogChip({ c, ruleFrom }) {
  const t = todayYmd()
  if (c.holiday) return <span className="tag tag--pencil">Holiday: {c.holiday} — re-plan this class</span>
  if (!c.date || c.date > t) return null
  const l = c.log
  if (!l) return c.date === t ? <span className="tag tag--muted">Today — log before midnight</span> : <span className="tag tag--red">Not logged</span>
  if (l.status === 'no-class') return <span className="tag tag--blue">No class</span>
  const how = l.status === 'done' ? 'Done' : l.status === 'partial' ? 'Partly done' : 'Not done'
  if (c.date >= ruleFrom && l.missing?.length) return <span className="tag tag--pencil" title={`Logged by ${l.by}`}>{how} · missing {l.missing.join(', ')}</span>
  return <span className={`tag ${l.status === 'done' ? 'tag--tick' : 'tag--pencil'}`} title={`Logged by ${l.by}`}>{how}{l.github && l.github !== 'na' ? ` · GitHub: ${l.github}` : ''}</span>
}

function ClassEditor({ value, trainers, onSave, onCancel, saving }) {
  const [v, setV] = useState(value)
  const set = (k, x) => setV(o => ({ ...o, [k]: x }))
  return (
    <div style={{ display: 'grid', gap: 8, padding: '10px 0' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 8 }}>
        <input className="ctl" type="number" min={1} value={v.number} onChange={e => set('number', Number(e.target.value))} title="Class number" />
        <input className="ctl" value={v.title} onChange={e => set('title', e.target.value)} placeholder="Topic" />
      </div>
      <textarea className="ctl" style={{ minHeight: 90 }} value={v.notes} onChange={e => set('notes', e.target.value)} placeholder="What will be covered" />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input className="ctl" type="date" style={{ width: 170 }} value={v.date} onChange={e => set('date', e.target.value)} />
        <input className="ctl" type="time" style={{ width: 120 }} value={v.time} onChange={e => set('time', e.target.value)} />
        <select className="ctl" style={{ width: 180 }} value={v.trainer} onChange={e => set('trainer', e.target.value)}>
          <option value="">Trainer —</option>
          {trainers.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
        </select>
        <button className="btn btn--primary btn--sm" disabled={saving || !v.title.trim()} onClick={() => onSave(v)}>{saving ? 'Saving…' : 'Save'}</button>
        <button className="btn btn--secondary btn--sm" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}

const toEdit = (c) => ({ number: c.number, title: c.title || '', notes: c.notes || '', date: c.date || '', time: c.time || '', trainer: c.trainer?._id || '' })

export default function PlanBoardPage() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [err, setErr] = useState(null)
  const [msg, setMsg] = useState(null)
  const [view, setView] = useState('day')
  const [mineOnly, setMineOnly] = useState(null)   // null until data arrives: trainers start on "my batches"
  const [editing, setEditing] = useState(null)   // `${cycleId}:${number}` or `${cycleId}:new`
  const [saving, setSaving] = useState(false)
  const [openNotes, setOpenNotes] = useState({})
  const [showChanges, setShowChanges] = useState({})

  const seen = useRef({})        // rowKey → updatedAt we last saw (to highlight others' fresh changes)
  const [fresh, setFresh] = useState({})
  const myId = String(user?.id || user?._id || '')
  async function load(period, { quiet = false } = {}) {
    try {
      const { data } = await api.get('/cycleplans/board', { params: period ? { period } : {} })
      // rows changed by someone else since our last look
      const nowFresh = {}
      for (const cy of data.cycles || []) for (const c of cy.classes) {
        const k = `${cy.cycleId}:${c.number}`, prev = seen.current[k]
        if (quiet && c.updatedAt && prev !== undefined && prev !== c.updatedAt && String(c.updatedById) !== myId) nowFresh[k] = c.updatedBy
        seen.current[k] = c.updatedAt
      }
      if (Object.keys(nowFresh).length) { setFresh(f => ({ ...f, ...nowFresh })); setTimeout(() => setFresh(f => { const g = { ...f }; for (const k in nowFresh) delete g[k]; return g }), 20000) }
      setData(data); setErr(null)
      setMineOnly(m => m === null ? (!data.isAdmin && (data.cycles || []).some(c => c.mine)) : m)
    } catch (e) { if (!quiet) setErr(e.response?.data?.message || 'Could not load plans') }
  }
  useEffect(() => { load() }, [])
  // Live: refresh every 15 s while the tab is visible and nobody is mid-edit here
  const editingRef = useRef(null); editingRef.current = editing
  const periodRef = useRef(null); periodRef.current = data?.period
  useEffect(() => {
    const t = setInterval(() => { if (!document.hidden && !editingRef.current && periodRef.current) load(periodRef.current, { quiet: true }) }, 15000)
    return () => clearInterval(t)
  }, [])
  const flash = (text, type = 'success') => { setMsg({ text, type }); setTimeout(() => setMsg(null), 4500) }

  const cycles = useMemo(() => (data?.cycles || []).filter(c => !mineOnly || c.mine), [data, mineOnly])
  const anyOpen = (data?.cycles || []).some(c => c.planOpen)
  const baseOf = (c) => c?.updatedAt ? new Date(c.updatedAt).toISOString() : ''

  // Saves ONE class (others' rows are never touched). If someone changed this
  // row after we loaded it, the server refuses and we reload instead.
  async function saveClass(cy, orig, v) {
    setSaving(true)
    try {
      const payload = { ...v, trainer: v.trainer || null }
      if (orig) await api.patch(`/cycleplans/${cy.cycleId}/class/${orig.number}`, { ...payload, baseUpdatedAt: baseOf(orig) })
      else await api.post(`/cycleplans/${cy.cycleId}/class`, payload)
      setEditing(null); flash(`${cy.batch.name}: class ${v.number} saved.`); load(data.period)
    } catch (e) {
      flash(e.response?.data?.message || 'Could not save', 'error')
      if (e.response?.status === 409) { setEditing(null); load(data.period) }
    } finally { setSaving(false) }
  }
  async function removeClass(cy, c) {
    if (!window.confirm(`Remove class ${c.number} from ${cy.batch.name}'s plan?`)) return
    try {
      await api.delete(`/cycleplans/${cy.cycleId}/class/${c.number}`, { params: { baseUpdatedAt: baseOf(c) } })
      flash('Class removed.'); load(data.period)
    } catch (e) { flash(e.response?.data?.message || 'Could not remove', 'error'); load(data.period) }
  }
  async function setOpen(open, cycleId) {
    try {
      await api.patch('/cycleplans/board/open', cycleId ? { cycleId, open } : { period: data.period, open })
      flash(open ? 'Trainers can now edit these plans. Lock them again when planning is done.' : 'Plans locked. Trainers can only view.')
      load(data.period)
    } catch (e) { flash(e.response?.data?.message || 'Could not change', 'error') }
  }

  if (err && !data) return <div className="page"><div className="banner banner--error">{err}</div></div>
  if (!data) return <div className="page"><p className="muted">Loading…</p></div>

  const t = todayYmd()
  // Day-by-day rows
  const byDay = new Map()
  for (const cy of cycles) {
    for (const c of cy.classes) {
      if (c.date && !c.inCycle) continue
      const k = c.date || ''
      if (!byDay.has(k)) byDay.set(k, [])
      byDay.get(k).push({ cy, c })
    }
    for (const x of cy.extraLogs || []) {
      if (!byDay.has(x.date)) byDay.set(x.date, [])
      byDay.get(x.date).push({ cy, extra: x })
    }
  }
  // Holiday days show even when no class is left on them
  const holOn = (d) => (data.holidays || []).filter(h => d && d >= h.from && d <= h.to)
  for (const h of data.holidays || []) {
    for (let d = h.from; d <= h.to; d = new Date(new Date(d + 'T12:00:00Z').getTime() + 864e5).toISOString().slice(0, 10))
      if (d >= data.start && d <= data.end && !byDay.has(d)) byDay.set(d, [])
  }
  const days = [...byDay.keys()].sort((a, b) => (a || '9999').localeCompare(b || '9999'))

  const row = (cy, c) => {
    const key = `${cy.cycleId}:${c.number}`
    if (editing === key) return (
      <div key={key} style={{ padding: '4px 14px', borderTop: '1px solid var(--rule)' }}>
        <b>{cy.batch.name}</b>
        <ClassEditor value={toEdit(c)} trainers={cy.trainers} saving={saving} onCancel={() => setEditing(null)} onSave={(v) => saveClass(cy, c, v)} />
      </div>
    )
    const long = (c.notes || '').length > 140
    return (
      <div key={key} style={{ display: 'grid', gridTemplateColumns: 'minmax(120px,170px) 1fr auto', gap: 12, padding: '10px 14px', borderTop: '1px solid var(--rule)', alignItems: 'start',
        transition: 'background .6s', ...(fresh[key] ? { background: 'var(--pencil-wash)' } : {}) }}>
        <div>
          <b>{view === 'day' ? cy.batch.name : fmtDay(c.date)}</b>
          <div className="muted" style={{ fontSize: 12 }}>Class {c.number}{c.time ? ` · ${c.time}` : ''}{c.trainer ? ` · ${c.trainer.name}` : ''}</div>
          {fresh[key] && <div style={{ fontSize: 12, color: 'var(--pencil)', fontWeight: 600 }}>just changed by {fresh[key]}</div>}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600 }} title={c.updatedBy ? `Last edited by ${c.updatedBy}` : undefined}>{c.title || <span style={{ color: 'var(--pencil)' }}>Topic not filled yet</span>}</div>
          {c.notes && <div className="muted" style={{ fontSize: 13, whiteSpace: 'pre-wrap', marginTop: 2 }}>
            {long && !openNotes[key] ? c.notes.slice(0, 140) + '…' : c.notes}
            {long && <button className="btn btn--quiet" style={{ fontSize: 12, marginLeft: 6 }} onClick={() => setOpenNotes(o => ({ ...o, [key]: !o[key] }))}>{openNotes[key] ? 'less' : 'more'}</button>}
          </div>}
          <div style={{ marginTop: 4, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <LogChip c={c} ruleFrom={data.ruleFrom} />
            {c.pulse && <span className={`tag ${c.pulse.mismatch ? 'tag--red' : c.pulse.coveredPct >= 70 ? 'tag--tick' : 'tag--muted'}`}
              title={`${c.pulse.yes} yes · ${c.pulse.partly} partly · ${c.pulse.no} no`}>
              {c.pulse.mismatch ? '⚠ ' : ''}Students: {c.pulse.coveredPct}% covered · understood {c.pulse.understanding}/5 ({c.pulse.responses})</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {cy.canEdit && <button className="btn btn--secondary btn--sm" onClick={() => setEditing(key)}>Edit</button>}
          {cy.canEdit && view === 'batch' && <button className="btn btn--quiet btn--sm" style={{ color: 'var(--red-ink)' }} onClick={() => removeClass(cy, c)}>Remove</button>}
        </div>
      </div>
    )
  }
  const extraRow = (cy, x) => (
    <div key={`${cy.cycleId}:x:${x.date}`} style={{ display: 'grid', gridTemplateColumns: 'minmax(120px,170px) 1fr', gap: 12, padding: '10px 14px', borderTop: '1px solid var(--rule)' }}>
      <div><b>{view === 'day' ? cy.batch.name : fmtDay(x.date)}</b><div className="muted" style={{ fontSize: 12 }}>{x.planClass ? `Logged as class ${x.planClass}` : 'Not in the plan'}</div></div>
      <div>{x.status === 'no-class' ? <span className="tag tag--blue">No class</span> : <span className="tag tag--pencil">Class logged on a day with no planned class{x.missing?.length ? ` · missing ${x.missing.join(', ')}` : ''}</span>}</div>
    </div>
  )

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 className="page-title" data-tour="board-title">All class plans</h1>
          <p className="muted" style={{ marginTop: 4 }}>Every batch's plan for this cycle, day by day. Past classes show whether the daily log was saved properly.</p>
        </div>
        <span data-tour="board-help"><PageHelp page="board" role={user?.role} /></span>
      </div>

      {msg && <div className={`banner ${msg.type === 'error' ? 'banner--error' : 'banner--success'}`} style={{ marginTop: 12 }}>{msg.text}</div>}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', margin: '16px 0' }} data-tour="board-controls">
        <select className="ctl" style={{ width: 'auto', maxWidth: '100%' }} value={data.period || ''} onChange={e => load(e.target.value)}>
          {data.periods.map(p => <option key={p.key} value={p.key}>{periodLabel(p)}</option>)}
        </select>
        <div style={{ display: 'inline-flex', border: '1px solid var(--rule-strong)', borderRadius: 6, overflow: 'hidden' }}>
          {[['day', 'Day by day'], ['batch', 'By batch']].map(([k, l]) => (
            <button key={k} className={`btn btn--sm ${view === k ? 'btn--primary' : 'btn--secondary'}`} style={{ borderRadius: 0, border: 'none' }} onClick={() => { setView(k); setEditing(null) }}>{l}</button>
          ))}
        </div>
        {!data.isAdmin && <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center', fontSize: 14 }}>
          <input type="checkbox" checked={!!mineOnly} onChange={e => setMineOnly(e.target.checked)} /> Only my batches</label>}
      </div>

      <div data-tour="board-lock">
        {data.isAdmin ? (
          <div className={`banner ${anyOpen ? 'banner--pencil' : ''}`} style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', background: anyOpen ? undefined : 'var(--page)', borderColor: 'var(--rule)' }}>
            <span style={{ flex: 1, minWidth: 220 }}>{anyOpen
              ? <><b>Trainers can edit</b> {cycles.filter(c => c.planOpen).length === cycles.length ? 'every plan below' : `${cycles.filter(c => c.planOpen).length} plan(s)`}. Lock again when planning is done.</>
              : <><b>Plans are locked.</b> Only you can edit. Open editing for trainers during a planning meeting.</>}</span>
            {anyOpen
              ? <button className="btn btn--primary btn--sm" onClick={() => setOpen(false)}>Lock all plans</button>
              : <button className="btn btn--secondary btn--sm" onClick={() => setOpen(true)}>Let trainers edit (this period)</button>}
          </div>
        ) : (
          <div className="banner" style={{ background: 'var(--page)', borderColor: 'var(--rule)' }}>
            {cycles.some(c => c.canEdit)
              ? <>Editing is <b>open</b> for {cycles.filter(c => c.canEdit).map(c => c.batch.name).join(', ')}. Every change is recorded with your name.</>
              : <>Plans are <b>locked</b>. To change a plan (class moved, topic changed) tell the admin — editing is opened during planning meetings.</>}
          </div>
        )}
      </div>

      {view === 'day' ? (
        <div style={{ display: 'grid', gap: 14 }} data-tour="board-days">
          {days.length === 0 && <div className="sheet" style={{ padding: 20 }}><p className="muted">No classes planned for this period yet.</p></div>}
          {days.map(d => (
            <div key={d || 'none'} className="sheet" style={{ overflow: 'hidden', ...(d === t ? { borderColor: 'var(--blue-ink)', borderWidth: 2 } : {}) }}>
              <div style={{ padding: '10px 14px', background: d === t ? 'var(--blue-wash)' : 'var(--page)', fontWeight: 700, display: 'flex', justifyContent: 'space-between' }}>
                <span>{fmtDay(d)}{d === t ? ' · Today' : ''}
                  {holOn(d).map((h, i) => <span key={i} className="tag tag--pencil" style={{ marginLeft: 8 }}>Holiday: {h.title}{h.batches.length ? ` (${h.batches.join(', ')})` : ''}</span>)}</span>
                <span className="muted" style={{ fontWeight: 400, fontSize: 13 }}>{byDay.get(d).filter(x => x.c).length} class{byDay.get(d).filter(x => x.c).length === 1 ? '' : 'es'}</span>
              </div>
              {byDay.get(d).sort((a, b) => a.cy.batch.name.localeCompare(b.cy.batch.name)).map(x => x.c ? row(x.cy, x.c) : extraRow(x.cy, x.extra))}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 14 }}>
          {cycles.map(cy => (
            <div key={cy.cycleId} className="sheet" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '10px 14px', background: 'var(--page)', display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <div>
                  <b>{cy.batch.name}</b> <span className="muted" style={{ fontSize: 13 }}>· Cycle {cy.number} · {fmtDay(cy.start)} – {fmtDay(cy.end)} · {cy.trainers.map(x => x.name).join(', ')}</span>
                  {cy.planOpen && <span className="tag tag--pencil" style={{ marginLeft: 8 }}>open for trainers</span>}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {data.isAdmin && <button className="btn btn--quiet btn--sm" onClick={() => setOpen(!cy.planOpen, cy.cycleId)}>{cy.planOpen ? 'Lock' : 'Let trainers edit'}</button>}
                  <Link to={`/cycle/${cy.cycleId}/plan`}><button className="btn btn--quiet btn--sm">Open plan ▸</button></Link>
                </div>
              </div>
              {cy.classes.filter(c => !c.date || c.inCycle).map(c => row(cy, c))}
              {(cy.extraLogs || []).map(x => extraRow(cy, x))}
              {cy.classes.filter(c => !c.date || c.inCycle).length === 0 && <div style={{ padding: '10px 14px' }} className="muted">No classes planned yet.</div>}
              {cy.canEdit && (editing === `${cy.cycleId}:new`
                ? <div style={{ padding: '4px 14px', borderTop: '1px solid var(--rule)' }}>
                    <ClassEditor value={{ number: Math.max(0, ...cy.classes.map(c => c.number)) + 1, title: '', notes: '', date: '', time: '', trainer: '' }}
                      trainers={cy.trainers} saving={saving} onCancel={() => setEditing(null)} onSave={(v) => saveClass(cy, null, v)} />
                  </div>
                : <div style={{ padding: '8px 14px', borderTop: '1px solid var(--rule)' }}><button className="btn btn--quiet btn--sm" onClick={() => setEditing(`${cy.cycleId}:new`)}>+ Add class</button></div>)}
              {cy.changes.length > 0 && (
                <div style={{ padding: '8px 14px', borderTop: '1px solid var(--rule)', fontSize: 13 }}>
                  <span className="muted">Last change: {cy.changes[0].by}, {fmtDT(cy.changes[0].at)} — {cy.changes[0].text}</span>
                  {cy.changes.length > 1 && <button className="btn btn--quiet" style={{ fontSize: 12, marginLeft: 6 }} onClick={() => setShowChanges(o => ({ ...o, [cy.cycleId]: !o[cy.cycleId] }))}>{showChanges[cy.cycleId] ? 'hide history' : 'history'}</button>}
                  {showChanges[cy.cycleId] && <ul style={{ margin: '6px 0 0 18px' }}>{cy.changes.slice(1).map((x, i) => <li key={i} className="muted">{x.by}, {fmtDT(x.at)} — {x.text}</li>)}</ul>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
