import { useState, useEffect } from 'react'
import { reportsAPI } from '../api/index'

const S = {
  page:   { maxWidth: 1000, margin: '40px auto', padding: '0 24px' },
  title:  { fontFamily: 'var(--font-d)', fontSize: 26, fontWeight: 900, color: 'var(--gold)', marginBottom: 8 },
  sub:    { color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: 32 },
  filters:{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' },
  select: { background: 'rgba(20,36,60,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 14px', color: '#fff', fontSize: 13 },
  table:  { width: '100%', borderCollapse: 'collapse' },
  th:     { textAlign: 'left', padding: '10px 14px', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1, borderBottom: '1px solid rgba(255,255,255,0.06)' },
  td:     { padding: '14px', fontSize: 13, color: 'rgba(255,255,255,0.8)', borderBottom: '1px solid rgba(255,255,255,0.04)', verticalAlign: 'middle' },
  badge:  (s) => ({
    display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
    background: s === 'locked' ? 'rgba(192,57,43,0.25)' : s === 'submitted' ? 'rgba(39,174,96,0.2)' : 'rgba(255,255,255,0.07)',
    color: s === 'locked' ? '#e74c3c' : s === 'submitted' ? '#2ecc71' : 'rgba(255,255,255,0.5)',
    border: `1px solid ${s === 'locked' ? '#c0392b' : s === 'submitted' ? '#27ae60' : 'rgba(255,255,255,0.1)'}`,
  }),
  btnLock:{ padding: '6px 14px', background: 'rgba(192,57,43,0.15)', border: '1px solid #c0392b', borderRadius: 6, color: '#e74c3c', fontSize: 12, cursor: 'pointer', fontWeight: 600 },
  btnDl:  { padding: '6px 14px', background: 'rgba(255,193,7,0.1)', border: '1px solid rgba(255,193,7,0.3)', borderRadius: 6, color: 'var(--gold)', fontSize: 12, cursor: 'pointer', fontWeight: 600 },
  empty:  { textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.2)', fontSize: 14 },
}

export default function ReportsAdminPage() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState({ status: '', cycle: '' })
  const [cycles, setCycles]   = useState([])
  const [busy, setBusy]       = useState({})  // id → true while action in progress

  useEffect(() => {
    fetch('/api/config?type=cycle')
      .then(r => r.json())
      .then(d => setCycles((d || []).filter(c => c.isActive).map(c => c.value)))
      .catch(() => {})
  }, [])

  useEffect(() => { load() }, [filter])

  async function load() {
    setLoading(true)
    try {
      const params = {}
      if (filter.status) params.status = filter.status
      if (filter.cycle)  params.cycle  = filter.cycle
      const res = await reportsAPI.list(params)
      setReports(res.data || [])
    } catch { setReports([]) }
    finally { setLoading(false) }
  }

  async function handleLock(id) {
    if (!confirm('Lock this report? The trainer will no longer be able to edit it.')) return
    setBusy(b => ({ ...b, [id]: true }))
    try {
      await reportsAPI.lock(id)
      setReports(rs => rs.map(r => r._id === id ? { ...r, status: 'locked' } : r))
    } catch (e) {
      alert(e.response?.data?.error || 'Lock failed.')
    } finally { setBusy(b => ({ ...b, [id]: false })) }
  }

  async function handleDownload(r) {
    setBusy(b => ({ ...b, [r._id]: true }))
    try {
      const res = await reportsAPI.download(r._id)
      const url = URL.createObjectURL(new Blob([res.data]))
      const a   = document.createElement('a')
      a.href    = url
      a.download = `SkillLab_${r.cycle}_${r.section}_Report.docx`.replace(/\s+/g,'_')
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Download failed.')
    } finally { setBusy(b => ({ ...b, [r._id]: false })) }
  }

  return (
    <div style={S.page}>
      <div style={S.title}>📊 All Cycle Reports</div>
      <div style={S.sub}>Review, lock, and download trainer reports.</div>

      <div style={S.filters}>
        <select style={S.select} value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}>
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="submitted">Submitted</option>
          <option value="locked">Locked</option>
        </select>
        <select style={S.select} value={filter.cycle} onChange={e => setFilter(f => ({ ...f, cycle: e.target.value }))}>
          <option value="">All cycles</option>
          {cycles.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button style={{ ...S.btnDl, border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }} onClick={load}>↻ Refresh</button>
      </div>

      {loading
        ? <div style={S.empty}>Loading…</div>
        : reports.length === 0
          ? <div style={S.empty}>No reports found.</div>
          : (
            <table style={S.table}>
              <thead>
                <tr>
                  {['Trainer','Section','Stream / Course','Cycle','Status','Updated','Actions'].map(h =>
                    <th key={h} style={S.th}>{h}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {reports.map(r => (
                  <tr key={r._id}>
                    <td style={S.td}>{r.trainer?.name || '—'}</td>
                    <td style={S.td}>{r.section}</td>
                    <td style={S.td} >{r.stream}<br/><span style={{fontSize:11,opacity:0.5}}>{r.course} · {r.year}</span></td>
                    <td style={S.td}>{r.cycle}</td>
                    <td style={S.td}><span style={S.badge(r.status)}>{r.status}</span></td>
                    <td style={S.td} >{new Date(r.updatedAt).toLocaleDateString('en-IN')}</td>
                    <td style={S.td}>
                      <div style={{ display:'flex', gap: 8 }}>
                        {r.status === 'submitted' && (
                          <button style={{ ...S.btnLock, ...(busy[r._id] ? { opacity:0.5 } : {}) }}
                            onClick={() => handleLock(r._id)} disabled={busy[r._id]}>
                            🔒 Lock
                          </button>
                        )}
                        <button style={{ ...S.btnDl, ...(busy[r._id] ? { opacity:0.5 } : {}) }}
                          onClick={() => handleDownload(r)} disabled={busy[r._id]}>
                          ⬇ DOCX
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
      }
    </div>
  )
}