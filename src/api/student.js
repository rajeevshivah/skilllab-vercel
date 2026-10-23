// API client for the STUDENT side. Separate token from staff (sl_token), so a
// trainer and a student can never be mixed up in one browser.
import axios from 'axios'

const studentApi = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' })

studentApi.interceptors.request.use(cfg => {
  const t = localStorage.getItem('sl_student_token')
  if (t) cfg.headers.Authorization = `Bearer ${t}`
  return cfg
})
studentApi.interceptors.response.use(
  res => res,
  err => {
    const url = err.config?.url || ''
    if (err.response?.status === 401 && !url.includes('/student/login') && !url.includes('/student/activate')) {
      localStorage.removeItem('sl_student_token')
      window.location.href = '/student/login'
    }
    return Promise.reject(err)
  }
)

export const studentSignedIn = () => !!localStorage.getItem('sl_student_token')
export const studentSignOut = () => { localStorage.removeItem('sl_student_token'); window.location.href = '/student/login' }
export default studentApi
