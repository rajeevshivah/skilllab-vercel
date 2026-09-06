import { useState, useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'

/* ────────────────────────────────────────────────────────────────
   Skill Lab — public Hall of Fame

   Self-contained: this page does not use components/ui.jsx, because
   the public page should not look like the internal tool. All styles
   live in the <style> block below, scoped under .hof, so we get media
   queries, :focus-visible and reduced-motion — none of which inline
   styles can do.
   ──────────────────────────────────────────────────────────────── */

const CSS = `
.hof {
  --ink:      #0A1628;
  --ink-2:    #0E1E36;
  --ink-3:    #132743;
  --line:     rgba(255,255,255,0.10);
  --line-2:   rgba(255,255,255,0.18);
  --gold:     #F59E0B;
  --gold-lit: #FCD34D;
  --paper:    #F1F5F9;
  --quiet:    rgba(226,232,240,0.62);
  --quieter:  rgba(226,232,240,0.42);
  --display:  'Playfair Display', Georgia, serif;
  --body:     'DM Sans', system-ui, sans-serif;
  --mono:     'DM Mono', ui-monospace, monospace;

  background: var(--ink);
  color: var(--paper);
  font-family: var(--body);
  min-height: 100vh;
}
.hof-shell { max-width: 1080px; margin: 0 auto; padding: 0 24px 96px; }

/* ── masthead ─────────────────────────────────────────────── */
.hof-top {
  display: flex; align-items: center; justify-content: space-between;
  gap: 16px; padding: 26px 0 0; flex-wrap: wrap;
}
.hof-mark {
  font-family: var(--display); font-weight: 700; font-size: 15px;
  letter-spacing: 0.01em; color: var(--paper);
}
.hof-mark span { color: var(--gold); }
.hof-staff {
  font-size: 13px; color: var(--quieter); border-bottom: 1px solid transparent;
  padding-bottom: 1px; transition: color .18s, border-color .18s;
}
.hof-staff:hover { color: var(--quiet); border-color: var(--line-2); }

.hof-head { padding: 56px 0 40px; max-width: 40ch; }
.hof-title {
  font-family: var(--display); font-weight: 900;
  font-size: clamp(42px, 8vw, 76px); line-height: 0.98;
  letter-spacing: -0.02em; margin-bottom: 18px;
}
.hof-lede { font-size: 16px; line-height: 1.62; color: var(--quiet); font-weight: 300; }
.hof-count {
  margin-top: 20px; font-family: var(--mono); font-size: 12.5px;
  color: var(--gold); letter-spacing: 0.01em;
}

/* ── controls ─────────────────────────────────────────────── */
.hof-controls {
  display: flex; gap: 10px; flex-wrap: wrap; align-items: center;
  padding: 18px 0 8px; border-top: 1px solid var(--line);
}
.hof-field {
  appearance: none; background: var(--ink-2); color: var(--paper);
  border: 1px solid var(--line); border-radius: 999px;
  padding: 9px 16px; font-family: var(--body); font-size: 13.5px;
  outline: none; transition: border-color .18s, background .18s;
}
.hof-field:hover { border-color: var(--line-2); }
.hof-field:focus-visible { border-color: var(--gold); box-shadow: 0 0 0 3px rgba(245,158,11,0.2); }
select.hof-field { padding-right: 34px; cursor: pointer;
  background-image: linear-gradient(45deg, transparent 50%, var(--quiet) 50%),
                    linear-gradient(135deg, var(--quiet) 50%, transparent 50%);
  background-position: right 16px center, right 11px center;
  background-size: 5px 5px, 5px 5px; background-repeat: no-repeat; }
select.hof-field option { background: var(--ink-3); color: var(--paper); }
.hof-search { min-width: 210px; flex: 1 1 210px; max-width: 300px; }
.hof-matches { font-size: 13px; color: var(--quieter); }

/* ── cycle heading ────────────────────────────────────────── */
.hof-cycle { margin-top: 46px; }
.hof-cycle-head {
  display: flex; align-items: baseline; gap: 14px; flex-wrap: wrap;
  padding-bottom: 14px; margin-bottom: 22px; border-bottom: 1px solid var(--line);
}
.hof-cycle-name { font-family: var(--display); font-weight: 700; font-size: 23px; letter-spacing: -0.01em; }
.hof-cycle-meta { font-size: 13px; color: var(--quieter); }
.hof-cycle-track {
  font-family: var(--mono); font-size: 11.5px; color: var(--gold);
  border: 1px solid rgba(245,158,11,0.32); border-radius: 999px; padding: 3px 10px;
}

/* ── the feature (latest cycle) ───────────────────────────── */
.hof-feature { display: grid; grid-template-columns: 1.45fr 1fr; gap: 16px; align-items: stretch; }
.hof-feature.is-solo { grid-template-columns: 1fr; max-width: 620px; }
.hof-minors { display: grid; gap: 16px; align-content: stretch; }

.hof-card {
  position: relative; background: var(--ink-2); border: 1px solid var(--line);
  border-radius: 20px; overflow: hidden;
}
.hof-card--lead {
  border-color: rgba(245,158,11,0.34);
  background:
    radial-gradient(120% 90% at 0% 0%, rgba(245,158,11,0.10), transparent 62%),
    var(--ink-2);
  display: flex; flex-direction: column; justify-content: flex-end;
  min-height: 380px; padding: 30px;
}
.hof-card--minor { display: flex; align-items: center; gap: 16px; padding: 18px 20px; min-height: 118px; }

/* rank as a typographic mark, not an emoji */
.hof-rank {
  position: absolute; top: 14px; right: 22px;
  font-family: var(--display); font-weight: 900; line-height: 1;
  pointer-events: none; user-select: none;
}
.hof-card--lead .hof-rank { font-size: 96px; color: rgba(245,158,11,0.20); }
.hof-card--minor .hof-rank { font-size: 46px; color: rgba(255,255,255,0.07); top: 10px; right: 16px; }

/* ── portraits ────────────────────────────────────────────── */
.hof-portrait {
  border-radius: 16px; overflow: hidden; flex-shrink: 0;
  background: var(--ink-3); display: flex; align-items: center; justify-content: center;
}
.hof-portrait img { width: 100%; height: 100%; object-fit: cover; display: block; }
.hof-portrait--lead { width: 150px; height: 150px; margin-bottom: 24px; border-radius: 20px; }
.hof-portrait--minor { width: 74px; height: 74px; border-radius: 14px; }
.hof-initials { font-family: var(--display); font-weight: 700; color: rgba(255,255,255,0.55); }
.hof-portrait--lead .hof-initials { font-size: 46px; }
.hof-portrait--minor .hof-initials { font-size: 24px; }

/* ── names & repos ────────────────────────────────────────── */
.hof-name { font-family: var(--display); font-weight: 700; letter-spacing: -0.01em; }
.hof-card--lead .hof-name { font-size: 34px; line-height: 1.1; margin-bottom: 8px; }
.hof-card--minor .hof-name { font-size: 17px; line-height: 1.2; margin-bottom: 4px; }
.hof-roll { font-family: var(--mono); font-size: 12.5px; color: var(--quieter); }
.hof-body { min-width: 0; }

.hof-repo {
  display: inline-block; margin-top: 16px; max-width: 100%;
  font-family: var(--mono); font-size: 12.5px; color: var(--gold-lit);
  border-bottom: 1px solid rgba(252,211,77,0.30); padding-bottom: 2px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  transition: color .18s, border-color .18s;
}
.hof-repo:hover { color: #fff; border-color: rgba(255,255,255,0.6); }
.hof-card--minor .hof-repo { margin-top: 7px; font-size: 11.5px; }

/* ── earlier cycles ───────────────────────────────────────── */
.hof-past { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.hof-past .hof-card { display: flex; align-items: center; gap: 14px; padding: 16px 18px; }

/* ── states ───────────────────────────────────────────────── */
.hof-empty { padding: 72px 0; max-width: 46ch; }
.hof-empty h2 { font-family: var(--display); font-weight: 700; font-size: 24px; margin-bottom: 10px; }
.hof-empty p { font-size: 15px; line-height: 1.6; color: var(--quiet); font-weight: 300; }

.hof-skel { border-radius: 20px; background: var(--ink-2); border: 1px solid var(--line); position: relative; overflow: hidden; }
.hof-skel::after {
  content: ''; position: absolute; inset: 0; transform: translateX(-100%);
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.045), transparent);
  animation: hof-shimmer 1.5s infinite;
}
@keyframes hof-shimmer { 100% { transform: translateX(100%); } }
.hof-waking { margin-top: 18px; font-size: 13.5px; color: var(--quieter); line-height: 1.6; }

/* ── footer ───────────────────────────────────────────────── */
.hof-foot {
  margin-top: 80px; padding-top: 22px; border-top: 1px solid var(--line);
  display: flex; justify-content: space-between; gap: 14px; flex-wrap: wrap;
  font-size: 13px; color: var(--quieter);
}

/* ── one orchestrated entrance, feature only ──────────────── */
.hof-enter { opacity: 0; animation: hof-rise .5s cubic-bezier(.22,.61,.36,1) forwards; }
.hof-enter:nth-child(2) { animation-delay: .08s; }
@keyframes hof-rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }

.hof a:focus-visible, .hof button:focus-visible {
  outline: 2px solid var(--gold); outline-offset: 3px; border-radius: 6px;
}

@media (max-width: 900px) {
  .hof-feature, .hof-feature.is-solo { grid-template-columns: 1fr; }
  .hof-past { grid-template-columns: 1fr; }
  .hof-card--lead { min-height: 0; padding: 26px; }
  .hof-portrait--lead { width: 118px; height: 118px; margin-bottom: 20px; }
  .hof-card--lead .hof-name { font-size: 28px; }
  .hof-card--lead .hof-rank { font-size: 72px; }
}
@media (max-width: 620px) {
  .hof-shell { padding: 0 18px 72px; }
  .hof-head { padding: 40px 0 30px; }
  .hof-search { max-width: none; }
}
@media (prefers-reduced-motion: reduce) {
  .hof-enter { opacity: 1; animation: none; }
  .hof-skel::after { animation: none; }
}
`

/* ── helpers ──────────────────────────────────────────────── */

function initialsOf(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '—'
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

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

// Show the real repo path — more useful than a generic "GitHub" link.
function repoLabel(url = '') {
  try {
    const u = new URL(url)
    const path = u.pathname.replace(/^\/+|\/+$/g, '')
    return path ? `${u.hostname.replace(/^www\./, '')}/${path}` : u.hostname
  } catch {
    return url.replace(/^https?:\/\//, '')
  }
}

function Portrait({ student, size }) {
  const cls = size === 'lead' ? 'hof-portrait hof-portrait--lead' : 'hof-portrait hof-portrait--minor'
  if (student.photo) {
    return (
      <div className={cls}>
        <img
          src={student.photo}
          alt={student.name ? `${student.name}` : 'Student portrait'}
          loading={size === 'lead' ? 'eager' : 'lazy'}
          decoding="async"
        />
      </div>
    )
  }
  return (
    <div className={cls} aria-hidden="true">
      <span className="hof-initials">{initialsOf(student.name)}</span>
    </div>
  )
}

function Repo({ url }) {
  if (!url) return null
  return (
    <a className="hof-repo" href={url} target="_blank" rel="noreferrer noopener">
      {repoLabel(url)}
    </a>
  )
}

function LeadCard({ student }) {
  return (
    <article className="hof-card hof-card--lead hof-enter">
      <span className="hof-rank">{student.rank}</span>
      <Portrait student={student} size="lead" />
      <div className="hof-body">
        <h3 className="hof-name">{student.name || 'Unnamed'}</h3>
        {student.roll && <div className="hof-roll">{student.roll}</div>}
        <Repo url={student.github} />
      </div>
    </article>
  )
}

function MinorCard({ student, enter }) {
  return (
    <article className={`hof-card hof-card--minor${enter ? ' hof-enter' : ''}`}>
      <span className="hof-rank">{student.rank}</span>
      <Portrait student={student} size="minor" />
      <div className="hof-body">
        <h3 className="hof-name">{student.name || 'Unnamed'}</h3>
        {student.roll && <div className="hof-roll">{student.roll}</div>}
        <Repo url={student.github} />
      </div>
    </article>
  )
}

function CycleHeading({ cycle }) {
  const label = cycle.name
    ? `${cycle.name}, cycle ${cycle.number}`
    : `Cycle ${cycle.number}`
  return (
    <header className="hof-cycle-head">
      <h2 className="hof-cycle-name">{cycle.batch?.name || 'Skill Lab'}</h2>
      {cycle.batch?.track && <span className="hof-cycle-track">{cycle.batch.track}</span>}
      <span className="hof-cycle-meta">{label}, {dateRange(cycle.startDate, cycle.endDate)}</span>
    </header>
  )
}

function Skeleton() {
  return (
    <div className="hof-cycle" aria-hidden="true">
      <div className="hof-skel" style={{ height: 22, width: 260, marginBottom: 26, borderRadius: 8 }} />
      <div className="hof-feature">
        <div className="hof-skel" style={{ minHeight: 380 }} />
        <div className="hof-minors">
          <div className="hof-skel" style={{ minHeight: 118 }} />
          <div className="hof-skel" style={{ minHeight: 118 }} />
        </div>
      </div>
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
    // Render's free tier sleeps. Say so instead of showing a dead spinner.
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

  const namedCount = useMemo(
    () => filtered.reduce((n, c) => n + c.top3.length, 0),
    [filtered]
  )

  const [latest, ...earlier] = filtered
  const searching = query.trim().length > 0

  return (
    <div className="hof">
      <style>{CSS}</style>
      <div className="hof-shell">

        <div className="hof-top">
          <div className="hof-mark">SHEAT College <span>Skill Lab</span></div>
          <Link to="/login" className="hof-staff">Staff login</Link>
        </div>

        <header className="hof-head">
          <h1 className="hof-title">Hall of Fame</h1>
          <p className="hof-lede">
            Skill Lab runs in cycles of two to three weeks. Every cycle ends in a project,
            and three students in each track ship the best of it. This is the record.
          </p>
          {!loading && !failed && namedCount > 0 && (
            <p className="hof-count">
              {namedCount} {namedCount === 1 ? 'student' : 'students'} named across{' '}
              {filtered.length} {filtered.length === 1 ? 'cycle' : 'cycles'}
            </p>
          )}
        </header>

        <div className="hof-controls">
          {semesters.length > 0 && (
            <select
              className="hof-field"
              value={semId}
              onChange={e => setSemId(e.target.value)}
              aria-label="Semester"
            >
              {semesters.map(s => (
                <option key={s._id} value={s._id}>
                  {s.name}{s.status === 'active' ? ' (current)' : ''}
                </option>
              ))}
            </select>
          )}

          {tracks.length > 1 && (
            <select
              className="hof-field"
              value={track}
              onChange={e => setTrack(e.target.value)}
              aria-label="Track"
            >
              <option value="all">All tracks</option>
              {tracks.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          )}

          <input
            className="hof-field hof-search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Find a name or roll number"
            aria-label="Search students"
          />

          {searching && !loading && (
            <span className="hof-matches">
              {namedCount === 0
                ? 'No matches'
                : `${namedCount} ${namedCount === 1 ? 'match' : 'matches'}`}
            </span>
          )}
        </div>

        {loading && (
          <>
            <Skeleton />
            {slow && (
              <p className="hof-waking">
                Waking the server. The free hosting plan sleeps when it is idle, so the
                first visit of the day can take up to a minute.
              </p>
            )}
          </>
        )}

        {!loading && failed && (
          <div className="hof-empty">
            <h2>The results could not be loaded</h2>
            <p>The server did not respond. Reload the page in a moment — if it keeps
              failing, the backend may be down.</p>
          </div>
        )}

        {!loading && !failed && filtered.length === 0 && (
          <div className="hof-empty">
            {searching ? (
              <>
                <h2>No student matches “{query.trim()}”</h2>
                <p>Try a partial name, or clear the search to see every cycle in this semester.</p>
              </>
            ) : (
              <>
                <h2>No results published yet</h2>
                <p>Students appear here as soon as a trainer closes a cycle and submits
                  its top three.</p>
              </>
            )}
          </div>
        )}

        {!loading && !failed && latest && (
          <section className="hof-cycle">
            <CycleHeading cycle={latest} />
            <div className={`hof-feature${latest.top3.length < 2 ? ' is-solo' : ''}`}>
              <LeadCard student={latest.top3[0]} />
              {latest.top3.length > 1 && (
                <div className="hof-minors">
                  {latest.top3.slice(1).map(s => (
                    <MinorCard key={s.rank} student={s} enter />
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {!loading && !failed && earlier.map(c => (
          <section className="hof-cycle" key={c._id}>
            <CycleHeading cycle={c} />
            <div className="hof-past">
              {c.top3.map(s => <MinorCard key={s.rank} student={s} />)}
            </div>
          </section>
        ))}

        <footer className="hof-foot">
          <span>SHEAT College of Engineering, Varanasi</span>
          <span>Skill Lab — practical training, measured</span>
        </footer>

      </div>
    </div>
  )
}
