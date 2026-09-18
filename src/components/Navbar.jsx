import { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import GlobalSearch from './GlobalSearch'

const ADMIN_PATHS = ['/semesters', '/users', '/duplicates']

export default function Navbar() {
  const { user, logout } = useAuth()
  const loc = useLocation()
  const nav = useNavigate()
  const [adminOpen, setAdminOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const adminRef = useRef(null)
  const accountRef = useRef(null)

  const is = (p) => loc.pathname === p
  const isAdminSection = ADMIN_PATHS.includes(loc.pathname)
  const handleLogout = () => { logout(); setAccountOpen(false); nav('/') }

  useEffect(() => {
    function onClick(e) {
      if (adminRef.current && !adminRef.current.contains(e.target)) setAdminOpen(false)
      if (accountRef.current && !accountRef.current.contains(e.target)) setAccountOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  // Close the mobile panel on route change.
  useEffect(() => { setMobileOpen(false) }, [loc.pathname])

  // The public Hall of Fame carries its own dark masthead and never shows
  // this bar (design-direction.md §4) — even for a signed-in trainer just
  // browsing it, since this light bar would sit on top of the honours
  // board's dark theme. Same for the login screen, which has its own
  // "View the Hall of Fame" link back out.
  if (is('/') || is('/login')) return null

  const tabs = (
    <>
      <Link to="/dashboard" className={is('/dashboard') ? 'is-active' : ''}>Today</Link>
      <Link to="/batches" className={is('/batches') || loc.pathname.startsWith('/batch/') ? 'is-active' : ''}>Batches</Link>
      <Link to="/cycles" className={is('/cycles') || loc.pathname.startsWith('/cycle/') ? 'is-active' : ''}>Cycles</Link>
      <Link to="/placement" className={is('/placement') ? 'is-active' : ''}>Placement</Link>
      {user?.role === 'superadmin' && (
        <div className="dropdown" ref={adminRef} style={{ display: 'inline-block' }}>
          <button
            type="button"
            className={`nav-tab${isAdminSection ? ' is-active' : ''}`}
            onClick={() => setAdminOpen(v => !v)}
            aria-haspopup="true" aria-expanded={adminOpen}
          >
            Admin ▾
          </button>
          {adminOpen && (
            <div className="dropdown-panel align-left">
              <Link to="/semesters" className={is('/semesters') ? 'is-active' : ''} onClick={() => setAdminOpen(false)}>Semesters</Link>
              <Link to="/users" className={is('/users') ? 'is-active' : ''} onClick={() => setAdminOpen(false)}>Users</Link>
              <Link to="/duplicates" className={is('/duplicates') ? 'is-active' : ''} onClick={() => setAdminOpen(false)}>Duplicates</Link>
            </div>
          )}
        </div>
      )}
    </>
  )

  return (
    <nav className="nav">
      <div className="nav-inner">
        <Link to="/dashboard" className="nav-mark">SHEAT Skill Lab</Link>

        <div className="nav-tabs">{tabs}</div>

        <button className="nav-menu-btn" onClick={() => setMobileOpen(v => !v)} aria-label="Menu" aria-expanded={mobileOpen}>
          Menu
        </button>

        <div className="nav-right">
          {user && <GlobalSearch />}

          {user ? (
            <div className="dropdown" ref={accountRef}>
              <button className="account-trigger" onClick={() => setAccountOpen(v => !v)} aria-haspopup="true" aria-expanded={accountOpen}>
                <span className="account-name">{user.name}</span>
                <span className="account-chevron">▾</span>
              </button>
              {accountOpen && (
                <div className="dropdown-panel">
                  <div className="dropdown-label" style={{ textTransform: 'capitalize' }}>{user.role}</div>
                  <div className="dropdown-sep" />
                  <button onClick={handleLogout}>Log out</button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login"><button className="btn btn--secondary btn--sm">Sign in</button></Link>
          )}
        </div>
      </div>

      {mobileOpen && (
        <div className="nav-mobile-panel">
          {tabs}
          {user?.role === 'superadmin' && (
            <>
              <Link to="/semesters" className={is('/semesters') ? 'is-active' : ''}>Semesters</Link>
              <Link to="/users" className={is('/users') ? 'is-active' : ''}>Users</Link>
              <Link to="/duplicates" className={is('/duplicates') ? 'is-active' : ''}>Duplicates</Link>
            </>
          )}
        </div>
      )}
    </nav>
  )
}
