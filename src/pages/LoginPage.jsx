import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const { login } = useAuth()
  const navigate  = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      await login(email, password)
      navigate('/admin')
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed')
    } finally { setLoading(false) }
  }

  return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'80vh',padding:24}}>
      <div style={{width:'100%',maxWidth:400,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.09)',borderRadius:20,padding:40,textAlign:'center'}}>
        <div style={{fontSize:42,marginBottom:16}}>🔐</div>
        <h2 style={{fontFamily:'var(--font-d)',fontSize:26,marginBottom:6}}>Admin Login</h2>
        <p style={{color:'var(--muted)',fontSize:13,marginBottom:28}}>SHEAT College Skill Lab Portal</p>

        <form onSubmit={handleSubmit}>
          {[
            { label:'Email', type:'email', val:email, set:setEmail },
            { label:'Password', type:'password', val:password, set:setPassword },
          ].map(({ label, type, val, set }) => (
            <div key={label} style={{marginBottom:16,textAlign:'left'}}>
              <label style={{display:'block',fontSize:11,fontWeight:600,letterSpacing:'0.08em',textTransform:'uppercase',color:'var(--muted)',marginBottom:6}}>{label}</label>
              <input type={type} value={val} onChange={e=>set(e.target.value)} required
                style={{width:'100%',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',color:'white',padding:'10px 14px',borderRadius:10,fontSize:14,outline:'none'}} />
            </div>
          ))}

          {error && <div style={{background:'rgba(220,38,38,0.15)',border:'1px solid rgba(220,38,38,0.3)',color:'#FCA5A5',padding:'10px 14px',borderRadius:8,fontSize:13,marginBottom:16}}>{error}</div>}

          <button type="submit" disabled={loading}
            style={{width:'100%',padding:'12px 24px',background:'var(--blue)',color:'white',border:'none',borderRadius:10,fontSize:14,fontWeight:600,cursor:'pointer',opacity:loading?0.7:1}}>
            {loading ? 'Logging in…' : 'Login'}
          </button>
        </form>

        <p style={{marginTop:20,fontSize:12,color:'rgba(255,255,255,0.2)'}}>
          Default: admin@sheat.ac.in / sheat@admin2026
        </p>
      </div>
    </div>
  )
}
