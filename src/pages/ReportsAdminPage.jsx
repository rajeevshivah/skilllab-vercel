import { useState, useEffect } from 'react'
import { reportsAPI } from '../api/index'

const S = {
  page:    { maxWidth: 1000, margin: '40px auto', padding: '0 24px' },
  title:   { fontFamily: 'var(--font-d)', fontSize: 26, fontWeight: 900, color: 'var(--gold)', marginBottom: 8 },
  sub:     { color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: 32 },
  filters: { display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' },
  select:  { background: 'rgba(20,36,60,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 14px', color: '#fff', fontSize: 13 },
  input:   { background: 'rgba(20,36,60,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 14px', color: '#fff', fontSize: 13 },
  table:   { width: '100%', borderCollapse: 'collapse' },
  th:      { textAlign: 'left', padding: '10px 14px', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1, borderBottom: '1px solid rgba(255,255,255,0.06)' },
  td:      { padding: '14px', fontSize: 13, color: 'rgba(255,255,255,0.8)', borderBottom: '1px solid rgba(255,255,255,0.04)', verticalAlign: 'middle' },
  badge:   (s) => ({
    display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
    background: s === 'locked' ? 'rgba(192,57,43,0.25)' : s === 'submitted' ? 'rgba(39,174,96,0.2)' : 'rgba(255,255,255,0.07)',
    color: s === 'locked' ? '#e74c3c' : s === 'submitted' ? '#2ecc71' : 'rgba(255,255,255,0.5)',
    border: `1px solid ${s === 'locked' ? '#c0392b' : s === 'submitted' ? '#27ae60' : 'rgba(255,255,255,0.1)'}`,
  }),
  btnLock: { padding: '6px 14px', background: 'rgba(192,57,43,0.15)', border: '1px solid #c0392b', borderRadius: 6, color: '#e74c3c', fontSize: 12, cursor: 'pointer', fontWeight: 600 },
  btnDl:   { padding: '6px 14px', background: 'rgba(255,193,7,0.1)', border: '1px solid rgba(255,193,7,0.3)', borderRadius: 6, color: 'var(--gold)', fontSize: 12, cursor: 'pointer', fontWeight: 600 },
  btnBlue: { padding: '6px 14px', background: 'rgba(26,60,94,0.4)', border: '1px solid #1A3C5E', borderRadius: 6, color: '#60A5FA', fontSize: 12, cursor: 'pointer', fontWeight: 600 },
  btnGreen:{ padding: '6px 14px', background: 'rgba(39,174,96,0.1)', border: '1px solid #27ae60', borderRadius: 6, color: '#2ecc71', fontSize: 12, cursor: 'pointer', fontWeight: 600 },
  empty:   { textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.2)', fontSize: 14 },
  // Modal
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modal:   { background: '#0A1628', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 32, width: '100%', maxWidth: 680, maxHeight: '85vh', overflowY: 'auto' },
  mTitle:  { fontFamily: 'var(--font-d)', fontSize: 20, fontWeight: 900, color: 'var(--gold)', marginBottom: 8 },
  mSub:    { color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: 24 },
  mLabel:  { display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6, marginTop: 16 },
  mRow:    { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  mInput:  { width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: 14, boxSizing: 'border-box' },
  checkRow:{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', marginBottom: 8, cursor: 'pointer' },
  btnPrimary: { padding: '12px 28px', background: 'var(--gold)', border: 'none', borderRadius: 8, color: '#000', fontSize: 14, cursor: 'pointer', fontWeight: 700 },
  btnSecondary: { padding: '12px 20px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'rgba(255,255,255,0.7)', fontSize: 14, cursor: 'pointer' },
}

export default function ReportsAdminPage() {
  const [reports,  setReports]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState({ status: '', cycle: '' })
  const [cycles,   setCycles]   = useState([])
  const [busy,     setBusy]     = useState({})

  // Consolidated modal state
  const [showModal,       setShowModal]       = useState(false)
  const [modalLoading,    setModalLoading]    = useState(false)
  const [dateFrom,        setDateFrom]        = useState('')
  const [dateTo,          setDateTo]          = useState('')
  const [reportingPeriod, setReportingPeriod] = useState('')
  const [candidateReports,setCandidateReports]= useState([])
  const [selectedIds,     setSelectedIds]     = useState([])
  const [generating,      setGenerating]      = useState(false)

  useEffect(() => {
    fetch('/api/config')
      .then(r => r.json())
      .then(d => setCycles((d.config?.cycle || []).map(c => c.value)))
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
      const a = document.createElement('a')
      a.href = url
      a.download = `SkillLab_${r.cycle}_${r.section}_Report.docx`.replace(/\s+/g, '_')
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Download failed.')
    } finally { setBusy(b => ({ ...b, [r._id]: false })) }
  }

  async function handleCombinedDownload(cycle) {
    setBusy(b => ({ ...b, combined: true }))
    try {
      const res = await reportsAPI.combinedDownload(cycle)
      const url = URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a'); a.href = url
      a.download = `SkillLab_${cycle}_Combined_Report.docx`.replace(/\s+/g, '_')
      a.click(); URL.revokeObjectURL(url)
    } catch {
      alert('Combined download failed. Make sure at least one report is submitted for this cycle.')
    } finally { setBusy(b => ({ ...b, combined: false })) }
  }

  async function handleExecutiveSummary(cycle) {
    setBusy(b => ({ ...b, executive: true }))
    try {
      const res = await reportsAPI.executiveSummary(cycle)
      const url = URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a'); a.href = url
      a.download = `SkillLab_${cycle}_Executive_Summary.docx`.replace(/\s+/g, '_')
      a.click(); URL.revokeObjectURL(url)
    } catch {
      alert('Executive summary failed. Make sure at least one report is submitted for this cycle.')
    } finally { setBusy(b => ({ ...b, executive: false })) }
  }

  // ── Consolidated modal ────────────────────────────────────────
  function openModal() {
    // Default dates: last 30 days
    const to   = new Date()
    const from = new Date(); from.setDate(from.getDate() - 30)
    setDateFrom(from.toISOString().slice(0, 10))
    setDateTo(to.toISOString().slice(0, 10))
    setReportingPeriod('')
    setCandidateReports([])
    setSelectedIds([])
    setShowModal(true)
  }

  async function fetchCandidates() {
    if (!dateFrom || !dateTo) return alert('Please select both dates.')
    setModalLoading(true)
    try {
      // Fetch all submitted/locked reports, filter by endDate client-side
      const res = await reportsAPI.list({ status: 'submitted' })
      const lockedRes = await reportsAPI.list({ status: 'locked' })
      const all = [...(res.data || []), ...(lockedRes.data || [])]
      const from = new Date(dateFrom)
      const to   = new Date(dateTo); to.setHours(23, 59, 59)
      const filtered = all.filter(r => {
        if (!r.endDate) return true // include if no end date
        const end = new Date(r.endDate)
        return end >= from && end <= to
      })
      // Deduplicate by _id
      const seen = new Set()
      const unique = filtered.filter(r => { if (seen.has(r._id)) return false; seen.add(r._id); return true })
      setCandidateReports(unique)
      setSelectedIds(unique.map(r => r._id))
    } catch {
      alert('Failed to fetch reports.')
    } finally { setModalLoading(false) }
  }

  function toggleId(id) {
    setSelectedIds(ids => ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id])
  }

  async function handleGenerateConsolidated() {
    if (selectedIds.length === 0) return alert('Select at least one report.')
    if (!reportingPeriod.trim()) return alert('Enter a reporting period (e.g. "02 Feb 2026 – 30 Mar 2026").')
    setGenerating(true)
    try {
      const res = await reportsAPI.consolidatedReport(selectedIds, reportingPeriod.trim())
      const url = URL.createObjectURL(new Blob([res.data]))
      const a   = document.createElement('a'); a.href = url
      a.download = `SkillLab_Master_Consolidated_Report.docx`
      a.click(); URL.revokeObjectURL(url)
      setShowModal(false)
    } catch {
      alert('Generation failed. Check Vercel logs for details.')
    } finally { setGenerating(false) }
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
        {filter.cycle && (
          <button style={{ ...S.btnBlue, ...(busy['combined'] ? { opacity: 0.5 } : {}) }}
            onClick={() => handleCombinedDownload(filter.cycle)} disabled={!!busy['combined']}>
            {busy['combined'] ? 'Generating…' : `⬇ Combined — ${filter.cycle}`}
          </button>
        )}
        {filter.cycle && (
          <button style={{ ...S.btnGreen, ...(busy['executive'] ? { opacity: 0.5 } : {}) }}
            onClick={() => handleExecutiveSummary(filter.cycle)} disabled={!!busy['executive']}>
            {busy['executive'] ? 'Generating…' : `📄 Executive Summary — ${filter.cycle}`}
          </button>
        )}
        <button style={{ ...S.btnDl, background: 'rgba(255,100,0,0.1)', border: '1px solid rgba(255,100,0,0.4)', color: '#FF8C42' }}
          onClick={openModal}>
          📋 Master Consolidated Report
        </button>
      </div>

      {loading
        ? <div style={S.empty}>Loading…</div>
        : reports.length === 0
          ? <div style={S.empty}>No reports found.</div>
          : (
            <table style={S.table}>
              <thead>
                <tr>{['Trainer', 'Section', 'Stream / Course', 'Cycle', 'Status', 'Updated', 'Actions'].map(h =>
                  <th key={h} style={S.th}>{h}</th>
                )}</tr>
              </thead>
              <tbody>
                {reports.map(r => (
                  <tr key={r._id}>
                    <td style={S.td}>{r.trainer?.name || '—'}</td>
                    <td style={S.td}>{r.section}</td>
                    <td style={S.td}>{r.stream}<br /><span style={{ fontSize: 11, opacity: 0.5 }}>{r.course} · {r.year}</span></td>
                    <td style={S.td}>{r.cycle}</td>
                    <td style={S.td}><span style={S.badge(r.status)}>{r.status}</span></td>
                    <td style={S.td}>{new Date(r.updatedAt).toLocaleDateString('en-IN')}</td>
                    <td style={S.td}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {r.status === 'submitted' && (
                          <button style={{ ...S.btnLock, ...(busy[r._id] ? { opacity: 0.5 } : {}) }}
                            onClick={() => handleLock(r._id)} disabled={busy[r._id]}>🔒 Lock</button>
                        )}
                        <button style={{ ...S.btnDl, ...(busy[r._id] ? { opacity: 0.5 } : {}) }}
                          onClick={() => handleDownload(r)} disabled={busy[r._id]}>⬇ DOCX</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
      }

      {/* ── Consolidated Report Modal ── */}
      {showModal && (
        <div style={S.overlay} onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div style={S.modal}>
            <div style={S.mTitle}>📋 Master Consolidated Report</div>
            <div style={S.mSub}>Select reports by date range, review, then generate. Handles mixed cycles (Cycle 3 + Cycle 1 etc).</div>

            {/* Date range */}
            <div style={S.mRow}>
              <div>
                <label style={S.mLabel}>From Date (cycle end date)</label>
                <input type="date" style={S.mInput} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              </div>
              <div>
                <label style={S.mLabel}>To Date</label>
                <input type="date" style={S.mInput} value={dateTo} onChange={e => setDateTo(e.target.value)} />
              </div>
            </div>

            <label style={S.mLabel}>Reporting Period Label (appears on document)</label>
            <input style={S.mInput} value={reportingPeriod} onChange={e => setReportingPeriod(e.target.value)}
              placeholder="e.g. 02 February 2026 – 30 March 2026" />

            <div style={{ marginTop: 16 }}>
              <button style={{ ...S.btnBlue, padding: '10px 20px' }} onClick={fetchCandidates} disabled={modalLoading}>
                {modalLoading ? 'Loading…' : '🔍 Find Reports in Date Range'}
              </button>
            </div>

            {/* Report checkboxes */}
            {candidateReports.length > 0 && (
              <>
                <div style={{ marginTop: 24, marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
                    {selectedIds.length} of {candidateReports.length} reports selected
                  </span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button style={{ ...S.btnSecondary, padding: '4px 12px', fontSize: 11 }}
                      onClick={() => setSelectedIds(candidateReports.map(r => r._id))}>Select All</button>
                    <button style={{ ...S.btnSecondary, padding: '4px 12px', fontSize: 11 }}
                      onClick={() => setSelectedIds([])}>Deselect All</button>
                  </div>
                </div>
                {candidateReports.map(r => (
                  <div key={r._id} style={{ ...S.checkRow, background: selectedIds.includes(r._id) ? 'rgba(26,60,94,0.3)' : 'rgba(255,255,255,0.03)' }}
                    onClick={() => toggleId(r._id)}>
                    <input type="checkbox" checked={selectedIds.includes(r._id)} onChange={() => toggleId(r._id)}
                      style={{ width: 16, height: 16, cursor: 'pointer' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: '#fff', fontWeight: 600 }}>
                        {r.section} — {r.stream} · {r.course} · {r.year}
                      </div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                        {r.cycle} · Trainer: {r.trainer?.name || '—'} · Status: {r.status}
                        {r.endDate ? ` · End: ${new Date(r.endDate).toLocaleDateString('en-IN')}` : ''}
                      </div>
                    </div>
                    <span style={S.badge(r.status)}>{r.status}</span>
                  </div>
                ))}
              </>
            )}

            {candidateReports.length === 0 && !modalLoading && dateFrom && dateTo && (
              <div style={{ marginTop: 16, color: 'rgba(255,255,255,0.3)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
                No submitted/locked reports found in this date range. Try a wider range or check that reports have end dates filled in.
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button
                style={{ ...S.btnPrimary, ...(generating || selectedIds.length === 0 ? { opacity: 0.5, cursor: 'not-allowed' } : {}) }}
                onClick={handleGenerateConsolidated}
                disabled={generating || selectedIds.length === 0}>
                {generating ? '⏳ Generating… (may take 30–60 seconds)' : `📋 Generate Consolidated Report (${selectedIds.length} sections)`}
              </button>
              <button style={S.btnSecondary} onClick={() => setShowModal(false)}>Cancel</button>
            </div>

            {generating && (
              <div style={{ marginTop: 12, fontSize: 12, color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
                Calling OpenAI to write narrative sections… please wait
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}