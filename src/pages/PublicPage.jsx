import { useState, useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'

/* ────────────────────────────────────────────────────────────────
   Skill Lab — public Hall of Fame ("the Honours Board")

   Self-contained: doesn't use ui.jsx, doesn't look like the internal
   tool. Uses the global --teak / --gold-leaf / --chalk tokens from
   index.css (design-direction.md §3.2) but keeps its own layout rules
   scoped under .board, since a real honours board is a list of rows,
   not a card grid.
   ──────────────────────────────────────────────────────────────── */

const CSS = `
.board {
  background: var(--teak);
  color: var(--chalk);
  font-family: var(--font-ui);
  min-height: 100vh;
  position: relative;
}
/* A very faint wood-grain texture — invisible up close, felt from a distance. */
.board::before {
  content: ''; position: fixed; inset: 0; pointer-events: none; z-index: 0;
  background: repeating-linear-gradient(178deg, rgba(255,255,255,0.015) 0px, rgba(255,255,255,0.015) 1px, transparent 1px, transparent 3px);
}
.board-shell { max-width: 880px; margin: 0 auto; padding: 0 24px 100px; position: relative; z-index: 1; }

.board-top { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 26px 0 0; flex-wrap: wrap; }
.board-mark { font-size: 13px; color: var(--chalk-dim); letter-spacing: 0.01em; }
.board-staff { font-size: 13px; color: var(--chalk-dim); border-bottom: 1px solid transparent; padding-bottom: 1px; transition: color .18s, border-color .18s; }
.board-staff:hover { color: var(--chalk); border-color: var(--grain); }

.board-head { padding: 50px 0 8px; text-align: center; }
.board-title {
  font-family: var(--font-board); font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.06em; font-size: clamp(40px, 7vw, 72px); line-height: 1.05; color: var(--gold-leaf);
}
.board-sub { margin-top: 10px; font-size: 15px; color: var(--gold-dim); font-family: var(--font-data); letter-spacing: 0.02em; }

.board-rule { margin: 30px 0; border: none; border-top: 3px double var(--grain); }

.board-lede { max-width: 60ch; margin: 0 auto 30px; text-align: center; font-size: 16px; line-height: 1.65; color: var(--chalk); font-weight: 400; }

.board-controls { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; justify-content: center; padding: 4px 0 8px; }
.board-field {
  appearance: none; background: var(--teak-2); color: var(--chalk);
  border: 1px solid var(--grain); border-radius: 999px;
  padding: 8px 16px; font-family: var(--font-ui); font-size: 13.5px; outline: none; transition: border-color .18s;
}
.board-field:hover { border-color: var(--gold-dim); }
.board-field:focus-visible { border-color: var(--gold-leaf); box-shadow: 0 0 0 3px rgba(212,175,90,0.18); }
select.board-field { cursor: pointer; padding-right: 30px;
  background-image: linear-gradient(45deg, transparent 50%, var(--chalk-dim) 50%), linear-gradient(135deg, var(--chalk-dim) 50%, transparent 50%);
  background-position: right 15px center, right 10px center; background-size: 5px 5px, 5px 5px; background-repeat: no-repeat; }
select.board-field option { background: var(--teak-2); color: var(--chalk); }
.board-search { min-width: 220px; }
.board-matches { font-size: 13px; color: var(--chalk-dim); width: 100%; text-align: center; }

.board-cycle { margin-top: 54px; }
.board-cycle-head {
  display: flex; align-items: baseline; justify-content: center; gap: 12px; flex-wrap: wrap; text-align: center;
  padding-bottom: 16px; margin-bottom: 20px; border-bottom: 1px solid var(--grain); position: relative;
}
.board-cycle-name { font-family: var(--font-board); font-weight: 700; font-size: 21px; color: var(--chalk); }
.board-cycle-meta { font-size: 13px; color: var(--chalk-dim); font-family: var(--font-data); }
.board-copy {
  background: none; border: none; cursor: pointer; color: var(--chalk-dim); font-size: 12px;
  text-decoration: underline; text-underline-offset: 2px; padding: 2px 4px;
}
.board-copy:hover { color: var(--chalk); }

.board-row {
  display: flex; align-items: center; gap: 18px; padding: 16px 4px;
  border-bottom: 1px solid var(--grain);
}
.board-row:last-child { border-bottom: none; }
.board-rank { font-family: var(--font-board); color: var(--gold-dim); font-weight: 700; flex-shrink: 0; text-align: right; }
.board-row--1 .board-rank { font-size: 40px; width: 56px; }
.board-row--rest .board-rank { font-size: 22px; width: 40px; }

.board-photo { border-radius: 4px; overflow: hidden; flex-shrink: 0; border: 1px solid var(--grain); background: var(--teak-2); }
.board-row--1 .board-photo { width: 72px; height: 72px; }
.board-row--rest .board-photo { width: 52px; height: 52px; }
.board-photo img { width: 100%; height: 100%; object-fit: cover; display: block; }

.board-body { min-width: 0; flex: 1; }
.board-name { font-family: var(--font-board); color: var(--gold-leaf); letter-spacing: 0.01em; }
.board-row--1 .board-name { font-size: clamp(26px, 4vw, 40px); text-transform: uppercase; }
.board-row--rest .board-name { font-size: 20px; text-transform: none; }
.board-roll { font-family: var(--font-data); font-size: 12.5px; color: var(--chalk-dim); margin-top: 3px; }
.board-repo {
  display: inline-block; margin-top: 6px; max-width: 100%; font-family: var(--font-data); font-size: 12.5px;
  color: var(--chalk-dim); border-bottom: 1px solid transparent; overflow: hidden; text-overflow: ellipsis;
  white-space: nowrap; transition: color .18s, border-color .18s;
}
.board-repo:hover { color: var(--chalk); border-color: var(--chalk-dim); }

.board-empty { padding: 70px 0; max-width: 50ch; margin: 0 auto; text-align: center; }
.board-empty h2 { font-family: var(--font-board); font-weight: 700; font-size: 23px; margin-bottom: 10px; color: var(--chalk); }
.board-empty p { font-size: 15px; line-height: 1.6; color: var(--chalk-dim); }

.board-skel { border-radius: 4px; background: var(--teak-2); position: relative; overflow: hidden; }
.board-skel::after {
  content: ''; position: absolute; inset: 0; transform: translateX(-100%);
  background: linear-gradient(90deg, transparent, rgba(212,175,90,0.06), transparent);
  animation: board-shimmer 1.6s infinite;
}
@keyframes board-shimmer { 100% { transform: translateX(100%); } }
.board-waking { margin-top: 18px; font-size: 13.5px; color: var(--chalk-dim); line-height: 1.6; text-align: center; }

.board-fade { opacity: 0; animation: board-in .5s cubic-bezier(.22,.61,.36,1) forwards; }
.board-fade:nth-of-type(2) { animation-delay: .08s; }
.board-fade:nth-of-type(3) { animation-delay: .16s; }
@keyframes board-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }

.board a:focus-visible, .board button:focus-visible { outline: 2px solid var(--gold-leaf); outline-offset: 3px; border-radius: 4px; }

.board-foot { margin-top: 90px; padding-top: 22px; border-top: 1px solid var(--grain); display: flex; justify-content: space-between; gap: 14px; flex-wrap: wrap; font-size: 13px; color: var(--chalk-dim); }

@media (max-width: 620px) {
  .board-shell { padding: 0 18px 80px; }
  .board-row { flex-direction: column; align-items: flex-start; text-align: left; gap: 10px; }
  .board-row--1 { align-items: center; text-align: center; }
  .board-row--1 .board-body { text-align: center; }
  .board-search { min-width: 0; width: 100%; }
}
@media (prefers-reduced-motion: reduce) {
  .board-fade { opacity: 1; animation: none; }
  .board-skel::after { animation: none; }
}
`

/* ── helpers ──────────────────────────────────────────────── */

function dateRange(a, b) {
  if (!a || !b) return ''
  const A = new Date(a), B = new Date(b)
  const mon = (d) => d.toLocaleDateString('en-GB', { month: 'short' })
  if (A.getFullYear() === B.getFullYear()) {
    if (mon(A) === mon(B)) return `${A.getDate()}–${B.getDate()} ${mon(B)} ${B.getFullYear()}`
    return `${A.getDate()} ${mon(A)} – ${B.getDate()} ${mon(B)} ${B.getFullYear()}`
  }
  return `${A.getDate()} ${mon(A)} ${A.getFullYear()} – ${B.getDate()} ${mon(B)} ${B.getFullYear()}`
}

function repoLabel(url = '') {
  try {
    const u = new URL(url)
    const path = u.pathname.replace(/^\/+|\/+$/g, '')
    return path ? `${u.hostname.replace(/^www\./, '')}/${path}` : u.hostname
  } catch {
    return url.replace(/^https?:\/\//, '')
  }
}

function slugify(s = '') { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'cycle' }

function Row({ student, lead }) {
  return (
    <div className={`board-row ${lead ? 'board-row--1' : 'board-row--rest'}${lead ? ' board-fade' : ''}`}>
      <span className="board-rank">{student.rank}</span>
      {student.photo && (
        <div className="board-photo">
          <img src={student.photo} alt="" loading={lead ? 'eager' : 'lazy'} decoding="async" />
        </div>
      )}
      <div className="board-body">
        <div className="board-name">{student.name || 'Unnamed'}</div>
        {student.roll && <div className="board-roll">{student.roll}</div>}
        {student.github && (
          <a className="board-repo" href={student.github} target="_blank" rel="noreferrer noopener">{repoLabel(student.github)}</a>
        )}
      </div>
    </div>
  )
}

function CyclePanel({ cycle }) {
  const anchor = `${slugify(cycle.batch?.track || cycle.batch?.name)}-cycle-${cycle.number}`
  const label = cycle.name ? `${cycle.name}, cycle ${cycle.number}` : `Cycle ${cycle.number}`
  const [copied, setCopied] = useState(false)

  function copyLink() {
    const url = `${window.location.origin}${window.location.pathname}#${anchor}`
    navigator.clipboard?.writeText(url)
    setCopied(true); setTimeout(() => setCopied(false), 1800)
  }

  return (
    <section className="board-cycle" id={anchor}>
      <header className="board-cycle-head">
        <span className="board-cycle-name">{cycle.batch?.name || 'Skill Lab'}{cycle.batch?.track ? ` · ${cycle.batch.track}` : ''}</span>
        <span className="board-cycle-meta">{label}, {dateRange(cycle.startDate, cycle.endDate)}</span>
        <button className="board-copy" onClick={copyLink}>{copied ? 'Link copied' : 'Copy link'}</button>
      </header>
      <div>
        {cycle.top3.map(s => <Row key={s.rank} student={s} lead={s.rank === 1} />)}
      </div>
    </section>
  )
}

function Skeleton() {
  return (
    <div className="board-cycle" aria-hidden="true">
      <div className="board-skel" style={{ height: 18, width: 240, margin: '0 auto 30px' }} />
      <div className="board-skel" style={{ height: 90, marginBottom: 10 }} />
      <div className="board-skel" style={{ height: 90, marginBottom: 10 }} />
      <div className="board-skel" style={{ height: 90 }} />
    </div>
  )
}

/* ── page ─────────────────────────────────────────────────── */

export default function PublicPage() {
  const [semesters, setSemesters] = useState([])
  const [semId, setSemId]         = useState('')
  const [cycles, setCycles]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [slow, setSlow]           = useState(false)
  const [failed, setFailed]       = useState(false)
  const [track, setTrack]         = useState('all')
  const [query, setQuery]         = useState('')
  const slowTimer = useRef(null)

  useEffect(() => {
    api.get('/semesters')
      .then(({ data }) => {
        setSemesters(data.semesters || [])
        const active = (data.semesters || []).find(s => s.status === 'active') || (data.semesters || [])[0]
        if (active) setSemId(active._id)
        else setLoading(false)
      })
      .catch(() => { setFailed(true); setLoading(false) })
  }, [])

  useEffect(() => {
    if (!semId) return
    let cancelled = false
    setLoading(true); setFailed(false); setSlow(false)
    slowTimer.current = setTimeout(() => !cancelled && setSlow(true), 4000)

    api.get('/cycles/halloffame', { params: { semester: semId } })
      .then(({ data }) => { if (!cancelled) setCycles(data.cycles || []) })
      .catch(() => { if (!cancelled) setFailed(true) })
      .finally(() => {
        if (cancelled) return
        clearTimeout(slowTimer.current); setSlow(false); setLoading(false)
      })

    return () => { cancelled = true; clearTimeout(slowTimer.current) }
  }, [semId])

  const tracks = useMemo(() => {
    const set = new Set()
    cycles.forEach(c => { if (c.batch?.track) set.add(c.batch.track) })
    return [...set].sort()
  }, [cycles])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return cycles
      .filter(c => track === 'all' || c.batch?.track === track)
      .map(c => ({
        ...c,
        top3: [...(c.top3 || [])]
          .filter(t => !q || (t.name || '').toLowerCase().includes(q) || (t.roll || '').toLowerCase().includes(q))
          .sort((a, b) => a.rank - b.rank),
      }))
      .filter(c => c.top3.length)
  }, [cycles, track, query])

  const namedCount = useMemo(() => filtered.reduce((n, c) => n + c.top3.length, 0), [filtered])
  const searching = query.trim().length > 0
  const activeSem = semesters.find(s => s._id === semId)

  return (
    <div className="board">
      <style>{CSS}</style>
      <div className="board-shell">

        <div className="board-top">
          <div className="board-mark">SHEAT College of Engineering</div>
          <Link to="/login" className="board-staff">Staff login</Link>
        </div>

        <header className="board-head">
          <h1 className="board-title">Hall of Fame</h1>
          {activeSem && <p className="board-sub">Skill Lab, {activeSem.name}</p>}
        </header>

        <hr className="board-rule" />

        <p className="board-lede">
          Every cycle ends in a project. In each track, three students build the best of it.
          Their names go on this board.
        </p>

        <div className="board-controls">
          {semesters.length > 0 && (
            <select className="board-field" value={semId} onChange={e => setSemId(e.target.value)} aria-label="Semester">
              {semesters.map(s => <option key={s._id} value={s._id}>{s.name}{s.status === 'active' ? ' (current)' : ''}</option>)}
            </select>
          )}
          {tracks.length > 1 && (
            <select className="board-field" value={track} onChange={e => setTrack(e.target.value)} aria-label="Track">
              <option value="all">All tracks</option>
              {tracks.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          )}
          <input className="board-field board-search" value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Find a name or roll number" aria-label="Search students" />
          {searching && !loading && (
            <span className="board-matches">{namedCount === 0 ? 'No matches' : `${namedCount} ${namedCount === 1 ? 'match' : 'matches'} across ${filtered.length} ${filtered.length === 1 ? 'cycle' : 'cycles'}`}</span>
          )}
        </div>

        {loading && (
          <>
            <Skeleton />
            {slow && <p className="board-waking">Waking the server. The free hosting plan sleeps when it is idle, so the first visit of the day can take up to a minute.</p>}
          </>
        )}

        {!loading && failed && (
          <div className="board-empty">
            <h2>The results could not be loaded</h2>
            <p>The server did not respond. Reload the page in a moment — if it keeps failing, the backend may be down.</p>
          </div>
        )}

        {!loading && !failed && filtered.length === 0 && (
          <div className="board-empty">
            {searching ? (
              <>
                <h2>No student matches "{query.trim()}"</h2>
                <p>Try a partial name, or clear the search to see every cycle in this semester.</p>
              </>
            ) : (
              <>
                <h2>No results published yet</h2>
                <p>Students appear here as soon as a trainer closes a cycle and submits its top three.</p>
              </>
            )}
          </div>
        )}

        {!loading && !failed && filtered.map(c => <CyclePanel key={c._id} cycle={c} />)}

        <footer className="board-foot">
          <span>SHEAT College of Engineering, Varanasi</span>
          <span>Skill Lab — practical training, measured</span>
        </footer>

      </div>
    </div>
  )
}
