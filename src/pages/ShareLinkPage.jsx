// /d/<drive> — the link the placement office shares on WhatsApp / the ERP chat.
// A signed-in student goes straight to the drive; anyone else sees a small
// card (company, role, last date — if the drive allows) and "Sign in to apply".
import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import axios from 'axios'
import { studentSignedIn } from '../api/student'
import { useOrg } from '../context/OrgContext'

const pub = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' })
pub.interceptors.request.use(cfg => { cfg.headers['X-Org-Host'] = window.location.hostname; return cfg })

export default function ShareLinkPage() {
  const { slug } = useParams()
  const { brand } = useOrg()
  const [card, setCard] = useState(null), [gone, setGone] = useState(false)
  const target = `/student/drive/${slug}?src=share`
  useEffect(() => { if (!studentSignedIn()) pub.get(`/placement-public/${slug}`).then(r => setCard(r.data)).catch(() => setGone(true)) }, [slug])
  if (studentSignedIn()) return <Navigate to={target} replace />
  const d = card?.drive
  return (
    <div style={{ background: 'var(--page)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="sheet" style={{ maxWidth: 420, width: '100%', padding: 24, textAlign: 'center' }}>
        <div className="muted" style={{ fontSize: 13, marginBottom: 10 }}>{card?.college || brand} · Placement</div>
        {gone ? <p>This drive is not open any more.</p> : !card ? <p className="muted">Loading…</p> : (<>
          {d.company ? <>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{d.company}</h1>
            <div style={{ fontSize: 16, marginTop: 4 }}>{d.title}</div>
            {d.location && <div className="muted" style={{ fontSize: 14, marginTop: 4 }}>{d.location}</div>}
            <p style={{ fontSize: 14, marginTop: 12 }}>Apply by <b>{new Date(d.applyBy).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short' })}</b></p>
          </> : <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>A new placement drive</h1>}
          {d.open ? <>
            <p className="muted" style={{ fontSize: 14 }}>Sign in to see the details, check if you are eligible and apply.</p>
            <Link className="btn btn--primary" style={{ width: '100%', display: 'block' }} to={`/student/login?next=${encodeURIComponent(target)}`}>Sign in to apply</Link>
          </> : <p>Applications are closed.</p>}
        </>)}
      </div>
    </div>
  )
}
