import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const S = {
  nav: { position:'sticky',top:0,zIndex:100,background:'rgba(10,22,40,0.92)',backdropFilter:'blur(12px)',borderBottom:'1px solid rgba(255,255,255,0.07)' },
  inner: { maxWidth:1100,margin:'0 auto',padding:'0 24px',display:'flex',alignItems:'center',justifyContent:'space-between' },
  logo: { fontFamily:'var(--font-d)',fontSize:18,fontWeight:900,color:'var(--gold)',padding:'14px 0' },
  tabs: { display:'flex' },
  tab: (active) => ({ padding:'14px 18px',background:'none',border:'none',borderBottom:`2px solid ${active?'var(--gold)':'transparent'}`,color:active?'var(--gold)':'rgba(255,255,255,0.45)',fontSize:13,fontWeight:500,cursor:'pointer',transition:'all 0.2s' }),
  right: { display:'flex',alignItems:'center',gap:12 },
  user: { fontSize:12,color:'rgba(255,255,255,0.45)' },
  logout: { padding:'6px 14px',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,color:'rgba(255,255,255,0.7)',fontSize:12,cursor:'pointer' },
}

export default function Navbar() {
  const { user, logout } = useAuth()
  const loc = useLocation()
  const nav = useNavigate()

  const handleLogout = () => { logout(); nav('/') }
  const isSuperadmin = user?.role === 'superadmin'
  const isTrainerOrAbove = user?.role === 'trainer' || isSuperadmin

  return (
    <nav style={S.nav}>
      <div style={S.inner}>
        <Link to="/" style={S.logo}>⚡ SkillLab</Link>
        <div style={S.tabs}>
          <Link to="/">
            <button style={S.tab(loc.pathname === '/')}>🏆 Hall of Fame</button>
          </Link>
          {user && (
            <Link to="/admin">
              <button style={S.tab(loc.pathname === '/admin')}>⚙️ Manage</button>
            </Link>
          )}
          {isTrainerOrAbove && (
            <Link to="/report">
              <button style={S.tab(loc.pathname === '/report')}>📋 My Report</button>
            </Link>
          )}
          {isSuperadmin && (
            <Link to="/reports">
              <button style={S.tab(loc.pathname === '/reports')}>📊 Reports</button>
            </Link>
          )}
          {isSuperadmin && (
            <Link to="/users">
              <button style={S.tab(loc.pathname === '/users')}>👥 Users</button>
            </Link>
          )}
          {isSuperadmin && (
            <Link to="/settings">
              <button style={S.tab(loc.pathname === '/settings')}>🔧 Settings</button>
            </Link>
          )}
        </div>
        <div style={S.right}>
          {user ? (
            <>
              <span style={S.user}>{user.name} · <span style={{textTransform:'capitalize',color:'var(--gold)'}}>{user.role}</span></span>
              <button style={S.logout} onClick={handleLogout}>Logout</button>
            </>
          ) : (
            <Link to="/login"><button style={S.logout}>Login</button></Link>
          )}
        </div>
      </div>
    </nav>
  )
}