import { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import GlobalSearch from './GlobalSearch'
import ChangePassword from './ChangePassword'
import { useOrg } from '../context/OrgContext'
import api from '../api'

// admin pages live in the account menu (not a tab), so the tab row has room
// for every module a college switches on
const ADMIN_LINKS = [['/semesters', 'Semesters'], ['/users', 'Users'], ['/duplicates', 'Duplicates'],
  ['/planner', 'Plan new cycles'], ['/settings', 'Settings (holidays, timetables)']]
const ROLE_NAME = { superadmin: 'Admin', trainer: 'Trainer', cotrainer: 'Co-trainer', viewer: 'Management (read-only)', placement: 'Placement officer' }

export default function Navbar() {
  const { brand, has } = useOrg()
  const { user, logout } = useAuth()
  const loc = useLocation()
  const nav = useNavigate()
  const [accountOpen, setAccountOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [pwOpen, setPwOpen] = useState(false)
  const accountRef = useRef(null)

  const is = (p) => loc.pathname === p
  const isAdmin = user?.role === 'superadmin' || user?.platformOwner
  const adminLinks = (close) => isAdmin && <>
    {ADMIN_LINKS.map(([to, label]) => <Link key={to} to={to} className={is(to) ? 'is-active' : ''} onClick={close}>{label}</Link>)}
    {user?.platformOwner && <Link to="/platform" className={is('/platform') ? 'is-active' : ''} onClick={close}>Colleges (owner console)</Link>}
  </>
  const handleLogout = () => { logout(); setAccountOpen(false); nav('/') }
  // every other device signed in as me is signed out; this one gets a fresh token
  const signOutOthers = async () => {
    setAccountOpen(false)
    if (!window.confirm('Sign out on every other phone and computer? You stay signed in here. Your password does not change.')) return
    try { const { data } = await api.put('/auth/sign-out-others'); localStorage.setItem('sl_token', data.token); window.alert('Done — every other device is signed out.') }
    catch (e) { window.alert(e.response?.data?.message || 'Could not sign out the other devices.') }
  }

  useEffect(() => {
    function onClick(e) {
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

  const onPlacement = loc.pathname.startsWith('/placement')
  const placementTab = has('placement') && ['superadmin', 'viewer', 'placement'].includes(user?.role)
    && <Link to="/placement" className={onPlacement ? 'is-active' : ''}>Placement</Link>
  // the placement officer sees only placement
  const tabs = user?.role === 'placement' ? <>{placementTab}</> : (
    <>
      <Link to="/dashboard" className={is('/dashboard') ? 'is-active' : ''}>Today</Link>
      <Link to="/batches" className={is('/batches') || loc.pathname.startsWith('/batch/') ? 'is-active' : ''}>Batches</Link>
      <Link to="/cycles" className={is('/cycles') || loc.pathname.startsWith('/cycle/') ? 'is-active' : ''}>Cycles</Link>
      <Link to="/plans" className={is('/plans') ? 'is-active' : ''}>Class plans</Link>
      <Link to="/meeting" className={is('/meeting') ? 'is-active' : ''}>Meetings</Link>
      <Link to="/top-students" className={is('/top-students') ? 'is-active' : ''}>Top students</Link>
      <Link to="/performance" className={is('/performance') ? 'is-active' : ''}>Performance</Link>
      {placementTab}
    </>
  )

  return (
    <nav className="nav">
      <div className="nav-inner">
        <Link to={user?.role === 'placement' ? '/placement' : '/dashboard'} className="nav-mark">{brand}</Link>

        <div className="nav-tabs">{tabs}</div>

        <button className="nav-menu-btn" onClick={() => setMobileOpen(v => !v)} aria-label="Menu" aria-expanded={mobileOpen}>
          Menu
        </button>

        <div className="nav-right">
          {user && user.role !== 'placement' && <GlobalSearch />}

          {user ? (
            <div className="dropdown" ref={accountRef}>
              <button className="account-trigger" onClick={() => setAccountOpen(v => !v)} aria-haspopup="true" aria-expanded={accountOpen}>
                <span className="account-name">{user.name}</span>
                <span className="account-chevron">▾</span>
              </button>
              {accountOpen && (
                <div className="dropdown-panel">
                  <div className="dropdown-label">{ROLE_NAME[user.role] || user.role}</div>
                  <div className="dropdown-sep" />
                  {isAdmin && <>{adminLinks(() => setAccountOpen(false))}<div className="dropdown-sep" /></>}
                  {has('hallOfFame') && <Link to="/" className={is('/') ? 'is-active' : ''} onClick={() => setAccountOpen(false)}>Hall of Fame (public page)</Link>}
                  {has('ai') && <Link to="/connect-ai" className={is('/connect-ai') ? 'is-active' : ''} onClick={() => setAccountOpen(false)}>Connect AI</Link>}
                  <button onClick={() => { setAccountOpen(false); setPwOpen(true) }}>Change password</button>
                  <button onClick={signOutOthers}>Sign out other devices</button>
                  <button onClick={handleLogout}>Log out</button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login"><button className="btn btn--secondary btn--sm">Sign in</button></Link>
          )}
        </div>
      </div>

      {pwOpen && <ChangePassword onClose={() => setPwOpen(false)} />}
      {user?.role === 'viewer' && (
        <div style={{ background: 'var(--pencil-wash)', color: 'var(--pencil)', fontSize: 12.5, textAlign: 'center', padding: '4px 12px' }}>
          Management view — you can see everything here; changes are made by the admin and trainers.
        </div>
      )}
      {mobileOpen && (
        <div className="nav-mobile-panel">
          {tabs}
          {has('hallOfFame') && <Link to="/" className={is('/') ? 'is-active' : ''}>Hall of Fame</Link>}
          {user && has('ai') && <Link to="/connect-ai" className={is('/connect-ai') ? 'is-active' : ''}>Connect AI</Link>}
          {adminLinks()}
        </div>
      )}
    </nav>
  )
}
