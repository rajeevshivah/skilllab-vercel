// API client for the STUDENT side. Separate token from staff (sl_token), so a
// trainer and a student can never be mixed up in one browser.
import axios from 'axios'

// Which college: the API decides from the address this page was opened on.
const ORG_HOST = typeof window !== 'undefined' ? window.location.hostname : ''

const studentApi = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' })

studentApi.interceptors.request.use(cfg => {
  const t = localStorage.getItem('sl_student_token')
  if (t) cfg.headers.Authorization = `Bearer ${t}`
  // which of their batches the training screens show (a student can be in more than one)
  try { const pl = localStorage.getItem('sl_student_place'); if (pl) cfg.headers['X-Place'] = pl } catch {}
  if (ORG_HOST) cfg.headers['X-Org-Host'] = ORG_HOST
  return cfg
})
studentApi.interceptors.response.use(
  res => res,
  err => {
    const url = err.config?.url || ''
    if (err.response?.status === 401 && !url.includes('/student/login') && !url.includes('/student/activate')) {
      localStorage.removeItem('sl_student_token')
      localStorage.removeItem('sl_student_place')
      window.location.href = '/student/login'
    }
    return Promise.reject(err)
  }
)

export const studentSignedIn = () => !!localStorage.getItem('sl_student_token')
export const studentSignOut = () => { localStorage.removeItem('sl_student_token'); localStorage.removeItem('sl_student_place'); window.location.href = '/student/login' }
export const setStudentPlace = (id) => { try { if (id) localStorage.setItem('sl_student_place', id); else localStorage.removeItem('sl_student_place') } catch {} }
export default studentApi
