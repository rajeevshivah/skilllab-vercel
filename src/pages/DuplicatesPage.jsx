import { useState, useEffect } from 'react'
import api from '../api'
import { useAuth } from '../context/AuthContext'
import { useSemester } from '../context/SemesterContext'
import { ui, Alert, Empty } from '../components/ui'

// A roll number that appears more than once:
//  • twice in ONE batch = the same student added twice → merge into one record
//    (marks, attendance, check-ins, sign-in… all move to the kept record)
//  • in TWO batches = the same student in two tracks → keep one batch
export default function DuplicatesPage() {
  const { user } = useAuth()
  const { semesters, selected, setSelected } = useSemester()
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [alert, setAlert] = useState(null)
  const show = (msg, type = 'success') => { setAlert({ msg, type }); setTimeout(() => setAlert(null), 4000) }
  const fail = (e) => show(e.response?.data?.message || 'Failed', 'error')

  useEffect(() => { if (selected) load() }, [selected])
  async function load() {
    setLoading(true)
    try { const { data } = await api.get('/students/duplicates', { params: { semester: selected._id } }); setGroups(data.groups) }
    catch (e) { fail(e) } finally { setLoading(false) }
  }

  async function mergeInto(group, keep) {
    const others = group.entries.filter(e => e.studentId !== keep.studentId)
    if (!confirm(`Keep "${keep.name}" and merge ${others.map(o => `"${o.name}"`).join(', ')} into it?\n\nTheir marks, attendance and sign-in move to the kept record; the duplicate is removed. This cannot be undone.`)) return
    setBusy(true)
    try {
      for (const o of others) await api.post(`/students/${o.studentId}/merge`, { into: keep.studentId })
      show(`Merged — roll ${group.roll} is now one record.`); load()
    } catch (e) { fail(e) } finally { setBusy(false) }
  }
  async function mergeAllSameName() {
    const easy = groups.filter(g => g.sameBatch && new Set(g.entries.map(e => e.name.trim().toLowerCase())).size === 1)
    if (!easy.length) return
    if (!confirm(`Merge ${easy.length} duplicate(s) where the roll AND the name are the same? The first-added record is kept for each. This cannot be undone.`)) return
    setBusy(true)
    try {
      for (const g of easy) {
        const [keep, ...rest] = g.entries
        for (const o of rest) await api.post(`/students/${o.studentId}/merge`, { into: keep.studentId })
      }
      show(`Merged ${easy.length} duplicate(s).`); load()
    } catch (e) { fail(e); load() } finally { setBusy(false) }
  }
  async function keepBatch(group, keep) {
    if (!confirm(`Keep ${keep.name} in ${keep.batchName} and remove them from the other batch(es)?`)) return
    setBusy(true)
    try {
      for (const e of group.entries.filter(x => x.studentId !== keep.studentId)) await api.delete(`/students/${e.studentId}`)
      show('Resolved — student now in one batch.'); load()
    } catch (e) { fail(e) } finally { setBusy(false) }
  }

  if (user?.role !== 'superadmin') return <div style={{ ...ui.wrap, color: 'var(--muted)' }}>Admin only.</div>
  const same = groups.filter(g => g.sameBatch), cross = groups.filter(g => !g.sameBatch)
  const easyCount = same.filter(g => new Set(g.entries.map(e => e.name.trim().toLowerCase())).size === 1).length

  const entryLine = (e) => (
    <div>
      <span style={{ fontWeight: 600 }}>{e.name}</span>
      <span style={{ ...ui.sub, marginLeft: 8 }}>
        {[e.course, e.sem && `sem ${e.sem}`, e.section && `sec ${e.section}`].filter(Boolean).join(' · ')}
        {` · present ${e.present} · ${e.marks} mark(s)`}{e.signedUp ? ' · signed up' : ''}
      </span>
    </div>
  )

  return (
    <div style={ui.wrap}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12, marginBottom: 8 }}>
        <div>
          <h1 style={ui.h1}>Duplicate Students</h1>
          <p style={ui.sub}>Roll numbers that appear more than once this semester.</p>
        </div>
        <select style={{ ...ui.input, width: 'auto' }} value={selected?._id || ''}
          onChange={e => setSelected(semesters.find(s => s._id === e.target.value))}>
          {semesters.map(s => <option key={s._id} value={s._id}>{s.name}{s.status === 'active' ? ' (active)' : ''}</option>)}
        </select>
      </div>
      <div style={{ height: 16 }} />
      <Alert alert={alert} />

      {loading ? <div style={{ color: 'var(--muted)' }}>Loading…</div>
        : groups.length === 0 ? <Empty icon="✅" title="No duplicates" hint="Every roll number appears once this semester." />
        : (
          <div style={{ display: 'grid', gap: 22 }}>
            {same.length > 0 && (
              <section>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
                  <div>
                    <h2 style={{ ...ui.h2, marginBottom: 2 }}>Added twice to the same batch ({same.length})</h2>
                    <p style={ui.sub}>Same student, two records. Pick the record with the correct name — the other is merged into it.</p>
                  </div>
                  {easyCount > 0 && <button style={ui.btnGold} disabled={busy} onClick={mergeAllSameName}>Merge all {easyCount} with identical names</button>}
                </div>
                <div style={{ display: 'grid', gap: 12 }}>
                  {same.map(g => {
                    const differ = new Set(g.entries.map(e => e.name.trim().toLowerCase())).size > 1
                    return (
                      <div key={g.roll} style={ui.card}>
                        <div style={{ fontWeight: 700, marginBottom: 4 }}>Roll {g.roll} · {g.entries[0].batchName}</div>
                        {differ && <p style={{ ...ui.sub, color: 'var(--pencil)', marginBottom: 8 }}>The names differ — check it is the same person, then keep the correctly spelt one.</p>}
                        <div style={{ display: 'grid', gap: 8 }}>
                          {g.entries.map(e => (
                            <div key={e.studentId} style={{ ...ui.cardSm, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                              {entryLine(e)}
                              <button style={ui.btn} disabled={busy} onClick={() => mergeInto(g, e)}>Keep this, merge the other</button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}
            {cross.length > 0 && (
              <section>
                <h2 style={{ ...ui.h2, marginBottom: 2 }}>In two batches ({cross.length})</h2>
                <p style={{ ...ui.sub, marginBottom: 10 }}>The same roll in different batches — fine for a track overlap; otherwise keep the right batch.</p>
                <div style={{ display: 'grid', gap: 12 }}>
                  {cross.map(g => (
                    <div key={g.roll} style={ui.card}>
                      <div style={{ fontWeight: 700, marginBottom: 8 }}>Roll {g.roll}</div>
                      <div style={{ display: 'grid', gap: 8 }}>
                        {g.entries.map(e => (
                          <div key={e.studentId} style={{ ...ui.cardSm, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                            <div>{entryLine(e)}<div style={ui.sub}>{e.batchName}{e.track ? ` · ${e.track}` : ''}</div></div>
                            <button style={ui.btnGhost} disabled={busy} onClick={() => keepBatch(g, e)}>Keep in this batch only</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
    </div>
  )
}
